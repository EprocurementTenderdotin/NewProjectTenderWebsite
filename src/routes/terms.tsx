import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — eProcurementTender.com" },
      { name: "description", content: "Terms & conditions for using eProcurementTender.com tender application services." },
      { property: "og:title", content: "Terms of Service" },
      { property: "og:description", content: "Terms & conditions for using our platform." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 py-12" style={{ outline: "none" }}>
        <article className="container-page max-w-3xl prose prose-slate">
          <h1 className="text-3xl font-bold font-display mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: 7 July 2026</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
          <p className="mb-4">By accessing or using eProcurementTender.com, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. Nature of Service</h2>
          <p className="mb-4">eProcurementTender.com is a private tender assistance platform. We are not affiliated with any government agency. Our role is to help users discover and apply for tenders published on official portals.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. User Responsibilities</h2>
          <p className="mb-4">You agree to provide accurate information, comply with all applicable laws, and not misuse the platform for fraudulent activities.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. Fees & Payments</h2>
          <p className="mb-4">Initial applications are free. Service fees for consultation and document preparation are disclosed before engagement and are non-refundable once services commence.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. Limitation of Liability</h2>
          <p className="mb-4">We do not guarantee tender awards. Our services are advisory; final decisions rest with government departments. We are not liable for indirect or consequential losses.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. Intellectual Property</h2>
          <p className="mb-4">All content, branding, and software on this platform are our property. Unauthorized reproduction is prohibited.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. Termination</h2>
          <p className="mb-4">We may suspend or terminate accounts that violate these terms without prior notice.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Governing Law</h2>
          <p className="mb-4">These terms are governed by the laws of India. Disputes are subject to jurisdiction of courts in your registered state.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">9. Changes</h2>
          <p className="mb-4">We may update these terms; continued use constitutes acceptance of revised terms.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">10. Contact</h2>
          <p>For questions, reach us via our <a href="/contact" className="text-primary underline">Contact page</a>.</p>
        </article>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
