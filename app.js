const today = new Date();
const isoDay = (offset = 0) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
let db = { requests: [], tasks: [], timeLogs: [], prices: [], files: [], reviews: [] };
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
let quoteSelection = { product: "", size: "", material: "", quantity: 1, deliveryArea: "기본 배송" };
let publicReviewData = null;
let publicReviewError = "";
let reviewShareLink = "";
let fileUploadError = "";

function rowRequest(r) {
  return { id: r.id, title: r.title, type: r.type, brand: r.brand, store: r.store || null, requester: r.requester, contact: r.contact || null, created: r.created, deadline: r.deadline || null, status: r.status, priority: r.priority, purpose: r.purpose, details: r.details, product: r.product || null, quantity: r.quantity || null, use: r.use || null, reference: r.reference || null, ai: r.ai || null };
}
function rowTask(t) { return { id: t.id, request_id: t.requestId, name: t.name, step: t.step, brand: t.brand, due: t.due || null, status: t.status, priority: t.priority, estimate: Number(t.estimate) || 0, actual: Number(t.actual) || 0 }; }
function mapRequest(r) { return { ...r, created: String(r.created || "").slice(0,10), deadline: r.deadline ? String(r.deadline).slice(0,10) : "", ai: r.ai || { summary: "", missing: [], steps: [] } }; }
function mapTask(t) { return { id: t.id, requestId: t.request_id, name: t.name, step: t.step, brand: t.brand, due: t.due ? String(t.due).slice(0,10) : "", status: t.status, priority: t.priority, estimate: t.estimate, actual: t.actual }; }
function mapTimeLog(l) { return { id: l.id, taskId: l.task_id, minutes: l.minutes, note: l.note || "", date: String(l.date || "").slice(0,10) }; }
async function loadWorkspaceData() {
  const prices = await DesignFlowData.select("price_items", currentProfile.role === "sv" ? { is_active: "eq.true" } : {}, "product.asc,size.asc,material.asc");
  db.prices = prices || [];
  const [requests, tasks, logs, files, reviews] = await Promise.all([
    DesignFlowData.select("requests", {}, "created.desc"),
    DesignFlowData.select("tasks", {}, "due.asc"),
    currentProfile.role === "designer" ? DesignFlowData.select("time_logs", {}, "date.desc") : Promise.resolve([]),
    DesignFlowData.select("design_files", {}, "created_at.desc"),
    currentProfile.role === "designer" ? DesignFlowData.select("design_reviews", {}, "created_at.desc") : Promise.resolve([])
  ]);
  db.requests = (requests || []).map(mapRequest);
  db.tasks = (tasks || []).map(mapTask);
  db.timeLogs = (logs || []).map(mapTimeLog);
  db.files = files || [];
  db.reviews = reviews || [];
  savedRequestRows = new Map(db.requests.map(r => [r.id, JSON.stringify(rowRequest(r))]));
  savedTaskRows = new Map(db.tasks.map(t => [t.id, JSON.stringify(rowTask(t))]));
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
    else if (linked.every(t => t.status === "보류")) r.status = "보류";
    else if (r.status === "완료" || r.status === "보류") r.status = "작업 진행";
  }
}
function esc(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dateLabel(value) { if (!value) return "미정"; const d = new Date(`${value}T00:00:00`); return `${d.getMonth() + 1}월 ${d.getDate()}일`; }
function dayDiff(value) { if (!value) return 999; return Math.ceil((new Date(`${value}T00:00:00`) - new Date(`${isoDay()}T00:00:00`)) / 86400000); }
function statusClass(status) { return ({ "접수": "blue", "검토 중": "blue", "정보 요청": "amber", "분석 완료": "purple", "작업 진행": "blue", "시안 확인": "purple", "수정 요청": "amber", "디자인 승인": "green", "완료": "green", "보류": "amber", "진행 중": "blue", "검토": "purple", "대기": "", "보류 중": "amber" })[status] || ""; }
function priorityClass(priority) { return ({ "긴급": "red", "높음": "amber", "보통": "blue", "낮음": "" })[priority] || ""; }
function badge(text, cls = statusClass(text)) { return `<span class="badge ${cls}">${esc(text)}</span>`; }
function notify(message) { const old = document.querySelector(".toast"); if (old) old.remove(); const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.remove(), 2600); }
function go(next, data = null) { route = next; if (next === "request-detail") selectedRequest = data; if (next === "task-detail") selectedTask = data; window.scrollTo(0, 0); render(); }

