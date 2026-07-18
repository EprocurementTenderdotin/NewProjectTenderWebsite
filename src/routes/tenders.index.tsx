import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { TenderCard } from "@/components/tenders/TenderCard";
import { TenderFilters, type FilterValues } from "@/components/tenders/TenderFilters";
import { fetchTenders } from "@/lib/tenders";
import { jsonLd } from "@/lib/jsonld";
import { PopularHubs } from "@/components/tenders/PopularHubs";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const searchSchema = z.object({
  stateId: fallback(z.string(), "").optional(),
  districtId: fallback(z.string(), "").optional(),
  categoryId: fallback(z.string(), "").optional(),
  typeTag: fallback(z.string(), "").optional(),
  budgetMin: fallback(z.number(), 0).optional(),
  budgetMax: fallback(z.number(), 0).optional(),
  closingBefore: fallback(z.string(), "").optional(),
  sort: fallback(z.enum(["newest", "deadline", "value_high", "value_low"]), "newest").default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/tenders/")({
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => ({ page: deps.page }),
  head: ({ loaderData }) => {
    const page = loaderData?.page ?? 1;
    const canonical = page > 1 ? `/tenders?page=${page}` : "/tenders";
    const title =
      page > 1
        ? `Browse Government Tenders — Page ${page} | eProcurementTender.com`
        : "Browse Government Tenders — eProcurementTender.com";
    const description =
      "Browse verified government tenders across India by state, district, category, and estimated value.";
    const links: Array<{ rel: string; href: string }> = [{ rel: "canonical", href: canonical }];
    if (page > 1) {
      links.push({
        rel: "prev",
        href: page - 1 === 1 ? "/tenders" : `/tenders?page=${page - 1}`,
      });
    }
    links.push({ rel: "next", href: `/tenders?page=${page + 1}` });
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links,
    };
  },
  validateSearch: zodValidator(searchSchema),
  component: TendersPage,
});

const PER_PAGE = 12;

function TendersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const filters: FilterValues = {
    stateId: search.stateId,
    districtId: search.districtId,
    categoryId: search.categoryId,
    typeTag: search.typeTag,
    budgetMin: search.budgetMin,
    budgetMax: search.budgetMax,
    closingBefore: search.closingBefore,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tenders", search],
    queryFn: () => fetchTenders({ ...filters, sort: search.sort, page: search.page, perPage: PER_PAGE }),
  });

  type SearchState = typeof search;
  const updateFilters = (patch: Partial<FilterValues>) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, ...patch, page: 1 }) });
  };
  const resetFilters = () => {
    navigate({ search: { sort: "newest" as const, page: 1 } });
  };
  const setSort = (sort: SearchState["sort"]) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, sort, page: 1 }) });
  };
  const setPage = (page: number) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, page }) });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = data?.rows ?? [];

  const itemListJsonLd = rows.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Government Tenders",
        numberOfItems: rows.length,
        itemListElement: rows.map((t, i) => ({
          "@type": "ListItem",
          position: (search.page - 1) * PER_PAGE + i + 1,
          url: `/tenders/${t.id}`,
          name: t.title,
        })),
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }}
        />
      )}
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
        {/* Page header */}
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
            <span className="inline-flex items-center gap-2 rounded-full bg-white/8 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 mb-6 text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-primary-foreground/90 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Browse Tenders
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.08] tracking-tight mb-4">
              Browse Tenders
            </h1>
            <p className="text-base sm:text-lg text-primary-foreground/75 leading-relaxed max-w-2xl">
              Discover verified government tenders across India — filter by state, district, category, and estimated value.
            </p>
          </div>
        </section>

        <section className="container-page py-8 lg:py-10">
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
            {/* Filters */}
            <TenderFilters values={filters} onChange={updateFilters} onReset={resetFilters} />

            {/* Results */}
            <div className="mt-6 lg:mt-0">
              {/* Result bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? (
                    "Loading tenders..."
                  ) : (
                    <>
                      Showing <span className="font-semibold text-foreground">{rows.length}</span> of{" "}
                      <span className="font-semibold text-foreground">{total}</span> tenders
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Sort:</label>
                  <select
                    value={search.sort}
                    onChange={(e) => setSort(e.target.value as typeof search.sort)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="newest">Newest first</option>
                    <option value="deadline">Deadline: soonest</option>
                    <option value="value_high">Value: high to low</option>
                    <option value="value_low">Value: low to high</option>
                  </select>
                </div>
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-20 bg-card border border-border rounded-xl px-6">
                  <p className="text-lg font-semibold text-foreground mb-2">No tenders available for the selected filters right now</p>
                  <p className="text-sm text-muted-foreground mb-2">Don't worry — our team can still help you find and apply for the right tender in your area.</p>
                  <p className="text-sm text-muted-foreground mb-5">Click Apply Now and our experts will get in touch with matching opportunities.</p>
                  <Link
                    to="/apply"
                    className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold shadow-sm hover:opacity-95"
                  >
                    Apply Now
                  </Link>
                </div>
              ) : (
                <div
                  className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? "opacity-60" : ""} transition-opacity`}
                >
                  {rows.map((t) => (
                    <TenderCard key={t.id} tender={t} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(search.page - 1)}
                    disabled={search.page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/50"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <PageNumbers current={search.page} total={totalPages} onPick={setPage} />
                  <button
                    type="button"
                    onClick={() => setPage(search.page + 1)}
                    disabled={search.page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/50"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <PopularHubs />
      <Footer />
      <FloatingButtons />
    </div>
  );
}

function PageNumbers({ current, total, onPick }: { current: number; total: number; onPick: (n: number) => void }) {
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  const window = 1;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - window && i <= current + window)) {
      push(i);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }
  return (
    <>
      {pages.map((p, idx) =>
        p === "…" ? (
          <span key={`e${idx}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className={`min-w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              p === current
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground hover:border-primary/50"
            }`}
          >
            {p}
          </button>
        )
      )}
    </>
  );
}
