# Review: Industrial News Feed & Aggregator — Implementation Plan
**Reviewed as:** Senior Engineer + Data Analyst perspective
**Context:** Feature intended for production, commercial B2B platform
**Verdict:** Solid concept and reasonable source research, but **not production-ready as written**. There are legal, architectural, and data-quality gaps that need to be closed before this ships commercially — not after.

---

## 1. Legal / Compliance Risk (highest priority — blocks launch)

This is the biggest gap in the document, and it's not addressed at all.

- **Republishing content commercially is different from personal aggregation.** ET, Business Standard, LiveMint, and Google News RSS feeds are intended for reader consumption or non-commercial syndication in most cases. Scraping their RSS and displaying full titles, images, and snippets on a *commercial B2B platform* (which sells/promotes products) can breach each publisher's Terms of Service, even if the feed itself is "free and unlimited" technically.
- **Google News RSS specifically prohibits systematic scraping for redistribution** in its ToS — "free and unlimited" here just means no API key/paywall, not "licensed for commercial reuse."
- **Image thumbnails** pulled via `<media:content>`/`<enclosure>` are copyrighted assets — hotlinking them on a commercial site carries the same exposure as text.
- **No attribution/linking-format requirements are specified.** Most publishers that tolerate RSS aggregation require specific attribution (publisher name + logo + direct outbound link, no content beyond a short snippet). This needs to be defined per-source, not left implicit.

**Recommendation:** Before writing a line of code, get a legal/compliance sign-off on: (a) which sources can be used, (b) how much content per item (headline only? snippet limit?), (c) whether thumbnails can be shown or need to be replaced by your own generated preview cards, and (d) whether syndication agreements are needed for ET/Business Standard/LiveMint given commercial use. PIB (government) is safe. The commercial news publishers are not automatically safe just because the RSS URL is public.

---

## 2. Architecture Gaps

### 2.1 In-memory TTL cache won't survive production reality
- If the backend runs more than one instance (any real load balancer / autoscaling setup), each instance has its own cache — meaning duplicate fetches, inconsistent data between requests, and cache resets on every deploy.
- **Fix:** Use a shared cache (Redis) or persist fetched articles to a database table, with a scheduled background job (Celery/APScheduler/cron) doing the fetch — not fetch-on-request. The API endpoints should read from the DB/cache, never trigger a live fetch inline.

