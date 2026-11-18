const STORE_KEY = "design-flow-demo-v1";
const today = new Date();
const isoDay = (offset = 0) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const initialData = {
  requests: [
    { id: "DF-26041", title: "겨울 신메뉴 포스터 디자인", type: "신규 제작", brand: "미카도스시", requester: "김민지", created: isoDay(-1), deadline: isoDay(3), status: "검토 중", priority: "높음", purpose: "겨울 시즌 신메뉴 홍보", details: "매장 입구와 테이블에 비치할 겨울 신메뉴 포스터가 필요합니다. 따뜻하고 계절감 있는 분위기로 부탁드립니다.", product: "포스터", quantity: "매장별 2장", use: "매장 입구, 테이블", ai: { summary: "겨울 신메뉴를 매장 고객에게 소개하는 포스터 제작 요청입니다.", missing: ["신메뉴 사진", "가격 및 행사 기간"], steps: [{ name: "요청 내용 및 자료 확인", minutes: 30 }, { name: "디자인 방향 및 레이아웃", minutes: 60 }, { name: "포스터 디자인 제작", minutes: 120 }, { name: "검토 및 최종 파일 준비", minutes: 45 }] } },
    { id: "DF-26040", title: "가맹점 오픈 안내 현수막 수정", type: "수정 요청", brand: "탄광맥주", requester: "박준호", created: isoDay(-2), deadline: isoDay(1), status: "정보 요청", priority: "긴급", purpose: "신규 매장 오픈 홍보", details: "기존 오픈 현수막에서 매장 주소와 오픈 날짜를 변경하고 싶습니다.", product: "현수막", quantity: "1장", use: "매장 외부", ai: { summary: "기존 오픈 현수막의 주소와 날짜를 변경하는 수정 요청입니다.", missing: ["변경할 주소", "확정된 오픈 날짜"], steps: [{ name: "기존 파일 및 변경 정보 확인", minutes: 20 }, { name: "문구와 정보 수정", minutes: 35 }, { name: "최종 확인 및 출력 파일 준비", minutes: 20 }] } },
    { id: "DF-26039", title: "테이블 메뉴판 추가 인쇄", type: "재주문", brand: "goc커피", requester: "이서연", created: isoDay(-3), deadline: isoDay(5), status: "접수", priority: "보통", purpose: "매장 메뉴판 추가 비치", details: "지난번 제작한 테이블 메뉴판과 같은 디자인으로 추가 주문합니다.", product: "메뉴판", quantity: "20부", use: "매장 테이블", ai: { summary: "기존 테이블 메뉴판 디자인을 동일하게 추가 제작하는 요청입니다.", missing: ["기존 제작 파일 확인", "배송 정보"], steps: [{ name: "기존 제작 파일 확인", minutes: 15 }, { name: "수량 및 출력 사양 확인", minutes: 20 }, { name: "인쇄용 파일 전달", minutes: 15 }] } },
    { id: "DF-26038", title: "SNS 이벤트 이미지 상담", type: "상담·기획", brand: "코타코", requester: "최유진", created: isoDay(-4), deadline: isoDay(7), status: "분석 완료", priority: "보통", purpose: "신규 고객 이벤트 홍보", details: "인스타그램에서 사용할 이벤트 이미지 구성이 필요합니다. 어떤 형태가 좋을지 상담하고 싶어요.", product: "SNS 이미지", quantity: "미정", use: "인스타그램", ai: { summary: "인스타그램 이벤트 홍보에 적합한 이미지 방향을 상담하는 요청입니다.", missing: ["이벤트 내용 및 참여 방법", "게시 희망일"], steps: [{ name: "이벤트 목표 및 내용 확인", minutes: 30 }, { name: "콘텐츠 구성 제안", minutes: 45 }, { name: "이미지 제작 범위 협의", minutes: 30 }] } }
  ],
  tasks: [
    { id: "TS-118", requestId: "DF-26041", name: "겨울 신메뉴 포스터 디자인", step: "디자인 방향 및 레이아웃", brand: "미카도스시", due: isoDay(1), status: "진행 중", priority: "높음", estimate: 60, actual: 25 },
    { id: "TS-117", requestId: "DF-26040", name: "오픈 현수막 수정", step: "변경 정보 확인", brand: "탄광맥주", due: isoDay(0), status: "대기", priority: "긴급", estimate: 20, actual: 0 },
    { id: "TS-116", requestId: "DF-26036", name: "봄 시즌 메뉴 촬영 안내물", step: "최종 파일 준비", brand: "우동담아", due: isoDay(2), status: "검토", priority: "보통", estimate: 45, actual: 50 },
    { id: "TS-115", requestId: "DF-26035", name: "매장 유리창 프로모션 시트", step: "시안 제작", brand: "미카도스시", due: isoDay(4), status: "진행 중", priority: "보통", estimate: 90, actual: 35 },
    { id: "TS-114", requestId: "DF-26034", name: "브랜드 소개 리플렛 재주문", step: "인쇄 파일 확인", brand: "탄광맥주", due: isoDay(-1), status: "대기", priority: "낮음", estimate: 30, actual: 0 }
  ],
  timeLogs: []
};
let db = loadData();
let route = "dashboard";
let selectedRequest = null;
let selectedTask = null;
let form = {};
let formStep = 0;
let requestFilter = "전체";
let searchTerm = "";
let taskFilter = "전체";
let toastTimer;

