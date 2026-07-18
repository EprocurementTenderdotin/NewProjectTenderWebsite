import { createFileRoute, notFound } from "@tanstack/react-router";
import { HubPage } from "@/components/tenders/HubPage";
import { fetchStates } from "@/lib/tenders";
import { matchSlug } from "@/lib/slug";

export const Route = createFileRoute("/tenders/state/$state")({
  loader: async ({ params }) => {
    const states = await fetchStates();
    const state = matchSlug(states, params.state);
    if (!state) throw notFound();
    return { state };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.state.name ?? params.state;
    const title = `Government Tenders in ${name} — eProcurementTender.com`;
    const description = `Browse verified government tenders in ${name}. Filter by district, estimated value, and category. Apply online with expert support.`;
    const path = `/tenders/state/${params.state}`;
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
  component: StateHub,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div><h1 className="text-2xl font-bold mb-2">State not found</h1><a href="/tenders" className="text-primary underline">Browse all tenders</a></div>
    </div>
  ),
});

function StateHub() {
  const { state } = Route.useLoaderData();
  return (
    <HubPage
      title={`Government Tenders in ${state.name}`}
      intro={`Discover the latest verified government tenders published across ${state.name}. Filter by district, department, and estimated value — then apply online in minutes and get an expert callback the next business day.`}
      breadcrumbs={[{ label: "Tenders", to: "/tenders" }, { label: state.name }]}
      filters={{ stateId: state.id }}
    />
  );
}
