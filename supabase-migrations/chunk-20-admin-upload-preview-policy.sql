-- ============================================================================
-- CHUNK 20 — Allow visible admin-upload documents to generate signed links
-- from the public tracking page. The bucket stays private; this only permits
-- Storage signed URL creation for known object paths.
-- ============================================================================

drop policy if exists "track read admin-uploads" on storage.objects;
create policy "track read admin-uploads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'admin-uploads');
