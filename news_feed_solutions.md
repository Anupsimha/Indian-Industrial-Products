# Industrial News Feed — Solutions & Reference Implementation
Companion to `news_feed_plan_review.md`. Each section: the problem, the fix, and working code you can drop into the existing FastAPI backend.

Stack assumed (matches the original plan): FastAPI backend, React frontend, Python 3.11+.

---

## 1. Legal / Compliance — Practical Fix (not just "get a lawyer")

You can't code your way out of licensing risk, but you *can* engineer the system to minimize exposure while you sort out agreements:

- **Headline + short snippet only** (hard cap at ~200 characters), never full article body — this is the standard "fair dealing" pattern most aggregators (Google News, Feedly) rely on.
- **Always deep-link to the source**, never mirror content on your own page.
- **Don't rehost images.** Hotlink the original `image_url` directly (`<img src="{source_image_url}">`), or better, generate your own neutral preview card (publisher logo + category icon) instead of using their photo. This sidesteps image-copyright exposure entirely and is easy to build:

```python
# backend/news/preview.py
PUBLISHER_COLORS = {
    "Economic Times": "#0F52BA",
    "LiveMint": "#E01E37",
    "Business Standard": "#1B4332",
    "PIB India": "#D4A017",
}

def generate_fallback_card(source: str, category: str) -> str:
    """Returns a URL to a server-generated SVG/PNG placeholder card
    when we choose not to hotlink the publisher's image, or it's missing/broken."""
    color = PUBLISHER_COLORS.get(source, "#444444")
    return f"/api/news/card?source={source}&category={category}&color={color.lstrip('#')}"
```
Render this as a simple SVG endpoint (title + publisher name on a colored background) — zero copyright exposure, consistent visual design.

- **Config-driven source allowlist** so legal can toggle sources without a code deploy:

```python
# backend/news/sources_config.py
SOURCE_CONFIG = {
    "et_manufacturing": {
        "enabled": True,
        "display_name": "Economic Times",
        "url": "https://economictimes.indiatimes.com/industry/rssfeeds/13358071.cms",
        "max_snippet_chars": 200,
        "use_source_image": True,   # flip to False if legal says no
    },
    "pib_commerce": {
        "enabled": True,
        "display_name": "PIB India",
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "max_snippet_chars": 300,
        "use_source_image": True,
    },
    # ... others, each independently toggleable
}
```
This turns "legal says drop Google News" into a one-line config change, not a re-architecture.

---

## 2. Caching & Storage — Replace in-memory cache with DB + scheduled job

### 2.1 Database schema (SQLAlchemy, works with SQLite/Postgres)

```python
# backend/news/models.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Index
from sqlalchemy.orm import declarative_base
import datetime

Base = declarative_base()

class NewsItem(Base):
    __tablename__ = "news_items"

    id = Column(String, primary_key=True)          # hash-based id, see dedup section
    title = Column(String, nullable=False)
    snippet = Column(String)
    url = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    source = Column(String, nullable=False, index=True)      # "Economic Times"
    category = Column(String, nullable=False, index=True)    # "Steel & Metals"
    published_at = Column(DateTime, nullable=False, index=True)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
    dedup_hash = Column(String, index=True)         # normalized title hash
    view_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)       # soft-hide bad/broken items

    __table_args__ = (
        Index("ix_news_category_published", "category", "published_at"),
    )
```

### 2.2 Scheduled fetch job (runs every 20 min, independent of request traffic)

