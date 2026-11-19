# Design Flow Project Knowledge Pack

# Document: PROJECT_OVERVIEW.md

# Design Flow --- Project Overview

## 1. 프로젝트 정의

Design Flow는 F&B 프랜차이즈 본사의 디자인 요청을 구조화하고, AI가
요청을 분석해 업무 단계·예상 작업시간·누락 정보·우선순위를 제안하며,
디자인 담당자의 개인 업무관리 화면에 연결하는 디자인 업무 운영
시스템이다.

이 프로젝트는 기존 회사 공식 업무 플랫폼인 티그리스를 대체하지 않는다.
디자인 요청 접수와 디자인팀의 실무 업무관리 효율을 높이는 보완 도구로
시작한다.

## 2. 프로젝트 목표

-   디자인 요청 정보의 누락과 불명확성을 줄인다.
-   요청자가 디자인 전문 지식 없이도 요청할 수 있도록 한다.
-   요청 내용을 디자인 업무 단위로 구조화한다.
-   AI가 업무 단계, 예상시간, 난이도, 누락 자료, 우선순위를 제안한다.
-   디자인 담당자가 AI 결과를 검토·수정·승인할 수 있도록 한다.
-   승인된 업무를 개인 업무관리 대시보드에 등록한다.
-   예상 작업시간과 실제 작업시간을 축적해 업무 분석 기반을 만든다.

## 3. 주요 사용자

### 요청자

-   마케팅 담당자
-   SV / 가맹관리 담당자
-   가맹점주
-   기타 본사 직원

요청자는 주로 모바일로 접근하며 디자인 전문 용어를 잘 모를 수 있다.

### 디자인 담당자

-   디자인 요청 검토
-   AI 분석 결과 확인 및 수정
-   업무 등록 및 일정 관리
-   진행 상태 및 작업시간 기록
-   디자인 업무 데이터 분석

MVP의 첫 번째 실제 사용자는 디자인 담당자 본인이다.

## 4. 핵심 문제

### 요청자 측

-   요청 내용을 어떤 정보로 전달해야 하는지 모름
-   사이즈·재질·제작 방법을 모르는 경우가 있음
-   콘텐츠나 참고자료를 누락함
-   요청 후 진행 상황을 파악하기 어려움

### 디자인 담당자 측

-   요청 내용을 다시 해석하고 질문하는 시간이 발생함
-   자료 누락으로 작업 시작이 지연됨
-   업무 우선순위와 마감 일정을 수동으로 관리함
-   업무가 갑자기 몰리는 것을 사전에 파악하기 어려움
-   디자인 작업시간과 커뮤니케이션·대기시간이 혼재됨
-   업무량과 효율을 객관적인 데이터로 설명하기 어려움

## 5. 핵심 사용자 가치

-   요청자: 쉽고 빠르게 필요한 디자인을 요청할 수 있다.
-   디자인 담당자: 요청을 정리하는 시간을 줄이고 실제 디자인 작업에
    집중할 수 있다.
-   조직: 디자인 업무 현황과 반복적인 병목을 데이터로 파악할 수 있다.

## 6. 핵심 서비스 흐름

1.  요청자가 모바일 요청 페이지에 접속한다.
2.  요청 유형을 선택한다.
3.  유형에 맞는 질문을 입력한다.
4.  요청이 데이터베이스에 저장된다.
5.  AI가 요청을 요약하고 분석한다.
6.  AI가 누락 자료, 업무 단계, 예상시간, 난이도, 우선순위, 일정 제안을
    생성한다.
7.  디자인 담당자가 AI 결과를 검토하고 수정한다.
8.  승인한 업무가 개인 업무 대시보드에 등록된다.
9.  담당자가 업무를 진행하고 상태 및 실제 소요시간을 기록한다.
10. 업무 데이터가 향후 통계와 개선에 활용된다.

## 7. 티그리스와의 관계

티그리스는 회사 공식 업무 플랫폼으로 유지한다. - 공식 업무 기록 - 부서
간 커뮤니케이션 - 결재 및 비용 처리 - 공식 문서 및 공유

Design Flow는 디자인 특화 업무 도구로 사용한다. - 디자인 요청 구조화 -
AI 업무 분석 - 디자인 업무 분할 - 개인 일정 및 진행 관리 - 실제 작업시간
기록 - 디자인 업무 분석