function loadData() {
  try { const saved = localStorage.getItem(STORE_KEY); if (saved) return JSON.parse(saved); } catch (e) { console.warn("데모 저장 정보를 불러오지 못했습니다.", e); }
  return structuredClone(initialData);
}
function saveData() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { notify("이 브라우저에서는 변경 사항을 저장하지 못했습니다."); } }
function esc(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dateLabel(value) { if (!value) return "미정"; const d = new Date(`${value}T00:00:00`); return `${d.getMonth() + 1}월 ${d.getDate()}일`; }
function dayDiff(value) { if (!value) return 999; return Math.ceil((new Date(`${value}T00:00:00`) - new Date(`${isoDay()}T00:00:00`)) / 86400000); }
function statusClass(status) { return ({ "접수": "blue", "검토 중": "blue", "정보 요청": "amber", "분석 완료": "purple", "작업 진행": "blue", "완료": "green", "보류": "amber", "진행 중": "blue", "검토": "purple", "대기": "", "보류 중": "amber" })[status] || ""; }
function priorityClass(priority) { return ({ "긴급": "red", "높음": "amber", "보통": "blue", "낮음": "" })[priority] || ""; }
function badge(text, cls = statusClass(text)) { return `<span class="badge ${cls}">${esc(text)}</span>`; }
function notify(message) { const old = document.querySelector(".toast"); if (old) old.remove(); const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.remove(), 2600); }
function go(next, data = null) { route = next; if (next === "request-detail") selectedRequest = data; if (next === "task-detail") selectedTask = data; window.scrollTo(0, 0); render(); }

