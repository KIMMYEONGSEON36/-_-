-- Additive workflow/master-data migration. Existing quote tables are untouched.
begin;

alter table public.requests add column if not exists requested_by uuid references auth.users(id) on delete set null;

create table if not exists public.master_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.master_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  quantity_unit text not null default '개',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.master_options (
  id uuid primary key default gen_random_uuid(),
  option_type text not null check (option_type in ('purpose')),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_type, name)
);

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

create table if not exists public.design_archive (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.master_brands(id) on delete restrict,
  item_id uuid references public.master_items(id) on delete set null,
  design_name text not null,
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  thumbnail_path text,
  original_path text,
  is_reorderable boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  request_type text not null check (request_type in ('NEW','REORDER','MODIFY')),
  brand_id uuid references public.master_brands(id) on delete set null,
  master_item_id uuid references public.master_items(id) on delete set null,
  design_archive_id uuid references public.design_archive(id) on delete set null,
  brand_name_snapshot text not null,
  item_name_snapshot text,
  quantity_unit_snapshot text not null default '개',
  size_snapshot text,
  delivery_address_id uuid references public.master_addresses(id) on delete set null,
  delivery_address_snapshot text,
  purpose_snapshot text,
  design_name_snapshot text,
  specifications_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications_snapshot) = 'object'),
  quantity text not null,
  deadline date not null,
  details text,
  modification_types text[] not null default '{}',
  attachment_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(attachment_paths) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.master_items add column if not exists quantity_unit text not null default '개';
alter table public.master_items add column if not exists quantity_options jsonb not null default '[1,5,10,20,30,50,100]'::jsonb check (jsonb_typeof(quantity_options) = 'array');
alter table public.master_items add column if not exists size_options jsonb not null default '[]'::jsonb check (jsonb_typeof(size_options) = 'array');
alter table public.master_items add column if not exists request_fields jsonb not null default '{"purpose":true,"quantity":true,"size":true,"deadline":true,"reference_file":true,"details":true,"delivery_address":true}'::jsonb check (jsonb_typeof(request_fields) = 'object');

alter table public.request_items add column if not exists quantity_unit_snapshot text not null default '개';
alter table public.request_items add column if not exists size_snapshot text;
alter table public.request_items add column if not exists delivery_address_id uuid references public.master_addresses(id) on delete set null;
alter table public.request_items add column if not exists delivery_address_snapshot text;
alter table public.request_items alter column deadline drop not null;
create index if not exists request_items_request_idx on public.request_items(request_id, sort_order);
create index if not exists design_archive_brand_idx on public.design_archive(brand_id, is_active, is_reorderable, sort_order);

alter table public.tasks add column if not exists completed_at timestamptz;
create table if not exists public.task_status_history (
  id bigint generated always as identity primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  note text
);
create index if not exists task_status_history_task_idx on public.task_status_history(task_id, changed_at desc);

-- Keep a record of legacy states before normalizing them to the new four stages.
insert into public.task_status_history(task_id, previous_status, new_status, changed_at, note)
select id, status, case status
  when '대기' then '접수'
  when '검토' then '확인'
  when '진행 중' then '작업중'
  when '보류' then '확인'
  else '확인' end,
  now(), '2026-11-27 4단계 상태 전환: 기존 상태 보존'
from public.tasks
where status not in ('접수','확인','작업중','완료');
create or replace function public.track_task_status_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status is distinct from old.status then
    insert into public.task_status_history(task_id,previous_status,new_status,changed_by)
    values(new.id,old.status,new.status,auth.uid());
    if new.status = '완료' then new.completed_at := coalesce(new.completed_at,now());
    else new.completed_at := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists tasks_track_status_change on public.tasks;
create trigger tasks_track_status_change before update of status on public.tasks
for each row execute function public.track_task_status_change();
update public.tasks set status = case status
  when '대기' then '접수'
  when '검토' then '확인'
  when '진행 중' then '작업중'
  when '보류' then '확인'
  else '확인' end
where status not in ('접수','확인','작업중','완료');

create table if not exists public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  note_type text not null check (note_type in ('internal','sv_shared','additional')),
  content text not null check (length(trim(content)) > 0),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_notes_task_idx on public.task_notes(task_id, created_at desc);