초기에는 티그리스 API 연동을 범위에서 제외한다. 중복 입력을 최소화하고,
회사 승인 후 연동 여부를 검토한다.

## 8. MVP 범위

### 포함

-   모바일 반응형 요청 접수
-   신규 제작 / 일반 제작 / 재주문 유형 분기
-   요청 데이터 저장
-   AI 요청 요약
-   AI 누락 정보 검토
-   AI 업무 분할
-   AI 예상시간·난이도·우선순위 제안
-   담당자 검토 및 수정
-   개인 업무 대시보드
-   업무 상태 변경
-   마감일 관리
-   실제 소요시간 기록

### 제외

-   회사 전체 사용자 관리
-   팀 단위 업무 배정
-   결재 기능
-   견적·발주 자동화
-   실시간 채팅
-   AI 이미지 생성
-   자동 디자인 시안 제작
-   티그리스 API 연동
-   복잡한 알림 시스템
-   모바일 앱 설치형 서비스

## 9. 성공 기준

-   요청 정보 누락률 감소
-   추가 확인 커뮤니케이션 감소
-   요청 정리 및 업무 등록 시간 감소
-   업무 누락 감소
-   AI 업무 분할 결과를 실제 업무에 활용할 수 있는 수준
-   요청자가 모바일에서 쉽게 접수할 수 있음
-   실제 예상시간과 소요시간 데이터를 축적할 수 있음

## 10. 프로젝트 원칙

-   AI는 제안자이며 최종 결정자는 디자인 담당자다.
-   불확실한 정보는 임의로 만들어내지 않는다.
-   전문 용어보다 요청자 관점의 쉬운 언어를 사용한다.
-   요청자의 입력 부담을 최소화한다.
-   기능보다 실제 업무 흐름의 효율을 우선한다.
-   티그리스 대체가 아닌 보완 도구로 설계한다.
-   초기 테스트에는 가상 데이터를 사용한다.
-   회사 자료와 개인정보를 외부 AI에 전달하기 전에 승인과 보안 검토를
    한다.

------------------------------------------------------------------------

# Document: SERVICE_SPEC.md

# Design Flow --- Service Specification

## 1. 서비스 구조

서비스는 Request Portal과 Designer Workspace의 두 영역으로 구성한다.

### Request Portal

외부 요청자가 모바일 중심으로 디자인 요청을 제출하는 영역. - 로그인 없이
접수하는 방식은 MVP 후보이나 스팸 방지와 개인정보 정책 검토가
필요하다. - 질문은 선택형 중심으로 구성한다. - 요청 유형에 따라 조건부
질문을 보여준다. - 전문 용어를 사용하지 않는다. - 모르는 항목은 '잘
모르겠어요' 또는 '디자인팀 추천'을 선택할 수 있다.

### Designer Workspace

디자인 담당자가 요청과 AI 분석 결과를 검토하고 개인 업무를 관리하는
영역. - Dashboard - Requests - Tasks - Calendar - Analytics (MVP 이후) -
Settings (최소 기능)

## 2. 요청 유형

1.  신규 디자인 제작
2.  기존 디자인 수정
3.  기존 제작물 재주문
4.  디자인 상담 / 제작물 추천

## 3. Request Form --- 공통 항목

-   브랜드: 미카도스시 / 탄광맥주 / goc커피 / 코타코 / 우동담아 / 기타
-   매장명: 선택 또는 직접 입력
-   요청자 이름
-   요청 유형
-   제작 목적
-   희망 완료일
-   요청 상세
-   참고자료 유무

## 4. 신규 제작 질문

-   필요한 제작물(관리자가 등록한 품목 목록에서 선택)
    -   포스터
    -   현수막
    -   배너
    -   메뉴판
    -   한접시무료쿠폰
    -   와블러
    -   POP-포멕스
    -   POP-폼보드
    -   PET
    -   메쉬배너-출력물
    -   PET배너-출력물
    -   철제물통배너세트
-   수량: 관리자 설정 최소 수량과 주문 단위 적용
-   인쇄 면: 단면 / 양면
-   사용 장소: 실외 / 실내 / 기타(부착장소를 첨부해주세요)
-   크기:
    -   기존 제작물과 동일
    -   A4 / A3 / A2
    -   특정 사이즈 알고 있음
    -   공간에 맞춰 제작
    -   디자인팀 추천
    -   잘 모르겠어요