function layout(content) {
  const navItems = [["dashboard", "◫", "대시보드"], ["requests", "▤", "요청 관리"], ["tasks", "☷", "작업 관리"], ["calendar", "▦", "일정"]];
  const current = route === "request-form" || route === "request-success" ? "request-form" : route;
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">D</div><div><div class="brand-name">Design Flow</div><div class="brand-caption">DESIGN WORKSPACE</div></div></div><div class="nav-label">WORKSPACE</div><nav class="nav">${navItems.map(([key, icon, label]) => `<button class="nav-item ${current === key ? "active" : ""}" data-go="${key}"><span class="nav-icon">${icon}</span>${label}</button>`).join("")}<button class="nav-item ${current === "request-form" ? "active" : ""}" data-go="request-form"><span class="nav-icon">＋</span>새 요청 접수</button></nav><div class="sidebar-bottom"><div class="demo-note"><strong>가상 데이터 모드</strong><span>화면 확인을 위한 예시 데이터입니다.<br>실제 회사 정보는 입력하지 마세요.</span></div><div class="user-chip"><div class="avatar">디</div><div><div class="user-name">디자인 담당자</div><div class="user-role">개인 작업 공간</div></div></div></div></aside><main class="main"><header class="topbar"><div class="crumb-wrap"><button class="mobile-menu" id="menu-toggle" aria-label="메뉴 열기">☰</button><div class="crumb">워크스페이스　/　${routeTitle()}</div></div><div class="top-actions"><button class="icon-button" aria-label="알림">♧<span class="dot"></span></button><div class="avatar">디</div></div></header>${content}<div class="footer-note">Design Flow · 개인 디자이너를 위한 디자인 업무 관리</div></main></div>`;
}
function routeTitle() { return ({ dashboard: "대시보드", requests: "요청 관리", "request-detail": "요청 상세", "request-form": "새 요청 접수", "request-success": "접수 완료", tasks: "작업 관리", "task-detail": "작업 상세", calendar: "일정" })[route] || "대시보드"; }
function head(eyebrow, title, desc, action = "") { return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><div class="subhead">${desc}</div></div>${action}</div>`; }

function dashboard() {
  const pending = db.requests.filter(r => ["접수", "검토 중", "정보 요청"].includes(r.status)).length;
  const active = db.tasks.filter(t => t.status === "진행 중").length;
  const overdue = db.tasks.filter(t => dayDiff(t.due) < 0 && t.status !== "완료").length;
  const totalMinutes = db.tasks.reduce((s, t) => s + Number(t.estimate || 0), 0);
  const openReq = [...db.requests].sort((a, b) => a.created < b.created ? 1 : -1).slice(0, 4);
  const todayTasks = [...db.tasks].filter(t => t.status !== "완료").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const done = db.tasks.filter(t => t.status === "완료").length;
  const progress = db.tasks.length ? Math.round(done / db.tasks.length * 100) : 0;
  return `<section class="page">${head(`MONDAY, ${today.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()}`, "좋은 하루예요, 디자이너님 👋", "오늘의 요청과 작업 현황을 확인해보세요.", `<button class="btn primary" data-go="request-form">＋　새 요청 접수</button>`)}<div class="metrics"><div class="metric"><div class="metric-top">검토할 요청 <span class="metric-icon">▤</span></div><div class="metric-value">${pending}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">진행 중 작업 <span class="metric-icon">◷</span></div><div class="metric-value">${active}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">마감 지연 <span class="metric-icon">⚑</span></div><div class="metric-value">${overdue}<span class="metric-change">건</span></div></div><div class="metric"><div class="metric-top">예상 작업 시간 <span class="metric-icon">◴</span></div><div class="metric-value">${Math.floor(totalMinutes / 60)}<span class="metric-change">시간 ${totalMinutes % 60}분</span></div></div></div><div class="dashboard-grid"><div class="panel"><div class="panel-head"><div><div class="panel-title">최근 요청</div><div class="panel-sub">접수된 디자인 요청을 확인해보세요</div></div><button class="text-link" data-go="requests">전체 보기 →</button></div>${openReq.length ? openReq.map(r => `<div class="request-row" data-request="${r.id}"><div><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>${esc(r.brand)}</span><span>·</span><span>${esc(r.requester)}</span><span>·</span>${badge(r.status)}</div></div>${badge(r.priority, priorityClass(r.priority))}<span class="row-date">${dateLabel(r.created)}</span></div>`).join("") : `<div class="empty">아직 접수된 요청이 없어요.</div>`}<div class="progress-wrap"><div class="progress-head"><span>전체 작업 진행률</span><strong>${progress}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div><div class="progress-head" style="margin-top:8px"><span>${done}개 완료</span><span>${db.tasks.length}개 작업</span></div></div></div><div class="panel"><div class="panel-head"><div><div class="panel-title">다가오는 작업</div><div class="panel-sub">마감일이 가까운 순서</div></div><button class="text-link" data-go="tasks">작업 보기 →</button></div><div class="task-list">${todayTasks.map(t => `<div class="task-card" data-task="${t.id}"><div class="task-card-top"><div class="task-name">${esc(t.name)}</div>${badge(t.status)}</div><div class="task-due ${dayDiff(t.due) < 0 ? "late" : ""}">◷　${dayDiff(t.due) < 0 ? `마감 ${Math.abs(dayDiff(t.due))}일 지남` : `마감 ${dateLabel(t.due)}`}　·　${esc(t.brand)}</div></div>`).join("") || `<div class="empty">예정된 작업이 없습니다.</div>`}</div></div></div><div class="footer-note">데모 데이터는 현재 브라우저에 저장됩니다.</div></section>`;
}

function requestsPage() {
  let rows = [...db.requests].sort((a, b) => b.created.localeCompare(a.created));
  if (requestFilter !== "전체") rows = rows.filter(r => r.status === requestFilter);
  if (searchTerm) rows = rows.filter(r => `${r.title} ${r.brand} ${r.requester}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return `<section class="page">${head("REQUESTS", "요청 관리", `총 ${db.requests.length}건의 디자인 요청을 관리합니다.`, `<button class="btn primary" data-go="request-form">＋　새 요청 접수</button>`)}<div class="toolbar"><div class="search"><input id="request-search" placeholder="요청명, 브랜드, 요청자로 검색" value="${esc(searchTerm)}" /></div><select class="select" id="request-filter">${["전체", "접수", "검토 중", "정보 요청", "분석 완료", "작업 진행", "완료", "보류"].map(v => `<option ${requestFilter === v ? "selected" : ""}>${v}</option>`).join("")}</select><button class="btn">필터　⌄</button></div><div class="panel request-list"><div class="list-head"><span>요청 내용</span><span>브랜드 / 요청자</span><span>접수일</span><span>희망 완료일</span><span>상태</span></div>${rows.map(r => `<div class="list-item" data-request="${r.id}"><div><div class="row-title">${esc(r.title)}</div><div class="row-meta"><span>${esc(r.type)}</span>${badge(r.priority, priorityClass(r.priority))}</div><div class="list-mobile-meta">${esc(r.brand)} · ${dateLabel(r.created)}</div></div><div>${esc(r.brand)}<div class="row-meta">${esc(r.requester)}</div></div><div>${dateLabel(r.created)}</div><div>${dateLabel(r.deadline)}</div><div>${badge(r.status)}</div></div>`).join("") || `<div class="empty">조건에 맞는 요청이 없습니다.</div>`}</div></section>`;
}

