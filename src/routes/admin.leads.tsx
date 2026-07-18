import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, AlertTriangle } from "lucide-react";
import { STATUS_LABELS } from "@/lib/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

type FieldIssue = { row: number; label: string; field: string; issue: string };

function validateRows<T>(rows: T[], rules: { field: string; label: string; get: (r: T) => unknown; required?: boolean; match?: RegExp; matchMsg?: string }[], labelOf: (r: T, i: number) => string): FieldIssue[] {
  const out: FieldIssue[] = [];
  rows.forEach((r, i) => {
    for (const rule of rules) {
      const v = rule.get(r);
      const empty = v === null || v === undefined || String(v).trim() === "";
      if (rule.required && empty) {
        out.push({ row: i + 1, label: labelOf(r, i), field: rule.label, issue: "missing" });
      } else if (!empty && rule.match && !rule.match.test(String(v).trim())) {
        out.push({ row: i + 1, label: labelOf(r, i), field: rule.label, issue: rule.matchMsg ?? "invalid format" });
      }
    }
  });
  return out;
}

export const Route = createFileRoute("/admin/leads")({
  ssr: false,
  component: AdminLeads,
});

interface ApplyRow {
  id: string;
  application_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  company_name: string | null;
  tender_type_preference: string | null;
  budget_range_min: number | null;
  budget_range_max: number | null;
  additional_notes: string | null;
  status: string | null;
  custom_status_message: string | null;
  created_at: string;
  state?: { name: string } | null;
  district?: { name: string } | null;
  category?: { name: string } | null;
}

interface ContactRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string | null;
  is_contacted: boolean;
  created_at: string;
  state?: { name: string } | null;
  district?: { name: string } | null;
}

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isContactApplication(row: Pick<ApplyRow, "additional_notes">) {
  return row.additional_notes?.trim().toLowerCase().startsWith("[contact form]") ?? false;
}

function businessType(notes: string | null | undefined) {
  return notes?.match(/^Business Type:\s*(.+)$/i)?.[1]?.trim() ?? "";
}

