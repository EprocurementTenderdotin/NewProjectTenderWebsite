import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Circle, Upload, FileText, Eye, Download, AlertCircle, RefreshCw, ShieldCheck, Sparkles, Clock, User2, Building2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { createDocumentPreviewBlobUrl, downloadDocument, isBrowserPreviewableFile, type DocumentBucket } from "@/lib/document-storage";
import { DocumentPreview } from "@/components/DocumentPreview";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>) => ({
    appId: typeof search.appId === "string" || typeof search.appId === "number" ? String(search.appId) : "",
    mobile: typeof search.mobile === "string" || typeof search.mobile === "number" ? String(search.mobile) : "",
  }),
  head: () => ({
    meta: [
      { title: "Track Application Status — eProcurementTender.com" },
      { name: "description", content: "Track your tender application status with your Application ID and registered mobile number." },
      { property: "og:title", content: "Track Application Status" },
      { property: "og:description", content: "Enter your Application ID and mobile to see live status and shared documents." },
      { property: "og:url", content: "/track" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "/track" }],
  }),
  component: TrackPage,
});

const STORAGE_BUCKET = "customer-uploads";
const ADMIN_DOC_BUCKET: DocumentBucket = "customer-uploads";
const TRACK_HANDOFF_KEY = "ept_track_handoff_v1";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED = [
  "application/pdf",
  "image/jpeg","image/jpg","image/png","image/webp","image/gif",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv","text/plain",
  "application/zip","application/x-zip-compressed",
];


