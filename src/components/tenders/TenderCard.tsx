import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, ArrowRight, Clock, IndianRupee } from "lucide-react";
import { CTALink } from "@/components/ui/cta-link";
import type { Tender } from "@/lib/tenders";
import { formatINR, formatDate, daysUntil } from "@/lib/format";

interface TenderCardProps {
  tender: Tender;
  compact?: boolean;
}

export function TenderCard({ tender, compact = false }: TenderCardProps) {
  const days = daysUntil(tender.submission_deadline);
  const closingSoon = days != null && days >= 0 && days <= 7;
  const typeTag = tender.category?.tender_type_tag;
  const categoryName = tender.category?.name;
  const location = [tender.district?.name, tender.state?.name].filter(Boolean).join(", ");

  return (
    <article className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300">
      {/* Top accent bar */}
      <div
        className={`h-[3px] w-full ${
          closingSoon
            ? "bg-gradient-to-r from-orange-400/80 to-rose-500/80"
            : "bg-gradient-to-r from-primary/70 to-accent/70"
        }`}
      />

      <div className="flex flex-col flex-1 p-5">
        {/* Top row: type + closing-soon badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {typeTag ? (() => {
            const styles: Record<string, string> = {
              Goods:    "text-blue-700 bg-blue-50 border-blue-200",
              Services: "text-emerald-700 bg-emerald-50 border-emerald-200",
              Works:    "text-amber-700 bg-amber-50 border-amber-200",
              Multiple: "text-violet-700 bg-violet-50 border-violet-200",
            };
            const cls = styles[typeTag] ?? "text-primary bg-primary/10 border-primary/20";
            return (
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${cls}`}>
                {typeTag}
              </span>
            );
          })() : <span />}
          {closingSoon && days != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              {days === 0 ? "Closes today" : `${days}d left`}
            </span>
          )}
        </div>

        {/* Title */}
        <Link to="/tenders/$id" params={{ id: tender.id }} className="mb-3">
          <h3 className="font-display font-semibold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {tender.title}
          </h3>
        </Link>

        {/* Category */}
        {categoryName && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{categoryName}</p>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Info panel */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Closing Date
            </div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${closingSoon ? "text-orange-600" : "text-foreground"}`}>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{formatDate(tender.submission_deadline)}</span>
            </div>
          </div>
          <div className="min-w-0 border-l border-border/60 pl-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Tender Amount
            </div>
            <div className="flex items-center gap-0.5 font-display font-bold text-sm text-primary truncate">
              <IndianRupee className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{formatINR(tender.estimated_value).replace(/^₹\s?/, "")}</span>
            </div>
          </div>
        </div>

        {!compact && tender.issuing_authority && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
            {tender.issuing_authority}
          </p>
        )}

        {/* Apply Now — clean primary button */}
        <CTALink
          to="/apply"
          loadingLabel="Opening…"
          className="btn-fluid btn-press mt-auto group/btn inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md transition-all"
        >
          <span>Apply Now</span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        </CTALink>


      </div>
    </article>
  );
}
