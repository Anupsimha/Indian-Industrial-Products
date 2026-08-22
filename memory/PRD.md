# IIP - Indian Industrial Products | PRD & Architecture

## Original Problem Statement
A modern web platform "IIP - Indian Industrial Products" (industrial blue/grey/orange theme, gear+India-map logo, tagline "Industrial Marketplace & Business Network"). UI inspired by Facebook + Instagram + B2B marketplace, mobile-first responsive. Features: home feed, hero auto-slider, vertical reels, company profiles, post enquiry, leads dashboard, product listings, JWT auth with 3 roles (Manufacturer/Supplier/Buyer), bottom mobile navigation, WhatsApp click-to-chat, follow/save/notifications, subscription plans (Basic ₹999, Standard ₹2999), Jobs/Vacancies section, Cloudinary media uploads, full company profile with GST/PAN/certifications, owner CRUD, admin dashboard.

## User Personas
- **Manufacturer / Supplier** — owns a company profile, posts content, uploads reels, lists products, posts vacancies, edits profile, receives leads on dashboard + WhatsApp.
- **Buyer / Procurement Officer** — browses feed/reels, follows companies, sends enquiries, posts requirements, applies to jobs.
- **Admin** — sees stats, manages all companies (delete cascades), seeded `admin@iip.com` / `admin123`.

---

## Architecture Summary

### Stack
| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, Tailwind, Shadcn UI, Lucide, Sonner toasts |
| Backend | FastAPI, Motor (async MongoDB), bcrypt, PyJWT |
| Storage | MongoDB (data) + Cloudinary (CDN images/videos) |
| Auth | JWT (httpOnly cookie + Bearer fallback), bcrypt password hashing |
| Hosting | Container-based supervisor (frontend on :3000, backend on :8001 behind /api) |

### Request flow
`React → axios (cookie + Bearer) → FastAPI /api/* → Motor → MongoDB`
`React MediaUploader → /api/cloudinary/signature → Cloudinary direct → returns secure_url → backend persists URL only`

### Folders
```
/app/backend/server.py      # all endpoints + seed
/app/backend/.env            # MONGO_URL, JWT_SECRET, CLOUDINARY_*
/app/frontend/src/
  ├── App.js                 # routes
  ├── context/AuthContext    # global auth state w/ loading
  ├── lib/api.js             # axios + helpers (whatsappLink, formatApiError)
  ├── lib/cloudinary.js      # signed-upload helper, optimizedUrl()
  ├── components/
  │   ├── Logo, TopHeader, BottomNav, HeroSlider, JobsSection
  │   ├── PostCard (likes/comments/save/follow/whatsapp/enquiry)
  │   ├── EnquiryDialog, ProductDialog, CreateDialogs (Post/Reel)
  │   ├── CompanyEditDialog, MediaUploader (multi-file)
  └── pages/
      ├── HomePage, ReelsPage, CompanyDetailPage (4 tabs)
      ├── ProductsPage, JobsPage, LeadsPage, ProfilePage
      ├── LoginPage, RegisterPage, PostEnquiryPage
      ├── PricingPage, NotificationsPage, BookmarksPage
      ├── SearchPage, CompaniesPage, AdminPage
```

---

## Database Schema Overview

| Collection | Key fields | Purpose |
|---|---|---|
| `users` | id, email, mobile, password_hash, name, role, company_id, avatar_url, created_at | Auth + roles |
| `companies` | id, name, owner_id, owner_name, description, location, category, logo_url, cover_url, mobile, whatsapp, email, website, gst, pan, business_type, year_established, address, employees, certifications[], created_at | Business profile |
| `posts` | id, company_id, content, media_url, media_type, category, created_at | Feed posts |
| `reels` | id, company_id, content, video_url, thumbnail_url, created_at | Vertical videos |
| `products` | id, company_id, name, category, image_url, images[], price, moq, description, created_at | Catalog |
| `jobs` | id, company_id, company_name, title, location, type, salary, description, posted, created_at | Vacancies |
| `enquiries` | id, name, mobile, requirement, category, location, company_id?, post_id?, status, created_at | Leads |
| `follows` | id, company_id, user_id, created_at | Follow graph |
| `likes` | id, target_id, target_type (post/reel), user_id, created_at | Engagement |
| `bookmarks` | id, post_id, user_id, created_at | Saved posts |
| `comments` | id, reel_id?/post_id?, user_id, user_name, user_avatar, text, created_at | Threads |
| `notifications` | id, user_id, title, body, read, created_at | In-app |

