-- ============================================================================
-- CHUNK 6 — Track Status page: public lookup RPC, upload RPC, rate limiting,
-- admin notifications, storage policies. Re-runnable.
-- ============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Rate-limit log (anon-writable only via SECURITY DEFINER function)
-- ------------------------------------------------------------------
create table if not exists public.track_lookup_log (
  ip_hash text not null,
  minute_bucket timestamptz not null,
  count int not null default 1,
  primary key (ip_hash, minute_bucket)
);
alter table public.track_lookup_log enable row level security;
-- No policies -> only SECURITY DEFINER functions may touch it.
grant all on public.track_lookup_log to service_role;

-- ------------------------------------------------------------------
-- Admin notifications
-- ------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.applications(id) on delete cascade,
  kind text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_notifs_created on public.admin_notifications(created_at desc);
grant select, update on public.admin_notifications to authenticated;
grant all on public.admin_notifications to service_role;
alter table public.admin_notifications enable row level security;
drop policy if exists "admin reads notifications" on public.admin_notifications;
create policy "admin reads notifications" on public.admin_notifications
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- ------------------------------------------------------------------
-- PUBLIC LOOKUP RPC (rate limited: 5 / minute / IP)
-- ------------------------------------------------------------------
create or replace function public.lookup_application(p_app_id text, p_mobile text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip text;
  v_bucket timestamptz;
  v_count int;
  v_app record;
  v_history jsonb;
  v_admin_docs jsonb;
  v_customer_docs jsonb;
begin
  -- Rate limit
  begin
    v_ip := coalesce(
      split_part(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ',', 1),
      'unknown'
    );
  exception when others then
    v_ip := 'unknown';
  end;
  v_bucket := date_trunc('minute', now());

  insert into public.track_lookup_log (ip_hash, minute_bucket, count)
  values (encode(digest(v_ip, 'sha256'), 'hex'), v_bucket, 1)
  on conflict (ip_hash, minute_bucket)
  do update set count = public.track_lookup_log.count + 1
  returning count into v_count;

  if v_count > 5 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  -- Cleanup old rows opportunistically
  delete from public.track_lookup_log where minute_bucket < now() - interval '1 hour';

  -- Lookup
  select * into v_app
  from public.applications
  where application_id = p_app_id and phone = p_mobile
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.changed_at asc), '[]'::jsonb) into v_history
  from (
    select id, from_status, to_status, notes, changed_at
    from public.status_history where app_id = v_app.id
  ) h;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.uploaded_at desc), '[]'::jsonb) into v_admin_docs
  from (
    select id, document_name, document_category, file_path, mime_type,
           file_size_bytes, description, uploaded_at
    from public.admin_documents
    where app_id = v_app.id and is_visible_to_customer = true
  ) d;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.uploaded_at desc), '[]'::jsonb) into v_customer_docs
  from (
    select id, document_type, document_name, file_path, mime_type,
           file_size_bytes, verification_status, uploaded_at
    from public.customer_documents where app_id = v_app.id
  ) d;

  return jsonb_build_object(
    'found', true,
    'app', jsonb_build_object(
      'id', v_app.id,
      'application_id', v_app.application_id,
      'full_name', v_app.full_name,
      'company_name', v_app.company_name,
      'phone', v_app.phone,
      'email', v_app.email,
      'status', v_app.status,
      'callback_scheduled_at', v_app.callback_scheduled_at,
      'created_at', v_app.created_at
    ),
    'history', v_history,
    'admin_documents', v_admin_docs,
    'customer_documents', v_customer_docs
  );
end;
$$;

grant execute on function public.lookup_application(text, text) to anon, authenticated;

-- ------------------------------------------------------------------
-- SUBMIT CUSTOMER DOCUMENT RPC (verifies app+mobile ownership)
-- ------------------------------------------------------------------
create or replace function public.submit_customer_document(
  p_app_id text,
  p_mobile text,
  p_document_type public.document_type,
  p_document_name text,
  p_file_path text,
  p_file_size bigint,
  p_mime_type text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_app record;
  v_doc_id uuid;
begin
  select * into v_app from public.applications
  where application_id = p_app_id and phone = p_mobile
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.customer_documents
    (app_id, document_type, document_name, file_path, file_size_bytes, mime_type)
  values
    (v_app.id, p_document_type, p_document_name, p_file_path, p_file_size, p_mime_type)
  returning id into v_doc_id;

  insert into public.admin_notifications (app_id, kind, message)
  values (v_app.id, 'document_uploaded',
          v_app.application_id || ' uploaded ' || p_document_name);

  return jsonb_build_object('ok', true, 'id', v_doc_id);
end;
$$;

grant execute on function public.submit_customer_document(
  text, text, public.document_type, text, text, bigint, text
) to anon, authenticated;

-- ------------------------------------------------------------------
-- SIGNED URL helper (delegates to storage extension; anon needs SELECT
-- policy below so createSignedUrl works from browser).
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- STORAGE POLICIES
-- Bucket `customer-uploads` must be created manually (Dashboard → Storage,
-- private). Then run these policies:
-- ------------------------------------------------------------------
do $$
begin
  -- Drop existing to allow re-run
  execute 'drop policy if exists "track read customer-uploads" on storage.objects';
  execute 'drop policy if exists "track insert customer-uploads" on storage.objects';
exception when undefined_object then null;
end $$;

create policy "track read customer-uploads" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'customer-uploads');

create policy "track insert customer-uploads" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'customer-uploads');

-- Done.