-   특정 사이즈 선택 시 가로·세로(mm) 입력
-   재질 또는 사용 환경:
    -   실내 단기 / 실내 장기 / 실외 / 반복 사용 / 음식 주변 / 기존과
        동일 / 잘 모르겠어요
-   콘텐츠:
    -   제목 / 홍보 문구 / 상세 설명 / 가격 / 행사 기간 / 참여 방법 /
        필수 표기
-   자료 보유 여부:
    -   사진 있음 / 기존 제작물 있음 / 참고자료 없음
-   수량
-   희망 완료일
-   행사 또는 판매 시작일

## 5. 기존 디자인 수정 질문

-   기존 제작물 유형
-   수정 대상 디자인 또는 자료 전달 안내
-   변경할 내용
-   수정 목적
-   희망 완료일
-   수정 범위: 문구 / 가격 / 날짜 / 이미지 / 사이즈 / 기타

## 6. 재주문 질문

-   기존 제작물 유형
-   기존 디자인 그대로인지
-   수량
-   기존 사이즈 동일 여부
-   배송 필요 여부
-   배송 주소 및 수령인 정보는 필요한 경우에만 수집
-   희망 납기
-   기타

## 7. 디자인 상담 질문

-   무엇을 홍보하거나 안내하고 싶은가?
-   어디에서 사용할 예정인가?
-   원하는 시기
-   현재 알고 있는 정보
-   '디자인팀에서 적절한 제작물을 추천해주세요' 옵션

## 8. AI 분석 결과

-   request_summary
-   request_type
-   production_type
-   difficulty
-   priority
-   estimated_total_minutes
-   missing_information
-   additional_questions
-   task_steps
-   deadline_recommendation
-   deadline_risk
-   reasoning

AI 결과는 담당자가 편집 및 승인해야 한다.

## 9. 업무 상태

Request status: - submitted - analyzing - needs_review - approved -
rejected - archived

Task status: - todo - in_progress - waiting - review - completed -
cancelled

## 10. 우선순위 기준

AI는 우선순위를 제안하되 담당자가 수정 가능해야 한다. - 행사·판매
시작일이 임박했는지 - 요청된 마감일까지 남은 기간 - 제작 난이도 및
작업량 - 다른 업무와의 충돌 - 자료가 준비되어 있는지

AI는 실제 일정과 현재 업무량 데이터가 없으면 일정 확정 대신 '추천'으로
표시한다.

## 11. UX 원칙

-   모바일 우선 요청 폼
-   한 화면에 질문을 과도하게 노출하지 않음
-   진행률 표시
-   선택형 입력 우선
-   전문 용어를 쉬운 설명으로 대체
-   모름 / 해당 없음 / 디자인팀 추천 제공
-   제출 전 요약 확인
-   관리자 화면은 정보 밀도와 작업 효율을 우선
-   AI 제안과 사용자 확정값을 시각적으로 구분

------------------------------------------------------------------------

# Document: USER_FLOW.md

# Design Flow --- User Flow

## 1. Requester Flow

Landing → Request type selection → Requester information → Request
details (conditional form) → Deadline / quantity / reference information
→ Review summary → Submit → Confirmation screen with request number

### Branches

-   New design → production type, purpose, content, usage, size,
    quantity
-   Revision → existing design, change details, deadline
-   Reorder → item, quantity, same design confirmation, delivery
-   Consultation → purpose, context, designer recommendation request

## 2. Designer Flow

Login → Dashboard → New request notification / Requests list → Request
detail → AI analysis → Review missing information → Edit task steps /
estimates / priority → Approve analysis → Create tasks → Task list or
calendar → Start / update / wait / complete → Log actual time → Close
task

## 3. AI Analysis Flow

Request submitted → Validate required fields → Save original request →
AI analysis → Validate structured output → Save AI analysis → Display to
designer → Designer review → Approve or edit → Create task and task
steps

### Error branch

AI failure → Request remains saved → Show analysis failed status → Allow
manual task creation or retry → Never lose submitted request

## 4. Task Management Flow

