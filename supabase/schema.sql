-- Design Flow: shared requests, tasks, time logs, and quote price list.
-- Run this in Supabase Dashboard > SQL Editor as the project owner.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('designer', 'sv')),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id text primary key,
  title text not null,
  type text not null,
  brand text not null,
  store text,
  requester text not null,
  contact text,
  created date not null default current_date,
  deadline date,
  status text not null default '접수',
  priority text not null default '보통',
  purpose text not null,
  details text not null,
  product text,
  quantity text,
  print_side text not null default '단면' check (print_side in ('단면','양면')),
  use text,
  reference text,
  ai jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  request_id text not null references public.requests(id) on delete cascade,
  name text not null,
  step text not null,
  brand text not null,
  due date,
  status text not null default '대기',
  priority text not null default '보통',
  estimate integer not null default 0 check (estimate >= 0),
  actual integer not null default 0 check (actual >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.time_logs (
  id bigint generated always as identity primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  minutes integer not null check (minutes > 0),
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.price_items (
  id bigint generated always as identity primary key,
  product text not null,
  size text not null,
  material text not null,
  unit_price_krw integer not null check (unit_price_krw >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity >= 1),
  jeju_shipping_krw integer not null default 0 check (jeju_shipping_krw >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  print_side text not null default '단면' check (print_side in ('단면','양면')),
  quantity_tiers jsonb not null default '[]'::jsonb,
  unique (product, size, material, print_side)
);

-- Safe for projects created before minimum quantities and Jeju shipping were added.
alter table public.price_items add column if not exists minimum_quantity integer not null default 1 check (minimum_quantity >= 1);
alter table public.price_items add column if not exists jeju_shipping_krw integer not null default 0 check (jeju_shipping_krw >= 0);
alter table public.price_items add column if not exists print_side text not null default '단면' check (print_side in ('단면','양면'));
alter table public.price_items add column if not exists quantity_tiers jsonb not null default '[]'::jsonb;
alter table public.price_items drop constraint if exists price_items_product_size_material_key;
alter table public.price_items drop constraint if exists price_items_product_size_material_print_side_key;
alter table public.price_items add constraint price_items_product_size_material_print_side_key unique (product, size, material, print_side);

create table if not exists public.request_products (
  id bigint generated always as identity primary key,
  product text not null unique,
  minimum_quantity integer not null default 1 check (minimum_quantity >= 1),
  quantity_step integer not null default 1 check (quantity_step >= 1),
  quantity_options jsonb not null default '[]'::jsonb check (jsonb_typeof(quantity_options) = 'array'),
  single_unit_order boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.request_products add column if not exists single_unit_order boolean not null default false;

insert into public.request_products (product, minimum_quantity, quantity_step, quantity_options) values
  ('포스터', 5, 1, '[5,10,20,30,40,80]'::jsonb),
  ('현수막', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('배너', 1, 1, '[1,5,10,20,30,50,100]'::jsonb),
  ('메뉴판', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('한접시무료쿠폰', 1, 1, '[1,5,10,20,30,50,100]'::jsonb),
  ('와블러', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('POP-포멕스', 1, 1, '[1,5,10,20,30,50,100]'::jsonb),
  ('POP-폼보드', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('PET', 1, 1, '[1,5,10,20,30,50,100]'::jsonb),
  ('메쉬배너-출력물', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('PET배너-출력물', 1, 1, '[1,5,10,20,30,50,100]'::jsonb),
  ('철제물통배너세트', 1, 1, '[1,5,10,20,30,50,100]'::jsonb), ('전단지', 1, 1, '[1,5,10,20,30,50,100]'::jsonb)
on conflict (product) do nothing;

create table if not exists public.design_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  version integer not null check (version >= 1),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','revision_requested','approved','superseded')),
  feedback text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, version)
);

create table if not exists public.design_files (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  review_id uuid references public.design_reviews(id) on delete set null,
  kind text not null check (kind in ('request_attachment','draft','final','review_attachment')),
  version integer not null default 0 check (version >= 0),
  file_name text not null,
  object_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  description text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists design_files_request_idx on public.design_files(request_id, created_at desc);
create index if not exists design_reviews_request_idx on public.design_reviews(request_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-flow-files', 'design-flow-files', false, 20971520,
  array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf','application/postscript','image/vnd.adobe.photoshop'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_design_flow_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid()
$$;

revoke all on function public.current_design_flow_role() from public, anon;
grant execute on function public.current_design_flow_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.tasks enable row level security;
alter table public.time_logs enable row level security;
alter table public.price_items enable row level security;
alter table public.request_products enable row level security;
alter table public.design_files enable row level security;
alter table public.design_reviews enable row level security;

revoke all on public.profiles, public.requests, public.tasks, public.time_logs, public.price_items, public.request_products, public.design_files, public.design_reviews from anon, authenticated;
grant usage on schema public to anon, authenticated;

drop policy if exists "profile owner can read" on public.profiles;
create policy "profile owner can read" on public.profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "public can submit requests" on public.requests;
create policy "public can submit requests" on public.requests
  for insert to anon with check (true);
drop policy if exists "designer can read requests" on public.requests;
drop policy if exists "staff can read requests" on public.requests;
create policy "staff can read requests" on public.requests
  for select to authenticated using (public.current_design_flow_role() in ('designer', 'sv'));
drop policy if exists "designer can add requests" on public.requests;
drop policy if exists "staff can add requests" on public.requests;
create policy "staff can add requests" on public.requests
  for insert to authenticated with check (public.current_design_flow_role() in ('designer', 'sv'));
drop policy if exists "designer can update requests" on public.requests;
create policy "designer can update requests" on public.requests
  for update to authenticated using (public.current_design_flow_role() = 'designer') with check (public.current_design_flow_role() = 'designer');
drop policy if exists "designer can delete requests" on public.requests;
create policy "designer can delete requests" on public.requests
  for delete to authenticated using (public.current_design_flow_role() = 'designer');

drop policy if exists "designer can manage tasks" on public.tasks;
create policy "designer can manage tasks" on public.tasks
  for all to authenticated using (public.current_design_flow_role() = 'designer') with check (public.current_design_flow_role() = 'designer');
drop policy if exists "sv can read tasks" on public.tasks;
create policy "sv can read tasks" on public.tasks
  for select to authenticated using (public.current_design_flow_role() = 'sv');
drop policy if exists "designer can manage time logs" on public.time_logs;
create policy "designer can manage time logs" on public.time_logs
  for all to authenticated using (public.current_design_flow_role() = 'designer') with check (public.current_design_flow_role() = 'designer');

drop policy if exists "designer and sv can read prices" on public.price_items;
create policy "designer and sv can read prices" on public.price_items
  for select to authenticated using (
    public.current_design_flow_role() = 'designer'
    or (public.current_design_flow_role() = 'sv' and is_active = true)
  );
drop policy if exists "designer can add prices" on public.price_items;
create policy "designer can add prices" on public.price_items
  for insert to authenticated with check (public.current_design_flow_role() = 'designer');
drop policy if exists "designer can update prices" on public.price_items;
create policy "designer can update prices" on public.price_items
  for update to authenticated using (public.current_design_flow_role() = 'designer') with check (public.current_design_flow_role() = 'designer');
drop policy if exists "designer can delete prices" on public.price_items;
create policy "designer can delete prices" on public.price_items
  for delete to authenticated using (public.current_design_flow_role() = 'designer');

drop policy if exists "public can read active request products" on public.request_products;
create policy "public can read active request products" on public.request_products
  for select to anon using (is_active = true);
drop policy if exists "staff can read request products" on public.request_products;
create policy "staff can read request products" on public.request_products
  for select to authenticated using (public.current_design_flow_role() = 'designer' or (public.current_design_flow_role() = 'sv' and is_active = true));
drop policy if exists "designer can manage request products" on public.request_products;
create policy "designer can manage request products" on public.request_products
  for all to authenticated using (public.current_design_flow_role() = 'designer') with check (public.current_design_flow_role() = 'designer');

grant select, insert on public.design_files to authenticated;
grant select on public.design_reviews to authenticated;
grant select on public.request_products to anon, authenticated;
grant insert, update, delete on public.request_products to authenticated;
grant usage, select on sequence public.request_products_id_seq to authenticated;
-- The server API uses the elevated service_role only after authenticating staff
-- or validating a review token. Keep its required Data API table privileges
-- explicit in case project-level default grants were changed.
grant select, insert, update on public.requests, public.design_files, public.design_reviews to service_role;
drop policy if exists "staff can read design files" on public.design_files;
create policy "staff can read design files" on public.design_files
  for select to authenticated using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "staff can upload allowed design files" on public.design_files;
create policy "staff can upload allowed design files" on public.design_files
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and (public.current_design_flow_role() = 'designer' or (public.current_design_flow_role() = 'sv' and kind = 'request_attachment'))
  );
drop policy if exists "designer can read design reviews" on public.design_reviews;
create policy "designer can read design reviews" on public.design_reviews
  for select to authenticated using (public.current_design_flow_role() = 'designer');

drop policy if exists "staff can upload design flow files" on storage.objects;
create policy "staff can upload design flow files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'design-flow-files'
    and (public.current_design_flow_role() = 'designer' or (public.current_design_flow_role() = 'sv' and (storage.foldername(name))[2] = 'request_attachment'))
  );
drop policy if exists "staff can read design flow files" on storage.objects;
create policy "staff can read design flow files" on storage.objects
  for select to authenticated using (bucket_id = 'design-flow-files' and public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer can delete design flow files" on storage.objects;
create policy "designer can delete design flow files" on storage.objects
  for delete to authenticated using (bucket_id = 'design-flow-files' and public.current_design_flow_role() = 'designer');

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.requests to authenticated;
grant insert (id, title, type, brand, store, requester, contact, created, deadline, status, priority, purpose, details, product, quantity, print_side, use, reference)
  on public.requests to anon;
grant select, insert, update, delete on public.tasks, public.time_logs, public.price_items to authenticated;
grant usage, select on sequence public.price_items_id_seq to authenticated;
grant usage, select on sequence public.time_logs_id_seq to authenticated;

-- After adding a user in Supabase Authentication > Users, run one statement
-- per account in the SQL Editor to assign the role:
-- insert into public.profiles (user_id, display_name, role)
-- select id, '디자인 담당자', 'designer' from auth.users where email = 'designer@example.com';
-- insert into public.profiles (user_id, display_name, role)
-- select id, 'SV 담당자', 'sv' from auth.users where email = 'sv@example.com';
