import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStates, fetchDistricts, fetchCategories } from "@/lib/tenders";
import { X, SlidersHorizontal, MapPin, Building2, Tags, IndianRupee, CalendarClock, RotateCcw } from "lucide-react";
import { formatINR } from "@/lib/format";

export interface FilterValues {
  stateId?: string;
  districtId?: string;
  categoryId?: string;
  typeTag?: string;
  budgetMin?: number;
  budgetMax?: number;
  closingBefore?: string;
}

interface TenderFiltersProps {
  values: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  onReset: () => void;
}

const BUDGET_MIN = 0;
const BUDGET_MAX = 500000000; // ₹50 Cr
const TYPE_TAGS = ["Goods", "Works", "Services", "Multiple"];

const AMOUNT_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: "Under ₹10 L", max: 1000000 },
  { label: "₹10 L – ₹1 Cr", min: 1000000, max: 10000000 },
  { label: "₹1 Cr – ₹10 Cr", min: 10000000, max: 100000000 },
  { label: "Above ₹10 Cr", min: 100000000 },
];

const CLOSING_PRESETS: Array<{ label: string; days: number }> = [
  { label: "Next 7 days", days: 7 },
  { label: "Next 15 days", days: 15 },
  { label: "Next 30 days", days: 30 },
  { label: "Next 60 days", days: 60 },
];

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
        {children}
      </span>
    </div>
  );
}

export function TenderFilters({ values, onChange, onReset }: TenderFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: fetchStates });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", values.stateId ?? null],
    queryFn: () => fetchDistricts(values.stateId ?? null),
    enabled: !!values.stateId,
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [minInput, setMinInput] = useState<string>(values.budgetMin ? String(values.budgetMin) : "");
  const [maxInput, setMaxInput] = useState<string>(values.budgetMax ? String(values.budgetMax) : "");
  useEffect(() => { setMinInput(values.budgetMin ? String(values.budgetMin) : ""); }, [values.budgetMin]);
  useEffect(() => { setMaxInput(values.budgetMax ? String(values.budgetMax) : ""); }, [values.budgetMax]);

  const activeCount = [
    values.stateId,
    values.districtId,
    values.categoryId,
    values.typeTag,
    values.budgetMin,
    values.budgetMax,
    values.closingBefore,
  ].filter((v) => v != null && v !== "").length;

  const activePreset = AMOUNT_PRESETS.findIndex(
    (p) => (p.min ?? undefined) === values.budgetMin && (p.max ?? undefined) === values.budgetMax
  );

  const body = (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-foreground">Refine Tenders</h3>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            type="button"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <SectionLabel icon={MapPin}>Location</SectionLabel>
        <div className="space-y-2">
          <select
            value={values.stateId ?? ""}
            onChange={(e) =>
              onChange({ stateId: e.target.value || undefined, districtId: undefined })
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={values.districtId ?? ""}
            onChange={(e) => onChange({ districtId: e.target.value || undefined })}
            disabled={!values.stateId}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {values.stateId ? "All Districts" : "Select state first"}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <SectionLabel icon={Building2}>Category</SectionLabel>
        <select
          value={values.categoryId ?? ""}
          onChange={(e) => onChange({ categoryId: e.target.value || undefined })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tender Type */}
      <div>
        <SectionLabel icon={Tags}>Tender Type</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_TAGS.map((t) => {
            const active = values.typeTag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ typeTag: active ? undefined : t })}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tender Amount */}
      <div>
        <SectionLabel icon={IndianRupee}>Tender Amount</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {AMOUNT_PRESETS.map((p, idx) => {
            const active = activePreset === idx;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  onChange({
                    budgetMin: active ? undefined : p.min,
                    budgetMax: active ? undefined : p.max,
                  })
                }
                className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">MIN (₹)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onBlur={() =>
                onChange({ budgetMin: minInput ? Math.max(BUDGET_MIN, Number(minInput)) : undefined })
              }
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">MAX (₹)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="No limit"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={() =>
                onChange({ budgetMax: maxInput ? Math.min(BUDGET_MAX, Number(maxInput)) : undefined })
              }
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            />
          </div>
        </div>
        {(values.budgetMin != null || values.budgetMax != null) && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Range: {values.budgetMin != null ? formatINR(values.budgetMin) : "₹0"} –{" "}
            {values.budgetMax != null ? formatINR(values.budgetMax) : "No limit"}
          </p>
        )}
      </div>

      {/* Closing Date */}
      <div>
        <SectionLabel icon={CalendarClock}>Closing Date</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          {CLOSING_PRESETS.map((p) => {
            const iso = addDaysISO(p.days);
            const active = values.closingBefore === iso;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ closingBefore: active ? undefined : iso })}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">CLOSES BEFORE</label>
        <input
          type="date"
          value={values.closingBefore ?? ""}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ closingBefore: e.target.value || undefined })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle — big & highlighted */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden group relative w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-base font-bold shadow-lg shadow-primary/25 ring-2 ring-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all"
      >
        <span className="absolute -top-2 -right-2 inline-flex h-6 items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md">
          New
        </span>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="absolute inset-0 rounded-lg animate-ping bg-white/20" aria-hidden />
        </span>
        <span className="tracking-wide">Filter Tenders</span>
        {activeCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-white text-primary text-xs font-extrabold shadow-sm">
            {activeCount}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-primary-foreground/85 bg-white/15 px-2 py-0.5 rounded-md ring-1 ring-white/20">
            Tap
          </span>
        )}
      </button>


      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-20 self-start w-full">
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          {body}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative ml-auto w-[88%] max-w-sm h-full bg-background overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mt-8">{body}</div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold shadow-sm"
            >
              Show results
            </button>
          </div>
        </div>
      )}
    </>
  );
}
