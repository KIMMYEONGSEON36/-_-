const today = new Date();
const isoDay = (offset = 0) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
let db = { requests: [], tasks: [], timeLogs: [], prices: [], requestProducts: [], files: [], reviews: [], requestItems: [], brands: [], masterItems: [], masterOptions: [], designArchive: [], masterAddresses: [], taskNotes: [] };
const reviewToken = new URLSearchParams(window.location.search).get("review") || "";
let route = reviewToken ? "public-review" : new URLSearchParams(window.location.search).get("request") === "1" ? "request-form" : "dashboard";
let selectedRequest = null;
let selectedTask = null;
let form = {};
let formStep = 0;
let requestFilter = "전체";
let searchTerm = "";
let taskFilter = "전체";
let toastTimer;
let currentUser = null;
let currentProfile = null;
let bootError = "";
let workspaceError = "";
let savedRequestRows = new Map();
let savedTaskRows = new Map();
let priceEditId = null;
let requestProductEditId = null;
let requestCatalogAvailable = false;
let requestCart = [];
let requestDraft = { requestType: "NEW", brandId: "", store: "", requester: "", title: "", purpose: "", details: "", deadline: "", deliverySearch: "", deliveryAddress: "" };
let cartDraft = {};
let cartEditIndex = -1;
let archiveThumbnailUrls = {};
let archiveThumbnailErrors = {};
let masterEdit = { type: "", id: "" };
let masterTab = "brands";
let quoteSelection = { product: "", size: "", material: "", printSide: "단면", quantity: 1, deliveryArea: "기본 배송", designTask: "print_only" };
const DESIGN_FEE_ITEMS = [
  { id: "print_only", level: "인쇄만", name: "기존 시안으로 인쇄", fee: 0, description: "디자인 작업 없이 준비된 시안으로 인쇄합니다." },
  { id: "text_edit", level: "A. 단순 수정형 · 난이도 하", name: "단순 텍스트 수정", fee: 5000, description: "기존 디자인에서 문구만 바꾸는 작업입니다." },
  { id: "size_change", level: "A. 단순 수정형 · 난이도 하", name: "기존 디자인 규격 변경", fee: 10000, description: "기존 디자인의 크기나 규격을 변경하는 작업입니다." },
  { id: "photo_edit", level: "A. 단순 수정형 · 난이도 하", name: "사진 보정 및 합성", fee: 20000, description: "기존 사진을 보정하거나 이미지끼리 합성하는 작업입니다." },
  { id: "element_edit", level: "A. 단순 수정형 · 난이도 하", name: "디자인 요소 추가 및 수정", fee: 30000, description: "기존 시안에 디자인 요소를 추가하거나 수정하는 작업입니다." },
  { id: "general_design", level: "B. 일반 제작 · 난이도 중", name: "일반 제작", fee: null, description: "기존 시안을 참고하되 새로운 레이아웃과 디자인 구성이 필요한 작업입니다." },
  { id: "creative_design", level: "C. 신규 제작 · 난이도 상", name: "신규 제작", fee: null, description: "디자인 콘셉트부터 비주얼 구성까지 새롭게 기획하는 작업입니다." }
];
let publicReviewData = null;
let publicReviewError = "";
let reviewShareLink = "";
let fileUploadError = "";

function rowRequest(r) {
  return { id: r.id, requested_by: r.requested_by ?? (currentProfile?.role === "sv" ? currentUser?.id : null), title: r.title, type: r.type, brand: r.brand, store: r.store || null, requester: r.requester, contact: r.contact || null, created: r.created, deadline: r.deadline || null, status: r.status, priority: r.priority, purpose: r.purpose, details: r.details, product: r.product || null, quantity: r.quantity || null, ...(requestCatalogAvailable ? { print_side: r.print_side || "단면" } : {}), use: r.use || null, reference: r.reference || null, ai: r.ai || null };
}
function rowTask(t) { return { id: t.id, request_id: t.requestId, name: t.name, step: t.step, brand: t.brand, due: t.due || null, status: t.status, priority: t.priority, estimate: Number(t.estimate) || 0, actual: Number(t.actual) || 0, completed_at: t.completedAt || null }; }
function mapRequest(r) { return { ...r, created: String(r.created || "").slice(0,10), deadline: r.deadline ? String(r.deadline).slice(0,10) : "", ai: r.ai || { summary: "", missing: [], steps: [] } }; }
function mapTask(t) { return { id: t.id, requestId: t.request_id, name: t.name, step: t.step, brand: t.brand, due: t.due ? String(t.due).slice(0,10) : "", status: t.status, priority: t.priority, estimate: t.estimate, actual: t.actual, completedAt: t.completed_at || null }; }
function mapTimeLog(l) { return { id: l.id, taskId: l.task_id, minutes: l.minutes, note: l.note || "", date: String(l.date || "").slice(0,10) }; }
async function loadWorkspaceData() {
  const prices = await DesignFlowData.select("price_items", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "product.asc,size.asc,material.asc");
  db.prices = prices || [];
  const [requests, tasks, logs, files, reviews, requestItems, brands, masterItems, masterOptions, designArchive, masterAddresses, taskNotes] = await Promise.all([
    DesignFlowData.select("requests", {}, "created.desc"),
    DesignFlowData.select("tasks", {}, "due.asc"),
    currentProfile.role === "designer" ? DesignFlowData.select("time_logs", {}, "date.desc") : Promise.resolve([]),
    DesignFlowData.select("design_files", {}, "created_at.desc"),
    currentProfile.role === "designer" ? DesignFlowData.select("design_reviews", {}, "created_at.desc") : Promise.resolve([]),
    DesignFlowData.select("request_items", {}, "created_at.asc").catch(() => []),
    DesignFlowData.select("master_brands", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "sort_order.asc,name.asc").catch(() => []),
    DesignFlowData.select("master_items", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "sort_order.asc,name.asc").catch(() => []),
    DesignFlowData.select("master_options", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "sort_order.asc,name.asc").catch(() => []),
    DesignFlowData.select("design_archive", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "sort_order.asc,design_name.asc").catch(() => []),
    DesignFlowData.select("master_addresses", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "sort_order.asc,name.asc").catch(() => []),
    DesignFlowData.select("task_notes", {}, "created_at.desc").catch(() => [])
  ]);
  let requestProducts = [];
  try { requestProducts = await DesignFlowData.select("request_products", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "product.asc"); requestCatalogAvailable = true; } catch { requestCatalogAvailable = false; /* Existing projects need the matching database migration. */ }
  db.requests = (requests || []).map(mapRequest);
  db.tasks = (tasks || []).map(mapTask);
  db.timeLogs = (logs || []).map(mapTimeLog);
  db.files = files || [];
  db.reviews = reviews || [];
  db.requestItems = requestItems || [];
  db.brands = brands || [];
  db.masterItems = masterItems || [];
  db.masterOptions = masterOptions || [];
  db.designArchive = designArchive || [];
  db.masterAddresses = masterAddresses || [];
  db.taskNotes = taskNotes || [];
  db.requestProducts = requestProducts || [];
  savedRequestRows = new Map(db.requests.map(r => [r.id, JSON.stringify(rowRequest(r))]));
  savedTaskRows = new Map(db.tasks.map(t => [t.id, JSON.stringify(rowTask(t))]));
}
async function loadPublicRequestMasters() {
  const [brands,items,options,archive,addresses]=await Promise.all([
    DesignFlowData.select("master_brands",{is_active:"eq.true"},"sort_order.asc,name.asc"),
    DesignFlowData.select("master_items",{is_active:"eq.true"},"sort_order.asc,name.asc"),
    DesignFlowData.select("master_options",{is_active:"eq.true"},"sort_order.asc,name.asc"),
    DesignFlowData.select("design_archive",{is_active:"eq.true"},"sort_order.asc,design_name.asc"),
    DesignFlowData.select("master_addresses",{is_active:"eq.true"},"sort_order.asc,name.asc")
  ]);
  db.brands=brands||[];db.masterItems=items||[];db.masterOptions=options||[];db.designArchive=archive||[];db.masterAddresses=addresses||[];
}
async function saveData() {
  if (currentProfile?.role !== "designer") return;
  const priorRequestStatuses = new Map(db.requests.map(r => [r.id, r.status]));
  syncRequestStatusesFromTasks();
  try {
    for (const t of db.tasks) {
      const row = rowTask(t); const serialized = JSON.stringify(row); const previous = savedTaskRows.get(t.id);
      if (previous !== serialized) {
        if (previous) await DesignFlowData.update("tasks", t.id, row);
        else await DesignFlowData.insert("tasks", row);
        savedTaskRows.set(t.id, serialized);
      }
    }
    for (const r of db.requests) {
      const row = rowRequest(r); const serialized = JSON.stringify(row); const previous = savedRequestRows.get(r.id);
      if (previous !== serialized) {
        if (previous) await DesignFlowData.update("requests", r.id, row);
        else await DesignFlowData.insert("requests", row);
        savedRequestRows.set(r.id, serialized);
      }
    }
  } catch (error) {
    for (const r of db.requests) if (priorRequestStatuses.has(r.id)) r.status = priorRequestStatuses.get(r.id);
    notify(`저장하지 못했어요: ${error.message}`); throw error;
  }
}
function syncRequestStatusesFromTasks() {
  for (const r of db.requests) {
    const linked = db.tasks.filter(t => t.requestId === r.id);
    if (!linked.length) continue;
    if (linked.every(t => t.status === "완료")) r.status = "완료";
    else if (r.status === "완료" || r.status === "보류") r.status = "작업 진행";
  }
}
function esc(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dateLabel(value) { if (!value) return "미정"; const d = new Date(`${value}T00:00:00`); return `${d.getMonth() + 1}월 ${d.getDate()}일`; }
function completedAtLabel(task) { return task.status === "완료" ? (task.completedAt ? new Date(task.completedAt).toLocaleString("ko-KR") : "기록 없음 (기존 완료 건)") : "미완료"; }
function dayDiff(value) { if (!value) return 999; return Math.ceil((new Date(`${value}T00:00:00`) - new Date(`${isoDay()}T00:00:00`)) / 86400000); }
function statusClass(status) { return ({ "접수": "blue", "확인": "purple", "작업중": "blue", "검토 중": "blue", "정보 요청": "amber", "분석 완료": "purple", "작업 진행": "blue", "시안 확인": "purple", "수정 요청": "amber", "디자인 승인": "green", "완료": "green", "보류": "amber", "진행 중": "blue", "검토": "purple", "대기": "", "보류 중": "amber" })[status] || ""; }
function priorityClass(priority) { return ({ "긴급": "red", "높음": "amber", "보통": "blue", "낮음": "" })[priority] || ""; }
function badge(text, cls = statusClass(text)) { return `<span class="badge ${cls}">${esc(text)}</span>`; }
function notify(message) { const old = document.querySelector(".toast"); if (old) old.remove(); const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.remove(), 2600); }
function go(next, data = null) { if (currentProfile?.role === "sv" && ["tasks","task-detail","calendar","prices","master-data"].includes(next)) next = "requests"; route = next; if (next === "request-detail") selectedRequest = data; if (next === "task-detail") selectedTask = data; window.scrollTo(0, 0); render(); }

