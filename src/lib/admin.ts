import { supabase } from "@/integrations/supabase/client";

// Database-safe application statuses (in timeline order). Labels below keep the
// customer/admin wording aligned with the newer status names, while values stay
// compatible with existing projects that still use the original enum.
export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "callback_scheduled",
  "tender_shared",
  "documents_requested",
  "documents_uploaded",
  "documents_verified",
  "loa_issued",
  "security_deposit_paid",
  "aoc_issued",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Labels for the spec's 12 statuses PLUS legacy values so any existing rows
// still render correctly on /track and admin surfaces.
export const STATUS_LABELS: Record<string, string> = {
  application_received: "Application Received",
  under_verification: "Under Verification",
  documents_verified: "Documents Verified",
  additional_documents_required: "Additional Documents Required",
  call_scheduled: "Call Scheduled",
  call_completed: "Call Completed",
  tender_documents_shared: "Tender Documents Shared",
  loa_issued: "LOA Issued",
  security_deposit_pending: "Security Deposit Pending",
  aoc_work_order_issued: "AOC / Work Order Issued",
  completed: "Completed",
  rejected: "Rejected",
  // legacy fallbacks
  submitted: "Application Received",
  under_review: "Under Verification",
  callback_scheduled: "Call Scheduled",
  tender_shared: "Tender Documents Shared",
  documents_requested: "Additional Documents Required",
  documents_uploaded: "Documents Uploaded",
  security_deposit_paid: "Security Deposit Paid",
  aoc_issued: "AOC / Work Order Issued",
  cancelled: "Cancelled",
};

// Timeline effect metadata (spec 8.4 — "Effect on Customer's /track Page")
export const STATUS_EFFECTS: Record<ApplicationStatus, { highlight?: "green" | "red"; note?: string }> = {
  submitted: {},
  under_review: {},
  callback_scheduled: {},
  tender_shared: { note: "Published admin docs appear" },
  documents_requested: { note: "Document upload section appears on /track" },
  documents_uploaded: {},
  documents_verified: {},
  loa_issued: { note: "LOA doc visible if published" },
  security_deposit_paid: { note: "Security deposit status shown" },
  aoc_issued: { note: "AOC doc visible if published" },
  completed: { highlight: "green" },
  rejected: { highlight: "red", note: "Rejection remark shown" },
  cancelled: { highlight: "red" },
};

export const DOCUMENT_TYPES = [
  { value: "pan_card", label: "PAN Card" },
  { value: "aadhaar_card", label: "Aadhaar Card" },
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "company_registration", label: "Company Registration" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "itr", label: "ITR" },
  { value: "experience_certificate", label: "Experience Certificate" },
  { value: "other", label: "Other" },
];

// Spec 8.5 — Admin Document Types. `isNew` renders a NEW badge in the admin UI.
export const ADMIN_DOC_CATEGORIES: { value: string; isNew?: boolean }[] = [
  { value: "Tender PDF" },
  { value: "Tender Summary" },
  { value: "BOQ" },
  { value: "EMD Pending", isNew: true },
  { value: "EMD Completed", isNew: true },
  { value: "EMD Receipt" },
  { value: "Security Deposit Receipt" },
  { value: "Security Deposit Agreement" },
  { value: "LOA – Letter of Acceptance" },
  { value: "AOC – Acceptance of Contract" },
  { value: "Work Order", isNew: true },
  { value: "Agreement" },
  { value: "Payment Receipt" },
  { value: "Supporting Documents" },
];

export const CALL_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "no_answer", label: "No Answer" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "not_interested", label: "Not Interested" },
];

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .in("role", ["admin", "super_admin"]);
  if (error) return false;
  return (data ?? []).length > 0;
}
