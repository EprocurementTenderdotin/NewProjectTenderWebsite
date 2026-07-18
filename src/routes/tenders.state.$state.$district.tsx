import { createFileRoute, notFound } from "@tanstack/react-router";
import { HubPage } from "@/components/tenders/HubPage";
import { fetchStates, fetchDistricts } from "@/lib/tenders";
import { matchSlug } from "@/lib/slug";

export const Route = createFileRoute("/tenders/state/$state/$district")({
  loader: async ({ params }) => {
    const states = await fetchStates();
    const state = matchSlug(states, params.state);
    if (!state) throw notFound();
    const districts = await fetchDistricts(state.id);
    const district = matchSlug(districts, params.district);
    if (!district) throw notFound();
    return { state, district };
  },
  head: ({ params, loaderData }) => {
    const stateName = loaderData?.state.name ?? params.state;
    const districtName = loaderData?.district.name ?? params.district;
    const title = `Tenders in ${districtName}, ${stateName} — eProcurementTender.com`;
    const description = `Latest government tenders in ${districtName}, ${stateName}. Apply online free and get matched tenders from an expert within 1 business day.`;
    const path = `/tenders/state/${params.state}/${params.district}`;
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
  component: DistrictHub,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div><h1 className="text-2xl font-bold mb-2">District not found</h1><a href="/tenders" className="text-primary underline">Browse all tenders</a></div>
    </div>
  ),
});

function DistrictHub() {
  const { state, district } = Route.useLoaderData();
  return (
    <HubPage
      title={`Government Tenders in ${district.name}, ${state.name}`}
      intro={`Fresh tender opportunities from departments and municipal bodies in ${district.name} district, ${state.name}. Apply online, track your application, and get end-to-end guidance from our tender specialists.`}
      breadcrumbs={[
        { label: "Tenders", to: "/tenders" },
        { label: state.name, to: `/tenders/state/${slug(state.name)}` },
        { label: district.name },
      ]}
      filters={{ stateId: state.id, districtId: district.id }}
    />
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