insert into public.master_brands(name, sort_order) values
 ('미카도스시',1),('탄광맥주',2),('goc커피',3),('코타코',4),('우동담아',5)
on conflict (name) do nothing;
insert into public.master_items(name, quantity_unit, sort_order) values
 ('포스터','매',1),('배너','개',2),('현수막','장',3),('전단지','장',4),('메뉴판','개',5),('쿠폰','장',6),('기타','개',7)
on conflict (name) do nothing;
insert into public.master_options(option_type,name,sort_order) values
 ('purpose','이벤트',1),('purpose','매장홍보',2),('purpose','메뉴홍보',3),('purpose','쿠폰',4),('purpose','기타',5)
on conflict (option_type,name) do nothing;

alter table public.master_brands enable row level security;
alter table public.master_items enable row level security;
alter table public.master_options enable row level security;
alter table public.design_archive enable row level security;
alter table public.master_addresses enable row level security;
alter table public.request_items enable row level security;
alter table public.task_status_history enable row level security;
alter table public.task_notes enable row level security;

revoke all on public.master_brands, public.master_items, public.master_options, public.master_addresses, public.design_archive,
  public.request_items, public.task_status_history, public.task_notes from anon, authenticated;
grant select on public.master_brands, public.master_items, public.master_options, public.master_addresses, public.design_archive to anon, authenticated;
grant insert, update, delete on public.master_brands, public.master_items, public.master_options, public.master_addresses, public.design_archive to authenticated;
grant select on public.request_items, public.task_status_history, public.task_notes to authenticated;
grant insert on public.task_notes to authenticated;
grant usage, select on sequence public.task_status_history_id_seq to authenticated;

drop policy if exists "public reads active request masters" on public.master_brands;
create policy "public reads active request masters" on public.master_brands for select to anon using (is_active);
drop policy if exists "staff reads request masters" on public.master_brands;
create policy "staff reads request masters" on public.master_brands for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages brands" on public.master_brands;
create policy "designer manages brands" on public.master_brands for all to authenticated using (public.current_design_flow_role()='designer') with check (public.current_design_flow_role()='designer');
drop policy if exists "public reads active request items" on public.master_items;
create policy "public reads active request items" on public.master_items for select to anon using (is_active);
drop policy if exists "staff reads item masters" on public.master_items;
create policy "staff reads item masters" on public.master_items for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages item masters" on public.master_items;
create policy "designer manages item masters" on public.master_items for all to authenticated using (public.current_design_flow_role()='designer') with check (public.current_design_flow_role()='designer');
drop policy if exists "public reads active request options" on public.master_options;
create policy "public reads active request options" on public.master_options for select to anon using (is_active);
drop policy if exists "staff reads purpose masters" on public.master_options;
create policy "staff reads purpose masters" on public.master_options for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages options" on public.master_options;
create policy "designer manages options" on public.master_options for all to authenticated using (public.current_design_flow_role()='designer') with check (public.current_design_flow_role()='designer');
drop policy if exists "public reads active request addresses" on public.master_addresses;
create policy "public reads active request addresses" on public.master_addresses for select to anon using (is_active);
drop policy if exists "staff reads request addresses" on public.master_addresses;
create policy "staff reads request addresses" on public.master_addresses for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages request addresses" on public.master_addresses;
create policy "designer manages request addresses" on public.master_addresses for all to authenticated using (public.current_design_flow_role()='designer') with check (public.current_design_flow_role()='designer');
drop policy if exists "public reads active designs" on public.design_archive;
create policy "public reads active designs" on public.design_archive for select to anon using (is_active);
drop policy if exists "staff reads active designs" on public.design_archive;
create policy "staff reads active designs" on public.design_archive for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer manages design archive" on public.design_archive;
create policy "designer manages design archive" on public.design_archive for all to authenticated using (public.current_design_flow_role()='designer') with check (public.current_design_flow_role()='designer');
drop policy if exists "staff reads request items" on public.request_items;
create policy "staff reads request items" on public.request_items for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer reads task status history" on public.task_status_history;
create policy "designer reads task status history" on public.task_status_history for select to authenticated using (public.current_design_flow_role()='designer');
drop policy if exists "designer reads task notes" on public.task_notes;
create policy "designer reads task notes" on public.task_notes for select to authenticated using (public.current_design_flow_role()='designer');
drop policy if exists "sv reads shared task notes" on public.task_notes;
create policy "sv reads shared task notes" on public.task_notes for select to authenticated using (public.current_design_flow_role()='sv' and note_type in ('sv_shared','additional'));
drop policy if exists "designer writes task notes" on public.task_notes;
create policy "designer writes task notes" on public.task_notes for insert to authenticated with check (public.current_design_flow_role()='designer' and author_id=auth.uid());

