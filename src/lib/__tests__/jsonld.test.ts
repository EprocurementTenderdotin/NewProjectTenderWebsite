import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/jsonld";
import {
  breadcrumbListSchema,
  contactPageSchema,
  faqPageSchema,
  governmentServiceSchema,
  itemListSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/schema";

/** Parses jsonLd() output the way a browser would after unescaping. */
function parseJsonLd(str: string): unknown {
  // Undo the two Unicode-escape transforms we apply.
  const unescaped = str
    .replace(/\\u003c/g, "<")
    .replace(/\\u2028/g, "\u2028")
    .replace(/\\u2029/g, "\u2029");
  return JSON.parse(unescaped);
}

describe("jsonLd() helper — escaping and pruning", () => {
  it("escapes '<' so a </script> in data cannot break out of the tag", () => {
    const out = jsonLd({ text: "hello </script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    // Round-trip is still valid JSON with the original string.
    expect(parseJsonLd(out)).toEqual({
      text: "hello </script><script>alert(1)</script>",
    });
  });

  it("escapes U+2028 and U+2029 line separators", () => {
    const out = jsonLd({ text: "a\u2028b\u2029c" });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(parseJsonLd(out)).toEqual({ text: "a\u2028b\u2029c" });
  });

  it("prunes null, undefined, empty strings, and empty arrays", () => {
    const out = jsonLd({
      a: "keep",
      b: null,
      c: undefined,
      d: "",
      e: "   ",
      f: [],
      g: [null, undefined, "ok"],
      h: { nested: null, kept: 1 },
    });
    expect(parseJsonLd(out)).toEqual({
      a: "keep",
      g: ["ok"],
      h: { kept: 1 },
    });
  });

  it("produces parseable JSON for every schema builder", () => {
    const cases = [
      organizationSchema(),
      websiteSchema(),
      contactPageSchema(),
      breadcrumbListSchema([
        { name: "Home", item: "/" },
        { name: "Tenders", item: "/tenders" },
      ]),
      itemListSchema("Tenders", [{ url: "/tenders/1", name: "T1" }]),
      faqPageSchema([{ q: "Why?", a: "Because." }]),
      governmentServiceSchema({
        title: "Road Works",
        issuingAuthority: "PWD",
        stateName: "Maharashtra",
        identifier: "REF-1",
        url: "/tenders/1",
      }),
    ];
    for (const c of cases) {
      expect(() => parseJsonLd(jsonLd(c))).not.toThrow();
    }
  });
});

describe("Schema builders — shape regression", () => {
  it("Organization has required fields", () => {
    const s = organizationSchema();
    expect(s["@context"]).toBe("https://schema.org");
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBeTruthy();
    expect(s.url).toBeTruthy();
    expect(s.areaServed["@type"]).toBe("Country");
  });

  it("WebSite exposes a SearchAction with query-input", () => {
    const s = websiteSchema();
    expect(s["@type"]).toBe("WebSite");
    expect(s.potentialAction["@type"]).toBe("SearchAction");
    expect(s.potentialAction["query-input"]).toMatch(/search_term_string/);
    expect(s.potentialAction.target).toContain("{search_term_string}");
  });

  it("BreadcrumbList numbers items starting at 1 and preserves order", () => {
    const s = breadcrumbListSchema([
      { name: "Home", item: "/" },
      { name: "Tenders", item: "/tenders" },
      { name: "Maharashtra", item: "/tenders/state/maharashtra" },
    ]);
    expect(s["@type"]).toBe("BreadcrumbList");
    expect(s.itemListElement).toHaveLength(3);
    s.itemListElement.forEach((it, i) => {
      expect(it["@type"]).toBe("ListItem");
      expect(it.position).toBe(i + 1);
      expect(it.name).toBeTruthy();
      expect(it.item).toMatch(/^\//);
    });
  });

  it("ItemList honours a custom start position for paginated lists", () => {
    const s = itemListSchema(
      "Tenders",
      [
        { url: "/tenders/a", name: "A" },
        { url: "/tenders/b", name: "B" },
      ],
      13,
    );
    expect(s.numberOfItems).toBe(2);
    expect(s.itemListElement[0].position).toBe(13);
    expect(s.itemListElement[1].position).toBe(14);
  });

  it("FAQPage wraps entries as Question/Answer pairs", () => {
    const s = faqPageSchema([
      { q: "What is EMD?", a: "A refundable deposit." },
      { q: "Is signup required?", a: "No." },
    ]);
    expect(s["@type"]).toBe("FAQPage");
    expect(s.mainEntity).toHaveLength(2);
    for (const m of s.mainEntity) {
      expect(m["@type"]).toBe("Question");
      expect(m.name).toBeTruthy();
      expect(m.acceptedAnswer["@type"]).toBe("Answer");
      expect(m.acceptedAnswer.text).toBeTruthy();
    }
  });

  it("ContactPage self-references its URL", () => {
    const s = contactPageSchema("/contact");
    expect(s["@type"]).toBe("ContactPage");
    expect(s.url).toBe("/contact");
  });

  it("GovernmentService omits absent provider / areaServed after pruning", () => {
    const s = governmentServiceSchema({
      title: "Sparse tender",
      url: "/tenders/x",
    });
    const parsed = parseJsonLd(jsonLd(s)) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("GovernmentService");
    expect(parsed.provider).toBeUndefined();
    expect(parsed.areaServed).toBeUndefined();
    expect(parsed.identifier).toBeUndefined();
    expect(parsed.name).toBe("Sparse tender");
    expect(parsed.url).toBe("/tenders/x");
  });

  it("GovernmentService includes full provider block when data is present", () => {
    const s = governmentServiceSchema({
      title: "Road works",
      description: "Repair of NH-4",
      issuingAuthority: "PWD Maharashtra",
      stateName: "Maharashtra",
      identifier: "PWD-2026-1",
      url: "/tenders/1",
    });
    expect(s.provider).toEqual({
      "@type": "GovernmentOrganization",
      name: "PWD Maharashtra",
    });
    expect(s.areaServed).toEqual({ "@type": "State", name: "Maharashtra" });
  });
});