Task detail → Review task steps → Edit / add / remove steps → Set
deadline → Set priority → Start work → Record time → Update status →
Complete

## 5. Request Status Visibility

MVP requester does not necessarily need real-time tracking. Initial
confirmation should communicate: - Request received - Request number -
The design team will review - Missing information may be requested -
Requested deadline is not automatically guaranteed

## 6. Navigation

Requester: - Request landing - Form - Review - Confirmation

Designer: - Dashboard - Requests - Tasks - Calendar - Analytics
(later) - Settings (later)

## 7. UX Decisions

-   Do not require requester account in MVP unless security or
    operational needs demand it.
-   Do not expose designer workspace to public users.
-   Keep form questions conditional.
-   Use mobile-friendly touch targets.
-   Save draft functionality is optional for MVP.
-   Task creation requires designer approval of AI analysis.

------------------------------------------------------------------------

# Document: UI_DESIGN_GUIDE.md

# Design Flow --- UI Design Guide

## 1. Design Direction

Product personality: - Clear - Calm - Practical - Professional -
Friendly but not childish - Design-workflow focused

The UI should feel like a lightweight modern work tool, not a franchise
ordering portal or an overly decorative AI product.

## 2. UX Priorities

1.  Clarity of information hierarchy
2.  Fast task completion
3.  Low cognitive load
4.  Consistency
5.  Responsive mobile experience
6.  Editable AI suggestions

## 3. Visual Principles

-   Light neutral background
-   High contrast text
-   Restrained accent color
-   Cards only where they clarify grouping
-   Avoid excessive gradients, glow effects, and decorative AI motifs
-   Use whitespace intentionally
-   Use clear status labels
-   Use typography and spacing before decoration to establish hierarchy

## 4. Requester Mobile UI

-   Single-column layout
-   Short question groups
-   Large selectable cards or radio options
-   Progress indicator
-   Sticky bottom action only when useful
-   Friendly explanatory helper text
-   Avoid long free-text fields unless necessary
-   Include "잘 모르겠어요", "디자인팀 추천", "해당 없음" where
    applicable

## 5. Designer Desktop UI

-   Left navigation
-   Main content area
-   Dashboard cards for actionable metrics
-   Table/list for tasks
-   Filters and sorting
-   Task detail with editable AI output
-   Clear due date and priority
-   Waiting status must be distinct from active work

## 6. Responsive Behavior

Mobile: - Requester flow is primary - Single column - Touch targets
comfortably sized - Avoid dense tables

Tablet: - Cards and compact lists - Two-column forms where appropriate

Desktop: - Designer workspace - Sidebar navigation - Multi-column
dashboard - Dense task table - Detail panel or dedicated detail page

## 7. Components

-   Button: primary / secondary / ghost / destructive
-   Input: text / number / date / textarea
-   Select / radio / checkbox
-   Progress indicator
-   Request type card
-   Status badge
-   Priority badge
-   Task card
-   Task row
-   Empty state
-   Loading state
-   Error state
-   AI analysis panel
-   Task step checklist
-   Calendar item
-   Modal / confirmation dialog

## 8. Status Color Semantics

Use color consistently and do not rely on color alone. - Neutral:
submitted / todo - Blue or accent: in progress - Amber: waiting / needs
information - Red: overdue / urgent - Green: completed - Gray: cancelled
/ archived

## 9. Accessibility

-   Labels for all controls
-   Keyboard focus state
-   Adequate contrast
-   Color is not the only status indicator
-   Error messages adjacent to fields
-   Touch target sizes suitable for mobile
-   Meaningful headings

## 10. Figma Workflow

Recommended design sequence: 1. Define sitemap and user flow 2. Create
low-fidelity wireframes 3. Review structure and interaction 4. Define
design tokens 5. Create reusable components 6. Design requester mobile
flow 7. Design designer desktop workspace 8. Create responsive states 9.
Prototype primary flows 10. Review against requirements

Do not jump directly to high-fidelity screens before confirming
information architecture and user flow.

------------------------------------------------------------------------

# Document: DATA_STRUCTURE.md

# Design Flow --- Data Structure

## 1. Entities

MVP entities: - requests - ai_analyses - tasks - task_steps - time_logs

## 2. requests

