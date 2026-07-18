export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function matchSlug<T extends { name: string }>(items: T[], slug: string): T | undefined {
  const s = slug.toLowerCase();
  return items.find((it) => slugify(it.name) === s);
}
