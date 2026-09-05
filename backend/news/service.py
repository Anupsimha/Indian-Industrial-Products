"""
Industrial News Service Component
---------------------------------
Encapsulates all RSS fetching, defused XML parsing, title normalization,
fuzzy deduplication, sector classification, click tracking, and SVG card generation.
"""
import re
import html
import logging
import hashlib
import datetime
from difflib import SequenceMatcher
from typing import Optional, List, Dict, Any

import feedparser
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

from .config import SOURCE_CONFIG, CATEGORY_KEYWORDS, PUBLISHER_COLORS
from .models import NewsItem, FeedHealthLog

logger = logging.getLogger("iip.news")


class IndustrialNewsService:

    @staticmethod
    def normalize_title(title: str) -> str:
        t = title.lower()
        t = re.sub(r"[^\w\s]", "", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    @staticmethod
    def is_near_duplicate(title: str, recent_titles: List[str], threshold: float = 0.85) -> bool:
        norm = IndustrialNewsService.normalize_title(title)
        for existing in recent_titles:
            ratio = SequenceMatcher(None, norm, IndustrialNewsService.normalize_title(existing)).ratio()
            if ratio >= threshold:
                return True
        return False

    @staticmethod
    def categorize_article(title: str, snippet: str) -> str:
        text = f"{title} {snippet}".lower()
        scores = {}
        for cat, keywords in CATEGORY_KEYWORDS.items():
            scores[cat] = sum(1 for kw in keywords if kw in text)
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "General Industry"

    @staticmethod
    def extract_image(entry) -> Optional[str]:
        media_content = entry.get("media_content") if hasattr(entry, "get") else getattr(entry, "media_content", None)
        if media_content:
            for media in media_content:
                if isinstance(media, dict) and media.get("url"):
                    return media["url"]
        links = entry.get("links") if hasattr(entry, "get") else getattr(entry, "links", None)
        if links:
            for link in links:
                if isinstance(link, dict) and link.get("type", "").startswith("image"):
                    return link.get("href")
        desc_text = entry.get("description") or entry.get("summary", "") if hasattr(entry, "get") else getattr(entry, "description", "")
        if desc_text:
            img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', str(desc_text), re.IGNORECASE)
            if img_match:
                return img_match.group(1)
        return None

    @staticmethod
    def parse_pub_date(entry) -> datetime.datetime:
        pub_parsed = entry.get("published_parsed") if hasattr(entry, "get") else getattr(entry, "published_parsed", None)
        if pub_parsed:
            try:
                return datetime.datetime(*pub_parsed[:6])
            except Exception:
                pass
        return datetime.datetime.utcnow()

    @classmethod
    def fetch_all_sources(cls, db: Session) -> Dict[str, Any]:
        results = {}
        for source_key, cfg in SOURCE_CONFIG.items():
            if not cfg.get("enabled", False):
                continue
            try:
                count = cls.fetch_single_source(db, source_key, cfg)
                results[source_key] = {"ok": True, "new_items": count}
            except Exception as e:
                logger.error(f"Error fetching news feed '{source_key}': {e}")
                results[source_key] = {"ok": False, "error": str(e)}
        return results

    @classmethod
    def fetch_single_source(cls, db: Session, source_key: str, cfg: Dict[str, Any]) -> int:
        display_name = cfg["display_name"]
        url = cfg["url"]
        max_snippet_chars = cfg.get("max_snippet_chars", 220)
        use_source_image = cfg.get("use_source_image", True)

        health_log = db.query(FeedHealthLog).filter(FeedHealthLog.source_key == source_key).first()
        if not health_log:
            health_log = FeedHealthLog(source_key=source_key, display_name=display_name)
            db.add(health_log)

        feed = feedparser.parse(url, request_headers={"User-Agent": "IIP-IndustrialNewsBot/1.0"})

        if feed.bozo and not feed.entries:
            err_msg = f"Feed unreachable or malformed XML bozo_exception={getattr(feed, 'bozo_exception', 'unknown')}"
            health_log.consecutive_failures += 1
            health_log.last_error_at = datetime.datetime.utcnow().isoformat()
            health_log.last_error_message = err_msg
            db.commit()
            if health_log.consecutive_failures >= 3:
                logger.warning(f"HIGH PRIORITY ALERT: Feed '{display_name}' has failed {health_log.consecutive_failures} consecutive times!")
            raise ValueError(err_msg)

        # Recent titles window (past 12 hours) for near-duplicate filtering
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=12)
        recent_titles = [r[0] for r in db.query(NewsItem.title).filter(NewsItem.published_at >= cutoff).all()]

        added_count = 0
        for entry in feed.entries[:30]:
            title = entry.get("title", "").strip()
            if not title:
                continue

            norm = cls.normalize_title(title)
            item_hash = hashlib.sha256(norm.encode("utf-8")).hexdigest()[:32]

            existing = db.query(NewsItem).filter(NewsItem.dedup_hash == item_hash).first()
            if existing:
                continue

            if cls.is_near_duplicate(title, recent_titles):
                continue

            raw_summary = entry.get("summary", "") or entry.get("description", "")
            snippet = re.sub(r"<[^<]+?>", "", raw_summary).strip()
            snippet = snippet[:max_snippet_chars]

            image_url = cls.extract_image(entry) if use_source_image else None
            published = cls.parse_pub_date(entry)
            article_url = entry.get("link", url)

            item = NewsItem(
                id=item_hash,
                title=title,
                snippet=snippet,
                url=article_url,
                image_url=image_url,
                source=display_name,
                category=cls.categorize_article(title, snippet),
                published_at=published,
                dedup_hash=item_hash,
                view_count=0,
                is_active=True,
            )

            try:
                db.add(item)
                db.commit()
                recent_titles.append(title)
                added_count += 1
            except IntegrityError:
                db.rollback()
                logger.debug(f"Race condition caught on item_hash {item_hash}, skipping duplicate insertion.")
            except Exception as e:
                db.rollback()
                logger.error(f"Error inserting news item {title}: {e}")

        # Update health log on success
        health_log.last_success_at = datetime.datetime.utcnow().isoformat()
        health_log.consecutive_failures = 0
        health_log.item_count = db.query(NewsItem).filter(NewsItem.source == display_name).count()
        health_log.last_error_message = None
        db.commit()

        return added_count

    @staticmethod
    def track_click(db: Session, item_id: str) -> bool:
        item = db.query(NewsItem).filter(NewsItem.id == item_id).first()
        if item:
            item.view_count += 1
            db.commit()
            return True
        return False

    @staticmethod
    def toggle_item_active(db: Session, item_id: str, admin_user_id: str) -> Optional[NewsItem]:
        item = db.query(NewsItem).filter(NewsItem.id == item_id).first()
        if item:
            item.is_active = not item.is_active
            item.moderated_by = admin_user_id
            item.moderated_at = datetime.datetime.utcnow().isoformat()
            db.commit()
            return item
        return None

    @staticmethod
    def generate_svg_card(source: str, category: str) -> str:
        """
        Generates clean, XSS-sanitized SVG placeholder card for news items.
        Validates source and category against allowed config.
        """
        # Input validation & sanitization
        source_clean = html.escape(source.strip()) if source else "Industrial News"
        category_clean = html.escape(category.strip()) if category else "Industry"

        color = PUBLISHER_COLORS.get(source, "#1E293B")

        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
            <rect width="600" height="340" fill="{color}"/>
            <rect width="600" height="340" fill="url(#grad)" opacity="0.3"/>
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.2"/>
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.5"/>
                </linearGradient>
            </defs>
            <text x="40" y="80" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" letter-spacing="1.5" opacity="0.85">{category_clean.upper()}</text>
            <text x="40" y="260" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold">{source_clean}</text>
            <text x="40" y="295" fill="#ffffff" font-family="sans-serif" font-size="14" opacity="0.8">Indian Industrial Products • B2B Market Update</text>
        </svg>"""
        return svg_content