-   id: UUID, primary key
-   request_number: text, unique
-   brand: text
-   store_name: text, nullable
-   requester_name: text
-   requester_contact: text, nullable
-   request_type: text
-   production_type: text, nullable
-   purpose: text, nullable
-   content: JSONB
-   usage_environment: text, nullable
-   size_info: JSONB, nullable
-   material_context: text, nullable
-   quantity: integer, nullable
-   requested_deadline: date, nullable
-   event_date: date, nullable
-   reference_info: JSONB, nullable
-   notes: text, nullable
-   status: text
-   submitted_at: timestamp
-   updated_at: timestamp

## 3. ai_analyses

-   id: UUID, primary key
-   request_id: UUID, foreign key
-   summary: text
-   task_type: text
-   difficulty: text
-   priority: text
-   estimated_total_minutes: integer
-   missing_information: JSONB
-   additional_questions: JSONB
-   recommended_steps: JSONB
-   deadline_recommendation: JSONB
-   deadline_risk: text
-   reasoning: text
-   model_name: text
-   created_at: timestamp

## 4. tasks

-   id: UUID, primary key
-   request_id: UUID, nullable foreign key
-   task_name: text
-   brand: text
-   task_type: text
-   priority: text
-   difficulty: text
-   estimated_minutes: integer
-   actual_minutes: integer, default 0
-   deadline: date, nullable
-   scheduled_date: date, nullable
-   status: text
-   notes: text, nullable
-   created_at: timestamp
-   updated_at: timestamp
-   completed_at: timestamp, nullable

## 5. task_steps

-   id: UUID, primary key
-   task_id: UUID, foreign key
-   step_name: text
-   description: text
-   sequence: integer
-   estimated_minutes: integer
-   actual_minutes: integer, default 0
-   status: text
-   completed_at: timestamp, nullable

## 6. time_logs

-   id: UUID, primary key
-   task_id: UUID, foreign key
-   task_step_id: UUID, nullable foreign key
-   started_at: timestamp, nullable
-   ended_at: timestamp, nullable
-   duration_minutes: integer
-   work_type: text
-   memo: text, nullable
-   created_at: timestamp

## 7. Suggested enums

request_type: - new_design - revision - reorder - consultation

request_status: - submitted - analyzing - needs_review - approved -
rejected - archived

task_status: - todo - in_progress - waiting - review - completed -
cancelled

priority: - low - normal - high - urgent

difficulty: - low - medium - high

work_type: - design - communication - revision - admin - waiting

## 8. Relationships

-   One request may have one or more AI analyses.
-   One request may generate one or more tasks.
-   One task has multiple task steps.
-   One task may have multiple time logs.
-   One task step may have multiple time logs.

## 9. Data principles

-   Keep original request immutable where practical.
-   Store AI analysis separately from user-approved task data.
-   Track changes to AI suggestions if feasible.
-   Do not store unnecessary personal data.
-   Use secure access policies.
-   Public requester cannot read designer workspace data.
-   Admin data must be protected by authentication and database access
    rules.

------------------------------------------------------------------------

# Document: AI_WORKFLOW.md

# Design Flow --- AI Workflow

## 1. AI Role

You are an AI workflow analyst for an in-house F&B franchise design
team.

Analyze submitted design requests and propose practical task steps,
estimates, missing information, difficulty, priority, and deadline
guidance.

AI output is advisory. The designer reviews and approves it.

## 2. Input

-   brand
-   requester context
-   request_type
-   production_type
-   purpose
-   content
-   usage_environment
-   size_info
-   material_context
-   quantity
-   requested_deadline
-   event_date
-   reference_info
-   notes

## 3. Rules

1.  Summarize the request in one concise sentence.
2.  Classify request type.
3.  Identify missing information that blocks work.
4.  Ask only useful additional questions.
5.  Split the work into practical steps, not excessively granular
    subtasks.
6.  Estimate each step in minutes.
7.  Provide total estimated work time.
8.  Classify difficulty as low, medium, or high.
9.  Suggest priority based on deadline, event date, complexity, and
    missing materials.
10. Separate design work from communication, revision, admin, and
    waiting.
11. Do not count waiting for approvals or materials as active work time.
12. Do not invent facts, prices, copy, dimensions, materials, or dates.
13. If information is uncertain, mark it as unknown or needs
    confirmation.
