# Review: News Aggregator Plan v2

**Verdict:** Significant improvement over v1 — the architecture is now sound in principle (DB-backed, modular, dedup/categorization/click-tracking all present). A few concrete gaps remain before this is safe to ship, and one new risk was introduced by the scheduler design itself.

---

## What's Fixed ✅

| Issue from v1 review | Status in v2 |
|---|---|
| In-memory cache, no persistence | ✅ `NewsItem` DB model, service reads/writes DB |
| `xml.etree.ElementTree` XXE risk | ✅ `feedparser` specified |
| No dedup | ✅ Hash + fuzzy match, 12h window |
| No categorization logic | ✅ Keyword-based classifier in config |
| Fake/undefined "Popular" sort | ✅ Click-tracking endpoint feeds real `view_count` |
| Hotlinked images only | ✅ SVG fallback card endpoint |
| No legal controls | ✅ Config-driven allowlist + snippet cap |
| Bloated `server.py` | ✅ Cleanly separated into `backend/news/` package |

This is a well-organized plan and the module boundaries (`config` / `models` / `service` / `scheduler` / `routes`) are sensible and easy to test in isolation.

---

## Remaining Gaps

### 1. New risk: multiple app instances = duplicate/racing fetch jobs
This wasn't a problem in v1 (no DB, no scheduler), but it is now. `scheduler.py` starts an `APScheduler` instance **inside the FastAPI process**. If this app ever runs with more than one worker/instance (Gunicorn with multiple workers, or horizontal scaling), **every instance runs its own scheduler independently** — meaning the same feeds get fetched N times every 20 minutes, and concurrent transactions can race to insert the same `dedup_hash`.
- **Fix:** either (a) run the fetch job as a separate single process (a dedicated worker/cron, not inside the web app), or (b) add a DB-level unique constraint on `dedup_hash` with an upsert (`INSERT ... ON CONFLICT DO NOTHING`) so races fail safely instead of duplicating, or (c) use a distributed lock (e.g., Redis `SETNX`) so only one instance's scheduler actually runs the job. Pick (a) or (b) — they're simpler than (c) for this scale.

### 2. Database choice isn't specified
The plan says "Database Table: news_items" but not which database. If this ends up on SQLite (common default for a project this size), concurrent writes from the scheduler while read traffic hits the API can cause `database is locked` errors under load. Should explicitly commit to Postgres (or whatever the rest of the platform already uses) for this table, given it has concurrent writer + high-frequency reader access.

### 3. No monitoring/alerting carried through from the solutions doc
`service.py`'s `fetch_all_sources` is described as handling exceptions "gracefully," but there's no mention of *where those failures go*. Silent per-source failures mean a feed can be broken for weeks and nobody notices — the ticker just quietly shows stale/thin content. Add a `feed_health` log table or wire failures to existing alerting (Slack/Sentry) — a few hours of work, shouldn't be dropped.

### 4. No admin/curation path
`is_active` exists on the model (good — means bad items *can* be hidden), but there's no route or UI to actually set it. If a categorizer mistake or an inappropriate scraped headline shows up on a commercial B2B homepage, someone needs a way to pull it down in under a minute, not by editing the database directly. A minimal `PATCH /api/news/{id}` (admin-only, auth-gated) to toggle `is_active` should be in this plan.

### 5. Google News Industrial Engine is still in the source list
Carried over from v1 without resolution. This is worth calling out by name in `config.py`'s documentation/comments as "pending legal review — Google News RSS terms restrict systematic redistribution" so it isn't accidentally treated as pre-cleared just because it's in the same list as PIB/ET.

### 6. `/api/news/card` (SVG generation) needs input sanitization
It takes `source` and `category` as query params and presumably interpolates them into SVG/text output. Since these ultimately trace back to scraped, external content (source names could theoretically be manipulated if that logic ever changes), sanitize/allowlist these values rather than interpolating raw query params into markup — cheap insurance against SVG/XSS injection.

### 7. Rate limiting and DB-outage fallback are only mentioned in the test plan
"Rate limiting and DB fallback behavior" appears as a test bullet, but there's no corresponding implementation bullet in `routes.py`'s description. Testing a behavior that isn't specified as being built is a gap — confirm `slowapi` (or equivalent) is actually added to `routes.py`, and decide what the API returns if the DB itself is briefly unreachable (cached last-known-good response vs. a clean 503 — either is fine, but pick one).

### 8. Scheduler interval is presumably hardcoded
20 minutes is reasonable, but hardcoding it makes local dev/CI awkward (you don't want tests hitting live RSS feeds every 20 minutes, or at all). Pull the interval from an env var, and make sure the test suite mocks `feedparser.parse` with fixture feeds rather than hitting the real network — this should be explicit in the "Automated Unit & API Testing" section, not implied.

### 9. Migrations
No mention of how the `news_items` table gets created/evolved (Alembic or equivalent). Minor, but worth a line so schema changes don't become ad-hoc `ALTER TABLE`s in production later.

---

## Priority Before Build
1. Resolve the multi-instance scheduler race (#1) — this is the one structural issue, everything else is additive polish.
2. Commit to Postgres (or confirm existing DB) for `news_items` (#2).
3. Add the admin hide/unhide path (#4) — this is a launch-blocker for a commercial site, not a nice-to-have; you need a kill switch for a bad headline.
4. Explicitly flag Google News in `config.py` as legal-pending (#5).

Everything else (#3, #6–#9) is real but can reasonably be tightened during implementation rather than the plan.
