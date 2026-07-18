import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ElementType } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { TenderCard } from "@/components/tenders/TenderCard";
import { CTALink } from "@/components/ui/cta-link";
import { fetchFeaturedTenders, fetchCategories, fetchStates } from "@/lib/tenders";
import {
  ArrowRight, Search, FileText, PhoneCall, CheckCircle2, ShieldCheck,
  Loader2, Package, Wrench, Briefcase, Layers,
  Building2, HardHat, Truck, Cpu, Laptop, Zap, Droplet, Leaf,
  Stethoscope, GraduationCap, Shield, Car, Fuel, Factory, Wheat,
  Hammer, Paintbrush, Shirt, Book, Wifi, Radio, Plane, Train,
  Landmark, TreePine, Pill, FlaskConical, Camera, Printer,
  ChevronLeft, ChevronRight, Pause, Play,
  MapPin, Award, TrendingUp, Users2,
} from "lucide-react";
import heroTenderImg from "@/assets/hero-tender.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Apply for Government Tenders Online" },
      { name: "description", content: "Find and apply for government tenders online without paperwork. Our experts call you within 1 business day with tender details for your district. Apply free today." },
      { name: "keywords", content: "government tenders, e-tender, tender apply online, tender application india, GeM tenders" },
      { property: "og:title", content: "Apply for Government Tenders Online" },
      { property: "og:description", content: "Find and apply for government tenders online without paperwork. Our experts call you within 1 business day with tender details for your district. Apply free today." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});



// ---- Auto-play slider content (4 rich SEO slides) ----
const COMBINED_SLIDES = [
  {
    icon: Search,
    tag: "Step 1 · Discover Tenders",
    title: "Search Live Government Tenders Online",
    desc: "Browse thousands of verified GeM, CPPP, IREPS and state e-procurement tenders across India. Filter by state, district, category and estimated value in seconds — from small MSME supplies to large infrastructure projects up to ₹100 Crore.",
    bullets: [
      "Under ₹10 Lakh — MSME & new bidder friendly",
      "₹10 Lakh – ₹1 Crore — growing supply vendors",
      "₹1 Cr – ₹10 Cr — civil, works & AMC contracts",
      "₹10 Cr – ₹100 Cr — PSU & infrastructure tenders",
    ],
  },
  {
    icon: FileText,
    tag: "Step 2 · Apply Online",
    title: "Apply for Any Tender in Minutes — No Paperwork",
    desc: "Skip the endless PDFs. Fill one simple online form and our team prepares your complete tender application, EMD guidance and bid documents on your behalf — for tenders of any estimated value.",
    bullets: [
      "One online form — no upfront documents",
      "EMD, tender fee & DSC guidance included",
      "Bid documents drafted by tender experts",
      "Works for GeM, CPPP, IREPS & state portals",
    ],
  },
  {
    icon: PhoneCall,
    tag: "Step 3 · Free Expert Call",
    title: "Free Tender Consultation the Next Business Day",
    desc: "A dedicated government tender expert calls you within 24 hours with matched live tenders, eligibility check, and step-by-step bid submission support — whether you're bidding ₹5 Lakh or ₹50 Crore.",
    bullets: [
      "Dedicated expert assigned to your business",
      "Eligibility & turnover qualification check",
      "Matched tenders shortlisted for your district",
      "Pre-bid queries & technical bid support",
    ],
  },
  {
    icon: CheckCircle2,
    tag: "Step 4 · Win & Grow",
    title: "Track, Bid and Win Government Contracts",
    desc: "Get real-time status updates, document reminders and post-award assistance. Convert one-off tenders into long-term government business — with support that scales from small supplies to ₹100 Cr infrastructure wins.",
    bullets: [
      "Real-time bid status & deadline reminders",
      "Financial & technical bid preparation",
      "Post-award contract & delivery guidance",
      "Repeat wins across multiple states",
    ],
  },
];

const TYPE_ICONS: Record<string, any> = {
  Goods: Package, Works: Wrench, Services: Briefcase, Multiple: Layers,
};