14. Simple revisions and reorders should not receive the same workflow
    as new design projects.
15. Avoid assuming that the requested deadline is guaranteed.
16. If the deadline appears unrealistic, flag the risk and explain
    briefly.
17. Do not make final scheduling decisions without the designer's
    approval.
18. Do not expose sensitive company or requester data to unapproved
    external services.

## 4. Task workflow templates

### New design

-   Request and content review
-   Gather assets and references
-   Design direction / layout
-   Design production
-   Internal review
-   Revision
-   Final file preparation
-   Delivery

### Revision

-   Review existing file
-   Confirm change scope
-   Make revision
-   Review
-   Final export
-   Delivery

### Reorder

-   Confirm existing artwork
-   Confirm dimensions / production specs
-   Confirm quantity and delivery details
-   Prepare order files if needed
-   Handoff / completion

### Consultation

-   Clarify purpose and location
-   Recommend production format
-   Confirm required content
-   Provide next-step proposal

## 5. Estimate Guidelines

-   Estimates are hypotheses, not commitments.
-   Avoid false precision.
-   Use increments that are practical for the designer.
-   For small tasks, estimate in 15-minute increments.
-   For larger tasks, estimate in 30-minute increments.
-   Include communication/review time only when it is an active task.
-   Do not include waiting time in estimated active work time.

## 6. Priority Guidelines

Priority may be based on: - Event or launch date - Requested deadline -
Time remaining - Complexity - Materials readiness - Current workload
(only if available) - Business impact (only if explicitly provided)

If current workload is unavailable, do not pretend to know capacity.

## 7. Prompt Template

SYSTEM: You are an AI workflow analyst for an in-house F&B franchise
design team. Convert design requests into practical task steps and
estimates. Do not invent missing information. Your output is a proposal
for designer review.

USER: Analyze this design request.

Request data: {{request_json}}

