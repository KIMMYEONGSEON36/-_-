-- Product quantity rules, duplex-aware pricing, and review response attachments.
alter table public.requests
  add column if not exists print_side text not null default '단면';
alter table public.requests drop constraint if exists requests_print_side_check;
alter table public.requests add constraint requests_print_side_check
  check (print_side in ('단면','양면'));

alter table public.price_items
  add column if not exists print_side text not null default '단면';
alter table public.price_items drop constraint if exists price_items_print_side_check;
alter table public.price_items add constraint price_items_print_side_check
  check (print_side in ('단면','양면'));
alter table public.price_items drop constraint if exists price_items_product_size_material_key;
alter table public.price_items drop constraint if exists price_items_product_size_material_print_side_key;
alter table public.price_items add constraint price_items_product_size_material_print_side_key
  unique (product, size, material, print_side);

create table if not exists public.request_products (
  id bigint generated always as identity primary key,
  product text not null unique,
  minimum_quantity integer not null default 1 check (minimum_quantity >= 1),
  quantity_step integer not null default 1 check (quantity_step >= 1),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.request_products (product, minimum_quantity, quantity_step) values
  ('포스터', 5, 5), ('현수막', 1, 1), ('배너', 1, 1), ('메뉴판', 1, 1),
  ('한접시무료쿠폰', 1, 1), ('와블러', 1, 1), ('POP-포멕스', 1, 1), ('POP-폼보드', 1, 1),
  ('PET', 1, 1), ('메쉬배너-출력물', 1, 1), ('PET배너-출력물', 1, 1), ('철제물통배너세트', 1, 1), ('전단지', 1, 1)
on conflict (product) do nothing;

alter table public.request_products enable row level security;
revoke all on public.request_products from anon, authenticated;
grant select on public.request_products to anon, authenticated;
grant insert, update, delete on public.request_products to authenticated;
grant usage, select on sequence public.request_products_id_seq to authenticated;

drop policy if exists "public can read active request products" on public.request_products;
create policy "public can read active request products" on public.request_products
  for select to anon using (is_active = true);
drop policy if exists "staff can read request products" on public.request_products;
create policy "staff can read request products" on public.request_products
  for select to authenticated using (
    public.current_design_flow_role() = 'designer'
    or (public.current_design_flow_role() = 'sv' and is_active = true)
  );
drop policy if exists "designer can manage request products" on public.request_products;
create policy "designer can manage request products" on public.request_products
  for all to authenticated using (public.current_design_flow_role() = 'designer')
  with check (public.current_design_flow_role() = 'designer');

alter table public.design_files drop constraint if exists design_files_kind_check;
alter table public.design_files add constraint design_files_kind_check
  check (kind in ('request_attachment','draft','final','review_attachment'));

grant insert (print_side) on public.requests to anon;
