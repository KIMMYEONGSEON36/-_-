# Supabase 연결 설정

앱은 브라우저용 Supabase Publishable key로 접속합니다. 모든 테이블은 Row Level Security로 보호하고, Secret key는 앱이나 GitHub에 넣지 않습니다.

## 1. 데이터베이스 구조 적용

1. Supabase 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 **SQL Editor**를 엽니다.
3. 프로젝트의 `supabase/schema.sql` 파일 내용을 붙여 넣고 **Run**을 누릅니다.

요청, 작업, 시간 기록, 단가표, 직원 역할 테이블과 접근 정책이 만들어집니다.

기존 프로젝트를 사용 중이라면 전체 `schema.sql`을 다시 실행할 필요 없이 `supabase/migrations/20261118_sv_requests_quote_options.sql` 내용을 SQL Editor에서 실행하세요. SV의 요청 등록·진행 조회 권한과 단가별 최소 주문 수량·제주 추가 배송비 항목이 적용됩니다.

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

디자이너는 요청·작업 관리와 단가표 편집을 할 수 있습니다. SV는 활성 단가를 조회하고 견적만 계산할 수 있습니다.

## 3. 앱 사용 경로

- 직원 로그인: 사이트 기본 주소
- 공개 요청 접수: 사이트 주소 뒤에 `?request=1`을 붙인 주소
- 단가 등록: 디자이너 계정으로 로그인한 뒤 **단가표 관리**에서 최소 주문 수량과 제주 추가 배송비도 입력
- 견적 확인: SV 또는 디자이너 계정으로 로그인한 뒤 **견적 확인**
- SV 업무: 작업 요청을 등록하고 **요청 진행상황**에서 상태와 작업 단계를 조회 (수정 권한 없음)

견적은 단가 × 수량에 제주 추가 배송비(해당 지역 선택 시)를 더합니다. 기본 단가에는 부가세와 기본 배송비가 포함되며, 최소 수량보다 적게는 주문할 수 없습니다. 계산 결과는 저장하지 않고 화면에서 바로 확인·복사합니다.

## 키 관리

`supabase-config.js`에는 공개해도 되는 Project URL과 Publishable key만 들어 있습니다. `sb_secret_...` 키나 데이터베이스 비밀번호를 이 파일, GitHub, 브라우저에 넣지 마세요. Publishable key가 공개되어도 안전하도록 데이터 접근은 SQL의 권한 정책으로 제한합니다.
