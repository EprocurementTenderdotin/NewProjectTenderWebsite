/**
 * Pure JSON-LD schema builders. Extracted so route heads stay declarative and
 * so tests can validate schema shape independently of TanStack Router.
 *
 * Every builder returns a plain object; callers wrap it in `jsonLd(...)` from
 * `@/lib/jsonld` before injecting into a <script type="application/ld+json">.
 */

export interface BreadcrumbItem {
  name: string;
  item?: string;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "eProcurementTender.com",
    url: "/",
    description:
      "India's trusted platform to discover and apply for government tenders online with expert support.",
    areaServed: { "@type": "Country", name: "India" },
  } as const;
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "eProcurementTender.com",
    url: "/",
    potentialAction: {
      "@type": "SearchAction",
      target: "/tenders?query={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  } as const;
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

export interface ItemListEntry {
  url: string;
  name: string;
}

export function itemListSchema(name: string, entries: ItemListEntry[], startPosition = 1) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: startPosition + i,
      url: e.url,
      name: e.name,
    })),
  };
}

export interface FaqEntry {
  q: string;
  a: string;
}

export function faqPageSchema(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  };
}

export function contactPageSchema(url = "/contact") {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact eProcurementTender.com",
    url,
  } as const;
}

export interface GovernmentServiceInput {
  title: string;
  description?: string | null;
  issuingAuthority?: string | null;
  stateName?: string | null;
  identifier?: string | null;
  url: string;
}

export function governmentServiceSchema(t: GovernmentServiceInput) {
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: t.title,
    description: t.description ?? undefined,
    provider: t.issuingAuthority
      ? { "@type": "GovernmentOrganization", name: t.issuingAuthority }
      : undefined,
    areaServed: t.stateName ? { "@type": "State", name: t.stateName } : undefined,
    identifier: t.identifier ?? undefined,
    url: t.url,
  };
}