const STATUS_LABELS: Record<string, string> = {
  application_received: "Application Received",
  submitted: "Application Submitted",
  under_review: "Under Review",
  under_verification: "Under Verification",
  callback_scheduled: "Callback Scheduled",
  call_scheduled: "Call Scheduled",
  call_completed: "Call Completed",
  tender_shared: "Tender Shared",
  tender_documents_shared: "Tender Documents Shared",
  documents_requested: "Additional Documents Required",
  additional_documents_required: "Additional Documents Required",
  documents_uploaded: "Documents Uploaded",
  documents_verified: "Documents Verified",
  loa_issued: "Letter of Award Issued",
  security_deposit_pending: "Security Deposit Pending",
  security_deposit_paid: "Security Deposit Paid",
  aoc_issued: "AOC Issued",
  aoc_work_order_issued: "AOC / Work Order Issued",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Plain-language explanations shown prominently to the customer
const STATUS_MESSAGES: Record<string, { title: string; body: string; tone: "info" | "success" | "warn" | "danger" }> = {
  application_received: { tone: "info", title: "Application received", body: "Your application has been received successfully. Our team will review it within 1 business day." },
  submitted:            { tone: "info", title: "Application submitted", body: "Your application has been submitted. Review has started." },
  under_review:         { tone: "info", title: "Application under review", body: "Your application is under review. Our team will call you within 24 hours." },
  under_verification:   { tone: "info", title: "Under verification", body: "Your documents are being verified. Please wait." },
  documents_verified:   { tone: "success", title: "Documents verified", body: "All documents have been verified. The next step will start soon." },
  callback_scheduled:   { tone: "info", title: "Callback scheduled", body: "A callback has been scheduled for you. Please keep your phone reachable." },
  call_scheduled:       { tone: "info", title: "Call scheduled", body: "Our team has scheduled a call with you. Please keep your phone reachable." },
  call_completed:       { tone: "success", title: "Call completed", body: "We have spoken with you. The next update will follow soon." },
  additional_documents_required: { tone: "warn", title: "Additional documents required", body: "A few more documents are needed. Please upload them from the section below." },
  documents_requested:  { tone: "warn", title: "Additional documents required", body: "A few more documents are needed. Please upload them from the section below." },
  documents_uploaded:   { tone: "info", title: "Documents uploaded", body: "We have received your documents. Verification is in progress." },
  tender_documents_shared: { tone: "success", title: "Tender documents shared", body: "Tender documents have been shared. Preview and download them from the 'Shared by Our Team' section below." },
  tender_shared:        { tone: "success", title: "Tender documents shared", body: "Tender documents have been shared. Preview and download them from the 'Shared by Our Team' section below." },
  loa_issued:           { tone: "success", title: "Letter of Award (LOA) issued", body: "The LOA has been issued. Download it from the section below." },
  security_deposit_pending: { tone: "warn", title: "Security deposit pending", body: "Security deposit is pending. Please download the agreement from the section below and deposit the amount." },
  security_deposit_paid: { tone: "success", title: "Security deposit received", body: "Security deposit has been received. The next step will start soon." },
  aoc_issued:           { tone: "success", title: "AOC / Work Order issued", body: "AOC and Work Order have been issued. Download the documents from the section below." },
  aoc_work_order_issued: { tone: "success", title: "AOC / Work Order issued", body: "AOC and Work Order have been issued. Download the documents from the section below." },
  completed:            { tone: "success", title: "Application completed", body: "Your application has been completed successfully. Thank you!" },
  rejected:             { tone: "danger", title: "Application rejected", body: "Unfortunately, your application has been rejected. See the remarks below for details." },
  cancelled:            { tone: "danger", title: "Application cancelled", body: "This application has been cancelled. To submit a new application, go to Apply Now." },
};

const ADMIN_DOC_GROUPS: { key: string; label: string; match: (cat: string) => boolean }[] = [
  { key: "tender",   label: "Tender Documents",             match: (c) => /tender|boq/i.test(c) },
  { key: "loa",      label: "Letter of Award (LOA)",         match: (c) => /loa|letter of acceptance|award/i.test(c) },
  { key: "aoc",      label: "AOC / Work Order",              match: (c) => /aoc|work order/i.test(c) },
  { key: "deposit",  label: "Security Deposit & EMD",        match: (c) => /security deposit|emd/i.test(c) },
  { key: "agree",    label: "Agreement",                     match: (c) => /agreement/i.test(c) },
  { key: "payment",  label: "Payment Receipts",              match: (c) => /payment/i.test(c) },
  { key: "support",  label: "Supporting Documents",          match: (c) => /supporting|support/i.test(c) },
];

const mobileRegex = /^[6-9]\d{9}$/;
const appIdRegex = /^EPT-\d{4}-\d{4,8}$/i;

const lookupSchema = z.object({
  appId: z.string().regex(appIdRegex, "Format: EPT-YYYY-NNNNN"),
  mobile: z.string().regex(mobileRegex, "Enter a valid 10-digit Indian mobile"),
});

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  custom_status_message?: string | null;
  changed_at: string;
}
interface DocRow {
  id: string;
  document_name: string;
  document_category?: string | null;
  document_type?: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  description?: string | null;
  verification_status?: string;
  rejection_reason?: string | null;
  uploaded_at: string;
}
interface AppRow {
  id: string;
  application_id: string;
  full_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  status: string;
  is_blocked?: boolean | null;
  custom_status_message?: string | null;
  customer_remarks?: string | null;
  customer_upload_enabled?: boolean | null;
  call_scheduled_date?: string | null;
  call_status?: string | null;
  call_remarks?: string | null;
  callback_scheduled_at: string | null;
  created_at: string;
}
interface LookupResult {
  found: boolean;
  blocked?: boolean;
  app?: AppRow;
  history?: HistoryRow[];
  admin_documents?: DocRow[];
  customer_documents?: DocRow[];
}

function TrackPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const resultRef = useRef<HTMLDivElement>(null);
  const autoLookupAttempted = useRef(false);
  const [appId, setAppId] = useState(() => search.appId.toUpperCase());
  const [mobile, setMobile] = useState(() => search.mobile.replace(/\D/g, "").slice(0, 10));
  const [session, setSession] = useState<{ appId: string; mobile: string } | null>(null);
  const [errors, setErrors] = useState<{ appId?: string; mobile?: string }>({});
  const [statusMessage, setStatusMessage] = useState<"notFound" | "invalid" | null>(null);
  // When the customer arrives via a direct tracking link (both URL params present),
  // hide the hero + lookup form and jump straight to the status result.
  const directLink = !!(search.appId && search.mobile);


  const lookup = useMutation({
    mutationFn: async (vars: { appId: string; mobile: string }) => {
      const { data, error } = await supabase.rpc("lookup_application", {
        p_app_id: vars.appId.trim().toUpperCase(),
        p_mobile: vars.mobile.trim(),
      });
      if (error) {
        if (error.message?.includes("RATE_LIMIT")) {
          throw new Error("Too many lookups. Please wait a minute and try again.");
        }
        throw error;
      }
      return data as LookupResult;
    },
    onSuccess: (data, vars) => {
      if (!data.found) {
        setStatusMessage("notFound");
        setSession(null);
        return;
      }
      setStatusMessage(null);
      setSession({ appId: vars.appId.trim().toUpperCase(), mobile: vars.mobile.trim() });
      qc.setQueryData(["track", vars.appId.trim().toUpperCase(), vars.mobile.trim()], data);
    },
    onError: (err: Error) => {
      setSession(null);
      setStatusMessage("notFound");
      toast.error(err.message || "Application not found. Please check your details.");
    },
  });

  const result = useQuery<LookupResult>({
    queryKey: session ? ["track", session.appId, session.mobile] : ["track"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lookup_application", {
        p_app_id: session!.appId,
        p_mobile: session!.mobile,
      });
      if (error) throw error;
      return data as LookupResult;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!result.data?.found) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result.data?.found]);

  useEffect(() => {
    if (autoLookupAttempted.current || session || lookup.isPending) return;

    // Only auto-lookup when BOTH appId and mobile are explicitly present in the URL.
    // Do NOT read from localStorage — customer must always enter details manually
    // unless they arrived via a direct tracking link with both params.
    const nextAppId = search.appId.toUpperCase();
    const nextMobile = search.mobile.replace(/\D/g, "").slice(0, 10);

    if (!nextAppId || !nextMobile) return;
    setAppId(nextAppId);
    setMobile(nextMobile);
    const parsed = lookupSchema.safeParse({ appId: nextAppId, mobile: nextMobile });
    if (!parsed.success) return;
    autoLookupAttempted.current = true;
    lookup.mutate({ appId: nextAppId, mobile: nextMobile });
  }, [lookup, search.appId, search.mobile, session]);

  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statusMessage) {
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [statusMessage]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = lookupSchema.safeParse({ appId, mobile });
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as "appId" | "mobile"] = i.message;
      setErrors(errs);
      setStatusMessage("invalid");
      return;
    }
    setErrors({});
    setStatusMessage(null);
    lookup.mutate({ appId, mobile });
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-background relative"
      style={
        directLink
          ? {
              backgroundImage:
                "radial-gradient(1100px 600px at 8% -10%, rgba(59,130,246,0.14) 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(245,158,11,0.13) 0%, transparent 55%), radial-gradient(800px 500px at 50% 100%, rgba(16,185,129,0.10) 0%, transparent 60%), linear-gradient(180deg, #f4f7fc 0%, #eef2fb 40%, #f8fafc 100%)",
            }
          : undefined
      }
    >

      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full" style={{ outline: "none" }}>
        {!directLink && (
        <section
          className="relative overflow-hidden isolate"


          style={{
            background:
              "radial-gradient(1200px 500px at 15% 10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(900px 500px at 85% 90%, rgba(59,130,246,0.22) 0%, transparent 60%), linear-gradient(135deg, #0b1e4d 0%, #12295f 45%, #1e3a8a 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
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
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
          />
          <div className="relative mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-primary-foreground">
                Track Status
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
              Track Your Application
            </h1>
            <p className="mt-3 max-w-2xl text-primary-foreground/80 leading-relaxed">
              Enter your Application ID and registered mobile number to view live status, timeline and shared documents.
            </p>
          </div>
        </section>
        )}

        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
          {!directLink && (
          <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-lg -mt-16 sm:-mt-20 relative z-10">

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="appId" className="text-sm font-semibold">Application ID</Label>
                <Input
                  id="appId"
                  value={appId}
                  onChange={(e) => {
                    setAppId(e.target.value.toUpperCase());
                    setStatusMessage(null);
                  }}
                  placeholder="EPT-YYYY-NNNNN"
                  maxLength={20}
                  autoComplete="off"
                  className="h-12 rounded-xl"
                />
                {errors.appId && <p className="text-xs text-destructive">{errors.appId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="text-sm font-semibold">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setStatusMessage(null);
                  }}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-12 rounded-xl"
                />
                {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={lookup.isPending}
                className="h-12 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md transition-all font-semibold text-base px-6"
              >
                {lookup.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Checking…</> : "Track Status"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Both fields are required and must match your original submission.
            </p>
          </form>
          )}



        {statusMessage && (
          <div
            ref={alertRef}
            className="mt-5 rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-5 sm:p-6 shadow-sm"
            role="alert"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15 border border-destructive/25">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-destructive">
                  {statusMessage === "invalid"
                    ? "Please check your details"
                    : "We couldn't find your application"}
                </h3>
                <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">
                  {statusMessage === "invalid"
                    ? "Application ID must look like EPT-YYYY-NNNNN (e.g., EPT-2026-03665) and mobile must be a valid 10-digit Indian number."
                    : "No application matches this Application ID and mobile number combination. Please double-check both fields and try again."}
                </p>
                <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                    <span>Make sure the Application ID matches the one sent to you via SMS or email.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                    <span>Use the same 10-digit mobile number you registered with.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                    <span>Still stuck? <Link to="/contact" className="font-semibold text-destructive hover:underline">Contact our support team</Link> for help.</span>
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const cleanId = appId.trim().toUpperCase();
                      const cleanMobile = mobile.replace(/\D/g, "").slice(0, 10);
                      const parsed = lookupSchema.safeParse({ appId: cleanId, mobile: cleanMobile });
                      if (!parsed.success) {
                        setStatusMessage("invalid");
                        return;
                      }
                      setStatusMessage(null);
                      lookup.mutate({ appId: cleanId, mobile: cleanMobile });
                    }}
                    disabled={lookup.isPending}
                    className="h-10 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                  >
                    {lookup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try again
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStatusMessage(null); setSession(null); }}
                    className="h-10 rounded-lg font-semibold"
                  >
                    Edit details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}



        {(lookup.isPending || (!!session && result.isLoading && !result.data)) && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-muted-foreground" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Looking up your application…</p>
          </div>
        )}

        <div ref={resultRef}>
          {result.data?.found && result.data.app && (
            <ResultView
              data={result.data}
              session={session!}
              onRefetch={async () => {
                try {
                  await result.refetch({ throwOnError: true });
                  toast.success("Status updated");
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Refresh failed";
                  toast.error(msg.includes("RATE_LIMIT") ? "Too many refreshes. Please wait a minute." : msg);
                }
              }}
              refreshing={result.isFetching}
            />

          )}
        </div>
        </div>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}

