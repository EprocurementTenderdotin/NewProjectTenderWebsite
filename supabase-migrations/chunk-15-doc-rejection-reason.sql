-- ============================================================================
-- CHUNK 15 — Include rejection_reason in customer_documents payload from
-- lookup_application so /track can show why a doc was rejected.
-- ============================================================================

create or replace function public.lookup_application(p_app_id text, p_mobile text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
  values (encode(extensions.digest(v_ip, 'sha256'), 'hex'), v_bucket, 1)
  on conflict (ip_hash, minute_bucket)
  do update set count = public.track_lookup_log.count + 1
  returning count into v_count;

  if v_count > 5 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  delete from public.track_lookup_log where minute_bucket < now() - interval '1 hour';

  select * into v_app
  from public.applications
  where application_id = p_app_id and phone = p_mobile
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  if coalesce(v_app.is_blocked, false) then
    return jsonb_build_object(
      'found', true,
      'blocked', true,
      'app', jsonb_build_object(
        'id', v_app.id,
        'application_id', v_app.application_id,
        'full_name', v_app.full_name,
        'company_name', v_app.company_name,
        'phone', v_app.phone,
        'email', v_app.email,
        'status', v_app.status,
        'is_blocked', true,
        'custom_status_message', v_app.custom_status_message,
        'customer_upload_enabled', false,
        'callback_scheduled_at', v_app.callback_scheduled_at,
        'created_at', v_app.created_at
      ),
      'history', '[]'::jsonb,
      'admin_documents', '[]'::jsonb,
      'customer_documents', '[]'::jsonb
    );
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
           file_size_bytes, verification_status, rejection_reason, uploaded_at
    from public.customer_documents where app_id = v_app.id
  ) d;

  return jsonb_build_object(
    'found', true,
    'blocked', false,
    'app', jsonb_build_object(
      'id', v_app.id,
      'application_id', v_app.application_id,
      'full_name', v_app.full_name,
      'company_name', v_app.company_name,
      'phone', v_app.phone,
      'email', v_app.email,
      'status', v_app.status,
      'is_blocked', false,
      'custom_status_message', v_app.custom_status_message,
      'customer_upload_enabled', coalesce(v_app.customer_upload_enabled, false),
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
