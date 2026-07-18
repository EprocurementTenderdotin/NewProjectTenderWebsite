import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, Loader2, CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCategories, fetchDistricts, fetchStates } from "@/lib/tenders";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply Now — Get an Expert Call | eProcurementTender.com" },
      { name: "description", content: "Submit your requirement in 7 steps. Our tender expert calls you next day with matched government tenders." },
      { property: "og:title", content: "Apply Now — Get an Expert Call" },
      { property: "og:description", content: "7-step application. Free expert call scheduled for the next day." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/apply" },
    ],
    links: [{ rel: "canonical", href: "/apply" }],
  }),
  component: ApplyPage,
});

const STORAGE_KEY = "ept_apply_wizard_v1";
const TRACK_HANDOFF_KEY = "ept_track_handoff_v1";
const TOTAL_STEPS = 7;

type BusinessType =
  | "Proprietorship"
  | "Partnership"
  | "LLP"
  | "Private Limited"
  | "Public Limited"
  | "Government"
  | "NGO"
  | "Other";

const BUSINESS_TYPES: BusinessType[] = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Government",
  "NGO",
  "Other",
];

type TenderTypePref = "Goods" | "Services" | "Works";

interface WizardData {
  fullName: string;
  mobile: string;
  email: string;
  companyName: string;
  businessType: BusinessType | "";
  tenderType: TenderTypePref | "";
  categoryId: string;
  stateId: string;
  districtId: string;
  budgetMin: number;
  budgetMax: number;
  savedAt?: string;
}

const initialData: WizardData = {
  fullName: "",
  mobile: "",
  email: "",
  companyName: "",
  businessType: "",
  tenderType: "",
  categoryId: "",
  stateId: "",
  districtId: "",
  budgetMin: 10_00_000, // 10L
  budgetMax: 2_00_00_000, // 2Cr
};

const MIN_BUDGET = 1_00_000;
const MAX_BUDGET = 500_00_00_000; // ₹500 Cr

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

const TICKS: { value: number; label: string; mobile?: boolean }[] = [
  { value: 1_00_000, label: "1L", mobile: true },
  { value: 10_00_000, label: "10L" },
  { value: 50_00_000, label: "50L" },
  { value: 1_00_00_000, label: "1Cr", mobile: true },
  { value: 10_00_00_000, label: "10Cr", mobile: true },
  { value: 50_00_00_000, label: "50Cr" },
  { value: 100_00_00_000, label: "100Cr", mobile: true },
  { value: 500_00_00_000, label: "500Cr+", mobile: true },
];

const BUDGET_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Under ₹10L", min: 1_00_000, max: 10_00_000 },
  { label: "₹10L – ₹1Cr", min: 10_00_000, max: 1_00_00_000 },
  { label: "₹1Cr – ₹10Cr", min: 1_00_00_000, max: 10_00_00_000 },
  { label: "₹10Cr – ₹100Cr", min: 10_00_00_000, max: 100_00_00_000 },
  { label: "₹100Cr+", min: 100_00_00_000, max: 500_00_00_000 },
];

const mobileRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const personalSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  mobile: z.string().regex(mobileRegex, "Enter a valid 10-digit Indian mobile"),
  email: z.string().regex(emailRegex, "Enter a valid email").max(255),
  companyName: z.string().trim().min(2, "Enter company name").max(150),
});

function ApplyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [restorePrompt, setRestorePrompt] = useState<WizardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Restore prompt
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WizardData;
        if (parsed.fullName || parsed.mobile || parsed.email) {
          setRestorePrompt(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save every 30s
  useEffect(() => {
    if (submittedId) return;
    const t = setInterval(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...data, savedAt: new Date().toISOString() }),
        );
      } catch {
        /* ignore */
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [data, submittedId]);

  // Save on unmount / step change too (lightweight)
  useEffect(() => {
    if (submittedId) return;
    if (restorePrompt) return; // don't overwrite pending restore
    if (!data.fullName && !data.mobile && !data.email && !data.companyName) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...data, savedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
  }, [step, submittedId, data, restorePrompt]);

  const update = <K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData((d) => ({ ...d, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      const r = personalSchema.safeParse({
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email,
        companyName: data.companyName,
      });
      if (!r.success) {
        for (const issue of r.error.issues) e[issue.path[0] as string] = issue.message;
      }
    } else if (s === 2 && !data.businessType) e.businessType = "Select a business type";
    else if (s === 3 && !data.tenderType) e.tenderType = "Select a tender type";
    else if (s === 4 && !data.categoryId) e.categoryId = "Select a sector";
    else if (s === 5) {
      if (!data.stateId) e.stateId = "Select a state";
      if (!data.districtId) e.districtId = "Select a district";
    } else if (s === 6) {
      if (data.budgetMax < data.budgetMin) e.budgetMax = "Max must be ≥ min";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToStep = (s: number) => {
    setStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    for (let s = 1; s <= 6; s++) {
      if (!validateStep(s)) {
        setStep(s);
        toast.error("Please complete all required fields.");
        return;
      }
    }
    setSubmitting(true);
    try {
      // Spec 10.2 — duplicate warning: same mobile + same district within 24 hrs
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: dupes } = await supabase
        .from("applications")
        .select("id, application_id, created_at")
        .eq("phone", data.mobile.trim())
        .eq("district_id", data.districtId)
        .gte("created_at", since)
        .limit(1);
      if (dupes && dupes.length > 0) {
        const proceed = confirm(
          `A recent application (${dupes[0].application_id}) was submitted from this mobile number for the same district within the last 24 hours. Submit another one anyway?`
        );
        if (!proceed) { setSubmitting(false); return; }
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      const tomorrowDate = tomorrow.toISOString().slice(0, 10);

      const notes = `Business Type: ${data.businessType}`;

      const { data: inserted, error } = await supabase
        .from("applications")
        .insert({
          full_name: data.fullName.trim(),
          email: data.email.trim(),
          phone: data.mobile.trim(),
          company_name: data.companyName.trim(),
          state_id: data.stateId,
          district_id: data.districtId,
          category_id: data.categoryId,
          tender_type_preference: data.tenderType,
          budget_range_min: data.budgetMin,
          budget_range_max: data.budgetMax,
          additional_notes: notes,
          callback_scheduled_at: tomorrow.toISOString(),
          call_scheduled_date: tomorrowDate,
          call_status: "pending",
        })
        .select("application_id")
        .single();

      if (error) throw error;

      const appId = inserted?.application_id ?? "EPT-2026-000001";
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(
        TRACK_HANDOFF_KEY,
        JSON.stringify({ appId, mobile: data.mobile.trim(), savedAt: new Date().toISOString() }),
      );
      setSubmittedId(appId);
      toast.success("Application submitted successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(`Submission failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-4 py-16" style={{ outline: "none" }}>
          <div className="max-w-lg w-full text-center rounded-2xl border bg-card p-8 shadow-sm">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">Thank You!</h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--success)/0.12)] px-3 py-1 text-xs font-semibold text-[hsl(var(--success))]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              Application Submitted
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Your Application ID</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Input
                readOnly
                value={submittedId}
                aria-label="Application ID"
                onFocus={(event) => event.currentTarget.select()}
                className="h-11 max-w-56 text-center font-mono text-lg font-semibold"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy application ID"
                onClick={async () => {
                  const copied = await copyToClipboard(submittedId);
                  if (copied) toast.success("Application ID copied");
                  else toast.error("Select the ID and copy manually");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Thank you! Our expert team will call you within 1 business day with complete information about tenders matching your profile in your selected district. Please keep your phone reachable.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Button asChild variant="outline">
                <Link to="/">Go home</Link>
              </Button>
              <Button asChild>
                <Link to="/track" search={{ appId: submittedId, mobile: data.mobile.trim() }}>Track Status</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      <FloatingButtons />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Restore prompt */}
      <Dialog open={!!restorePrompt} onOpenChange={(o) => !o && setRestorePrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore previous application?</DialogTitle>
            <DialogDescription>
              We found an unfinished application from a previous session
              {restorePrompt?.savedAt ? ` (saved ${new Date(restorePrompt.savedAt).toLocaleString("en-IN")})` : ""}.
              Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setRestorePrompt(null);
              }}
            >
              Start fresh
            </Button>
            <Button
              onClick={() => {
                if (restorePrompt) setData(restorePrompt);
                setRestorePrompt(null);
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main id="main-content" tabIndex={-1} className="flex-1 bg-background" style={{ outline: "none" }}>
        {/* Hero header — matches home page navy gradient */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 600px at 85% -10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(59,130,246,0.35) 0%, transparent 55%), linear-gradient(135deg, #0b1e4d 0%, #12295f 45%, #1e3a8a 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.2px)",
              backgroundSize: "22px 22px",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-4 pt-10 pb-14 sm:pt-14 sm:pb-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-primary-foreground/90 shadow-sm">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Free Expert Consultation
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground">
              Apply for Government Tenders
            </h1>
            <p className="mt-3 text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto">
              Complete these 7 quick steps and our tender expert will call you within 1 business day with matched opportunities.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">


          {/* Progress + stepper */}
          <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Step {step} of {TOTAL_STEPS}
                </div>
                <div className="mt-0.5 text-base font-semibold text-foreground truncate">
                  {stepTitles[step - 1]}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-bold text-foreground">
                  {Math.round((step / TOTAL_STEPS) * 100)}%
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Complete
                </div>
              </div>
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
            <div className="mt-4 flex items-center justify-between gap-1">
              {stepTitles.map((_, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                return (
                  <div key={n} className="flex flex-1 items-center">
                    <div
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-all",
                        done && "bg-primary text-primary-foreground",
                        active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                        !done && !active && "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : n}
                    </div>
                    {n < TOTAL_STEPS && (
                      <div className={cn("h-0.5 flex-1 mx-1 rounded-full", done ? "bg-primary" : "bg-muted")} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
            <div className="mb-5 pb-4 border-b">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {stepTitles[step - 1]}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stepDescriptions[step - 1]}
              </p>
            </div>
            {step === 1 && <Step1 data={data} update={update} errors={errors} />}
            {step === 2 && <Step2 data={data} update={update} errors={errors} />}
            {step === 3 && <Step3 data={data} update={update} errors={errors} />}
            {step === 4 && <Step4 data={data} update={update} errors={errors} />}
            {step === 5 && <Step5 data={data} update={update} errors={errors} />}
            {step === 6 && <Step6 data={data} update={update} errors={errors} />}
            {step === 7 && <Step7 data={data} goToStep={goToStep} />}
          </div>

          {/* Nav buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={goBack}
              disabled={step === 1 || submitting}
              className="h-12 font-semibold"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} size="lg" className="h-12 font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting}
                size="lg"
                className="h-12 font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit Application <Check className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            🔒 Your progress is auto-saved. You can safely close and return later.
          </p>
        </div>
      </main>

      <Footer />
      <FloatingButtons />
    </div>
  );
}

const stepDescriptions = [
  "Tell us how to reach you and your company name.",
  "Select the legal structure of your business.",
  "Pick the tender category that matches your capacity.",
  "Choose the sector you supply to or work in.",
  "Where should we search for tenders?",
  "Set the value range of tenders you want to bid on.",
  "Review your details and submit your application.",
];

const stepTitles = [
  "Personal Details",
  "Business Type",
  "Tender Type",
  "Sector / Category",
  "Location",
  "Estimated Value Range",
  "Review & Submit",
];

/* ------- Steps ------- */

interface StepProps {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  errors: Record<string, string>;
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Step1({ data, update, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full Name" htmlFor="fullName" error={errors.fullName}>
        <Input id="fullName" value={data.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Enter your name" maxLength={100} />
      </Field>
      <Field label="Mobile Number" htmlFor="mobile" error={errors.mobile}>
        <Input
          id="mobile"
          type="tel"
          value={data.mobile}
          onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter your mobile number"
          inputMode="numeric"
          maxLength={10}
        />
      </Field>
      <Field label="Email Address" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="Enter your email" maxLength={255} />
      </Field>
      <Field label="Company/Firm Name" htmlFor="companyName" error={errors.companyName}>
        <Input id="companyName" value={data.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Enter your company/firm name" maxLength={150} />

      </Field>
    </div>
  );
}

function Step2({ data, update, errors }: StepProps) {
  return (
    <Field label="Business Type" error={errors.businessType}>
      <Select value={data.businessType} onValueChange={(v) => update("businessType", v as BusinessType)}>
        <SelectTrigger><SelectValue placeholder="Select your business type" /></SelectTrigger>
        <SelectContent>
          {BUSINESS_TYPES.map((b) => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Step3({ data, update, errors }: StepProps) {
  const options: { value: TenderTypePref; title: string; desc: string }[] = [
    { value: "Goods", title: "Goods", desc: "Supply of products, equipment, materials" },
    { value: "Services", title: "Services", desc: "Consultancy, maintenance, IT, manpower" },
    { value: "Works", title: "Works", desc: "Construction, civil, infrastructure projects" },
  ];
  return (
    <Field label="Which type of tenders are you interested in?" error={errors.tenderType}>
      <RadioGroup
        value={data.tenderType}
        onValueChange={(v) => {
          update("tenderType", v as TenderTypePref);
          // reset category since sector list changes
          update("categoryId", "");
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {options.map((o) => (
          <label
            key={o.value}
            htmlFor={`tt-${o.value}`}
            className={cn(
              "cursor-pointer rounded-xl border p-4 transition hover:border-primary/60 hover:bg-accent/30",
              data.tenderType === o.value && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{o.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{o.desc}</div>
              </div>
              <RadioGroupItem id={`tt-${o.value}`} value={o.value} />
            </div>
          </label>
        ))}
      </RadioGroup>
    </Field>
  );
}

function Step4({ data, update, errors }: StepProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  // Cascade per spec: WHERE tender_type_tag = selectedType OR tender_type_tag = 'Multiple'
  const filtered = useMemo(() => {
    if (!data.tenderType) return categories;
    return categories.filter(
      (c) => c.tender_type_tag === data.tenderType || c.tender_type_tag === "Multiple",
    );
  }, [categories, data.tenderType]);

  const [open, setOpen] = useState(false);
  const selected = filtered.find((c) => c.id === data.categoryId);

  return (
    <Field label={`Sector / Category ${data.tenderType ? `(filtered by ${data.tenderType})` : ""}`} error={errors.categoryId}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            {selected ? selected.name : (isLoading ? "Loading sectors…" : "Search & select a sector")}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search sectors…" />
            <CommandList>
              <CommandEmpty>No sectors found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      update("categoryId", c.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", data.categoryId === c.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1">{c.name}</span>
                    {c.tender_type_tag && (
                      <span className="ml-2 text-xs text-muted-foreground">{c.tender_type_tag}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function Step5({ data, update, errors }: StepProps) {
  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: fetchStates });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", data.stateId],
    queryFn: () => fetchDistricts(data.stateId || null),
    enabled: !!data.stateId,
  });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="State" error={errors.stateId}>
        <Select
          value={data.stateId}
          onValueChange={(v) => {
            update("stateId", v);
            update("districtId", "");
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>
            {states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="District" error={errors.districtId}>
        <Select
          value={data.districtId}
          onValueChange={(v) => update("districtId", v)}
          disabled={!data.stateId}
        >
          <SelectTrigger>
            <SelectValue placeholder={data.stateId ? "Select district" : "Select state first"} />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Step6({ data, update, errors }: StepProps) {
  // Slider works in log space so ticks are visually even.
  const toSlider = (v: number) => {
    const min = Math.log10(MIN_BUDGET);
    const max = Math.log10(MAX_BUDGET);
    return ((Math.log10(v) - min) / (max - min)) * 1000;
  };
  const fromSlider = (s: number) => {
    const min = Math.log10(MIN_BUDGET);
    const max = Math.log10(MAX_BUDGET);
    return Math.round(Math.pow(10, min + (s / 1000) * (max - min)));
  };

  const minPct = (toSlider(data.budgetMin) / 1000) * 100;
  const maxPct = (toSlider(data.budgetMax) / 1000) * 100;
  const sliderVal = [toSlider(data.budgetMin), toSlider(data.budgetMax)];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Label>Your Estimated Value Range</Label>
          <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            New
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the estimated value range of tenders you want to view (₹1 Lakh – ₹500 Crore+). Use quick picks below or drag the slider. We'll match you with government tenders that fit your capacity.
        </p>

        {/* Quick preset chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((p) => {
            const active = data.budgetMin === p.min && data.budgetMax === p.max;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  update("budgetMin", p.min);
                  update("budgetMax", p.max);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
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
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5 pt-10 pb-6">
        <div className="relative px-2">
          {/* Live value pills above thumbs */}
          <div className="relative h-8 mb-2">
            <div
              className="absolute -translate-x-1/2 -top-1 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm whitespace-nowrap"
              style={{ left: `${minPct}%` }}
            >
              {formatINR(data.budgetMin)}
            </div>
            <div
              className="absolute -translate-x-1/2 -top-1 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm whitespace-nowrap"
              style={{ left: `${maxPct}%` }}
            >
              {formatINR(data.budgetMax)}
            </div>
          </div>

          {/* Dual-thumb range slider */}
          <Slider
            className="relative flex w-full touch-none select-none items-center h-6"
            min={0}
            max={1000}
            step={1}
            minStepsBetweenThumbs={1}
            value={sliderVal}
            onValueChange={(v: number[]) => {
              const [lo, hi] = v;
              update("budgetMin", fromSlider(lo));
              update("budgetMax", fromSlider(hi));
            }}
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#e2e8f0]">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>
            {[0, 1].map((i) => (
              <SliderPrimitive.Thumb
                key={i}
                aria-label={i === 0 ? "Minimum estimated value" : "Maximum estimated value"}
                className="block h-6 w-6 md:h-5 md:w-5 rounded-full border-2 border-primary bg-background shadow-md ring-4 ring-transparent hover:ring-primary/15 focus-visible:outline-none focus-visible:ring-primary/25 transition-all cursor-grab active:cursor-grabbing"
              />
            ))}
          </Slider>

          {/* Tick marks + labels */}
          <div className="relative mt-4 h-6">
            {TICKS.map((t) => {
              const pct = (toSlider(t.value) / 1000) * 100;
              return (
                <div
                  key={t.value}
                  className={`absolute -translate-x-1/2 flex-col items-center ${t.mobile ? "flex" : "hidden sm:flex"}`}
                  style={{ left: `${pct}%` }}
                >
                  <div className="h-1.5 w-px bg-muted-foreground/40" />
                  <span className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                    ₹{t.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {errors.budgetMax && <p className="text-xs text-destructive">{errors.budgetMax}</p>}
    </div>
  );
}


function Step7({ data, goToStep }: { data: WizardData; goToStep: (n: number) => void }) {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: fetchStates });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", data.stateId],
    queryFn: () => fetchDistricts(data.stateId || null),
    enabled: !!data.stateId,
  });

  const catName = categories.find((c) => c.id === data.categoryId)?.name ?? "—";
  const stateName = states.find((s) => s.id === data.stateId)?.name ?? "—";
  const districtName = districts.find((d) => d.id === data.districtId)?.name ?? "—";

  const rows: { step: number; label: string; value: string }[] = [
    { step: 1, label: "Full Name", value: data.fullName || "—" },
    { step: 1, label: "Mobile", value: data.mobile || "—" },
    { step: 1, label: "Email", value: data.email || "—" },
    { step: 1, label: "Company", value: data.companyName || "—" },
    { step: 2, label: "Business Type", value: data.businessType || "—" },
    { step: 3, label: "Tender Type", value: data.tenderType || "—" },
    { step: 4, label: "Sector", value: catName },
    { step: 5, label: "State", value: stateName },
    { step: 5, label: "District", value: districtName },
    { step: 6, label: "Estimated Value Range", value: `${formatINR(data.budgetMin)} — ${formatINR(data.budgetMax)}` },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Review your details</h2>
      <div className="divide-y rounded-lg border">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="mt-0.5 truncate text-sm font-medium">{r.value}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(r.step)}>
              Edit
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        On submit, our expert will call you tomorrow with matched government tenders.
      </p>
    </div>
  );
}
