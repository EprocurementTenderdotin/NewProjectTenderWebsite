import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type WheelEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { APPLICATION_STATUSES, STATUS_LABELS, CALL_STATUSES, ADMIN_DOC_CATEGORIES, type ApplicationStatus } from "@/lib/admin";
import { formatINR } from "@/lib/format";
import { createDocumentPreviewBlobUrl, downloadDocument, isBrowserPreviewableFile, type DocumentBucket } from "@/lib/document-storage";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Ban, ShieldCheck, Download, Eye, Upload, CheckCircle2, XCircle, FileText, MessageSquare, StickyNote, Activity, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/applications")({
  ssr: false,
  component: AdminApplications,
});

interface App {
  id: string;
  application_id: string;
  full_name: string;
  phone: string;
  email: string;
  company_name: string | null;
  gst_number: string | null;
  status: ApplicationStatus;
  budget_range_min: number;
  budget_range_max: number;
  tender_type_preference: string | null;
  additional_notes: string | null;
  call_scheduled_date: string | null;
  call_status: string | null;
  call_remarks: string | null;
  is_blocked: boolean | null;
  custom_status_message: string | null;
  customer_remarks: string | null;
  customer_upload_enabled: boolean | null;
  created_at: string;
  state: { name: string } | null;
  district: { id: string; name: string } | null;
  category: { name: string } | null;
}

const SELECT =
  "id, application_id, full_name, phone, email, company_name, gst_number, status, budget_range_min, budget_range_max, tender_type_preference, additional_notes, call_scheduled_date, call_status, call_remarks, is_blocked, custom_status_message, customer_remarks, customer_upload_enabled, created_at, state:states(name), district:districts(id,name), category:tender_categories(name)";

const ADMIN_DOC_BUCKET = "customer-uploads" as const;

type DialogTab = "info" | "status" | "call" | "cdocs" | "adocs" | "timeline";

const shouldKeepWheelNative = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest("textarea, select, [role='listbox'], [data-radix-popper-content-wrapper]");

const wheelScroll = (target: HTMLElement | null, deltaY: number) => {
  if (!target || Math.abs(deltaY) < 1 || target.scrollHeight <= target.clientHeight) return false;
  const before = target.scrollTop;
  target.scrollTop += deltaY;
  return target.scrollTop !== before;
};