function requestDetail() {
  const r = db.requests.find(x => x.id === selectedRequest) || db.requests[0];
  if (!r) return `<section class="page">${head("REQUEST", "요청을 찾을 수 없습니다", "요청 목록으로 돌아가 다시 확인해주세요.", `<button class="btn" data-go="requests">← 요청 목록</button>`)}</section>`;
  const steps = r.ai?.steps || [];
  return `<section class="page">${head("REQUEST DETAIL", r.title, `${r.id}　·　${esc(r.brand)}　·　${dateLabel(r.created)} 접수`, `<button class="btn" data-go="requests">← 요청 목록</button>`)}<div class="detail-grid"><div class="panel"><div class="detail-section"><div class="section-label">요청 내용</div><h2 class="detail-title">${esc(r.title)}</h2><div class="detail-copy">${esc(r.details || "요청 상세 내용이 없습니다.")}</div></div><div class="detail-section"><div class="section-label">요청 정보</div><div class="info-grid"><div><div class="info-label">요청 유형</div><div class="info-value">${esc(r.type)}</div></div><div><div class="info-label">요청자</div><div class="info-value">${esc(r.requester)}</div></div><div><div class="info-label">브랜드 / 매장</div><div class="info-value">${esc(r.brand)}</div></div><div><div class="info-label">희망 완료일</div><div class="info-value">${dateLabel(r.deadline)}</div></div><div><div class="info-label">제작물</div><div class="info-value">${esc(r.product || "미정")}</div></div><div><div class="info-label">수량</div><div class="info-value">${esc(r.quantity || "미정")}</div></div><div><div class="info-label">사용 장소</div><div class="info-value">${esc(r.use || "미정")}</div></div><div><div class="info-label">현재 상태</div><div class="info-value">${badge(r.status)}</div></div></div></div><div class="detail-section"><div class="section-label">다음 단계</div><div class="checklist"><label class="check-row"><input type="checkbox" ${r.status !== "접수" ? "checked" : ""} /> 요청 내용 확인</label><label class="check-row"><input type="checkbox" ${["분석 완료", "작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 분석 제안 검토</label><label class="check-row"><input type="checkbox" ${["작업 진행", "완료"].includes(r.status) ? "checked" : ""} /> 작업 목록 생성</label></div></div></div><aside class="panel"><div class="ai-box"><div class="ai-heading"><div><strong>AI 분석 제안</strong><div class="ai-caption">가상 데이터로 생성된 예시입니다</div></div><span class="badge purple">제안</span></div><div class="field"><label>요청 요약</label><textarea class="editable" id="ai-summary" rows="3">${esc(r.ai?.summary || "요청 내용을 확인한 뒤 요약을 작성해주세요.")}</textarea></div><div class="field" style="margin-top:12px"><label>추가 확인이 필요한 정보</label><textarea class="editable" id="ai-missing" rows="3">${esc((r.ai?.missing || []).join("\n"))}</textarea></div><div class="section-label" style="margin:16px 0 7px">작업 단계와 예상 시간 (분)</div><div id="steps-editor">${steps.map((s, i) => `<div class="step-edit"><input data-step-name="${i}" value="${esc(s.name)}" aria-label="작업 단계명" /><input data-step-minutes="${i}" type="number" min="0" value="${Number(s.minutes) || 0}" aria-label="예상 시간(분)" /><button class="remove-step" data-remove-step="${i}" aria-label="단계 삭제">×</button></div>`).join("")}</div><button class="btn small" style="margin-top:8px" id="add-step">＋ 단계 추가</button><div class="ai-actions"><button class="btn small" id="save-analysis">제안 저장</button><button class="btn primary small" id="approve-analysis">제안 승인 및 작업 생성</button></div></div><div class="detail-section"><div class="section-label">상태 변경</div><select class="select" id="request-status" style="width:100%">${["접수", "검토 중", "정보 요청", "분석 완료", "작업 진행", "완료", "보류", "취소"].map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></aside></div></section>`;
}