// Keyword → icon map for sector-specific category icons.
// Order matters: first match wins, so put more specific keywords first.
const SECTOR_ICON_RULES: Array<[RegExp, any]> = [
  [/\b(road|highway|bridge|construct|civil|infra|building)\b/i, HardHat],
  [/\b(electric|power|solar|energy|transformer|cable|lighting)\b/i, Zap],
  [/\b(water|irrigation|pipeline|sewage|drainage|plumb)\b/i, Droplet],
  [/\b(medical|hospital|health|surgical|diagnostic)\b/i, Stethoscope],
  [/\b(pharma|drug|medicine|tablet)\b/i, Pill],
  [/\b(lab|chemical|reagent|scientific)\b/i, FlaskConical],
  [/\b(education|school|college|university|training|academic)\b/i, GraduationCap],
  [/\b(book|stationery|paper|library|publication)\b/i, Book],
  [/\b(defence|defense|security|police|arms|surveillance)\b/i, Shield],
  [/\b(vehicle|automobile|car|bus|transport)\b/i, Car],
  [/\b(fuel|oil|gas|petroleum|lubricant)\b/i, Fuel],
  [/\b(agri|farm|crop|seed|fertil|wheat|rice|grain)\b/i, Wheat],
  [/\b(forest|tree|plantation|environ)\b/i, TreePine],
  [/\b(garden|horticulture|landscap|green)\b/i, Leaf],
  [/\b(it|software|computer|laptop|hardware|server)\b/i, Laptop],
  [/\b(electronic|semiconductor|chip|circuit)\b/i, Cpu],
  [/\b(telecom|network|internet|broadband|wifi)\b/i, Wifi],
  [/\b(radio|broadcast|communication)\b/i, Radio],
  [/\b(rail|railway|metro|train)\b/i, Train],
  [/\b(air|aviation|airport|aircraft)\b/i, Plane],
  [/\b(logistic|freight|cargo|shipping|delivery)\b/i, Truck],
  [/\b(factory|manufactur|industrial|machinery)\b/i, Factory],
  [/\b(paint|coating|varnish)\b/i, Paintbrush],
  [/\b(textile|garment|uniform|cloth|apparel)\b/i, Shirt],
  [/\b(furniture|carpent|wood|steel|hardware)\b/i, Hammer],
  [/\b(camera|cctv|photo|imaging)\b/i, Camera],
  [/\b(print|printing|xerox|copier)\b/i, Printer],
  [/\b(municipal|urban|panchayat|govern|admin)\b/i, Landmark],
  [/\b(office|corporate|business|consult)\b/i, Building2],
];

function iconForCategory(name: string, typeTag: string | null | undefined) {
  for (const [re, Ico] of SECTOR_ICON_RULES) {
    if (re.test(name)) return Ico;
  }
  return TYPE_ICONS[typeTag ?? "Goods"] ?? Package;
}


