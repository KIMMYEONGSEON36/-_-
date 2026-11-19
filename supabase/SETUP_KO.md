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
- 단가 등록: 디자이너 계정으로 로그인한 뒤 **단가표 관리**에서 최소 주문 수량과 제주 추가 배송비도 입력
- 견적 확인: SV 또는 디자이너 계정으로 로그인한 뒤 **견적 확인**
- SV 업무: 작업 요청을 등록하고 **요청 진행상황**에서 상태와 작업 단계를 조회 (수정 권한 없음)

간편 견적은 제작 단가 × 수량에 제주 추가 배송비와 선택한 디자인비를 반영합니다. 품목을 바꾸면 관리자가 설정한 최소 수량과 주문 단위에 맞게 자동 조정됩니다. 단면·양면 단가는 별도로 등록합니다. 기본 제작 단가에는 부가세와 기본 배송비가 포함됩니다. 단순 수정형(난이도 하)은 텍스트 수정 5,000원, 기존 디자인 규격 변경 10,000원, 사진 보정 및 합성 20,000원, 디자인 요소 추가 및 수정 30,000원을 기준으로 합니다. 일반 제작(난이도 중)과 신규 제작(난이도 상)은 접수 후 별도 견적합니다. 간편 견적은 점주의 단순 문의를 위한 참고 금액이며 작업·제작 조건에 따라 달라질 수 있습니다. 자세한 금액은 주문 접수 후 안내합니다. 계산 결과는 저장하지 않고 화면에서 바로 확인·복사합니다.

## 4. 첨부 파일과 시안 검토 링크

기존 Supabase 프로젝트라면 SQL Editor에서 아래 마이그레이션을 순서대로 한 번 실행하세요.

1. `supabase/migrations/20261118_sv_requests_quote_options.sql`
2. `supabase/migrations/20261119_private_files_and_design_review.sql`
3. `supabase/migrations/20261119_design_review_service_role_grants.sql`
4. `supabase/migrations/20261119_request_catalog_duplex_and_reviews.sql`

Vercel 프로젝트의 **Settings → Environment Variables**에서 `SUPABASE_SERVICE_ROLE_KEY`에 Supabase의 서버용 **Secret key (`sb_secret_...`)**를 넣고 다시 배포하세요. 예전 형식의 `service_role` JWT (`eyJ...`)도 사용할 수 있습니다. 새 Secret key는 JWT가 아니므로 서버에서 `apikey` 헤더에만 전달합니다. 이 비밀 키는 Vercel 서버 함수에서만 사용되며, 앱 파일이나 GitHub에는 넣지 마세요.

요청 작성 화면에서 참고 파일을 첨부할 수 있습니다. 디자이너는 요청 상세에서 시안 파일을 올리고 **시안 검토 링크 만들기**를 눌러 링크를 복사해 요청자에게 전달합니다. 요청자는 링크에서 파일을 내려받고 승인하거나 수정 의견을 보낼 수 있으며, 수정 요청에는 의견과 참고 파일을 첨부할 수 있습니다. 수정 이력과 첨부는 요청 상세에 보이고, 대시보드에는 요청별 최신 시안 회신만 표시됩니다. 파일은 비공개 Storage에 저장되며 공유 링크의 파일 다운로드 주소는 1시간 동안 유효합니다.

## 키 관리

`supabase-config.js`에는 공개해도 되는 Project URL과 Publishable key만 들어 있습니다. `sb_secret_...` 키나 데이터베이스 비밀번호를 이 파일, GitHub, 브라우저에 넣지 마세요. Publishable key가 공개되어도 안전하도록 데이터 접근은 SQL의 권한 정책으로 제한합니다.
