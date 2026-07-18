import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// TODO: replace with your project URL once a custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
  lastmod?: string;
}

// In-memory cache. One Worker instance keeps a single copy for up to TTL_MS;
// after that the next request rebuilds it. Concurrent rebuilds share a single
// in-flight promise so we never fan out repeat queries to Supabase.
const TTL_MS = 5 * 60 * 1000; // 5 minutes fresh
const STALE_MS = 60 * 60 * 1000; // serve stale up to 1 h if a rebuild fails

interface CacheEntry {
  xml: string;
  builtAt: number;
}
let cache: CacheEntry | null = null;
let inFlight: Promise<string> | null = null;

async function buildSitemap(): Promise<string> {
  const staticEntries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/about", changefreq: "monthly", priority: "0.7" },
    { path: "/tenders", changefreq: "daily", priority: "0.9" },
    { path: "/apply", changefreq: "monthly", priority: "0.8" },
    { path: "/track", changefreq: "monthly", priority: "0.6" },
    { path: "/faq", changefreq: "monthly", priority: "0.6" },
    { path: "/contact", changefreq: "monthly", priority: "0.5" },
    { path: "/terms", changefreq: "yearly", priority: "0.3" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  ];

  const dynamic: SitemapEntry[] = [];
  const slug = (s: string) =>
    s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  try {
    const { data } = await supabase
      .from("tenders")
      .select("id, updated_at")
      .eq("is_active", true)
      .limit(5000);
    for (const t of data ?? []) {
      dynamic.push({
        path: `/tenders/${t.id}`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: t.updated_at ? new Date(t.updated_at).toISOString() : undefined,
      });
    }
  } catch {
    // ignore — sitemap still serves static routes
  }
  try {
    const { data: states } = await supabase
      .from("states")
      .select("id, name")
      .eq("is_active", true);
    for (const s of states ?? []) {
      dynamic.push({ path: `/tenders/state/${slug(s.name)}`, changefreq: "weekly", priority: "0.8" });
    }
    const { data: districts } = await supabase
      .from("districts")
      .select("name, state:states!inner(name, is_active)")
      .eq("is_active", true)
      .limit(5000);
    for (const d of (districts ?? []) as unknown as Array<{
      name: string;
      state: { name: string } | { name: string }[] | null;
    }>) {
      const stateObj = Array.isArray(d.state) ? d.state[0] : d.state;
      if (!stateObj) continue;
      dynamic.push({
        path: `/tenders/state/${slug(stateObj.name)}/${slug(d.name)}`,
        changefreq: "weekly",
        priority: "0.7",
      });
    }
    const { data: cats } = await supabase
      .from("tender_categories")
      .select("name")
      .eq("is_active", true);
    for (const c of cats ?? []) {
      dynamic.push({ path: `/tenders/category/${slug(c.name)}`, changefreq: "weekly", priority: "0.7" });
    }
  } catch {
    // ignore
  }

  const urls = [...staticEntries, ...dynamic].map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function getSitemap(): Promise<{ xml: string; age: number; stale: boolean }> {
  const now = Date.now();
  if (cache && now - cache.builtAt < TTL_MS) {
    return { xml: cache.xml, age: Math.floor((now - cache.builtAt) / 1000), stale: false };
  }
  if (!inFlight) {
    inFlight = buildSitemap()
      .then((xml) => {
        cache = { xml, builtAt: Date.now() };
        return xml;
      })
      .catch((err) => {
        // If we still have a stale-but-usable copy, keep serving it.
        if (cache && Date.now() - cache.builtAt < STALE_MS) return cache.xml;
        throw err;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  const xml = await inFlight;
  const built = cache?.builtAt ?? Date.now();
  return { xml, age: Math.floor((Date.now() - built) / 1000), stale: false };
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { xml, age } = await getSitemap();
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // 5 min fresh at CDN, 1 h stale-while-revalidate for burst tolerance.
            "Cache-Control":
              "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
            "X-Cache-Age": String(age),
          },
        });
      },
    },
  },
});