function layout(content) {
  const designerItems = [["dashboard", "◫", "대시보드"], ["requests", "▤", "요청 관리"], ["tasks", "☷", "작업 관리"], ["calendar", "▦", "일정"], ["quote", "₩", "견적 확인"], ["prices", "⊞", "단가표 관리"]];
  const navItems = currentProfile?.role === "designer" ? designerItems : [["quote", "₩", "견적 확인"], ["requests", "▤", "요청 진행상황"]];
  const current = route === "request-form" || route === "request-success" ? "request-form" : route;
  const displayName = currentProfile?.display_name || "직원";
  const avatarName = displayName.slice(0, 1);
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">D</div><div><div class="brand-name">Design Flow</div><div class="brand-caption">DESIGN WORKSPACE</div></div></div><div class="nav-label">${currentProfile?.role === "designer" ? "DESIGNER WORKSPACE" : "SV WORKSPACE"}</div><nav class="nav">${navItems.map(([key, icon, label]) => `<button class="nav-item ${current === key ? "active" : ""}" data-go="${key}"><span class="nav-icon">${icon}</span>${label}</button>`).join("")}<button class="nav-item ${current === "request-form" ? "active" : ""}" data-go="request-form"><span class="nav-icon">＋</span>새 작업 요청</button></nav><div class="sidebar-bottom"><div class="demo-note"><strong>공용 데이터 연결</strong><span>요청과 단가가 승인된 계정에 공유됩니다.<br>제주 배송 추가 비용은 단가 설정에 따릅니다.</span></div><div class="user-chip"><div class="avatar">${esc(avatarName)}</div><div><div class="user-name">${esc(displayName)}</div><div class="user-role">${currentProfile?.role === "designer" ? "디자이너" : "SV"}</div></div></div></div></aside><main class="main"><header class="topbar"><div class="crumb-wrap"><button class="mobile-menu" id="menu-toggle" aria-label="메뉴 열기">☰</button><div class="crumb">워크스페이스　/　${routeTitle()}</div></div><div class="top-actions"><button class="btn small" id="sign-out">로그아웃</button><div class="avatar">${esc(avatarName)}</div></div></header>${workspaceError ? `<div class="workspace-alert">${esc(workspaceError)}</div>` : ""}${content}<div class="footer-note">Design Flow · 공용 데이터 공간</div></main></div>`;
}
function routeTitle() { if (route === "requests" && currentProfile?.role === "sv") return "요청 진행상황"; return ({ dashboard: "대시보드", requests: "요청 관리", "request-detail": "요청 상세", "request-form": "새 요청 접수", "request-success": "접수 완료", tasks: "작업 관리", "task-detail": "작업 상세", calendar: "일정", quote: "견적 확인", prices: "단가표 관리" })[route] || "대시보드"; }
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
function quotePage() {
  const productNames = [...new Set(db.prices.map(p => p.product))].sort();
  if (!productNames.includes(quoteSelection.product)) quoteSelection.product = productNames[0] || "";
  const productRows = db.prices.filter(p => p.product === quoteSelection.product && (currentProfile.role === "designer" || p.is_active));
  const sizes = [...new Set(productRows.map(p => p.size))].sort();
  if (!sizes.includes(quoteSelection.size)) quoteSelection.size = sizes[0] || "";
  const sizeRows = productRows.filter(p => p.size === quoteSelection.size);
  const materials = [...new Set(sizeRows.map(p => p.material))].sort();
  if (!materials.includes(quoteSelection.material)) quoteSelection.material = materials[0] || "";
  const chosen = sizeRows.find(p => p.material === quoteSelection.material);
  const minimum = Number(chosen?.minimum_quantity) || 1;
  const qty = Math.max(minimum, Number(quoteSelection.quantity) || minimum);
  quoteSelection.quantity = qty;
  const jejuFee = quoteSelection.deliveryArea === "제주도" ? Number(chosen?.jeju_shipping_krw) || 0 : 0;
  const total = chosen ? Number(chosen.unit_price_krw) * qty + jejuFee : 0;
  return `<section class="page">${head("QUICK QUOTE", "간편 견적 확인", "품목과 제작 조건을 선택하면 기준 단가로 예상 금액을 계산합니다.")}${productNames.length ? `<div class="quote-layout"><div class="panel quote-form"><div class="section-label">제작 조건 선택</div><div class="field"><label>품목</label><select id="quote-product">${productNames.map(p => `<option ${quoteSelection.product === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></div><div class="field" style="margin-top:15px"><label>크기</label><select id="quote-size">${sizes.map(s => `<option ${quoteSelection.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div><div class="field" style="margin-top:15px"><label>재질</label><select id="quote-material">${materials.map(m => `<option ${quoteSelection.material === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div><div class="field" style="margin-top:15px"><label>배송 지역</label><select id="quote-delivery-area"><option ${quoteSelection.deliveryArea === "기본 배송" ? "selected" : ""}>기본 배송</option><option ${quoteSelection.deliveryArea === "제주도" ? "selected" : ""}>제주도</option></select></div><div class="field" style="margin-top:15px"><label>수량</label><div class="quantity-control"><button class="quantity-step" data-qty="-1" aria-label="수량 줄이기">−</button><input id="quote-quantity" type="number" min="${minimum}" step="1" value="${qty}" /><button class="quantity-step" data-qty="1" aria-label="수량 늘리기">＋</button></div><div class="helper">최소 주문 수량 ${minimum}개부터 계산됩니다.</div></div></div><div class="panel quote-result"><div class="quote-label">예상 견적 금액</div><div class="quote-total">${chosen ? `₩${total.toLocaleString("ko-KR")}` : "조건을 선택해주세요"}</div>${chosen ? `<div class="quote-math"><span>${esc(chosen.product)} · ${esc(chosen.size)} · ${esc(chosen.material)}</span><span>₩${Number(chosen.unit_price_krw).toLocaleString("ko-KR")} × ${qty}개</span>${jejuFee ? `<span>제주 추가 배송비</span><span>₩${jejuFee.toLocaleString("ko-KR")}</span>` : ""}</div><div class="quote-rule">기본 단가에는 부가세와 기본 배송비가 포함됩니다.</div>` : ""}<div class="quote-disclaimer">등록된 기준 단가를 바탕으로 한 예상 금액입니다. 별도 조건이 있는 경우 담당자에게 확인해주세요.</div><button class="btn" id="copy-quote" ${chosen ? "" : "disabled"}>견적 내용 복사</button></div></div>` : `<div class="panel empty-price"><div class="empty-illustration">₩</div><h2>등록된 단가가 아직 없어요</h2><p>${currentProfile.role === "designer" ? "단가표 관리에서 품목·크기·재질별 가격을 먼저 등록해주세요." : "디자인 담당자가 단가를 준비 중입니다. 잠시 후 다시 확인해주세요."}</p>${currentProfile.role === "designer" ? `<button class="btn primary" data-go="prices">단가 등록하기</button>` : ""}</div>`}</section>`;
}
function pricesPage() {
  const editing = db.prices.find(p => String(p.id) === String(priceEditId));
  const rows = [...db.prices].sort((a,b) => `${a.product}${a.size}${a.material}`.localeCompare(`${b.product}${b.size}${b.material}`));
  return `<section class="page">${head("PRICE CATALOG", "단가표 관리", "품목·크기·재질별 단가를 등록하면 SV 견적 화면에 바로 반영됩니다.")}
    <div class="panel price-editor"><div class="panel-head"><div><div class="panel-title">${editing ? "단가 수정" : "새 단가 등록"}</div><div class="panel-sub">부가세와 배송비가 포함된 최종 단가를 입력하세요.</div></div>${editing ? `<button class="btn small" id="cancel-price-edit">취소</button>` : ""}</div>
    <form id="price-form" class="price-form"><div class="field"><label for="price-product">품목</label><input id="price-product" required maxlength="80" value="${esc(editing?.product || "")}" placeholder="예: 포스터" /></div><div class="field"><label for="price-size">크기</label><input id="price-size" required maxlength="80" value="${esc(editing?.size || "")}" placeholder="예: A2" /></div><div class="field"><label for="price-material">재질</label><input id="price-material" required maxlength="100" value="${esc(editing?.material || "")}" placeholder="예: 아트지 150g" /></div><div class="field"><label for="price-unit">매당 단가 (원)</label><input id="price-unit" type="number" min="0" step="1" required value="${editing ? Number(editing.unit_price_krw) : ""}" placeholder="예: 3500" /></div><div class="field"><label for="price-minimum">최소 주문 수량</label><input id="price-minimum" type="number" min="1" step="1" required value="${Number(editing?.minimum_quantity) || 1}" placeholder="예: 5" /></div><div class="field"><label for="price-jeju">제주 추가 배송비 (원)</label><input id="price-jeju" type="number" min="0" step="1" required value="${Number(editing?.jeju_shipping_krw) || 0}" placeholder="예: 5000" /></div><button class="btn primary price-save" type="submit">${editing ? "변경 저장" : "단가 추가"}</button></form></div>
    <div class="panel price-table-wrap"><div class="panel-head"><div><div class="panel-title">등록된 단가</div><div class="panel-sub">총 ${rows.length}개 조합</div></div></div>${rows.length ? `<div class="price-table"><div class="price-head"><span>품목</span><span>크기</span><span>재질</span><span>매당 단가</span><span>최소 수량</span><span>제주 배송비</span><span>SV 공개</span><span>관리</span></div>${rows.map(p => `<div class="price-row ${p.is_active ? "" : "inactive"}"><strong>${esc(p.product)}</strong><span>${esc(p.size)}</span><span>${esc(p.material)}</span><strong>₩${Number(p.unit_price_krw).toLocaleString("ko-KR")}</strong><span>${Number(p.minimum_quantity) || 1}개</span><span>₩${(Number(p.jeju_shipping_krw) || 0).toLocaleString("ko-KR")}</span><span><button class="toggle-pill ${p.is_active ? "on" : ""}" data-price-active="${p.id}">${p.is_active ? "공개" : "숨김"}</button></span><span class="price-actions"><button class="text-link" data-price-edit="${p.id}">수정</button><button class="text-link danger-text" data-price-delete="${p.id}">삭제</button></span></div>`).join("")}</div>` : `<div class="empty">아직 등록한 단가가 없습니다. 위에서 첫 단가를 추가해보세요.</div>`}</div></section>`;
}

function dashboard() {
  const pending = db.requests.filter(r => ["접수", "검토 중", "정보 요청"].includes(r.status)).length;
  const active = db.tasks.filter(t => t.status === "진행 중").length;
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
  return `<section class="page">${head("REQUESTS", isSv ? "요청 진행상황" : "요청 관리", isSv ? `등록된 요청 ${db.requests.length}건의 상태와 진행 내용을 조회합니다.` : `총 ${db.requests.length}건의 디자인 요청을 관리합니다. 작업이 생성된 요청은 작업 상태에 따라 자동으로 완료 처리됩니다.`, `<button class="btn primary" data-go="request-form">＋　새 작업 요청</button>`)}<div class="toolbar"><div class="search"><input id="request-search" placeholder="요청명, 브랜드, 요청자로 검색" value="${esc(searchTerm)}" /></div><select class="select" id="request-filter">${["전체", "접수", "검토 중", "정보 요청", "분석 완료", "시안 확인", "수정 요청", "디자인 승인", "작업 진행", "완료", "보류"].map(v => `<option ${requestFilter === v ? "selected" : ""}>${v}</option>`).join("")}</select><button class="btn">필터　⌄</button></div><div class="panel request-list"><div class="list-head"><span>요청 내용</span><span>브랜드 / 요청자</span><span>접수일</span><span>희망 완료일</span><span>상태</span></div>${rows.map(r => `<div class="list-item" data-request="${r.id}"><div><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>${esc(r.type)}</span>${badge(r.priority, priorityClass(r.priority))}</div><div class="list-mobile-meta">${esc(r.brand)} · ${dateLabel(r.created)}</div></div><div>${esc(r.brand)}<div class="row-meta">${esc(r.requester)}</div></div><div>${dateLabel(r.created)}</div><div>${dateLabel(r.deadline)}</div><div>${badge(r.status)}</div></div>`).join("") || `<div class="empty">조건에 맞는 요청이 없습니다.</div>`}</div></section>`;
}

function requestDetail() {
  const r = db.requests.find(x => x.id === selectedRequest) || db.requests[0];
  if (!r) return `<section class="page">${head("REQUEST", "요청을 찾을 수 없습니다", "요청 목록으로 돌아가 다시 확인해주세요.", `<button class="btn" data-go="requests">← 요청 목록</button>`)}</section>`;
  if (currentProfile?.role === "sv") {
    const tasks = db.tasks.filter(t => t.requestId === r.id);
    return `<section class="page">${head("REQUEST STATUS", r.title, `${r.id}　·　${esc(r.brand)}　·　${dateLabel(r.created)} 접수`, `<button class="btn" data-go="requests">← 요청 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">요청 내용</div><h2 class="detail-title">${esc(r.title)}</h2><div class="detail-copy">${esc(r.details || "요청 상세 내용이 없습니다.")}</div></div><div class="detail-section"><div class="section-label">요청 정보</div><div class="info-grid"><div><div class="info-label">요청 유형</div><div class="info-value">${esc(r.type)}</div></div><div><div class="info-label">요청자</div><div class="info-value">${esc(r.requester)}</div></div><div><div class="info-label">브랜드 / 매장</div><div class="info-value">${esc(r.brand)}${r.store ? ` / ${esc(r.store)}` : ""}</div></div><div><div class="info-label">희망 완료일</div><div class="info-value">${dateLabel(r.deadline)}</div></div><div><div class="info-label">제작물</div><div class="info-value">${esc(r.product || "미정")}</div></div><div><div class="info-label">수량</div><div class="info-value">${esc(r.quantity || "미정")}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(r.status)}</div></div></div></div></div><aside class="panel"><div class="section-label">진행 상황</div><div class="progress-status">${badge(r.status)}</div>${tasks.length ? `<div class="sv-task-list">${tasks.map(t => `<div class="sv-task-row"><strong>${esc(t.step || t.name)}</strong>${badge(t.status)}${t.due ? `<small>예정 ${dateLabel(t.due)}</small>` : ""}</div>`).join("")}</div>` : `<div class="empty">디자인 담당자가 요청을 검토 중입니다. 작업 일정이 등록되면 여기에 표시됩니다.</div>`}<div class="quote-disclaimer">진행 내용은 조회 전용입니다. 변경이나 문의는 디자인 담당자에게 연락해주세요.</div></aside></div></section>`;
  }
  const steps = r.ai?.steps || [];
  return `<section class="page">${head("REQUEST DETAIL", r.title, `${r.id}　·　${esc(r.brand)}　·　${dateLabel(r.created)} 접수`, `<button class="btn" data-go="requests">← 요청 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">요청 내용</div><h2 class="detail-title">${esc(r.title)}</h2><div class="detail-copy">${esc(r.details || "요청 상세 내용이 없습니다.")}</div></div><div class="detail-section"><div class="section-label">요청 정보</div><div class="info-grid"><div><div class="info-label">요청 유형</div><div class="info-value">${esc(r.type)}</div></div><div><div class="info-label">요청자</div><div class="info-value">${esc(r.requester)}</div></div><div><div class="info-label">브랜드 / 매장</div><div class="info-value">${esc(r.brand)}</div></div><div><div class="info-label">희망 완료일</div><div class="info-value">${dateLabel(r.deadline)}</div></div><div><div class="info-label">제작물</div><div class="info-value">${esc(r.product || "미정")}</div></div><div><div class="info-label">수량</div><div class="info-value">${esc(r.quantity || "미정")}</div></div><div><div class="info-label">사용 장소</div><div class="info-value">${esc(r.use || "미정")}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(r.status)}</div></div></div></div><div class="detail-section"><div class="section-label">다음 단계</div><div class="checklist"><label class="check-row"><input type="checkbox" ${r.status !== "접수" ? "checked" : ""} /> 요청 내용 확인</label><label class="check-row"><input type="checkbox" ${["분석 완료", "작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 분석 제안 검토</label><label class="check-row"><input type="checkbox" ${["작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 작업 목록 생성</label></div></div></div><aside class="panel"><div class="ai-box"><div class="ai-heading"><div><strong>AI 분석 제안</strong><div class="ai-caption">AI 연결 전입니다. 제안을 직접 입력할 수 있습니다.</div></div><span class="badge purple">제안</span></div><div class="field"><label>요청 요약</label><textarea class="editable" id="ai-summary" rows="3">${esc(r.ai?.summary || "요청 내용을 확인한 뒤 요약을 작성해주세요.")}</textarea></div><div class="field" style="margin-top:12px"><label>추가 확인이 필요한 정보</label><textarea class="editable" id="ai-missing" rows="3">${esc((r.ai?.missing || []).join("\n"))}</textarea></div><div class="section-label" style="margin:16px 0 7px">작업 단계와 예상 시간 (분)</div><div id="steps-editor">${steps.map((s, i) => `<div class="step-edit"><input data-step-name="${i}" value="${esc(s.name)}" aria-label="작업 단계명" /><input data-step-minutes="${i}" type="number" min="0" value="${Number(s.minutes) || 0}" aria-label="예상 시간(분)" /><button class="remove-step" data-remove-step="${i}" aria-label="단계 삭제">×</button></div>`).join("")}</div><button class="btn small" style="margin-top:8px" id="add-step">＋ 단계 추가</button><div class="ai-actions"><button class="btn small" id="save-analysis">제안 저장</button><button class="btn primary small" id="approve-analysis">제안 승인 및 작업 생성</button></div></div><div class="detail-section"><div class="section-label">상태 변경</div><select class="select" id="request-status" style="width:100%">${["접수", "검토 중", "정보 요청", "분석 완료", "시안 확인", "수정 요청", "디자인 승인", "작업 진행", "완료", "보류", "취소"].map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></aside></div></section>`;
}

function requestFilesPanel(request) {
  if (!request) return "";
  const files = db.files.filter(file => file.request_id === request.id).sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)));
  const isDesigner = currentProfile?.role === "designer";
  const kinds = isDesigner ? [["request_attachment", "요청 참고자료"], ["draft", "시안"], ["final", "최종 파일"]] : [["request_attachment", "요청 참고자료"]];
  return `<div class="panel request-files-panel"><div class="panel-head"><div><div class="panel-title">요청 파일과 시안</div><div class="panel-sub">비공개 파일로 보관되며 요청 권한이 있는 사람만 열 수 있습니다.</div></div></div>${files.length ? `<div class="attached-file-list">${files.map(file => { const review = db.reviews.find(item => item.id === file.review_id); return `<div class="attached-file"><div><strong>${esc(file.file_name)}</strong><span>${file.kind === "request_attachment" ? "요청 참고자료" : file.kind === "draft" ? `시안 ${file.version || ""}` : "최종 파일"}${review ? ` · ${review.status === "pending" ? "회신 대기" : review.status === "approved" ? "승인" : review.status === "revision_requested" ? "수정 요청" : "새 시안 등록됨"}` : ""}${file.description ? ` · ${esc(file.description)}` : ""}</span></div><button class="btn small" data-file-download="${file.id}">다운로드</button></div>`; }).join("")}</div>` : `<div class="empty">아직 등록된 파일이 없습니다.</div>`}${currentProfile?.role === "designer" ? `<div class="share-link-area">${reviewShareLink ? `<label>요청자 공유 링크</label><div class="share-link-row"><input id="review-share-url" readonly value="${esc(reviewShareLink)}"/><button class="btn small" id="copy-review-link">링크 복사</button></div>` : ""}<button class="btn ${files.some(file => file.kind === "draft" && !file.review_id) ? "primary" : ""}" id="create-review-link" ${files.some(file => file.kind === "draft" && !file.review_id) ? "" : "disabled"}>시안 검토 링크 만들기</button><div class="helper">먼저 시안 파일을 올린 뒤 링크를 만들어 요청자에게 전달하세요. 요청자는 링크에서 승인 또는 수정 요청을 할 수 있습니다.</div></div>` : ""}<form id="detail-file-form" class="detail-file-form"><div class="field"><label for="detail-file-kind">파일 종류</label><select id="detail-file-kind">${kinds.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select></div><div class="field"><label for="detail-file-input">파일 선택</label><input id="detail-file-input" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd" /><div class="helper">이미지·PDF·AI·PSD, 파일당 최대 20MB</div></div><div class="field"><label for="detail-file-description">설명 (선택)</label><input id="detail-file-description" maxlength="300" placeholder="예: 문구 수정한 2차 시안" /></div><button class="btn primary" type="submit">파일 올리기</button></form></div>`;
}

function reviewDashboardPanel() {
  const reviews = [...(db.reviews || [])].sort((a,b) => {
    const priority = item => item.status === "revision_requested" || item.status === "approved" ? 0 : 1;
    return priority(a) - priority(b) || String(b.responded_at || b.created_at).localeCompare(String(a.responded_at || a.created_at));
  }).slice(0, 6);
  return `<div class="panel review-inbox"><div class="panel-head"><div><div class="panel-title">시안 승인 · 수정 요청</div><div class="panel-sub">요청자가 공유 링크에서 남긴 최신 회신을 먼저 확인하세요.</div></div><span class="badge blue">${reviews.filter(item => item.status === "revision_requested").length}건 수정 요청</span></div>${reviews.length ? reviews.map(item => { const request = db.requests.find(r => r.id === item.request_id); const label = item.status === "approved" ? "승인" : item.status === "revision_requested" ? "수정 요청" : item.status === "superseded" ? "새 시안 등록됨" : "회신 대기"; return `<button class="review-inbox-row" data-review-request="${esc(item.request_id)}"><span class="review-inbox-status ${item.status}">${label}</span><strong>${esc(request?.title || item.request_id)} · 시안 ${item.version}차</strong><span>${esc(item.feedback || (item.status === "pending" ? "요청자 확인을 기다리고 있어요." : "요청 상세에서 다음 작업을 확인하세요."))}</span><small>${new Date(item.responded_at || item.created_at).toLocaleString("ko-KR")}</small></button>`; }).join("") : `<div class="empty">아직 시안 회신이 없습니다.</div>`}</div>`;
}

function publicReviewPage() {
  if (publicReviewError) return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand-mark">D</div><h1>시안 링크를 열 수 없습니다</h1><p>${esc(publicReviewError)}</p></div></section>`;
  if (!publicReviewData) return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand-mark">D</div><h1>시안을 불러오는 중입니다</h1><p>잠시만 기다려주세요.</p></div></section>`;
  const { request, review, files } = publicReviewData;
  const responded = review.status !== "pending";
  return `<section class="review-public-page"><div class="panel review-public-card"><div class="brand"><span class="brand-mark">D</span><span class="brand-name">Design Flow</span></div><div class="eyebrow">DESIGN REVIEW · ${review.version}차 시안</div><h1>${esc(request.title)}</h1><p class="subhead">${esc(request.brand)}${request.store ? ` · ${esc(request.store)}` : ""} · 요청자 ${esc(request.requester)}</p><div class="review-request-copy"><strong>요청 내용</strong><p>${esc(request.details || request.purpose || "요청 내용을 확인해주세요.")}</p></div><div class="review-assets">${files.map(file => `<article class="review-asset">${file.mime_type.startsWith("image/") ? `<a href="${esc(file.preview_url)}" target="_blank" rel="noopener"><img src="${esc(file.preview_url)}" alt="시안 ${review.version}차" /></a>` : `<div class="review-file-icon">PDF</div>`}<div class="review-asset-info"><strong>${esc(file.file_name)}</strong>${file.description ? `<span>${esc(file.description)}</span>` : ""}<a class="btn small" href="${esc(file.download_url)}">시안 다운로드</a></div></article>`).join("")}</div>${responded ? `<div class="review-response-done"><strong>${review.status === "approved" ? "시안을 승인하셨습니다" : review.status === "superseded" ? "새 시안이 등록되어 이 링크는 이전 버전입니다" : "수정 요청을 전달했습니다"}</strong>${review.feedback ? `<p>${esc(review.feedback)}</p>` : ""}<span>디자인 담당자가 회신을 확인합니다.</span></div>` : `<div class="review-response-form"><label for="review-feedback">수정 의견 (수정 요청 시 필수)</label><textarea id="review-feedback" rows="4" maxlength="2000" placeholder="수정이 필요한 부분을 구체적으로 적어주세요."></textarea><div class="review-response-error" id="review-response-error"></div><div class="review-response-actions"><button class="btn" id="request-revision">수정 요청</button><button class="btn primary" id="approve-design">시안 승인</button></div></div>`}<p class="review-public-foot">시안 검토 링크는 파일을 볼 수 있는 권한이 있는 공유 링크입니다. 링크를 받은 분만 열어주세요.</p></div></section>`;
}

const typeOptions = ["신규 제작", "수정 요청", "재주문", "상담·기획"];
function formPage() {
  const isReview = formStep === 2;
  const attachmentPicker = `<div class="field full file-picker"><label for="request-attachments">요청 참고 파일</label><input id="request-attachments" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.psd" /><div class="helper">이미지, PDF, AI, PSD 파일을 첨부할 수 있어요. 파일당 최대 20MB, 요청당 최대 10개입니다.</div><div id="request-attachment-names" class="file-name-list">${(form.attachments || []).map(file => esc(file.name)).join(" · ")}</div></div>`;
  const attachmentReview = isReview && form.attachments?.length ? `<div class="review-row"><span>첨부 파일</span><span>${form.attachments.map(file => esc(file.name)).join("<br>")}</span></div>` : "";
  const stepsHTML = `<div class="steps-indicator">${[0,1,2].map(i => `<div class="step-seg ${i <= formStep ? "done" : ""}"></div>`).join("")}</div>`;
  let inside = "";
  if (formStep === 0) inside = `<h2 class="form-step-title">어떤 디자인이 필요하신가요?</h2><p class="form-step-desc">요청 유형에 맞춰 필요한 내용만 여쭤볼게요.</p><div class="choice-grid">${typeOptions.map(t => `<button class="choice ${form.type === t ? "selected" : ""}" data-type="${t}"><span class="choice-mark">✓</span><span>${t}</span></button>`).join("")}</div><div class="field-grid" style="margin-top:20px"><div class="field"><label>브랜드 <span class="required">*</span></label><select id="f-brand"><option value="">선택해주세요</option>${["미카도스시", "탄광맥주", "goc커피", "코타코", "우동담아", "기타"].map(x => `<option ${form.brand === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>매장명</label><input id="f-store" value="${esc(form.store || "")}" placeholder="예: 강남점" /></div><div class="field"><label>요청자 이름 <span class="required">*</span></label><input id="f-requester" value="${esc(form.requester || "")}" placeholder="이름을 입력해주세요" /></div><div class="field"><label>연락처</label><input id="f-contact" value="${esc(form.contact || "")}" placeholder="연락 가능한 번호 (선택)" /></div></div>`;
  else if (formStep === 1) inside = `<h2 class="form-step-title">요청 내용을 알려주세요</h2><p class="form-step-desc">정확히 모르시는 항목은 비워두거나 ‘미정’이라고 적어도 괜찮아요.</p><div class="field-grid"><div class="field"><label>요청 제목 <span class="required">*</span></label><input id="f-title" value="${esc(form.title || "")}" placeholder="예: 봄 신메뉴 포스터 제작" /></div><div class="field"><label>희망 완료일</label><input id="f-deadline" type="date" value="${esc(form.deadline || "")}" /></div>${conditionalFields()}<div class="field full"><label>요청 목적 <span class="required">*</span></label><input id="f-purpose" value="${esc(form.purpose || "")}" placeholder="이 디자인이 필요한 이유를 알려주세요" /></div><div class="field full"><label>상세 내용 <span class="required">*</span></label><textarea id="f-details" placeholder="전달하고 싶은 내용이나 조건을 적어주세요">${esc(form.details || "")}</textarea></div><div class="field full"><label>참고 자료 링크</label><input id="f-reference" value="${esc(form.reference || "")}" placeholder="이미지나 문서 링크 (선택)" /><div class="helper">자료 파일은 위의 ‘요청 참고 파일’에서 함께 첨부할 수 있습니다. 제출 내용은 담당자에게 공유됩니다.</div></div></div>`;
  else inside = `<h2 class="form-step-title">입력 내용을 확인해주세요</h2><p class="form-step-desc">제출하면 디자인 담당자가 내용을 확인합니다. 희망 완료일은 확정 일정이 아닙니다.</p><div class="review-list">${[["요청 유형",form.type],["브랜드",form.brand],["매장명",form.store],["요청자",form.requester],["제목",form.title],["희망 완료일",form.deadline ? dateLabel(form.deadline) : "미정"],["제작물",form.product],["사용 장소",form.use],["수량",form.quantity],["요청 목적",form.purpose],["상세 내용",form.details],["참고 링크",form.reference]].filter(row => row[1]).map(([a,b]) => `<div class="review-row"><span>${a}</span><span>${esc(b)}</span></div>`).join("")}</div>`;
  return `<section class="page"><div class="form-shell">${head("REQUEST PORTAL", "디자인 요청 접수", "필요한 내용을 차근차근 알려주세요. 보통 2분 정도 걸려요.")}<div class="panel form-card">${stepsHTML}${inside}${formStep === 1 ? attachmentPicker : ""}${attachmentReview}<div class="form-error" id="form-error"></div><div class="form-footer">${formStep > 0 ? `<button class="btn" id="form-back">← 이전</button>` : `<span></span>`}<button class="btn primary" id="form-next">${isReview ? "요청 제출하기　→" : "다음　→"}</button></div></div><div class="footer-note">제출한 요청은 디자인 담당자에게 공유됩니다.</div></div></section>`;
}
function conditionalFields() {
  const type = form.type;
  if (type === "신규 제작") return `<div class="field"><label>필요한 제작물</label><select id="f-product">${["선택해주세요", "포스터", "현수막", "배너", "메뉴판", "POP / 안내물", "SNS 이미지", "전단지", "기타", "잘 모르겠어요"].map(v => `<option ${form.product === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>사용 장소</label><select id="f-use">${["선택해주세요", "매장 입구", "매장 실내", "테이블", "실외", "온라인", "기타", "잘 모르겠어요"].map(v => `<option ${form.use === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>수량</label><input id="f-quantity" value="${esc(form.quantity || "")}" placeholder="예: 2장, 10부, 미정" /></div>`;
  if (type === "수정 요청") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 메뉴판, 포스터" /></div><div class="field"><label>수정할 부분</label><input id="f-use" value="${esc(form.use || "")}" placeholder="문구, 가격, 날짜, 이미지 등" /></div>`;
  if (type === "재주문") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 테이블 메뉴판" /></div><div class="field"><label>수량</label><input id="f-quantity" value="${esc(form.quantity || "")}" placeholder="필요한 수량" /></div><div class="field full"><label>변경 사항</label><input id="f-use" value="${esc(form.use || "")}" placeholder="기존과 동일하면 ‘동일’이라고 적어주세요" /></div>`;
  return `<div class="field full"><label>필요한 도움</label><input id="f-use" value="${esc(form.use || "")}" placeholder="예: 어떤 제작물이 적합할지 추천이 필요해요" /></div>`;
}
function successPage() {
  const returnRoute = currentProfile?.role === "sv" ? "requests" : "dashboard";
  const returnLabel = currentProfile?.role === "sv" ? "요청 진행상황 보기" : "워크스페이스로 돌아가기";
  return `<section class="page"><div class="form-shell"><div class="panel success-state"><div class="success-icon">✓</div><h2>요청이 접수되었어요</h2><p>디자인 담당자가 요청 내용을 확인할 예정입니다.<br>희망 완료일은 검토 후 안내드리며, 확정된 일정은 아닙니다.</p>${fileUploadError ? `<div class="workspace-alert">${esc(fileUploadError)}</div>` : ""}<div class="request-number">${esc(selectedRequest || "DF-00000")}</div><div><button class="btn primary" data-go="${returnRoute}">${returnLabel}</button></div></div></div></section>`;
}

function tasksPage() {
  let rows = [...db.tasks].sort((a,b) => a.due.localeCompare(b.due));
  if (taskFilter !== "전체") rows = rows.filter(t => t.status === taskFilter);
  const statuses = ["대기", "진행 중", "검토", "완료", "보류"];
  return `<section class="page">${head("TASKS", "작업 관리", `요청에 연결된 작업 ${db.tasks.length}건을 관리합니다.`, `<button class="btn" data-go="requests">요청에서 작업 만들기 →</button>`)}<div class="toolbar"><select class="select" id="task-filter">${["전체", ...statuses].map(v => `<option ${taskFilter === v ? "selected" : ""}>${v}</option>`).join("")}</select><span class="subhead">상태를 목록에서 바로 변경할 수 있어요.</span></div><div class="panel task-table"><div class="task-item"><div>작업 / 단계</div><div>브랜드</div><div>마감일</div><div>예상 시간</div><div>상태</div></div>${rows.map(t => `<div class="task-item" data-task="${t.id}"><div><div class="row-title">${esc(t.name)}</div><div class="task-mobile-meta">${esc(t.brand)} · 마감 ${dateLabel(t.due)}</div><div class="row-meta">${esc(t.step)}　·　${esc(t.id)}</div></div><div>${esc(t.brand)}</div><div>${dateLabel(t.due)}</div><div>${Number(t.estimate) || 0}분</div><div><select class="select-status" data-task-status="${t.id}">${statuses.map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>`).join("") || `<div class="empty">표시할 작업이 없습니다.</div>`}</div></section>`;
}
function taskDetail() {
  const t = db.tasks.find(x => x.id === selectedTask) || db.tasks[0];
  if (!t) return `<section class="page">${head("TASK", "작업이 없습니다", "요청을 승인하면 작업을 생성할 수 있습니다.", `<button class="btn" data-go="requests">요청 확인</button>`)}</section>`;
  const logs = db.timeLogs.filter(l => l.taskId === t.id);
  return `<section class="page">${head("TASK DETAIL", t.name, `${t.id}　·　${t.brand}　·　${t.step}`, `<button class="btn" data-go="tasks">← 작업 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">작업 정보</div><div class="info-grid"><div><div class="info-label">연결 요청</div><div class="info-value">${esc(t.requestId)}</div></div><div><div class="info-label">상태</div><div class="info-value">${badge(t.status)}</div></div><div><div class="info-label">우선순위</div><div class="info-value">${badge(t.priority, priorityClass(t.priority))}</div></div><div><div class="info-label">마감일</div><div class="info-value">${dateLabel(t.due)}</div></div><div><div class="info-label">예상 시간</div><div class="info-value">${Number(t.estimate) || 0}분</div></div><div><div class="info-label">실제 기록</div><div class="info-value">${Number(t.actual) || 0}분</div></div></div></div><div class="detail-section"><div class="section-label">상태 변경</div><select class="select" id="task-detail-status">${["대기", "진행 중", "검토", "완료", "보류"].map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="detail-section"><div class="section-label">시간 기록</div><div class="toolbar"><input class="select" type="number" min="1" id="time-minutes" placeholder="분" style="width:100px"/><input class="select" id="time-note" placeholder="메모 (선택)" style="flex:1"/><button class="btn primary small" id="add-time">기록 추가</button></div>${logs.length ? logs.map(l => `<div class="request-row"><div class="row-title">${Number(l.minutes)}분</div><div class="row-meta">${esc(l.note || "작업 시간")}</div><span class="row-date">${dateLabel(l.date)}</span></div>`).join("") : `<div class="empty">아직 기록된 시간이 없습니다.</div>`}</div></div><div class="panel"><div class="panel-title">작업 체크리스트</div><div class="panel-sub">완료한 단계를 표시해보세요.</div><div class="checklist" style="margin-top:16px"><label class="check-row"><input type="checkbox" ${t.status !== "대기" ? "checked" : ""}/> 자료 및 요청 확인</label><label class="check-row"><input type="checkbox" ${["검토", "완료"].includes(t.status) ? "checked" : ""}/> 디자인 작업</label><label class="check-row"><input type="checkbox" ${t.status === "완료" ? "checked" : ""}/> 최종 확인 및 전달</label></div></div></div></section>`;
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
  let content = route === "public-review" ? publicReviewPage() : route === "dashboard" ? dashboard() : route === "requests" ? requestsPage() : route === "request-detail" ? requestDetail() : route === "request-form" ? formPage() : route === "request-success" ? successPage() : route === "tasks" ? tasksPage() : route === "task-detail" ? taskDetail() : route === "calendar" ? calendarPage() : route === "prices" ? pricesPage() : route === "quote" ? quotePage() : dashboard();
  if (route === "request-detail" && currentProfile) {
    const request = db.requests.find(item => item.id === selectedRequest);
    content = content.replace("</section>", `${requestFilesPanel(request)}</section>`);
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
  } catch (error) {
    bootError = `${error.message}. Supabase의 schema.sql 적용 여부를 확인해주세요.`;
  }
  render();
}
function setFormFields() {
  const mapping = { "f-brand":"brand", "f-store":"store", "f-requester":"requester", "f-contact":"contact", "f-title":"title", "f-deadline":"deadline", "f-purpose":"purpose", "f-details":"details", "f-reference":"reference", "f-quantity":"quantity", "f-product":"product", "f-use":"use" };
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
    if ((form.attachments || []).length > 10) return error.textContent = "첨부 파일은 요청당 최대 10개까지 가능합니다.", false;
    if ((form.attachments || []).some(file => !getAllowedFileType(file) || file.size > 20 * 1024 * 1024)) return error.textContent = "지원되는 파일 형식인지 확인하고, 파일당 20MB 이하로 첨부해주세요.", false;
  }
  return true;
}
function bindEvents() {
  document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => { if (el.dataset.go === "request-form") { form = {}; formStep = 0; } if (el.dataset.go === "login") route = "login"; go(el.dataset.go); }));
  document.querySelectorAll("[data-request]").forEach(el => el.addEventListener("click", () => { reviewShareLink = ""; go("request-detail", el.dataset.request); }));
  document.querySelectorAll("[data-review-request]").forEach(el => el.addEventListener("click", () => { reviewShareLink = ""; go("request-detail", el.dataset.reviewRequest); }));
  document.querySelectorAll("[data-task]:not([data-task-status])").forEach(el => el.addEventListener("click", e => { if (e.target.closest("select")) return; go("task-detail", el.dataset.task); }));
  const menu = document.getElementById("menu-toggle"); if (menu) menu.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  const logout = document.getElementById("sign-out"); if (logout) logout.addEventListener("click", async () => { await DesignFlowData.signOut(); currentUser = null; currentProfile = null; db = { requests: [], tasks: [], timeLogs: [], prices: [], files: [], reviews: [] }; route = "login"; render(); });
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
  document.querySelectorAll("[data-task-status]").forEach(el => el.addEventListener("change", async e => { const t = db.tasks.find(x => x.id === e.target.dataset.taskStatus); if (t) { const previous = t.status; t.status = e.target.value; try { await saveData(); const request = db.requests.find(r => r.id === t.requestId); notify(request?.status === "완료" ? "연결된 모든 작업이 완료되어 요청도 완료 처리됐어요." : "작업 상태와 요청 상태를 함께 저장했어요."); } catch { t.status = previous; } render(); } }));
  document.querySelectorAll("[data-type]").forEach(el => el.addEventListener("click", () => { form.type = el.dataset.type; render(); }));
  const back = document.getElementById("form-back"); if (back) back.addEventListener("click", () => { setFormFields(); formStep--; render(); });
  const next = document.getElementById("form-next"); if (next) next.addEventListener("click", async () => { if (!validateStep()) return; if (formStep < 2) { formStep++; render(); } else await submitRequest(); });
  const fileForm = document.getElementById("detail-file-form"); if (fileForm) fileForm.addEventListener("submit", uploadDetailFiles);
  document.querySelectorAll("[data-file-download]").forEach(el => el.addEventListener("click", async () => { try { const result = await DesignFlowData.backend("design-review", { action: "file_link", file_id: el.dataset.fileDownload }); window.open(result.url, "_blank", "noopener"); } catch (error) { notify(`파일을 열지 못했어요: ${error.message}`); } }));
  const createReviewLink = document.getElementById("create-review-link"); if (createReviewLink) createReviewLink.addEventListener("click", async () => { createReviewLink.disabled = true; try { const result = await DesignFlowData.backend("design-review", { action: "create_link", request_id: selectedRequest }); reviewShareLink = result.url; db.files = await DesignFlowData.select("design_files", {}, "created_at.desc"); db.reviews = await DesignFlowData.select("design_reviews", {}, "created_at.desc"); notify(`${result.version}차 시안 검토 링크를 만들었어요.`); render(); } catch (error) { createReviewLink.disabled = false; notify(`링크를 만들지 못했어요: ${error.message}`); } });
  const copyReviewLink = document.getElementById("copy-review-link"); if (copyReviewLink) copyReviewLink.addEventListener("click", async () => { try { await navigator.clipboard.writeText(reviewShareLink); notify("요청자 공유 링크를 복사했어요."); } catch { notify("링크를 복사하지 못했습니다."); } });
  const requestAttachments = document.getElementById("request-attachments"); if (requestAttachments) requestAttachments.addEventListener("change", e => { form.attachments = [...e.target.files]; const names = document.getElementById("request-attachment-names"); if (names) names.textContent = form.attachments.map(file => file.name).join(" · "); });
  const approveDesign = document.getElementById("approve-design"); if (approveDesign) approveDesign.addEventListener("click", () => sendReviewResponse("approved"));
  const requestRevision = document.getElementById("request-revision"); if (requestRevision) requestRevision.addEventListener("click", () => sendReviewResponse("revision_requested"));
  const addStep = document.getElementById("add-step"); if (addStep) addStep.addEventListener("click", async () => { const r = db.requests.find(x => x.id === selectedRequest); await saveAnalysis(false); r.ai.steps.push({ name: "새 작업 단계", minutes: 30 }); await saveData(); render(); });
  document.querySelectorAll("[data-remove-step]").forEach(el => el.addEventListener("click", async () => { const r = db.requests.find(x => x.id === selectedRequest); await saveAnalysis(false); r.ai.steps.splice(Number(el.dataset.removeStep), 1); await saveData(); render(); }));
  const save = document.getElementById("save-analysis"); if (save) save.addEventListener("click", async () => { await saveAnalysis(false); notify("분석 제안을 저장했어요."); });
  const approve = document.getElementById("approve-analysis"); if (approve) approve.addEventListener("click", approveRequest);
  const rs = document.getElementById("request-status"); if (rs) rs.addEventListener("change", async e => { const r = db.requests.find(x => x.id === selectedRequest); if (db.tasks.some(t => t.requestId === r?.id)) { notify("작업이 생성된 요청은 작업관리의 진행 상태를 기준으로 자동 갱신됩니다."); render(); return; } const previous = r.status; r.status = e.target.value; try { await saveData(); notify("요청 상태를 변경했어요."); } catch { r.status = previous; } render(); });
  const tds = document.getElementById("task-detail-status"); if (tds) tds.addEventListener("change", async e => { const t = db.tasks.find(x => x.id === selectedTask); const previous = t.status; t.status = e.target.value; try { await saveData(); const request = db.requests.find(r => r.id === t.requestId); notify(request?.status === "완료" ? "연결된 모든 작업이 완료되어 요청도 완료 처리됐어요." : "작업 상태와 요청 상태를 함께 저장했어요."); } catch { t.status = previous; } render(); });
  const addTime = document.getElementById("add-time"); if (addTime) addTime.addEventListener("click", logTime);
  document.querySelectorAll(".check-row input").forEach(el => el.addEventListener("change", async () => { if (selectedTask) { const t = db.tasks.find(x => x.id === selectedTask); if (t && el.checked) t.status = "진행 중"; await saveData(); } }));
  bindQuoteEvents();
  bindPriceEvents();
}
async function submitRequest() {
  const id = `DF-${crypto.randomUUID()}`;
  const request = { id, title: form.title, type: form.type, brand: form.brand, store: form.store || null, requester: form.requester, contact: form.contact || null, created: isoDay(), deadline: form.deadline || null, status: "접수", priority: "보통", purpose: form.purpose, details: form.details, product: form.product || "", quantity: form.quantity || "", use: form.use || "", reference: form.reference || null, ai: { summary: "", missing: [], steps: [] } };
  try {
    const publicFields = (({ id, title, type, brand, store, requester, contact, deadline, purpose, details, product, quantity, use, reference }) => ({ id, title, type, brand, store, requester, contact, deadline, purpose, details, product, quantity, use, reference }))(request);
    await DesignFlowData.insert("requests", currentProfile ? rowRequest(request) : publicFields, !currentProfile);
    fileUploadError = "";
    if (form.attachments?.length) {
      try { await uploadRequestAttachments(request); }
      catch (error) { fileUploadError = `요청은 접수됐지만 첨부 파일 일부를 올리지 못했습니다. 요청 상세에서 다시 올려주세요. (${error.message})`; }
    }
    if (currentProfile) { db.requests.unshift(request); if (currentProfile.role === "designer") savedRequestRows.set(id, JSON.stringify(rowRequest(request))); }
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
  if (decision === "revision_requested" && !feedback) { if (error) error.textContent = "수정이 필요한 내용을 적어주세요."; return; }
  try {
    await DesignFlowData.backend("design-review", { action: "respond", token: reviewToken, decision, feedback }, true);
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
  r.ai.steps.forEach((s, i) => db.tasks.push({ id: `TS-${String(Date.now() + i).slice(-5)}`, requestId: r.id, name: r.title, step: s.name, brand: r.brand, due: r.deadline || isoDay(7), status: "대기", priority: r.priority, estimate: s.minutes, actual: 0 }));
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
  const product = document.getElementById("quote-product"); if (product) product.addEventListener("change", e => { quoteSelection.product = e.target.value; quoteSelection.size = ""; quoteSelection.material = ""; render(); });
  const size = document.getElementById("quote-size"); if (size) size.addEventListener("change", e => { quoteSelection.size = e.target.value; quoteSelection.material = ""; render(); });
  const material = document.getElementById("quote-material"); if (material) material.addEventListener("change", e => { quoteSelection.material = e.target.value; render(); });
  const delivery = document.getElementById("quote-delivery-area"); if (delivery) delivery.addEventListener("change", e => { quoteSelection.deliveryArea = e.target.value; render(); });
  const minimumForQuote = () => { const p = db.prices.find(x => x.product === quoteSelection.product && x.size === quoteSelection.size && x.material === quoteSelection.material); return Number(p?.minimum_quantity) || 1; };
  const quantity = document.getElementById("quote-quantity"); if (quantity) quantity.addEventListener("change", e => { quoteSelection.quantity = Math.max(minimumForQuote(), Number(e.target.value) || minimumForQuote()); render(); });
  document.querySelectorAll("[data-qty]").forEach(button => button.addEventListener("click", () => { quoteSelection.quantity = Math.max(minimumForQuote(), Number(quoteSelection.quantity) + Number(button.dataset.qty)); render(); }));
  const copy = document.getElementById("copy-quote"); if (copy) copy.addEventListener("click", async () => {
    const p = db.prices.find(x => x.product === quoteSelection.product && x.size === quoteSelection.size && x.material === quoteSelection.material && x.is_active);
    if (!p) return;
    const qty = Math.max(Number(p.minimum_quantity) || 1, Number(quoteSelection.quantity) || 1);
    const fee = quoteSelection.deliveryArea === "제주도" ? Number(p.jeju_shipping_krw) || 0 : 0;
    const total = Number(p.unit_price_krw) * qty + fee;
    try { await navigator.clipboard.writeText(`${p.product} ${p.size} ${p.material} ${qty}개${fee ? `, 제주 추가 배송비 ₩${fee.toLocaleString("ko-KR")}` : ""}: ₩${total.toLocaleString("ko-KR")} (부가세·기본 배송 포함)`); notify("견적 내용을 복사했어요."); }
    catch { notify("이 브라우저에서는 복사할 수 없습니다."); }
  });
}
function bindPriceEvents() {
  const cancel = document.getElementById("cancel-price-edit"); if (cancel) cancel.addEventListener("click", () => { priceEditId = null; render(); });
  const formEl = document.getElementById("price-form"); if (formEl) formEl.addEventListener("submit", async e => {
    e.preventDefault(); const row = { product: document.getElementById("price-product").value.trim(), size: document.getElementById("price-size").value.trim(), material: document.getElementById("price-material").value.trim(), unit_price_krw: Number(document.getElementById("price-unit").value), minimum_quantity: Number(document.getElementById("price-minimum").value), jeju_shipping_krw: Number(document.getElementById("price-jeju").value), is_active: editingPriceActive() };
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

window.addEventListener("hashchange", () => { const next = location.hash.slice(1); if (["dashboard", "requests", "tasks", "calendar", "quote", "prices"].includes(next)) go(next); });
render();
initializeApp();
