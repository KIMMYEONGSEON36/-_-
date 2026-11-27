# Supabase 연결 설정

앱은 브라우저용 Supabase Publishable key로 접속합니다. 모든 테이블은 Row Level Security로 보호하고, Secret key는 앱이나 GitHub에 넣지 않습니다.

## 1. 데이터베이스 구조 적용

1. Supabase 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 **SQL Editor**를 엽니다.
3. 프로젝트의 `supabase/schema.sql` 파일 내용을 붙여 넣고 **Run**을 누릅니다.

요청, 작업, 시간 기록, 단가표, 직원 역할 테이블과 접근 정책이 만들어집니다.

기존 프로젝트를 사용 중이라면 전체 `schema.sql`을 다시 실행할 필요 없이 `supabase/migrations/20261118_sv_requests_quote_options.sql` 내용을 SQL Editor에서 실행하세요. SV의 요청 등록·진행 조회 권한과 단가별 최소 주문 수량·제주 추가 배송비 항목이 적용됩니다. 2026-11-19 요청 품목·단면/양면 단가 및 수정 회신 첨부 기능은 `supabase/migrations/20261119_request_catalog_duplex_and_reviews.sql`을 추가 실행하세요.

## 2. 디자이너와 SV 계정 만들기

각 직원 계정은 Supabase **Authentication → Users**에서 초대하거나 생성합니다. 공개 회원가입은 켜지 말고 직원 계정만 추가하세요.

계정을 만든 뒤 SQL Editor에서 이메일을 실제 계정 주소로 바꾸어 실행합니다.

```sql
insert into public.profiles (user_id, display_name, role)
select id, '디자인 담당자', 'designer'
from auth.users where email = 'designer@example.com';

insert into public.profiles (user_id, display_name, role)
select id, 'SV 담당자', 'sv'
from auth.users where email = 'sv@example.com';
```

디자이너는 요청·작업 관리와 단가표 편집을 할 수 있습니다. SV는 작업 요청, 요청 진행 조회, 활성 단가 견적 확인을 할 수 있습니다.

## 3. 앱 사용 경로

- 직원 로그인: 사이트 기본 주소
- 공개 요청 접수: 사이트 주소 뒤에 `?request=1`을 붙인 주소
- 단가 등록: 디자이너 계정으로 로그인한 뒤 **단가표 관리**에서 품목별 주문 가능 수량, 수량별 단가, 제주 추가 배송비를 관리
- 견적 확인: SV 또는 디자이너 계정으로 로그인한 뒤 **견적 확인**
- SV 업무: 작업 요청을 등록하고 **요청 진행상황**에서 상태와 작업 단계를 조회 (수정 권한 없음)

간편 견적은 제작 단가 × 수량에 제주 추가 배송비와 선택한 디자인비를 반영합니다. 품목별 주문 설정에서 **최소 수량부터 낱개 단위 주문 허용**을 체크하면 수량 목록을 직접 입력하지 않고 1매 또는 1개씩 주문할 수 있으며, 체크하지 않으면 불규칙한 주문 수량 목록을 직접 설정합니다. 단가를 등록할 때는 조합별 최소 주문 수량과 수량 구간별 매당 단가를 지정합니다. 주문 수량에 맞는 마지막 구간 단가가 자동 적용됩니다. 기본 제작 단가에는 부가세와 기본 배송비가 포함됩니다. 간편 견적은 점주의 단순 문의를 위한 참고 금액이며 작업·제작 조건에 따라 달라질 수 있습니다. 자세한 금액은 주문 접수 후 안내합니다. 계산 결과는 저장하지 않고 화면에서 바로 확인·복사합니다.

## 4. 첨부 파일과 시안 검토 링크

기존 Supabase 프로젝트라면 SQL Editor에서 아래 마이그레이션을 순서대로 한 번 실행하세요.

1. `supabase/migrations/20261118_sv_requests_quote_options.sql`
2. `supabase/migrations/20261119_private_files_and_design_review.sql`
3. `supabase/migrations/20261119_design_review_service_role_grants.sql`
4. `supabase/migrations/20261119_request_catalog_duplex_and_reviews.sql`
5. `supabase/migrations/20261120_price_quantity_tiers.sql`
6. `supabase/migrations/20261121_irregular_quantity_options.sql`
7. `supabase/migrations/20261122_single_unit_order.sql`
8. `supabase/migrations/20261127_request_workflow_master_data.sql`

마지막 마이그레이션은 운영 마스터 데이터, 다건 요청 품목, 유형별 작업 메모와 상태 이력을 추가합니다. 기존 작업 상태는 변경 이력에 원래 값이 기록된 뒤 `대기→접수`, `검토→확인`, `진행 중→작업중`, `보류→확인`으로 정리됩니다. 과거 완료 건은 실제 완료 시각을 알 수 없어 `completed_at`을 비워두며, 새로 완료 처리하는 순간부터 자동 기록합니다. 완료 후 다른 상태로 되돌리면 현재 완료 시각은 지우고 상태 변경 이력은 보존합니다.

새 요청 접수와 운영 데이터 관리 화면은 이 마이그레이션이 적용된 뒤 사용할 수 있습니다. 견적 확인과 단가표 관리는 기존 `price_items` 및 `request_products` 흐름을 그대로 사용하며, 신규 `master_items`와 연동하지 않습니다. 디자인팀 계정으로 **운영 데이터 관리**에서 브랜드·요청 품목·기존 디자인·요청 목적을 관리하세요. 이미 요청에 사용된 자료는 삭제하지 말고 비활성화하세요.

Vercel 프로젝트의 **Settings → Environment Variables**에서 `SUPABASE_SERVICE_ROLE_KEY`에 Supabase의 서버용 **Secret key (`sb_secret_...`)**를 넣고 다시 배포하세요. 예전 형식의 `service_role` JWT (`eyJ...`)도 사용할 수 있습니다. 새 Secret key는 JWT가 아니므로 서버에서 `apikey` 헤더에만 전달합니다. 이 비밀 키는 Vercel 서버 함수에서만 사용되며, 앱 파일이나 GitHub에는 넣지 마세요.

요청 작성 화면에서 참고 파일을 첨부할 수 있습니다. 디자이너는 요청 상세에서 시안 파일을 올리고 **시안 검토 링크 만들기**를 눌러 링크를 복사해 요청자에게 전달합니다. 요청자는 링크에서 파일을 내려받고 승인하거나 수정 의견을 보낼 수 있으며, 수정 요청에는 의견과 참고 파일을 첨부할 수 있습니다. 수정 이력과 첨부는 요청 상세에 보이고, 대시보드에는 요청별 최신 시안 회신만 표시됩니다. 파일은 비공개 Storage에 저장되며 공유 링크의 파일 다운로드 주소는 1시간 동안 유효합니다.

## 키 관리

`supabase-config.js`에는 공개해도 되는 Project URL과 Publishable key만 들어 있습니다. `sb_secret_...` 키나 데이터베이스 비밀번호를 이 파일, GitHub, 브라우저에 넣지 마세요. Publishable key가 공개되어도 안전하도록 데이터 접근은 SQL의 권한 정책으로 제한합니다.
