/**
 * Safely serialize a JSON-LD object for embedding inside a <script> tag.
 * - Escapes </ sequences to prevent premature script termination (XSS hardening).
 * - Escapes U+2028/U+2029 which break inline scripts in some parsers.
 * - Strips undefined / null values recursively so crawlers don't see empty fields.
 */
export function jsonLd(input: unknown): string {
  const cleaned = prune(input);
  const raw = JSON.stringify(cleaned) ?? "{}";
  return raw
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined && v !== null);
    return arr;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pv = prune(v);
      if (pv === undefined || pv === null) continue;
      if (typeof pv === "string" && pv.trim() === "") continue;
      if (Array.isArray(pv) && pv.length === 0) continue;
      out[k] = pv;
    }
    return out;
  }
  return value;
}
