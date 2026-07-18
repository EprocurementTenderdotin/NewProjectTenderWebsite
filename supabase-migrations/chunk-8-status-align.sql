-- ============================================================================
-- CHUNK 8 — Align application_status enum + admin doc categories with spec 8.4/8.5
-- Adds spec's exact status values while preserving legacy ones for existing rows.
-- ============================================================================

-- 1. Add new enum values (idempotent)
do $$
begin
  begin alter type public.application_status add value if not exists 'application_received'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'under_verification'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'additional_documents_required'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'call_scheduled'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'call_completed'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'tender_documents_shared'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'security_deposit_pending'; exception when others then null; end;
  begin alter type public.application_status add value if not exists 'aoc_work_order_issued'; exception when others then null; end;
end$$;

-- 2. Default status for new applications → 'application_received'
alter table public.applications
  alter column status set default 'application_received';
