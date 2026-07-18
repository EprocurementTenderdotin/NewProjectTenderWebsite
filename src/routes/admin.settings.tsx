import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  component: AdminSettings,
});

function AdminSettings() {
  const [user, setUser] = useState<any>(null);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function changePassword() {
    if (pw.length < 8) { toast.error("Min 8 characters"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPw(""); }
    setSaving(false);
  }

  async function rollForwardDates() {
    const { error } = await supabase.rpc("roll_forward_tender_dates");
    if (error) toast.error(error.message);
    else toast.success("Tender dates rolled forward");
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="p-4 space-y-3">
        <div className="font-semibold">Account</div>
        <div className="text-sm">Signed in as: <span className="font-mono">{user?.email}</span></div>
        <div className="space-y-1">
          <Label>New password</Label>
          <div className="flex gap-2">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Button onClick={changePassword} disabled={saving}>Update</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="font-semibold">Tender maintenance</div>
        <p className="text-sm text-muted-foreground">
          Manually roll forward relative-date tenders that have auto-update enabled.
          (Set up a cron job to run <code>select public.roll_forward_tender_dates();</code> daily.)
        </p>
        <Button variant="outline" onClick={rollForwardDates}>Roll forward now</Button>
      </Card>
    </div>
  );
}
