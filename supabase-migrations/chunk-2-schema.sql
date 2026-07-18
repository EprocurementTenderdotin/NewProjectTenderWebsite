-- ============================================================================
-- eProcurementTender.com — CHUNK 2: Complete Database Schema (v2 — FIXED)
-- Run this ENTIRE file in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: drops previous objects first.
-- ============================================================================

-- ============================================================================
-- 0. CLEAN SLATE (drop everything from previous partial run)
-- ============================================================================
drop table if exists public.status_history        cascade;
drop table if exists public.admin_documents        cascade;
drop table if exists public.customer_documents     cascade;
drop table if exists public.leads_tracking         cascade;
drop table if exists public.applications           cascade;
drop table if exists public.admin_users            cascade;
drop table if exists public.user_roles             cascade;
drop table if exists public.tenders                cascade;
drop table if exists public.tender_categories      cascade;
drop table if exists public.districts              cascade;
drop table if exists public.states                 cascade;

drop function if exists public.has_role(uuid, public.app_role) cascade;
drop function if exists public.generate_application_id()       cascade;
drop function if exists public.set_updated_at()                cascade;

drop sequence if exists public.application_id_seq cascade;

drop type if exists public.doc_verification_status cascade;
drop type if exists public.document_type            cascade;
drop type if exists public.application_status       cascade;
drop type if exists public.app_role                 cascade;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
create type public.app_role as enum ('admin', 'super_admin', 'customer');

create type public.application_status as enum (
  'submitted',
  'under_review',
  'callback_scheduled',
  'tender_shared',
  'documents_requested',
  'documents_uploaded',
  'documents_verified',
  'loa_issued',
  'security_deposit_paid',
  'aoc_issued',
  'completed',
  'rejected',
  'cancelled'
);

create type public.document_type as enum (
  'pan_card',
  'aadhaar_card',
  'gst_certificate',
  'company_registration',
  'bank_statement',
  'itr',
  'experience_certificate',
  'other'
);

create type public.doc_verification_status as enum ('pending', 'approved', 'rejected');

-- ============================================================================
-- 2. APPLICATION ID SEQUENCE — EPT-2026-000001 format (server-side only)
-- ============================================================================
create sequence public.application_id_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.generate_application_id()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'EPT-2026-' || lpad(nextval('public.application_id_seq')::text, 6, '0');
$$;

-- ============================================================================
-- 3. REFERENCE TABLES
-- ============================================================================
create table public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (state_id, name)
);
create index idx_districts_state on public.districts(state_id);

create table public.tender_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  tender_type_tag text,
  icon text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. TENDERS (admin-managed, single estimated_value field)
-- ============================================================================
create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  tender_reference text not null unique,
  title text not null,
  description text,
  category_id uuid references public.tender_categories(id) on delete set null,
  state_id uuid references public.states(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  estimated_value numeric(15, 2),
  currency text not null default 'INR',
  issuing_authority text,
  publish_date date,
  submission_deadline timestamptz,
  opening_date timestamptz,
  emd_amount numeric(15, 2),
  tender_document_url text,
  status text not null default 'active',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tenders_state on public.tenders(state_id);
create index idx_tenders_district on public.tenders(district_id);
create index idx_tenders_category on public.tenders(category_id);
create index idx_tenders_active on public.tenders(is_active) where is_active = true;

-- ============================================================================
-- 5. USER ROLES (separate table — NEVER on profiles)
-- ============================================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  unique (user_id, role)
);
create index idx_user_roles_user on public.user_roles(user_id);

