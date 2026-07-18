import { useQuery } from "@tanstack/react-query";
import { fetchStates, fetchCategories } from "@/lib/tenders";
import { slugify } from "@/lib/slug";

interface PopularHubsProps {
  /** Slug of the current state to exclude from the "popular states" strip. */
  excludeStateSlug?: string;
  /** Slug of the current category to exclude from the "popular categories" strip. */
  excludeCategorySlug?: string;
  limitStates?: number;
  limitCategories?: number;
}

export function PopularHubs({
  excludeStateSlug,
  excludeCategorySlug,
  limitStates = 16,
  limitCategories = 16,
}: PopularHubsProps) {
  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: fetchStates });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const stateLinks = states
    .filter((s) => slugify(s.name) !== excludeStateSlug)
    .slice(0, limitStates);
  const categoryLinks = categories
    .filter((c) => slugify(c.name) !== excludeCategorySlug)
    .slice(0, limitCategories);

  if (stateLinks.length === 0 && categoryLinks.length === 0) return null;

  return (
    <section
      aria-labelledby="popular-hubs-heading"
      className="border-t border-border bg-muted/30 py-10 md:py-12"
    >
      <div className="container-page">
        <h2
          id="popular-hubs-heading"
          className="font-display text-xl md:text-2xl font-bold text-foreground mb-6"
        >
          Explore tenders by state and category
        </h2>

        {stateLinks.length > 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              Popular states
            </p>
            <ul className="flex flex-wrap gap-2">
              {stateLinks.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/tenders/state/${slugify(s.name)}`}
                    className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Tenders in {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {categoryLinks.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              Popular categories
            </p>
            <ul className="flex flex-wrap gap-2">
              {categoryLinks.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/tenders/category/${slugify(c.name)}`}
                    className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {c.name} tenders
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
