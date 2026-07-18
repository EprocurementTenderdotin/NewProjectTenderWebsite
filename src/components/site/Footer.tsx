import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";

const QUICK_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/tenders", label: "Browse Tenders" },
  { to: "/apply", label: "Apply Now" },
] as const;

const SUPPORT_LINKS = [
  { to: "/contact", label: "Contact Us" },
  { to: "/track", label: "Track Application" },
  { to: "/faq", label: "FAQs" },
] as const;

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
] as const;

export function Footer() {
  return (
    <footer className="relative bg-footer text-footer-foreground mt-auto overflow-hidden isolate">
      {/* Top accent hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(245,158,11,0.55), transparent)",
        }}
      />
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1.2px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, black 40%, transparent 90%)",
        }}
      />
      {/* Amber corner glow */}
      <div
        aria-hidden
        className="absolute -top-32 -right-24 h-[360px] w-[360px] rounded-full pointer-events-none blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
      />

      <div className="relative container-page pt-14 md:pt-20 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Column 1 — Brand & contact */}
          <div className="lg:col-span-5">
            <Link to="/" className="inline-flex items-center gap-3 mb-5 group">
              <img
                src="/logo.png"
                alt="eProcurementTender.com logo"
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
              <span className="flex flex-col leading-none">
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-[#0b1e4d] via-[#1e3a8a] to-[#2563eb] bg-clip-text text-transparent">
                  eProcurement<span className="text-accent">Tender</span>
                </span>
                <span className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-primary-foreground/55 uppercase tracking-[0.18em]">
                  <span className="h-px w-4 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
                  Government tenders, simplified
                </span>
              </span>
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-6 max-w-md">
              India's trusted platform for government tender applications. Apply
              online, get expert guidance, and manage your entire tender journey
              in one place.
            </p>

            <ul className="space-y-3 text-sm text-primary-foreground/85">
              <li>
                <a
                  href="mailto:info@eprocurementtender.com"
                  className="inline-flex items-center gap-2.5 hover:text-accent transition-colors group"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 group-hover:bg-accent/15 group-hover:ring-accent/30 transition-colors">
                    <Mail className="h-4 w-4" />
                  </span>
                  info@eprocurementtender.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>Pan-India · All districts</span>
              </li>
            </ul>
          </div>

          {/* Column 2 — Quick links */}
          <div className="lg:col-span-2">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-5 text-primary-foreground/95">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="group inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    <span className="h-px w-3 bg-primary-foreground/25 group-hover:w-5 group-hover:bg-accent transition-all" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Support */}
          <div className="lg:col-span-2">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-5 text-primary-foreground/95">
              Support
            </h4>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="group inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    <span className="h-px w-3 bg-primary-foreground/25 group-hover:w-5 group-hover:bg-accent transition-all" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — CTA card */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
              <h4 className="font-display font-semibold text-base text-primary-foreground mb-1.5">
                Need help applying?
              </h4>
              <p className="text-xs text-primary-foreground/65 leading-relaxed mb-4">
                Talk to a tender expert — free 15-min consultation.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:bg-accent-hover transition-colors"
              >
                Get in touch <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/60">
          <p>
            © {new Date().getFullYear()} eProcurement<span className="text-accent">Tender</span>.
            All rights reserved.
          </p>
          <ul className="flex items-center gap-5">
            {LEGAL_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="hover:text-accent transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