Indexes: `users.email` unique, `users.mobile` unique, `companies.id`, `posts.created_at`.

All `_id` ObjectId fields are **excluded** from API responses; we use UUID `id` as primary key everywhere.

---

## What's Implemented (live as of Feb 2026)

### MVP (initial sprint)
- JWT auth (email or mobile + password), 3 roles, register flow auto-creates company.
- Home Feed: hero auto-slider, featured companies horizontal carousel, category chips, Jobs/Vacancies horizontal scroll, infinite-scroll feed with like/save/follow/whatsapp/enquiry/comment.
- Reels: vertical scroll-snap, full-screen video, overlay action rail.
- Company Profile (4 tabs: Posts / Products / Reels / About).
- Leads dashboard with status filters New/In-Progress/Closed.
- Products & Jobs pages, Post-Requirement form, Notifications, Bookmarks, Pricing, Profile.
- Top header profile avatar, bottom nav (Home/Reels/Post/Products/Leads).
- WhatsApp click-to-chat everywhere.

### Iteration 4 (this iteration)
- **Cloudinary signed uploads** (auth-protected `/api/cloudinary/signature`, validated folder prefix `iip/`, secure `api_sign_request`).
- Client-side `MediaUploader` component (multi-file, video thumbnail extraction, optimized delivery URL via `f_auto, q_auto`).
- **Expanded Company Profile** with GST, PAN, business type, year established, address, website, employees, certifications, owner name + Google Maps deep-link.
- **Owner-only Edit Profile dialog** with logo + cover banner upload.
- **Owner CRUD**: Add/Edit/Delete Products (multi-photo + MOQ); Create Post (image OR video); Upload Reel (auto thumbnail).
- **Comments on Posts** (already on Reels) with inline thread.
- **Admin Dashboard** at `/admin` with 8 KPI cards + companies list with cascade delete.
- Role-gated UI (owner sees Edit/Add/Delete; buyer sees Follow/Enquiry/WhatsApp/Call only).

### Verified (33/33 backend pytest, 100% frontend critical flows)
All flows tested via testing subagent across 4 iterations.

---

## Future Scaling Roadmap

### Phase 1 — Foundation (next 4 weeks)
- Move 1200-line `server.py` into modules: `auth.py`, `companies.py`, `posts.py`, `reels.py`, `products.py`, `enquiries.py`, `admin.py`, `cloudinary.py`.
- Add MongoDB indexes: `companies.category`, `companies.location`, `posts.company_id`, `enquiries.company_id+status`, `follows.user_id`.
- Rate limiting on `/api/enquiries` (public) via slowapi or fastapi-limiter (Redis).
- Replace Pydantic `ProductCreate` reuse in PATCH with proper `ProductUpdate` (all-Optional).

### Phase 2 — Performance (1–2 months)
- Redis cache for hot queries: featured companies, top reels, jobs feed, public profile pages.
- Cloudinary auto-format/quality already on; add `c_fill,g_auto` for product thumbnails.
- Server-rendered metadata for share previews (Open Graph) using lightweight Next.js or pre-render middleware.
- CDN front (Cloudflare) for static frontend bundle.
- MongoDB Atlas with read replicas; move analytics writes to a queue (RabbitMQ/SQS).

