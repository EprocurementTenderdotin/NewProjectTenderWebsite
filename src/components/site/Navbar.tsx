import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { CTALink } from "@/components/ui/cta-link";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/tenders", label: "Tenders" },
  { to: "/about", label: "About Us" },
  { to: "/apply", label: "Apply Now" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 w-full transition-shadow duration-200 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-border shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]"
            : "bg-white border-b border-transparent"
        }`}
      >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:!px-4 lg:max-w-none">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group" onClick={() => setOpen(false)}>
          <img
            src="/logo.png"
            alt="eProcurementTender.com logo"
            width={52}
            height={52}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="h-12 w-12 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg sm:text-2xl tracking-tight bg-gradient-to-r from-[#0b1e4d] via-[#1e3a8a] to-[#2563eb] bg-clip-text text-transparent">
              eProcurement<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Tender</span>
            </span>
            <span className="flex items-center gap-1.5 mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-[0.16em] sm:tracking-[0.18em]">
              <span className="h-px w-3 sm:w-4 bg-gradient-to-r from-[#1e3a8a] to-transparent" />
              Government Tender Platform
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 justify-center min-w-0">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-2 xl:px-3 py-[13px] text-[13px] xl:text-sm font-semibold uppercase tracking-wide text-foreground/75 hover:text-primary rounded-md transition-colors whitespace-nowrap leading-none flex items-center"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>


        {/* CTA */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
          <CTALink
            to="/track"
            loadingLabel="Opening…"
            className="btn-press inline-flex items-center gap-2 rounded-lg px-3 xl:px-4 py-2 text-[13px] xl:text-sm font-semibold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white shadow-sm shadow-blue-900/30 hover:from-blue-950 hover:via-blue-900 hover:to-black hover:shadow-md ring-1 ring-white/10 whitespace-nowrap"
          >
            Track Status
          </CTALink>
          <CTALink
            to="/apply"
            loadingLabel="Opening…"
            className="btn-press inline-flex items-center gap-2 rounded-lg px-3 xl:px-4 py-2 text-[13px] xl:text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-md whitespace-nowrap"
          >
            Apply Now
          </CTALink>
        </div>



        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white shadow-lg">
          <nav className="container-page py-5 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-[15px] font-semibold uppercase tracking-wide text-slate-700 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                activeProps={{ className: "text-primary bg-slate-50" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-3">
              <CTALink
                to="/track"
                onClick={() => setOpen(false)}
                loadingLabel="Opening…"
                className="btn-press w-full inline-flex items-center justify-center gap-2 h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white shadow-md shadow-blue-900/30 hover:from-blue-950 hover:via-blue-900 hover:to-black hover:shadow-lg ring-1 ring-white/10 transition-all"
              >
                Track Status
              </CTALink>
              <CTALink
                to="/apply"
                onClick={() => setOpen(false)}
                loadingLabel="Opening…"
                className="btn-press w-full inline-flex items-center justify-center gap-2 h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg transition-all"
              >
                Apply Now
                <ArrowRight className="h-5 w-5" />
              </CTALink>
            </div>


          </nav>
        </div>
      )}
      </header>
      <div className="h-16" aria-hidden="true" />
    </>
  );
}
