-- Create private storage bucket for customer uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-uploads',
  'customer-uploads',
  false,
  5242880, -- 5 MB
  array['application/pdf','image/jpeg','image/jpg','image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Policies: only service_role can read/write directly.
-- Uploads happen via RPC (submit_customer_document) using service role,
-- downloads happen via signed URLs generated server-side.
drop policy if exists "customer-uploads service all" on storage.objects;
create policy "customer-uploads service all"
on storage.objects
for all
to service_role
using (bucket_id = 'customer-uploads')
with check (bucket_id = 'customer-uploads');

-- Block anon/authenticated direct access (signed URLs still work)
drop policy if exists "customer-uploads no public read" on storage.objects;
create policy "customer-uploads no public read"
on storage.objects
for select
to anon, authenticated
using (false);