function Index() {
  const navigate = useNavigate();
  const [heroStateId, setHeroStateId] = useState("");
  const [heroCategoryId, setHeroCategoryId] = useState("");

  const { data: featured = [], isLoading: featLoading } = useQuery({
    queryKey: ["featured-tenders"],
    queryFn: () => fetchFeaturedTenders(6),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: states = [] } = useQuery({
    queryKey: ["states"],
    queryFn: fetchStates,
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const search: Record<string, string | number> = { sort: "newest", page: 1 };
    if (heroStateId) search.stateId = heroStateId;
    if (heroCategoryId) search.categoryId = heroCategoryId;
    navigate({ to: "/tenders", search });
  };





  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
        {/* ============ HERO ============ */}
        <section
          className="relative overflow-hidden isolate"
          style={{
            backgroundImage:
              "radial-gradient(1200px 600px at 85% -10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(59,130,246,0.35) 0%, transparent 55%), linear-gradient(135deg, #0b1e4d 0%, #12295f 45%, #1e3a8a 100%)",
          }}
        >
          {/* Fine dot grid, softly masked toward edges */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.2px)",
              backgroundSize: "24px 24px",
              maskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
            }}
          />
          {/* Amber corner glow */}
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full pointer-events-none blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
          />
          {/* Bottom gradient fade into page */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(15,23,42,0.15))" }}
          />

          <div className="relative container-page py-[2.39rem] sm:py-10 md:py-12 lg:py-16 pb-16 sm:pb-20 md:pb-24">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-10 lg:items-center">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 pl-2 pr-3 sm:pl-2.5 sm:pr-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold tracking-wide uppercase text-primary-foreground/90 mb-5 sm:mb-6 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent" />
                  </span>
                  <span>Trusted Tender Platform</span>
                  <span className="text-primary-foreground/30">·</span>
                  <span className="text-primary-foreground/70 normal-case font-medium">Pan-India</span>
                </span>

                <h1 className="font-display text-[2rem] sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-4 sm:mb-6">
                  Apply for Government
                  <br className="hidden sm:block" />{" "}
                  Tenders Online
                  <span className="block mt-1.5 sm:mt-2 text-accent text-[1.5rem] sm:text-4xl lg:text-[65px] whitespace-nowrap">
                    — Simple, Fast & Secure
                  </span>
                </h1>

                <p className="text-[15px] sm:text-lg text-primary-foreground/75 leading-relaxed mb-6 sm:mb-8 max-w-2xl">
                  India's trusted platform to discover and apply for live government tenders. Submit in minutes and get expert
                  help with documentation — <span className="text-primary-foreground/95 font-medium">zero paperwork hassle.</span>
                </p>



                <div className="flex flex-col sm:flex-row gap-3">
                  <CTALink
                    to="/apply"
                    loadingLabel="Opening…"
                    className="btn-fluid btn-press inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg font-semibold"
                  >
                    Apply Now <ArrowRight className="h-4 w-4 shrink-0" />
                  </CTALink>
                  <CTALink
                    to="/tenders"
                    loadingLabel="Loading…"
                    className="btn-fluid btn-press inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white shadow-md shadow-blue-900/40 hover:from-blue-950 hover:via-blue-900 hover:to-black ring-1 ring-white/15 font-semibold"
                  >
                    Browse All Tenders
                  </CTALink>
                </div>

                {/* Trust indicators */}
                <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] sm:text-xs text-primary-foreground/70">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-medium">GeM & CPPP verified</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-medium">Expert document support</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-medium">Pan-India coverage</span>
                  </span>
                </div>

              </div>

              {/* Right-side hero visual — desktop only */}
              <div className="hidden lg:flex relative items-center justify-center">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 blur-3xl opacity-60"
                  style={{ background: "radial-gradient(circle at 60% 50%, rgba(245,158,11,0.35) 0%, transparent 60%)" }}
                />
                <img
                  src={heroTenderImg}
                  alt="Government tender documents with official seal and verification badge"
                  width={1024}
                  height={1024}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full max-w-[460px] h-auto drop-shadow-2xl animate-[float_6s_ease-in-out_infinite]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ INTRO STRIP ============ */}
        <section className="relative -mt-8 sm:-mt-12 z-10 container-page">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-[#12295f] to-[#1e3a8a] shadow-[0_20px_60px_-20px_rgba(15,27,61,0.55)] ring-1 ring-white/10">
            {/* accent glow */}
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
            {/* top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

            <div className="relative px-5 sm:px-10 py-7 sm:py-9 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
              {/* Badge */}
              <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 shrink-0">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-300/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  Why Choose Us
                </span>
              </div>

              {/* Copy */}
              <p className="text-[15px] sm:text-lg leading-relaxed text-white/90 max-w-3xl">
                Looking to apply for{" "}
                <span className="font-semibold text-white">government tenders online</span>?{" "}
                <strong className="font-bold text-white">eProcurementTender.com</strong> helps businesses across India find and apply to the latest government tenders — including{" "}
                <span className="font-semibold text-white">GeM tenders</span> — with complete{" "}
                <span className="font-semibold text-white">application assistance</span>{" "}
                and{" "}
                <span className="font-semibold text-white">document support</span>.

              </p>
            </div>
          </div>
        </section>






        {/* ============ FEATURED TENDERS ============ */}
        <section className="relative py-10 md:py-4 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 border-y border-border overflow-hidden">
          {/* subtle decorative blobs */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

          <div className="container-page relative">
            <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-border px-3 py-1 mb-3 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-bold text-emerald-700">Live Now</span>
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  Featured Tenders
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Hand-picked high-value opportunities open for application right now.
                </p>
              </div>
              <CTALink
                to="/tenders"
                loadingLabel="Loading tenders…"
                className="btn-fluid-sm btn-press inline-flex items-center gap-2 rounded-lg bg-[#0b1e4d] text-white shadow-sm hover:bg-[#12295f] hover:shadow-md border border-[#0b1e4d]"
              >
                View all tenders <ArrowRight className="h-4 w-4 shrink-0" />
              </CTALink>


            </div>

            {featLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((t) => (
                  <TenderCard key={t.id} tender={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============ TENDER SEARCH FILTER ============ */}
        <section className="relative py-10 md:py-12 bg-white border-b border-border">
          <div className="container-page">
            <div className="max-w-4xl mx-auto text-center mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/15 px-3 py-1 mb-3">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-bold text-primary">Find Tenders</span>
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Search Live Tenders by State & Category
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Filter thousands of verified government tenders across India in seconds.
              </p>
            </div>

            <form
              onSubmit={handleHeroSearch}
              className="max-w-3xl mx-auto rounded-2xl bg-white shadow-[0_10px_40px_-15px_rgba(15,27,61,0.25)] ring-1 ring-slate-200 p-2 sm:p-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
                <label className="relative flex items-center rounded-lg bg-slate-50 hover:bg-white border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <MapPin className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <span className="sr-only">Select state</span>
                  <select
                    value={heroStateId}
                    onChange={(e) => setHeroStateId(e.target.value)}
                    className="w-full appearance-none bg-transparent pl-9 pr-8 py-3 text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">All States</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-2.5 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                </label>

                <label className="relative flex items-center rounded-lg bg-slate-50 hover:bg-white border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Layers className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <span className="sr-only">Select category</span>
                  <select
                    value={heroCategoryId}
                    onChange={(e) => setHeroCategoryId(e.target.value)}
                    className="w-full appearance-none bg-transparent pl-9 pr-8 py-3 text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-2.5 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                </label>

                <button
                  type="submit"
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md transition-all whitespace-nowrap"
                >
                  <Search className="h-4 w-4" />
                  Search Tenders
                </button>
              </div>
            </form>
          </div>
        </section>



        {/* ============ CATEGORIES ============ */}
        <section className="relative py-10 md:py-9 bg-background border-y border-border">
          <div className="container-page">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <p className="text-[11px] uppercase tracking-[0.24em] text-primary/70 font-bold mb-3">
                Procurement Categories
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Tenders across every sector
              </h2>
              <p className="text-muted-foreground">
                Explore 85+ tender categories across Goods, Works, Services & Multiple types.
              </p>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {(() => {
                const buckets: Record<string, typeof categories> = { Goods: [], Services: [], Works: [], Multiple: [] };
                categories.forEach((c) => {
                  const tag = c.tender_type_tag ?? "Goods";
                  (buckets[tag] ?? (buckets[tag] = [])).push(c);
                });
                const order = ["Goods", "Services", "Works", "Multiple"];
                const mixed: typeof categories = [];
                let i = 0;
                while (mixed.length < 12) {
                  let added = false;
                  for (const tag of order) {
                    const item = buckets[tag]?.[i];
                    if (item) { mixed.push(item); added = true; if (mixed.length >= 12) break; }
                  }
                  if (!added) break;
                  i++;
                }
                const tagStyles: Record<string, { bar: string; iconBg: string; iconText: string; ring: string }> = {
                  Goods:    { bar: "bg-blue-600",    iconBg: "bg-blue-50",    iconText: "text-blue-700",    ring: "hover:border-blue-500/40" },
                  Services: { bar: "bg-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-700", ring: "hover:border-emerald-500/40" },
                  Works:    { bar: "bg-amber-500",   iconBg: "bg-amber-50",   iconText: "text-amber-700",   ring: "hover:border-amber-500/40" },
                  Multiple: { bar: "bg-primary",     iconBg: "bg-primary/10", iconText: "text-primary",     ring: "hover:border-primary/40" },
                };
                return mixed.map((c) => {
                  const Icon = iconForCategory(c.name, c.tender_type_tag);
                  const tag = c.tender_type_tag ?? "Goods";
                  const s = tagStyles[tag] ?? tagStyles.Goods;
                  return (
                    <Link
                      key={c.id}
                      to="/tenders"
                      search={{ categoryId: c.id, sort: "newest", page: 1 }}
                      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,27,61,0.15)] ${s.ring}`}
                    >
                      <span className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${s.bar}`} />
                      <div className="pt-1.5">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.iconBg} ${s.iconText} mb-3`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
                          {c.name}
                        </p>
                        <span className="mt-2.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {tag}
                        </span>
                      </div>
                    </Link>
                  );
                });
              })()}
            </div>
          </div>
        </section>






        {/* ============ TRUSTED GOVERNMENT PARTNERS ============ */}
        <section className="border-y border-border bg-muted/30 py-10 md:py-8 overflow-hidden">
          <div className="container-page mb-6">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.24em] text-primary/70 font-bold mb-3">
                Strategic Partners
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Trusted by Institutions Across India
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Sourcing live tenders from India's leading government e-procurement portals.
              </p>
            </div>
          </div>

          <style>{`
            @keyframes marquee-rtl {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track { animation: marquee-rtl 55s linear infinite; }
            .marquee-track:hover { animation-play-state: paused; }
          `}</style>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-muted/60 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-muted/60 to-transparent z-10" />
            <div className="marquee-track flex gap-3 w-max">
              {[...Array(2)].map((_, dup) => (
                <div key={dup} className="flex gap-3 shrink-0">
                  {[
                    { name: "GeM", full: "Government e-Marketplace", mono: "Ge" },
                    { name: "CPPP", full: "Central Public Procurement Portal", mono: "CP" },
                    { name: "IREPS", full: "Indian Railways e-Procurement", mono: "IR" },
                    { name: "DGS&D", full: "Directorate General S&D", mono: "DG" },
                    { name: "MSTC", full: "MSTC Limited", mono: "MS" },
                    { name: "NIC eProc", full: "NIC e-Procurement", mono: "NIC" },
                    { name: "Defence PSU", full: "Ministry of Defence", mono: "MoD" },
                    { name: "ONGC", full: "Oil & Natural Gas Corp.", mono: "ON" },
                    { name: "NTPC", full: "NTPC Limited", mono: "NT" },
                    { name: "BHEL", full: "Bharat Heavy Electricals", mono: "BH" },
                    { name: "SAIL", full: "Steel Authority of India", mono: "SA" },
                    { name: "Indian Oil", full: "Indian Oil Corporation", mono: "IO" },
                    { name: "HAL", full: "Hindustan Aeronautics", mono: "HAL" },
                    { name: "BEL", full: "Bharat Electronics", mono: "BE" },
                    { name: "GAIL", full: "GAIL (India) Limited", mono: "GA" },
                    { name: "HPCL", full: "Hindustan Petroleum", mono: "HP" },
                    { name: "BPCL", full: "Bharat Petroleum", mono: "BP" },
                    { name: "Coal India", full: "Coal India Limited", mono: "CI" },
                    { name: "PowerGrid", full: "Power Grid Corporation", mono: "PG" },
                    { name: "NHAI", full: "National Highways Authority", mono: "NH" },
                    { name: "DRDO", full: "Defence R&D Organisation", mono: "DR" },
                    { name: "ISRO", full: "Indian Space Research Org.", mono: "IS" },
                    { name: "AAI", full: "Airports Authority of India", mono: "AA" },
                    { name: "RITES", full: "RITES Limited", mono: "RI" },
                    { name: "CRPF", full: "Central Reserve Police Force", mono: "CR" },
                    { name: "BSNL", full: "Bharat Sanchar Nigam", mono: "BS" },
                  ].map((p) => (
                    <div
                      key={`${dup}-${p.name}`}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shrink-0 min-w-[240px] hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all"
                    >
                      <span
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg shrink-0 font-display font-extrabold text-primary text-xs border border-primary/15 tracking-tight"
                        style={{ backgroundColor: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
                        aria-hidden="true"
                      >
                        {p.mono}
                      </span>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-foreground whitespace-nowrap">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">{p.full}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ============ AUTO SLIDERS + FIND BY ESTIMATED VALUE ============ */}
        <section className="relative py-10 md:py-7 overflow-hidden bg-gradient-to-b from-background via-slate-50 to-background border-y border-border">
          <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="container-page relative">
            <AutoSlider
              slides={COMBINED_SLIDES}
              eyebrow="How It Works & Tenders by Estimated Value"
              intervalMs={6500}
            />
          </div>
        </section>


        {/* ============ FINAL CTA ============ */}
        <section className="container-page py-10 md:py-7">
          <div
            className="relative overflow-hidden isolate rounded-3xl text-primary-foreground p-6 md:p-12 text-center"
            style={{
              backgroundImage:
                "radial-gradient(1200px 600px at 85% -10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(59,130,246,0.35) 0%, transparent 55%), linear-gradient(135deg, #0b1e4d 0%, #12295f 45%, #1e3a8a 100%)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-70"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.2px)",
                backgroundSize: "24px 24px",
                maskImage:
                  "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full pointer-events-none blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
            />

            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
                Ready to win your next tender?
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Apply online in under 5 minutes. Get a call from our expert the very next business day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/apply"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl transition-all"
                >
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/tenders"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur px-7 py-3.5 text-base font-semibold text-white ring-1 ring-white/30 hover:ring-white/50 transition-all"
                >
                  Browse Tenders
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingButtons />
    </div>
  );
}

// ============ Auto-play slider (4 rich SEO slides) ============
interface SlideItem {
  icon: ElementType;
  tag: string;
  title: string;
  desc: string;
  bullets?: string[];
}

function AutoSlider({
  slides,
  eyebrow,
  intervalMs = 6500,
}: {
  slides: SlideItem[];
  eyebrow: string;
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const total = slides.length;
  const goTo = (next: number) => setIdx(((next % total) + total) % total);
  const prev = () => goTo(idx - 1);
  const next = () => goTo(idx + 1);

  useEffect(() => {
    if (paused || userPaused) return;
    const id = setInterval(() => {
      setIdx((cur) => (cur + 1) % total);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, userPaused, intervalMs, total]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  const running = !paused && !userPaused;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl p-5 md:p-10 flex flex-col"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #0b1230 0%, #0f172a 40%, #12295f 75%, #1e3a8a 100%)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={eyebrow}
    >
      {/* Decorative dotted pattern + glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 60%, transparent 100%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />

      <style>{`
        @keyframes slider-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes slide-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative">
        {/* Top bar: eyebrow + counter + controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-accent">{eyebrow}</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 font-mono text-[11px] tracking-widest text-white/80">
              <span className="text-accent font-bold">{pad(idx + 1)}</span>
              <span className="text-white/40">/</span>
              <span>{pad(total)}</span>
            </span>
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={running ? "Pause slider" : "Play slider"}
              aria-pressed={!running}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 border border-white/15 text-white/85 hover:bg-white/15 hover:text-white transition-colors"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 border border-white/15 text-white/85 hover:bg-white/15 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-slate-900 hover:brightness-110 transition-all shadow-md shadow-accent/25"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step tabs */}
        <div className="mb-6 md:mb-8 -mx-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max px-1">
            {slides.map((s, i) => {
              const active = i === idx;
              const label = s.tag.split("·")[0]?.trim() || `Step ${i + 1}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-accent text-slate-900 border-accent shadow-md shadow-accent/25"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                      active ? "bg-slate-900/15 text-slate-900" : "bg-white/10 text-white/80"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slide stage */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
            style={{ transform: `translateX(-${idx * 100}%)` }}
          >
            {slides.map((s, i) => {
              const Icon = s.icon;
              const active = i === idx;
              return (
                <article
                  key={i}
                  aria-hidden={!active}
                  className="min-w-full grid gap-6 md:gap-10 md:grid-cols-[auto_1fr] pr-1 md:pr-4 items-start max-w-4xl mx-auto"
                >
                  <span
                    className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl shrink-0 shadow-lg ring-1 ring-white/20"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    }}
                  >
                    <Icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </span>
                  <div
                    className="min-w-0"
                    style={active ? { animation: "slide-fade-in 700ms ease-out both" } : undefined}
                  >
                    <p className="text-[11px] uppercase tracking-widest text-accent font-bold mb-2">
                      {s.tag}
                    </p>
                    <h3 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl text-white mb-3 leading-tight">
                      {s.title}
                    </h3>
                    <p className="text-sm md:text-base text-white/75 leading-relaxed mb-5">
                      {s.desc}
                    </p>
                    {s.bullets && s.bullets.length > 0 && (
                      <ul className="grid gap-2.5 sm:grid-cols-2">
                        {s.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2.5 text-sm text-white/90 rounded-lg bg-white/5 border border-white/10 backdrop-blur px-3 py-2 hover:bg-white/10 hover:border-white/20 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Footer: segmented progress + status */}
        <div className="mt-8 space-y-3">
          <div className="grid grid-flow-col auto-cols-fr gap-1.5">
            {slides.map((_, i) => {
              const isActive = i === idx;
              const isDone = i < idx;
              return (
                <div
                  key={i}
                  className="h-1 overflow-hidden rounded-full bg-white/10"
                >
                  {isActive ? (
                    running ? (
                      <span
                        key={`${idx}-run`}
                        className="block h-full origin-left rounded-full bg-accent motion-reduce:w-full"
                        style={{ animation: `slider-progress ${intervalMs}ms linear forwards` }}
                      />
                    ) : (
                      <span className="block h-full w-1/3 rounded-full bg-accent" />
                    )
                  ) : isDone ? (
                    <span className="block h-full w-full rounded-full bg-accent/70" />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`}
              />
              {running ? "Auto-playing" : "Paused"}
            </span>
            <span className="hidden sm:inline">
              Use ← → arrows or tap steps to navigate
            </span>
            <span className="sm:hidden font-mono tracking-widest text-white/70">
              {pad(idx + 1)} / {pad(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}



