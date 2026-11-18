const crypto = require("node:crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ouujfsxhymgftbdlkeiu.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tSxNnbGgeSL1I7Fw0ASWbQ_K3zI9VqQ";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "design-flow-files";

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}
function encodePath(value) { return String(value).split("/").map(encodeURIComponent).join("/"); }
function tokenHash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf", "application/postscript", "image/vnd.adobe.photoshop"]);
function headers(prefer) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}
async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || "GET",
    headers: headers(options.prefer),
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await response.text();
  const value = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(value?.message || value?.msg || `Supabase 요청 오류 (${response.status})`);
  return value;
}
async function one(path) { return (await db(path))?.[0] || null; }
async function requireStaff(req) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!bearer) throw Object.assign(new Error("로그인이 필요합니다."), { status: 401 });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${bearer}` } });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) throw Object.assign(new Error("로그인 정보를 확인할 수 없습니다."), { status: 401 });
  const profile = await one(`/rest/v1/profiles?select=user_id,role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  if (!profile || !["designer", "sv"].includes(profile.role)) throw Object.assign(new Error("직원 권한이 필요합니다."), { status: 403 });
  return profile;
}
async function signedDownload(file, forceDownload = true) {
  const signed = await db(`/storage/v1/object/sign/${BUCKET}/${encodePath(file.object_path)}`, {
    method: "POST",
    body: { expiresIn: 3600 }
  });
  const raw = signed?.signedURL || signed?.signedUrl;
  if (!raw) throw new Error("파일 다운로드 링크를 만들지 못했습니다.");
  const url = new URL(raw.startsWith("http") ? raw : `${SUPABASE_URL}/storage/v1${raw.startsWith("/") ? raw : `/${raw}`}`);
  if (forceDownload) url.searchParams.set("download", file.file_name);
  return url.toString();
}
async function recentRequest(requestId) {
  const after = encodeURIComponent(new Date(Date.now() - 30 * 60 * 1000).toISOString());
  return one(`/rest/v1/requests?select=id&id=eq.${encodeURIComponent(requestId)}&created_at=gte.${after}&limit=1`);
}
async function publicReview(token) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const review = await one(`/rest/v1/design_reviews?select=id,request_id,version,status,feedback,created_at,responded_at,token_hash&token_hash=eq.${tokenHash(token)}&limit=1`);
  if (!review) return null;
  const latest = await one(`/rest/v1/design_reviews?select=version&request_id=eq.${encodeURIComponent(review.request_id)}&order=version.desc&limit=1`);
  if (Number(latest?.version) > Number(review.version)) review.status = "superseded";
  const request = await one(`/rest/v1/requests?select=id,title,type,brand,store,requester,deadline,product,quantity,details,purpose,status,created&id=eq.${encodeURIComponent(review.request_id)}&limit=1`);
  if (!request) return null;
  const files = await db(`/rest/v1/design_files?select=id,kind,version,file_name,mime_type,size_bytes,description,object_path&review_id=eq.${encodeURIComponent(review.id)}&order=created_at.asc`);
  const downloads = await Promise.all((files || []).map(async file => ({ ...file, preview_url: await signedDownload(file, false), download_url: await signedDownload(file, true) })));
  return { review: { version: review.version, status: review.status, feedback: review.feedback, created_at: review.created_at, responded_at: review.responded_at }, request, files: downloads };
}