const typeOptions = ["신규 제작", "수정 요청", "재주문", "상담·기획"];
function formPage() {
  const isReview = formStep === 2;
  const stepsHTML = `<div class="steps-indicator">${[0,1,2].map(i => `<div class="step-seg ${i <= formStep ? "done" : ""}"></div>`).join("")}</div>`;
  let inside = "";
  if (formStep === 0) inside = `<h2 class="form-step-title">어떤 디자인이 필요하신가요?</h2><p class="form-step-desc">요청 유형에 맞춰 필요한 내용만 여쭤볼게요.</p><div class="choice-grid">${typeOptions.map(t => `<button class="choice ${form.type === t ? "selected" : ""}" data-type="${t}"><span class="choice-mark">✓</span><span>${t}</span></button>`).join("")}</div><div class="field-grid" style="margin-top:20px"><div class="field"><label>브랜드 <span class="required">*</span></label><select id="f-brand"><option value="">선택해주세요</option>${["미카도스시", "탄광맥주", "goc커피", "코타코", "우동담아", "기타"].map(x => `<option ${form.brand === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>매장명</label><input id="f-store" value="${esc(form.store || "")}" placeholder="예: 강남점" /></div><div class="field"><label>요청자 이름 <span class="required">*</span></label><input id="f-requester" value="${esc(form.requester || "")}" placeholder="이름을 입력해주세요" /></div><div class="field"><label>연락처</label><input id="f-contact" value="${esc(form.contact || "")}" placeholder="연락 가능한 번호 (선택)" /></div></div>`;
  else if (formStep === 1) inside = `<h2 class="form-step-title">요청 내용을 알려주세요</h2><p class="form-step-desc">정확히 모르시는 항목은 비워두거나 ‘미정’이라고 적어도 괜찮아요.</p><div class="field-grid"><div class="field"><label>요청 제목 <span class="required">*</span></label><input id="f-title" value="${esc(form.title || "")}" placeholder="예: 봄 신메뉴 포스터 제작" /></div><div class="field"><label>희망 완료일</label><input id="f-deadline" type="date" value="${esc(form.deadline || "")}" /></div>${conditionalFields()}<div class="field full"><label>요청 목적 <span class="required">*</span></label><input id="f-purpose" value="${esc(form.purpose || "")}" placeholder="이 디자인이 필요한 이유를 알려주세요" /></div><div class="field full"><label>상세 내용 <span class="required">*</span></label><textarea id="f-details" placeholder="전달하고 싶은 내용이나 조건을 적어주세요">${esc(form.details || "")}</textarea></div><div class="field full"><label>참고 자료 링크</label><input id="f-reference" value="${esc(form.reference || "")}" placeholder="이미지나 문서 링크 (선택)" /><div class="helper">이번 데모에서는 파일을 서버에 업로드하지 않습니다. 실제 회사 자료 링크는 입력하지 마세요.</div></div></div>`;
  else inside = `<h2 class="form-step-title">입력 내용을 확인해주세요</h2><p class="form-step-desc">제출하면 디자인 담당자가 내용을 확인합니다. 희망 완료일은 확정 일정이 아닙니다.</p><div class="review-list">${[["요청 유형",form.type],["브랜드",form.brand],["매장명",form.store],["요청자",form.requester],["제목",form.title],["희망 완료일",form.deadline ? dateLabel(form.deadline) : "미정"],["제작물",form.product],["사용 장소",form.use],["수량",form.quantity],["요청 목적",form.purpose],["상세 내용",form.details],["참고 링크",form.reference]].filter(row => row[1]).map(([a,b]) => `<div class="review-row"><span>${a}</span><span>${esc(b)}</span></div>`).join("")}</div>`;
  return `<section class="page"><div class="form-shell">${head("REQUEST PORTAL", "디자인 요청 접수", "필요한 내용을 차근차근 알려주세요. 보통 2분 정도 걸려요.")}<div class="panel form-card">${stepsHTML}${inside}<div class="form-error" id="form-error"></div><div class="form-footer">${formStep > 0 ? `<button class="btn" id="form-back">← 이전</button>` : `<span></span>`}<button class="btn primary" id="form-next">${isReview ? "요청 제출하기　→" : "다음　→"}</button></div></div><div class="footer-note">입력 내용은 이 브라우저 데모에만 저장됩니다.</div></div></section>`;
}
function conditionalFields() {
  const type = form.type;
  if (type === "신규 제작") return `<div class="field"><label>필요한 제작물</label><select id="f-product">${["선택해주세요", "포스터", "현수막", "배너", "메뉴판", "POP / 안내물", "SNS 이미지", "전단지", "기타", "잘 모르겠어요"].map(v => `<option ${form.product === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>사용 장소</label><select id="f-use">${["선택해주세요", "매장 입구", "매장 실내", "테이블", "실외", "온라인", "기타", "잘 모르겠어요"].map(v => `<option ${form.use === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>수량</label><input id="f-quantity" value="${esc(form.quantity || "")}" placeholder="예: 2장, 10부, 미정" /></div>`;
  if (type === "수정 요청") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 메뉴판, 포스터" /></div><div class="field"><label>수정할 부분</label><input id="f-use" value="${esc(form.use || "")}" placeholder="문구, 가격, 날짜, 이미지 등" /></div>`;
  if (type === "재주문") return `<div class="field"><label>기존 제작물</label><input id="f-product" value="${esc(form.product || "")}" placeholder="예: 테이블 메뉴판" /></div><div class="field"><label>수량</label><input id="f-quantity" value="${esc(form.quantity || "")}" placeholder="필요한 수량" /></div><div class="field full"><label>변경 사항</label><input id="f-use" value="${esc(form.use || "")}" placeholder="기존과 동일하면 ‘동일’이라고 적어주세요" /></div>`;
  return `<div class="field full"><label>필요한 도움</label><input id="f-use" value="${esc(form.use || "")}" placeholder="예: 어떤 제작물이 적합할지 추천이 필요해요" /></div>`;
}
function successPage() {
  return `<section class="page"><div class="form-shell"><div class="panel success-state"><div class="success-icon">✓</div><h2>요청이 접수되었어요</h2><p>디자인 담당자가 요청 내용을 확인할 예정입니다.<br>희망 완료일은 검토 후 안내드리며, 확정된 일정은 아닙니다.</p><div class="request-number">${esc(selectedRequest || "DF-00000")}</div><div><button class="btn primary" data-go="dashboard">워크스페이스로 돌아가기</button></div></div></div></section>`;
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
  return `<section class="page">${head("CALENDAR", "주간 일정", "이번 주 마감이 있는 작업을 확인합니다.", `<button class="btn">이번 주　⌄</button>`)}<div class="panel"><div class="calendar-wrap"><div class="calendar"><div class="cal-head">시간</div>${week.map(d => `<div class="cal-head ${d.date === isoDay() ? "today" : ""}">${d.label}</div>`).join("")}${hours.map(hour => `<div class="cal-time">${hour}</div>${week.map(day => { const tasks = db.tasks.filter(t => t.due === day.date && t.status !== "완료"); return `<div class="cal-cell">${hour === "10:00" ? tasks.map((t,i) => `<div class="cal-event ${i % 2 ? "amber" : ""}" data-task="${t.id}">${esc(t.name)}</div>`).join("") : ""}</div>`; }).join("")}`).join("")}</div></div></div><div class="footer-note">일정 제안은 가상 데이터이며 확정 일정이 아닙니다.</div></section>`;
}

function render() {
  let content = route === "dashboard" ? dashboard() : route === "requests" ? requestsPage() : route === "request-detail" ? requestDetail() : route === "request-form" ? formPage() : route === "request-success" ? successPage() : route === "tasks" ? tasksPage() : route === "task-detail" ? taskDetail() : route === "calendar" ? calendarPage() : dashboard();
  document.getElementById("app").innerHTML = layout(content);
  bindEvents();
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
  }
  return true;
}
function bindEvents() {
  document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => { if (el.dataset.go === "request-form") { form = {}; formStep = 0; } go(el.dataset.go); }));
  document.querySelectorAll("[data-request]").forEach(el => el.addEventListener("click", () => go("request-detail", el.dataset.request)));
  document.querySelectorAll("[data-task]:not([data-task-status])").forEach(el => el.addEventListener("click", e => { if (e.target.closest("select")) return; go("task-detail", el.dataset.task); }));
  const menu = document.getElementById("menu-toggle"); if (menu) menu.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  const search = document.getElementById("request-search"); if (search) search.addEventListener("input", e => { searchTerm = e.target.value; const pos = e.target.selectionStart; render(); const next = document.getElementById("request-search"); next.focus(); next.setSelectionRange(pos,pos); });
  const filter = document.getElementById("request-filter"); if (filter) filter.addEventListener("change", e => { requestFilter = e.target.value; render(); });
  const tf = document.getElementById("task-filter"); if (tf) tf.addEventListener("change", e => { taskFilter = e.target.value; render(); });
  document.querySelectorAll("[data-task-status]").forEach(el => el.addEventListener("change", e => { const t = db.tasks.find(x => x.id === e.target.dataset.taskStatus); if (t) { t.status = e.target.value; saveData(); notify("작업 상태를 변경했어요."); render(); } }));
  document.querySelectorAll("[data-type]").forEach(el => el.addEventListener("click", () => { form.type = el.dataset.type; render(); }));
  const back = document.getElementById("form-back"); if (back) back.addEventListener("click", () => { setFormFields(); formStep--; render(); });
  const next = document.getElementById("form-next"); if (next) next.addEventListener("click", () => { if (!validateStep()) return; if (formStep < 2) { formStep++; render(); } else submitRequest(); });
  const addStep = document.getElementById("add-step"); if (addStep) addStep.addEventListener("click", () => { const r = db.requests.find(x => x.id === selectedRequest); saveAnalysis(false); r.ai.steps.push({ name: "새 작업 단계", minutes: 30 }); saveData(); render(); });
  document.querySelectorAll("[data-remove-step]").forEach(el => el.addEventListener("click", () => { const r = db.requests.find(x => x.id === selectedRequest); saveAnalysis(false); r.ai.steps.splice(Number(el.dataset.removeStep), 1); saveData(); render(); }));
  const save = document.getElementById("save-analysis"); if (save) save.addEventListener("click", () => { saveAnalysis(true); notify("분석 제안을 저장했어요."); });
  const approve = document.getElementById("approve-analysis"); if (approve) approve.addEventListener("click", approveRequest);
  const rs = document.getElementById("request-status"); if (rs) rs.addEventListener("change", e => { const r = db.requests.find(x => x.id === selectedRequest); r.status = e.target.value; saveData(); notify("요청 상태를 변경했어요."); render(); });
  const tds = document.getElementById("task-detail-status"); if (tds) tds.addEventListener("change", e => { const t = db.tasks.find(x => x.id === selectedTask); t.status = e.target.value; saveData(); notify("작업 상태를 변경했어요."); render(); });
  const addTime = document.getElementById("add-time"); if (addTime) addTime.addEventListener("click", logTime);
  document.querySelectorAll(".check-row input").forEach(el => el.addEventListener("change", () => { if (selectedTask) { const t = db.tasks.find(x => x.id === selectedTask); if (t && el.checked) t.status = "진행 중"; saveData(); } }));
}
function submitRequest() {
  const id = `DF-${String(Date.now()).slice(-5)}`;
  const request = { id, title: form.title, type: form.type, brand: form.brand, requester: form.requester, created: isoDay(), deadline: form.deadline || "", status: "접수", priority: "보통", purpose: form.purpose, details: `${form.details}${form.contact ? `\n연락처: ${form.contact}` : ""}${form.reference ? `\n참고 링크: ${form.reference}` : ""}`, product: form.product || "", quantity: form.quantity || "", use: form.use || "", ai: { summary: "아직 분석하지 않았습니다. 디자이너가 요청을 확인한 뒤 분석 제안을 작성할 수 있습니다.", missing: [], steps: [] } };
  db.requests.unshift(request); saveData(); selectedRequest = id; route = "request-success"; render();
}
function saveAnalysis(showToast = true) {
  const r = db.requests.find(x => x.id === selectedRequest); if (!r) return;
  const summary = document.getElementById("ai-summary"); const missing = document.getElementById("ai-missing");
  if (summary) r.ai.summary = summary.value.trim(); if (missing) r.ai.missing = missing.value.split("\n").map(x => x.trim()).filter(Boolean);
  r.ai.steps = [...document.querySelectorAll("[data-step-name]")].map(input => { const i = input.dataset.stepName; return { name: input.value.trim(), minutes: Number(document.querySelector(`[data-step-minutes="${i}"]`)?.value) || 0 }; }).filter(s => s.name);
  saveData(); if (showToast) notify("분석 제안을 저장했어요.");
}
function approveRequest() {
  saveAnalysis(false); const r = db.requests.find(x => x.id === selectedRequest); if (!r) return;
  if (r.status === "작업 진행" || r.status === "완료") return notify("이미 작업이 생성된 요청입니다.");
  if (!r.ai.steps.length) return notify("작업 단계를 하나 이상 추가한 뒤 승인해주세요.");
  r.status = "작업 진행";
  r.ai.steps.forEach((s, i) => db.tasks.push({ id: `TS-${String(Date.now() + i).slice(-5)}`, requestId: r.id, name: r.title, step: s.name, brand: r.brand, due: r.deadline || isoDay(7), status: "대기", priority: r.priority, estimate: s.minutes, actual: 0 }));
  saveData(); notify("요청을 승인하고 작업을 만들었어요."); render();
}
function logTime() {
  const minutes = Number(document.getElementById("time-minutes").value); if (!minutes || minutes < 1) return notify("기록할 시간을 분 단위로 입력해주세요.");
  const t = db.tasks.find(x => x.id === selectedTask); t.actual = Number(t.actual || 0) + minutes;
  db.timeLogs.unshift({ taskId: t.id, minutes, note: document.getElementById("time-note").value.trim(), date: isoDay() }); saveData(); notify(`${minutes}분을 기록했어요.`); render();
}
window.addEventListener("hashchange", () => { const next = location.hash.slice(1); if (["dashboard", "requests", "tasks", "calendar"].includes(next)) go(next); });
render();