```python
# backend/news/fetch_job.py
import feedparser          # pip install feedparser  -- handles RSS/Atom edge cases + is safe against XXE
import hashlib
import re
import datetime
from sqlalchemy.orm import Session
from .models import NewsItem
from .sources_config import SOURCE_CONFIG
from .categorize import categorize_article
from .dedup import normalize_title

def fetch_all_sources(db: Session):
    for source_key, cfg in SOURCE_CONFIG.items():
        if not cfg["enabled"]:
            continue
        try:
            fetch_single_source(db, source_key, cfg)
        except Exception as e:
            # Never let one dead feed kill the whole job
            log_feed_failure(source_key, e)
            continue

def fetch_single_source(db: Session, source_key: str, cfg: dict):
    feed = feedparser.parse(cfg["url"], request_headers={"User-Agent": "IIP-NewsBot/1.0"})

    if feed.bozo and not feed.entries:
        # bozo=True with no entries usually means the feed was unreachable or malformed
        raise ValueError(f"Feed {source_key} unreachable or malformed")

    for entry in feed.entries[:30]:
        title = entry.get("title", "").strip()
        if not title:
            continue

        norm = normalize_title(title)
        item_hash = hashlib.sha256(norm.encode()).hexdigest()[:24]

        existing = db.query(NewsItem).filter(NewsItem.dedup_hash == item_hash).first()
        if existing:
            continue  # already have this story (possibly from another source) — see dedup.py for cross-source merge logic

        snippet = re.sub("<[^<]+?>", "", entry.get("summary", ""))[: cfg["max_snippet_chars"]]
        image_url = extract_image(entry) if cfg["use_source_image"] else None
        published = parse_pub_date(entry)

        item = NewsItem(
            id=item_hash,
            title=title,
            snippet=snippet,
            url=entry.get("link"),
            image_url=image_url,
            source=cfg["display_name"],
            category=categorize_article(title, snippet),
            published_at=published,
            dedup_hash=item_hash,
        )
        db.add(item)
    db.commit()

def extract_image(entry) -> str | None:
    if "media_content" in entry and entry.media_content:
        return entry.media_content[0].get("url")
    if "links" in entry:
        for link in entry.links:
            if link.get("type", "").startswith("image"):
                return link.get("href")
    return None

def parse_pub_date(entry) -> datetime.datetime:
    if entry.get("published_parsed"):
        return datetime.datetime(*entry.published_parsed[:6])  # feedparser normalizes to UTC struct_time
    return datetime.datetime.utcnow()

def log_feed_failure(source_key: str, error: Exception):
    # Replace with real logging/alerting (Sentry, Slack webhook, etc.)
    print(f"[news-feed] FAILED source={source_key} error={error}")
```

**Why `feedparser` instead of `xml.etree.ElementTree`:** it's the de facto standard RSS/Atom library, handles malformed feeds gracefully, normalizes dates/encodings across formats, and — critically — is not vulnerable to the XXE issue raw `ElementTree` has when parsing untrusted external XML.

### 2.3 Wiring the scheduler (APScheduler — no extra infra needed for a single-instance deploy; use Celery beat if you scale to multiple workers)

```python
# backend/news/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from .fetch_job import fetch_all_sources
from .db import SessionLocal

def start_news_scheduler():
    scheduler = BackgroundScheduler()

    def job():
        db = SessionLocal()
        try:
            fetch_all_sources(db)
        finally:
            db.close()

    scheduler.add_job(job, "interval", minutes=20, next_run_time=None)  # runs on schedule; call job() once manually at startup too
    scheduler.start()
    return scheduler
```

```python
# backend/server.py  (addition to existing FastAPI app)
from news.scheduler import start_news_scheduler

@app.on_event("startup")
def startup_event():
    start_news_scheduler()
```

### 2.4 API endpoints now read from DB, never fetch live

```python
# backend/news/routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .db import get_db
from .models import NewsItem

router = APIRouter(prefix="/api/news")

@router.get("/headlines")
def get_headlines(db: Session = Depends(get_db)):
    items = (
        db.query(NewsItem)
        .filter(NewsItem.is_active == True)
        .order_by(desc(NewsItem.published_at))
        .limit(10)
        .all()
    )
    return [serialize(i) for i in items]

@router.get("")
def get_news(
    q: str = None,
    category: str = None,
    source: str = None,
    sort: str = "latest",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(NewsItem).filter(NewsItem.is_active == True)

    if q:
        query = query.filter(NewsItem.title.ilike(f"%{q}%"))
    if category and category != "All":
        query = query.filter(NewsItem.category == category)
    if source:
        query = query.filter(NewsItem.source == source)

    if sort == "popular":
        query = query.order_by(desc(NewsItem.view_count), desc(NewsItem.published_at))
    else:
        query = query.order_by(desc(NewsItem.published_at))

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [serialize(i) for i in items],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }

def serialize(item: NewsItem) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "snippet": item.snippet,
        "url": item.url,
        "image_url": item.image_url,
        "source": item.source,
        "category": item.category,
        "published_at": item.published_at.isoformat(),
    }
```

