-- ============================================================================
-- CHUNK 9 — Create separate `admin-uploads` bucket for admin-published docs
-- Spec 12.1 checklist requires two private buckets: customer-docs + admin-docs
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-uploads',
  'admin-uploads',
  false,
  10485760, -- 10 MB (admin PDFs can be larger)
  array['application/pdf','image/jpeg','image/jpg','image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Service role full access
drop policy if exists "admin-uploads service all" on storage.objects;
create policy "admin-uploads service all"
on storage.objects
for all
to service_role
using (bucket_id = 'admin-uploads')
with check (bucket_id = 'admin-uploads');

-- Authenticated admins can upload + read (admin panel uses browser client)
drop policy if exists "admin-uploads admin write" on storage.objects;
create policy "admin-uploads admin write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'admin-uploads'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admin-uploads admin read" on storage.objects;
create policy "admin-uploads admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'admin-uploads'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- Block anon direct access (signed URLs still work via service role)
drop policy if exists "admin-uploads no public read" on storage.objects;
create policy "admin-uploads no public read"
on storage.objects
for select
to anon
using (false);
