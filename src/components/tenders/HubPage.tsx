import { Link } from "@tanstack/react-router";

import { Loader2, ChevronRight, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { TenderCard } from "@/components/tenders/TenderCard";
import { PopularHubs } from "@/components/tenders/PopularHubs";
import { fetchTenders, type TenderListFilters } from "@/lib/tenders";
import { jsonLd } from "@/lib/jsonld";

interface HubPageProps {
  title: string;
  intro: string;
  breadcrumbs: { label: string; to?: string }[];
  filters: TenderListFilters;
  ctaHref?: string;
}

export function HubPage({ title, intro, breadcrumbs, filters }: HubPageProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["hub-tenders", filters],
    queryFn: () => fetchTenders({ ...filters, perPage: 24, sort: "newest" }),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const itemListJsonLd = rows.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        numberOfItems: rows.length,
        itemListElement: rows.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `/tenders/${t.id}`,
          name: t.title,
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      ...breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: b.label,
        item: b.to ?? undefined,
      })),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }}
        />
      )}
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
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
          <div className="relative container-page py-12 md:py-16 lg:py-20">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center flex-wrap gap-1.5 text-sm text-primary-foreground/70">
                <li>
                  <Link to="/" className="hover:text-primary-foreground inline-flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" /> Home
                  </Link>
                </li>
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {b.to ? (
                      <a href={b.to} className="hover:text-primary-foreground">{b.label}</a>
                    ) : (
                      <span className="text-primary-foreground font-medium">{b.label}</span>
                    )}
                  </span>
                ))}
              </ol>
            </nav>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.08] tracking-tight mb-4">{title}</h1>
            <p className="text-base sm:text-lg text-primary-foreground/75 leading-relaxed max-w-2xl">{intro}</p>
          </div>
        </section>

        <section className="container-page py-8 lg:py-10">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading tenders..." : (
                <><span className="font-semibold text-foreground">{total}</span> tender{total === 1 ? "" : "s"} found</>
              )}
            </p>
            <Link to="/tenders" className="text-sm font-semibold text-primary hover:underline">
              Browse all tenders →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl">
              <p className="text-lg font-semibold text-foreground mb-1">No active tenders here right now</p>
              <p className="text-sm text-muted-foreground mb-4">
                Apply to get notified when new tenders match this filter.
              </p>
              <Link
                to="/apply"
                className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold"
              >
                Apply for expert callback
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((t) => (
                <TenderCard key={t.id} tender={t} />
              ))}
            </div>
          )}
        </section>
      </main>
      <PopularHubs />
      <Footer />
      <FloatingButtons />
    </div>
  );
}