This fixes the multi-instance cache problem too: every backend instance reads the same DB, so horizontal scaling just works with no code change.

---

## 3. Deduplication — cross-source, working now

The fetch job above already dedupes by exact normalized-title hash. To also catch near-duplicates (same story, slightly different headline across ET vs LiveMint), add a fuzzy check before insert:

```python
# backend/news/dedup.py
import re
from difflib import SequenceMatcher

def normalize_title(title: str) -> str:
    t = title.lower()
    t = re.sub(r"[^\w\s]", "", t)           # strip punctuation
    t = re.sub(r"\s+", " ", t).strip()
    return t

def is_near_duplicate(title: str, recent_titles: list[str], threshold: float = 0.85) -> bool:
    """Check the last N titles (e.g. from the past 6 hours) for a fuzzy match."""
    norm = normalize_title(title)
    for existing in recent_titles:
        ratio = SequenceMatcher(None, norm, normalize_title(existing)).ratio()
        if ratio >= threshold:
            return True
    return False
```

Use it in `fetch_single_source` before inserting:

```python
recent_titles = [r.title for r in db.query(NewsItem.title)
                  .filter(NewsItem.published_at >= datetime.datetime.utcnow() - datetime.timedelta(hours=12))]
if is_near_duplicate(title, recent_titles):
    continue
```

This is O(n) per new item against a 12-hour window, which is small (dozens of items) — fine without needing a vector DB or anything heavier for v1.

---

## 4. Categorization — working rule-based classifier (upgradeable later)

Good enough for v1, transparent, and free (no ML inference cost/latency):

```python
# backend/news/categorize.py
CATEGORY_KEYWORDS = {
    "Steel & Metals": ["steel", "iron ore", "aluminium", "aluminum", "copper", "metal", "smelting", "sail", "tata steel", "jsw"],
    "Machinery & Tools": ["machinery", "machine tool", "cnc", "manufacturing equipment", "capital goods", "automation"],
    "Chemicals & Polymers": ["chemical", "petrochemical", "polymer", "plastics", "fertilizer", "specialty chemical"],
    "Electricals & Electronics": ["electrical", "electronics", "semiconductor", "chip", "power equipment", "transformer"],
    "Logistics & B2B Trade": ["logistics", "supply chain", "freight", "export", "import", "trade deficit", "shipping", "warehousing"],
    "Govt Policies": ["pli scheme", "gst", "policy", "ministry", "budget", "tariff", "subsidy", "notification"],
}

def categorize_article(title: str, snippet: str) -> str:
    text = f"{title} {snippet}".lower()
    scores = {cat: sum(1 for kw in kws if kw in text) for cat, kws in CATEGORY_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "General Industry"
```

**Upgrade path (v2, if keyword accuracy proves insufficient):** swap `categorize_article` for a single LLM call per batch (classify 20 headlines at once in one prompt, cache the result) — same function signature, no changes needed elsewhere. Don't build this until you've measured that keyword matching is actually wrong often enough to justify the added cost/latency.

---

## 5. "Popular" sort — make it real, not fake

Add a lightweight click-tracking endpoint the frontend calls when a user clicks through to a story:

```python
# backend/news/routes.py (addition)
@router.post("/{item_id}/click")
def track_click(item_id: str, db: Session = Depends(get_db)):
    item = db.query(NewsItem).filter(NewsItem.id == item_id).first()
    if item:
        item.view_count += 1
        db.commit()
    return {"ok": True}
```