function layout(content) {
  const designerItems = [["dashboard", "◫", "대시보드"], ["requests", "▤", "요청 관리"], ["tasks", "☷", "작업 관리"], ["calendar", "▦", "일정"], ["master-data", "⚙", "운영 데이터 관리"], ["quote", "₩", "견적 확인"], ["prices", "⊞", "단가표 관리"]];
  const navItems = currentProfile?.role === "designer" ? designerItems : [["quote", "₩", "견적 확인"], ["requests", "▤", "요청 진행상황"]];
  const current = route === "request-form" || route === "request-success" ? "request-form" : route;
  const displayName = currentProfile?.display_name || "직원";
  const avatarName = displayName.slice(0, 1);
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">D</div><div><div class="brand-name">Design Flow</div><div class="brand-caption">DESIGN WORKSPACE</div></div></div><div class="nav-label">${currentProfile?.role === "designer" ? "DESIGNER WORKSPACE" : "SV WORKSPACE"}</div><nav class="nav">${navItems.map(([key, icon, label]) => `<button class="nav-item ${current === key ? "active" : ""}" data-go="${key}"><span class="nav-icon">${icon}</span>${label}</button>`).join("")}<button class="nav-item ${current === "request-form" ? "active" : ""}" data-go="request-form"><span class="nav-icon">＋</span>새 작업 요청</button></nav><div class="sidebar-bottom"><div class="demo-note"><strong>공용 데이터 연결</strong><span>요청과 단가가 승인된 계정에 공유됩니다.<br>제주 배송 추가 비용은 단가 설정에 따릅니다.</span></div><div class="user-chip"><div class="avatar">${esc(avatarName)}</div><div><div class="user-name">${esc(displayName)}</div><div class="user-role">${currentProfile?.role === "designer" ? "디자이너" : "SV"}</div></div></div></div></aside><main class="main"><header class="topbar"><div class="crumb-wrap"><button class="mobile-menu" id="menu-toggle" aria-label="메뉴 열기">☰</button><div class="crumb">워크스페이스　/　${routeTitle()}</div></div><div class="top-actions"><button class="btn small" id="sign-out">로그아웃</button><div class="avatar">${esc(avatarName)}</div></div></header>${workspaceError ? `<div class="workspace-alert">${esc(workspaceError)}</div>` : ""}${content}<div class="footer-note">Design Flow · 공용 데이터 공간</div></main></div>`;
}
function routeTitle() { if (route === "requests" && currentProfile?.role === "sv") return "요청 진행상황"; return ({ dashboard: "대시보드", requests: "요청 관리", "request-detail": "요청 상세", "request-form": "새 요청 접수", "request-success": "접수 완료", tasks: "작업 관리", "task-detail": "작업 상세", calendar: "일정", quote: "견적 확인", prices: "단가표 관리", "master-data": "운영 데이터 관리" })[route] || "대시보드"; }
function head(eyebrow, title, desc, action = "") { return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><div class="subhead">${desc}</div></div>${action}</div>`; }

function publicLayout(content) {
  return `<main class="public-main"><header class="public-header"><a class="brand" href="#"><span class="brand-mark">D</span><span class="brand-name">Design Flow</span></a><button class="btn small" data-go="login">직원 로그인</button></header>${content}<div class="footer-note">Design Flow · 디자인 요청 포털</div></main>`;
}
function loginPage() {
  return `<section class="login-page"><div class="login-card"><div class="brand-mark login-mark">D</div><div class="eyebrow">DESIGN FLOW WORKSPACE</div><h1>직원 로그인</h1><p class="subhead">초대받은 디자이너와 SV 계정으로 로그인하세요.</p><form id="login-form"><div class="field"><label for="login-email">이메일</label><input id="login-email" type="email" autocomplete="username" required placeholder="name@company.com" /></div><div class="field" style="margin-top:14px"><label for="login-password">비밀번호</label><input id="login-password" type="password" autocomplete="current-password" required placeholder="비밀번호" /></div><div class="form-error" id="login-error">${esc(bootError)}</div><button class="btn primary login-submit" type="submit">로그인</button></form><div class="login-divider">또는</div><button class="text-link" data-go="request-form">디자인 요청 접수하기 →</button></div><p class="login-foot">계정은 관리자에게 초대받은 직원만 사용할 수 있습니다.</p></section>`;
}
function startupPage() {
  return `<section class="login-page"><div class="login-card"><div class="brand-mark login-mark">D</div><div class="eyebrow">DESIGN FLOW SETUP</div><h1>데이터베이스 설정이 필요해요</h1><p class="subhead">Supabase 프로젝트에 데이터베이스 구조를 먼저 적용해야 앱을 연결할 수 있습니다.</p><div class="setup-callout">프로젝트 폴더의 <strong>supabase/schema.sql</strong> 내용을 Supabase 대시보드의 SQL Editor에서 실행한 뒤 새로고침해주세요.</div><button class="btn" data-go="request-form">디자인 요청 접수 열기</button></div></section>`;
}
function productPrintSides(product) {
  const configured = db.requestProducts.find(row => row.product === product)?.allowed_print_sides;
  return Array.isArray(configured) && configured.length ? configured : ["단면", "양면"];
}
function quotePricesFor(product = quoteSelection.product, size = quoteSelection.size) {
  const sides = productPrintSides(product);
  if (!sides.includes(quoteSelection.printSide)) quoteSelection.printSide = sides[0];
  return db.prices.filter(p => p.product === product && sides.includes(p.print_side || "단면") && (p.print_side || "단면") === quoteSelection.printSide && (currentProfile.role === "designer" || p.is_active) && (!size || p.size === size));
}
function productQuantityOptions(product) {
  const item = db.requestProducts.find(row => row.product === product);
  const configured = Array.isArray(item?.quantity_options) ? item.quantity_options.map(Number).filter(value => Number.isInteger(value) && value > 0) : [];
  if (configured.length) return [...new Set(configured)].sort((a,b) => a-b);
  if (product === "포스터") return [5,10,20,30,40,80];
  const minimum = Number(item?.minimum_quantity) || 1;
  const step = Number(item?.quantity_step) || 1;
  return Array.from({ length: 20 }, (_,index) => minimum + index * step);
}
function productSingleUnitOrder(product) { return db.requestProducts.find(row => row.product === product)?.single_unit_order === true; }
function productQuantityRule(product) { const options = productQuantityOptions(product); const item = db.requestProducts.find(row => row.product === product); return { minimum: productSingleUnitOrder(product) ? Number(item?.minimum_quantity) || options[0] || 1 : options[0] || 1, options, singleUnit: productSingleUnitOrder(product) }; }
function quantityUnit(product) { return product === "포스터" ? "매" : "개"; }
function productQuantitySummary(product) { const rule = productQuantityRule(product); return rule.singleUnit ? `${rule.minimum}${quantityUnit(product)}부터 ${quantityUnit(product)} 단위` : rule.options.map(value => `${value}${quantityUnit(product)}`).join(" · "); }
function normalizeQuantity(value, options, minimum = options[0] || 1) { const qty = Math.max(minimum, Math.floor(Number(value) || minimum)); if (!options.length) return qty; return options.find(option => option >= qty) ?? options[options.length - 1] ?? qty; }
function stepQuantity(value, direction, options) { const current = normalizeQuantity(value, options); const index = options.indexOf(current); return options[Math.max(0, Math.min(options.length - 1, index + direction))]; }
function formatQuantityOptions(options = []) { return (Array.isArray(options) ? options : []).join(", "); }
function parseQuantityOptions(value) {
  const tokens = value.split(/[\s,，]+/).filter(Boolean);
  const parsed = tokens.map(Number);
  if (!parsed.length || parsed.some(value => !Number.isInteger(value) || value < 1)) throw new Error("주문 가능 수량을 1 이상의 정수로 쉼표 구분해 입력해주세요.");
  return [...new Set(parsed)].sort((a,b) => a-b);
}
function priceForQuantity(price, quantity) {
  const tiers = Array.isArray(price?.quantity_tiers) ? [...price.quantity_tiers].sort((a,b) => Number(a.minimum_quantity)-Number(b.minimum_quantity)) : [];
  const tier = tiers.filter(item => Number(item.minimum_quantity) <= quantity).pop();
  return Number(tier?.unit_price_krw ?? price?.unit_price_krw) || 0;
}
function formatPriceTiers(tiers = []) { return (Array.isArray(tiers) ? tiers : []).map(item => `${item.minimum_quantity}=${item.unit_price_krw}`).join("\n"); }
function parsePriceTiers(value, product, minimumQuantity) {
  const rows = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^(\d+)\s*[=:]\s*(\d+)$/);
    if (!match) throw new Error("수량별 단가는 ‘수량=매당 단가’ 형식으로 입력해주세요. (예: 10=3200)");
    return { minimum_quantity: Number(match[1]), unit_price_krw: Number(match[2]) };
  }).sort((a,b) => a.minimum_quantity-b.minimum_quantity);
  const allowed = productQuantityOptions(product);
  const rule = productQuantityRule(product);
  const minimum = Math.max(rule.minimum, Number(minimumQuantity) || 1);
  const invalidQuantity = row => rule.singleUnit ? row.minimum_quantity < minimum : !allowed.includes(row.minimum_quantity) || row.minimum_quantity < minimum;
  if (rows.some((row,index) => invalidQuantity(row) || row.unit_price_krw < 0 || (index && row.minimum_quantity === rows[index-1].minimum_quantity))) throw new Error(rule.singleUnit ? `수량 구간은 최소 주문 수량(${minimum}${quantityUnit(product)}) 이상으로 입력해주세요.` : `수량 구간은 최소 주문 수량 이상이며 주문 가능 수량(${allowed.join(", ")}) 안에서 입력해주세요.`);
  return rows;
}
function quoteMinimumFor(product = quoteSelection.product, size = quoteSelection.size, material = quoteSelection.material) {
  const productRows = quotePricesFor(product, "");
  const sizes = [...new Set(productRows.map(p => p.size))].sort();
  const selectedSize = sizes.includes(size) ? size : sizes[0];
  const sizeRows = productRows.filter(p => p.size === selectedSize);
  const materials = [...new Set(sizeRows.map(p => p.material))].sort();
  const selectedMaterial = materials.includes(material) ? material : materials[0];
  const chosen = sizeRows.find(p => p.material === selectedMaterial && (p.print_side || "단면") === quoteSelection.printSide);
  const rule = productQuantityRule(product);
  const minimum = Math.max(rule.minimum, Number(chosen?.minimum_quantity) || 1);
  return rule.singleUnit ? minimum : rule.options.find(value => value >= minimum) || minimum;
}
function quotePage() {
  const productNames = [...new Set(db.prices.map(p => p.product))].sort();
  if (!productNames.includes(quoteSelection.product)) quoteSelection.product = productNames[0] || "";
  const allowedPrintSides = productPrintSides(quoteSelection.product);
  if (!allowedPrintSides.includes(quoteSelection.printSide)) quoteSelection.printSide = allowedPrintSides[0];
  const productRows = quotePricesFor(quoteSelection.product);
  const sizes = [...new Set(productRows.map(p => p.size))].sort();
  if (!sizes.includes(quoteSelection.size)) quoteSelection.size = sizes[0] || "";
  const sizeRows = quotePricesFor(quoteSelection.product, quoteSelection.size);
  const materials = [...new Set(sizeRows.map(p => p.material))].sort();
  if (!materials.includes(quoteSelection.material)) quoteSelection.material = materials[0] || "";
  const chosen = sizeRows.find(p => p.material === quoteSelection.material && (p.print_side || "단면") === quoteSelection.printSide);
  const quantityRule = productQuantityRule(quoteSelection.product);
  const minimumQuantity = Math.max(quantityRule.minimum, Number(chosen?.minimum_quantity) || 1);
  const options = quantityRule.options.filter(value => value >= minimumQuantity);
  const unit = quantityUnit(quoteSelection.product);
  const qty = normalizeQuantity(quoteSelection.quantity, quantityRule.singleUnit ? [] : options, minimumQuantity);
  quoteSelection.quantity = qty;
  const jejuFee = quoteSelection.deliveryArea === "제주도" ? Number(chosen?.jeju_shipping_krw) || 0 : 0;
  const designTask = DESIGN_FEE_ITEMS.find(item => item.id === quoteSelection.designTask) || DESIGN_FEE_ITEMS[0];
  const quoteRequired = designTask.fee === null;
  const appliedUnitPrice = chosen ? priceForQuantity(chosen, qty) : 0;
  const printSubtotal = chosen ? appliedUnitPrice * qty + jejuFee : 0;
  const total = printSubtotal + (quoteRequired ? 0 : designTask.fee);
  const designDescription = `${designTask.level} · ${designTask.description}${designTask.fee === null ? " 디자인비는 접수 후 별도 견적합니다." : ` 디자인비 ₩${designTask.fee.toLocaleString("ko-KR")}`}`;
  const notice = `<div class="quote-notice"><strong>점주님 간단 문의용 참고 견적입니다</strong><p>실제 금액은 작업 난이도와 제작 조건에 따라 달라질 수 있습니다. 주문 접수 후 상세 견적을 안내드립니다.</p></div>`;
  return `<section class="page">${head("QUICK QUOTE", "간편 견적 확인", "제작 조건과 디자인 작업 범위를 선택해 예상 금액을 확인하세요.")}${notice}${productNames.length ? `<div class="quote-layout"><div class="panel quote-form"><div class="section-label">제작 조건 선택</div><div class="field"><label for="quote-product">품목</label><select id="quote-product">${productNames.map(p => `<option ${quoteSelection.product === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></div><div class="field quote-field"><label for="quote-size">크기</label><select id="quote-size">${sizes.map(s => `<option ${quoteSelection.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div><div class="field quote-field"><label for="quote-material">재질</label><select id="quote-material">${materials.map(m => `<option ${quoteSelection.material === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div><div class="field quote-field"><label for="quote-print-side">인쇄 면</label><select id="quote-print-side">${allowedPrintSides.map(side => `<option ${quoteSelection.printSide === side ? "selected" : ""}>${side}</option>`).join("")}</select></div><div class="field quote-field"><label for="quote-delivery-area">배송 지역</label><select id="quote-delivery-area"><option ${quoteSelection.deliveryArea === "기본 배송" ? "selected" : ""}>기본 배송</option><option ${quoteSelection.deliveryArea === "제주도" ? "selected" : ""}>제주도</option></select></div><div class="field quote-field"><label for="quote-design-task">디자인 작업 범위 · 난이도</label><select id="quote-design-task">${DESIGN_FEE_ITEMS.map(item => `<option value="${item.id}" ${quoteSelection.designTask === item.id ? "selected" : ""}>${esc(item.level)} — ${esc(item.name)}${item.fee === null ? " · 별도 견적" : ` · ₩${item.fee.toLocaleString("ko-KR")}`}</option>`).join("")}</select><div class="helper">${esc(designDescription)}</div></div><div class="field quote-field"><label for="quote-quantity">수량</label>${quantityRule.singleUnit ? `<input id="quote-quantity" type="number" min="${minimumQuantity}" step="1" value="${qty}" />` : `<div class="quantity-control"><button class="quantity-step" data-qty="-1" aria-label="수량 줄이기">−</button><select id="quote-quantity">${options.map(option => `<option value="${option}" ${qty === option ? "selected" : ""}>${option}${unit}</option>`).join("")}</select><button class="quantity-step" data-qty="1" aria-label="수량 늘리기">＋</button></div>`}<div class="helper">${quantityRule.singleUnit ? `${minimumQuantity}${unit}부터 ${unit} 단위로 주문할 수 있습니다.` : `주문 가능 수량: ${options.map(option => `${option}${unit}`).join(" · ")}`}</div></div></div><div class="panel quote-result"><div class="quote-label">${quoteRequired ? "제작비 예상 소계 · 디자인비 별도" : "예상 견적 금액"}</div><div class="quote-total">${chosen ? `₩${total.toLocaleString("ko-KR")}` : "조건을 선택해주세요"}</div>${chosen ? `<div class="quote-math"><span>제작비 · ${esc(chosen.product)} ${esc(chosen.size)} ${esc(chosen.material)} ${quoteSelection.printSide} ${qty}${unit}</span><span>₩${(appliedUnitPrice * qty).toLocaleString("ko-KR")}</span><span>적용 단가</span><span>₩${appliedUnitPrice.toLocaleString("ko-KR")} / ${unit}</span><span>디자인비 · ${esc(designTask.name)}</span><span>${designTask.fee === null ? "접수 후 별도 견적" : `₩${designTask.fee.toLocaleString("ko-KR")}`}</span>${jejuFee ? `<span>제주 추가 배송비</span><span>₩${jejuFee.toLocaleString("ko-KR")}</span>` : ""}</div><div class="quote-rule">제작 단가에는 부가세와 기본 배송비가 포함됩니다.</div>` : ""}<div class="quote-disclaimer">${quoteRequired ? "선택한 작업은 새 레이아웃 또는 콘셉트 기획이 포함되어 디자인비를 접수 후 산정합니다." : "표시된 금액은 기준 단가에 디자인비를 더한 참고 금액입니다."} 실제 금액은 조건에 따라 달라질 수 있으며, 주문 접수 후 자세한 견적을 안내드립니다.</div><button class="btn" id="copy-quote" ${chosen ? "" : "disabled"}>견적 내용 복사</button></div></div>` : `<div class="panel empty-price"><div class="empty-illustration">₩</div><h2>등록된 단가가 아직 없어요</h2><p>${currentProfile.role === "designer" ? "단가표 관리에서 품목·크기·재질별 가격을 먼저 등록해주세요." : "디자인 담당자가 단가를 준비 중입니다. 잠시 후 다시 확인해주세요."}</p>${currentProfile.role === "designer" ? `<button class="btn primary" data-go="prices">단가 등록하기</button>` : ""}</div>`}<div class="panel design-fee-guide"><div class="panel-title">디자인 난이도별 기준</div><div class="design-fee-grid"><div><strong>A · 단순 수정형 <span>난이도 하</span></strong><p>텍스트 수정 ₩5,000 · 규격 변경 ₩10,000</p><p>사진 보정·합성 ₩20,000 · 디자인 요소 추가·수정 ₩30,000</p></div><div><strong>B · 일반 제작 <span>난이도 중</span></strong><p>기존 시안을 참고해 새 레이아웃과 디자인 구성이 필요한 작업입니다.</p><p>디자인비는 접수 후 별도 견적합니다.</p></div><div><strong>C · 신규 제작 <span>난이도 상</span></strong><p>디자인 콘셉트부터 비주얼 구성까지 새롭게 기획하는 작업입니다.</p><p>디자인비는 접수 후 별도 견적합니다.</p></div></div></div></section>`;
}
function pricesPage() {
  const editing = db.prices.find(p => String(p.id) === String(priceEditId));
  const editingCatalog = db.requestProducts.find(item => String(item.id) === String(requestProductEditId));
  const rows = db.prices.filter(price=>productPrintSides(price.product).includes(price.print_side||"단면")).sort((a,b) => `${a.product}${a.print_side || "단면"}${a.size}${a.material}`.localeCompare(`${b.product}${b.print_side || "단면"}${b.size}${b.material}`));
  return `<section class="page">${head("PRICE CATALOG", "단가표 관리", "제작 단가와 난이도별 디자인비 기준을 함께 확인할 수 있습니다.")}
    <div class="panel price-editor"><div class="panel-head"><div><div class="panel-title">${editing ? "단가 수정" : "새 단가 등록"}</div><div class="panel-sub">부가세와 배송비가 포함된 최종 단가를 입력하세요.</div></div>${editing ? `<button class="btn small" id="cancel-price-edit">취소</button>` : ""}</div>
    <form id="price-form" class="price-form"><div class="field"><label for="price-product">품목</label><input id="price-product" required maxlength="80" value="${esc(editing?.product || "")}" placeholder="예: 포스터" /></div><div class="field"><label for="price-side">허용 인쇄 면</label><select id="price-side">${productPrintSides(editing?.product||"").map(side=>`<option ${(!editing&&side==="단면")||(editing&&(editing.print_side||"단면")===side)?"selected":""}>${side}</option>`).join("")}</select><div class="helper">품목에서 허용한 인쇄 면만 선택할 수 있습니다.</div></div><div class="field"><label for="price-size">크기</label><input id="price-size" required maxlength="80" value="${esc(editing?.size || "")}" placeholder="예: A2" /></div><div class="field"><label for="price-material">재질</label><input id="price-material" required maxlength="100" value="${esc(editing?.material || "")}" placeholder="예: 아트지 150g" /></div><div class="field"><label for="price-minimum">최소 주문 수량</label><input id="price-minimum" type="number" min="1" step="1" required value="${editing ? Number(editing.minimum_quantity) || 1 : 1}" placeholder="예: 5" /><div class="helper">이 단가 조합에 적용할 최소 주문 수량입니다.</div></div><div class="field"><label for="price-unit">매당 단가 (원)</label><input id="price-unit" type="number" min="0" step="1" required value="${editing ? Number(editing.unit_price_krw) : ""}" placeholder="예: 3500" /></div><div class="field full price-tier-field"><label for="price-tiers">수량 구간별 매당 단가 (선택)</label><textarea id="price-tiers" rows="3" placeholder="기본 단가보다 낮아지는 수량 구간을 입력&#10;예: 10=3200&#10;20=2900&#10;30=2700">${esc(formatPriceTiers(editing?.quantity_tiers || []))}</textarea><div class="helper">기본 단가보다 낮아지는 주문 구간을 입력하세요. 예: 기본 5매 3,500원, 10=3,200원. 각 구간 이상 주문할 때 해당 매당 단가를 적용합니다.</div></div><div class="field"><label for="price-jeju">제주 추가 배송비 (원)</label><input id="price-jeju" type="number" min="0" step="1" required value="${Number(editing?.jeju_shipping_krw) || 0}" placeholder="예: 5000" /></div><button class="btn primary price-save" type="submit">${editing ? "변경 저장" : "단가 추가"}</button></form></div>
    <div class="panel request-product-editor"><div class="panel-head"><div><div class="panel-title">요청 접수 품목 및 주문 수량 설정</div><div class="panel-sub">품목마다 실제 주문 가능한 수량을 직접 등록하면 접수 폼과 간편 견적에 적용됩니다.</div></div></div><form id="request-product-form" class="price-form"><div class="field"><label for="catalog-product">제작물 이름</label><input id="catalog-product" required maxlength="80" value="${esc(db.requestProducts.find(item => String(item.id) === String(requestProductEditId))?.product || "")}" placeholder="예: 포스터" /></div><div class="field"><label>허용 인쇄 면</label><div class="catalog-side-options">${["단면", "양면"].map(side => `<label><input type="checkbox" name="allowed-print-side" value="${side}" ${(editingCatalog?.allowed_print_sides || ["단면", "양면"]).includes(side) ? "checked" : ""}> ${side}</label>`).join("")}</div><div class="helper">이 품목에 제공할 인쇄 면을 선택하세요.</div></div><div class="field"><label for="catalog-minimum">최소 주문 수량</label><input id="catalog-minimum" type="number" min="1" step="1" required ${editingCatalog?.single_unit_order ? "" : "disabled"} value="${Number(editingCatalog?.minimum_quantity) || 1}" /></div><div class="field"><label class="catalog-single-unit-toggle"><input id="catalog-single-unit" type="checkbox" ${editingCatalog?.single_unit_order ? "checked" : ""} />최소 수량부터 낱개 단위로 주문 허용</label><div class="helper">포스터는 최소 매수부터 1매씩 선택할 수 있어요.</div></div><div class="field full"><label for="catalog-quantities">직접 지정할 주문 가능 수량</label><input id="catalog-quantities" ${editingCatalog?.single_unit_order ? "disabled" : "required"} value="${requestProductEditId ? esc(formatQuantityOptions(productQuantityOptions(db.requestProducts.find(item => String(item.id) === String(requestProductEditId))?.product || ""))) : ""}" placeholder="예: 5, 10, 20, 30, 40, 80" /><div class="helper">체크를 끄면 쉼표로 구분해 불규칙한 수량을 직접 등록합니다.</div></div><button class="btn primary price-save" type="submit">${requestProductEditId ? "변경 저장" : "품목 등록"}</button>${requestProductEditId ? `<button class="btn" type="button" id="cancel-catalog-edit">취소</button>` : ""}</form><div class="catalog-product-list">${db.requestProducts.map(item => `<div class="catalog-product-row"><strong>${esc(item.product)}</strong><span>주문 가능: ${productQuantitySummary(item.product)} · 인쇄 ${productPrintSides(item.product).join("·")}</span><button class="text-link" data-catalog-edit="${item.id}">수정</button><button class="toggle-pill ${item.is_active ? "on" : ""}" data-catalog-active="${item.id}">${item.is_active ? "접수 사용" : "숨김"}</button><button class="text-link danger-text" data-catalog-delete="${item.id}">삭제</button></div>`).join("") || `<div class="empty">등록된 품목이 없습니다.</div>`}</div></div>
    <div class="panel design-fee-guide"><div class="panel-title">디자인비 기준표</div><div class="design-fee-grid"><div><strong>A · 단순 수정형 <span>난이도 하</span></strong><p>단순 텍스트 수정 <b>₩5,000</b></p><p>기존 디자인 규격 변경 <b>₩10,000</b></p><p>사진 보정 및 합성 <b>₩20,000</b></p><p>디자인 요소 추가 및 수정 <b>₩30,000</b></p></div><div><strong>B · 일반 제작 <span>난이도 중</span></strong><p>기존 시안을 참고하되 새로운 레이아웃과 디자인 구성이 필요한 작업</p><p class="design-fee-separate">디자인비: 접수 후 별도 견적</p></div><div><strong>C · 신규 제작 <span>난이도 상</span></strong><p>디자인 콘셉트부터 비주얼 구성까지 새롭게 기획하는 작업</p><p class="design-fee-separate">디자인비: 접수 후 별도 견적</p></div></div><div class="quote-disclaimer">표시된 단가는 참고용이며 작업 범위와 제작 조건에 따라 달라질 수 있습니다. 점주님의 간단한 문의를 위한 기준으로, 주문 접수 후 자세한 견적을 안내드립니다.</div></div>
    <div class="panel price-table-wrap"><div class="panel-head"><div><div class="panel-title">등록된 단가</div><div class="panel-sub">총 ${rows.length}개 조합</div></div></div>${rows.length ? `<div class="price-table"><div class="price-head"><span>품목</span><span>면</span><span>크기</span><span>재질</span><span>기본 단가</span><span>수량별 단가</span><span>주문 규칙</span><span>제주 배송비</span><span>SV 공개</span><span>관리</span></div>${rows.map(p => `<div class="price-row ${p.is_active ? "" : "inactive"}"><strong>${esc(p.product)}</strong><span>${esc(p.print_side || "단면")}</span><span>${esc(p.size)}</span><span>${esc(p.material)}</span><strong>₩${Number(p.unit_price_krw).toLocaleString("ko-KR")}</strong><span>${(p.quantity_tiers || []).length ? p.quantity_tiers.map(tier => `${Number(tier.minimum_quantity)}${quantityUnit(p.product)}~ ₩${Number(tier.unit_price_krw).toLocaleString("ko-KR")}`).join(" · ") : "기본 단가"}</span><span>최소 ${Number(p.minimum_quantity) || 1}${quantityUnit(p.product)} · ${productQuantitySummary(p.product)}</span><span>₩${(Number(p.jeju_shipping_krw) || 0).toLocaleString("ko-KR")}</span><span><button class="toggle-pill ${p.is_active ? "on" : ""}" data-price-active="${p.id}">${p.is_active ? "공개" : "숨김"}</button></span><span class="price-actions"><button class="text-link" data-price-edit="${p.id}">수정</button><button class="text-link danger-text" data-price-delete="${p.id}">삭제</button></span></div>`).join("")}</div>` : `<div class="empty">아직 등록한 단가가 없습니다. 위에서 첫 단가를 추가해보세요.</div>`}</div></section>`;
}

function dashboard() {
  const pending = db.requests.filter(r => ["접수", "검토 중", "정보 요청"].includes(r.status)).length;
  const active = db.tasks.filter(t => t.status === "작업중").length;
  const overdue = db.tasks.filter(t => dayDiff(t.due) < 0 && t.status !== "완료").length;
  const totalMinutes = db.tasks.reduce((s, t) => s + Number(t.estimate || 0), 0);
  const openReq = [...db.requests].sort((a, b) => a.created < b.created ? 1 : -1).slice(0, 4);
  const todayTasks = [...db.tasks].filter(t => t.status !== "완료").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const done = db.tasks.filter(t => t.status === "완료").length;
  const progress = db.tasks.length ? Math.round(done / db.tasks.length * 100) : 0;
  return `<section class="page">${head(`MONDAY, ${today.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()}`, "좋은 하루예요, 디자이너님 👋", "오늘의 요청과 작업 현황을 확인해보세요.", `<button class="btn primary" data-go="request-form">＋　새 요청 접수</button>`)}<div class="metrics"><div class="metric"><div class="metric-top">검토할 요청 <span class="metric-icon">▤</span></div><div class="metric-value">${pending}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">진행 중 작업 <span class="metric-icon">◷</span></div><div class="metric-value">${active}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">마감 지연 <span class="metric-icon">⚑</span></div><div class="metric-value">${overdue}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">예상 작업 시간 <span class="metric-icon">◴</span></div><div class="metric-value">${Math.floor(totalMinutes / 60)}<span class="metric-change">시간 ${totalMinutes % 60}분</span></div></div></div><div class="dashboard-grid"><div class="panel"><div class="panel-head"><div><div class="panel-title">최근 요청</div><div class="panel-sub">접수된 디자인 요청을 확인해보세요</div></div><button class="text-link" data-go="requests">전체 보기 →</button></div>${openReq.length ? openReq.map(r => `<div class="request-row" data-request="${r.id}"><div><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>${esc(r.brand)}</span><span>·</span><span>${esc(r.requester)}</span><span>·</span>${badge(r.status)}</div></div>${badge(r.priority, priorityClass(r.priority))}<span class="row-date">${dateLabel(r.created)}</span></div>`).join("") : `<div class="empty">아직 접수된 요청이 없어요.</div>`}<div class="progress-wrap"><div class="progress-head"><span>전체 작업 진행률</span><strong>${progress}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div><div class="progress-head" style="margin-top:8px"><span>${done}개 완료</span><span>${db.tasks.length}개 작업</span></div></div></div><div class="panel"><div class="panel-head"><div><div class="panel-title">다가오는 작업</div><div class="panel-sub">마감일이 가까운 순서</div></div><button class="text-link" data-go="tasks">작업 보기 →</button></div><div class="task-list">${todayTasks.map(t => `<div class="task-card" data-task="${t.id}"><div class="task-card-top"><div class="task-name">${esc(t.name)}</div>${badge(t.status)}</div><div class="task-due ${dayDiff(t.due) < 0 ? "late" : ""}">◷　${dayDiff(t.due) < 0 ? `마감 ${Math.abs(dayDiff(t.due))}일 지남` : `마감 ${dateLabel(t.due)}`}　·　${esc(t.brand)}</div></div>`).join("") || `<div class="empty">예정된 작업이 없습니다.</div>`}</div></div></div><div class="footer-note">요청과 작업은 Supabase 공용 데이터베이스에 저장됩니다.</div></section>`;
}

function requestsPage() {
  const isSv = currentProfile?.role === "sv";
  let rows = [...db.requests].sort((a, b) => b.created.localeCompare(a.created));
  if (requestFilter !== "전체") rows = rows.filter(r => r.status === requestFilter);
  if (searchTerm) rows = rows.filter(r => `${r.title} ${r.brand} ${r.requester}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return `<section class="page">${head("REQUESTS", isSv ? "요청 진행상황" : "요청 관리", isSv ? `등록된 요청 ${db.requests.length}건의 상태와 진행 내용을 조회합니다.` : `총 ${db.requests.length}건의 디자인 요청을 관리합니다. 작업이 생성된 요청은 작업 상태에 따라 자동으로 완료 처리됩니다.`, `<button class="btn primary" data-go="request-form">＋　새 작업 요청</button>`)}<div class="toolbar"><div class="search"><input id="request-search" placeholder="요청명, 브랜드, 요청자로 검색" value="${esc(searchTerm)}" /></div><select class="select" id="request-filter">${["전체", "접수", "검토 중", "정보 요청", "분석 완료", "시안 확인", "수정 요청", "디자인 승인", "작업 진행", "완료", "보류"].map(v => `<option ${requestFilter === v ? "selected" : ""}>${v}</option>`).join("")}</select><button class="btn">필터　⌄</button></div><div class="panel request-list"><div class="list-head"><span>요청 내용</span><span>브랜드 / 요청자</span><span>접수일</span><span>희망 완료일</span><span>상태</span></div>${rows.map(r => `<div class="list-item" data-request="${r.id}"><div><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>${esc(r.type)}</span>${badge(r.priority, priorityClass(r.priority))}</div><div class="list-mobile-meta">${esc(r.brand)} · ${dateLabel(r.created)}</div></div><div>${esc(r.brand)}<div class="row-meta">${esc(r.requester)}</div></div><div>${dateLabel(r.created)}</div><div>${dateLabel(r.deadline)}</div><div><div class="request-status-actions">${badge(r.status)}${requestDeleteButton(r)}</div></div></div>`).join("") || `<div class="empty">조건에 맞는 요청이 없습니다.`}</div></section>`;
}

function requestDeleteButton(request) {
  const isOwner = request.requested_by === currentUser?.id || (!request.requested_by && request.requester === currentProfile?.display_name);
  const allowed = currentProfile?.role === "designer" || (currentProfile?.role === "sv" && isOwner);
  return allowed ? `<button class="btn small danger" data-delete-request="${esc(request.id)}">요청 삭제</button>` : "";
}
function requestDetail() {
  const r = db.requests.find(x => x.id === selectedRequest) || db.requests[0];
  if (!r) return `<section class="page">${head("REQUEST", "요청을 찾을 수 없습니다", "요청 목록으로 돌아가 다시 확인해주세요.", `<button class="btn" data-go="requests">← 요청 목록</button>`)}</section>`;
  if (currentProfile?.role === "sv") {
    const tasks = db.tasks.filter(t => t.requestId === r.id);
    return `<section class="page">${head("REQUEST STATUS", r.title, `${r.id}　·　${esc(r.brand)}　·　${dateLabel(r.created)} 접수`, `<button class="btn" data-go="requests">← 요청 목록</button>${requestDeleteButton(r)}`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">요청 내용</div><h2 class="detail-title">${esc(r.title)}</h2><div class="detail-copy">${esc(r.details || "요청 상세 내용이 없습니다.")}</div></div><div class="detail-section"><div class="section-label">요청 정보</div><div class="info-grid"><div><div class="info-label">요청 유형</div><div class="info-value">${esc(r.type)}</div></div><div><div class="info-label">요청자</div><div class="info-value">${esc(r.requester)}</div></div><div><div class="info-label">브랜드 / 매장</div><div class="info-value">${esc(r.brand)}${r.store ? ` / ${esc(r.store)}` : ""}</div></div><div><div class="info-label">희망 완료일</div><div class="info-value">${dateLabel(r.deadline)}</div></div><div><div class="info-label">제작물</div><div class="info-value">${esc(r.product || "미정")}</div></div><div><div class="info-label">수량</div><div class="info-value">${esc(r.quantity || "미정")}</div></div><div><div class="info-label">인쇄 면</div><div class="info-value">${esc(r.print_side || "단면")}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(r.status)}</div></div></div></div></div><aside class="panel"><div class="section-label">진행 상황</div><div class="progress-status">${badge(r.status)}</div>${tasks.length ? `<div class="sv-task-list">${tasks.map(t => `<div class="sv-task-row"><strong>${esc(t.step || t.name)}</strong>${badge(t.status)}${t.due ? `<small>예정 ${dateLabel(t.due)}</small>` : ""}</div>`).join("")}</div>` : `<div class="empty">디자인 담당자가 요청을 검토 중입니다. 작업 일정이 등록되면 여기에 표시됩니다.</div>`}<div class="quote-disclaimer">진행 내용은 조회 전용입니다. 변경이나 문의는 디자인 담당자에게 연락해주세요.</div></aside></div></section>`;
  }
  const steps = r.ai?.steps || [];
  return `<section class="page">${head("REQUEST DETAIL", r.title, `${r.id}　·　${esc(r.brand)}　·　${dateLabel(r.created)} 접수`, `<button class="btn" data-go="requests">← 요청 목록</button>${requestDeleteButton(r)}`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">요청 내용</div><h2 class="detail-title">${esc(r.title)}</h2><div class="detail-copy">${esc(r.details || "요청 상세 내용이 없습니다.")}</div></div><div class="detail-section"><div class="section-label">요청 정보</div><div class="info-grid"><div><div class="info-label">요청 유형</div><div class="info-value">${esc(r.type)}</div></div><div><div class="info-label">요청자</div><div class="info-value">${esc(r.requester)}</div></div><div><div class="info-label">브랜드 / 매장</div><div class="info-value">${esc(r.brand)}</div></div><div><div class="info-label">희망 완료일</div><div class="info-value">${dateLabel(r.deadline)}</div></div><div><div class="info-label">제작물</div><div class="info-value">${esc(r.product || "미정")}</div></div><div><div class="info-label">수량</div><div class="info-value">${esc(r.quantity || "미정")}</div></div><div><div class="info-label">사용 장소</div><div class="info-value">${esc(r.use || "미정")}</div></div><div><div class="info-label">인쇄 면</div><div class="info-value">${esc(r.print_side || "단면")}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(r.status)}</div></div></div></div><div class="detail-section"><div class="section-label">다음 단계</div><div class="checklist"><label class="check-row"><input type="checkbox" ${r.status !== "접수" ? "checked" : ""} /> 요청 내용 확인</label><label class="check-row"><input type="checkbox" ${["분석 완료", "작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 분석 제안 검토</label><label class="check-row"><input type="checkbox" ${["작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 작업 목록 생성</label></div></div></div><aside class="panel"><div class="ai-box"><div class="ai-heading"><div><strong>AI 분석 제안</strong><div class="ai-caption">AI 연결 전입니다. 제안을 직접 입력할 수 있습니다.</div></div><span class="badge purple">제안</span></div><div class="field"><label>요청 요약</label><textarea class="editable" id="ai-summary" rows="3">${esc(r.ai?.summary || "요청 내용을 확인한 뒤 요약을 작성해주세요.")}</textarea></div><div class="field" style="margin-top:12px"><label>추가 확인이 필요한 정보</label><textarea class="editable" id="ai-missing" rows="3">${esc((r.ai?.missing || []).join("\n"))}</textarea></div><div class="section-label" style="margin:16px 0 7px">작업 단계와 예상 시간 (분)</div><div id="steps-editor">${steps.map((s, i) => `<div class="step-edit"><input data-step-name="${i}" value="${esc(s.name)}" aria-label="작업 단계명" /><input data-step-minutes="${i}" type="number" min="0" value="${Number(s.minutes) || 0}" aria-label="예상 시간(분)" /><button class="remove-step" data-remove-step="${i}" aria-label="단계 삭제">×</button></div>`).join("")}</div><button class="btn small" style="margin-top:8px" id="add-step">＋ 단계 추가</button><div class="ai-actions"><button class="btn small" id="save-analysis">제안 저장</button><button class="btn primary small" id="approve-analysis">제안 승인 및 작업 생성</button></div></div><div class="detail-section"><div class="section-label">상태 변경</div><select class="select" id="request-status" style="width:100%">${["접수", "검토 중", "정보 요청", "분석 완료", "시안 확인", "수정 요청", "디자인 승인", "작업 진행", "완료", "보류", "취소"].map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></aside></div></section>`;
}

function requestFilesPanel(request) {
  if (!request) return "";
  const files = db.files.filter(file => file.request_id === request.id).sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)));
  const isDesigner = currentProfile?.role === "designer";
  const reviewHistory = (db.reviews || []).filter(item => item.request_id === request.id).sort((a,b) => Number(b.version)-Number(a.version));
  const kinds = isDesigner ? [["request_attachment", "요청 참고자료"], ["draft", "시안"], ["final", "최종 파일"]] : [["request_attachment", "요청 참고자료"]];
  return `<div class="panel request-files-panel"><div class="panel-head"><div><div class="panel-title">요청 파일과 시안</div><div class="panel-sub">비공개 파일로 보관되며 요청 권한이 있는 사람만 열 수 있습니다.</div></div></div>${reviewHistory.length ? `<div class="review-history">${reviewHistory.map(item => { const responseFiles = files.filter(file => file.review_id === item.id && file.kind === "review_attachment"); const label = item.status === "approved" ? "승인" : item.status === "revision_requested" ? "수정 요청" : item.status === "pending" ? "회신 대기" : "이전 시안"; const stateClass = item.status === "approved" ? "approved" : item.status === "revision_requested" ? "revision" : "pending"; return `<article class="review-history-card ${stateClass}"><div class="review-history-head"><strong>${item.version}차 시안 회신</strong><span class="review-result-badge ${stateClass}">${label}</span></div>${item.feedback ? `<p>${esc(item.feedback)}</p>` : `<p>${item.status === "approved" ? "요청자가 시안을 승인했습니다." : "아직 회신 내용이 없습니다."}</p>`}${responseFiles.length ? `<div class="review-response-files"><strong>요청자 첨부 파일</strong>${responseFiles.map(file => `<div class="attached-file"><strong>${esc(file.file_name)}</strong><button class="btn small" data-file-download="${file.id}">다운로드</button></div>`).join("")}</div>` : ""}<small>${new Date(item.responded_at || item.created_at).toLocaleString("ko-KR")}</small></article>`; }).join("")}</div>` : ""}${files.length ? `<div class="attached-file-list">${files.map(file => { const review = db.reviews.find(item => item.id === file.review_id); return `<div class="attached-file"><div><strong>${esc(file.file_name)}</strong><span>${file.kind === "request_attachment" ? "요청 참고자료" : file.kind === "draft" ? `시안 ${file.version || ""}` : file.kind === "review_attachment" ? "수정 요청 첨부" : "최종 파일"}${review ? ` · ${review.status === "pending" ? "회신 대기" : review.status === "approved" ? "승인" : review.status === "revision_requested" ? "수정 요청" : "새 시안 등록됨"}` : ""}${file.description ? ` · ${esc(file.description)}` : ""}</span></div><button class="btn small" data-file-download="${file.id}">다운로드</button></div>`; }).join("")}</div>` : `<div class="empty">아직 등록된 파일이 없습니다.</div>`}${currentProfile?.role === "designer" ? `<div class="share-link-area">${reviewShareLink ? `<label>요청자 공유 링크</label><div class="share-link-row"><input id="review-share-url" readonly value="${esc(reviewShareLink)}"/><button class="btn small" id="copy-review-link">링크 복사</button></div>` : ""}<button class="btn ${files.some(file => file.kind === "draft" && !file.review_id) ? "primary" : ""}" id="create-review-link" ${files.some(file => file.kind === "draft" && !file.review_id) ? "" : "disabled"}>시안 검토 링크 만들기</button><div class="helper">먼저 시안 파일을 올린 뒤 링크를 만들어 요청자에게 전달하세요. 요청자는 링크에서 승인 또는 수정 요청을 할 수 있습니다.</div></div>` : ""}<form id="detail-file-form" class="detail-file-form"><div class="field"><label for="detail-file-kind">파일 종류</label><select id="detail-file-kind">${kinds.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select></div><div class="field"><label for="detail-file-input">파일 선택</label><input id="detail-file-input" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd" /><div class="helper">이미지·PDF·AI·PSD, 파일당 최대 20MB</div></div><div class="field"><label for="detail-file-description">설명 (선택)</label><input id="detail-file-description" maxlength="300" placeholder="예: 문구 수정한 2차 시안" /></div><button class="btn primary" type="submit">파일 올리기</button></form></div>`;
}
function requestItemsPanel(request) {
  const items=db.requestItems.filter(item=>item.request_id===request?.id).sort((a,b)=>a.sort_order-b.sort_order);
  if(!items.length)return "";
  return `<div class="panel request-items-panel"><div class="panel-title">요청 품목 ${items.length}건</div>${items.map(item=>`<article class="request-item-card"><strong>${esc(item.item_name_snapshot||item.design_name_snapshot||"요청 품목")} · ${item.request_type}</strong><div>${esc(item.brand_name_snapshot)} · 수량 ${esc(item.quantity)}${esc(item.quantity_unit_snapshot||"개")}${item.size_snapshot?` · 사이즈 ${esc(item.size_snapshot)}`:""}${item.deadline?` · 희망 ${dateLabel(item.deadline)}`:""}</div>${item.design_name_snapshot?`<div>기존 디자인: ${esc(item.design_name_snapshot)}</div>`:""}${item.delivery_address_snapshot?`<div>배송지: ${esc(item.delivery_address_snapshot)}</div>`:""}${Object.keys(item.specifications_snapshot||{}).length?`<small>${esc(archiveSpecsText(item.specifications_snapshot))}</small>`:""}${item.details?`<p>${esc(item.details)}</p>`:""}</article>`).join("")}</div>`;
}
function requestTaskNotesPanel(request) {
  const taskIds=db.tasks.filter(task=>task.requestId===request?.id).map(task=>task.id);
  const notes=db.taskNotes.filter(note=>taskIds.includes(note.task_id));
  if(!taskIds.length)return "";
  const typeNames={internal:"디자인팀 내부 메모",sv_shared:"SV 전달 안내",additional:"추가 요청사항 / 특이사항"};
  return `<div class="panel task-notes-panel"><div class="panel-title">작업 메모</div>${notes.map(note=>`<article class="task-note"><strong>${typeNames[note.note_type]}</strong><p>${esc(note.content)}</p><small>${esc(note.author_name)} · ${new Date(note.created_at).toLocaleString("ko-KR")}</small></article>`).join("")||`<div class="empty">등록된 작업 메모가 없습니다.</div>`}</div>`;
}
function requestTaskStatusPanel(request) {
  const tasks=db.tasks.filter(task=>task.requestId===request?.id);if(!tasks.length)return "";
  return `<div class="panel sv-task-cards"><div class="panel-title">작업 진행과 완료 일시</div>${tasks.map(task=>`<article class="sv-task-card"><div><strong>${esc(task.step||task.name)}</strong>${badge(task.status)}</div><small>예정 ${dateLabel(task.due)} · ${esc(task.brand)}</small><small>완료 ${completedAtLabel(task)}</small></article>`).join("")}</div>`;
}

function reviewDashboardPanel() {
  const newestByRequest = new Map();
  [...(db.reviews || [])].sort((a,b) => Number(a.version)-Number(b.version)).forEach(item => newestByRequest.set(item.request_id, item));
  const reviews = [...newestByRequest.values()].sort((a,b) => String(b.responded_at || b.created_at).localeCompare(String(a.responded_at || a.created_at))).slice(0, 6);
  return `<div class="panel review-inbox"><div class="panel-head"><div><div class="panel-title">시안 승인 · 수정 요청</div><div class="panel-sub">요청자가 공유 링크에서 남긴 최신 회신을 먼저 확인하세요.</div></div><span class="badge blue">${reviews.filter(item => item.status === "revision_requested").length}건 수정 요청 · ${reviews.filter(item => item.status === "approved").length}건 승인</span></div>${reviews.length ? reviews.map(item => { const request = db.requests.find(r => r.id === item.request_id); const label = item.status === "approved" ? "승인" : item.status === "revision_requested" ? "수정 요청" : item.status === "superseded" ? "새 시안 등록됨" : "회신 대기"; return `<button class="review-inbox-row" data-review-request="${esc(item.request_id)}"><span class="review-inbox-status ${item.status}">${label}</span><strong>${esc(request?.title || item.request_id)} · 시안 ${item.version}차</strong><span>${esc(item.feedback || (item.status === "pending" ? "요청자 확인을 기다리고 있어요." : "요청 상세에서 다음 작업을 확인하세요."))}</span><small>${new Date(item.responded_at || item.created_at).toLocaleString("ko-KR")}</small></button>`; }).join("") : `<div class="empty">아직 시안 회신이 없습니다.</div>`}</div>`;
}

function publicReviewPage() {
  if (publicReviewError) return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand-mark">D</div><h1>시안 링크를 열 수 없습니다</h1><p>${esc(publicReviewError)}</p></div></section>`;
  if (!publicReviewData) return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand-mark">D</div><h1>시안을 불러오는 중입니다</h1><p>잠시만 기다려주세요.</p></div></section>`;
  const { request, review, files, response_attachments = [] } = publicReviewData;
  const responded = review.status !== "pending";
  return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand"><span class="brand-mark">D</span><span class="brand-name">Design Flow</span></div><div class="eyebrow">DESIGN REVIEW · ${review.version}차 시안</div><h1>${esc(request.title)}</h1><p class="subhead">${esc(request.brand)}${request.store ? ` · ${esc(request.store)}` : ""} · 요청자 ${esc(request.requester)}</p><div class="review-request-copy"><strong>요청 내용</strong><p>${esc(request.details || request.purpose || "요청 내용을 확인해주세요.")}</p></div><div class="review-assets">${files.map(file => `<article class="review-asset">${file.mime_type.startsWith("image/") ? `<a href="${esc(file.preview_url)}" target="_blank" rel="noopener"><img src="${esc(file.preview_url)}" alt="시안 ${review.version}차" /></a>` : `<div class="review-file-icon">PDF</div>`}<div class="review-asset-info"><strong>${esc(file.file_name)}</strong>${file.description ? `<span>${esc(file.description)}</span>` : ""}<a class="btn small" href="${esc(file.download_url)}">시안 다운로드</a></div></article>`).join("")}</div>${responded ? `<div class="review-response-done"><strong>${review.status === "approved" ? "시안을 승인하셨습니다" : review.status === "superseded" ? "새 시안이 등록되어 이 링크는 이전 버전입니다" : "수정 요청을 전달했습니다"}</strong>${review.feedback ? `<p>${esc(review.feedback)}</p>` : ""}${response_attachments.length ? `<div class="review-response-files"><strong>첨부한 파일</strong>${response_attachments.map(file => `<a class="btn small" href="${esc(file.download_url)}">${esc(file.file_name)} 다운로드</a>`).join("")}</div>` : ""}<span>디자인 담당자가 회신을 확인합니다.</span></div>` : `<div class="review-response-form"><label for="review-feedback">수정 의견 (수정 요청 시 필수)</label><textarea id="review-feedback" rows="4" maxlength="2000" placeholder="수정이 필요한 부분을 구체적으로 적어주세요."></textarea><label for="review-attachments">수정 참고 파일 (선택)</label><input id="review-attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd" /><div id="review-attachment-names" class="file-name-list"></div><div class="review-response-error" id="review-response-error"></div><div class="review-response-actions"><button class="btn" id="request-revision">수정 요청</button><button class="btn primary" id="approve-design">시안 승인</button></div></div>`}<p class="review-public-foot">시안 검토 링크는 파일을 볼 수 있는 권한이 있는 공유 링크입니다. 링크를 받은 분만 열어주세요.</p></div></section>`;
}

const typeOptions = ["신규 제작", "일반 제작", "재주문"];
function oldFormPageDisabled() {
  const isReview = formStep === 2;
  const attachmentPicker = `<div class="field full file-picker"><label for="request-attachments">요청 참고 파일</label><input id="request-attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd" /><div class="helper">이미지, PDF, AI, PSD 파일을 첨부할 수 있어요. 파일당 최대 20MB, 요청당 최대 10개입니다.</div><div id="request-attachment-names" class="file-name-list">${(form.attachments || []).map(file => esc(file.name)).join(" · ")}</div></div>`;
  const attachmentReview = isReview && form.attachments?.length ? `<div class="review-row"><span>첨부 파일</span><span>${form.attachments.map(file => esc(file.name)).join("<br>")}</span></div>` : "";
  const stepsHTML = `<div class="steps-indicator">${[0,1,2].map(i => `<div class="step-seg ${i <= formStep ? "done" : ""}"></div>`).join("")}</div>`;
  let inside = "";
  if (formStep === 0) inside = `<h2 class="form-step-title">어떤 디자인이 필요하신가요?</h2><p class="form-step-desc">요청 유형에 맞춰 필요한 내용만 여쭤볼게요.</p><div class="choice-grid">${typeOptions.map(t => `<button class="choice ${form.type === t ? "selected" : ""}" data-type="${t}"><span class="choice-mark">✓</span><span>${t}</span></button>`).join("")}</div><div class="field-grid" style="margin-top:20px"><div class="field"><label>브랜드 <span class="required">*</span></label><select id="f-brand"><option value="">선택해주세요</option>${["미카도스시", "탄광맥주", "goc커피", "코타코", "우동담아", "기타"].map(x => `<option ${form.brand === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>매장명</label><input id="f-store" value="${esc(form.store || "")}" placeholder="예: 강남점" /></div><div class="field"><label>요청자 이름 <span class="required">*</span></label><input id="f-requester" value="${esc(form.requester || "")}" placeholder="이름을 입력해주세요" /></div></div>`;
  else if (formStep === 1) inside = `<h2 class="form-step-title">요청 내용을 알려주세요</h2><p class="form-step-desc">정확히 모르시는 항목은 비워두거나 ‘미정’이라고 적어도 괜찮아요.</p><div class="field-grid"><div class="field"><label>요청 제목 <span class="required">*</span></label><input id="f-title" value="${esc(form.title || "")}" placeholder="예: 봄 신메뉴 포스터 제작" /></div><div class="field"><label>희망 완료일</label><input id="f-deadline" type="date" value="${esc(form.deadline || "")}" /></div>${conditionalFields()}<div class="field full"><label>요청 목적 <span class="required">*</span></label><input id="f-purpose" value="${esc(form.purpose || "")}" placeholder="이 디자인이 필요한 이유를 알려주세요" /></div><div class="field full"><label>상세 내용 <span class="required">*</span></label><textarea id="f-details" placeholder="전달하고 싶은 내용이나 조건을 적어주세요">${esc(form.details || "")}</textarea></div><div class="field full"><label>참고 자료 링크</label><input id="f-reference" value="${esc(form.reference || "")}" placeholder="이미지나 문서 링크 (선택)" /><div class="helper">자료 파일은 위의 ‘요청 참고 파일’에서 함께 첨부할 수 있습니다. 제출 내용은 담당자에게 공유됩니다.</div></div></div>`;
  else inside = `<h2 class="form-step-title">입력 내용을 확인해주세요</h2><p class="form-step-desc">제출하면 디자인 담당자가 내용을 확인합니다. 희망 완료일은 확정 일정이 아닙니다.</p><div class="review-list">${[["요청 유형",form.type],["브랜드",form.brand],["매장명",form.store],["요청자",form.requester],["제목",form.title],["희망 완료일",form.deadline ? dateLabel(form.deadline) : "미정"],["제작물",form.product],["사용 장소",form.use],["수량",form.quantity ? `${form.quantity}${quantityUnit(form.product)}` : ""],["인쇄 면",form.print_side],["요청 목적",form.purpose],["상세 내용",form.details],["참고 링크",form.reference]].filter(row => row[1]).map(([a,b]) => `<div class="review-row"><span>${a}</span><span>${esc(b)}</span></div>`).join("")}</div>`;
  return `<section class="page"><div class="form-shell">${head("REQUEST PORTAL", "디자인 요청 접수", "필요한 내용을 차근차근 알려주세요. 보통 2분 정도 걸려요.")}<div class="panel form-card">${stepsHTML}${inside}${formStep === 1 ? attachmentPicker : ""}${attachmentReview}<div class="form-error" id="form-error"></div><div class="form-footer">${formStep > 0 ? `<button class="btn" id="form-back">← 이전</button>` : `<span></span>`}<button class="btn primary" id="form-next">${isReview ? "요청 제출하기　→" : "다음　→"}</button></div></div><div class="footer-note">제출한 요청은 디자인 담당자에게 공유됩니다.</div></div></section>`;
}
function conditionalFields() {
  const type = form.type;
  if (["신규 제작", "일반 제작"].includes(type)) {
    const catalog = db.requestProducts.filter(item => item.is_active !== false);
    const products = catalog.length ? catalog : ["포스터", "현수막", "배너", "메뉴판", "한접시무료쿠폰", "와블러", "POP-포멕스", "POP-폼보드", "PET", "메쉬배너-출력물", "PET배너-출력물", "철제물통배너세트", "전단지"].map(product => ({ product, minimum_quantity: product === "포스터" ? 5 : 1, quantity_step: 1, quantity_options: product === "포스터" ? [5,10,20,30,40,80] : [1,5,10,20,30,50,100] }));
    const selectedProduct = products.find(item => item.product === form.product) || products[0];
    const quantityRule = productQuantityRule(selectedProduct?.product);
    const options = quantityRule.options;
    const min = quantityRule.minimum;
    const unit = quantityUnit(selectedProduct?.product);
    return `<div class="field"><label>필요한 제작물</label><select id="f-product">${products.map(item => `<option ${form.product === item.product ? "selected" : ""}>${esc(item.product)}</option>`).join("")}</select></div><div class="field"><label>사용 장소</label><select id="f-use">${["실외", "실내", "기타(부착장소를 첨부해주세요)"].map(v => `<option ${form.use === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>수량</label>${quantityRule.singleUnit ? `<input id="f-quantity" type="number" min="${min}" step="1" value="${Math.max(min, Number(form.quantity) || min)}" required />` : `<select id="f-quantity">${options.map(value => `<option value="${value}" ${Number(form.quantity || min) === value ? "selected" : ""}>${value}${unit}</option>`).join("")}</select>`}<div class="helper">${quantityRule.singleUnit ? `${min}${unit}부터 ${unit} 단위로 주문 가능합니다.` : `주문 가능 수량: ${options.map(value => `${value}${unit}`).join(" · ")}`}</div></div><div class="field"><label>인쇄 면</label><select id="f-print-side">${productPrintSides(selectedProduct?.product).map(v => `<option ${form.print_side === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`;
  }
  if (type === "일반 제작") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 메뉴판, 포스터" /></div><div class="field"><label>수정할 부분</label><input id="f-use" value="${esc(form.use || "")}" placeholder="문구, 가격, 날짜, 이미지 등" /></div>`;
  if (type === "재주문") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 테이블 메뉴판" /></div><div class="field"><label>수량</label><input id="f-quantity" value="${esc(form.quantity || "")}" placeholder="필요한 수량" /></div><div class="field full"><label>변경 사항</label><input id="f-use" value="${esc(form.use || "")}" placeholder="기존과 동일하면 ‘동일’이라고 적어주세요" /></div>`;
  return `<div class="field full"><label>필요한 도움</label><input id="f-use" value="${esc(form.use || "")}" placeholder="예: 어떤 제작물이 적합할지 추천이 필요해요" /></div>`;
}
function selectedArchiveItem() { return db.designArchive.find(item => item.id === cartDraft.design_archive_id); }
function archiveSpecsText(specs = {}) { return Object.entries(specs || {}).map(([key,value]) => `${key}: ${value}`).join(" · ") || "등록된 규격이 없습니다."; }
function matchingDeliveryAddresses(search) {
  const query=String(search||"").trim().toLocaleLowerCase();
  return db.masterAddresses.filter(item=>item.is_active&&(!query||`${item.name} ${item.address} ${item.search_terms||""}`.toLocaleLowerCase().includes(query)));
}
function selectDeliveryAddress(id) {
  const address=db.masterAddresses.find(item=>item.id===id);
  if(!address)return;
  saveRequestHeaderFields();saveRequestItemFields();
  cartDraft.delivery_address_id=address.id;cartDraft.delivery_address_snapshot=address.address;cartDraft.deliverySearch=address.name;requestDraft.deliverySearch=address.name;
  render();
}
function requestFieldEnabled(item,key) { return item?.request_fields?.[key] !== false; }
function commaOptions(value) { return String(value||"").split(",").map(item=>item.trim()).filter(Boolean); }
function formPage() {
  const brands = db.brands.filter(item => item.is_active);
  const purposes = db.masterOptions.filter(item => item.option_type === "purpose" && item.is_active);
  const archive = db.designArchive.filter(item => item.is_active && (requestDraft.requestType==="MODIFY"||item.is_reorderable) && item.brand_id === requestDraft.brandId);
  const design = selectedArchiveItem();
  const modeLabels={NEW:"신규 디자인",MODIFY:"기존 디자인 수정",REORDER:"재주문"};
  let inner="";
  if(formStep===0) inner=`<div class="request-mode-cards">${Object.entries(modeLabels).map(([mode,label])=>`<button type="button" class="choice-card ${requestDraft.requestType===mode?"selected":""}" data-request-mode="${mode}">${label}</button>`).join("")}</div>`;
  else if(formStep===1) inner=`<h2 class="form-step-title">브랜드</h2><div class="request-brand-cards">${brands.map(brand=>`<button type="button" class="choice-card" data-request-brand="${brand.id}">${esc(brand.name)}</button>`).join("")}</div>`;
  else if(formStep===2 && requestDraft.requestType!=="NEW") inner=`<h2 class="form-step-title">시안 선택</h2><div class="archive-gallery">${archive.map(item=>`<button type="button" class="archive-card ${cartDraft.design_archive_id===item.id?"selected":""}" data-request-design="${item.id}"><span class="archive-card-image">${archiveThumbnailUrls[item.id]?`<img data-archive-thumbnail="${item.id}" src="${esc(archiveThumbnailUrls[item.id])}" alt="${esc(item.design_name)}"/>`:`<span title="${esc(archiveThumbnailErrors[item.id]||"")}">${archiveThumbnailErrors[item.id]?`이미지 링크 오류: ${esc(archiveThumbnailErrors[item.id])}`:"시안"}</span>`}</span><strong>${esc(item.design_name)}</strong><small>${esc(db.masterItems.find(master=>master.id===item.item_id)?.name||"")}</small></button>`).join("")||`<div class="empty">등록된 시안이 없습니다.</div>`}</div>${requestCart.length?`<button type="button" class="btn primary" id="submit-request">요청 제출</button>`:""}`;
  else {
    const itemMode=requestDraft.requestType;
    const selectedDesign=selectedArchiveItem();
    const itemId=itemMode==="NEW"?(cartDraft.master_item_id||""):selectedDesign?.item_id||"";
    const itemMaster=db.masterItems.find(item=>item.id===itemId);
    const fields=itemMaster?.request_fields||{};
    const sizeOptions=[...new Set([...(itemMaster?.size_options||[]),...(selectedDesign?.specifications?.["사이즈"]?[selectedDesign.specifications["사이즈"]]:[])])];
    const quantityOptions=itemMaster?.quantity_options?.length?itemMaster.quantity_options:[1,5,10,20,30,50,100];
    const showPurpose=itemMode!=="REORDER"&&requestFieldEnabled(itemMaster,"purpose");
    const deliveryMatches=matchingDeliveryAddresses(cartDraft.deliverySearch??requestDraft.deliverySearch??"");
    inner=`<h2 class="form-step-title">요청 정보 입력</h2>${itemMode==="NEW"?`<div class="field"><label for="ci-item">품목</label><select id="ci-item"><option value="">품목 선택</option>${db.masterItems.filter(item=>item.is_active).map(item=>`<option value="${item.id}" ${itemId===item.id?"selected":""}>${esc(item.name)}</option>`).join("")}</select></div>`:`<div class="selected-design-summary"><span class="archive-card-image">${archiveThumbnailUrls[selectedDesign?.id]?`<img src="${esc(archiveThumbnailUrls[selectedDesign.id])}" alt="${esc(selectedDesign?.design_name||"")}"/>`:"시안"}</span><strong>${esc(selectedDesign?.design_name||"")}</strong></div>`}<div class="field-grid"><div class="field"><label for="rq-requester">접수자</label><input id="rq-requester" value="${esc(requestDraft.requester)}" /></div><div class="field"><label for="rq-store">매장명</label><input id="rq-store" value="${esc(requestDraft.store)}" /></div>${showPurpose?`<div class="field"><label for="ci-purpose">목적</label><select id="ci-purpose"><option value="">목적 선택</option>${purposes.map(purpose=>`<option value="${purpose.id}" ${cartDraft.purpose_id===purpose.id?"selected":""}>${esc(purpose.name)}</option>`).join("")}</select></div>`:""}${requestFieldEnabled(itemMaster,"quantity")?`<div class="field"><label for="ci-quantity">수량</label><select id="ci-quantity"><option value="">수량 선택</option>${quantityOptions.map(value=>`<option value="${esc(value)}" ${String(cartDraft.quantity||"")===String(value)?"selected":""}>${esc(value)}${esc(itemMaster?.quantity_unit||"개")}</option>`).join("")}</select></div>`:""}${requestFieldEnabled(itemMaster,"size")?`<div class="field"><label for="ci-size">사이즈</label><select id="ci-size"><option value="">사이즈 선택</option>${sizeOptions.map(value=>`<option value="${esc(value)}" ${String(cartDraft.size_snapshot||"")===String(value)?"selected":""}>${esc(value)}</option>`).join("")}</select></div>`:""}${requestFieldEnabled(itemMaster,"deadline")?`<div class="field"><label for="ci-deadline">희망완료일</label><input id="ci-deadline" type="date" min="${isoDay()}" value="${esc(cartDraft.deadline||"")}" /></div>`:""}${requestFieldEnabled(itemMaster,"reference_file")?`<div class="field full"><label for="ci-files">참고파일</label><input id="ci-files" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd"/><div class="helper" id="ci-file-names">${(cartDraft.attachments||[]).map(file=>esc(file.name)).join(" · ")}</div></div>`:""}${requestFieldEnabled(itemMaster,"details")?`<div class="field full"><label for="ci-details">요청사항</label><textarea id="ci-details" rows="4">${esc(cartDraft.details||"")}</textarea></div>`:""}${requestFieldEnabled(itemMaster,"delivery_address")?`<div class="field full"><label for="rq-delivery-search">배송지 검색</label><input id="rq-delivery-search" value="${esc(cartDraft.deliverySearch||requestDraft.deliverySearch||"")}" placeholder="배송지명, 주소 검색"/><div class="address-search-results">${deliveryMatches.slice(0,8).map(address=>`<button type="button" data-address-select="${address.id}">${esc(address.name)} · ${esc(address.address)}</button>`).join("")}</div><label for="rq-delivery-address">배송지</label><input id="rq-delivery-address" value="${esc(cartDraft.delivery_address_snapshot||requestDraft.deliveryAddress||"")}" /></div>`:""}</div><div class="request-cart-list">${requestCart.map((item,index)=>`<div class="cart-row"><span>${index+1}. ${esc(item.item_name_snapshot||item.design_name_snapshot||"품목")} · ${esc(item.quantity||"")}${esc(item.quantity_unit_snapshot||"개")}</span><button type="button" class="text-link danger-text" data-cart-remove="${index}">삭제</button></div>`).join("")}</div><div class="request-form-actions"><button type="button" class="btn" id="cart-add">품목 추가</button><button type="button" class="btn primary" id="submit-request">요청 제출</button></div>`;
  }
  const steps=formStep===0?["디자인 요청 접수"]:requestDraft.requestType==="NEW"?["디자인 요청 접수","브랜드","요청 정보 입력"]:["디자인 요청 접수","브랜드","시안 선택","요청 정보 입력"];
  const activeStep=formStep===0?0:formStep===1?1:formStep===2?2:steps.length-1;
  return `<section class="page"><div class="form-shell request-flow"><h1 class="form-step-title">디자인 요청 접수</h1><div class="form-card panel"><div class="form-steps">${steps.map((label,index)=>`<span class="${index===activeStep?"active":""}">${esc(label)}</span>`).join("")}</div>${!brands.length?`<div class="workspace-alert">${esc(workspaceError||"브랜드 정보를 불러오지 못했습니다.")}</div>`:""}${inner}<div class="form-footer">${formStep>0?`<button class="btn" id="form-back">이전</button>`:`<span></span>`}</div></div></div></section>`;
}
function successPage() {
  const returnRoute = currentProfile?.role === "sv" ? "requests" : currentProfile?.role === "designer" ? "dashboard" : "request-form";
  const returnLabel = currentProfile?.role === "sv" ? "요청 진행상황 보기" : currentProfile?.role === "designer" ? "워크스페이스로 돌아가기" : "요청 접수하기";
  return `<section class="page"><div class="form-shell"><div class="panel success-state"><div class="success-icon">✓</div><h2>요청이 접수되었어요</h2><p>디자인 담당자가 요청 내용을 확인할 예정입니다.<br>희망 완료일은 검토 후 안내드리며, 확정된 일정은 아닙니다.</p>${fileUploadError ? `<div class="workspace-alert">${esc(fileUploadError)}</div>` : ""}<div class="request-number">${esc(selectedRequest || "DF-00000")}</div><div><button class="btn primary" data-go="${returnRoute}">${returnLabel}</button></div></div></div></section>`;
}

function oldTasksPage() {
  let rows = [...db.tasks].sort((a,b) => a.due.localeCompare(b.due));
  if (taskFilter !== "전체") rows = rows.filter(t => t.status === taskFilter);
  const statuses = ["대기", "진행 중", "검토", "완료", "보류"];
  return `<section class="page">${head("TASKS", "작업 관리", `요청에 연결된 작업 ${db.tasks.length}건을 관리합니다.`, `<button class="btn" data-go="requests">요청에서 작업 만들기 →</button>`)}<div class="toolbar"><select class="select" id="task-filter">${["전체", ...statuses].map(v => `<option ${taskFilter === v ? "selected" : ""}>${v}</option>`).join("")}</select><span class="subhead">상태를 목록에서 바로 변경할 수 있어요.</span></div><div class="panel task-table"><div class="task-item"><div>작업 / 단계</div><div>브랜드</div><div>마감일</div><div>예상 시간</div><div>상태</div></div>${rows.map(t => `<div class="task-item" data-task="${t.id}"><div><div class="row-title">${esc(t.name)}</div><div class="task-mobile-meta">${esc(t.brand)} · 마감 ${dateLabel(t.due)}</div><div class="row-meta">${esc(t.step)}　·　${esc(t.id)}</div></div><div>${esc(t.brand)}</div><div>${dateLabel(t.due)}</div><div>${Number(t.estimate) || 0}분</div><div><select class="select-status" data-task-status="${t.id}">${statuses.map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>`).join("") || `<div class="empty">표시할 작업이 없습니다.</div>`}</div></section>`;
}
function oldTaskDetail() {
  const t = db.tasks.find(x => x.id === selectedTask) || db.tasks[0];
  if (!t) return `<section class="page">${head("TASK", "작업이 없습니다", "요청을 승인하면 작업을 생성할 수 있습니다.", `<button class="btn" data-go="requests">요청 확인</button>`)}</section>`;
  const logs = db.timeLogs.filter(l => l.taskId === t.id);
  return `<section class="page">${head("TASK DETAIL", t.name, `${t.id}　·　${t.brand}　·　${t.step}`, `<button class="btn" data-go="tasks">← 작업 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">작업 정보</div><div class="info-grid"><div><div class="info-label">연결 요청</div><div class="info-value">${esc(t.requestId)}</div></div><div><div class="info-label">상태</div><div class="info-value">${badge(t.status)}</div></div><div><div class="info-label">우선순위</div><div class="info-value">${badge(t.priority, priorityClass(t.priority))}</div></div><div><div class="info-label">마감일</div><div class="info-value">${dateLabel(t.due)}</div></div><div><div class="info-label">예상 시간</div><div class="info-value">${Number(t.estimate) || 0}분</div></div><div><div class="info-label">실제 기록</div><div class="info-value">${Number(t.actual) || 0}분</div></div></div></div><div class="detail-section"><div class="section-label">상태 변경</div><select class="select" id="task-detail-status">${["대기", "진행 중", "검토", "완료", "보류"].map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="detail-section"><div class="section-label">시간 기록</div><div class="toolbar"><input class="select" type="number" min="1" id="time-minutes" placeholder="분" style="width:100px"/><input class="select" id="time-note" placeholder="메모 (선택)" style="flex:1"/><button class="btn primary small" id="add-time">기록 추가</button></div>${logs.length ? logs.map(l => `<div class="request-row"><div class="row-title">${Number(l.minutes)}분</div><div class="row-meta">${esc(l.note || "작업 시간")}</div><span class="row-date">${dateLabel(l.date)}</span></div>`).join("") : `<div class="empty">아직 기록된 시간이 없습니다.</div>`}</div></div><div class="panel"><div class="panel-title">작업 체크리스트</div><div class="panel-sub">완료한 단계를 표시해보세요.</div><div class="checklist" style="margin-top:16px"><label class="check-row"><input type="checkbox" ${t.status !== "대기" ? "checked" : ""}/> 자료 및 요청 확인</label><label class="check-row"><input type="checkbox" ${["검토", "완료"].includes(t.status) ? "checked" : ""}/> 디자인 작업</label><label class="check-row"><input type="checkbox" ${t.status === "완료" ? "checked" : ""}/> 최종 확인 및 전달</label></div></div></div></section>`;
}

function tasksPage() {
  const statuses=["접수","확인","작업중","완료"];
  let rows=[...db.tasks].sort((a,b)=>(a.due||"").localeCompare(b.due||""));
  if(taskFilter!=="전체")rows=rows.filter(task=>task.status===taskFilter);
  const taskMarkup=task=>{const request=db.requests.find(row=>row.id===task.requestId);const items=db.requestItems.filter(item=>item.request_id===task.requestId);return `<div class="task-admin-row" data-task="${esc(task.id)}"><div><strong>${esc(task.requestId)}</strong><small>${dateLabel(request?.created)} · ${esc(task.brand)} · ${esc(request?.type||"")}</small></div><div>${esc(items.map(item=>item.item_name_snapshot||item.design_name_snapshot).filter(Boolean).join(", ")||request?.product||task.name)}</div><div>${items.length||1}건</div><div>${items.map(item=>`${esc(item.item_name_snapshot||item.design_name_snapshot||"품목")} ${esc(item.quantity)}`).join(" · ")||esc(request?.quantity||"—")}</div><div>${dateLabel(task.due)}</div><div>${task.completedAt?new Date(task.completedAt).toLocaleString("ko-KR"):"—"}</div><div><select class="select-status" data-task-status="${esc(task.id)}">${statuses.map(status=>`<option ${task.status===status?"selected":""}>${status}</option>`).join("")}</select></div></div>`;};
  return `<section class="page">${head("TASKS","작업 관리",`요청에 연결된 작업 ${db.tasks.length}건을 관리합니다. 완료 시각은 자동 기록됩니다.`,`<button class="btn" data-go="requests">요청에서 작업 만들기 →</button>`)}<div class="toolbar"><select class="select" id="task-filter">${["전체",...statuses].map(status=>`<option ${taskFilter===status?"selected":""}>${status}</option>`).join("")}</select><span class="subhead">상태를 변경하면 SV 진행 현황에 반영됩니다.</span></div><div class="panel task-admin-table"><div class="task-admin-head"><span>요청 번호 · 요청일 · 브랜드 · 유형</span><span>요청 품목</span><span>품목 건수</span><span>품목별 수량</span><span>작업 마감일</span><span>완료일시</span><span>상태 변경</span></div>${rows.map(taskMarkup).join("")||`<div class="empty">표시할 작업이 없습니다.</div>`}</div></section>`;
}
function taskDetail() {
  const task=db.tasks.find(row=>row.id===selectedTask)||db.tasks[0];if(!task)return `<section class="page">${head("TASK","작업이 없습니다","요청을 승인하면 작업을 생성할 수 있습니다.",`<button class="btn" data-go="requests">요청 확인</button>`)}</section>`;
  const logs=db.timeLogs.filter(log=>log.taskId===task.id),notes=db.taskNotes.filter(note=>note.task_id===task.id),statuses=["접수","확인","작업중","완료"];
  return `<section class="page">${head("TASK DETAIL",task.name,`${task.requestId} · ${task.brand} · ${task.step}`,`<button class="btn" data-go="tasks">← 작업 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">작업 정보</div><div class="info-grid"><div><div class="info-label">연결 요청</div><div class="info-value">${esc(task.requestId)}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(task.status)}</div></div><div><div class="info-label">완료일시</div><div class="info-value">${completedAtLabel(task)}</div></div><div><div class="info-label">마감일</div><div class="info-value">${dateLabel(task.due)}</div></div></div></div><div class="detail-section"><label for="task-detail-status">상태 변경</label><select class="select" id="task-detail-status">${statuses.map(status=>`<option ${task.status===status?"selected":""}>${status}</option>`).join("")}</select></div><div class="detail-section"><div class="section-label">시간 기록</div><div class="toolbar"><input class="select" type="number" min="1" id="time-minutes" placeholder="분" style="width:100px"/><input class="select" id="time-note" placeholder="메모 (선택)" style="flex:1"/><button class="btn primary small" id="add-time">기록 추가</button></div>${logs.map(log=>`<div class="request-row"><div class="row-title">${Number(log.minutes)}분</div><div class="row-meta">${esc(log.note||"작업 시간")}</div><span class="row-date">${dateLabel(log.date)}</span></div>`).join("")||`<div class="empty">아직 기록된 시간이 없습니다.</div>`}</div></div><div class="panel"><div class="panel-title">작업 메모</div><div class="panel-sub">내부 메모는 디자인팀만 볼 수 있고, 공유 메모는 SV 요청 현황에도 표시됩니다.</div>${notes.map(note=>`<article class="task-note"><strong>${note.note_type==="internal"?"디자인팀 내부 메모":note.note_type==="sv_shared"?"SV 전달 안내":"추가 요청사항 / 특이사항"}</strong><p>${esc(note.content)}</p><small>${esc(note.author_name)} · ${new Date(note.created_at).toLocaleString("ko-KR")}</small></article>`).join("")||`<div class="empty">등록된 작업 메모가 없습니다.</div>`}<form id="task-note-form" class="task-note-form"><label for="task-note-type">메모 구분</label><select id="task-note-type"><option value="internal">디자인팀 내부 메모</option><option value="sv_shared">SV 전달 안내 메모</option><option value="additional">추가 요청사항 / 특이사항</option></select><textarea id="task-note-content" rows="4" required placeholder="메모를 입력하세요"></textarea><button class="btn primary" type="submit">메모 저장</button></form></div></div></section>`;
}

function masterDataPage() {
  if(currentProfile?.role!=="designer")return `<section class="page">${head("ACCESS","접근할 수 없습니다","운영 데이터는 디자인팀 전용입니다.")}</section>`;
  const tabs=[["brands","브랜드"],["items","요청 품목"],["archive","기존 디자인"],["options","요청 목적"],["addresses","배송지"]];
  const source={brands:db.brands,items:db.masterItems,archive:db.designArchive,options:db.masterOptions,addresses:db.masterAddresses};
  const editing=masterEdit.id?(source[masterEdit.type]||[]).find(row=>row.id===masterEdit.id):null;
  const masterRows=source[masterTab]||[];
  let formHtml="";
  if(masterTab==="archive")formHtml=`<form id="master-form" class="price-form"><div class="field"><label>브랜드</label><select id="md-brand" required><option value="">선택</option>${db.brands.map(b=>`<option value="${b.id}" ${editing?.brand_id===b.id?"selected":""}>${esc(b.name)}</option>`).join("")}</select></div><div class="field"><label>관련 품목</label><select id="md-item"><option value="">선택 안 함</option>${db.masterItems.map(i=>`<option value="${i.id}" ${editing?.item_id===i.id?"selected":""}>${esc(i.name)}</option>`).join("")}</select></div><div class="field full"><label>디자인명</label><input id="md-name" required value="${esc(editing?.design_name||"")}"/></div><div class="field full"><label>제작 규격 (한 줄에 항목: 값)</label><textarea id="md-specs" rows="4">${esc(Object.entries(editing?.specifications||{}).map(([k,v])=>`${k}: ${v}`).join("\n"))}</textarea></div><div class="field"><label>썸네일 이미지</label><input id="md-thumbnail" type="file" accept="image/png,image/jpeg,image/webp"/><small>${esc(editing?.thumbnail_path||"")}</small></div><div class="field"><label>원본 파일</label><input id="md-original" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd"/><small>${esc(editing?.original_path||"")}</small></div><div class="field"><label><input id="md-reorderable" type="checkbox" ${editing?.is_reorderable!==false?"checked":""}/> 재주문 가능</label></div><div class="field"><label><input id="md-active" type="checkbox" ${editing?.is_active!==false?"checked":""}/> 사용</label></div><button class="btn primary" type="submit">${editing?"변경 저장":"디자인 등록"}</button>${editing?`<button class="btn" type="button" id="master-cancel">취소</button>`:""}</form>`;
  else if(masterTab==="items"){
    const flags={purpose:"목적",quantity:"수량",size:"사이즈",deadline:"희망완료일",reference_file:"참고파일",details:"요청사항",delivery_address:"배송지"};
    formHtml=`<form id="master-form" class="price-form"><div class="field"><label>품목명</label><input id="md-name" maxlength="120" value="${esc(editing?.name||"")}"/></div><div class="field"><label>수량 단위</label><input id="md-unit" maxlength="20" value="${esc(editing?.quantity_unit||"개")}" placeholder="매, 장, 개"/></div><div class="field full"><label>수량 선택지 (쉼표 구분)</label><input id="md-quantities" value="${esc((editing?.quantity_options||[1,5,10,20,30,50,100]).join(", "))}"/></div><div class="field full"><label>사이즈 선택지 (쉼표 구분)</label><input id="md-sizes" value="${esc((editing?.size_options||[]).join(", "))}"/></div><div class="field full"><label>요청 입력 항목</label><div class="master-field-options">${Object.entries(flags).map(([key,label])=>`<label><input type="checkbox" name="md-request-field" value="${key}" ${editing?.request_fields?.[key]!==false?"checked":""}/> ${label}</label>`).join("")}</div></div><div class="field"><label>정렬 순서</label><input id="md-order" type="number" value="${Number(editing?.sort_order)||0}"/></div><button class="btn primary" type="submit">${editing?"변경 저장":"등록"}</button>${editing?`<button class="btn" type="button" id="master-cancel">취소</button>`:""}</form>`;
  }else if(masterTab==="addresses")formHtml=`<form id="master-form" class="price-form"><div class="field"><label>배송지명</label><input id="md-name" value="${esc(editing?.name||"")}"/></div><div class="field full"><label>주소</label><input id="md-address" value="${esc(editing?.address||"")}"/></div><div class="field full"><label>검색 키워드 (쉼표 구분)</label><input id="md-search-terms" value="${esc(editing?.search_terms||"")}"/></div><div class="field"><label>정렬 순서</label><input id="md-order" type="number" value="${Number(editing?.sort_order)||0}"/></div><button class="btn primary" type="submit">${editing?"변경 저장":"등록"}</button>${editing?`<button class="btn" type="button" id="master-cancel">취소</button>`:""}</form>`;
  else formHtml=`<form id="master-form" class="price-form"><div class="field"><label>${masterTab==="brands"?"브랜드명":"요청 목적"}</label><input id="md-name" maxlength="120" value="${esc(editing?.name||"")}"/></div><div class="field"><label>정렬 순서</label><input id="md-order" type="number" value="${Number(editing?.sort_order)||0}"/></div><button class="btn primary" type="submit">${editing?"변경 저장":"등록"}</button>${editing?`<button class="btn" type="button" id="master-cancel">취소</button>`:""}</form>`;
  const rows=masterRows.map(row=>{const label=masterTab==="archive"?`${esc(row.design_name)} · ${esc(db.brands.find(b=>b.id===row.brand_id)?.name||"브랜드 없음")} · ${esc(db.masterItems.find(i=>i.id===row.item_id)?.name||"품목 미지정")}`:esc(row.name);const sub=masterTab==="archive"?archiveSpecsText(row.specifications):masterTab==="items"?`수량 ${esc((row.quantity_options||[]).join(", "))} · 사이즈 ${esc((row.size_options||[]).join(", "))}`:masterTab==="addresses"?esc(row.address):`정렬 ${Number(row.sort_order)||0}`;return `<div class="master-row"><div><strong>${label}</strong><small>${esc(sub)}</small></div><span class="badge ${row.is_active?"green":""}">${row.is_active?"사용":"비활성"}</span><button class="text-link" data-master-edit="${row.id}">수정</button><button class="toggle-pill ${row.is_active?"on":""}" data-master-toggle="${row.id}">${row.is_active?"사용 중":"비활성"}</button><button class="text-link danger-text" data-master-delete="${row.id}">삭제</button></div>`}).join("");
  return `<section class="page">${head("MASTER DATA","운영 데이터 관리","요청 접수에 사용하는 목록과 기존 디자인 자료를 직접 관리합니다.")}<div class="master-tabs">${tabs.map(([key,label])=>`<button class="btn ${masterTab===key?"primary":""}" data-master-tab="${key}">${label}</button>`).join("")}</div><div class="panel"><div class="panel-head"><div><div class="panel-title">${tabs.find(t=>t[0]===masterTab)?.[1]} 관리</div><div class="panel-sub">접수에 사용된 자료는 비활성화하면 과거 요청 스냅샷이 보존됩니다.</div></div></div>${formHtml}<div class="master-list">${rows||`<div class="empty">등록된 데이터가 없습니다.</div>`}</div></div></section>`;
}

function calendarPage() {
  const monday = new Date(today); const day = monday.getDay(); monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  const week = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return { date: d.toISOString().slice(0,10), label: `${["월","화","수","목","금"][i]} ${d.getMonth()+1}/${d.getDate()}` }; });
  const hours = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  return `<section class="page">${head("CALENDAR", "주간 일정", "이번 주 마감이 있는 작업을 확인합니다.", `<button class="btn">이번 주　⌄</button>`)}<div class="panel"><div class="calendar-wrap"><div class="calendar"><div class="cal-head">시간</div>${week.map(d => `<div class="cal-head ${d.date === isoDay() ? "today" : ""}">${d.label}</div>`).join("")}${hours.map(hour => `<div class="cal-time">${hour}</div>${week.map(day => { const tasks = db.tasks.filter(t => t.due === day.date && t.status !== "완료"); return `<div class="cal-cell">${hour === "10:00" ? tasks.map((t,i) => `<div class="cal-event ${i % 2 ? "amber" : ""}" data-task="${t.id}">${esc(t.name)}</div>`).join("") : ""}</div>`; }).join("")}`).join("")}</div></div></div><div class="footer-note">일정은 작업 마감일 기준으로 표시됩니다.</div></section>`;
}

function render() {
  const app = document.getElementById("app");
  if (!currentProfile && !["request-form", "request-success", "public-review"].includes(route)) {
    app.innerHTML = bootError.includes("schema") ? startupPage() : loginPage();
    bindEvents();
    return;
  }
  if (currentProfile?.role === "sv" && !["quote", "requests", "request-detail", "request-form", "request-success"].includes(route)) route = "quote";
  let content = route === "public-review" ? publicReviewPage() : route === "dashboard" ? dashboard() : route === "requests" ? requestsPage() : route === "request-detail" ? requestDetail() : route === "request-form" ? formPage() : route === "request-success" ? successPage() : route === "tasks" ? tasksPage() : route === "task-detail" ? taskDetail() : route === "calendar" ? calendarPage() : route === "prices" ? pricesPage() : route === "quote" ? quotePage() : route === "master-data" ? masterDataPage() : dashboard();
  if (route === "request-detail" && currentProfile) {
    const request = db.requests.find(item => item.id === selectedRequest);
    content = content.replace("</section>", `${requestItemsPanel(request)}${requestTaskStatusPanel(request)}${requestTaskNotesPanel(request)}${requestFilesPanel(request)}</section>`);
  }
  if (route === "dashboard" && currentProfile?.role === "designer") content = content.replace('<div class="metrics">', `${reviewDashboardPanel()}<div class="metrics">`);
  app.innerHTML = currentProfile && route !== "public-review" ? layout(content) : publicLayout(content);
  bindEvents();
}
async function initializeApp() {
  if (!window.DesignFlowData?.ready) { bootError = "Supabase schema is not configured."; render(); return; }
  if (route === "public-review") {
    try { publicReviewData = await DesignFlowData.backend(`design-review?token=${encodeURIComponent(reviewToken)}`, null, true); }
    catch (error) { publicReviewError = error.message; }
    render();
    return;
  }
  try {
    const session = await DesignFlowData.getSession();
    currentUser = session?.user || null;
    if (currentUser) {
      currentProfile = await DesignFlowData.getProfile();
      if (!currentProfile) {
        bootError = "이 계정에 직원 역할이 아직 지정되지 않았습니다. Supabase에서 디자이너 또는 SV 역할을 연결해주세요.";
        currentUser = null;
        render();
        return;
      }
      route = currentProfile.role === "sv" ? "quote" : "dashboard";
      try { await loadWorkspaceData(); workspaceError = ""; }
      catch (error) { workspaceError = `로그인은 됐지만 업무 데이터를 불러오지 못했습니다. Supabase의 관련 표 권한을 확인해주세요. (${error.message})`; }
    } else if (!["request-form", "request-success"].includes(route)) route = "login";
    else if (route === "request-form") { try { await loadPublicRequestMasters(); } catch(error) { workspaceError = `새 요청 시스템 데이터베이스 마이그레이션 적용이 필요합니다. (${error.message})`; } }
  } catch (error) {
    bootError = `${error.message}. Supabase의 schema.sql 적용 여부를 확인해주세요.`;
  }
  render();
}
function setFormFields() {
  const mapping = { "f-brand":"brand", "f-store":"store", "f-requester":"requester", "f-title":"title", "f-deadline":"deadline", "f-purpose":"purpose", "f-details":"details", "f-reference":"reference", "f-quantity":"quantity", "f-product":"product", "f-use":"use", "f-print-side":"print_side" };
  Object.entries(mapping).forEach(([id,key]) => { const el = document.getElementById(id); if (el) form[key] = el.value.trim(); });
}
function validateStep() {
  const error = document.getElementById("form-error");
  if (formStep === 0) {
    setFormFields();
    if (!form.type) return error.textContent = "요청 유형을 선택해주세요.", false;
    if (!form.brand || !form.requester) return error.textContent = "브랜드와 요청자 이름을 입력해주세요.", false;
  }
  if (formStep === 1) {
    setFormFields();
    if (!form.title || !form.purpose || !form.details) return error.textContent = "제목, 요청 목적, 상세 내용을 입력해주세요.", false;
    const quantityInput = document.getElementById("f-quantity");
    if (quantityInput && (quantityInput.tagName === "SELECT" || quantityInput.type === "number") && form.product) {
      const quantityRule = productQuantityRule(form.product);
      if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < quantityRule.minimum) return error.textContent = `수량은 최소 ${quantityRule.minimum}${quantityUnit(form.product)} 이상 입력해주세요.`, false;
    }
    if ((form.attachments || []).length > 10) return error.textContent = "첨부 파일은 요청당 최대 10개까지 가능합니다.", false;
    if ((form.attachments || []).some(file => !getAllowedFileType(file) || file.size > 20 * 1024 * 1024)) return error.textContent = "지원되는 파일 형식인지 확인하고, 파일당 20MB 이하로 첨부해주세요.", false;
  }
  return true;
}
function saveRequestHeaderFields() {
  requestDraft.store = document.getElementById("rq-store")?.value.trim() ?? requestDraft.store;
  requestDraft.requester = document.getElementById("rq-requester")?.value.trim() ?? requestDraft.requester;
  if(document.getElementById("rq-delivery-search"))requestDraft.deliverySearch=document.getElementById("rq-delivery-search").value.trim();
  if(document.getElementById("rq-delivery-address"))requestDraft.deliveryAddress=document.getElementById("rq-delivery-address").value.trim();
}
function addCurrentCartItem() {
  const mode = requestDraft.requestType;
  const quantity = document.getElementById("ci-quantity")?.value.trim() || "";
  const deadline = document.getElementById("ci-deadline")?.value || "";
  const details = document.getElementById("ci-details")?.value.trim() || "";
  const brand = db.brands.find(item=>item.id===requestDraft.brandId);
  const design=db.designArchive.find(row=>row.id===cartDraft.design_archive_id);
  const selectedItem=mode==="NEW"?db.masterItems.find(row=>row.id===document.getElementById("ci-item")?.value):db.masterItems.find(row=>row.id===design?.item_id);
  const purpose=db.masterOptions.find(row=>row.id===document.getElementById("ci-purpose")?.value);
  const addressText=document.getElementById("rq-delivery-address")?.value.trim()||requestDraft.deliveryAddress||"";
  const item = { request_type:mode, brand_id:requestDraft.brandId||null, brand_name_snapshot:brand?.name||"", quantity, quantity_unit_snapshot:selectedItem?.quantity_unit||"개", deadline:deadline||null, details, attachments:cartDraft.attachments||[], sort_order:requestCart.length, delivery_address_id:cartDraft.delivery_address_id||null, delivery_address_snapshot:addressText||null, size_snapshot:document.getElementById("ci-size")?.value||cartDraft.size_snapshot||null };
  if(mode==="NEW") {
    Object.assign(item,{master_item_id:selectedItem?.id||null,item_name_snapshot:selectedItem?.name||"",purpose_id:purpose?.id||null,purpose_snapshot:purpose?.name||"",modification_types:[],specifications_snapshot:{}});
  } else {
    Object.assign(item,{design_archive_id:design?.id||null,master_item_id:design?.item_id||null,item_name_snapshot:selectedItem?.name||"",design_name_snapshot:design?.design_name||"",specifications_snapshot:design?.specifications||{},purpose_snapshot:purpose?.name||"",modification_types:[]});
  }
  item.attachments=cartDraft.attachments||[];
  if(item.attachments.length>10||item.attachments.some(file=>!getAllowedFileType(file)||file.size>20*1024*1024)){notify("참고파일은 최대 10개, 파일당 20MB까지 올릴 수 있습니다.");return false;}
  requestCart.push(item);
  cartDraft={}; cartEditIndex=-1; return true;
}
function bindRequestFormEvents() {
  document.querySelectorAll("img[data-archive-thumbnail]").forEach(image=>image.addEventListener("error",()=>{const id=image.dataset.archiveThumbnail;archiveThumbnailUrls[id]="";archiveThumbnailErrors[id]="이미지 링크는 발급됐지만 파일을 열지 못했습니다. 썸네일 경로와 Storage 접근 권한을 확인해주세요.";if(formStep===2)render();},{once:true}));
  document.querySelectorAll("[data-request-mode]").forEach(el=>el.addEventListener("click",()=>{saveRequestHeaderFields();requestDraft.requestType=el.dataset.requestMode;requestDraft.brandId="";requestCart=[];cartDraft={};formStep=1;render();}));
  document.querySelectorAll("[data-request-brand]").forEach(el=>el.addEventListener("click",()=>{requestDraft.brandId=el.dataset.requestBrand;cartDraft={};formStep=requestDraft.requestType==="NEW"?2:2;render();}));
  document.querySelectorAll("[data-request-design]").forEach(el=>el.addEventListener("click",()=>{const design=db.designArchive.find(row=>row.id===el.dataset.requestDesign);cartDraft={design_archive_id:design?.id||"",master_item_id:design?.item_id||"",size_snapshot:design?.specifications?.["사이즈"]||"",specifications_snapshot:design?.specifications||{}};formStep=3;render();}));
  const itemSelect=document.getElementById("ci-item");if(itemSelect)itemSelect.addEventListener("change",()=>{cartDraft={master_item_id:itemSelect.value};render();});
  const add=document.getElementById("cart-add"); if(add)add.addEventListener("click",()=>{saveRequestHeaderFields();saveRequestItemFields();if(addCurrentCartItem()){if(requestDraft.requestType==="NEW"){cartDraft={};formStep=2;}else{cartDraft={};formStep=2;}render();}});
  const files=document.getElementById("ci-files"); if(files)files.addEventListener("change",e=>{cartDraft.attachments=[...e.target.files];const names=document.getElementById("ci-file-names");if(names)names.textContent=cartDraft.attachments.map(f=>f.name).join(" · ");});
  const addressSearch=document.getElementById("rq-delivery-search");if(addressSearch)addressSearch.addEventListener("input",e=>{const value=e.target.value;requestDraft.deliverySearch=value;cartDraft.deliverySearch=value;const results=document.querySelector(".address-search-results");if(results)results.innerHTML=matchingDeliveryAddresses(value).slice(0,8).map(address=>`<button type="button" data-address-select="${address.id}">${esc(address.name)} · ${esc(address.address)}</button>`).join("");document.querySelectorAll("[data-address-select]").forEach(el=>el.addEventListener("click",()=>selectDeliveryAddress(el.dataset.addressSelect)));});
  const addressInput=document.getElementById("rq-delivery-address");if(addressInput)addressInput.addEventListener("input",e=>{cartDraft.delivery_address_snapshot=e.target.value;const selected=db.masterAddresses.find(item=>item.id===cartDraft.delivery_address_id);if(selected&&selected.address!==e.target.value)cartDraft.delivery_address_id=null;});
  document.querySelectorAll("[data-address-select]").forEach(el=>el.addEventListener("click",()=>selectDeliveryAddress(el.dataset.addressSelect)));
  document.querySelectorAll("[data-cart-remove]").forEach(el=>el.addEventListener("click",()=>{requestCart.splice(Number(el.dataset.cartRemove),1);render();}));
  document.querySelectorAll("[data-archive-preview],[data-archive-download]").forEach(el=>el.addEventListener("click",async()=>{const id=el.dataset.archivePreview||el.dataset.archiveDownload;const item=db.designArchive.find(row=>row.id===id);const path=el.dataset.archivePreview?item?.thumbnail_path:item?.original_path;if(!path)return;try{const result=await DesignFlowData.backend("design-review",{action:"archive_file_link",path});window.open(result.url,"_blank","noopener");}catch(error){notify(`파일을 열지 못했어요: ${error.message}`);}}));
  const submit=document.getElementById("submit-request");if(submit)submit.addEventListener("click",async()=>{saveRequestHeaderFields();saveRequestItemFields();const hasDraft=Boolean(document.getElementById("ci-item")?.value||cartDraft.design_archive_id||document.getElementById("ci-quantity")?.value||document.getElementById("ci-size")?.value||document.getElementById("ci-details")?.value||cartDraft.attachments?.length);if(hasDraft||!requestCart.length)addCurrentCartItem();await submitRequest();});
  const back=document.getElementById("form-back");if(back)back.addEventListener("click",()=>{if(formStep===1)formStep=0;else if(formStep===3)formStep=2;else if(formStep===2&&requestDraft.requestType!=="NEW")formStep=1;else if(formStep===2)formStep=1;render();});
  if(formStep===2&&requestDraft.requestType!=="NEW")for(const item of db.designArchive.filter(row=>row.is_active&&(requestDraft.requestType==="MODIFY"||row.is_reorderable)&&row.brand_id===requestDraft.brandId)){if(item.thumbnail_path&&!archiveThumbnailUrls[item.id]&&!archiveThumbnailErrors[item.id])DesignFlowData.backend("design-review",{action:"archive_file_link",path:item.thumbnail_path},!currentProfile).then(result=>{archiveThumbnailUrls[item.id]=result.url;delete archiveThumbnailErrors[item.id];if(formStep===2)render();}).catch(error=>{archiveThumbnailErrors[item.id]=error.message||"이미지를 불러오지 못했습니다.";if(formStep===2)render();});}
}
function saveRequestItemFields(){
  if(document.getElementById("ci-item"))cartDraft.master_item_id=document.getElementById("ci-item").value;
  if(document.getElementById("ci-purpose"))cartDraft.purpose_id=document.getElementById("ci-purpose").value;
  if(document.getElementById("ci-quantity"))cartDraft.quantity=document.getElementById("ci-quantity").value;
  if(document.getElementById("ci-size"))cartDraft.size_snapshot=document.getElementById("ci-size").value;
  if(document.getElementById("ci-deadline"))cartDraft.deadline=document.getElementById("ci-deadline").value;
  if(document.getElementById("ci-details"))cartDraft.details=document.getElementById("ci-details").value.trim();
  if(document.getElementById("rq-delivery-search"))cartDraft.deliverySearch=document.getElementById("rq-delivery-search").value;
  if(document.getElementById("rq-delivery-address"))cartDraft.delivery_address_snapshot=document.getElementById("rq-delivery-address").value.trim();
}
function parseSpecifications(value) { const result={}; String(value||"").split("\n").forEach(line=>{const pos=line.indexOf(":");if(pos>0){const key=line.slice(0,pos).trim(),val=line.slice(pos+1).trim();if(key&&val)result[key]=val;}});return result; }
function bindMasterEvents() {
  document.querySelectorAll("[data-master-tab]").forEach(el=>el.addEventListener("click",()=>{masterTab=el.dataset.masterTab;masterEdit={type:"",id:""};render();}));
  document.querySelectorAll("[data-master-edit]").forEach(el=>el.addEventListener("click",()=>{masterEdit={type:masterTab,id:el.dataset.masterEdit};render();}));
  const cancel=document.getElementById("master-cancel");if(cancel)cancel.addEventListener("click",()=>{masterEdit={type:"",id:""};render();});
  const formEl=document.getElementById("master-form");if(formEl)formEl.addEventListener("submit",async e=>{
    e.preventDefault();const editing=masterEdit.id?({brands:db.brands,items:db.masterItems,archive:db.designArchive,options:db.masterOptions,addresses:db.masterAddresses}[masterEdit.type]||[]).find(row=>row.id===masterEdit.id):null;let table,row;
    if(masterTab==="archive"){
      const thumbnail=document.getElementById("md-thumbnail").files[0],original=document.getElementById("md-original").files[0];
      row={brand_id:document.getElementById("md-brand").value,item_id:document.getElementById("md-item").value||null,design_name:document.getElementById("md-name").value.trim(),specifications:parseSpecifications(document.getElementById("md-specs").value),is_reorderable:document.getElementById("md-reorderable").checked,is_active:document.getElementById("md-active").checked,updated_at:new Date().toISOString(),thumbnail_path:editing?.thumbnail_path||null,original_path:editing?.original_path||null};
      try{for(const [file,field] of [[thumbnail,"thumbnail_path"],[original,"original_path"]])if(file){const mime=getAllowedFileType(file);if(!mime||file.size>20*1024*1024)throw new Error(`${file.name}: 지원되지 않는 파일이거나 20MB를 초과했습니다.`);const path=`archive/${crypto.randomUUID()}.${storageFileExtension(file)}`;await DesignFlowData.uploadFile(file,path,mime);row[field]=path;}}catch(error){notify(`파일을 올리지 못했습니다: ${error.message}`);return;}
      table="design_archive";
    }else if(masterTab==="items"){
      const requestFields={};document.querySelectorAll("[name=md-request-field]").forEach(input=>requestFields[input.value]=input.checked);
      row={name:document.getElementById("md-name").value.trim(),quantity_unit:document.getElementById("md-unit").value.trim()||"개",quantity_options:commaOptions(document.getElementById("md-quantities").value),size_options:commaOptions(document.getElementById("md-sizes").value),request_fields:requestFields,sort_order:Number(document.getElementById("md-order").value)||0,updated_at:new Date().toISOString()};table="master_items";
    }else if(masterTab==="addresses"){
      row={name:document.getElementById("md-name").value.trim(),address:document.getElementById("md-address").value.trim(),search_terms:document.getElementById("md-search-terms").value.trim(),sort_order:Number(document.getElementById("md-order").value)||0,updated_at:new Date().toISOString()};table="master_addresses";
    }else{
      row={name:document.getElementById("md-name").value.trim(),sort_order:Number(document.getElementById("md-order").value)||0,updated_at:new Date().toISOString()};
      table=masterTab==="brands"?"master_brands":"master_options";
      if(masterTab==="options")row.option_type="purpose";
    }
    const button=formEl.querySelector("button[type=submit]");button.disabled=true;
    try{if(editing)await DesignFlowData.update(table,editing.id,row);else await DesignFlowData.insert(table,{...row,is_active:row.is_active??true});masterEdit={type:"",id:""};await loadWorkspaceData();notify("운영 데이터를 저장했습니다.");render();}
    catch(error){button.disabled=false;notify(`저장하지 못했습니다: ${error.message}`);}
  });
  document.querySelectorAll("[data-master-toggle]").forEach(el=>el.addEventListener("click",async()=>{const source={brands:db.brands,items:db.masterItems,options:db.masterOptions,archive:db.designArchive,addresses:db.masterAddresses}[masterTab]||[];const item=source.find(row=>row.id===el.dataset.masterToggle);if(!item)return;const table={brands:"master_brands",items:"master_items",options:"master_options",archive:"design_archive",addresses:"master_addresses"}[masterTab];try{await DesignFlowData.update(table,item.id,{is_active:!item.is_active,updated_at:new Date().toISOString()});await loadWorkspaceData();render();}catch(error){notify(`변경하지 못했습니다: ${error.message}`);}}));
  document.querySelectorAll("[data-master-delete]").forEach(el=>el.addEventListener("click",async()=>{const source={brands:db.brands,items:db.masterItems,options:db.masterOptions,archive:db.designArchive,addresses:db.masterAddresses}[masterTab]||[];const item=source.find(row=>row.id===el.dataset.masterDelete);if(!item)return;const used=masterTab==="brands"?(db.requestItems.some(row=>row.brand_id===item.id)||db.designArchive.some(row=>row.brand_id===item.id)):masterTab==="items"?(db.requestItems.some(row=>row.master_item_id===item.id)||db.designArchive.some(row=>row.item_id===item.id)):masterTab==="archive"?db.requestItems.some(row=>row.design_archive_id===item.id):masterTab==="addresses"?db.requestItems.some(row=>row.delivery_address_id===item.id):false;if(used)return notify("접수 내역 또는 기존 디자인에 사용 중입니다. 비활성화로 관리해주세요.");if(!confirm("이 데이터를 삭제할까요?"))return;try{const table={brands:"master_brands",items:"master_items",options:"master_options",archive:"design_archive",addresses:"master_addresses"}[masterTab];await DesignFlowData.remove(table,item.id);await loadWorkspaceData();render();}catch(error){notify(`삭제하지 못했습니다: ${error.message}`);}}));
}
function bindEvents() {
  document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => { if (el.dataset.go === "request-form") { form = {}; formStep = 0; requestCart=[]; cartDraft={}; cartEditIndex=-1; requestDraft={ requestType:"NEW", brandId:"", store:"", requester:"", title:"", purpose:"", details:"", deadline:"", deliverySearch:"", deliveryAddress:"" }; } if (el.dataset.go === "login") route = "login"; go(el.dataset.go); }));
  document.querySelectorAll("[data-request]").forEach(el => el.addEventListener("click", () => { reviewShareLink = ""; go("request-detail", el.dataset.request); }));
  document.querySelectorAll("[data-review-request]").forEach(el => el.addEventListener("click", () => { reviewShareLink = ""; go("request-detail", el.dataset.reviewRequest); }));
  document.querySelectorAll("[data-delete-request]").forEach(el=>el.addEventListener("click",async e=>{e.stopPropagation();const id=el.dataset.deleteRequest,request=db.requests.find(row=>row.id===id);if(!request||!requestDeleteButton(request))return;if(!confirm("요청과 연결된 품목, 작업, 메모, 파일/시안 이력이 함께 삭제됩니다. 이 요청을 삭제할까요?"))return;el.disabled=true;try{await DesignFlowData.backend("design-review",{action:"delete_request",request_id:id});const removedTaskIds=db.tasks.filter(task=>task.requestId===id).map(task=>task.id);db.requests=db.requests.filter(row=>row.id!==id);db.tasks=db.tasks.filter(row=>row.requestId!==id);db.requestItems=db.requestItems.filter(row=>row.request_id!==id);db.files=db.files.filter(row=>row.request_id!==id);db.reviews=db.reviews.filter(row=>row.request_id!==id);db.taskNotes=db.taskNotes.filter(row=>!removedTaskIds.includes(row.task_id));savedRequestRows.delete(id);if(selectedRequest===id){selectedRequest=null;route="requests";}notify("요청과 연결 자료를 삭제했습니다.");render();}catch(error){el.disabled=false;notify(`삭제하지 못했습니다: ${error.message}`);}}));
  document.querySelectorAll("[data-task]:not([data-task-status])").forEach(el => el.addEventListener("click", e => { if (e.target.closest("select")) return; go("task-detail", el.dataset.task); }));
  const menu = document.getElementById("menu-toggle"); if (menu) menu.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  const logout = document.getElementById("sign-out"); if (logout) logout.addEventListener("click", async () => { await DesignFlowData.signOut(); currentUser = null; currentProfile = null; db = { requests: [], tasks: [], timeLogs: [], prices: [], requestProducts: [], files: [], reviews: [], requestItems: [], brands: [], masterItems: [], masterOptions: [], designArchive: [], masterAddresses: [], taskNotes: [] }; route = "login"; render(); });
  const loginForm = document.getElementById("login-form"); if (loginForm) loginForm.addEventListener("submit", async e => {
    e.preventDefault(); const error = document.getElementById("login-error"); const button = loginForm.querySelector("button[type=submit]"); button.disabled = true; error.textContent = "로그인 중…";
    try {
      currentUser = await DesignFlowData.signIn(document.getElementById("login-email").value.trim(), document.getElementById("login-password").value);
      currentProfile = await DesignFlowData.getProfile();
      if (!currentProfile) { await DesignFlowData.signOut(); currentUser = null; throw new Error("계정에 디자이너 또는 SV 역할이 지정되지 않았습니다."); }
      bootError = ""; route = currentProfile.role === "sv" ? "quote" : "dashboard";
      try { await loadWorkspaceData(); workspaceError = ""; }
      catch (loadError) { workspaceError = `로그인은 됐지만 업무 데이터를 불러오지 못했습니다. Supabase의 관련 표 권한을 확인해주세요. (${loadError.message})`; }
      render();
    } catch (err) { currentUser = null; currentProfile = null; error.textContent = err.message; button.disabled = false; }
  });
  const search = document.getElementById("request-search"); if (search) search.addEventListener("input", e => { searchTerm = e.target.value; const pos = e.target.selectionStart; render(); const next = document.getElementById("request-search"); next.focus(); next.setSelectionRange(pos,pos); });
  const filter = document.getElementById("request-filter"); if (filter) filter.addEventListener("change", e => { requestFilter = e.target.value; render(); });
  const tf = document.getElementById("task-filter"); if (tf) tf.addEventListener("change", e => { taskFilter = e.target.value; render(); });
  document.querySelectorAll("[data-task-status]").forEach(el => el.addEventListener("change", async e => { const t = db.tasks.find(x => x.id === e.target.dataset.taskStatus); if (t) { const previous = t.status,previousCompleted=t.completedAt; t.status = e.target.value;t.completedAt=t.status==="완료"?(t.completedAt||new Date().toISOString()):null; try { await saveData(); const request = db.requests.find(r => r.id === t.requestId); notify(request?.status === "완료" ? "연결된 모든 작업이 완료되어 요청도 완료 처리됐어요." : "작업 상태와 요청 상태를 함께 저장했어요."); } catch { t.status = previous;t.completedAt=previousCompleted; } render(); } }));
  document.querySelectorAll("[data-type]").forEach(el => el.addEventListener("click", () => { form.type = el.dataset.type; render(); }));
  const formProduct = document.getElementById("f-product"); if (formProduct && formProduct.tagName === "SELECT") formProduct.addEventListener("change", e => { const rule = productQuantityRule(e.target.value); form.product = e.target.value; form.quantity = rule.minimum; setFormFields(); form.product = e.target.value; form.quantity = rule.minimum; form.print_side = productPrintSides(e.target.value)[0]; render(); });
  const formQty = document.getElementById("f-quantity"); if (formQty) formQty.addEventListener("change", e => { const rule = productQuantityRule(form.product); e.target.value = normalizeQuantity(e.target.value, rule.singleUnit ? [] : rule.options, rule.minimum); form.quantity = e.target.value; });
  if (route === "request-form") bindRequestFormEvents();
  else {
    const back = document.getElementById("form-back"); if (back) back.addEventListener("click", () => { setFormFields(); formStep--; render(); });
    const next = document.getElementById("form-next"); if (next) next.addEventListener("click", async () => { if (!validateStep()) return; if (formStep < 2) { formStep++; render(); } else await submitRequest(); });
  }
  if(route==="master-data")bindMasterEvents();
  const fileForm = document.getElementById("detail-file-form"); if (fileForm) fileForm.addEventListener("submit", uploadDetailFiles);
  document.querySelectorAll("[data-file-download]").forEach(el => el.addEventListener("click", async () => { try { const result = await DesignFlowData.backend("design-review", { action: "file_link", file_id: el.dataset.fileDownload }); window.open(result.url, "_blank", "noopener"); } catch (error) { notify(`파일을 열지 못했어요: ${error.message}`); } }));
  const createReviewLink = document.getElementById("create-review-link"); if (createReviewLink) createReviewLink.addEventListener("click", async () => { createReviewLink.disabled = true; try { const result = await DesignFlowData.backend("design-review", { action: "create_link", request_id: selectedRequest }); reviewShareLink = result.url; db.files = await DesignFlowData.select("design_files", {}, "created_at.desc"); db.reviews = await DesignFlowData.select("design_reviews", {}, "created_at.desc"); notify(`${result.version}차 시안 검토 링크를 만들었어요.`); render(); } catch (error) { createReviewLink.disabled = false; notify(`링크를 만들지 못했어요: ${error.message}`); } });
  const copyReviewLink = document.getElementById("copy-review-link"); if (copyReviewLink) copyReviewLink.addEventListener("click", async () => { try { await navigator.clipboard.writeText(reviewShareLink); notify("요청자 공유 링크를 복사했어요."); } catch { notify("링크를 복사하지 못했습니다."); } });
  const reviewAttachments = document.getElementById("review-attachments"); if (reviewAttachments) reviewAttachments.addEventListener("change", e => { const names = document.getElementById("review-attachment-names"); if (names) names.textContent = [...e.target.files].map(file => file.name).join(" · "); });
  const requestAttachments = document.getElementById("request-attachments"); if (requestAttachments) requestAttachments.addEventListener("change", e => { form.attachments = [...e.target.files]; const names = document.getElementById("request-attachment-names"); if (names) names.textContent = form.attachments.map(file => file.name).join(" · "); });
  const approveDesign = document.getElementById("approve-design"); if (approveDesign) approveDesign.addEventListener("click", () => sendReviewResponse("approved"));
  const requestRevision = document.getElementById("request-revision"); if (requestRevision) requestRevision.addEventListener("click", () => sendReviewResponse("revision_requested"));
  const addStep = document.getElementById("add-step"); if (addStep) addStep.addEventListener("click", async () => { const r = db.requests.find(x => x.id === selectedRequest); await saveAnalysis(false); r.ai.steps.push({ name: "새 작업 단계", minutes: 30 }); await saveData(); render(); });
  document.querySelectorAll("[data-remove-step]").forEach(el => el.addEventListener("click", async () => { const r = db.requests.find(x => x.id === selectedRequest); await saveAnalysis(false); r.ai.steps.splice(Number(el.dataset.removeStep), 1); await saveData(); render(); }));
  const save = document.getElementById("save-analysis"); if (save) save.addEventListener("click", async () => { await saveAnalysis(false); notify("분석 제안을 저장했어요."); });
  const approve = document.getElementById("approve-analysis"); if (approve) approve.addEventListener("click", approveRequest);
  const rs = document.getElementById("request-status"); if (rs) rs.addEventListener("change", async e => { const r = db.requests.find(x => x.id === selectedRequest); if (db.tasks.some(t => t.requestId === r?.id)) { notify("작업이 생성된 요청은 작업관리의 진행 상태를 기준으로 자동 갱신됩니다."); render(); return; } const previous = r.status; r.status = e.target.value; try { await saveData(); notify("요청 상태를 변경했어요."); } catch { r.status = previous; } render(); });
  const tds = document.getElementById("task-detail-status"); if (tds) tds.addEventListener("change", async e => { const t = db.tasks.find(x => x.id === selectedTask); const previous = t.status,previousCompleted=t.completedAt; t.status = e.target.value;t.completedAt=t.status==="완료"?(t.completedAt||new Date().toISOString()):null; try { await saveData(); const request = db.requests.find(r => r.id === t.requestId); notify(request?.status === "완료" ? "연결된 모든 작업이 완료되어 요청도 완료 처리됐어요." : "작업 상태와 요청 상태를 함께 저장했어요."); } catch { t.status = previous;t.completedAt=previousCompleted; } render(); });
  const noteForm=document.getElementById("task-note-form");if(noteForm)noteForm.addEventListener("submit",async e=>{e.preventDefault();const content=document.getElementById("task-note-content").value.trim();if(!content)return;const note={task_id:selectedTask,note_type:document.getElementById("task-note-type").value,content,author_id:currentUser.id,author_name:currentProfile.display_name};try{await DesignFlowData.insert("task_notes",note);db.taskNotes.unshift({...note,created_at:new Date().toISOString()});notify("작업 메모를 저장했습니다.");render();}catch(error){notify(`메모를 저장하지 못했습니다: ${error.message}`);}});
  const addTime = document.getElementById("add-time"); if (addTime) addTime.addEventListener("click", logTime);
  bindQuoteEvents();
  bindPriceEvents();
}
async function submitRequest() {
  if(!requestCart.length)return notify("접수할 품목을 추가해주세요.");
  const id = `DF-${crypto.randomUUID()}`;
  const brand=db.brands.find(item=>item.id===requestDraft.brandId);
  const labelType={NEW:"신규 디자인",REORDER:"재주문",MODIFY:"기존 디자인 수정"};
  const summary=requestCart.map((item,index)=>`${index+1}. ${item.item_name_snapshot||item.design_name_snapshot||"품목"} ${item.quantity}${item.quantity_unit_snapshot||"개"}`).join("\n");
  const purpose=[...new Set(requestCart.map(item=>item.purpose_snapshot).filter(Boolean))].join(", ")||"기존 디자인 주문";
  const deadline=requestCart.map(item=>item.deadline).filter(Boolean).sort()[0]||null;
  const productNames=[...new Set(requestCart.map(item=>item.item_name_snapshot||item.design_name_snapshot).filter(Boolean))];
  const request = { id, requested_by: currentProfile?.role === "sv" ? currentUser?.id || null : null, title: [brand?.name,requestDraft.store,...productNames].filter(Boolean).join(" · ")||labelType[requestDraft.requestType]||"디자인 요청", type: labelType[requestDraft.requestType]||"신규 디자인", brand: brand?.name||"", store: requestDraft.store || null, requester: requestDraft.requester||"", contact: null, created: isoDay(), deadline, status: "접수", priority: "보통", purpose, details: summary, product: productNames.join(", "), quantity: `${requestCart.length}개 품목`, print_side: "단면", use: null, reference: null, ai: { summary: "", missing: [], steps: [] } };
  const items=requestCart.map((item,index)=>({request_type:item.request_type,brand_id:item.brand_id,master_item_id:item.master_item_id||null,design_archive_id:item.design_archive_id||null,brand_name_snapshot:item.brand_name_snapshot,item_name_snapshot:item.item_name_snapshot||null,quantity_unit_snapshot:item.quantity_unit_snapshot||"개",size_snapshot:item.size_snapshot||null,delivery_address_id:item.delivery_address_id||null,delivery_address_snapshot:item.delivery_address_snapshot||null,purpose_snapshot:item.purpose_snapshot||null,design_name_snapshot:item.design_name_snapshot||null,specifications_snapshot:item.specifications_snapshot||{},quantity:item.quantity||"",deadline:item.deadline||null,details:item.details||null,modification_types:item.modification_types||[],attachment_paths:[],sort_order:index}));
  const totalFiles=requestCart.reduce((sum,item)=>sum+(item.attachments||[]).length,0);
  if(totalFiles>10)return notify("한 요청에는 첨부 파일을 최대 10개까지 올릴 수 있습니다.");
  try {
    await DesignFlowData.rpc("create_request_with_items",{p_request:request,p_items:items},!currentProfile);
    fileUploadError = "";
    try {
      for(let index=0;index<requestCart.length;index++){
        const paths=[];
        for(const file of requestCart[index].attachments||[]){const mime=getAllowedFileType(file);if(!mime||file.size>20*1024*1024)throw new Error(`${file.name}: 지원되지 않는 형식이거나 20MB를 초과했습니다.`);let path;if(currentUser){path=`${id}/request_attachment/${crypto.randomUUID()}.${storageFileExtension(file)}`;await DesignFlowData.uploadFile(file,path,mime);await DesignFlowData.insert("design_files",{request_id:id,kind:"request_attachment",version:0,file_name:file.name,object_path:path,mime_type:mime,size_bytes:file.size,description:null,uploaded_by:currentUser.id});}else path=await DesignFlowData.uploadPublicRequestFile(file,id,mime);paths.push(path);}
        if(paths.length)await DesignFlowData.rpc("add_request_item_attachments",{p_request_id:id,p_sort_order:index,p_paths:paths},!currentProfile);
      }
    }catch(error){fileUploadError=`요청은 접수됐지만 일부 첨부 파일을 올리지 못했습니다. (${error.message})`;}
    if (currentProfile) { db.requests.unshift(mapRequest(request));try{db.requestItems.push(...await DesignFlowData.select("request_items",{request_id:`eq.${id}`},"sort_order.asc"));}catch{} if (currentProfile.role === "designer") savedRequestRows.set(id, JSON.stringify(rowRequest(request))); }
    selectedRequest = id; route = "request-success"; render();
  } catch (error) { const el = document.getElementById("form-error"); if (el) el.textContent = `접수하지 못했어요: ${error.message}`; else notify(`접수하지 못했어요: ${error.message}`); }
}
function getAllowedFileType(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const byExtension = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf", ai: "application/postscript", psd: "image/vnd.adobe.photoshop" };
  return byExtension[extension] || file.type || "";
}
function storageFileExtension(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "svg", "pdf", "ai", "psd"].includes(extension) ? extension : "bin";
}
async function uploadRequestAttachments(request) {
  const maxBytes = 20 * 1024 * 1024;
  for (const file of form.attachments || []) {
    const mimeType = getAllowedFileType(file);
    if (!mimeType || file.size > maxBytes) throw new Error(`${file.name}: 지원하지 않는 형식이거나 20MB를 초과했습니다.`);
    if (currentUser) {
      const objectPath = `${request.id}/request_attachment/${crypto.randomUUID()}.${storageFileExtension(file)}`;
      await DesignFlowData.uploadFile(file, objectPath, mimeType);
      await DesignFlowData.insert("design_files", { request_id: request.id, kind: "request_attachment", version: 0, file_name: file.name, object_path: objectPath, mime_type: mimeType, size_bytes: file.size, description: null, uploaded_by: currentUser.id });
    } else {
      await DesignFlowData.uploadPublicRequestFile(file, request.id, mimeType);
    }
  }
}
async function uploadDetailFiles(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const input = document.getElementById("detail-file-input");
  const files = [...(input?.files || [])];
  if (!files.length) return notify("먼저 올릴 파일을 선택해주세요.");
  const request = db.requests.find(item => item.id === selectedRequest);
  if (!request) return notify("요청을 찾을 수 없습니다.");
  const kind = document.getElementById("detail-file-kind").value;
  const description = document.getElementById("detail-file-description").value.trim();
  const button = formElement.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    for (const file of files) {
      const mimeType = getAllowedFileType(file);
      if (!mimeType || file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: 지원하지 않는 형식이거나 20MB를 초과했습니다.`);
      const objectPath = `${request.id}/${kind}/${crypto.randomUUID()}.${storageFileExtension(file)}`;
      await DesignFlowData.uploadFile(file, objectPath, mimeType);
      await DesignFlowData.insert("design_files", { request_id: request.id, kind, version: 0, file_name: file.name, object_path: objectPath, mime_type: mimeType, size_bytes: file.size, description: description || null, uploaded_by: currentUser.id });
    }
    db.files = await DesignFlowData.select("design_files", {}, "created_at.desc");
    notify("파일을 안전하게 등록했어요.");
    render();
  } catch (error) {
    button.disabled = false;
    notify(`파일을 등록하지 못했어요: ${error.message}`);
  }
}
async function sendReviewResponse(decision) {
  const error = document.getElementById("review-response-error");
  const feedback = document.getElementById("review-feedback")?.value.trim() || "";
  const attachments = [...(document.getElementById("review-attachments")?.files || [])];
  if (decision === "revision_requested" && !feedback) { if (error) error.textContent = "수정이 필요한 내용을 적어주세요."; return; }
  if (decision === "approved" && attachments.length) { if (error) error.textContent = "파일을 첨부한 경우에는 수정 요청으로 보내주세요."; return; }
  if (attachments.length > 10) { if (error) error.textContent = "첨부 파일은 최대 10개까지 가능합니다."; return; }
  try {
    const uploaded = [];
    for (const file of attachments) { const mimeType = getAllowedFileType(file); if (!mimeType || file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: 지원되지 않는 형식이거나 20MB를 초과했습니다.`); uploaded.push(await DesignFlowData.uploadReviewAttachment(file, reviewToken, mimeType)); }
    await DesignFlowData.backend("design-review", { action: "respond", token: reviewToken, decision, feedback, attachments: uploaded }, true);
    publicReviewData = await DesignFlowData.backend(`design-review?token=${encodeURIComponent(reviewToken)}`, null, true);
    publicReviewError = "";
    render();
  } catch (failure) { if (error) error.textContent = failure.message; }
}
async function saveAnalysis(showToast = true) {
  const r = db.requests.find(x => x.id === selectedRequest); if (!r) return;
  const summary = document.getElementById("ai-summary"); const missing = document.getElementById("ai-missing");
  if (summary) r.ai.summary = summary.value.trim(); if (missing) r.ai.missing = missing.value.split("\n").map(x => x.trim()).filter(Boolean);
  r.ai.steps = [...document.querySelectorAll("[data-step-name]")].map(input => { const i = input.dataset.stepName; return { name: input.value.trim(), minutes: Number(document.querySelector(`[data-step-minutes="${i}"]`)?.value) || 0 }; }).filter(s => s.name);
  await saveData(); if (showToast) notify("분석 제안을 저장했어요.");
}
async function approveRequest() {
  await saveAnalysis(false); const r = db.requests.find(x => x.id === selectedRequest); if (!r) return;
  if (r.status === "작업 진행" || r.status === "완료") return notify("이미 작업이 생성된 요청입니다.");
  if (!r.ai.steps.length) return notify("작업 단계를 하나 이상 추가한 뒤 승인해주세요.");
  r.status = "작업 진행";
  r.ai.steps.forEach((s, i) => db.tasks.push({ id: `TS-${String(Date.now() + i).slice(-5)}`, requestId: r.id, name: r.title, step: s.name, brand: r.brand, due: r.deadline || isoDay(7), status: "접수", priority: r.priority, estimate: s.minutes, actual: 0, completedAt: null }));
  await saveData(); notify("요청을 승인하고 작업을 만들었어요."); render();
}
async function logTime() {
  const minutes = Number(document.getElementById("time-minutes").value); if (!minutes || minutes < 1) return notify("기록할 시간을 분 단위로 입력해주세요.");
  const t = db.tasks.find(x => x.id === selectedTask); t.actual = Number(t.actual || 0) + minutes;
  const log = { task_id: t.id, minutes, note: document.getElementById("time-note").value.trim(), date: isoDay() };
  try { await DesignFlowData.insert("time_logs", log); await saveData(); db.timeLogs.unshift({ taskId: t.id, minutes, note: log.note, date: log.date }); notify(`${minutes}분을 기록했어요.`); render(); }
  catch (error) { notify(`시간을 저장하지 못했어요: ${error.message}`); }
}
function bindQuoteEvents() {
  const side = document.getElementById("quote-print-side"); if (side) side.addEventListener("change", e => { quoteSelection.printSide = e.target.value; quoteSelection.size = ""; quoteSelection.material = ""; quoteSelection.quantity = quoteMinimumFor(); render(); });
  const product = document.getElementById("quote-product"); if (product) product.addEventListener("change", e => { quoteSelection.product = e.target.value; quoteSelection.size = ""; quoteSelection.material = ""; quoteSelection.printSide = productPrintSides(quoteSelection.product)[0]; quoteSelection.quantity = quoteMinimumFor(quoteSelection.product, "", ""); render(); });
  const size = document.getElementById("quote-size"); if (size) size.addEventListener("change", e => { quoteSelection.size = e.target.value; quoteSelection.material = ""; quoteSelection.quantity = quoteMinimumFor(quoteSelection.product, quoteSelection.size, ""); render(); });
  const material = document.getElementById("quote-material"); if (material) material.addEventListener("change", e => { quoteSelection.material = e.target.value; quoteSelection.quantity = quoteMinimumFor(quoteSelection.product, quoteSelection.size, quoteSelection.material); render(); });
  const delivery = document.getElementById("quote-delivery-area"); if (delivery) delivery.addEventListener("change", e => { quoteSelection.deliveryArea = e.target.value; render(); });
  const designTask = document.getElementById("quote-design-task"); if (designTask) designTask.addEventListener("change", e => { quoteSelection.designTask = e.target.value; render(); });
  const quantity = document.getElementById("quote-quantity"); if (quantity) quantity.addEventListener("change", e => { const rule = productQuantityRule(quoteSelection.product); quoteSelection.quantity = normalizeQuantity(e.target.value, rule.singleUnit ? [] : rule.options, quoteMinimumFor()); render(); });
  document.querySelectorAll("[data-qty]").forEach(button => button.addEventListener("click", () => { quoteSelection.quantity = stepQuantity(quoteSelection.quantity, Number(button.dataset.qty), productQuantityOptions(quoteSelection.product)); render(); }));
  const copy = document.getElementById("copy-quote"); if (copy) copy.addEventListener("click", async () => {
    const p = db.prices.find(x => x.product === quoteSelection.product && x.size === quoteSelection.size && x.material === quoteSelection.material && (x.print_side || "단면") === quoteSelection.printSide && (currentProfile.role === "designer" || x.is_active));
    if (!p) return;
    const rule = productQuantityRule(p.product);
    const qty = normalizeQuantity(quoteSelection.quantity, rule.singleUnit ? [] : rule.options, quoteMinimumFor(p.product, p.size, p.material));
    const fee = quoteSelection.deliveryArea === "제주도" ? Number(p.jeju_shipping_krw) || 0 : 0;
    const task = DESIGN_FEE_ITEMS.find(item => item.id === quoteSelection.designTask) || DESIGN_FEE_ITEMS[0];
    const appliedUnitPrice = priceForQuantity(p, qty);
    const unit = quantityUnit(p.product);
    const production = appliedUnitPrice * qty + fee;
    const total = production + (task.fee === null ? 0 : task.fee);
    const estimate = task.fee === null ? `제작비 소계 ₩${production.toLocaleString("ko-KR")} · 디자인비 접수 후 별도 견적` : `간편 견적 ₩${total.toLocaleString("ko-KR")} (디자인비 ₩${task.fee.toLocaleString("ko-KR")} 포함)`;
    try { await navigator.clipboard.writeText(`${p.product} ${p.size} ${p.material} ${quoteSelection.printSide} ${qty}${unit} · ${task.level} ${task.name}${fee ? ` · 제주 추가 배송비 ₩${fee.toLocaleString("ko-KR")}` : ""}: ${estimate} · 적용 매당 단가 ₩${appliedUnitPrice.toLocaleString("ko-KR")} (부가세·기본 배송 포함)\n점주님 간단 문의용 참고 견적이며, 실제 금액은 작업·제작 조건에 따라 달라질 수 있습니다. 주문 접수 후 상세 견적을 안내드립니다.`); notify("견적 내용을 복사했어요."); }
    catch { notify("이 브라우저에서는 복사할 수 없습니다."); }
  });
}
function bindPriceEvents() {
  const catalogForm = document.getElementById("request-product-form"); const catalogSingleUnit = document.getElementById("catalog-single-unit"); if (catalogSingleUnit) catalogSingleUnit.addEventListener("change", e => { const input = document.getElementById("catalog-quantities"); const minimum = document.getElementById("catalog-minimum"); input.disabled = e.target.checked; input.required = !e.target.checked; minimum.disabled = !e.target.checked; }); if (catalogForm) catalogForm.addEventListener("submit", async e => { e.preventDefault(); const product = document.getElementById("catalog-product").value.trim(); const editingCatalog=db.requestProducts.find(item=>String(item.id)===String(requestProductEditId)); const singleUnit = document.getElementById("catalog-single-unit").checked; const minimum = Math.max(1, Math.floor(Number(document.getElementById("catalog-minimum").value) || 1)); let quantityOptions; try { quantityOptions = singleUnit ? (editingCatalog?.quantity_options?.length ? editingCatalog.quantity_options : [minimum]) : parseQuantityOptions(document.getElementById("catalog-quantities").value); } catch (error) { notify(error.message); return; } const allowedPrintSides = [...document.querySelectorAll("[name=allowed-print-side]:checked")].map(input => input.value); if (!allowedPrintSides.length) return notify("사용할 인쇄 면을 하나 이상 선택해주세요."); const row = { product, allowed_print_sides: allowedPrintSides, quantity_options: quantityOptions, minimum_quantity: singleUnit ? minimum : quantityOptions[0], quantity_step: 1, single_unit_order: singleUnit, updated_at: new Date().toISOString() }; const button = catalogForm.querySelector("button[type=submit]"); button.disabled = true; try { if (requestProductEditId) await DesignFlowData.update("request_products", requestProductEditId, row); else await DesignFlowData.insert("request_products", { ...row, is_active: true }); db.requestProducts = await DesignFlowData.select("request_products", {}, "product.asc"); requestProductEditId = null; notify("접수 품목과 주문 가능 수량을 저장했어요."); render(); } catch (error) { button.disabled = false; notify(`품목을 저장하지 못했어요: ${error.message}`); } });
  const cancelCatalog = document.getElementById("cancel-catalog-edit"); if (cancelCatalog) cancelCatalog.addEventListener("click", () => { requestProductEditId = null; render(); });
  document.querySelectorAll("[data-catalog-edit]").forEach(el => el.addEventListener("click", () => { requestProductEditId = el.dataset.catalogEdit; render(); }));
  document.querySelectorAll("[data-catalog-active]").forEach(el => el.addEventListener("click", async () => { const item = db.requestProducts.find(row => String(row.id) === el.dataset.catalogActive); if (!item) return; try { await DesignFlowData.update("request_products", item.id, { is_active: !item.is_active, updated_at: new Date().toISOString() }); item.is_active = !item.is_active; render(); } catch (error) { notify(`변경하지 못했어요: ${error.message}`); } }));
  document.querySelectorAll("[data-catalog-delete]").forEach(el => el.addEventListener("click", async () => { try { await DesignFlowData.remove("request_products", el.dataset.catalogDelete); db.requestProducts = db.requestProducts.filter(item => String(item.id) !== el.dataset.catalogDelete); render(); } catch (error) { notify(`삭제하지 못했어요: ${error.message}`); } }));
  const priceProduct=document.getElementById("price-product"),priceSide=document.getElementById("price-side");if(priceProduct&&priceSide)priceProduct.addEventListener("input",()=>{const prior=priceSide.value,sides=productPrintSides(priceProduct.value.trim());priceSide.innerHTML=sides.map(side=>`<option>${side}</option>`).join("");priceSide.value=sides.includes(prior)?prior:sides[0];});
  const cancel = document.getElementById("cancel-price-edit"); if (cancel) cancel.addEventListener("click", () => { priceEditId = null; render(); });
  const formEl = document.getElementById("price-form"); if (formEl) formEl.addEventListener("submit", async e => {
    e.preventDefault(); let quantityTiers; try { quantityTiers = parsePriceTiers(document.getElementById("price-tiers").value, document.getElementById("price-product").value.trim(), Number(document.getElementById("price-minimum").value)); } catch (error) { notify(error.message); return; }
    const row = { product: document.getElementById("price-product").value.trim(), print_side: document.getElementById("price-side").value, size: document.getElementById("price-size").value.trim(), material: document.getElementById("price-material").value.trim(), unit_price_krw: Number(document.getElementById("price-unit").value), minimum_quantity: Number(document.getElementById("price-minimum").value), quantity_tiers: quantityTiers, jeju_shipping_krw: Number(document.getElementById("price-jeju").value), is_active: editingPriceActive() };
    const button = formEl.querySelector("button[type=submit]"); button.disabled = true;
    try {
      if (priceEditId) await DesignFlowData.update("price_items", priceEditId, { ...row, updated_at: new Date().toISOString() });
      else await DesignFlowData.insert("price_items", row);
      db.prices = await DesignFlowData.select("price_items", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "product.asc,size.asc,material.asc");
      priceEditId = null; notify("단가표를 저장했어요."); render();
    } catch (error) { button.disabled = false; notify(`저장하지 못했어요: ${error.message}`); }
  });
  document.querySelectorAll("[data-price-edit]").forEach(el => el.addEventListener("click", () => { priceEditId = el.dataset.priceEdit; render(); }));
  document.querySelectorAll("[data-price-active]").forEach(el => el.addEventListener("click", async () => {
    const p = db.prices.find(x => String(x.id) === el.dataset.priceActive); if (!p) return;
    try { await DesignFlowData.update("price_items", p.id, { is_active: !p.is_active, updated_at: new Date().toISOString() }); db.prices = await DesignFlowData.select("price_items", {}, "product.asc,size.asc,material.asc"); render(); }
    catch (error) { notify(`변경하지 못했어요: ${error.message}`); }
  }));
  document.querySelectorAll("[data-price-delete]").forEach(el => el.addEventListener("click", async () => {
    if (!confirm("이 단가 조합을 삭제할까요?")) return;
    try { await DesignFlowData.remove("price_items", el.dataset.priceDelete); db.prices = await DesignFlowData.select("price_items", {}, "product.asc,size.asc,material.asc"); notify("단가를 삭제했어요."); render(); }
    catch (error) { notify(`삭제하지 못했어요: ${error.message}`); }
  }));
}
function editingPriceActive() { const p = db.prices.find(x => String(x.id) === String(priceEditId)); return p ? p.is_active : true; }

window.addEventListener("hashchange", () => { const next = location.hash.slice(1); if (["dashboard", "requests", "tasks", "calendar", "quote", "prices", "master-data"].includes(next)) go(next); });
render();
initializeApp();
