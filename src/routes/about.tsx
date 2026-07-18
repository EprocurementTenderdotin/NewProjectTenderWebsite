import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import {
  ShieldCheck,
  Users,
  Target,
  Award,
  FileCheck2,
  Headphones,
  Building2,
  TrendingUp,
  CheckCircle2,
  Landmark,
  Briefcase,
  Clock,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      {
        title:
          "About eProcurementTender — Apply for Government Tenders Online in India",
      },
      {
        name: "description",
        content:
          "eProcurementTender helps MSMEs, contractors and suppliers across India discover and apply for government tenders online without paperwork. Free tender search, expert support and end-to-end assistance from application to LOA.",
      },
      {
        name: "keywords",
        content:
          "government tenders India, e-procurement tender, apply online tender, MSME tender, tender application service, GeM tender, CPPP tender, IREPS tender, sarkari tender, tender consultant, tender for contractors, tender for suppliers, online tender application, government tender assistance, tender expert India",
      },
      { property: "og:title", content: "About eProcurementTender" },
      {
        property: "og:description",
        content:
          "India's trusted platform to discover and apply for government tenders online. Free search, verified tenders and expert support for MSMEs and contractors.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
        {/* Hero */}
        <section
          className="relative overflow-hidden isolate"
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
              maskImage: "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full pointer-events-none blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
          />
          <div className="relative container-page max-w-4xl py-12 md:py-16 lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/8 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 mb-6 text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-primary-foreground/90 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              About Us
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.08] tracking-tight mb-6">
              India's Simplest Way to Apply for Government Tenders Online
            </h1>
            <p className="text-base sm:text-lg text-primary-foreground/80 leading-relaxed max-w-2xl">
              eProcurementTender is a private tender assistance platform built
              for MSMEs, contractors and suppliers across India — discover
              verified government tenders, apply online in minutes, and get
              expert support from application to LOA.
            </p>
          </div>
        </section>


        {/* Who we are */}
        <section className="py-10 md:py-14">

          <div className="container-page max-w-4xl">
            <h2 className="text-3xl font-bold font-display mb-4">Who We Are</h2>
            <p className="text-muted-foreground mb-4">
              We are a team of tender specialists, ex-procurement officers and
              technology builders on a mission to make India's government
              procurement ecosystem accessible to every small business. For
              decades, sarkari tenders have been locked behind confusing
              portals, heavy paperwork and technical jargon — leaving thousands
              of capable MSMEs and first-time contractors on the sidelines.
            </p>
            <p className="text-muted-foreground">
              eProcurementTender changes that. Instead of navigating multiple
              government portals, filling long forms and hiring expensive
              consultants, you get one clean dashboard to find relevant
              tenders for your district and category, a one-page application
              form, and a real human expert who calls you within one business
              day to walk you through the entire process.
            </p>
          </div>
        </section>

        {/* Values grid */}
        <section className="relative py-10 md:py-14 bg-gradient-to-b from-muted/40 via-background to-muted/30 border-y border-border">
          <div className="container-page max-w-5xl">
            <h2 className="text-3xl font-bold font-display mb-8 text-center">
              What We Stand For
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Target,
                  title: "Our Mission",
                  text: "Democratize access to government tenders across India by removing paperwork, jargon and confusion — so any MSME, contractor or supplier can apply with confidence.",
                },
                {
                  icon: ShieldCheck,
                  title: "Trust & Transparency",
                  text: "Every tender you see is verified and sourced from official government portals. No hidden charges, no false promises and no misleading tender counts.",
                },
                {
                  icon: Users,
                  title: "Expert Human Support",
                  text: "Our specialists guide you end-to-end — application, documentation, EMD, LOA, security deposit and agreement — in Hindi and English, over call and WhatsApp.",
                },
                {
                  icon: Award,
                  title: "Proven Track Record",
                  text: "Thousands of small businesses across India have used our platform to discover, apply for and win their first government contract.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we do */}
        <section className="py-10 md:py-14">
          <div className="container-page max-w-5xl">
            <h2 className="text-3xl font-bold font-display mb-3">What We Do</h2>
            <p className="text-muted-foreground mb-8 max-w-3xl">
              We are a one-stop tender application service for Indian
              government procurement. Whether you supply goods, execute civil
              works or provide services, we make the entire tender journey
              simple, fast and paperwork-free.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Landmark,
                  title: "Tender Discovery",
                  text: "Search verified government tenders by district, department, category and value across GeM, CPPP, IREPS and state portals.",
                },
                {
                  icon: FileCheck2,
                  title: "Online Application",
                  text: "Apply for any tender through a single simple form — no logins on 10 different portals, no confusing PDFs.",
                },
                {
                  icon: Headphones,
                  title: "Expert Consultation",
                  text: "A tender specialist calls you within 1 business day to explain eligibility, documents, EMD and timelines.",
                },
                {
                  icon: Briefcase,
                  title: "Documentation Support",
                  text: "Help with GST, Udyam, PAN, bank solvency, past experience proofs, technical bids and financial bids.",
                },
                {
                  icon: Building2,
                  title: "End-to-End Handholding",
                  text: "From bid submission to Letter of Award (LOA), security deposit and final agreement — we stay with you.",
                },
                {
                  icon: TrendingUp,
                  title: "Growth for MSMEs",
                  text: "Regular tender alerts and re-applications so your business keeps winning new government orders.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why choose us */}
        <section className="relative py-10 md:py-14 bg-gradient-to-b from-muted/40 via-background to-muted/30 border-y border-border">
          <div className="container-page max-w-5xl">
            <h2 className="text-3xl font-bold font-display mb-8">
              Why Businesses Choose eProcurementTender
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "100% free tender search — no signup wall, no credit card",
                "Verified tenders sourced from official government portals",
                "One simple online form instead of 10 portal logins",
                "Callback from a real tender expert within 1 business day",
                "Support in Hindi and English over call and WhatsApp",
                "Transparent, one-time service fees — disclosed upfront",
                "End-to-end help from application to LOA and agreement",
                "Trusted by MSMEs, contractors and suppliers across India",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm md:text-base text-foreground">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-10 md:py-14">
          <div className="container-page max-w-5xl">
            <h2 className="text-3xl font-bold font-display mb-8">
              How It Works
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Search Tenders",
                  text: "Browse verified government tenders for your district and category — free, no signup required.",
                },
                {
                  step: "02",
                  title: "Apply Online",
                  text: "Fill one short application form with your basic business details. Takes under 2 minutes.",
                },
                {
                  step: "03",
                  title: "Expert Callback",
                  text: "A tender specialist calls you within 1 business day to explain the tender and next steps.",
                },
                {
                  step: "04",
                  title: "Win & Grow",
                  text: "We support you from bid submission to LOA, security deposit and agreement signing.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="p-6 rounded-xl border bg-card relative"
                >
                  <div className="text-primary text-3xl font-bold font-display mb-2">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who we serve */}
        <section className="relative py-10 md:py-14 bg-gradient-to-b from-muted/40 via-background to-muted/30 border-y border-border">
          <div className="container-page max-w-4xl">
            <h2 className="text-3xl font-bold font-display mb-4">
              Who We Serve
            </h2>
            <p className="text-muted-foreground mb-6">
              Our platform is built for every Indian business that wants to
              work with the government — from a single-person MSME applying
              for their first tender, to established contractors managing
              multiple bids every month.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "MSMEs and small businesses",
                "Civil, electrical and mechanical contractors",
                "Manufacturers and product suppliers",
                "IT, security and facility service providers",
                "Consultants, agencies and professionals",
                "First-time government tender applicants",
              ].map((who) => (
                <div
                  key={who}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                >
                  <Briefcase className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{who}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="relative overflow-hidden isolate py-12 md:py-16"
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
              maskImage: "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full pointer-events-none blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
          />
          <div className="relative container-page max-w-3xl text-center">
            <Clock className="h-10 w-10 text-accent mx-auto mb-4" />
            <h2 className="text-3xl font-bold font-display mb-3 text-primary-foreground">
              Ready to Apply for Your Next Government Tender?
            </h2>
            <p className="text-primary-foreground/80 mb-6">
              Join thousands of MSMEs and contractors already using
              eProcurementTender to discover and win government contracts
              across India. Free to search, free to apply — expert callback
              within 1 business day.
            </p>
            <div className="flex flex-row justify-center gap-3">
              <Link
                to="/apply"
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3.5 text-base font-semibold text-accent-foreground shadow-lg hover:bg-accent-hover hover:shadow-xl transition-all"
              >
                Apply Now <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="/tenders"
                className="w-1/2 inline-flex items-center justify-center px-4 py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700 hover:shadow-lg transition-all"
              >
                Browse Tenders
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
