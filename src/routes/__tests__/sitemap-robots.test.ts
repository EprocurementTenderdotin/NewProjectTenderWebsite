import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing the sitemap route so buildSitemap uses fake data.
vi.mock("@/integrations/supabase/client", () => {
  const rows: Record<string, unknown[]> = {
    tenders: [
      { id: "t-1", updated_at: "2026-01-01T00:00:00.000Z" },
      { id: "t-2", updated_at: null },
    ],
    states: [{ id: "s-1", name: "Tamil Nadu" }],
    districts: [{ name: "Chennai", state: { name: "Tamil Nadu", is_active: true } }],
    tender_categories: [{ name: "Roads & Bridges" }],
  };

  const makeBuilder = (table: string) => {
    const result = { data: rows[table] ?? [], error: null };
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      limit: () => Promise.resolve(result),
      then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  };

  return { supabase: { from: (table: string) => makeBuilder(table) } };
});

type Handler = (ctx: unknown) => Promise<Response> | Response;
const getHandler = (route: any): Handler => {
  const h = route?.options?.server?.handlers?.GET ?? route?.server?.handlers?.GET;
  if (typeof h !== "function") throw new Error("GET handler not found on route");
  return h as Handler;
};

const invoke = async (route: any) => (await getHandler(route)({ request: new Request("http://localhost/") })) as Response;

describe("/robots.txt", () => {
  it("serves plain-text robots with cache headers and required directives", async () => {
    const { Route } = await import("../robots[.]txt");
    const res = await invoke(Route);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=\d+/);
    expect(cc).toMatch(/stale-while-revalidate=\d+/);

    const body = await res.text();
    expect(body).toMatch(/^User-agent: \*/m);
    expect(body).toMatch(/^Allow: \//m);
    expect(body).toMatch(/^Disallow: \/admin\/?$/m);
    expect(body).toMatch(/^Disallow: \/track\/?$/m);
    expect(body).toMatch(/^Sitemap: .*\/sitemap\.xml$/m);
  });
});

describe("/sitemap.xml", () => {
  beforeEach(async () => {
    // Reset the module-level cache between tests.
    vi.resetModules();
  });

  it("serves valid XML with cache headers and expected URLs", async () => {
    const { Route } = await import("../sitemap[.]xml");
    const res = await invoke(Route);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/xml/);

    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=\d+/);
    expect(cc).toMatch(/s-maxage=\d+/);
    expect(cc).toMatch(/stale-while-revalidate=\d+/);
    expect(res.headers.get("x-cache-age")).toMatch(/^\d+$/);

    const xml = await res.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith("</urlset>")).toBe(true);

    // Well-formed: open/close <url> counts match and no unescaped stray '&'.
    const opens = (xml.match(/<url>/g) ?? []).length;
    const closes = (xml.match(/<\/url>/g) ?? []).length;
    expect(opens).toBeGreaterThan(0);
    expect(opens).toBe(closes);
    // Any '&' must be an entity reference.
    const badAmp = xml.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
    expect(badAmp).toBeNull();

    // Static routes present.
    for (const p of ["/", "/about", "/tenders", "/faq", "/contact", "/privacy", "/terms"]) {
      expect(xml).toContain(`<loc>${p}</loc>`);
    }
    // Dynamic entries derived from the mocked Supabase data.
    expect(xml).toContain("<loc>/tenders/t-1</loc>");
    expect(xml).toContain("<loc>/tenders/state/tamil-nadu</loc>");
    expect(xml).toContain("<loc>/tenders/state/tamil-nadu/chennai</loc>");
    expect(xml).toContain("<loc>/tenders/category/roads-and-bridges</loc>");
    // lastmod passes through as ISO where available.
    expect(xml).toContain("<lastmod>2026-01-01T00:00:00.000Z</lastmod>");
  });

  it("serves cached response on repeat request (x-cache-age increments possible, body identical)", async () => {
    const { Route } = await import("../sitemap[.]xml");
    const a = await invoke(Route);
    const b = await invoke(Route);
    expect(await a.text()).toBe(await b.text());
  });
});
