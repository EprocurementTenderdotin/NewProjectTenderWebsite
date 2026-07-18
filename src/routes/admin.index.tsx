import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/admin";
import { formatINR } from "@/lib/format";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  FileText, Clock, TrendingUp, Package, PhoneCall,
  ArrowUpRight, Users, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

interface Stats {
  total_applications: number;
  total_tenders: number;
  total_leads: number;
  calls_due_today: number;
  new_this_week: number;
  status_breakdown: Record<string, number>;
  by_day: { day: string; count: number }[];
}

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#14b8a6","#3b82f6","#a855f7","#64748b"];

const TERMINAL = new Set(["completed", "rejected", "cancelled"]);

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [todaysNew, setTodaysNew] = useState<number | null>(null);
  const [callsDue, setCallsDue] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_dashboard_stats");
      if (data) {
        const s = data as Stats;
        setStats(s);
        const p = Object.entries(s.status_breakdown ?? {})
          .filter(([k]) => !TERMINAL.has(k))
          .reduce((sum, [, v]) => sum + (v as number), 0);
        setPending(p);
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: newCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString());
      setTodaysNew(newCount ?? 0);

      const today = new Date().toISOString().slice(0, 10);
      const { data: cd } = await supabase
        .from("applications")
        .select("id, application_id, full_name, phone, call_scheduled_date, status, budget_range_min, budget_range_max, tender_type_preference, district:districts(name)")
        .lte("call_scheduled_date", today)
        .neq("call_status", "completed")
        .order("call_scheduled_date", { ascending: true })
        .limit(10);
      setCallsDue(cd ?? []);

      const { data: rc } = await supabase
        .from("applications")
        .select("id, application_id, full_name, phone, status, budget_range_min, budget_range_max, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecent(rc ?? []);
    })();
  }, []);

  const pie = stats
    ? Object.entries(stats.status_breakdown ?? {})
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => ({
          name: STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k,
          value: v,
        }))
    : [];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5" /> {today}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/applications">
              <FileText className="w-4 h-4 mr-1.5" /> Applications
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/tenders">
              <Package className="w-4 h-4 mr-1.5" /> Tenders
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Applications"
          value={stats?.total_applications ?? "…"}
          icon={FileText}
          gradient="from-indigo-500 to-blue-600"
          hint={stats ? `+${stats.new_this_week} this week` : undefined}
        />
        <StatCard
          label="Pending"
          value={pending ?? "…"}
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
          hint="in progress"
        />
        <StatCard
          label="Today's New"
          value={todaysNew ?? "…"}
          icon={TrendingUp}
          gradient="from-emerald-500 to-green-600"
          hint="last 24 hours"
        />
        <StatCard
          label="Active Tenders"
          value={stats?.total_tenders ?? "…"}
          icon={Package}
          gradient="from-violet-500 to-purple-600"
          hint={stats ? `${stats.total_leads} leads` : undefined}
        />
      </div>

      {/* Calls Due */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive grid place-items-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Calls Due Today / Overdue</div>
              <div className="text-xs text-muted-foreground">Follow up with these applicants</div>
            </div>
          </div>
          <Badge variant={callsDue.length > 0 ? "destructive" : "secondary"}>
            {callsDue.length}
          </Badge>
        </div>
        {callsDue.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            🎉 No calls due. You're all caught up!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/20">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium">Name</th>
                  <th className="text-left py-2.5 px-4 font-medium">Mobile</th>
                  <th className="text-left py-2.5 px-4 font-medium">District</th>
                  <th className="text-left py-2.5 px-4 font-medium">Estimated Value</th>
                  <th className="text-left py-2.5 px-4 font-medium">Type</th>
                  <th className="text-left py-2.5 px-4 font-medium">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {callsDue.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/40 transition">
                    <td className="py-2.5 px-4">
                      <Link to="/admin/applications" className="font-medium hover:underline">
                        {c.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">{c.application_id}</div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">{c.phone}</td>
                    <td className="py-2.5 px-4">{c.district?.name ?? "—"}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-xs">{formatINR(c.budget_range_min)} – {formatINR(c.budget_range_max)}</td>
                    <td className="py-2.5 px-4">{c.tender_type_preference ?? "—"}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">{c.call_scheduled_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">Applications — Last 30 Days</div>
              <div className="text-xs text-muted-foreground">Daily submission trend</div>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats?.by_day ?? []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => d?.slice(5)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">By Status</div>
              <div className="text-xs text-muted-foreground">Application breakdown</div>
            </div>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            {pie.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {pie.length > 0 && (
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
              {pie.slice(0, 6).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{p.value as number}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Recent Applications</div>
              <div className="text-xs text-muted-foreground">Latest 10 submissions</div>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/applications">
              View all <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="divide-y">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No applications yet.</div>
          ) : recent.map((r) => (
            <Link
              key={r.id}
              to="/admin/applications"
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/40 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.full_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{r.application_id}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatINR(r.budget_range_min)} – {formatINR(r.budget_range_max)} • {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto shrink-0">
                {STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] ?? r.status}
              </Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, gradient, hint,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  hint?: string;
}) {
  return (
    <Card className="p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 tabular-nums">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} text-white grid place-items-center shrink-0 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
