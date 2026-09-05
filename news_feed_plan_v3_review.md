# Review: News Aggregator Plan v3

**Verdict:** This is close to shippable. 7 of the 9 prior items are cleanly resolved. One item (#1, scheduler race) is only *partially* resolved — correctness is fixed, but an efficiency/ops concern remains unaddressed. One new risk was introduced by the migration approach. A few smaller items are worth tightening before launch.

---

## Confirmed Resolved ✅

| Item | v3 fix | Assessment |
|---|---|---|
| #2 DB engine | Postgres + `asyncpg`, indexed columns | Correct call, matches production concurrency needs |
| #4 Admin kill-switch | `PATCH /toggle-active` + UI control | Resolved — confirm it sits behind the platform's existing admin auth, not a new bespoke check |
| #5 Google News legal risk | Disabled by default, flagged in comments | Resolved |
| #6 SVG XSS | `html.escape` on inputs | Mostly resolved — see note below on going further |
| #7 Rate limiting | `slowapi`, 60/min | Resolved |
| #8 Configurable interval + offline tests | Env var + mocked `feedparser.parse` | Resolved |

---

## #1 Scheduler Race — Correctness fixed, efficiency/ops gap remains

The DB unique constraint + `IntegrityError` catch means you will **not get duplicate rows** if two instances fetch the same story simultaneously — that part is genuinely solved.

What it doesn't solve: if this runs on N instances and each has its own `APScheduler` inside the app process, **all N instances still independently hit every RSS source every interval.** That's N× the load on the publishers' servers for no benefit, and it's exactly the kind of pattern that gets an aggregator's IP rate-limited or blocked by a publisher — which would be a self-inflicted outage of the whole feature.

The `BACKGROUND_SCHEDULER_ENABLED` env flag is the right *mechanism* to solve this (set `true` on exactly one instance/pod, `false` everywhere else), but the plan doesn't say that's the intended usage — as written it reads like a generic on/off switch, not "the one instance flag." **Recommendation:** state explicitly in the deployment notes that this flag must be `true` on exactly one instance in any multi-instance deployment (e.g., a dedicated worker/cron dyno, not a web replica), or better, replace the flag with a lightweight leader-election check (a Redis `SETNX` lock with a TTL) so this is enforced automatically rather than relying on someone remembering the deployment rule six months from now.

---

## New Issue: Startup DDL migrations

> "Added startup PostgreSQL DDL migration scripts in `server.py`"

This is a step backward and reintroduces the *same class of problem* as the scheduler race, but for schema changes instead of data:

- If the app runs multiple instances/replicas, **every instance runs the DDL migration on startup**, independently and concurrently. Concurrent `CREATE TABLE`/`ALTER TABLE` statements against Postgres during a rolling deploy is a well-known source of migration deadlocks and failed deploys.
- There's no versioning/rollback story — "run DDL at startup" doesn't tell you what happened last time, what's pending, or how to undo a bad change.

**Fix:** Use a real migration tool (Alembic, since this is already SQLAlchemy) and run migrations as a **separate, single-run deploy step** (a release-phase command, CI job, or one-off `alembic upgrade head` before the new app version starts serving traffic) — not inline in `server.py`'s startup event. This is a small change in practice (a few hours) but matters a lot operationally.

---

## Smaller Items Worth Tightening

### SVG card endpoint: escape is good, allowlist is better
`html.escape` prevents injection, but `source`/`category` should also be validated against the known keys in `SOURCE_CONFIG`/`CATEGORY_KEYWORDS` before rendering — otherwise someone can still pass an arbitrary (escaped, so non-executing, but still attacker-controlled) string as the label on a branded-looking card. Reject/default-to-generic for unrecognized values rather than rendering whatever was passed.

Also: set `Content-Type: image/svg+xml` explicitly and add a `Cache-Control` header (these are deterministic, low-cardinality outputs — a day-long cache is safe and cuts backend load significantly since this loads as an `<img src>` on every card render).

### Feed health is visible, but not yet actionable
`GET /api/news/admin/health` gives you a dashboard, but that only helps if someone checks it. Given a source can go silently stale for days otherwise, add a simple threshold alert (e.g., N consecutive failures triggers a Slack/email notification) on top of the log table — the table itself is 90% of the work, the alert hook is small additional effort.

### No audit trail on moderation actions
`toggle_item_active` hides/restores content on a commercial site — worth logging *who* did it and *when* (even just `moderated_by`, `moderated_at` columns on `NewsItem`), so there's accountability if a legitimate story gets hidden by mistake or a policy question comes up later.

---

## Priority Before Launch
1. **Move DDL migrations out of `server.py` startup and into Alembic as a separate deploy step** — this is the one item that could actually cause a failed/flaky production deploy if left as-is.
2. **Document (or better, automate) that only one instance runs the scheduler** in multi-instance deployments.
3. SVG allowlist + cache headers, feed-health alerting, and moderation audit fields are all worth doing but are polish, not blockers — fine to land in a fast follow-up if timeline is tight.

Everything else in this plan is genuinely production-ready as described.
