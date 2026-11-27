-- Configurable request fields, delivery address masters, and optional deadlines.
begin;

create table if not exists public.master_addresses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  search_terms text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.master_items add column if not exists quantity_options jsonb not null default '[1,5,10,20,30,50,100]'::jsonb check (jsonb_typeof(quantity_options) = 'array');
alter table public.master_items add column if not exists size_options jsonb not null default '[]'::jsonb check (jsonb_typeof(size_options) = 'array');
alter table public.master_items add column if not exists request_fields jsonb not null default '{"purpose":true,"quantity":true,"size":true,"deadline":true,"reference_file":true,"details":true,"delivery_address":true}'::jsonb check (jsonb_typeof(request_fields) = 'object');

alter table public.request_items add column if not exists size_snapshot text;
alter table public.request_items add column if not exists delivery_address_id uuid references public.master_addresses(id) on delete set null;
alter table public.request_items add column if not exists delivery_address_snapshot text;
alter table public.request_items alter column deadline drop not null;

alter table public.master_addresses enable row level security;
revoke all on public.master_addresses from anon, authenticated;
grant select on public.master_addresses to anon, authenticated;
grant insert, update, delete on public.master_addresses to authenticated;

drop policy if exists "public reads active request addresses" on public.master_addresses;
create policy "public reads active request addresses" on public.master_addresses
  for select to anon using (is_active);
drop policy if exists "staff reads request addresses" on public.master_addresses;
create policy "staff reads request addresses" on public.master_addresses
  for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages request addresses" on public.master_addresses;
create policy "designer manages request addresses" on public.master_addresses
  for all to authenticated using (public.current_design_flow_role()='designer')
  with check (public.current_design_flow_role()='designer');

create or replace function public.create_request_with_items(p_request jsonb, p_items jsonb)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; request_id_value text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception '요청 품목을 한 건 이상 추가해주세요.';
  end if;
  if auth.uid() is not null and public.current_design_flow_role() not in ('designer','sv') then
    raise exception '직원 권한을 확인할 수 없습니다.';
  end if;
  request_id_value := p_request->>'id';
  insert into public.requests(id,requested_by,title,type,brand,store,requester,contact,created,deadline,status,priority,purpose,details,product,quantity,print_side,use,reference,ai)
  values (request_id_value,case when public.current_design_flow_role()='sv' then auth.uid() else null end,coalesce(p_request->>'title','디자인 요청'),coalesce(p_request->>'type','신규 디자인'),coalesce(p_request->>'brand',''),p_request->>'store',coalesce(p_request->>'requester',''),p_request->>'contact',coalesce((p_request->>'created')::date,current_date),nullif(p_request->>'deadline','')::date,coalesce(p_request->>'status','접수'),coalesce(p_request->>'priority','보통'),coalesce(p_request->>'purpose',''),coalesce(p_request->>'details',''),p_request->>'product',p_request->>'quantity',coalesce(p_request->>'print_side','단면'),p_request->>'use',p_request->>'reference',p_request->'ai');
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.request_items(request_id,request_type,brand_id,master_item_id,design_archive_id,brand_name_snapshot,item_name_snapshot,quantity_unit_snapshot,size_snapshot,delivery_address_id,delivery_address_snapshot,purpose_snapshot,design_name_snapshot,specifications_snapshot,quantity,deadline,details,modification_types,attachment_paths,sort_order)
    values (request_id_value,item->>'request_type',nullif(item->>'brand_id','')::uuid,nullif(item->>'master_item_id','')::uuid,nullif(item->>'design_archive_id','')::uuid,coalesce(item->>'brand_name_snapshot',''),item->>'item_name_snapshot',coalesce(item->>'quantity_unit_snapshot','개'),item->>'size_snapshot',nullif(item->>'delivery_address_id','')::uuid,item->>'delivery_address_snapshot',item->>'purpose_snapshot',item->>'design_name_snapshot',coalesce(item->'specifications_snapshot','{}'::jsonb),coalesce(item->>'quantity',''),nullif(item->>'deadline','')::date,item->>'details',coalesce(array(select jsonb_array_elements_text(item->'modification_types')),'{}'),coalesce(item->'attachment_paths','[]'::jsonb),coalesce((item->>'sort_order')::integer,0));
  end loop;
  return request_id_value;
end $$;

revoke all on function public.create_request_with_items(jsonb,jsonb) from public;
grant execute on function public.create_request_with_items(jsonb,jsonb) to anon,authenticated;

commit;
