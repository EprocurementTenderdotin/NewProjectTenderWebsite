import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLogin,
});

const REMEMBER_KEY = "ept_admin_remember_email";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const admin = await isCurrentUserAdmin();
    if (!admin) {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      setLoading(false);
      return;
    }
    if (remember) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/10 p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border-primary/10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center shadow-lg mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Admin Sign In</h1>
          <p className="text-sm text-muted-foreground mt-1">
            eProcurementTender.com — access restricted to admins.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="admin@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            <span>Remember me on this device</span>
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          Session stays active until you sign out. Application ID lookups on Track Status will continue to work for all customers even if this session expires.
        </p>
      </Card>
    </div>
  );
}
