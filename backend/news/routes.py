"""
FastAPI Router for Industrial News Aggregator
---------------------------------------------
Exposes clean, rate-limited public and admin API endpoints.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.responses import Response as RawResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_

from slowapi import Limiter
from slowapi.util import get_remote_address

# Lazy dependency imports to prevent circular import with server.py
async def _get_db():
    from server import get_db
    async for session in get_db():
        yield session


async def _get_current_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


from .models import NewsItem, FeedHealthLog
from .service import IndustrialNewsService
from .config import SOURCE_CONFIG, CATEGORY_KEYWORDS

limiter = Limiter(key_func=get_remote_address)
news_router = APIRouter(prefix="/api/news", tags=["news"])


def serialize_news_item(item: NewsItem) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "snippet": item.snippet,
        "url": item.url,
        "image_url": item.image_url,
        "source": item.source,
        "category": item.category,
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "view_count": item.view_count,
        "is_active": item.is_active,
        "moderated_by": item.moderated_by,
        "moderated_at": item.moderated_at,
    }


@news_router.get("/headlines")
@limiter.limit("60/minute")
async def get_headlines(
    request: Request,
    db: AsyncSession = Depends(_get_db)
):
    try:
        stmt = (
            select(NewsItem)
            .where(NewsItem.is_active == True)
            .order_by(desc(NewsItem.published_at))
            .limit(10)
        )
        items = (await db.execute(stmt)).scalars().all()
        return [serialize_news_item(i) for i in items]
    except Exception as e:
        return []


@news_router.get("")
@limiter.limit("60/minute")
async def get_news(
    request: Request,
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    sort: Optional[str] = Query("latest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db)
):
    try:
        filters = [NewsItem.is_active == True]

        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            filters.append(or_(func.lower(NewsItem.title).like(term), func.lower(NewsItem.snippet).like(term)))

        if category and category != "All":
            filters.append(NewsItem.category == category)

        if source and source != "All":
            filters.append(NewsItem.source == source)

        stmt = select(NewsItem).where(and_(*filters))

        if sort == "popular":
            stmt = stmt.order_by(desc(NewsItem.view_count), desc(NewsItem.published_at))
        else:
            stmt = stmt.order_by(desc(NewsItem.published_at))

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)
        items = (await db.execute(stmt)).scalars().all()

        return {
            "items": [serialize_news_item(i) for i in items],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as e:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "pages": 0,
            "error": "Failed to fetch news feed"
        }


@news_router.get("/sources")
@limiter.limit("60/minute")
async def get_news_sources(
    request: Request,
    db: AsyncSession = Depends(_get_db)
):
    sources = [
        {"key": k, "display_name": v["display_name"], "enabled": v["enabled"]}
        for k, v in SOURCE_CONFIG.items()
    ]
    return {
        "ok": True,
        "sources": sources,
        "categories": ["All"] + list(CATEGORY_KEYWORDS.keys())
    }


@news_router.post("/{item_id}/click")
@limiter.limit("120/minute")
async def track_article_click(
    request: Request,
    item_id: str,
    db: AsyncSession = Depends(_get_db)
):
    stmt = select(NewsItem).where(NewsItem.id == item_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item:
        item.view_count += 1
        await db.commit()
        return {"ok": True, "view_count": item.view_count}
    raise HTTPException(status_code=404, detail="News item not found")


@news_router.patch("/{item_id}/toggle-active")
async def toggle_item_active(
    item_id: str,
    user: dict = Depends(_get_current_user),
    db: AsyncSession = Depends(_get_db)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")

    stmt = select(NewsItem).where(NewsItem.id == item_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")

    item.is_active = not item.is_active
    item.moderated_by = user["id"]
    item.moderated_at = func.now()
    await db.commit()

    return {"ok": True, "item": serialize_news_item(item)}


@news_router.get("/admin/health")
async def get_feed_health(
    user: dict = Depends(_get_current_user),
    db: AsyncSession = Depends(_get_db)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")

    stmt = select(FeedHealthLog)
    logs = (await db.execute(stmt)).scalars().all()
    return {
        "ok": True,
        "health": [
            {
                "source_key": l.source_key,
                "display_name": l.display_name,
                "last_success_at": l.last_success_at,
                "last_error_at": l.last_error_at,
                "consecutive_failures": l.consecutive_failures,
                "item_count": l.item_count,
                "last_error_message": l.last_error_message,
            }
            for l in logs
        ]
    }


@news_router.post("/admin/fetch-now")
async def trigger_news_fetch_now(
    db: AsyncSession = Depends(_get_db)
):
    def _sync_fetch(sync_session):
        return IndustrialNewsService.fetch_all_sources(sync_session)

    results = await db.run_sync(_sync_fetch)
    await db.commit()
    return {"ok": True, "results": results}


@news_router.get("/card")
async def get_svg_news_card(
    source: str = Query("Industrial News"),
    category: str = Query("Industry")
):
    svg_content = IndustrialNewsService.generate_svg_card(source, category)
    return RawResponse(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=86400, immutable"
        }
    )
