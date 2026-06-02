# Invoice Generator — Build Plan

A full SaaS app for freight dispatchers to OCR rate confirmations, generate invoices, and export PDF/Excel.

## Stack

- TanStack Start (React 19 + TS, Vite) — current template
- Lovable Cloud (Supabase) — DB, Auth, Storage
- Lovable AI Gateway (Gemini) — vision OCR + structured extraction from PDFs/images
- shadcn/ui + Tailwind v4 — UI
- `jspdf` + `jspdf-autotable` — PDF invoices
- `exceljs` — Excel export
- `pdfjs-dist` — render PDF pages to images for OCR

## Auth & Layout

- Email/password auth (Lovable Cloud)
- Dark mode toggle (next-themes pattern via class on html)
- Protected `_authenticated` layout with sidebar nav: Dashboard, Upload, Invoices, Templates, Settings
- Public `/auth` page (login/signup)

## Database (Supabase via migration)

Tables (all RLS, scoped to `auth.uid()`, GRANTs to authenticated):

- `profiles` — id (=auth.uid), email, created_at
- `settings` — user_id PK, sender_name, company_name, phone, email, address, logo_url, zelle, cashapp, bank_transfer, default_fee_pct
- `carriers` — id, user_id, name, mc_number, address, phone
- `loads` — id, user_id, carrier_id, load_number, broker, pickup_date, pickup_city, pickup_state, delivery_city, delivery_state, rate, source_file_url, invoice_id (nullable), raw_extraction jsonb
- `invoices` — id, user_id, invoice_number, invoice_date, due_date, carrier_id, gross, fee_pct, fee_amount, due, status, template_id, pdf_url, xlsx_url
- `invoice_templates` — id, user_id (nullable for defaults), name, config jsonb, is_default
- Seed 3 default templates: Professional, Modern, Minimal

Storage buckets (private, RLS by `auth.uid()` folder prefix):
- `uploads` — original rate confirmations
- `exports` — generated PDFs/Excels
- `logos` — user logos

## OCR / Extraction

Server function `extractRateConfirmation`:
1. Receive file URL (signed) or base64
2. If PDF: render first 2 pages to PNGs via pdfjs-dist
3. Call Lovable AI Gateway `google/gemini-2.5-flash` with image + structured JSON schema (tool calling) for: carrier {name, mc, address, phone}, load {load_number, broker, pickup_date, pickup_city/state, delivery_city/state, rate}
4. Insert into `carriers` (dedupe by mc_number+user) and `loads`
5. Return inserted IDs

Batch: client uploads N files in parallel, calls extractor per file with concurrency limit (5).

## Pages

- `/auth` — sign in / sign up
- `/_authenticated/` (dashboard) — stat cards: total loads, gross, fees, invoice count; recent invoices
- `/_authenticated/upload` — dropzone, progress per file, results table editable
- `/_authenticated/loads` — all unbilled loads, multi-select → "Create Invoice"
- `/_authenticated/invoices` — history table with search/filter, download PDF/XLSX
- `/_authenticated/invoices/$id` — invoice preview, edit fee %, regenerate
- `/_authenticated/templates` — list, duplicate, edit, set default
- `/_authenticated/settings` — sender info, payment methods, logo, default fee %

## Invoice generation

Client-side `jspdf` builds PDF using selected template config (colors, header style). Uploads to `exports` bucket, saves URL. Same for `exceljs` xlsx.

Columns: Load #, Broker, Pickup Date, Origin (city,ST), Destination (city,ST), Rate. Totals row + Gross / Fee % / Fee $ / Net Due block.

## Design

- Modern minimal SaaS look. Neutral background, single accent (deep blue oklch).
- Typography: Inter
- Sidebar + topbar layout
- Cards with subtle borders, no heavy shadows
- Dark mode tokens already in styles.css; extend palette

## Out of scope (won't ship in v1)

- Docker / Vercel config (project deploys via Lovable Publish)
- Stripe/payments processing
- Multi-tenant admin (per-user data isolation via RLS is the "multi-user" model)

## Order of implementation

1. Enable Lovable Cloud
2. DB migration (tables, RLS, grants, seed templates) + storage buckets
3. Auth pages + `_authenticated` layout + sidebar
4. Settings page (required before invoicing)
5. Upload + OCR server fn
6. Loads review/edit
7. Invoice creation + PDF/Excel export
8. Invoice history + dashboard stats
9. Templates page
10. Polish, dark mode toggle