-- security definer role check (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- ============================================================================
-- 6. ADMIN USERS
-- ============================================================================
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  designation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 7. APPLICATIONS (with budget_range_min & budget_range_max)
-- NOTE: `application_id` (text) is the EPT-2026-000001 code.
--       `id` (uuid) is the primary key referenced by child tables.
-- ============================================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null unique default public.generate_application_id(),

  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  company_name text,
  gst_number text,

  state_id uuid references public.states(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,

  budget_range_min numeric(15, 2) not null,
  budget_range_max numeric(15, 2) not null,

  category_id uuid references public.tender_categories(id) on delete set null,
  tender_type_preference text,
  additional_notes text,

  status public.application_status not null default 'submitted',
  assigned_admin_id uuid references auth.users(id) on delete set null,

  matched_tender_id uuid references public.tenders(id) on delete set null,

  callback_scheduled_at timestamptz,
  callback_notes text,

  loa_amount numeric(15, 2),
  security_deposit_amount numeric(15, 2),
  aoc_amount numeric(15, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_range_valid check (budget_range_max >= budget_range_min)
);
create index idx_applications_user on public.applications(user_id);
create index idx_applications_status on public.applications(status);
create index idx_applications_admin on public.applications(assigned_admin_id);
create index idx_applications_app_id on public.applications(application_id);

-- ============================================================================
-- 8. CUSTOMER DOCUMENTS
-- Child FK column is renamed `app_id` to avoid ambiguity with
-- applications.application_id (text) inside RLS subqueries.
-- ============================================================================
create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.applications(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  document_type public.document_type not null,
  document_name text not null,
  file_path text not null,
  file_size_bytes bigint,
  mime_type text,
  verification_status public.doc_verification_status not null default 'pending',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  uploaded_at timestamptz not null default now()
);
create index idx_customer_docs_app on public.customer_documents(app_id);

-- ============================================================================
-- 9. ADMIN DOCUMENTS
-- ============================================================================
create table public.admin_documents (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.applications(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  document_name text not null,
  document_category text,
  file_path text not null,
  file_size_bytes bigint,
  mime_type text,
  description text,
  is_visible_to_customer boolean not null default true,
  uploaded_at timestamptz not null default now()
);
create index idx_admin_docs_app on public.admin_documents(app_id);

-- ============================================================================
-- 10. STATUS HISTORY
-- ============================================================================
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.applications(id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  notes text,
  changed_at timestamptz not null default now()
);
create index idx_status_history_app on public.status_history(app_id);

-- ============================================================================
-- 11. LEADS TRACKING
-- ============================================================================
create table public.leads_tracking (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  message text,
  source text,
  state_id uuid references public.states(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  is_contacted boolean not null default false,
  contacted_by uuid references auth.users(id) on delete set null,
  contacted_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_leads_contacted on public.leads_tracking(is_contacted);

-- ============================================================================
-- 12. UPDATED_AT TRIGGERS
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tenders_updated_at before update on public.tenders
  for each row execute function public.set_updated_at();
create trigger trg_applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger trg_admin_users_updated_at before update on public.admin_users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 13. GRANTS
-- ============================================================================
grant select on public.states to anon, authenticated;
grant select on public.districts to anon, authenticated;
grant select on public.tender_categories to anon, authenticated;
grant all on public.states, public.districts, public.tender_categories to service_role;

grant select on public.tenders to anon, authenticated;
grant insert, update, delete on public.tenders to authenticated;
grant all on public.tenders to service_role;

grant select, insert, update on public.applications to authenticated;
grant insert on public.applications to anon;
grant all on public.applications to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

grant select, insert, update on public.customer_documents to authenticated;
grant all on public.customer_documents to service_role;

grant select, insert, update, delete on public.admin_documents to authenticated;
grant all on public.admin_documents to service_role;

grant select, insert on public.status_history to authenticated;
grant all on public.status_history to service_role;

grant insert on public.leads_tracking to anon, authenticated;
grant select, update on public.leads_tracking to authenticated;
grant all on public.leads_tracking to service_role;

grant usage on sequence public.application_id_seq to anon, authenticated, service_role;

-- ============================================================================
-- 14. ENABLE RLS
-- ============================================================================
alter table public.states              enable row level security;
alter table public.districts           enable row level security;
alter table public.tender_categories   enable row level security;
alter table public.tenders             enable row level security;
alter table public.user_roles          enable row level security;
alter table public.admin_users         enable row level security;
alter table public.applications        enable row level security;
alter table public.customer_documents  enable row level security;
alter table public.admin_documents     enable row level security;
alter table public.status_history      enable row level security;
alter table public.leads_tracking      enable row level security;

-- ============================================================================
-- 15. RLS POLICIES
-- ============================================================================

-- STATES / DISTRICTS / CATEGORIES
create policy "public read active states" on public.states
  for select to anon, authenticated using (is_active = true);
create policy "admin manage states" on public.states
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy "public read active districts" on public.districts
  for select to anon, authenticated using (is_active = true);
create policy "admin manage districts" on public.districts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy "public read active categories" on public.tender_categories
  for select to anon, authenticated using (is_active = true);
create policy "admin manage categories" on public.tender_categories
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- TENDERS
create policy "public read active tenders" on public.tenders
  for select to anon, authenticated using (is_active = true);
create policy "admin read all tenders" on public.tenders
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin manage tenders" on public.tenders
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES
create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "super_admin manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ADMIN_USERS
create policy "admin reads all admin_users" on public.admin_users
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin user reads own" on public.admin_users
  for select to authenticated using (user_id = auth.uid());
create policy "super_admin manage admin_users" on public.admin_users
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- APPLICATIONS
create policy "anyone can submit application" on public.applications
  for insert to anon, authenticated with check (true);
create policy "user reads own application" on public.applications
  for select to authenticated using (user_id = auth.uid());
create policy "user updates own application" on public.applications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads all applications" on public.applications
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin updates all applications" on public.applications
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- CUSTOMER_DOCUMENTS (uses fully qualified column refs to avoid ambiguity)
create policy "user reads own documents" on public.customer_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = customer_documents.app_id and a.user_id = auth.uid()
    )
  );
create policy "user uploads own documents" on public.customer_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from public.applications a
      where a.id = customer_documents.app_id and a.user_id = auth.uid()
    )
  );
create policy "admin reads all customer docs" on public.customer_documents
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin updates customer docs" on public.customer_documents
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- ADMIN_DOCUMENTS
create policy "user reads visible admin docs" on public.admin_documents
  for select to authenticated
  using (
    is_visible_to_customer = true
    and exists (
      select 1 from public.applications a
      where a.id = admin_documents.app_id and a.user_id = auth.uid()
    )
  );
create policy "admin manage admin_documents" on public.admin_documents
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- STATUS_HISTORY
create policy "user reads own status history" on public.status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = status_history.app_id and a.user_id = auth.uid()
    )
  );
create policy "admin reads all status history" on public.status_history
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin writes status history" on public.status_history
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- LEADS_TRACKING
create policy "anyone submits lead" on public.leads_tracking
  for insert to anon, authenticated with check (true);
create policy "admin reads leads" on public.leads_tracking
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admin updates leads" on public.leads_tracking
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- DONE. Verify:
--   select public.generate_application_id();   -- returns EPT-2026-000001
--   select table_name from information_schema.tables
--     where table_schema='public' order by table_name;  -- 11 tables
-- ============================================================================
