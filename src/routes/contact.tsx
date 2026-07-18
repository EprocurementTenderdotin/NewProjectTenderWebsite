import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { jsonLd } from "@/lib/jsonld";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Us — eProcurementTender.com" },
      { name: "description", content: "Get in touch with eProcurementTender.com for tender assistance, support, or partnership queries." },
      { property: "og:title", content: "Contact eProcurementTender.com" },
      { property: "og:description", content: "Reach our tender specialists — we respond within 24 hours." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: jsonLd({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact eProcurementTender.com",
          url: "/contact",
        }),
      },
    ],
  }),
});

function ContactPage() {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [submittedPhone, setSubmittedPhone] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.phone)) { toast.error("Enter valid 10-digit Indian mobile"); return; }
    if (!form.full_name.trim() || !form.message.trim()) { toast.error("Name and message required"); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Valid email required for status tracking"); return;
    }
    setSaving(true);
    // 1) Insert lead
    const { error: leadErr } = await supabase.from("leads_tracking").insert({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      message: form.message,
      source: "contact_page",
    });
    if (leadErr) { setSaving(false); toast.error(leadErr.message); return; }

    // 2) Also create an application so customer can track status
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);

    const { data: inserted, error: appErr } = await supabase
      .from("applications")
      .insert({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        budget_range_min: 0,
        budget_range_max: 0,
        additional_notes: `[Contact Form] ${form.message}`,
        callback_scheduled_at: tomorrow.toISOString(),
        call_scheduled_date: tomorrowDate,
        call_status: "pending",
      })
      .select("application_id")
      .single();

    setSaving(false);
    if (appErr) { toast.error(appErr.message); return; }

    toast.success("Message sent!");
    setSubmittedAppId(inserted?.application_id ?? null);
    setSubmittedPhone(form.phone);
    setSubmitted(true);
    setForm({ full_name: "", phone: "", email: "", message: "" });
  }

  async function copyId() {
    if (!submittedAppId) return;
    try {
      await navigator.clipboard.writeText(submittedAppId);
      toast.success("Application ID copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full" style={{ outline: "none" }}>
        {/* Hero */}
        <section
          className="relative overflow-hidden isolate"
          style={{
            background:
              "radial-gradient(1200px 500px at 15% 10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(900px 500px at 85% 90%, rgba(59,130,246,0.22) 0%, transparent 60%), linear-gradient(135deg, #0b1e4d 0%, #12295f 45%, #1e3a8a 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.2px)",
              backgroundSize: "22px 22px",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse at 50% 40%, black 55%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)" }}
          />
          <div className="relative container-page max-w-5xl py-12 sm:py-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-primary-foreground">
                Contact Us
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-primary-foreground leading-tight">
              Get in Touch
            </h1>
            <p className="mt-3 max-w-2xl text-primary-foreground/80 leading-relaxed text-base sm:text-lg">
              Have a question about tenders or need help with your application? Our team responds within 24 business hours.
            </p>
          </div>
        </section>

        <div className="container-page max-w-5xl py-8 sm:py-10">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="p-6 sm:p-7 rounded-2xl shadow-lg border-border -mt-16 sm:-mt-20 relative z-10 bg-card">
                {submitted ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Thank you!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We have received your message. Our team will contact you within 24 business hours.
                    </p>
                    {submittedAppId && (
                      <div className="max-w-md mx-auto rounded-xl border bg-muted/40 p-4 space-y-3">
                        <div className="text-xs text-muted-foreground">Your Application ID (save this to track status)</div>
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            readOnly
                            value={submittedAppId}
                            onFocus={(e) => e.currentTarget.select()}
                            className="h-11 max-w-56 text-center font-mono text-lg font-semibold"
                          />
                          <Button variant="outline" size="icon" onClick={copyId} aria-label="Copy application ID">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button asChild className="w-full h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
                          <Link to="/track" search={{ appId: submittedAppId, mobile: submittedPhone }}>
                            Track Status
                          </Link>
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" onClick={() => { setSubmitted(false); setSubmittedAppId(null); }}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Full Name *</Label>
                      <Input className="h-11 rounded-lg" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Mobile *</Label>
                      <Input className="h-11 rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="numeric" maxLength={10} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Email *</Label>
                    <Input className="h-11 rounded-lg" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Message *</Label>
                    <Textarea className="rounded-lg" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto h-12 px-8 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md transition-all font-semibold text-base"
                  >
                    {saving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                    Send Message
                  </Button>
                </form>
                )}
              </Card>
            </div>

            <div className="space-y-4 md:pt-2">
              <a
                href="mailto:info@eprocurementtender.com"
                className="group block rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email Us</div>
                    <div className="mt-1 font-semibold text-foreground truncate">info@eprocurementtender.com</div>
                    <div className="mt-1 text-xs text-muted-foreground">Reply within 24 business hours</div>
                  </div>
                </div>
              </a>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/25 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone Support</div>
                    
                    <div className="mt-1 text-xs text-muted-foreground">Indian Standard Time (IST)</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Office</div>
                    <div className="mt-1 font-semibold text-foreground">India</div>
                    <div className="mt-1 text-xs text-muted-foreground">Pan-India tender service</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}