-- Public and staff submission inserts a header and all item snapshots atomically.
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
  values (request_id_value,case when public.current_design_flow_role()='sv' then auth.uid() else null end,coalesce(p_request->>'title','디자인 요청'),coalesce(p_request->>'type','NEW'),coalesce(p_request->>'brand',''),p_request->>'store',coalesce(p_request->>'requester',''),p_request->>'contact',coalesce((p_request->>'created')::date,current_date),nullif(p_request->>'deadline','')::date,coalesce(p_request->>'status','접수'),coalesce(p_request->>'priority','보통'),coalesce(p_request->>'purpose',''),coalesce(p_request->>'details',''),p_request->>'product',p_request->>'quantity',coalesce(p_request->>'print_side','단면'),p_request->>'use',p_request->>'reference',p_request->'ai');
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.request_items(request_id,request_type,brand_id,master_item_id,design_archive_id,brand_name_snapshot,item_name_snapshot,quantity_unit_snapshot,size_snapshot,delivery_address_id,delivery_address_snapshot,purpose_snapshot,design_name_snapshot,specifications_snapshot,quantity,deadline,details,modification_types,attachment_paths,sort_order)
    values (request_id_value,item->>'request_type',nullif(item->>'brand_id','')::uuid,nullif(item->>'master_item_id','')::uuid,nullif(item->>'design_archive_id','')::uuid,coalesce(item->>'brand_name_snapshot',''),item->>'item_name_snapshot',coalesce(item->>'quantity_unit_snapshot','개'),item->>'size_snapshot',nullif(item->>'delivery_address_id','')::uuid,item->>'delivery_address_snapshot',item->>'purpose_snapshot',item->>'design_name_snapshot',coalesce(item->'specifications_snapshot','{}'::jsonb),coalesce(item->>'quantity',''),nullif(item->>'deadline','')::date,item->>'details',coalesce(array(select jsonb_array_elements_text(item->'modification_types')),'{}'),coalesce(item->'attachment_paths','[]'::jsonb),coalesce((item->>'sort_order')::integer,0));
  end loop;
  return request_id_value;
end $$;
create or replace function public.add_request_item_attachments(p_request_id text,p_sort_order integer,p_paths text[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare target_id uuid; path_value text;
begin
  if auth.uid() is not null and public.current_design_flow_role() not in ('designer','sv') then raise exception '직원 권한을 확인할 수 없습니다.'; end if;
  if auth.uid() is null and not exists(select 1 from public.requests where id=p_request_id and created_at > now()-interval '1 day') then raise exception '최근 접수된 요청만 첨부할 수 있습니다.'; end if;
  select id into target_id from public.request_items where request_id=p_request_id and sort_order=p_sort_order;
  if target_id is null then raise exception '요청 품목을 찾을 수 없습니다.'; end if;
  foreach path_value in array coalesce(p_paths,'{}') loop
    if not exists(select 1 from public.design_files where request_id=p_request_id and object_path=path_value and kind='request_attachment') then raise exception '요청에 연결되지 않은 파일 경로입니다.'; end if;
  end loop;
  update public.request_items set attachment_paths=to_jsonb(coalesce(p_paths,'{}')) where id=target_id;
end $$;
revoke all on function public.create_request_with_items(jsonb,jsonb) from public;
revoke all on function public.add_request_item_attachments(text,integer,text[]) from public;
grant execute on function public.create_request_with_items(jsonb,jsonb) to anon,authenticated;
grant execute on function public.add_request_item_attachments(text,integer,text[]) to anon,authenticated;
grant select, insert, update, delete on public.task_status_history to authenticated;
grant select, insert, update, delete on public.task_notes to authenticated;
grant select, insert, update, delete on public.master_brands, public.master_items, public.master_options, public.master_addresses, public.design_archive to authenticated;
grant delete on public.requests to service_role;

commit;
