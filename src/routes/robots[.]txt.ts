import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Robots policy for the site. Kept in one place so the response is consistent
// regardless of which edge serves it, and so we can attach explicit cache
// headers instead of relying on default static-asset caching.
const ROBOTS_BODY = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /track
Disallow: /track/

Sitemap: /sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(ROBOTS_BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            // 1 day fresh, up to 7 days stale-while-revalidate.
            "Cache-Control":
              "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
        }),
    },
  },
});
