import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { TenderCard } from "@/components/tenders/TenderCard";
import { fetchTenderById, fetchRelatedTenders } from "@/lib/tenders";
import { formatINRFull, formatINR, formatDate, daysUntil } from "@/lib/format";
import { jsonLd } from "@/lib/jsonld";
import { slugify } from "@/lib/slug";
import {
  Calendar, MapPin, Building2, IndianRupee, ArrowRight, ChevronRight,
  Home, Tag, FileText, Clock, Wallet, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/tenders/$id")({
  loader: async ({ params }) => {
    const t = await fetchTenderById(params.id);
    if (!t) throw notFound();
    return t;
  },
  head: ({ params, loaderData }) => {
    const t = loaderData;
    // Spec 10.1 — tender title format: "[Title] – [Dept] – [State]"
    const parts = [t?.title, t?.issuing_authority, t?.state?.name].filter(Boolean);
    const title = parts.length ? `${parts.join(" – ")} | eProcurementTender.com` : "Tender Details — eProcurementTender.com";
    const description = t
      ? `${t.title}${t.issuing_authority ? ` by ${t.issuing_authority}` : ""}${t.state?.name ? `, ${t.state.name}` : ""}. Estimated value ${t.estimated_value ? formatINR(t.estimated_value) : "—"}. Apply through eProcurementTender.com.`
      : "View complete details of this government tender opportunity.";
    const path = `/tenders/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 158) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 158) },
        { property: "og:type", content: "article" },
        { property: "og:url", content: path },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: t
        ? [
            {
              type: "application/ld+json",
              children: jsonLd({
                "@context": "https://schema.org",
                "@type": "GovernmentService",
                name: t.title,
                description: t.description ?? undefined,
                provider: t.issuing_authority
                  ? { "@type": "GovernmentOrganization", name: t.issuing_authority }
                  : undefined,
                areaServed: t.state?.name
                  ? { "@type": "State", name: t.state.name }
                  : undefined,
                identifier: t.tender_reference,
                url: path,
              }),
            },
            {
              type: "application/ld+json",
              children: jsonLd({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "/" },
                  { "@type": "ListItem", position: 2, name: "Tenders", item: "/tenders" },
                  t.state?.name
                    ? {
                        "@type": "ListItem",
                        position: 3,
                        name: t.state.name,
                        item: `/tenders/state/${slugify(t.state.name)}`,
                      }
                    : undefined,
                  {
                    "@type": "ListItem",
                    position: t.state?.name ? 4 : 3,
                    name: t.tender_reference ?? t.title,
                    item: path,
                  },
                ],
              }),
            },
          ]
        : [],
    };
  },
  component: TenderDetailPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 container-page py-20 text-center">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <Link to="/tenders" className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
          Back to tenders
        </Link>
      </div>
      <Footer />
      <FloatingButtons />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 container-page py-20 text-center">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Tender not found</h1>
        <p className="text-muted-foreground mb-6">This tender may have been removed or is no longer active.</p>
        <Link to="/tenders" className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
          Browse all tenders
        </Link>
      </div>
      <Footer />
      <FloatingButtons />
    </div>
  ),
});

function TenderDetailPage() {
  const { id } = Route.useParams();

  const { data: tender, isLoading } = useQuery({
    queryKey: ["tender", id],
    queryFn: () => fetchTenderById(id),
  });

  const { data: related = [] } = useQuery({
    queryKey: ["related-tenders", id],
    queryFn: () => (tender ? fetchRelatedTenders(tender, 3) : []),
    enabled: !!tender,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      <FloatingButtons />
      </div>
    );
  }

  if (!tender) {
    throw notFound();
  }

  const days = daysUntil(tender.submission_deadline);
  const typeTag = tender.category?.tender_type_tag;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 lg:pb-0">
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="container-page py-4 border-b border-border">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
                <Home className="h-3.5 w-3.5" /> Home
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            <li>
              <Link to="/tenders" className="hover:text-primary">Tenders</Link>
            </li>
            {tender.state?.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <li>
                  <a
                    href={`/tenders/state/${slugify(tender.state.name)}`}
                    className="hover:text-primary"
                  >
                    {tender.state.name}
                  </a>
                </li>
                {tender.district?.name && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <li>
                      <a
                        href={`/tenders/state/${slugify(tender.state.name)}/${slugify(tender.district.name)}`}
                        className="hover:text-primary"
                      >
                        {tender.district.name}
                      </a>
                    </li>
                  </>
                )}
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <li className="text-foreground font-medium line-clamp-1 max-w-[220px] sm:max-w-none">
              {tender.tender_reference}
            </li>
          </ol>
        </nav>


        <div className="container-page py-8 lg:py-10 grid lg:grid-cols-[1fr_360px] gap-8">
          {/* Main content */}
          <article>
            {/* Type pill + deadline */}
            <div className="flex items-center flex-wrap gap-2 mb-4">
              {typeTag && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded">
                  <Tag className="h-3 w-3" /> {typeTag}
                </span>
              )}
              {tender.category?.name && (
                <span className="inline-flex text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2.5 py-1 rounded">
                  {tender.category.name}
                </span>
              )}
              {days != null && days >= 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded ${
                    days <= 7
                      ? "bg-destructive/10 text-destructive"
                      : days <= 15
                        ? "bg-accent/15 text-[color:var(--accent)]"
                        : "bg-success/10 text-success"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {days === 0 ? "Closes today" : `${days} days left`}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
              {tender.title}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Reference: <span className="font-medium text-foreground">{tender.tender_reference}</span>
            </p>

            {/* Description */}
            {tender.description && (
              <section className="mb-8">
                <h2 className="font-display font-semibold text-lg text-foreground mb-3">Overview</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{tender.description}</p>
              </section>
            )}

            {/* Key info */}
            <section className="mb-8">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Key Details</h2>
              <dl className="grid sm:grid-cols-2 gap-3">
                <InfoRow icon={Building2} label="Issuing Authority" value={tender.issuing_authority ?? "—"} />
                <InfoRow icon={MapPin} label="Location" value={[tender.district?.name, tender.state?.name].filter(Boolean).join(", ") || "—"} />
                <InfoRow icon={Calendar} label="Publish Date" value={formatDate(tender.publish_date)} />
                <InfoRow icon={Calendar} label="Submission Deadline" value={formatDate(tender.submission_deadline)} />
                <InfoRow icon={Calendar} label="Opening Date" value={formatDate(tender.opening_date)} />
                <InfoRow icon={FileText} label="Status" value={tender.status} valueClass="capitalize" />
              </dl>
            </section>

            {/* Financials */}
            <section className="mb-8">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Financial Details</h2>
              <dl className="grid sm:grid-cols-2 gap-3">
                <InfoRow icon={IndianRupee} label="EMD Amount" value={formatINRFull(tender.emd_amount)} />
                <InfoRow icon={IndianRupee} label="Tender Fee" value={formatINRFull(tender.tender_fee)} />
                <InfoRow icon={Wallet} label="Security Deposit (5%)" value={formatINRFull(tender.security_deposit_amount)} />
              </dl>
            </section>

            {/* Desktop Apply CTA */}
            <div className="hidden lg:flex items-center gap-3 mt-8 pt-6 border-t border-border">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg transition-all"
              >
                Apply Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tenders"
                className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground hover:border-primary/50 transition-colors"
              >
                Back to list
              </Link>
            </div>
          </article>

          {/* Sidebar — Tender Amount card (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-[var(--shadow-elegant)]">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70 font-semibold mb-1">
                  Tender Amount
                </p>
                <p className="font-display font-bold text-3xl mb-1">{formatINR(tender.estimated_value)}</p>
                <p className="text-sm text-primary-foreground/70">{formatINRFull(tender.estimated_value)}</p>

                <div className="mt-6 pt-6 border-t border-primary-foreground/15 space-y-2 text-sm">
                  <Row label="EMD" value={formatINR(tender.emd_amount)} />
                  <Row label="Tender Fee" value={formatINR(tender.tender_fee)} />
                  <Row label="Security Deposit" value={formatINR(tender.security_deposit_amount)} />
                </div>

                <Link
                  to="/apply"
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-md transition-all"
                >
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="container-page pb-12">
            <h2 className="font-display font-semibold text-xl text-foreground mb-5">
              Related Tenders
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((t) => (
                <TenderCard key={t.id} tender={t} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky mobile Apply bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Tender Amount
          </p>
          <p className="font-display font-bold text-lg text-primary truncate">
            {formatINR(tender.estimated_value)}
          </p>
        </div>
        <Link
          to="/apply"
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg transition-all"
        >
          Apply Now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <Footer />
      <FloatingButtons />
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, valueClass = "",
}: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</dt>
        <dd className={`text-sm font-medium text-foreground mt-0.5 break-words ${valueClass}`}>{value}</dd>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-primary-foreground/70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