function AdminLeads() {
  const [applyRows, setApplyRows] = useState<ApplyRow[]>([]);
  const [contactRows, setContactRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [applySel, setApplySel] = useState<Set<string>>(new Set());
  const [contactSel, setContactSel] = useState<Set<string>>(new Set());
  const [issues, setIssues] = useState<{ title: string; list: FieldIssue[]; proceed: () => void } | null>(null);


  useEffect(() => {
    (async () => {
      const [apps, leads] = await Promise.all([
        supabase
          .from("applications")
          .select("id, application_id, full_name, phone, email, company_name, tender_type_preference, budget_range_min, budget_range_max, additional_notes, status, custom_status_message, created_at, state:states(name), district:districts(name), category:tender_categories(name)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("leads_tracking")
          .select("*, state:states(name), district:districts(name)")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      setApplyRows(((apps.data as ApplyRow[] | null) ?? []).filter((row) => !isContactApplication(row)));
      setContactRows((leads.data as ContactRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const applyAllChecked = useMemo(
    () => applyRows.length > 0 && applySel.size === applyRows.length,
    [applyRows, applySel],
  );
  const contactAllChecked = useMemo(
    () => contactRows.length > 0 && contactSel.size === contactRows.length,
    [contactRows, contactSel],
  );

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function doExportApply(chosen: ApplyRow[]) {
    downloadCsv(
      `apply-now-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "S.No", "Application ID", "Date", "Full Name", "Phone", "Email", "Company",
        "Business Type", "Tender Type", "Sector", "State", "District",
        "Budget Min", "Budget Max", "Status", "Notes",
      ],
      chosen.map((r, i) => [
        i + 1,
        r.application_id,
        new Date(r.created_at).toLocaleString("en-IN"),
        r.full_name,
        r.phone,
        r.email ?? "",
        r.company_name ?? "",
        businessType(r.additional_notes),
        r.tender_type_preference ?? "",
        r.category?.name ?? "",
        r.state?.name ?? "",
        r.district?.name ?? "",
        r.budget_range_min ?? "",
        r.budget_range_max ?? "",
        r.custom_status_message || STATUS_LABELS[r.status ?? ""] || r.status || "",
        r.additional_notes ?? "",
      ]),
    );
    toast.success(`Exported ${chosen.length} apply-now lead${chosen.length === 1 ? "" : "s"}.`);
  }

  function exportApply() {
    const chosen = applyRows.filter((r) => applySel.has(r.id));
    if (chosen.length === 0) return;
    const found = validateRows(chosen, [
      { field: "application_id", label: "Application ID", get: (r) => r.application_id, required: true },
      { field: "full_name", label: "Full Name", get: (r) => r.full_name, required: true },
      { field: "phone", label: "Phone", get: (r) => r.phone, required: true, match: PHONE_RE, matchMsg: "invalid phone (need 10 digits, starts 6-9)" },
      { field: "email", label: "Email", get: (r) => r.email, match: EMAIL_RE, matchMsg: "invalid email format" },
      { field: "company_name", label: "Company", get: (r) => r.company_name, required: true },
      { field: "state", label: "State", get: (r) => r.state?.name, required: true },
      { field: "district", label: "District", get: (r) => r.district?.name, required: true },
      { field: "category", label: "Sector", get: (r) => r.category?.name, required: true },
      { field: "tender_type_preference", label: "Tender Type", get: (r) => r.tender_type_preference, required: true },
      { field: "budget_range_min", label: "Budget Min", get: (r) => r.budget_range_min, required: true },
      { field: "budget_range_max", label: "Budget Max", get: (r) => r.budget_range_max, required: true },
    ], (r) => r.application_id || r.full_name);
    if (found.length > 0) {
      toast.warning(`${found.length} field issue${found.length === 1 ? "" : "s"} found across selected rows.`);
      setIssues({ title: "Apply Now export – field issues", list: found, proceed: () => doExportApply(chosen) });
      return;
    }
    doExportApply(chosen);
  }

  function doExportContact(chosen: ContactRow[]) {
    downloadCsv(
      `contact-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      ["S.No", "Date", "Full Name", "Phone", "Email", "Source", "State", "District", "Contacted", "Message"],
      chosen.map((r, i) => [
        i + 1,
        new Date(r.created_at).toLocaleString("en-IN"),
        r.full_name,
        r.phone,
        r.email ?? "",
        r.source ?? "",
        r.state?.name ?? "",
        r.district?.name ?? "",
        r.is_contacted ? "Yes" : "No",
        r.message ?? "",
      ]),
    );
    toast.success(`Exported ${chosen.length} contact lead${chosen.length === 1 ? "" : "s"}.`);
  }

  function exportContact() {
    const chosen = contactRows.filter((r) => contactSel.has(r.id));
    if (chosen.length === 0) return;
    const found = validateRows(chosen, [
      { field: "full_name", label: "Full Name", get: (r) => r.full_name, required: true },
      { field: "phone", label: "Phone", get: (r) => r.phone, required: true, match: PHONE_RE, matchMsg: "invalid phone (need 10 digits, starts 6-9)" },
      { field: "email", label: "Email", get: (r) => r.email, match: EMAIL_RE, matchMsg: "invalid email format" },
      { field: "message", label: "Message", get: (r) => r.message, required: true },
    ], (r) => r.full_name || r.phone);
    if (found.length > 0) {
      toast.warning(`${found.length} field issue${found.length === 1 ? "" : "s"} found across selected rows.`);
      setIssues({ title: "Contact export – field issues", list: found, proceed: () => doExportContact(chosen) });
      return;
    }
    doExportContact(chosen);
  }


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Leads from both the Apply Now and Contact forms are shown here in separate tabs. Select rows to download only the selected ones.
        </p>
      </div>

      <Tabs defaultValue="apply" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="apply">Apply Now Leads ({applyRows.length})</TabsTrigger>
          <TabsTrigger value="contact">Contact Leads ({contactRows.length})</TabsTrigger>
        </TabsList>

        {/* ===== APPLY NOW ===== */}
        <TabsContent value="apply" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {applySel.size} selected of {applyRows.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setApplySel(new Set())} disabled={applySel.size === 0}>
                Clear
              </Button>
              <Button size="sm" onClick={exportApply} disabled={applySel.size === 0}>
                <Download className="w-4 h-4 mr-1" /> Download Selected
              </Button>
            </div>
          </div>

          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={applyAllChecked}
                      onCheckedChange={(v) =>
                        setApplySel(v ? new Set(applyRows.map((r) => r.id)) : new Set())
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : applyRows.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No apply-now leads yet.</TableCell></TableRow>
                ) : applyRows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={applySel.has(r.id)}
                        onCheckedChange={() => toggle(applySel, r.id, setApplySel)}
                        aria-label={`Select ${r.application_id}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{r.application_id}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.company_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.tender_type_preference ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.budget_range_min !== null && r.budget_range_max !== null
                        ? `${r.budget_range_min} – ${r.budget_range_max}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.district?.name ?? r.state?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {r.custom_status_message || STATUS_LABELS[r.status ?? ""] || r.status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon" title="Open in Applications">
                        <Link to="/admin/applications">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== CONTACT ===== */}
        <TabsContent value="contact" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {contactSel.size} selected of {contactRows.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setContactSel(new Set())} disabled={contactSel.size === 0}>
                Clear
              </Button>
              <Button size="sm" onClick={exportContact} disabled={contactSel.size === 0}>
                <Download className="w-4 h-4 mr-1" /> Download Selected
              </Button>
            </div>
          </div>

          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={contactAllChecked}
                      onCheckedChange={(v) =>
                        setContactSel(v ? new Set(contactRows.map((r) => r.id)) : new Set())
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : contactRows.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No contact leads yet.</TableCell></TableRow>
                ) : contactRows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={contactSel.has(r.id)}
                        onCheckedChange={() => toggle(contactSel, r.id, setContactSel)}
                        aria-label={`Select ${r.full_name}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.district?.name ?? r.state?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_contacted ? "default" : "secondary"}>
                        {r.is_contacted ? "Contacted" : "New"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs" title={r.message ?? ""}>{r.message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!issues} onOpenChange={(o) => !o && setIssues(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {issues?.title}
            </DialogTitle>
            <DialogDescription>
              {issues?.list.length} field issue{issues?.list.length === 1 ? "" : "s"} detected. Review before exporting — you can still download if you want partial data.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues?.list.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-muted-foreground">{it.row}</TableCell>
                    <TableCell className="text-xs font-medium">{it.label}</TableCell>
                    <TableCell className="text-xs">{it.field}</TableCell>
                    <TableCell className="text-xs text-amber-700 dark:text-amber-400">{it.issue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssues(null)}>Cancel</Button>
            <Button
              onClick={() => {
                issues?.proceed();
                setIssues(null);
              }}
            >
              <Download className="w-4 h-4 mr-1" /> Download anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
