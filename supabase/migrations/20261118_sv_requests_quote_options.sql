-- 기존 Design Flow Supabase 프로젝트에 SV 요청 조회/등록과 견적 옵션을 적용합니다.
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

alter table public.price_items
  add column if not exists minimum_quantity integer not null default 1 check (minimum_quantity >= 1);
alter table public.price_items
  add column if not exists jeju_shipping_krw integer not null default 0 check (jeju_shipping_krw >= 0);

drop policy if exists "designer can read requests" on public.requests;
drop policy if exists "staff can read requests" on public.requests;
create policy "staff can read requests" on public.requests
  for select to authenticated
  using (public.current_design_flow_role() in ('designer', 'sv'));

drop policy if exists "designer can add requests" on public.requests;
drop policy if exists "staff can add requests" on public.requests;
create policy "staff can add requests" on public.requests
  for insert to authenticated
  with check (public.current_design_flow_role() in ('designer', 'sv'));

drop policy if exists "sv can read tasks" on public.tasks;
create policy "sv can read tasks" on public.tasks
  for select to authenticated
  using (public.current_design_flow_role() = 'sv');

