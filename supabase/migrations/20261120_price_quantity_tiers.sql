-- Quantity break pricing: each threshold sets the per-piece price from that quantity onward.
alter table public.price_items
  add column if not exists quantity_tiers jsonb not null default '[]'::jsonb;
