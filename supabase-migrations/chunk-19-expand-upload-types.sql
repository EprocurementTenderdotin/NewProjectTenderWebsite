-- ============================================================================
-- CHUNK 19 — Expand allowed file types & size on customer-uploads and
-- admin-uploads buckets. Customers and admins can now upload PDF, images,
-- Excel, Word, PowerPoint, CSV, TXT (up to 25 MB).
-- ============================================================================

update storage.buckets
set file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg','image/jpg','image/png','image/webp','image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv','text/plain',
      'application/zip','application/x-zip-compressed'
    ]
where id in ('customer-uploads','admin-uploads');