function AdminApplications() {
  const [rows, setRows] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<{ app: App; tab: DialogTab } | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);

  async function toggleBlock(app: App) {
    const next = !app.is_blocked;
    if (next && !confirm(`Block application ${app.application_id}? The customer will only see a blocked notice on /track.`)) return;
    setBlocking(app.id);
    const { error } = await supabase.from("applications").update({ is_blocked: next }).eq("id", app.id);
    setBlocking(null);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((r) => r.id === app.id ? { ...r, is_blocked: next } : r));
    toast.success(next ? "Application blocked" : "Application unblocked");
  }


  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("applications")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(200);
    if (districtFilter !== "all") q = q.eq("district_id", districtFilter);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as ApplicationStatus);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, [districtFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Only show districts that actually have applications — the full India list
    // (700+) is unusable as a filter dropdown.
    supabase
      .from("applications")
      .select("district:districts(id, name)")
      .not("district_id", "is", null)
      .limit(1000)
      .then(({ data }) => {
        const map = new Map<string, string>();
        (data ?? []).forEach((r: any) => {
          if (r.district?.id) map.set(r.district.id, r.district.name);
        });
        setDistricts(
          Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        );
      });
  }, []);

  const handlePageWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || shouldKeepWheelNative(event.target)) return;
    const scrollTarget = event.currentTarget.closest("main") as HTMLElement | null;
    if (wheelScroll(scrollTarget, event.deltaY)) event.preventDefault();
  };

  return (
    <div
      className="space-y-4 md:select-none md:[-webkit-user-select:none] [&_input]:select-text [&_input]:[-webkit-user-select:text] [&_textarea]:select-text [&_textarea]:[-webkit-user-select:text]"
      onWheelCapture={handlePageWheel}
    >
      <h1 className="text-2xl font-bold">Applications</h1>

      <Card className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div className="space-y-1 min-w-0">
          <Label className="text-xs">District</Label>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={load} className="w-full sm:w-auto">Refresh</Button>
      </Card>

      {(districtFilter !== "all" || statusFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filters:</span>
          {districtFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {districts.find((d) => d.id === districtFilter)?.name ?? "District"}
              <button className="ml-1" onClick={() => setDistrictFilter("all")} aria-label="Clear district">×</button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {STATUS_LABELS[statusFilter] ?? statusFilter}
              <button className="ml-1" onClick={() => setStatusFilter("all")} aria-label="Clear status">×</button>
            </Badge>
          )}
          <button
            className="underline"
            onClick={() => { setDistrictFilter("all"); setStatusFilter("all"); }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Loading…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No applications.</Card>
        ) : rows.map((r) => (
          <Card key={r.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">{r.application_id}</div>
                <div className="font-semibold text-sm truncate">{r.full_name}</div>
                {r.company_name && <div className="text-xs text-muted-foreground truncate">{r.company_name}</div>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[r.status] ?? r.status}</Badge>
                {r.is_blocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="truncate">📱 {r.phone}</div>
              <div className="truncate">📍 {r.district?.name ?? "—"}</div>
              <div className="truncate col-span-2">✉ {r.email}</div>
            </div>
            <Button size="sm" className="w-full" onClick={() => setSelected({ app: r, tab: "status" })}>
              Manage • Status • Docs • Block
            </Button>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block p-0 overflow-hidden">
        <div className="overflow-x-auto select-none [&_*]:select-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[120px]">App ID</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Sector / Type</TableHead>
              <TableHead className="whitespace-nowrap">Est. Value</TableHead>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[320px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No applications.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className={`align-top ${r.is_blocked ? "bg-destructive/5" : ""}`}>
                <TableCell className="font-mono text-xs py-3">{r.application_id}</TableCell>
                <TableCell className="py-3">
                  <div className="font-medium text-sm">{r.full_name}</div>
                  {r.company_name && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.company_name}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">{r.phone}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.email}</div>
                </TableCell>
                <TableCell className="py-3 text-sm">
                  <div>{r.district?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.state?.name ?? "—"}</div>
                </TableCell>
                <TableCell className="py-3 text-sm">
                  <div>{r.category?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.tender_type_preference ?? "—"}</div>
                </TableCell>
                <TableCell className="py-3 text-xs whitespace-nowrap">
                  {formatINR(r.budget_range_min)}
                  <div className="text-muted-foreground">– {formatINR(r.budget_range_max)}</div>
                </TableCell>
                <TableCell className="py-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant="secondary" className="whitespace-nowrap">{STATUS_LABELS[r.status] ?? r.status}</Badge>
                    {r.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button size="sm" onClick={() => setSelected({ app: r, tab: "status" })} className="h-8">
                      <Activity className="h-3.5 w-3.5 mr-1" />Status
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelected({ app: r, tab: "cdocs" })} className="h-8">
                      <FileText className="h-3.5 w-3.5 mr-1" />Docs
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelected({ app: r, tab: "info" })} className="h-8">
                      Manage
                    </Button>
                    <Button
                      size="sm"
                      variant={r.is_blocked ? "outline" : "ghost"}
                      className={`h-8 ${r.is_blocked ? "text-emerald-700 border-emerald-500/40 hover:bg-emerald-50" : "text-destructive hover:bg-destructive/10 hover:text-destructive"}`}
                      disabled={blocking === r.id}
                      onClick={() => toggleBlock(r)}
                      title={r.is_blocked ? "Unblock application" : "Block application"}
                    >
                      {r.is_blocked ? <ShieldCheck className="h-3.5 w-3.5 mr-1" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
                      {r.is_blocked ? "Unblock" : "Block"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      {selected && (
        <ManageDialog
          app={selected.app}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
          onSaved={(updated) => { load(); if (updated) setSelected({ app: updated, tab: selected.tab }); }}
        />

      )}

    </div>
  );
}

function ManageDialog({ app, initialTab = "status", onClose, onSaved }: { app: App; initialTab?: DialogTab; onClose: () => void; onSaved: (updated?: App) => void }) {
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [customStatusMsg, setCustomStatusMsg] = useState<string>(app.custom_status_message ?? "");
  const [customerRemarks, setCustomerRemarks] = useState<string>(app.customer_remarks ?? "");
  const [isBlocked, setIsBlocked] = useState<boolean>(!!app.is_blocked);
  const [customerUploadEnabled, setCustomerUploadEnabled] = useState<boolean>(!!app.customer_upload_enabled);
  const [remarks, setRemarks] = useState("");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [callDate, setCallDate] = useState<string>(app.call_scheduled_date ?? tomorrow);
  const [callStatus, setCallStatus] = useState<string>(app.call_status ?? "pending");
  const [callRemarks, setCallRemarks] = useState<string>(app.call_remarks ?? "");
  const [callTouched, setCallTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerDocs, setCustomerDocs] = useState<any[]>([]);
  const [adminDocs, setAdminDocs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCat, setUploadCat] = useState<string>("Tender PDF");
  const [uploadPublish, setUploadPublish] = useState<boolean>(true);
  const [pendingAdminFile, setPendingAdminFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null; path: string; bucket: DocumentBucket } | null>(null);

  const loadDocs = useCallback(async () => {
    const [{ data: cd }, { data: ad }, { data: h }] = await Promise.all([
      supabase.from("customer_documents").select("*").eq("app_id", app.id).order("uploaded_at", { ascending: false }),
      supabase.from("admin_documents").select("*").eq("app_id", app.id).order("uploaded_at", { ascending: false }),
      supabase.from("status_history").select("*").eq("app_id", app.id).order("changed_at", { ascending: false }),
    ]);
    setCustomerDocs(cd ?? []);
    setAdminDocs(ad ?? []);
    setHistory(h ?? []);
  }, [app.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Realtime: refetch customer docs when they change for this application, so
  // uploads made from /track show up without closing the dialog.
  useEffect(() => {
    const ch = supabase
      .channel(`cust-docs-${app.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_documents", filter: `app_id=eq.${app.id}` },
        () => { loadDocs(); },
      )
      .subscribe();
    // Also poll every 15s as a safety net in case realtime isn't enabled on the table.
    const iv = setInterval(loadDocs, 15000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [app.id, loadDocs]);

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;

    const callNote = callTouched
      ? [
          callDate ? `Call date: ${new Date(`${callDate}T00:00:00`).toLocaleDateString()}` : null,
          callStatus ? `Call status: ${formatCallStatus(callStatus)}` : null,
          callRemarks.trim() ? `Call remarks: ${callRemarks.trim()}` : null,
        ].filter(Boolean).join("\n")
      : "";
    const historyNote = [remarks.trim(), callNote].filter(Boolean).join("\n") || null;
    const customStatusText = customStatusMsg.trim();
    const customerRemarksText = customerRemarks.trim();
    const applicationPatch: any = {
      status,
      custom_status_message: customStatusText || null,
      customer_remarks: customerRemarksText || null,
      is_blocked: isBlocked,
      customer_upload_enabled: customerUploadEnabled,
    };
    if (callTouched || app.call_scheduled_date || app.call_status || app.call_remarks) {
      applicationPatch.call_scheduled_date = callDate || null;
      applicationPatch.callback_scheduled_at = callDate ? `${callDate}T00:00:00+05:30` : null;
      applicationPatch.call_status = callStatus;
      applicationPatch.call_remarks = callRemarks.trim() || null;
    }

    const { error: updErr } = await supabase.from("applications").update(applicationPatch).eq("id", app.id);
    if (updErr) { toast.error(updErr.message); setSaving(false); return; }

    // Record a timeline entry whenever admin writes a custom status OR changes
    // the predefined status OR adds a call update OR internal remarks.
    const shouldRecordHistory =
      customStatusText ||
      status !== app.status ||
      remarks.trim() ||
      callNote;
    if (shouldRecordHistory) {
      const { error: histErr } = await supabase.from("status_history").insert({
        app_id: app.id,
        from_status: status !== app.status ? app.status : null,
        to_status: status,
        changed_by: uid ?? null,
        notes: historyNote,
        custom_status_message: customStatusText || null,
      });
      if (histErr) toast.error(histErr.message);
    }
    if (pendingAdminFile) {
      const uploaded = await uploadAdminDoc(pendingAdminFile, false);
      if (!uploaded) { setSaving(false); return; }
    }
    toast.success("Application updated");
    setRemarks("");
    setCallTouched(false);
    setPendingAdminFile(null);
    const { data: fresh } = await supabase.from("applications").select("*").eq("id", app.id).maybeSingle();
    await loadDocs();
    setSaving(false);
    onSaved((fresh as App) ?? app);

  }

  async function openDoc(path: string, bucket: DocumentBucket, name?: string, mime?: string | null) {
    const fileName = name || path.split("/").pop() || "document";
    if (!isBrowserPreviewableFile(mime, fileName)) {
      toast.info("Preview not available for this file type. Downloading…");
      await downloadDoc(path, fileName, bucket);
      return;
    }
    try {
      const url = await createDocumentPreviewBlobUrl(path, bucket);
      setPreview((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return { url, name: fileName, mime: mime ?? null, path, bucket }; });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open document");
    }
  }

  async function downloadDoc(path: string, name: string, bucket: DocumentBucket) {
    try {
      await downloadDocument(path, name, bucket);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download document");
    }
  }

  async function markCustomerDoc(id: string, state: "approved" | "rejected", note: string) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const patch: any = state === "approved"
      ? { verification_status: "approved", verified_by: uid, verified_at: new Date().toISOString(), rejection_reason: null }
      : { verification_status: "rejected", verified_by: uid, verified_at: new Date().toISOString(), rejection_reason: note || "Rejected by admin" };
    const { error } = await supabase.from("customer_documents").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(state === "approved" ? "Marked verified" : "Marked rejected");
    loadDocs();
  }

  async function togglePublish(id: string, next: boolean) {
    const { error } = await supabase.from("admin_documents").update({ is_visible_to_customer: next }).eq("id", id);
    if (error) toast.error(error.message);
    else loadDocs();
  }

  async function uploadAdminDoc(file: File, refresh = true): Promise<boolean> {
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast.error("Session expired. Please sign in again.");
      setUploading(false);
      return false;
    }
    const cat = (uploadCat || "").trim() || "Supporting Documents";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `admin-documents/${app.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from(ADMIN_DOC_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (upErr) { toast.error(upErr.message); setUploading(false); return false; }
    const { error: insErr } = await supabase.from("admin_documents").insert({
      app_id: app.id,
      uploaded_by: uid,
      document_name: file.name,
      document_category: cat,
      file_path: path,
      file_size_bytes: file.size,
      mime_type: file.type,
      is_visible_to_customer: uploadPublish,
    });
    if (insErr) { toast.error(insErr.message); setUploading(false); return false; }
    toast.success("Uploaded");
    setPendingAdminFile(null);
    setUploading(false);
    if (refresh) loadDocs();
    return true;
  }

  const handleDialogWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || shouldKeepWheelNative(event.target)) return;
    if (wheelScroll(event.currentTarget, event.deltaY)) event.preventDefault();
  };

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-4xl w-[calc(100vw-1rem)] max-h-[92dvh] min-h-0 overflow-y-auto overscroll-contain touch-pan-y select-none [-webkit-user-select:none] [-webkit-touch-callout:none] [&_input]:select-text [&_input]:[-webkit-user-select:text] [&_textarea]:select-text [&_textarea]:[-webkit-user-select:text] p-4 sm:p-6"
        onWheelCapture={handleDialogWheel}
      >
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg break-all flex items-center gap-2 flex-wrap">
            {app.application_id} — {app.full_name}
            {isBlocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
          </DialogTitle>
          <DialogDescription className="sr-only">Manage application status, documents, calls, and timeline.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-6">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="call">Call</TabsTrigger>
              <TabsTrigger value="cdocs">Customer Docs</TabsTrigger>
              <TabsTrigger value="adocs">Admin Docs</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="space-y-3 pt-4">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <Field label="Full Name" value={app.full_name} />
              <Field label="Company" value={app.company_name ?? "—"} />
              <Field label="Mobile" value={app.phone} />
              <Field label="Email" value={app.email} />
              <Field label="GST Number" value={app.gst_number ?? "—"} />
              <Field label="State" value={app.state?.name ?? "—"} />
              <Field label="District" value={app.district?.name ?? "—"} />
              <Field label="Sector" value={app.category?.name ?? "—"} />
              <Field label="Tender Type" value={app.tender_type_preference ?? "—"} />
              <Field label="Estimated Value Range" value={`${formatINR(app.budget_range_min)} – ${formatINR(app.budget_range_max)}`} />
              <Field label="Submitted" value={new Date(app.created_at).toLocaleString()} />
            </div>
            {app.additional_notes && (
              <div>
                <Label className="text-xs">Additional Notes</Label>
                <div className="text-sm border rounded p-2 whitespace-pre-wrap">{app.additional_notes}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4 pt-4">
            {/* Current status header */}
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Current status</div>
                  <div className="text-lg font-bold mt-0.5">{STATUS_LABELS[app.status] ?? app.status}</div>
                </div>
                {status !== app.status && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-orange-700 border-orange-500/30 border">
                    Unsaved: → {STATUS_LABELS[status] ?? status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Change status */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Change status</Label>
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                After changing the status, click "Save changes" below — a timeline entry will be added automatically.
              </p>
            </div>

            {/* Custom message */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Custom status message</Label>
                <Badge variant="secondary" className="text-[10px]">Shown on /track</Badge>
              </div>
              <Textarea
                value={customStatusMsg}
                onChange={(e) => setCustomStatusMsg(e.target.value)}
                rows={2}
                placeholder="e.g. Your documents have been verified, we will call you tomorrow."
              />
              <p className="text-[11px] text-muted-foreground">
                If left empty, the default status message will be shown.
              </p>
            </div>

            {/* Public remarks */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Public remarks</Label>
                <Badge variant="secondary" className="text-[10px]">Shown on /track</Badge>
              </div>
              <Textarea
                value={customerRemarks}
                onChange={(e) => setCustomerRemarks(e.target.value)}
                rows={3}
                placeholder="e.g. Please send scanned copies of the original documents."
              />
            </div>

            {/* Internal remarks */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Internal remarks</Label>
                <Badge variant="outline" className="text-[10px]">Timeline only</Badge>
              </div>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Admin-only note for the status history" />
            </div>

            {/* Block */}
            <div className={`rounded-lg border p-4 flex items-center justify-between gap-3 ${isBlocked ? "bg-destructive/5 border-destructive/30" : "bg-muted/30"}`}>
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {isBlocked ? <Ban className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                  Block this application
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  When blocked, the customer will only see a blocked notice on /track.
                </div>
              </div>
              <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
            </div>

            {/* Customer upload toggle (auto-save) */}
            <div className="rounded-lg border p-4 flex items-center justify-between gap-3 bg-muted/30">
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Allow customer to upload documents
                  <Badge variant="outline" className="text-[10px]">Auto-save</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  When ON, the "Upload Documents" section will appear immediately on the customer's /track page.
                </div>
              </div>
              <Switch
                checked={customerUploadEnabled}
                onCheckedChange={async (next) => {
                  setCustomerUploadEnabled(next);
                  const { error } = await supabase
                    .from("applications")
                    .update({ customer_upload_enabled: next })
                    .eq("id", app.id);
                  if (error) {
                    setCustomerUploadEnabled(!next);
                    toast.error(error.message);
                  } else {
                    toast.success(next ? "Upload enabled for customer" : "Upload disabled");
                    onSaved();
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="call" className="space-y-3 pt-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Call scheduled date (default: next day)</Label>
                <Input type="date" value={callDate} onChange={(e) => { setCallDate(e.target.value); setCallTouched(true); }} />
              </div>
              <div>
                <Label>Call status</Label>
                <Select value={callStatus} onValueChange={(value) => { setCallStatus(value); setCallTouched(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALL_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Call remarks</Label>
              <Textarea value={callRemarks} onChange={(e) => { setCallRemarks(e.target.value); setCallTouched(true); }} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="cdocs" className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-lg bg-muted/40 border p-3 text-xs text-muted-foreground flex items-center gap-2 flex-1">
                <FileText className="h-4 w-4 shrink-0" />
                Files uploaded by the customer — you can preview, download, verify or reject them.
              </div>
              <Button size="sm" variant="outline" onClick={() => { loadDocs(); toast.success("Refreshed"); }}>
                Refresh
              </Button>
            </div>
            {customerDocs.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-lg p-6 text-center bg-muted/20">
                The customer has not uploaded any documents yet.
              </div>
            ) : customerDocs.map((d) => {
              const st = formatDocStatus(d.verification_status);
              const stBadge = st === "verified"
                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                : st === "rejected"
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-orange-700 border-orange-500/30";
              return (
                <div key={d.id} className="border rounded-lg p-3 space-y-3 bg-card">
                  <div className="flex items-start justify-between gap-2 text-sm flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{d.document_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{d.document_type}</span>
                        <span>•</span>
                        <span>{new Date(d.uploaded_at).toLocaleString()}</span>
                        <Badge className={`text-[10px] border ${stBadge} capitalize`}>{st}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openDoc(d.file_path, "customer-uploads", d.document_name, d.mime_type)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(d.file_path, d.document_name, "customer-uploads")}>
                        <Download className="h-3.5 w-3.5 mr-1" />Download
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      placeholder="Rejection reason (required for Reject)"
                      className="h-9 text-xs flex-1 min-w-[180px]"
                      onChange={(e) => (d.__note = e.target.value)}
                      defaultValue={d.rejection_reason ?? ""}
                    />
                    <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markCustomerDoc(d.id, "approved", "")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => markCustomerDoc(d.id, "rejected", d.__note ?? d.rejection_reason ?? "")}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="adocs" className="space-y-3 pt-4">
            <div className="rounded-lg border p-4 space-y-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Upload document for this application</Label>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Input
                  list="admin-doc-category-suggestions"
                  value={uploadCat}
                  onChange={(e) => setUploadCat(e.target.value)}
                  placeholder="e.g. Tender PDF, EMD Receipt, or any custom label"
                />
                <datalist id="admin-doc-category-suggestions">
                  {ADMIN_DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value} />)}
                </datalist>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={uploadPublish} onCheckedChange={setUploadPublish} id="pub" />
                  <Label htmlFor="pub" className="text-xs">Publish to customer</Label>
                </div>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt,.zip"
                  className="w-full sm:w-64"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPendingAdminFile(file);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  disabled={!pendingAdminFile || uploading}
                  onClick={() => pendingAdminFile && uploadAdminDoc(pendingAdminFile)}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
              {pendingAdminFile && (
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Selected: <span className="font-medium">{pendingAdminFile.name}</span>
                </div>
              )}
            </div>
            {adminDocs.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-lg p-6 text-center bg-muted/20">
                No admin documents have been uploaded yet.
              </div>
            ) : adminDocs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3 text-sm bg-card">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{d.document_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{d.document_category}</Badge>
                    <span>{new Date(d.uploaded_at).toLocaleString()}</span>
                    {d.is_visible_to_customer
                      ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30 border">Published</Badge>
                      : <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={d.is_visible_to_customer} onCheckedChange={(v) => togglePublish(d.id, v)} />
                    <span className="text-xs">Publish</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDoc(d.file_path, ADMIN_DOC_BUCKET, d.document_name, d.mime_type)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadDoc(d.file_path, d.document_name, ADMIN_DOC_BUCKET)}>
                    <Download className="h-3.5 w-3.5 mr-1" />Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete "${d.document_name}"? This cannot be undone.`)) return;
                      await supabase.storage.from(ADMIN_DOC_BUCKET).remove([d.file_path]);
                      const { error } = await supabase.from("admin_documents").delete().eq("id", d.id);
                      if (error) toast.error(error.message);
                      else { toast.success("Deleted"); loadDocs(); }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-2 pt-4">
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No status changes yet.</div>
            ) : (
              <ol className="relative border-l pl-4 space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary" />
                    <div className="text-sm">
                      <span className="font-medium">
                        {STATUS_LABELS[h.from_status as keyof typeof STATUS_LABELS] ?? h.from_status ?? "—"}
                      </span>
                      {" → "}
                      <span className="font-medium">
                        {STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] ?? h.to_status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</div>
                    {h.notes && <div className="text-xs mt-1 border-l-2 pl-2">{h.notes}</div>}
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
              onDownload={() => downloadDoc(preview.path, preview.name, preview.bucket)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function formatDocStatus(status: string | null | undefined) {
  if (status === "approved" || status === "verified") return "verified";
  return status ?? "pending";
}

function formatCallStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
