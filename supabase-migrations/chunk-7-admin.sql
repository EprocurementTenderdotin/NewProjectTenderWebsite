-- ============================================================================
-- CHUNK 7 — Admin Panel additions
-- Run AFTER chunk-2-schema.sql, chunk-3-seed.sql, chunk-6-track.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tender extras for admin form (single estimated_value + dynamic dates)
-- ----------------------------------------------------------------------------
alter table public.tenders
  add column if not exists tender_fee              numeric(15,2),
  add column if not exists security_deposit_amount numeric(15,2),
  add column if not exists date_mode               text not null default 'fixed'
    check (date_mode in ('fixed', 'relative')),
  add column if not exists publish_offset_days     int,
  add column if not exists submission_offset_days  int,
  add column if not exists opening_offset_days     int,
  add column if not exists auto_update_dates       boolean not null default false;

-- Roll-forward function for tenders in "relative + auto_update" mode.
-- Recomputes publish/submission/opening dates from today + offsets.
create or replace function public.roll_forward_tender_dates()
returns void
language sql
security definer
set search_path = public
as $$
  update public.tenders
     set publish_date        = case when publish_offset_days    is not null
                                    then (current_date + publish_offset_days)::date end,
         submission_deadline = case when submission_offset_days is not null
                                    then (current_date + submission_offset_days) end,
         opening_date        = case when opening_offset_days    is not null
                                    then (current_date + opening_offset_days)     end,
         updated_at = now()
   where date_mode = 'relative' and auto_update_dates = true;
$$;

-- ----------------------------------------------------------------------------
-- 2. Call tracking columns on applications
-- ----------------------------------------------------------------------------
alter table public.applications
  add column if not exists call_scheduled_date date,
  add column if not exists call_status         text
    check (call_status in ('pending','completed','no_answer','rescheduled','not_interested')),
  add column if not exists call_remarks        text;

create index if not exists idx_applications_call_date on public.applications(call_scheduled_date);

-- Seed: any app with callback_scheduled_at but no call_scheduled_date → copy over
update public.applications
   set call_scheduled_date = callback_scheduled_at::date
 where call_scheduled_date is null and callback_scheduled_at is not null;

-- ----------------------------------------------------------------------------
-- 3. Realtime for /track live updates
-- ----------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.status_history; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.applications; exception when duplicate_object then null; end;
end$$;

-- ----------------------------------------------------------------------------
-- 4. Admin dashboard stats RPC
-- ----------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')) then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'total_applications', (select count(*) from public.applications),
    'total_tenders',      (select count(*) from public.tenders where is_active = true),
    'total_leads',        (select count(*) from public.leads_tracking),
    'calls_due_today',    (select count(*) from public.applications
                            where call_scheduled_date <= current_date
                              and coalesce(call_status,'pending') = 'pending'),
    'new_this_week',      (select count(*) from public.applications
                            where created_at >= now() - interval '7 days'),
    'status_breakdown',   (select jsonb_object_agg(status, cnt)
                             from (select status::text as status, count(*) as cnt
                                     from public.applications group by status) s),
    'by_day',             (select coalesce(jsonb_agg(row_to_json(d) order by d.day),'[]'::jsonb)
                             from (select date_trunc('day', created_at)::date as day,
                                          count(*) as count
                                     from public.applications
                                    where created_at >= now() - interval '30 days'
                                    group by 1) d)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.roll_forward_tender_dates() to authenticated, service_role;

-- ============================================================================
-- 5. HOW TO SEED THE ADMIN USER
-- ============================================================================
-- Step A: Supabase Dashboard → Authentication → Users → "Add user" → email+password.
--         Confirm the user (auto-confirm on).
-- Step B: Copy that user's UUID and run:
--
--   insert into public.user_roles (user_id, role)
--   values ('<PASTE-UUID-HERE>', 'admin')
--   on conflict (user_id, role) do nothing;
--
--   insert into public.admin_users (user_id, full_name)
--   values ('<PASTE-UUID-HERE>', 'Site Admin')
--   on conflict (user_id) do nothing;
-- ============================================================================