module.exports = async function handler(req, res) {
  if (!SERVICE_KEY) return json(res, 503, { error: "Vercel 환경 변수 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다." });
  try {
    if (req.method === "GET") {
      const token = String(req.query?.token || "");
      const data = await publicReview(token);
      return data ? json(res, 200, data) : json(res, 404, { error: "시안 링크를 찾을 수 없거나 만료되었습니다." });
    }
    if (req.method !== "POST") return json(res, 405, { error: "지원하지 않는 요청입니다." });
    const action = req.body?.action;

    if (action === "guest_upload" || action === "guest_register") {
      const requestId = String(req.body?.request_id || "");
      if (!/^DF-[a-f0-9-]{36}$/i.test(requestId) || !(await recentRequest(requestId))) return json(res, 404, { error: "최근 접수된 요청을 확인할 수 없습니다." });
      const mimeType = String(req.body?.mime_type || "");
      const size = Number(req.body?.size_bytes) || 0;
      const fileName = String(req.body?.file_name || "").slice(0, 240);
      if (!ALLOWED_MIME.has(mimeType) || size < 1 || size > 20 * 1024 * 1024 || !fileName) return json(res, 400, { error: "파일 형식 또는 크기를 확인해주세요. (파일당 최대 20MB)" });
      const existing = await db(`/rest/v1/design_files?select=id&request_id=eq.${encodeURIComponent(requestId)}&kind=eq.request_attachment`);
      if (existing.length >= 10) return json(res, 400, { error: "요청당 첨부 파일은 최대 10개까지 등록할 수 있습니다." });
      if (action === "guest_upload") {
        const safeName = fileName.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-120);
        const objectPath = `${requestId}/request_attachment/${crypto.randomUUID()}_${safeName}`;
        const signed = await db(`/storage/v1/object/upload/sign/${BUCKET}/${encodePath(objectPath)}`, { method: "POST", body: {} });
        if (!signed?.url) throw new Error("파일 업로드 링크를 만들지 못했습니다.");
        const uploadUrl = signed.url.startsWith("http") ? signed.url : `${SUPABASE_URL}/storage/v1${signed.url.startsWith("/") ? signed.url : `/${signed.url}`}`;
        return json(res, 200, { upload_url: uploadUrl, object_path: objectPath });
      }
      const objectPath = String(req.body?.object_path || "");
      if (!objectPath.startsWith(`${requestId}/request_attachment/`) || objectPath.includes("..")) return json(res, 400, { error: "첨부 파일 경로가 올바르지 않습니다." });
      await db("/rest/v1/design_files", { method: "POST", prefer: "return=minimal", body: { request_id: requestId, kind: "request_attachment", version: 0, file_name: fileName, object_path: objectPath, mime_type: mimeType, size_bytes: size, uploaded_by: null } });
      return json(res, 200, { ok: true });
    }

    if (action === "respond") {
      const token = String(req.body?.token || "");
      if (!/^[a-f0-9]{64}$/i.test(token)) return json(res, 404, { error: "시안 링크를 확인할 수 없습니다." });
      const review = await one(`/rest/v1/design_reviews?select=id,request_id,status,token_hash&token_hash=eq.${tokenHash(token)}&limit=1`);
      if (!review) return json(res, 404, { error: "시안 링크를 찾을 수 없습니다." });
      if (review.status !== "pending") return json(res, 409, { error: "이미 응답한 시안입니다." });
      const decision = req.body?.decision;
      const feedback = String(req.body?.feedback || "").trim().slice(0, 2000);
      if (!["approved", "revision_requested"].includes(decision)) return json(res, 400, { error: "응답을 선택해주세요." });
      if (decision === "revision_requested" && !feedback) return json(res, 400, { error: "수정 요청 내용을 입력해주세요." });
      await db(`/rest/v1/design_reviews?id=eq.${encodeURIComponent(review.id)}`, { method: "PATCH", body: { status: decision, feedback: feedback || null, responded_at: new Date().toISOString() }, prefer: "return=minimal" });
      await db(`/rest/v1/requests?id=eq.${encodeURIComponent(review.request_id)}`, { method: "PATCH", body: { status: decision === "approved" ? "디자인 승인" : "수정 요청" }, prefer: "return=minimal" });
      return json(res, 200, { ok: true, status: decision, feedback: feedback || null });
    }

    const profile = await requireStaff(req);
    if (action === "file_link") {
      const file = await one(`/rest/v1/design_files?select=id,request_id,object_path,file_name&id=eq.${encodeURIComponent(String(req.body?.file_id || ""))}&limit=1`);
      if (!file) return json(res, 404, { error: "파일을 찾을 수 없습니다." });
      return json(res, 200, { url: await signedDownload(file) });
    }
    if (action === "create_link") {
      if (profile.role !== "designer") return json(res, 403, { error: "디자이너만 시안 공유 링크를 만들 수 있습니다." });
      const requestId = String(req.body?.request_id || "");
      const request = await one(`/rest/v1/requests?select=id&id=eq.${encodeURIComponent(requestId)}&limit=1`);
      if (!request) return json(res, 404, { error: "요청을 찾을 수 없습니다." });
      const drafts = await db(`/rest/v1/design_files?select=id&request_id=eq.${encodeURIComponent(requestId)}&kind=eq.draft&review_id=is.null&order=created_at.asc`);
      if (!drafts?.length) return json(res, 400, { error: "링크로 공유할 새 시안을 먼저 올려주세요." });
      const latest = await one(`/rest/v1/design_reviews?select=version&request_id=eq.${encodeURIComponent(requestId)}&order=version.desc&limit=1`);
      const version = (Number(latest?.version) || 0) + 1;
      const token = crypto.randomBytes(32).toString("hex");
      await db(`/rest/v1/design_reviews?request_id=eq.${encodeURIComponent(requestId)}&status=eq.pending`, { method: "PATCH", body: { status: "superseded" }, prefer: "return=minimal" });
      const created = await db("/rest/v1/design_reviews", {
        method: "POST", prefer: "return=representation",
        body: { request_id: requestId, version, token_hash: tokenHash(token), status: "pending" }
      });
      const review = created?.[0];
      if (!review) throw new Error("시안 링크를 만들지 못했습니다.");
      const ids = drafts.map(file => file.id).join(",");
      await db(`/rest/v1/design_files?id=in.(${ids})`, { method: "PATCH", body: { review_id: review.id, version }, prefer: "return=minimal" });
      await db(`/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}`, { method: "PATCH", body: { status: "시안 확인" }, prefer: "return=minimal" });
      const origin = (process.env.APP_BASE_URL || req.headers.origin || "https://allbarundesign.vercel.app").replace(/\/$/, "");
      return json(res, 200, { url: `${origin}/?review=${token}`, version });
    }
    return json(res, 400, { error: "요청 작업을 확인할 수 없습니다." });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "요청 처리 중 문제가 발생했습니다." });
  }
};
