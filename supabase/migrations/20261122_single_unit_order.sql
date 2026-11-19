-- Allow orders in increments of one from each product's minimum quantity.
alter table public.request_products
  add column if not exists single_unit_order boolean not null default false;