```jsx
// frontend: call this on click, then navigate
const handleArticleClick = async (item) => {
  fetch(`/api/news/${item.id}/click`, { method: "POST" }); // fire-and-forget, don't block navigation
  window.open(item.url, "_blank");
};
```

**Cold-start fix:** for the first ~48 hours after launch, "Popular" will just look like "Latest" because view counts are all near zero — that's honest and fine. Don't fabricate scores to make the tab look populated on day one.

---

## 6. Security — XXE, already fixed above by using `feedparser`

If you must keep raw XML parsing anywhere (e.g., a custom source that isn't standard RSS), use `defusedxml` as a drop-in replacement:

```python
# Instead of:
# import xml.etree.ElementTree as ET
from defusedxml.ElementTree import parse  # pip install defusedxml
tree = parse(untrusted_xml_source)
```
This disables external entity resolution by default, closing the XXE hole with a one-line import change.

---

## 7. Rate limiting on your new public endpoints

```python
# backend/server.py
from slowapi import Limiter                 # pip install slowapi
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# then per-route:
@router.get("/headlines")
@limiter.limit("60/minute")
def get_headlines(request: Request, db: Session = Depends(get_db)):
    ...
```
60/min per IP is generous for real users, but stops naive scraping scripts from hammering the endpoint.

---

## 8. Frontend: image fallback + empty/error states

```jsx
// components/NewsCard.jsx
function NewsCard({ item }) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = !imgError && item.image_url ? item.image_url : `/api/news/card?source=${item.source}&category=${item.category}`;

  return (
    <div className="news-card">
      <img src={imageSrc} alt={item.title} onError={() => setImgError(true)} loading="lazy" />
      <span className="publisher-badge">{item.source}</span>
      <h3>{item.title}</h3>
      <p>{item.snippet}</p>
    </div>
  );
}
```

```jsx
// pages/NewsPage.jsx (relevant slice)
{loading && <NewsGridSkeleton />}
{!loading && items.length === 0 && (
  <EmptyState message="No news found for this filter. Try a different category or search term." />
)}
{!loading && fetchFailed && (
  <EmptyState message="News feed is temporarily unavailable. Please check back shortly." />
)}
```

Ticker auto-scroll should also respect reduced-motion and pause on hover:
```css
.ticker { animation: scroll 40s linear infinite; }
.ticker:hover { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .ticker { animation: none; overflow-x: auto; }
}
```

---

## 9. Monitoring — minimal but real

```python
# backend/news/fetch_job.py (extend log_feed_failure)
def log_feed_failure(source_key: str, error: Exception):
    print(f"[news-feed] FAILED source={source_key} error={error}")
    # send_slack_alert(f"News feed source '{source_key}' failed: {error}")  # wire to your existing alerting channel
```
Track per-source success/failure counts in a small `feed_health` table or a Prometheus counter if you already have metrics infra — either is a couple hours of work and means you find out about a dead feed from a dashboard, not from a user complaint.

---

## Summary: what changes vs. the original plan

| Original Plan | Fixed Version |
|---|---|
| Fetch-on-request + in-memory cache | Scheduled job (APScheduler) writes to DB; API reads DB only |
| `xml.etree.ElementTree` | `feedparser` (XXE-safe, handles malformed feeds) |
| No dedup | Hash + fuzzy-match dedup at ingest |
| No categorization logic | Keyword-rule classifier, upgradeable to LLM later |
| "Popular" sort with no data behind it | Real click-tracking endpoint, honest cold-start behavior |
| No rate limiting | `slowapi` limiter on public endpoints |
| Hotlinked publisher images only | Optional server-generated fallback cards, per-source toggle |
| No legal controls | Config-driven source allowlist + snippet length caps |
| No monitoring | Per-source failure logging/alerting hook |

None of this requires new infrastructure beyond a database (which the platform almost certainly already has) and two small Python packages (`feedparser`, `slowapi`, `apscheduler` — all lightweight, no external services required for a first version). Redis for cross-instance caching can be added later if you outgrow a single backend instance; it's not a blocker for launch.