### 2.2 No persistent storage layer
- Nothing is written to a database. This means:
  - No historical archive of news (can't show "yesterday's top stories" reliably).
  - **"Sort by Popular" is undefined** — popular by what metric? There's no view/click tracking mechanism proposed anywhere in the plan. As written, "Popular" has no data behind it and will either be fake or crash.
  - No way to deduplicate the same story appearing from ET, LiveMint, and Google News simultaneously (very common — same PTI/Reuters wire story picked up by 3+ outlets).
- **Fix:** Add a `news_items` table (title, source, url, image_url, category, published_at, fetched_at, dedup_hash, view_count). Fetch job upserts into this table. API reads from DB with proper pagination (`LIMIT`/`OFFSET` or cursor-based).

### 2.3 Categorization ("Steel & Metals", "Chemicals & Polymers", etc.) is unspecified
- The News Hub page promises sector filters, but nothing in the backend describes how an incoming article gets tagged into a category. This needs one of:
  - Keyword/rule-based classification (simplest, decent accuracy for a v1),
  - A lightweight ML/LLM classification step at ingest time (more accurate, adds cost/latency),
  - Manual curation (doesn't scale).
- This is a core feature, not a detail — it should be its own section in the plan with a chosen approach.

### 2.4 Security: XML parsing
- `xml.etree.ElementTree` is vulnerable to XML External Entity (XXE) and billion-laughs style attacks when parsing external XML. Since RSS feeds are externally controlled input, this matters.
- **Fix:** Use `defusedxml` instead of raw `ElementTree`, or a hardened feed parser like `feedparser` (which also saves you from writing your own RSS/Atom edge-case handling).

### 2.5 No resilience/observability plan for individual feed failures
- The doc mentions a fallback to "mock data" if feeds are unreachable, but that's a blunt instrument. If 1 of 5 sources goes down, you don't want to fall back to mock data for everything — you want graceful degradation (serve the other 4 sources) plus alerting so someone notices a feed broke.
- No mention of timeout/retry/backoff settings for the HTTP fetch layer (`httpx` calls to slow or dead feeds can hang the fetch job).

### 2.6 No rate limiting / abuse protection on your own new public endpoints
- `/api/news`, `/api/news/headlines`, `/api/news/sources` will be public and unauthenticated. Without rate limiting, they're an easy scraping/DoS target, and they proxy (indirectly) your upstream feed quota/goodwill.

---

## 3. Data Quality Issues (Data Analyst lens)

- **Deduplication** across sources isn't mentioned — same-story duplication across ET/LiveMint/Business Standard/Google News will visibly clutter the feed and hurt credibility. Needs a similarity check (title fuzzy-match or hash of normalized title+date) at ingest time.
- **Timezone normalization** — different feeds report `pubDate` in different formats/offsets; if not normalized to a single timezone at ingest, "Latest" sorting will be silently wrong sometimes.
- **No relevance filtering** — Google News "Industrial Search RSS" will return noise (unrelated articles that happen to match a keyword). Needs a relevance/quality filter before items reach users, or the feed will look unmaintained.
- **"Popular" needs a defined, honest metric** before it ships — internal click/view counts (added post-launch, defaults to "Latest" until enough data exists), not something invented for cosmetic reasons.
- **No analytics instrumentation planned.** For a commercial feature like this, you'll want click-through tracking per article/source at minimum, to know if the feature is worth the engineering investment and legal risk. This should be scoped now, not bolted on later.

---

## 4. Frontend / Product Gaps

- No design for **empty/error states** (e.g., all feeds down, zero search results).
- No mention of **image fallback** when a source provides no thumbnail or the hotlinked image 404s later (source deletes/moves it).
- No **loading/skeleton state** for the ticker or grid mentioned.
- No **SEO consideration** for `/news` — if this page is meant to drive organic traffic/credibility, it needs proper meta tags, possibly SSR/prerendering since it's dynamic content.
- No accessibility notes (ticker auto-scroll should pause on hover/focus, and reduced-motion users should get a static list).

---

## 5. Testing Plan Gaps

- Unit tests are mentioned only for the 3 endpoints. Given this is an aggregation pipeline with external dependencies, you also need:
  - Tests for the RSS parsing/dedup logic with fixture XML (including malformed XML, and one deliberately malicious XXE payload to confirm the parser rejects it).
  - Tests for cache/DB fallback behavior when a feed source times out or returns garbage.
  - A load test on `/api/news` given it'll likely be one of the more frequently hit endpoints.

---

## 6. Priority Action Items (in order)

1. **Legal review of source usage and attribution requirements** — this can invalidate the whole plan if certain sources aren't usable commercially, so resolve first.
2. **Redesign caching as: scheduled fetch job → persistent DB store → API reads from DB** (drop the "fetch-on-request + in-memory cache" model).
3. **Define categorization approach** (rules-based is fine for v1, but must be explicit).
4. **Define "Popular" concretely** or ship v1 with only "Latest" sort and add "Popular" once view tracking exists.
5. **Add deduplication logic** across sources at ingest time.
6. **Switch to `defusedxml`/`feedparser`** instead of raw `ElementTree`.
7. **Add rate limiting** to the new public API endpoints.
8. **Add basic analytics instrumentation** (impressions/clicks per article/source) from day one.

---

## Bottom Line
The source research (Section 1 of the original doc) is genuinely good — the RSS comparison matrix is accurate and the hybrid approach is the right call technically. But the plan currently describes a **prototype architecture** (in-memory cache, no DB, no categorization logic, no legal review) being proposed as a **commercial production feature**. Closing the gaps above — particularly the legal review and the move to persistent storage with a background fetch job — should happen before implementation starts, not as follow-up work.
