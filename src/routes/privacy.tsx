import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — eProcurementTender.com" },
      { name: "description", content: "How eProcurementTender.com collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy" },
      { property: "og:description", content: "Our commitment to protecting your data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 py-12" style={{ outline: "none" }}>
        <article className="container-page max-w-3xl prose prose-slate">
          <h1 className="text-3xl font-bold font-display mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: 7 July 2026</p>

          <p className="mb-4">This page is maintained by eProcurementTender.com and explains how we collect, use, and safeguard your information.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Information We Collect</h2>
          <p className="mb-4">Name, mobile number, email, company name, business type, location (state/district), and tender preferences you submit through our application forms.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Your Data</h2>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>To contact you regarding matched tenders and application progress</li>
            <li>To provide customer support and consultation services</li>
            <li>To improve our platform and services</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">Data Sharing</h2>
          <p className="mb-4">We do not sell your data. We share information only with government tender portals when you explicitly authorize an application, and with our service providers under strict confidentiality agreements.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Data Retention</h2>
          <p className="mb-4">We retain your data for the duration of our service relationship plus 3 years for compliance and reference purposes.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Security</h2>
          <p className="mb-4">We use encryption in transit (HTTPS), access controls, and store data in secure data centers. Uploaded documents are stored in private, access-controlled storage.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Your Rights</h2>
          <p className="mb-4">You can request access, correction, or deletion of your personal data by contacting us. We respond within 30 days.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Cookies</h2>
          <p className="mb-4">We use essential cookies for session management. We do not use third-party advertising cookies.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
          <p>Data-related queries: reach us via our <a href="/contact" className="text-primary underline">Contact page</a>.</p>
        </article>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
