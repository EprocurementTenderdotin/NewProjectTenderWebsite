import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Package, Users, Settings, LogOut, Menu, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — eProcurementTender.com" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/applications", label: "Applications", icon: FileText },
  { to: "/admin/tenders", label: "Tenders", icon: Package },
  { to: "/admin/leads", label: "Leads & Contact", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (pathname === "/admin/login") {
        if (mounted) { setChecking(false); setAuthed(false); }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        await supabase.auth.signOut();
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      if (mounted) { setAuthed(true); setChecking(false); }
    })();
    return () => { mounted = false; };
  }, [pathname, navigate]);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (pathname === "/admin/login") return <Outlet />;

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading admin…</div>;
  }
  if (!authed) return null;

  const SidebarContent = (
    <>
      <div className="p-4 border-b flex items-center gap-2 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2 shrink-0"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center font-bold shadow-sm shrink-0">
            eT
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight">Admin Panel</div>
            <div className="text-[11px] text-muted-foreground truncate">eProcurementTender.com</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
          Menu
        </div>
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" /> <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/admin/login", replace: true });
          }}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:h-svh md:overflow-hidden md:flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r bg-background flex-col">
        {SidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-3 py-2 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center text-xs font-bold">
            eT
          </div>
          <div className="font-semibold text-sm">Admin</div>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[86vw] bg-background border-r flex flex-col shadow-2xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-x-hidden md:h-full md:min-h-0 md:overflow-y-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto md:min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