function ResultView({
  data,
  session,
  onRefetch,
  refreshing,
}: {
  data: LookupResult;
  session: { appId: string; mobile: string };
  onRefetch: () => void;
  refreshing?: boolean;
}) {

  const app = data.app!;
  const history = data.history ?? [];
  const currentStatus = app.status;
  // Customer can upload ONLY when admin explicitly toggles it on.
  const needsUpload =
    !data.blocked && !app.is_blocked && !!app.customer_upload_enabled;
  const msg = STATUS_MESSAGES[currentStatus];
  const adminDocs = data.admin_documents ?? [];
  const grouped = groupAdminDocs(adminDocs);
  const blocked = !!(data.blocked || app.is_blocked);
  const customStatus = (app.custom_status_message ?? "").trim();
  const customerRemarks = (app.customer_remarks ?? "").trim();

  const initials = (app.full_name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  const statusLabel = STATUS_LABELS[currentStatus] ?? currentStatus;
  const isTerminal = currentStatus === "completed" || currentStatus === "rejected" || currentStatus === "cancelled";
  const isDanger = currentStatus === "rejected" || currentStatus === "cancelled";

  if (blocked) {
    return (
      <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
        <ApplicationHeader
          app={app}
          initials={initials}
          statusLabel="Blocked"
          statusTone="danger"
          onRefetch={onRefetch}
        />
        <section
          className="rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-5 sm:p-7 shadow-sm"
          role="status"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-destructive">Application blocked</h2>
              <p className="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-foreground/80">
                This application has been temporarily blocked. Please contact our team for details.
              </p>
              {customStatus && (
                <div className="mt-4 rounded-xl border border-destructive/25 bg-background/80 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-destructive/80">Message from admin</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{customStatus}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
      <ApplicationHeader
        app={app}
        initials={initials}
        statusLabel={statusLabel}
        statusTone={isDanger ? "danger" : isTerminal ? "success" : "live"}
        onRefetch={onRefetch}
        refreshing={refreshing}
      />


      {/* Latest admin update — hero card */}
      {customStatus || customerRemarks ? (
        <section
          className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/[0.10] via-fuchsia-500/[0.05] to-amber-500/[0.06] p-5 sm:p-7 shadow-[0_6px_28px_-10px_rgba(139,92,246,0.35)]"
          role="status"
          aria-live="polite"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Live Update
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">From Our Team</span>
            </div>

            {customStatus && (
              <div className="rounded-xl border border-violet-400/25 bg-background/90 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  Current Status
                </div>
                <p className="mt-2 whitespace-pre-wrap text-base sm:text-lg font-semibold leading-relaxed text-foreground">
                  {customStatus}
                </p>
              </div>
            )}


            {customerRemarks && (
              <div className="mt-3 rounded-xl border border-border bg-background/70 p-4 sm:p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Remarks</div>
                <p className="mt-2 whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed text-foreground/90">
                  {customerRemarks}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Application received</h2>
              <p className="mt-1 text-sm sm:text-[15px] leading-relaxed text-foreground/75">
                Our expert team will call you within 1 business day with tenders available in your selected district.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Call update from admin */}
      {(() => {
        const callDate = app.call_scheduled_date ?? null;
        const callStatusRaw = (app.call_status ?? "").trim();
        const callRemarks = (app.call_remarks ?? "").trim();
        const hasCall = !!callDate || (!!callStatusRaw && callStatusRaw !== "pending") || !!callRemarks;
        if (!hasCall) return null;
        const CALL_LABELS: Record<string, string> = {
          pending: "Pending",
          completed: "Completed",
          no_answer: "No Answer",
          rescheduled: "Rescheduled",
          not_interested: "Not Interested",
        };
        const label = CALL_LABELS[callStatusRaw] ?? callStatusRaw;
        const toneClass =
          callStatusRaw === "completed"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
            : callStatusRaw === "no_answer" || callStatusRaw === "not_interested"
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
        const dateStr = callDate ? new Date(`${callDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;
        return (
          <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-background p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">Call Update</h2>
                  {label && (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${toneClass}`}>
                      {label}
                    </span>
                  )}
                </div>
                {dateStr && (
                  <p className="mt-1.5 text-sm text-foreground/80">
                    <span className="text-muted-foreground">Scheduled for:</span>{" "}
                    <span className="font-semibold">{dateStr}</span>
                  </p>
                )}
                {callRemarks && (
                  <div className="mt-3 rounded-xl border border-border bg-background/70 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Remarks from our team</div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{callRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Status Timeline */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Status Timeline
            </h2>
            <p className="mt-0.5 text-xs sm:text-[13px] text-muted-foreground">
              Every update posted by our team appears here in order.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {history.filter((h) => (h.custom_status_message ?? "").trim().length > 0).length || 1} update{(history.filter((h) => (h.custom_status_message ?? "").trim().length > 0).length || 1) === 1 ? "" : "s"}
          </span>
        </div>
        <Timeline history={history} currentStatus={currentStatus} createdAt={app.created_at} customStatus={customStatus} />
      </section>

      {/* Conditional Upload */}
      {needsUpload && (
        <UploadSection session={session} appUuid={app.id} onDone={onRefetch} />
      )}

      {/* Admin Published Documents — grouped by category */}
      {adminDocs.length === 0 ? (
        <DocumentsSection
          title="Shared by Our Team"
          subtitle="Tender docs, LOA, agreements & more will appear here."
          emptyText="No documents shared yet. You'll see them here as soon as our team publishes them."
          docs={[]}
          allowPreview
          bucket={ADMIN_DOC_BUCKET}
          accent="team"
        />
      ) : (
        grouped.map((g) => (
          <DocumentsSection
            key={g.key}
            title={g.label}
            subtitle="Shared by our team"
            emptyText=""
            docs={g.docs}
            allowPreview
            bucket={ADMIN_DOC_BUCKET}
            accent="team"
          />
        ))
      )}

      {/* Customer Uploaded Documents */}
      {(data.customer_documents ?? []).length > 0 && (
        <DocumentsSection
          title="Your Uploaded Documents"
          subtitle="Files you've submitted for verification"
          emptyText=""
          docs={data.customer_documents ?? []}
          allowPreview
          showVerification
          bucket="customer-uploads"
          accent="customer"
        />
      )}
    </div>
  );
}

function ApplicationHeader({
  app,
  initials,
  statusLabel,
  statusTone,
  onRefetch,
  refreshing,
}: {
  app: AppRow;
  initials: string;
  statusLabel: string;
  statusTone: "live" | "success" | "danger";
  onRefetch: () => void;
  refreshing?: boolean;
}) {

  const toneClasses =
    statusTone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/25"
      : statusTone === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
      : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-card dark:via-card dark:to-card/60 p-5 sm:p-7 shadow-sm">
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-fuchsia-400/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white text-lg sm:text-xl font-bold tracking-tight shadow-lg shadow-fuchsia-500/25">

            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">{app.full_name}</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  toneClasses,
                )}
              >
                {statusTone === "live" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                )}
                {statusTone === "success" && <ShieldCheck className="h-3 w-3" />}
                {statusTone === "danger" && <AlertCircle className="h-3 w-3" />}
                {statusLabel}
              </span>
            </div>
            {app.company_name && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{app.company_name}</span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {app.phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Applied {formatDateTime(app.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Application ID</div>
            <div className="mt-0.5 font-mono text-sm sm:text-base font-semibold tabular-nums">{app.application_id}</div>
          </div>
          <button
            type="button"
            onClick={onRefetch}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>


        </div>
      </div>
    </section>
  );
}


function groupAdminDocs(docs: DocRow[]): { key: string; label: string; docs: DocRow[] }[] {
  const buckets = new Map<string, { label: string; docs: DocRow[] }>();
  for (const d of docs) {
    const cat = (d.document_category || "").trim();
    const group = ADMIN_DOC_GROUPS.find((g) => cat && g.match(cat));
    const key = group?.key ?? "other";
    const label = group?.label ?? (cat || "Other Documents");
    if (!buckets.has(key)) buckets.set(key, { label, docs: [] });
    buckets.get(key)!.docs.push(d);
  }
  // Preserve defined order, then any custom "other" buckets at end
  const ordered: { key: string; label: string; docs: DocRow[] }[] = [];
  for (const g of ADMIN_DOC_GROUPS) {
    const b = buckets.get(g.key);
    if (b) ordered.push({ key: g.key, label: b.label, docs: b.docs });
  }
  for (const [key, b] of buckets) {
    if (!ADMIN_DOC_GROUPS.some((g) => g.key === key)) ordered.push({ key, label: b.label, docs: b.docs });
  }
  return ordered;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const isTerminal = status === "completed" || status === "rejected" || status === "cancelled";
  const isDanger = status === "rejected" || status === "cancelled";
  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2">
      {!isTerminal && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      )}
      {isTerminal && (
        <span className={cn("h-2.5 w-2.5 rounded-full", isDanger ? "bg-destructive" : "bg-emerald-500")} />
      )}
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}


function Timeline({
  history,
  currentStatus,
  createdAt,
  customStatus,
}: {
  history: HistoryRow[];
  currentStatus: string;
  createdAt: string;
  customStatus: string;
}) {
  // Timeline shows only the admin-written custom status message — never
  // internal remarks, call notes, or generic status labels. If the lookup RPC
  // returns an older history payload without custom_status_message, still show
  // the currently saved custom status from the application row.
  const items = useMemo(() => {
    const rows = history
      .map((h) => {
        const custom = (h.custom_status_message ?? "").trim();
        return { ...h, _display: custom };
      })
      .filter((h) => h._display.length > 0);

    const savedCustomStatus = customStatus.trim();
    if (savedCustomStatus && !rows.some((h) => h._display === savedCustomStatus)) {
      const latestHistoryTime = history.length > 0 ? history[history.length - 1].changed_at : createdAt;
      rows.push({
        id: "current-custom-status",
        from_status: null,
        to_status: currentStatus,
        notes: null,
        custom_status_message: savedCustomStatus,
        changed_at: latestHistoryTime,
        _display: savedCustomStatus,
      });
    }

    // Deduplicate consecutive identical status messages (admin sometimes saves
    // the same update twice). Keep the latest occurrence so the timeline stays clean.
    const deduped = rows.filter((h, idx, arr) => {
      if (idx === 0) return true;
      return h._display !== arr[idx - 1]._display;
    });

    if (deduped.length === 0) {
      return [{
        id: "seed",
        from_status: null,
        to_status: currentStatus,
        notes: null,
        custom_status_message: "Application received",
        changed_at: createdAt,
        _display: "Application received",
      }];
    }
    return deduped;
  }, [history, currentStatus, createdAt, customStatus]);


  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className="pointer-events-none absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-border to-border"
      />
      {items.map((h, idx) => {
        const isCurrent = idx === items.length - 1;
        const isPast = idx < items.length - 1;
        const message = h._display;
        return (
          <li key={h.id} className="relative pl-10">
            <span
              className={cn(
                "absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background shadow-sm",
                isCurrent ? "border-primary shadow-primary/20" : isPast ? "border-emerald-500/60" : "border-border",
              )}
            >
              {isCurrent ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              ) : isPast ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
            <div
              className={cn(
                "rounded-xl border bg-background/60 px-4 py-3 transition-all",
                isCurrent
                  ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-sm"
                  : "border-border hover:border-border/80",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words flex-1 min-w-0",
                    isCurrent ? "font-semibold text-foreground" : "font-medium text-foreground/85",
                  )}
                >
                  {message}
                </p>
                <time className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                  {formatDateTime(h.changed_at)}
                </time>
              </div>
              {isCurrent && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Latest
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}


function UploadSection({
  session,
  appUuid,
  onDone,
}: {
  session: { appId: string; mobile: string };
  appUuid: string;
  onDone: () => void;
}) {
  const [docType, setDocType] = useState<string>("");
  const [files, setFiles] = useState<Array<{ file: File; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: typeof files = [];
    for (const f of Array.from(list)) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: allowed files are PDF, images, Excel, Word, PPT, CSV, TXT or ZIP`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: exceeds 25 MB limit`);
        continue;
      }
      next.push({ file: f, progress: 0, status: "queued" });
    }
    setFiles((prev) => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadAll = async () => {
    if (files.filter((f) => f.status === "queued").length === 0) {
      toast.error("Add at least one file");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "queued") continue;
      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading", progress: 10 } : f)));

      try {
        const f = files[i].file;
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `applications/${appUuid}/${Date.now()}_${safeName}`;

        // Progress simulation (supabase-js v2 doesn't expose upload progress on standard upload)
        const tick = setInterval(() => {
          setFiles((prev) =>
            prev.map((x, idx) =>
              idx === i && x.status === "uploading" && x.progress < 85
                ? { ...x, progress: x.progress + 15 }
                : x,
            ),
          );
        }, 200);

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        clearInterval(tick);
        if (upErr) throw upErr;

        setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, progress: 92 } : x)));

        const label = docType.trim();
        const { error: rpcErr } = await supabase.rpc("submit_customer_document", {
          p_app_id: session.appId,
          p_mobile: session.mobile,
          p_document_type: "other",
          p_document_name: label ? `${label} — ${f.name}` : f.name,
          p_file_path: path,
          p_file_size: f.size,
          p_mime_type: f.type,
        });
        if (rpcErr) throw rpcErr;

        setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, progress: 100, status: "done" } : x)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setFiles((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "error", error: msg } : x)));
        toast.error(msg);
      }
    }
    toast.success("Upload complete. Our team has been notified.");
    onDone();
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-orange-500/40 bg-gradient-to-br from-amber-500/[0.10] via-orange-500/[0.06] to-background p-5 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
          <Upload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold tracking-tight">Upload Requested Documents</h2>
          <p className="mt-0.5 text-xs sm:text-[13px] text-muted-foreground">
            Our team needs a few files from you. Allowed: PDF, images, Excel, Word, PPT, CSV, TXT, ZIP · Max 25 MB per file.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="docType" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Document type <span className="normal-case text-muted-foreground/70">(optional)</span>
          </Label>
          <Input
            id="docType"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            placeholder="e.g. PAN Card, GST Certificate, Bank Statement"
            maxLength={80}
            className="h-11 rounded-xl"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="h-11 rounded-xl border-dashed"
        >
          <Upload className="mr-2 h-4 w-4" /> Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt,.zip"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {files.map((f, i) => (
            <li key={i} className="rounded-xl border border-border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{f.file.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {(f.file.size / 1024).toFixed(0)} KB · <span className="capitalize">{f.status}</span>
                      {f.error ? ` — ${f.error}` : ""}
                    </div>
                  </div>
                </div>
                {f.status === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                {f.status === "error" && <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
              </div>
              {(f.status === "uploading" || f.status === "done") && (
                <Progress value={f.progress} className="mt-2.5 h-1.5" />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end">
        <Button
          onClick={uploadAll}
          disabled={files.filter((f) => f.status === "queued").length === 0}
          className="h-11 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload {files.filter((f) => f.status === "queued").length || ""} file(s)
        </Button>

      </div>
    </section>
  );
}


function DocumentsSection({
  title,
  subtitle,
  emptyText,
  docs,
  allowPreview,
  showVerification,
  bucket = "customer-uploads",
  accent = "team",
}: {
  title: string;
  subtitle?: string;
  emptyText: string;
  docs: DocRow[];
  allowPreview?: boolean;
  showVerification?: boolean;
  bucket?: DocumentBucket;
  accent?: "team" | "customer";
}) {
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null; path: string; bucket: DocumentBucket } | null>(null);

  const onPreview = async (d: DocRow) => {
    if (!isBrowserPreviewableFile(d.mime_type, d.document_name)) {
      toast.info("Preview is not available for this file type. Download started.");
      await onDownload(d);
      return;
    }
    try {
      const url = await createDocumentPreviewBlobUrl(d.file_path, bucket);
      setPreview((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return { url, name: d.document_name, mime: d.mime_type, path: d.file_path, bucket }; });
    } catch (error) {
      toast.error(`Could not preview: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const onDownload = async (d: DocRow) => {
    try {
      await downloadDocument(d.file_path, d.document_name, bucket);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download document");
    }
  };

  const accentIconClasses =
    accent === "customer"
      ? "bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-500/30 text-white shadow-sm shadow-emerald-500/25"
      : "bg-gradient-to-br from-sky-500 to-indigo-500 border-indigo-500/30 text-white shadow-sm shadow-indigo-500/25";


  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accentIconClasses)}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs sm:text-[13px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {docs.length > 0 && (
          <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
            {docs.length} file{docs.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {docs.map((d) => {
            const vs = d.verification_status;
            const verifiedTone =
              vs === "approved" || vs === "verified"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : vs === "rejected"
                ? "bg-destructive/10 text-destructive border-destructive/25"
                : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25";
            return (
              <li
                key={d.id}
                className="group rounded-xl border border-border bg-background/60 p-3.5 sm:p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:bg-background"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", accentIconClasses)}>
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-[15px] font-semibold text-foreground break-words">{d.document_name}</span>
                        {showVerification && vs ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              verifiedTone,
                            )}
                          >
                            {vs === "approved" ? "verified" : vs}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground tabular-nums">
                        {d.document_category || d.document_type || d.mime_type || "Document"}
                        {d.file_size_bytes ? ` · ${(d.file_size_bytes / 1024).toFixed(0)} KB` : ""}
                        {" · "}
                        {formatDateTime(d.uploaded_at)}
                      </div>
                      {showVerification && vs === "rejected" && d.rejection_reason ? (
                        <div className="mt-1.5 text-[11px] text-destructive">
                          <span className="font-semibold">Reason:</span> {d.rejection_reason}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 sm:justify-end">
                    {allowPreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(d)}
                        className="rounded-lg border-indigo-400/40 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => onDownload(d)}
                      className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-md"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  </div>

                </div>
              </li>
            );
          })}
        </ul>
      )}


      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) { if (preview?.url) URL.revokeObjectURL(preview.url); setPreview(null); } }}>
        <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
            <DialogDescription className="sr-only">Document preview</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="h-[76vh] w-full overflow-hidden rounded-lg border bg-muted">
              <DocumentPreview
                url={preview.url}
                name={preview.name}
                mime={preview.mime}
                onDownload={async () => {
                  try {
                    await downloadDocument(preview.path, preview.name, preview.bucket);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not download document");
                  }
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