### Phase 3 — Scale (3–6 months)
- Search at scale: MongoDB Atlas Search or Meilisearch/Typesense for instant company/product search.
- Background workers (Celery/Arq) for: enquiry email + WhatsApp Business push, image moderation, video transcoding.
- Sharded MongoDB by `company_id`; archive cold notifications to S3.
- Push notifications via FCM (web + native), with topic subscriptions per category.
- React Native / Expo wrapper sharing the same FastAPI backend.

### Phase 4 — Intelligence (6+ months)
- AI-powered "For You" feed using user follows + engagement signals (Recommendation: Gemini or GPT embeddings on company descriptions + product specs).
- Lead-quality scoring (LLM analyzes enquiry text → tags hot/warm/cold).
- Auto-translate UI (Hindi, Tamil, Bengali) via Google Translate API.
- Voice-to-enquiry (OpenAI Whisper) — buyers speak requirement on WhatsApp; auto-transcribed and routed.

---

## Monetization Plan

### Tier 1 — Subscription Plans (already in UI)
| Plan | Price | Features |
|---|---|---|
| Free | ₹0 | Browse, send enquiries, follow, save |
| **Basic** | **₹999/mo** | Verified profile, unlimited photos, 50 leads/mo, WhatsApp routing, 5 reels/mo |
| **Standard** | **₹2,999/mo** | Featured slot in hero slider, unlimited reels/posts/leads, priority support, lead CSV export, analytics dashboard |
| **Enterprise** (future) | ₹9,999+/mo | Multi-user team logins, API access, white-label embeds, dedicated CSM |

**Implementation**: integrate Razorpay (or Stripe India) recurring subscriptions; gate UI features by `user.plan`.

### Tier 2 — Featured / Boost Ads
- **Hero Slot** (₹5k–₹15k / week): one of three rotating slides on Home.
- **Pinned Reel** (₹2k / 24h): top of `/reels` feed for the day.
- **Boosted Post** (₹500–₹2k): inserted every 5th feed item for 48h.
- **Category Sponsorship** (₹10k–₹25k / month): top-of-category in /products & search results.

### Tier 3 — Lead Marketplace (Indiamart-style)
- Free leads up to plan cap; **₹49 per extra lead** beyond cap.
- **Pay-per-quality-lead** for niche categories (ISO-only / GST-verified buyers): ₹199–₹499.
- Lead pack add-on: 200 leads ₹4,999 (commit pack).

### Tier 4 — Jobs / Vacancies
- ₹499 per job listing for 30 days; ₹2,499 for **Featured Vacancy** with hero spot.
- Resume-database access for Standard tier (limited 100 unlocks/mo) or pay-per-unlock ₹49.

### Tier 5 — Verification & Trust Badges
- **Verified Company** badge: ₹1,999 one-time KYC (GST + PAN + Udyam check).
- **Premium Verified Manufacturer** (annual): ₹4,999 — site visit + audit, gold ribbon, top placement.

### Projected ARPU (year 1, conservative)
- 10,000 free signups → 4% Basic conversion = 400 × ₹999 × 12 = **₹47.95L/yr**
- 800 active manufacturers → 8% Standard = 64 × ₹2,999 × 12 = **₹23.03L/yr**
- Ad revenue (Featured/Boost): ~₹15L/yr
- Lead overage + Job listings: ~₹10L/yr
- **Total Y1 ARR target: ₹95L (≈ $114k)** — easily 4–5× by Y2 with paid acquisition.

---

## Test Credentials
- admin@iip.com / admin123
- rajesh@bharatsteel.com / demo123 (manufacturer, owns Bharat Steel Industries)
- priya@buyer.com / demo123 (buyer)

## Backlog (deferred items)
- Razorpay/Stripe subscription wiring (UI ready; backend hook needed).
- SMS OTP login via MSG91/Twilio.
- Push notifications (FCM web).
- AI feed ranking + chat-based enquiry assistant.
- Lead CSV export endpoint for Standard tier.
- Resume database / "Apply to Job" full flow.
