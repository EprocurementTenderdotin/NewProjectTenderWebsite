import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/tenders")({
  ssr: false,
  component: AdminTenders,
});

interface T {
  id: string;
  tender_reference: string;
  title: string;
  description: string | null;
  category_id: string | null;
  state_id: string | null;
  district_id: string | null;
  estimated_value: number | null;
  emd_amount: number | null;
  tender_fee: number | null;
  security_deposit_amount: number | null;
  issuing_authority: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  date_mode: "fixed" | "relative";
  publish_offset_days: number | null;
  submission_offset_days: number | null;
  opening_offset_days: number | null;
  auto_update_dates: boolean;
  status: string;
  is_active: boolean;
  category?: { name: string } | null;
  state?: { name: string } | null;
}

function empty(): Partial<T> {
  return {
    tender_reference: "",
    title: "",
    description: "",
    estimated_value: 0,
    emd_amount: 0,
    tender_fee: 0,
    security_deposit_amount: 0,
    date_mode: "fixed",
    auto_update_dates: false,
    status: "active",
    is_active: true,
  };
}

function AdminTenders() {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("active");
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenders")
      .select("*, category:tender_categories(name), state:states(name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    if (!confirm("Delete this tender?")) return;
    const { error } = await supabase.from("tenders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  async function duplicate(t: T) {
    const { id: _id, category, state, ...rest } = t as any;
    const copy = {
      ...rest,
      tender_reference: `${t.tender_reference}-COPY-${Date.now().toString().slice(-4)}`,
      title: `${t.title} (Copy)`,
    };
    const { error } = await supabase.from("tenders").insert(copy);
    if (error) toast.error(error.message);
    else { toast.success("Duplicated"); load(); }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length || !confirm(`Delete ${ids.length} tender(s)?`)) return;
    setBulkBusy(true);
    const { error } = await supabase.from("tenders").delete().in("id", ids);
    setBulkBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Deleted ${ids.length}`); load(); }
  }

  async function bulkChangeStatus() {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await supabase
      .from("tenders")
      .update({ status: bulkStatus, is_active: bulkStatus === "active" })
      .in("id", ids);
    setBulkBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Updated ${ids.length}`); load(); }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tenders</h1>
        <Button onClick={() => setEditing(empty())}><Plus className="w-4 h-4 mr-1" /> Add Tender</Button>
      </div>

      {selected.size > 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-3 bg-muted/40 border-primary/40">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Change status to</Label>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={bulkChangeStatus}>Apply</Button>
          </div>
          <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={bulkDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </Card>
      )}

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Est. Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Loading…</TableCell></TableRow>
            ) : rows.map((t) => (
              <TableRow key={t.id} data-state={selected.has(t.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleOne(t.id)} aria-label={`Select ${t.tender_reference}`} />
                </TableCell>
                <TableCell className="font-mono text-xs">{t.tender_reference}</TableCell>
                <TableCell className="max-w-xs truncate">{t.title}</TableCell>
                <TableCell>{t.category?.name ?? "—"}</TableCell>
                <TableCell>{t.state?.name ?? "—"}</TableCell>
                <TableCell>{formatINR(t.estimated_value)}</TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "default" : "secondary"}>{t.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(t)}><Copy className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(t.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {editing && <TenderForm value={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TenderForm({ value, onClose, onSaved }: { value: Partial<T>; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState<Partial<T>>(value);
  const [cats, setCats] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("tender_categories").select("id, name").order("name").then(({ data }) => setCats(data ?? []));
    supabase.from("states").select("id, name").order("name").then(({ data }) => setStates(data ?? []));
  }, []);

  useEffect(() => {
    if (!t.state_id) { setDistricts([]); return; }
    supabase.from("districts").select("id, name").eq("state_id", t.state_id).order("name")
      .then(({ data }) => setDistricts(data ?? []));
  }, [t.state_id]);

  const set = (patch: Partial<T>) => setT((prev) => ({ ...prev, ...patch }));

  async function save() {
    setSaving(true);
    const payload: any = { ...t };
    delete payload.category; delete payload.state;
    // clean empty selects
    if (payload.category_id === "") payload.category_id = null;
    if (payload.state_id === "") payload.state_id = null;
    if (payload.district_id === "") payload.district_id = null;

    const q = payload.id
      ? supabase.from("tenders").update(payload).eq("id", payload.id)
      : supabase.from("tenders").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Saved");
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.id ? "Edit tender" : "New tender"}</DialogTitle></DialogHeader>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Reference *</Label>
            <Input value={t.tender_reference ?? ""} onChange={(e) => set({ tender_reference: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={t.status ?? "active"} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input value={t.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={t.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={t.category_id ?? ""} onValueChange={(v) => set({ category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issuing Authority</Label>
            <Input value={t.issuing_authority ?? ""} onChange={(e) => set({ issuing_authority: e.target.value })} />
          </div>
          <div>
            <Label>State</Label>
            <Select value={t.state_id ?? ""} onValueChange={(v) => set({ state_id: v, district_id: null })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>District</Label>
            <Select value={t.district_id ?? ""} onValueChange={(v) => set({ district_id: v })} disabled={!t.state_id}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estimated Value (₹) *</Label>
            <Input type="number" value={t.estimated_value ?? 0} onChange={(e) => set({ estimated_value: Number(e.target.value) })} />
          </div>
          <div>
            <Label>EMD Amount (₹)</Label>
            <Input type="number" value={t.emd_amount ?? 0} onChange={(e) => set({ emd_amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Tender Fee (₹)</Label>
            <Input type="number" value={t.tender_fee ?? 0} onChange={(e) => set({ tender_fee: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Security Deposit (₹)</Label>
            <Input type="number" value={t.security_deposit_amount ?? 0} onChange={(e) => set({ security_deposit_amount: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="font-semibold">Dates</div>
          <RadioGroup
            value={t.date_mode ?? "fixed"}
            onValueChange={(v) => set({ date_mode: v as "fixed" | "relative" })}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2"><RadioGroupItem value="fixed" /> Fixed dates</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="relative" /> Relative (days from today)</label>
          </RadioGroup>

          {t.date_mode === "relative" ? (
            <>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Publish (+days)</Label><Input type="number" value={t.publish_offset_days ?? ""} onChange={(e) => set({ publish_offset_days: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>Submission (+days)</Label><Input type="number" value={t.submission_offset_days ?? ""} onChange={(e) => set({ submission_offset_days: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>Opening (+days)</Label><Input type="number" value={t.opening_offset_days ?? ""} onChange={(e) => set({ opening_offset_days: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.auto_update_dates ?? false} onCheckedChange={(v) => set({ auto_update_dates: v })} id="auto" />
                <Label htmlFor="auto">Auto-update dates daily (rolling)</Label>
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>Publish Date</Label><Input type="date" value={t.publish_date ?? ""} onChange={(e) => set({ publish_date: e.target.value })} /></div>
              <div><Label>Submission Deadline</Label><Input type="datetime-local" value={t.submission_deadline?.slice(0,16) ?? ""} onChange={(e) => set({ submission_deadline: e.target.value })} /></div>
              <div><Label>Opening Date</Label><Input type="datetime-local" value={t.opening_date?.slice(0,16) ?? ""} onChange={(e) => set({ opening_date: e.target.value })} /></div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <Switch checked={t.is_active ?? true} onCheckedChange={(v) => set({ is_active: v })} id="active" />
          <Label htmlFor="active">Active (visible to public)</Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
