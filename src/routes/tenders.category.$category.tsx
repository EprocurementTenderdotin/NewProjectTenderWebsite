import { createFileRoute, notFound } from "@tanstack/react-router";
import { HubPage } from "@/components/tenders/HubPage";
import { fetchCategories } from "@/lib/tenders";
import { matchSlug } from "@/lib/slug";

export const Route = createFileRoute("/tenders/category/$category")({
  loader: async ({ params }) => {
    const categories = await fetchCategories();
    const category = matchSlug(categories, params.category);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.category.name ?? params.category;
    const title = `${name} Tenders in India — eProcurementTender.com`;
    const description = `Browse active ${name.toLowerCase()} government tenders across India. Filter by state and district, apply free, and get expert guidance from application to award.`;
    const path = `/tenders/category/${params.category}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: path },
      ],
      links: [{ rel: "canonical", href: path }],
    };
  },
  component: CategoryHub,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div><h1 className="text-2xl font-bold mb-2">Category not found</h1><a href="/tenders" className="text-primary underline">Browse all tenders</a></div>
    </div>
  ),
});

function CategoryHub() {
  const { category } = Route.useLoaderData();
  return (
    <HubPage
      title={`${category.name} Tenders`}
      intro={`Verified ${category.name.toLowerCase()} tenders published by government departments and PSUs across India. Apply online with a single form and let our tender experts guide you through EMD, documentation, and submission.`}
      breadcrumbs={[{ label: "Tenders", to: "/tenders" }, { label: category.name }]}
      filters={{ categoryId: category.id }}
    />
  );
}
