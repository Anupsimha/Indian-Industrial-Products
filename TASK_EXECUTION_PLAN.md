# Task Execution Plan — `TO-DO_LIST.txt` Analysis

Generated: 2026-11-24 | Repository: `Indian-Industrial-Products` | Target Branch Baseline: `production`

---

## 1. Existing Architecture & Implementation Baseline

### Technology Stack
- **Backend:** Python 3.10 + FastAPI monolithic application ([backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py), ~10,055 lines) using async SQLAlchemy ORM (`asyncpg` for PostgreSQL in production, `aiosqlite` for in-memory pytest runs).
  - **Modular Routers & Services:**
    - Recommendations: [backend/routers/recommendation_router.py](file:///home/arya/personal/Indian-Industrial-Products/backend/routers/recommendation_router.py) & [backend/services/recommendation/engine.py](file:///home/arya/personal/Indian-Industrial-Products/backend/services/recommendation/engine.py)
    - Tenant Websites & DNS: [backend/routers/website_router.py](file:///home/arya/personal/Indian-Industrial-Products/backend/routers/website_router.py)
    - Industrial News Aggregator: `backend/news/{config,models,routes,scheduler,service}.py` (APScheduler)
    - Utilities: [backend/email_utils.py](file:///home/arya/personal/Indian-Industrial-Products/backend/email_utils.py) (Gmail SMTP), [backend/services/invoice_service.py](file:///home/arya/personal/Indian-Industrial-Products/backend/services/invoice_service.py) (ReportLab GST PDF), [backend/ithink_utils.py](file:///home/arya/personal/Indian-Industrial-Products/backend/ithink_utils.py), [backend/payout_crypto.py](file:///home/arya/personal/Indian-Industrial-Products/backend/payout_crypto.py)
  - **Database Migration Pattern:** `Base.metadata.create_all` followed by idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements inside `@app.on_event("startup")` ([backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L9785-L9850)).
- **Frontend:** React SPA (CRACO + Tailwind CSS + Radix/shadcn UI + Lucide icons + Sonner toasts) using an Axios instance in [frontend/src/lib/api.js](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/lib/api.js).
  - Context Providers: `AuthContext`, `CartContext`, `SupportContactContext`, [LeadInterestContext.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/context/LeadInterestContext.jsx) mounted globally in [App.js](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/App.js#L138-L146).
  - Static UI Constants: `CATEGORIES`, `INDUSTRIAL_LOCATIONS` in [frontend/src/lib/constants.js](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/lib/constants.js).
- **Infrastructure:** Docker Compose (`frontend` Nginx on `127.0.0.1:3001` proxying `/api/` and `/VacancyResume/` to `backend:8000`, `postgres:15-alpine`) behind host TLS Nginx on `200.141.14.101`.

### Relevant Domain Models Already Present ([backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py))
- `User` (L280–305): `role` (`manufacturer`, `supplier`, `buyer`, `sales_partner`, `admin`), `company_id`, `unlocked_enquiries`, `monthly_unlocks`.
- `Company` (L312–340): `category`, `business_type`, `owner_id`, address/logistics/tax fields.
- `Product` (L366–380): `company_id`, `name`, `category`, `price`, `moq`, `stock_left`, `location`, `image_url`, `images`.
- `Enquiry` (L395–423): Shared table for standard requirements and Sales Partner leads (`is_sales_partner_lead`, `sales_partner_id`, `total_deal_value`, `lead_value`, `is_sold_out`, `sold_to_user_id`, `category`, `product_name`, `quantity`, `budget`, `required_by`).
- `SalesPartnerLeadDeal` (L425–451): Escrow tracking (`status`: `UNLOCKED`, `INVOICE_UPLOADED`, `APPROVED`, `FAKE_REPORTED`, `REFUNDED`, `fake_report_reason`, `fake_reported_at`, `admin_decision_notes`).
- `Category`: Managed via `/api/categories` and `/api/admin/categories` (L4799–4854).
- `SellerWallet` & `WalletTransaction`: Atomic wallet crediting/debiting (`CREDIT_SP_COMMISSION`, `ESCROW_CANCELLED`, `CREDIT_FAKE_REFUND`, `DEBIT_REFUND`).

---

## 2. Master Task Classification & Strategy Matrix

| Task ID | Task | Category | Complexity | Dependencies | Parallelizable | Recommended Agent Strategy | Recommended Model |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | Fix HTTP 500 error in Admin Panel Partner Deal capsule (`GET /api/admin/sales-partner-deals`) | `BUG` | Low | None | Yes (independent of T2, T3, T6; shares `server.py` with T4/T5/T7) | Single agent | Small/fast model |
| **T2** | Fix WhatsApp redirect on unlocked leads to open the customer's phone number instead of IIP support | `BUG` | Low | None | Yes with T1, T6 (file-overlap in `LeadsPage.jsx` with T3, T4, T7) | Single agent | Small/fast model |
| **T3** | Decouple removing/dismissing the `Interests: 5/5` UI bar/modal on Leads page from clearing active recommendations | `BUG` | Low–Medium | None | Yes with T1, T6 (file-overlap in `LeadsPage.jsx` with T2, T4, T7) | Single agent | Small/fast model |
| **T4** | Structured Sales Partner lead dispute workflow (`deal not done`, `Price too high`, `fake lead`, `wrong phone` + optional notes), confirmation message, admin listing, re-list vs sold-out rules, & 50% refund | `E2E_FEATURE` | High | T1 | No with T5/T7 (shares `server.py`, `LeadsPage.jsx`, `AdminPage.jsx`) | Subagent (sequential backend → frontend) | Strong reasoning model |
| **T5** | Send both in-app notifications and emails for `deal not done` and `refund received` events across all relevant users | `BUG` | Medium | T4 | No with T4 (shares escrow/dispute handlers in `server.py`) | Single agent / Subagent (bundled immediately after T4 backend) | Medium model |
| **T6** | Replace all category text fields and hardcoded category arrays with dynamic Admin Panel category dropdowns (`/api/categories`) | `BUG` / `REFACTOR` | Medium | None | Yes with T1, T2, T3 (avoid concurrent edits to `PostEnquiryPage.jsx`, `CompanyEditDialog.jsx`, `CompanyAdminPage.jsx` with T7) | Subagent | Small/fast model (or Medium for shared hook + regression checks) |
| **T7** | Add Services catalog & company service posting, Company `provider_type` (`product`/`service`/`both`), and Multi-type Leads (`Product`, `Service`, `Real Estate`) with dynamic posting form & filtered listings | `E2E_FEATURE` | Very High | T6, T2, T3, T4 (ordering prevents conflicts in `server.py` & shared pages) | Internally parallelizable across Stage 3B tracks after Stage 3A backend lands | Swarm or Teamwork (+ Boost for schema & UX alignment) | Strong reasoning model (design + backend) + Medium model (parallel frontend tracks) |

---

## 3. Codebase Investigation & Root Cause Findings (Zero Source Files Modified)

### T1 — Admin Panel Partner Deal Capsule 500 Error (`BUG`)
- **Confirmed Root Cause (Production Logs + Code):**
  - Production `docker logs indian-industrial-products-backend-1` shows repeated `GET /api/admin/sales-partner-deals HTTP/1.1 500 Internal Server Error` with:
    `RecursionError: maximum recursion depth exceeded while calling a Python object` inside FastAPI response serialization.
  - In [backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7896-L7897), `admin_list_sales_partner_deals` constructs `item = _serialize_deal(...)` and then assigns:
    `item["lead"] = serialize_enquiry(lead_obj, cu=user, unlocked_ids={dl.lead_id}, deal=item)`
    Inside `serialize_enquiry` ([L5388](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L5388)), `"deal": deal` embeds `item` back into `item["lead"]["deal"]`, creating an infinite self-referential cycle (`item["lead"]["deal"] is item`).
- **Secondary Issue Found in Admin UI:**
  - [AdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/AdminPage.jsx#L3586-L3594) reads `d.lead?.client_name` and `d.lead?.client_mobile`, whereas `serialize_enquiry` returns `name` and `mobile` ([L5368](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L5368), [L5379](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L5379)), causing the Lead Client phone snippet in Admin Panel to stay blank.
- **Fix Scope:** Pass `deal=None` inside `admin_list_sales_partner_deals` (`backend/server.py`), and update `AdminPage.jsx` L3586–3594 to read `d.lead?.name || d.lead?.client_name` and `d.lead?.mobile || d.lead?.client_mobile`.

### T2 — Unlocked Lead WhatsApp Redirect Points to IIP Number (`BUG`)
- **Confirmed Root Cause:**
  - [frontend/src/lib/api.js](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/lib/api.js#L30-L37) defines `export function whatsappLink(_number, message = "")`, deliberately ignoring `_number` and always substituting `supportObj.support_whatsapp || supportObj.support_phone || "9380036328"`.
- **Call Sites Audited:**
  - **Unlocked Leads (Buggy — must use customer's number):**
    - [LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L1709-L1718) (unlocked Sales Partner lead: `lead.mobile || lead.client_mobile`)
    - [LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L1737-L1743) (unlocked Standard lead: `lead.mobile`)
    - [HomePage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/HomePage.jsx#L827-L835) (unlocked enquiry card on Home: `it.mobile`)
  - **Non-Lead Callers (Intentional IIP support routing or to clarify):** `CompanyDetailPage.jsx`, `ProductsPage.jsx`, `ProductDetailPage.jsx`, `PostCard.jsx`, `ReelsPage.jsx`, `ContactUsPage.jsx`.
- **Fix Scope:** Add a `directWhatsappLink(number, message = "")` helper in [api.js](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/lib/api.js) (stripping non-digits and normalizing 10-digit Indian numbers with `91` prefix, falling back safely if missing) and switch the unlocked lead buttons in `LeadsPage.jsx` and `HomePage.jsx` to use `directWhatsappLink`.

### T3 — Removing `Interests 5/5` UI Component Removes Recommendations (`BUG`)
- **Confirmed Root Cause:**
  - In [LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L1774-L1826), the floating bottom bar (`Interests: {count}/5`) remains visible whenever `count > 0`, and its dismiss button `X` ([L1817](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L1817)) directly calls `onClick={resetInterests}`.
  - `resetInterests()` in [LeadInterestContext.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/context/LeadInterestContext.jsx#L133-L145) clears `selectedLeads`, sets `isPersonalized = false`, deletes localStorage keys, and sends `DELETE /api/recommendations/interests`, wiping the user's recommendations.
  - Additionally, [LeadInterestContext.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/context/LeadInterestContext.jsx#L33-L57) couples `selectedLeads.length === 0` to `setIsPersonalized(false)` even when the backend already has saved `UserLeadInterest` rows, and does not hydrate `selectedLeads` from `/api/recommendations/interests` on login/reload.
- **Fix Scope:**
  - Add a separate UI-only dismissal state (`isWidgetDismissed` / `dismissInterestWidget`) for the floating bottom bar/widget in `LeadInterestContext.jsx` (and auto-hide the floating bar once recommendations are confirmed active, while preserving the active recommendation state and "Manage/Reset Interests" controls in the header banner [LeadsPage.jsx L1471–1523](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L1471-L1523)).
  - Clicking `X` on the floating `Interests X/5` bar or modal only hides the floating bar (`dismissInterestWidget()`), leaving `isPersonalized`, `localStorage`, and `UserLeadInterest` intact. Keep explicit `"Reset"` in the recommendation banner or modal as the intentional clear action.

### T4 — Structured Lead Dispute Flow (`deal not done`, `Price too high`, `fake lead`, `wrong phone`) (`E2E_FEATURE`)
- **Partially Implemented Foundation:**
  - `SalesPartnerLeadDeal` model ([backend/server.py L425–451](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L425-L451)), `POST /api/sales-partner/deals/{deal_id}/report-fake` ([L7819–7871](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7819-L7871)), `GET /api/admin/sales-partner-deals` ([L7874–7899](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7874-L7899)), `POST /api/admin/sales-partner-deals/{deal_id}/resolve` ([L7902–7961](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7902-L7961)), `_refund_fake_lead_deal` ([L7287–7388](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7287-L7388)), `FakeReportModal` ([LeadsPage.jsx L559–646](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx#L559-L646)), and `SalesPartnerDealsTab` ([AdminPage.jsx L3320–3745](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/AdminPage.jsx#L3320-L3745)).
- **Missing Pieces & Architectural Gaps:**
  1. **Buyer Report Modal & Payload:** Currently requires free-text reason (`>= 5` chars). Needs radio/pill options: `deal_not_done` ("Deal not done"), `price_too_high` ("Price too high"), `fake_lead` ("Fake lead"), `wrong_phone` ("Wrong phone") + optional free-text notes, and post-submit message: `"Our admin team will review your dispute"`.
  2. **Schema Extensions:** Add `dispute_reason_code` (`String(50)`, nullable) and `relisted_at` / outcome fields to `SalesPartnerLeadDeal` (+ `ALTER TABLE` startup migration in `server.py`).
  3. **Admin Resolution State Machine:**
     - `deal_not_done` / `price_too_high` verified by admin → transition deal status (e.g., `DEAL_NOT_DONE_RELISTED` / `RELISTED`), cancel partner's pending escrow (`ESCROW_CANCELLED` unless payout already finalized), **re-open the `Enquiry` for other buyers** (`enq.is_sold_out = False`, `enq.sold_to_user_id = None`). *(Requires clarification Q1 on whether a 50% or 0% buyer refund applies for `deal_not_done` / `price_too_high`.)*
     - `fake_lead` / `wrong_phone` verified by admin → **keep lead marked sold out** (`enq.is_sold_out = True`), cancel partner escrow, credit **50% of `lead_value_base`** to buyer's wallet (`CREDIT_FAKE_REFUND`), mark deal `REFUNDED`.
     - Reject dispute → restore deal to `UNLOCKED` or `INVOICE_UPLOADED`.
  4. **Critical Multi-Deal Bug Risk When Re-Listing:** When a lead is re-listed and purchased by Buyer B, `SalesPartnerLeadDeal` will have two rows for the same `lead_id` (Buyer A's `RELISTED` deal and Buyer B's `UNLOCKED` deal). `_serialize_requirement_docs` ([L5413–5415](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L5413-L5415)) and `get_sales_partner_my_leads` must deterministically pick the buyer's own deal (for buyer) or the latest active deal (for Sales Partner / Admin) instead of arbitrarily overwriting a dict.

### T5 — Notification & Email Delivery for `deal not done` & `refund received` (`BUG`)
- **Partially Implemented Foundation:**
  - `notify_user()` ([backend/server.py L1428–1473](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L1428-L1473)) creates the DB `Notification` row and dispatches HTML email asynchronously via `asyncio.create_task(send_email(...))` whenever `send_email_flag=True` and `email_to` is provided.
- **Confirmed Gaps:**
  - `_refund_fake_lead_deal` ([L7367–7387](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7367-L7387)): Sends **in-app notification + email** to the buyer (`CREDIT_FAKE_REFUND`), but sends **in-app notification ONLY (`send_email_flag=False`)** to the Sales Partner!
  - `report_sales_partner_deal_fake` ([L7846–7866](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7846-L7866)): Sends no confirmation notification/email to the reporting buyer and sends in-app notification only (no email) to Sales Partner and Admins.
  - `reject_fake_report` ([L7939–L7956](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7939-L7956)) and `_release_partner_deal_payout` buyer notification ([L7274–7283](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L7274-L7283)): In-app only (no email).
  - `reject_order` refund ([backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py)): Credits `DEBIT_REFUND` reversal without customer/seller refund email/notification (confirm scope in Q2).
  - New `deal_not_done` / `price_too_high` dispute & re-listing flows (from T4) must call `notify_user(..., send_email_flag=True, ...)` for **all involved users** (buyer, sales partner, and admins where applicable).

### T6 — Replace All Category Text Fields & Hardcoded Lists with Admin Category Dropdowns (`BUG` / `REFACTOR`)
- **Backend Already Implemented:** `GET /api/categories` and Admin CRUD (`POST/PATCH/DELETE /api/admin/categories`) exist in [backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py#L4799-L4854) and [AdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/AdminPage.jsx#L821-L846).
- **Complete Audit of Frontend Forms:**
  1. **Plain Text `<input>` Fields (Directly Broken):**
     - [ProductDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/ProductDialog.jsx#L274-L281): `<input value={form.category} ... />`
     - [CompanyEditDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/CompanyEditDialog.jsx#L99): `<Row label="Category" value={form.category} ... />` (renders `<input>`)
     - [CompanyAdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/CompanyAdminPage.jsx#L816-L822): `<input type="text" value={companyForm.category} ... />`
  2. **Hardcoded Static `CATEGORIES` `<select>` Dropdowns (Ignoring Admin-Defined Categories):**
     - [CreateDialogs.jsx — `PostDialog`](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/CreateDialogs.jsx#L83-L95): Renders static `CATEGORIES` from `constants.js` (also the primary "creating a post" dialog mentioned in `TO-DO_LIST.txt`).
     - [PostEditDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/PostEditDialog.jsx#L150-L163): Renders static `CATEGORIES`.
     - [EnquiryDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/EnquiryDialog.jsx#L143-L153): Renders static `CATEGORIES`.
     - [PostEnquiryPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/PostEnquiryPage.jsx#L220-L231): Merges static `CATEGORIES` with `/api/categories`; should prioritize Admin `/api/categories` cleanly.
- **Fix Scope:** Extract a shared cached hook `frontend/src/hooks/useCategories.js` fetching `/api/categories` and update all 7 components/pages above to render dynamic Admin categories (preserving an existing legacy category option when editing an older record so it isn't silently cleared).

### T7 — Services Catalog, Company Provider Type & Multi-Type Leads (`Product`, `Service`, `Real Estate`) (`E2E_FEATURE`)
- **Zero Partial Implementation Today:**
  - `Company` has `business_type` free-text string (e.g., `"Manufacturer / Supplier / Distributor"`), but no structured `provider_type` (`product` / `service` / `both`) on registration or profile.
  - No `Service` model, API router, or Services frontend pages exist (`Products` + `Enquiry` only).
  - `Enquiry` has no `lead_type` (`product` / `service` / `real_estate`) discriminator or type-specific fields.
- **Planned Scope:**
  1. **Company Provider Type:**
     - Add `Company.provider_type` (`String(30)`, nullable/`default="product"` via `ALTER TABLE`) capturing `"product"`, `"service"`, or `"both"`.
     - Collect on business registration ([RegisterPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/RegisterPage.jsx) + `/api/auth/register`) and allow editing in [CompanyEditDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/CompanyEditDialog.jsx), [CompanyAdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/CompanyAdminPage.jsx); display badge & filter on [CompaniesPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/CompaniesPage.jsx) and [CompanyDetailPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/CompanyDetailPage.jsx).
  2. **Services Catalog (Separate Router & UI Section):**
     - Create `Service` ORM table in `server.py` (or dedicated module) + extract routes into a clean [backend/routers/services_router.py](file:///home/arya/personal/Indian-Industrial-Products/backend/routers/services_router.py) (avoiding further bloating `server.py`).
     - Service parameters: `title`/`name`, `category`, `description`, `pricing_model` (Fixed / Per Hour / Per Project / Custom Quote), `price_range`, `service_area` (City/State/Pan-India), `service_mode` (On-site / Remote / Both), `turnaround_time`, `experience_years`, `certifications`, `image_url`, `images`, `company_id`.
     - Frontend: `ServicesPage.jsx`, `ServiceDetailPage.jsx`, `ServiceDialog.jsx`, tab on `CompanyDetailPage.jsx`, routes in `App.js`, and navigation entries in `TopHeader.jsx` / `BottomNav.jsx` (note `BottomNav.jsx` uses a strict 5-column mobile `grid-cols-5` layout — keep 5 slots on mobile by e.g. adding `"Post Service"` in `+` prompt modal & switching/linking cleanly from TopHeader + Products/Services switcher).
  3. **Multi-Type Leads (`product`, `service`, `real_estate`):**
     - Add `Enquiry.lead_type` (`String(30)`, `default="product"`, indexed) and `Enquiry.lead_metadata` (`JSON`, default `{}`) + startup `ALTER TABLE` migration.
     - Update `EnquiryCreate` / `_create_enquiry_impl` / `/api/sales-partner/leads` / `serialize_enquiry` / `/api/requirements?lead_type=...` / `recommendation_router.py` & `recommendation/engine.py`.
     - Dynamic Lead Form ([PostEnquiryPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/PostEnquiryPage.jsx) & [EnquiryDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/EnquiryDialog.jsx)): Top 3-way selector (`Product Lead` | `Service Lead` | `Real Estate Lead`) dynamically renders fields relevant to each type (Product: Product Name, Quantity; Service: Service Name/Title, Scope/Duration, Location Mode; Real Estate: Property Type, Transaction Type Buy/Rent/Lease, Area sq.ft/Acres).
     - Separated/Filtered Lead Listings ([LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx), [RequirementsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/RequirementsPage.jsx), [SalesPartnerPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/SalesPartnerPage.jsx)): Top segmented tabs (`All` / `Product Leads` / `Service Leads` / `Real Estate Leads`) combining cleanly with existing status/partner filters.

---

## 4. Overlapping Files & Concurrency Hazards

### Shared File Overlap Matrix
| File | Overlapping Tasks | Conflict Risk |
| :--- | :--- | :--- |
| [backend/server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py) | **T1, T4, T5, T7** | Very High (10k-line monolith: models, migrations, notification helpers, deal endpoints, enquiry endpoints) |
| [frontend/src/pages/LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx) | **T2, T3, T4, T7** | High (lead cards, WhatsApp links, floating interest bar, dispute modal, filters) |
| [frontend/src/pages/AdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/AdminPage.jsx) | **T1, T4** | Medium (`SalesPartnerDealsTab` & resolution modal) |
| [frontend/src/pages/PostEnquiryPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/PostEnquiryPage.jsx) | **T6, T7** | Medium (category select + lead-type dynamic form) |
| [frontend/src/components/CompanyEditDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/CompanyEditDialog.jsx) | **T6, T7** | Medium (category select + `provider_type` selector) |
| [frontend/src/pages/CompanyAdminPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/CompanyAdminPage.jsx) | **T6, T7** | Medium (category select + `provider_type` selector + services CRUD link) |
| [frontend/src/components/EnquiryDialog.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/EnquiryDialog.jsx) | **T6, T7** | Medium (category select + lead_type switcher) |

### Tasks That Must NOT Run Concurrently
- **T2 vs T3 vs T4 vs T7** must **not** edit `LeadsPage.jsx` at the same time (T2 & T3 should run sequentially in one owner or combined in Batch 1 before T4; T4 before T7).
- **T1 vs T4 vs T5 vs T7** must **not** edit `backend/server.py` concurrently without worktree isolation or strict sequencing (T1 in Batch 1 → T4+T5 in Batch 2 → T7 in Batch 3).
- **T6 vs T7** must **not** run concurrently because both edit `PostEnquiryPage.jsx`, `EnquiryDialog.jsx`, `CompanyEditDialog.jsx`, and `CompanyAdminPage.jsx`.

---

## 5. Recommended Execution Batches & Implementation Order

### Batch 1 — Production Bug Fixes & Category Standardization (Immediate Quick Wins)
Can run safely across **3 non-overlapping parallel tracks**:
- **Track 1A (Backend — T1):**
  - Owner: Single agent (`Small/fast model`)
  - Scope: `backend/server.py` (`admin_list_sales_partner_deals` `deal=None`) + `AdminPage.jsx` L3586–3594 (`name`/`mobile` fallback) + pytest regression test.
- **Track 1B (Frontend — T2 + T3 combined in one sequential owner):**
  - Owner: Single agent (`Small/fast model`)
  - Scope: `frontend/src/lib/api.js` (`directWhatsappLink`), `frontend/src/context/LeadInterestContext.jsx` (`dismissInterestWidget` decoupled from `resetInterests`), `frontend/src/pages/LeadsPage.jsx`, `frontend/src/pages/HomePage.jsx`.
- **Track 1C (Frontend — T6):**
  - Owner: Subagent (`Medium model`)
  - Scope: Create `frontend/src/hooks/useCategories.js`, replace text inputs & hardcoded arrays in `ProductDialog.jsx`, `CreateDialogs.jsx`, `PostEditDialog.jsx`, `EnquiryDialog.jsx`, `CompanyEditDialog.jsx`, `CompanyAdminPage.jsx`, `PostEnquiryPage.jsx`.

*(Note: Track 1A touches `AdminPage.jsx` L3586 only; Track 1B touches `LeadsPage.jsx`, `HomePage.jsx`, `api.js`, `LeadInterestContext.jsx`; Track 1C touches dialog/category forms + `CompanyAdminPage.jsx` + `PostEnquiryPage.jsx` — **zero overlapping files between 1A, 1B, and 1C**.)*

### Batch 2 — Sales Partner Dispute Workflow & Notifications (`T4` + `T5`)
Starts immediately after Batch 1 merges cleanly:
- **Stage 2A (Backend — T4 + T5 together):**
  - Owner: Subagent (`Strong reasoning model`)
  - Scope: Add `dispute_reason_code` migration on `SalesPartnerLeadDeal`, structured dispute options (`deal_not_done`, `price_too_high`, `fake_lead`, `wrong_phone`) in `report_sales_partner_deal_fake`, admin resolution branches (re-listing `Enquiry` vs sold-out + 50% refund), multi-deal serialization precedence fix in `_serialize_requirement_docs` & `get_sales_partner_my_leads`, and full in-app + email notifications (`send_email_flag=True`) across all buyer/partner/admin outcomes.
- **Stage 2B (Frontend — T4 UI):**
  - Owner: Subagent (`Medium model`)
  - Scope: Update `FakeReportModal` & `SalesPartnerDealPanel` in `LeadsPage.jsx` (radio options + optional notes + confirmation copy) and `SalesPartnerDealsTab` in `AdminPage.jsx` (display structured reason badge, expose re-list vs refund controls, filter pills for `RELISTED` / `DEAL_NOT_DONE`).

### Batch 3 — Services Catalog, Provider Type & Multi-Type Leads (`T7`)
Runs after Batch 2 so `server.py` and `LeadsPage.jsx` are clean:
- **Stage 3A (Design + Backend Foundation):**
  - Strategy: Boost/Teamwork Lead (`Strong reasoning model`)
  - Scope: Add `Company.provider_type` + `Service` model (`services`) + `Enquiry.lead_type` / `lead_metadata` + startup `ALTER TABLE` migrations in `server.py`; build `backend/routers/services_router.py` (CRUD + filtering); update registration/company/enquiry endpoints and [backend/services/recommendation/engine.py](file:///home/arya/personal/Indian-Industrial-Products/backend/services/recommendation/engine.py).
- **Stage 3B (3 Parallel Frontend Subagents — disjoint files):**
  - **Track 3B-1 (Services Catalog UI):** `ServicesPage.jsx`, `ServiceDetailPage.jsx`, `ServiceDialog.jsx`, `App.js`, `TopHeader.jsx`, `BottomNav.jsx`, `CompanyDetailPage.jsx`. (`Medium model`)
  - **Track 3B-2 (Company Registration & Profile UI):** `RegisterPage.jsx`, `CompanyEditDialog.jsx`, `CompanyAdminPage.jsx`, `CompaniesPage.jsx`. (`Small/fast model`)
  - **Track 3B-3 (Multi-Type Leads Form & Listings UI):** `PostEnquiryPage.jsx`, `EnquiryDialog.jsx`, `LeadsPage.jsx`, `RequirementsPage.jsx`, `SalesPartnerPage.jsx`. (`Strong reasoning` or `Medium model`)

### Batch 4 — Integration Verification & Production Deployment
- Full backend `pytest` suite (existing 15+ cases + new regression tests for T1–T7).
- Production Docker frontend build (`docker build --target build`) & Jest component tests (`HomePage.test.jsx`, new UI unit checks).
- Staging/live verification on `production` after explicit deploy sign-off.

---

## 6. Potential Architectural Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **`backend/server.py` merge contention** | Parallel branches editing the 10k-line monolith will conflict frequently. | Serialize `server.py` edits across batches; extract `T7` Services endpoints into `backend/routers/services_router.py` following `website_router.py` / `recommendation_router.py`. |
| **Multi-deal collision on re-listed SP leads (T4)** | Re-listing an `Enquiry` creates >1 `SalesPartnerLeadDeal` rows for the same `lead_id`; `_serialize_requirement_docs` overwrites `deals_by_lead[lead_id]` blindly. | Index deals per `(lead_id, buyer_user_id)` for buyers, and sort/select the active/non-relisted or latest deal for partner/admin views; ensure wallet escrow IDs use `deal.id` (already unique per purchase). |
| **Idempotent startup migrations on PostgreSQL** | Adding non-null columns without defaults crashes live startup on existing rows. | Every new column (`dispute_reason_code`, `provider_type`, `lead_type`, `lead_metadata`) must be nullable or define an explicit SQL `DEFAULT` in `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. |
| **Legacy `category` strings vs Admin dropdown (T6)** | Existing products/posts/companies created via old text inputs may have values absent from Admin `categories` table. | Preserve `currentValue` as an extra legacy `<option>` when editing if it is not present in `/api/categories` so users don't lose data on save. |
| **Recommendation engine null assumptions (T7)** | `recommendation/engine.py` & `LeadInterestContext` read `product_name` and `category`. | Default/coalesce `title`/`service_name`/`property_type` cleanly into recommendation token extraction and UI summaries so `service` and `real_estate` leads work seamlessly. |
| **Mobile `BottomNav` 5-slot budget (T7)** | `BottomNav.jsx` renders `grid-cols-5`; adding a 6th tab breaks mobile layout. | Keep mobile bottom nav to 5 items; expose Services via `TopHeader`, Home quick-nav/drawer, Products/Services switcher, and the `+ Post` chooser modal. |

---

## 7. Testing Requirements per Task

- **T1:** Pytest calling `GET /api/admin/sales-partner-deals` with an active `SalesPartnerLeadDeal` + `Enquiry` asserts `200` (no `RecursionError`), valid JSON serialization, and presence of `lead.name` / `lead.mobile`; manually verify Admin Panel → Partner Deals loads in UI.
- **T2:** Unit/UI test verifying unlocked lead WhatsApp anchor uses `https://wa.me/91<customer_mobile>?text=...` for both Sales Partner unlocked leads and regular unlocked leads, and never falls back to IIP support `9380036328` when customer mobile exists.
- **T3:** Component/integration test verifying clicking `X` on the `Interests: 5/5` floating bar/modal hides the bar while preserving `isPersonalized === true`, keeping `localStorage` active key, and NOT calling `DELETE /api/recommendations/interests`; explicit `Reset` button still clears interests cleanly.
- **T4:** Pytest covering all 4 `dispute_reason_code` values (`deal_not_done`, `price_too_high`, `fake_lead`, `wrong_phone`), optional notes, post-submit `"our admin team will review your dispute"` UX, admin resolution keeping lead `is_sold_out=True` + 50% `CREDIT_FAKE_REFUND` on `fake_lead`/`wrong_phone`, admin resolution re-opening `is_sold_out=False` + allowing a second buyer purchase on `deal_not_done`/`price_too_high`, and proper multi-deal serialization.
- **T5:** Pytest with mocked `send_email` (and SMTP/DB assertions) verifying both `Notification` DB records AND `send_email` invocations for every participant (buyer, sales partner, admins) across `deal_not_done`, `price_too_high`, `fake_lead`, `wrong_phone`, and `refund received` outcomes.
- **T6:** Component/build test checking `ProductDialog`, `CreateDialogs` (`PostDialog`), `PostEditDialog`, `EnquiryDialog`, `CompanyEditDialog`, `CompanyAdminPage`, and `PostEnquiryPage` render `<select>` options sourced from `GET /api/categories` and reflect newly created admin categories without hardcoded-only lists.
- **T7:**
  - Backend Pytest: `POST /api/auth/register` & `PATCH /api/companies/{id}` persist `provider_type`; `/api/services` CRUD + filtering + ownership guards (`403` for non-owners, buyers forbidden); `POST /api/enquiries` & `/api/sales-partner/leads` accept `lead_type` (`product`/`service`/`real_estate`) + `lead_metadata`; `GET /api/requirements?lead_type=...` filters accurately and masks contacts when locked; recommendation overview/leads handle all 3 lead types.
  - Frontend: `craco build` (`exit code 0`), Jest tests + interactive UI checks on Register, Services Catalog, Post Enquiry dynamic form, and Leads type filters.

---

## 8. Missing Requirements & Clarification Questions

Before finalizing implementation details for **T4, T5, T6, and T7**, please clarify the following 5 points (I have noted the recommended defaults we will use if you want us to proceed right away):

1. **Q1 (T4 — Refund Policy for `deal not done` & `Price too high`):**
   - When an admin verifies **`deal not done`** or **`Price too high`** and re-lists the Sales Partner lead for other buyers, should the original buyer receive a **50% wallet refund**, **100% wallet refund**, or **0% refund** (just closing their deal and re-listing the lead)?
   - *Note:* Your prompt explicitly specifies `"in case of deal not done and price too once verified the lead should again be listed for other buyers in case of fake lead and wrong number then it should be markd sold out after verification by admin"` and `"if confirmed fake the 50% of base lead will be refunded"`. Clarifying whether `wrong phone` also triggers the 50% refund (recommended: **Yes**, treat `fake_lead` and `wrong_phone` identically with 50% refund + keep sold out; and clarify refund vs no-refund for `deal_not_done`/`price_too_high`).
2. **Q2 (T5 — "all user" Notification & Email Scope):**
   - For `"Provide both notification and mail for deal not done and refund recived for all user"`, does **"all users involved"** mean:
     - **A) Buyer + Sales Partner + Admin** on that Sales Partner lead deal (`deal not done` / `refund received`)?
     - Or **B)** Also send wallet refund notifications/emails when a regular e-commerce **Order is rejected** (`DEBIT_REFUND` / buyer order refund)?
3. **Q3 (T6 — Category Source Strictness & Legacy Values):**
   - Should Admin categories (`GET /api/categories`) be the **strictly exclusive** dropdown source across Posts, Products, Enquiries, and Companies (removing the hardcoded `CATEGORIES` list in `constants.js` except as fallback if `/api/categories` returns empty)?
   - When an admin adds new **Service** or **Real Estate** categories in Admin Panel for **T7**, should `/api/categories` remain one shared category list or be filterable by type (`product` / `service` / `real_estate` / `general`)?
4. **Q4 (T7 — Services Parameters, Pricing & Ordering Model):**
   - When a company posts a **Service**, what specific parameters should be collected (recommended default: Service Name, Category, Description, Pricing Model [`Fixed` / `Starting From` / `Per Hour` / `Custom Quote`], Indicative Price / Rate, Service Mode [`On-site` / `Remote` / `Both`], Service Coverage Area / City / Pan-India, Turnaround / SLA Time, Experience / Certifications, Images)?
   - Should Services support **Enquiry / Request Quote only** (recommended for industrial B2B services) or also e-commerce Cart checkout?
   - For **`provider_type`** (`Product Provider`, `Service Provider`, `Both`) during registration: should existing `Manufacturer` and `Supplier` roles both show this selector, or should `Sales Partner` also stay separate as today?
5. **Q5 (T7 — Real Estate Lead Fields & Pricing):**
   - When posting a **Real Estate Lead**, what fields should the dynamic form collect (recommended: Property Type [`Industrial Plot` / `Factory Shed` / `Warehouse` / `Commercial Space` / `Agricultural/Other`], Transaction Type [`Buy` / `Rent` / `Lease`], Area / Size + Unit [`sq.ft` / `sq.m` / `Acres`], Location, Budget / Deal Value, Possession/Timeline)?
   - Should Sales Partner Real Estate leads and Service leads use the same **2% lead value + 18% GST, 50/50 escrow** formula as Product leads?

