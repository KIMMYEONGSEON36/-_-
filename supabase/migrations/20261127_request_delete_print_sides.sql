begin;

alter table public.requests
  add column if not exists requested_by uuid references auth.users(id) on delete set null;
update public.requests r
set requested_by = p.user_id
from public.profiles p
where p.role = 'sv'
  and r.requested_by is null
  and r.requester = p.display_name
  and (select count(*) from public.profiles same_name where same_name.role = 'sv' and same_name.display_name = p.display_name) = 1;
create index if not exists requests_requested_by_created_idx
  on public.requests(requested_by, created desc);

alter table public.request_products
  add column if not exists allowed_print_sides text[] not null
  default array['단면', '양면']::text[];
alter table public.request_products
  drop constraint if exists request_products_allowed_print_sides_check;
alter table public.request_products
  add constraint request_products_allowed_print_sides_check
  check (
    cardinality(allowed_print_sides) between 1 and 2
    and allowed_print_sides <@ array['단면', '양면']::text[]
  );

drop policy if exists "designer can delete requests" on public.requests;
drop policy if exists "staff can delete own requests" on public.requests;
create policy "staff can delete own requests" on public.requests
  for delete to authenticated using (
    public.current_design_flow_role() = 'designer'
    or (
      public.current_design_flow_role() = 'sv'
      and (
        requested_by = auth.uid()
        or (requested_by is null and requester = (select display_name from public.profiles where user_id = auth.uid()))
      )
    )
  );
grant delete on public.requests to authenticated;

commit;
