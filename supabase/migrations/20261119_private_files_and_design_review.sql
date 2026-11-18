-- Private request attachments and requester review links.
-- Run in Supabase Dashboard > SQL Editor after the previous migrations.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-flow-files',
  'design-flow-files',
  false,
  20971520,
  array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf','application/postscript','image/vnd.adobe.photoshop']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.design_files (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests(id) on delete cascade,
  review_id uuid,
  kind text not null check (kind in ('request_attachment','draft','final')),
  version integer not null default 0 check (version >= 0),
  file_name text not null,
  object_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  description text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

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

alter table public.design_reviews drop constraint if exists design_reviews_status_check;
alter table public.design_reviews
  add constraint design_reviews_status_check
  check (status in ('pending','revision_requested','approved','superseded'));

alter table public.design_files add column if not exists review_id uuid references public.design_reviews(id) on delete set null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'design_files_review_id_fkey'
      and conrelid = 'public.design_files'::regclass
  ) then
    alter table public.design_files
      add constraint design_files_review_id_fkey
      foreign key (review_id) references public.design_reviews(id) on delete set null;
  end if;
end $$;
create index if not exists design_files_request_idx on public.design_files(request_id, created_at desc);
create index if not exists design_reviews_request_idx on public.design_reviews(request_id, created_at desc);

alter table public.design_files enable row level security;
alter table public.design_reviews enable row level security;
revoke all on public.design_files, public.design_reviews from anon, authenticated;
grant select, insert on public.design_files to authenticated;
grant select on public.design_reviews to authenticated;

drop policy if exists "staff can read design files" on public.design_files;
create policy "staff can read design files" on public.design_files
  for select to authenticated
  using (public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "staff can upload allowed design files" on public.design_files;
create policy "staff can upload allowed design files" on public.design_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.current_design_flow_role() = 'designer'
      or (public.current_design_flow_role() = 'sv' and kind = 'request_attachment')
    )
  );
drop policy if exists "designer can read design reviews" on public.design_reviews;
create policy "designer can read design reviews" on public.design_reviews
  for select to authenticated
  using (public.current_design_flow_role() = 'designer');

drop policy if exists "staff can upload design flow files" on storage.objects;
create policy "staff can upload design flow files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'design-flow-files'
    and (
      public.current_design_flow_role() = 'designer'
      or (public.current_design_flow_role() = 'sv' and (storage.foldername(name))[2] = 'request_attachment')
    )
  );
drop policy if exists "staff can read design flow files" on storage.objects;
create policy "staff can read design flow files" on storage.objects
  for select to authenticated
  using (bucket_id = 'design-flow-files' and public.current_design_flow_role() in ('designer','sv'));
drop policy if exists "designer can delete design flow files" on storage.objects;
create policy "designer can delete design flow files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'design-flow-files' and public.current_design_flow_role() = 'designer');

