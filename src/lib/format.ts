/** Indian rupee formatter — always ₹ X Lac or ₹ X Cr (never raw digits) */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return "—";
  const n = Number(amount);
  if (n >= 10000000) {
    const v = n / 10000000;
    return `₹ ${Number.isInteger(v) ? v : v.toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  const v = n / 100000;
  return `₹ ${Number.isInteger(v) ? v : v.toFixed(2).replace(/\.?0+$/, "")} Lac`;
}

export function formatINRFull(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function daysUntil(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
