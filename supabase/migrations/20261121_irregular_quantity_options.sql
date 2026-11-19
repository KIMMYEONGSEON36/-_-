-- Explicit, irregular allowed order quantities per product.
alter table public.request_products
  add column if not exists quantity_options jsonb not null default '[]'::jsonb;
alter table public.request_products
  drop constraint if exists request_products_quantity_options_check;
alter table public.request_products
  add constraint request_products_quantity_options_check check (jsonb_typeof(quantity_options) = 'array');

update public.request_products
set quantity_options = case
  when product = '포스터' then '[5,10,20,30,40,80]'::jsonb
  else (select coalesce(jsonb_agg(q order by q), '[]'::jsonb)
        from generate_series(minimum_quantity, minimum_quantity + quantity_step * 9, quantity_step) as quantities(q))
end
where quantity_options = '[]'::jsonb;
