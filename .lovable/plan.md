
# Complete Customer + Admin Workflow

Aapki request bahut broad hai — track status aur admin dashboard ke baad ka pura customer + admin flow banana hai. Yeh plan hai:

## 1. Thank You Page (Apply ke baad)
- Application ID prominently show — `EPT-2026-000001` format
- **Copy ID button** (one-click, toast confirmation)
- "Track Status" button jo app ID + mobile auto-fill kare
- WhatsApp par ID share button

## 2. Customer Track Status Page (Improvements)
- Status ke saath **plain-language message** dikhana:
  - `under_review` → "Aapka application review mein hai. 24 ghante mein call aayega."
  - `call_scheduled` → "Call scheduled hai [date/time] par."
  - `under_verification` → "Documents verify ho rahe hain."
  - `documents_requested` → "Additional documents chahiye — neeche upload karein."
  - `tender_shared` → "Tender documents share kiye gaye — neeche download karein."
  - `loa_issued` → "Letter of Award jaari — download karein."
  - `aoc_work_order_issued` → "AOC & Work Order jaari."
  - `security_deposit_pending` → "Security Deposit pending — agreement download karein."
  - `completed` → "Application successfully complete."
- **Admin-shared documents section** — categorized: Tender Summary, LOA, AOC, Security Deposit Agreement, Work Order, Payment Receipt
- Har document ke saath **Preview** (in-browser) + **Download** button
- Customer sirf status + docs dekhega, kuch edit nahi kar sakta (upload sirf jab admin request kare)

## 3. Admin — Document Upload to Customer
Admin applications list mein har application ke against:
- **"Upload Document" dialog** — category select karo (Tender Summary / LOA / AOC / Security Deposit Agreement / Work Order / Payment Receipt / Other), file upload
- Uploaded docs list — preview, download, delete
- **Status change dropdown** — admin `under_review`, `call_scheduled`, `under_verification`, `documents_requested`, `tender_shared`, `loa_issued`, `aoc_work_order_issued`, `security_deposit_pending`, `security_deposit_paid`, `completed`, `rejected` mein change kar sakta hai
- Status change ke saath optional notes (customer ko dikhega)
- Har status change auto-log hoga history mein

## 4. Admin — Customer Uploaded Documents
- Customer ne jo docs upload kiye (PAN, Aadhaar, GST etc.) unko admin **preview + download** kar sake
- Verification status set kar sake: Pending / Verified / Rejected + rejection reason

## 5. Admin — Contact Form Submissions
- Naya menu item: **"Contact Messages"** (leads ke saath ya alag)
- Website ke "Contact Us" form ka data yahaan aayega — naam, mobile, email, message, date
- Admin mark as read / respond track kar sake

## 6. Admin — Session Persistence ("Remember Me")
- Login page par **"Remember me for 30 days"** checkbox
- Session auto-refresh — admin ko baar-baar login na karna pade
- Idle timeout only after 30 days

## 7. Application ID Block/Unblock (Optional Safety)
- Admin application ko `cancelled` kar sakta hai — customer track kare toh clean "Application cancelled" message

## 8. Design Polish
- Track status page, thank you page — professional cards, gradient headers, icons, mobile responsive
- Consistent color scheme with admin dashboard (indigo/blue primary)

## Technical Details

**Database (Cloud):**
- `application_documents` table already exists (customer + admin uploads) — add `document_category` enum for admin categorization if missing
- `application_status_history` — status change log (exists)
- `contact_messages` table — if not present, create with RLS: `authenticated` role via `has_role('admin')`, `anon` INSERT for public form
- Storage buckets: `admin-uploads` (private, signed URLs), `customer-uploads` (private, signed URLs)

**Routes to add/edit:**
- `src/routes/apply.tsx` — thank you screen: add Copy ID + WhatsApp share
- `src/routes/track.tsx` — plain-language status message block; categorized docs list
- `src/routes/contact.tsx` — POST to `contact_messages` via server fn
- `src/routes/admin.applications.tsx` — per-row: upload doc dialog, status update dialog, customer docs viewer, verification actions
- `src/routes/admin.messages.tsx` — new: contact form inbox
- `src/routes/admin.tsx` — sidebar link for Messages
- `src/routes/admin.login.tsx` — Remember Me checkbox

**Server functions:**
- `admin_upload_document` — upload to `admin-uploads`, insert row
- `admin_update_status` — status change + history + optional notes
- `admin_verify_customer_doc` — set verification_status
- Signed URL helper for preview/download

Yeh sab implement karne mein 6-8 file changes + 1 migration lagega.