Return valid JSON matching this schema: { "summary": "string",
"request_type": "new_design \| revision \| reorder \| consultation",
"difficulty": "low \| medium \| high", "priority": "low \| normal \|
high \| urgent", "estimated_total_minutes": 0, "missing_information":
\["string"\], "additional_questions": \["string"\], "steps": \[ {
"step_name": "string", "description": "string", "sequence": 1,
"estimated_minutes": 0, "work_type": "design \| communication \|
revision \| admin" } \], "deadline_recommendation": { "date":
"YYYY-MM-DD or null", "reason": "string" }, "deadline_risk": "low \|
medium \| high \| unknown", "reasoning": "brief explanation" }

## 8. Output validation

-   JSON must parse.
-   Required keys must exist.
-   estimated_total_minutes should equal the sum of step estimates.
-   Each step must have a valid sequence and non-negative duration.
-   Enum values must match allowed values.
-   If missing information exists, do not silently assume it is
    supplied.
-   If output is invalid, retry once with a correction instruction.
-   If AI fails, preserve the request and allow manual task creation.

------------------------------------------------------------------------

# Document: FIGMA_AI_BRIEF.md

# Design Flow --- Figma AI / UI Design Brief

## Context

Design a lightweight design-workflow product for an in-house F&B
franchise design team. It receives mobile design requests from
marketing, SVs, franchise owners, and other staff, then uses AI to
analyze requests and create editable task proposals for the designer's
workspace.

The product does not replace the company's official platform, Tigris. It
supplements the design team's specialized request intake and personal
workflow management.

## Design deliverables

Create the following screens: 1. Requester landing page 2. Request type
selection 3. New design request form --- mobile 4. Revision request form
--- mobile 5. Reorder form --- mobile 6. Consultation form --- mobile 7.
Review and submit 8. Request confirmation 9. Designer dashboard ---
desktop 10. Request list 11. Request detail with AI analysis 12. AI
task-step editor 13. Task list 14. Task detail 15. Weekly calendar 16.
Empty state 17. Loading state 18. AI failure state 19. Missing
information state

## Primary flow

Requester: Landing → choose request type → fill conditional form →
review → submit → confirmation.

Designer: Login → dashboard → review request → AI analysis → edit steps
and estimates → approve → task dashboard → schedule and track → log
actual time → complete.

## Requester UI requirements

-   Mobile-first.
-   Friendly, clear Korean copy.
-   Avoid design jargon.
-   Choice-based questions.
-   Allow "잘 모르겠어요", "디자인팀 추천", and "해당 없음".
-   Show progress.
-   Keep form concise.
-   Use conditional questions.
-   Provide a summary before submission.

## Designer UI requirements

-   Desktop-first but responsive.
-   Information-dense but calm.
-   Clear task status, due date, priority, estimated time.
-   AI suggestions must be clearly marked as suggestions.
-   Allow editing all AI-generated task steps and estimates.
-   Waiting for information must be distinct from active work.
-   Dashboard should prioritize actionable items over decorative
    metrics.

## Visual direction

-   Modern lightweight productivity tool.
-   Neutral surfaces, clear typography, restrained accent color.
-   Strong hierarchy and generous whitespace.
-   Avoid excessive gradients, glowing AI graphics, playful
    illustration, or unnecessary decoration.
-   Use reusable components and consistent spacing.
-   Use color plus text/icon for statuses; never color alone.

## Required prototype interactions

-   Request type cards navigate to different form branches.
-   Selectable options have selected states.
-   Conditional questions appear based on answers.
-   Review screen displays entered values.
-   Submit leads to confirmation.
-   Designer dashboard filters tasks.
-   Task detail opens.
-   AI task steps can be edited.
-   Task status can be changed.
-   Checklists can be completed.
-   Calendar items can be selected.

## Figma organization

Pages: - 00 Cover / Project - 01 Foundations - 02 Components - 03
Requester Mobile - 04 Designer Desktop - 05 Prototype - 06 States

Use component variants for: - Buttons - Inputs - Request type cards -
Status badges - Priority badges - Task cards - Task rows - Progress
indicators - AI analysis panels - Checklists

## Important

Do not invent new features beyond the defined MVP without documenting
them as suggestions. Start with user flow and low-fidelity wireframes.
Confirm structure before high-fidelity UI.

------------------------------------------------------------------------

# Document: AI_CONTEXT.md

# Design Flow --- AI Context / Master Instructions

You are assisting with the Design Flow project.

Read the project documents before making design or development
decisions: - PROJECT_OVERVIEW.md - SERVICE_SPEC.md - USER_FLOW.md -
UI_DESIGN_GUIDE.md - DATA_STRUCTURE.md - AI_WORKFLOW.md -
FIGMA_AI_BRIEF.md

## Your role

Depending on the task, act as: - Product strategist - UX designer - UI
designer - Frontend developer - Database designer - AI workflow designer

Do not perform all roles at once unless explicitly requested.

## Decision hierarchy

1.  User's explicit instruction in the current task
2.  Project documents
3.  Existing approved design and implementation
4.  Your recommendations

If a requirement conflicts with project documents, identify the conflict
and ask or clearly state the proposed change. Do not silently change
scope.

## Project constraints

-   MVP first.
-   The product supplements Tigris; it does not replace it.
-   First user is the designer herself.
-   Requesters should not need design expertise.
-   Mobile-first request intake.
-   Desktop-first designer workspace.
-   AI suggestions must be editable and require designer approval.
-   Avoid unnecessary features.
-   Use fake data during initial development.
-   Protect personal and company data.
-   Keep original requests separate from AI analysis and approved tasks.

## Design workflow

When asked to design UI: 1. Identify the target user and screen. 2.
Review the defined user flow. 3. List the information hierarchy. 4.
Create low-fidelity structure. 5. Review interaction and states. 6.
Apply design tokens and components. 7. Create high-fidelity UI. 8. Check
responsive behavior. 9. Check accessibility. 10. Confirm the screen
meets the MVP scope.

## Development workflow

When asked to implement: 1. Confirm the relevant feature and data. 2.
Identify dependencies. 3. Implement one feature at a time. 4. Keep data
types and schema consistent. 5. Validate input and errors. 6. Preserve
existing functionality. 7. Test success, loading, empty, and error
states. 8. Do not expose API keys. 9. Do not use real company data
unless approved. 10. Report what changed and what remains.

## Response style

-   Explain decisions clearly and practically.
-   Avoid vague suggestions.
-   Distinguish confirmed requirements from recommendations.
-   Do not claim an implementation or integration is complete unless it
    has been verified.
