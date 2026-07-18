import { supabase } from "@/integrations/supabase/client";

export interface Tender {
  id: string;
  tender_reference: string;
  title: string;
  description: string | null;
  category_id: string | null;
  state_id: string | null;
  district_id: string | null;
  estimated_value: number | null;
  currency: string;
  issuing_authority: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  emd_amount: number | null;
  tender_fee: number | null;
  security_deposit_amount: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
  date_mode?: "fixed" | "relative" | null;
  publish_offset_days?: number | null;
  submission_offset_days?: number | null;
  opening_offset_days?: number | null;
  auto_update_dates?: boolean | null;
  category?: { id: string; name: string; tender_type_tag: string | null } | null;
  state?: { id: string; name: string; code: string } | null;
  district?: { id: string; name: string } | null;
}

export interface Category {
  id: string;
  name: string;
  tender_type_tag: string | null;
  description: string | null;
  icon: string | null;
  display_order: number;
}

export interface State {
  id: string;
  name: string;
  code: string;
}

export interface District {
  id: string;
  name: string;
  state_id: string;
}

const TENDER_SELECT = `
  id, tender_reference, title, description, category_id, state_id, district_id,
  estimated_value, currency, issuing_authority, publish_date, submission_deadline,
  opening_date, emd_amount, tender_fee, security_deposit_amount, status, is_active, created_at,
  date_mode, publish_offset_days, submission_offset_days, opening_offset_days, auto_update_dates,
  category:tender_categories(id, name, tender_type_tag),
  state:states(id, name, code),
  district:districts(id, name)
`;

// Spec 9.1 — Dynamic Date System.
// For tenders in relative + auto_update mode, compute the effective dates
// from today + offsets on every read (client-side "server-side-on-read").
function applyDynamicDates<T extends Tender>(t: T): T {
  if (t.date_mode !== "relative" || !t.auto_update_dates) return t;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (n: number | null | undefined) => {
    if (n == null) return null;
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };
  return {
    ...t,
    publish_date: t.publish_offset_days != null ? addDays(t.publish_offset_days)!.slice(0, 10) : t.publish_date,
    submission_deadline: addDays(t.submission_offset_days) ?? t.submission_deadline,
    opening_date: addDays(t.opening_offset_days) ?? t.opening_date,
  };
}

export interface TenderListFilters {
  stateId?: string;
  districtId?: string;
  categoryId?: string;
  typeTag?: string;
  budgetMin?: number;
  budgetMax?: number;
  closingBefore?: string; // ISO date (yyyy-mm-dd)
  closingAfter?: string;  // ISO date (yyyy-mm-dd)
  sort?: "newest" | "deadline" | "value_high" | "value_low";
  page?: number;
  perPage?: number;
}

export async function fetchTenders(filters: TenderListFilters = {}) {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = supabase
    .from("tenders")
    .select(TENDER_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (filters.stateId) q = q.eq("state_id", filters.stateId);
  if (filters.districtId) q = q.eq("district_id", filters.districtId);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.budgetMin != null) q = q.gte("estimated_value", filters.budgetMin);
  if (filters.budgetMax != null) q = q.lte("estimated_value", filters.budgetMax);
  if (filters.closingBefore) q = q.lte("submission_deadline", `${filters.closingBefore}T23:59:59`);
  if (filters.closingAfter) q = q.gte("submission_deadline", `${filters.closingAfter}T00:00:00`);

  switch (filters.sort ?? "newest") {
    case "deadline":
      q = q.order("submission_deadline", { ascending: true, nullsFirst: false });
      break;
    case "value_high":
      q = q.order("estimated_value", { ascending: false, nullsFirst: false });
      break;
    case "value_low":
      q = q.order("estimated_value", { ascending: true, nullsFirst: false });
      break;
    default:
      q = q
        .order("publish_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;

  let rows = ((data ?? []) as unknown as Tender[]).map(applyDynamicDates);
  if (filters.typeTag) {
    rows = rows.filter((t) => t.category?.tender_type_tag === filters.typeTag);
  }

  return { rows, total: count ?? 0, page, perPage };
}

export async function fetchFeaturedTenders(limit = 6) {
  // Single round-trip: fetch a pool of recent active tenders, then pick a
  // varied mix across value bands client-side. Much faster than 5 parallel
  // network calls (was ~3-5s on slow connections, now ~1 request).
  const bands: Array<{ min: number; max: number }> = [
    { min: 500000, max: 7500000 },
    { min: 7500000, max: 30000000 },
    { min: 30000000, max: 100000000 },
    { min: 100000000, max: 300000000 },
    { min: 300000000, max: 1000000000 },
  ];

  const { data } = await supabase
    .from("tenders")
    .select(TENDER_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(60);

  const pool = ((data ?? []) as unknown as Tender[]).map(applyDynamicDates);

  // Bucket by value band
  const buckets: Tender[][] = bands.map(() => []);
  const leftovers: Tender[] = [];
  for (const t of pool) {
    const v = t.estimated_value ?? 0;
    const idx = bands.findIndex((b) => v >= b.min && v < b.max);
    if (idx >= 0) buckets[idx].push(t);
    else leftovers.push(t);
  }

  // Within each band, interleave by tender_type_tag so featured has a mix
  // of Goods / Services / Works / Multiple rather than all Goods first.
  const typeOrder = ["Goods", "Services", "Works", "Multiple"];
  const interleaveByType = (arr: Tender[]): Tender[] => {
    const byType: Record<string, Tender[]> = {};
    for (const t of arr) {
      const tag = t.category?.tender_type_tag ?? "Other";
      (byType[tag] ??= []).push(t);
    }
    const keys = [...typeOrder.filter((k) => byType[k]?.length), ...Object.keys(byType).filter((k) => !typeOrder.includes(k))];
    const out: Tender[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const k of keys) {
        const next = byType[k]?.shift();
        if (next) { out.push(next); added = true; }
      }
    }
    return out;
  };
  for (let i = 0; i < buckets.length; i++) buckets[i] = interleaveByType(buckets[i]);

  // Interleave one from each band, then top up from leftovers
  const picked: Tender[] = [];
  const seen = new Set<string>();
  while (picked.length < limit && buckets.some((q) => q.length > 0)) {
    for (const q of buckets) {
      const next = q.shift();
      if (next && !seen.has(next.id)) {
        seen.add(next.id);
        picked.push(next);
        if (picked.length >= limit) break;
      }
    }
  }
  for (const t of interleaveByType(leftovers)) {
    if (picked.length >= limit) break;
    if (!seen.has(t.id)) { seen.add(t.id); picked.push(t); }
  }

  return picked;
}

export async function fetchTenderById(id: string) {
  const { data, error } = await supabase
    .from("tenders")
    .select(TENDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as Tender | null;
  return row ? applyDynamicDates(row) : null;
}

export async function fetchRelatedTenders(tender: Tender, limit = 3) {
  let q = supabase
    .from("tenders")
    .select(TENDER_SELECT)
    .eq("is_active", true)
    .neq("id", tender.id);
  if (tender.category_id) q = q.eq("category_id", tender.category_id);
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Tender[]).map(applyDynamicDates);
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("tender_categories")
    .select("id, name, tender_type_tag, description, icon, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchStates() {
  const { data, error } = await supabase
    .from("states")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as State[];
}

export async function fetchDistricts(stateId: string | null) {
  if (!stateId) return [];
  const { data, error } = await supabase
    .from("districts")
    .select("id, name, state_id")
    .eq("state_id", stateId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as District[];
}
