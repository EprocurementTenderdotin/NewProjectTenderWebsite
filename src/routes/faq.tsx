import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle, MessageCircle, Phone, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { jsonLd } from "@/lib/jsonld";

type Category = "General" | "Application" | "Payments & Fees" | "Process & Timeline" | "Support";

const FAQS: { q: string; a: string; category: Category }[] = [
  { category: "General", q: "What is eProcurementTender.com?", a: "A platform that helps businesses across India discover, apply, and manage government tenders online with expert support." },
  { category: "General", q: "Is this an official government portal?", a: "No. We're a private tender assistance platform that helps you apply for tenders published on official portals like CPPP, GeM, and state e-procurement sites." },
  { category: "General", q: "Which states do you cover?", a: "All 28 states and 8 union territories of India, across 700+ districts." },
  { category: "General", q: "What types of tenders can I apply for?", a: "Goods (supply), Services (consulting, maintenance), and Works (construction, infrastructure) tenders." },
  { category: "General", q: "Do you handle GeM tenders?", a: "Yes. We assist with GeM (Government e-Marketplace) registration, catalog listing, and bidding." },
  { category: "General", q: "Is my data secure?", a: "Yes. We use industry-standard encryption, store data in secure Indian data centers, and never share your info with third parties without consent." },

  { category: "Application", q: "How do I apply for a tender?", a: "Click 'Apply Now', fill the 7-step wizard (5 minutes), and our expert calls you the next business day." },
  { category: "Application", q: "Do I need to upload documents to apply?", a: "No documents are required at the application stage. Documents are collected only when required for a specific tender." },
  { category: "Application", q: "Can I apply for multiple tenders simultaneously?", a: "Yes. You can submit multiple applications; each gets its own Application ID and tracking." },
  { category: "Application", q: "Can new businesses (startups) apply?", a: "Yes. Many tenders have MSME/startup relaxations. We help identify tenders your business qualifies for." },
  { category: "Application", q: "Can I edit my application after submission?", a: "Yes, until the expert call. After that, edits are handled via our support team." },
  { category: "Application", q: "What if my application is rejected?", a: "We analyze the reason, help address gaps, and guide you to reapply for similar suitable tenders." },

  { category: "Payments & Fees", q: "How much does it cost to apply?", a: "The initial application is free. Service charges apply only after we match you with a tender and you decide to proceed." },
  { category: "Payments & Fees", q: "What is EMD (Earnest Money Deposit)?", a: "EMD is a refundable security amount required with most tender bids, typically 1-2% of the tender value. It's refunded if you don't win, or adjusted against security deposit if you win." },
  { category: "Payments & Fees", q: "What is Security Deposit?", a: "A refundable amount (typically 5-10% of contract value) deposited after winning a tender, refunded after successful completion." },
  { category: "Payments & Fees", q: "Do you provide refunds?", a: "Service fees are non-refundable once expert consultation begins. Government fees (EMD, Security Deposit) are refunded per tender terms." },
  { category: "Payments & Fees", q: "What is Turnover requirement?", a: "Minimum annual turnover the bidder must have demonstrated in previous years, as specified in tender documents." },

  { category: "Process & Timeline", q: "What is LOA?", a: "Letter of Acceptance — an official document from the department confirming you've won the tender." },
  { category: "Process & Timeline", q: "How long does the tender process take?", a: "Application takes 5 minutes. Expert call within 24 hours. Full tender lifecycle (application to LOA) typically 30-90 days depending on tender type." },
  { category: "Process & Timeline", q: "Do you help with document preparation?", a: "Yes. Our experts help prepare bid documents, technical specifications, and financial bids for a service fee." },
  { category: "Process & Timeline", q: "Can I track my application status?", a: "Yes. Use the Track Status page with your Application ID and mobile number to see real-time progress." },

  { category: "Support", q: "How do I contact support?", a: "Visit our Contact page or call our helpline. Response within 24 hours on business days." },
];

const CATEGORIES: ("All" | Category)[] = ["All", "General", "Application", "Payments & Fees", "Process & Timeline", "Support"];

export const Route = createFileRoute("/faq")({
  component: FAQPage,
  head: () => ({
    meta: [
      { title: "FAQ — Government Tender Application Help | eProcurementTender.com" },
      { name: "description", content: "Answers to common questions about applying for government tenders in India — EMD, security deposit, LOA, GeM, application process, and more." },
      { property: "og:title", content: "Frequently Asked Questions" },
      { property: "og:description", content: "Everything you need to know about the tender application process." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    }],
  }),
});

function FAQPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Category>("All");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (!s) return true;
      return f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s);
    });
  }, [q, cat]);

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
              Help Center
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.08] tracking-tight mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-base sm:text-lg text-primary-foreground/80 leading-relaxed max-w-2xl mb-6">
              Everything you need to know about applying for government tenders — EMD,
              security deposits, LOA, GeM, timelines and expert support.
            </p>

            {/* Hero search */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search your question…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-12 h-12 bg-white text-foreground rounded-xl border-0 shadow-lg text-base"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-10 md:py-14">
          <div className="container-page max-w-4xl">
            {/* Category tabs */}
            <div
              role="tablist"
              aria-label="FAQ categories"
              className="mb-8 flex flex-wrap gap-2"
            >
              {CATEGORIES.map((c) => {
                const count = c === "All" ? FAQS.length : FAQS.filter((f) => f.category === c).length;
                const active = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCat(c)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-4 h-10 text-sm font-semibold transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card text-foreground border-border hover:border-primary/40 hover:text-primary hover:shadow-sm",
                    )}
                  >
                    {c}
                    <span className={cn(
                      "rounded-full px-1.5 text-[11px] font-bold",
                      active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-border bg-card">
                <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground mb-1">No FAQs match your search</p>
                <p className="text-sm text-muted-foreground">Try a different keyword or clear the search.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-3">
                {filtered.map((f, i) => (
                  <AccordionItem
                    key={`${f.category}-${i}`}
                    value={`faq-${f.category}-${i}`}
                    className="rounded-xl border border-border bg-card px-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <AccordionTrigger className="text-left font-semibold text-base py-4 hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* Still have questions — CTA */}
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
          <div className="relative container-page max-w-3xl text-center">
            <MessageCircle className="h-10 w-10 text-accent mx-auto mb-4" />
            <h2 className="text-3xl font-bold font-display mb-3 text-primary-foreground">
              Still Have Questions?
            </h2>
            <p className="text-primary-foreground/80 mb-6">
              Our tender specialists are just one call away. Get free expert guidance
              on eligibility, documents and next steps within 1 business day.
            </p>
            <div className="flex flex-row justify-center gap-3">
              <Link
                to="/apply"
                className="w-1/2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3.5 text-base font-semibold text-accent-foreground shadow-lg hover:bg-accent-hover hover:shadow-xl transition-all"
              >
                Apply Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="w-1/2 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-primary-foreground font-semibold hover:bg-white/15 transition"
              >
                <Phone className="h-4 w-4" /> Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
