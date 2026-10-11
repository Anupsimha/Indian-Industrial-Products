"""
FastAPI Router for Centralized OOP Recommendations and Lead Interest Tracking.
"""
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.server import (
        get_db,
        get_optional_user,
        get_current_user,
        UserLeadInterest,
        PostOut,
        ProductOut,
        ReelOut,
        hydrate_post,
        hydrate_reel,
        make_product_out,
        Company,
        now_iso,
    )
    from backend.services.recommendation.engine import recommendation_engine
except ImportError:
    from server import (
        get_db,
        get_optional_user,
        get_current_user,
        UserLeadInterest,
        PostOut,
        ProductOut,
        ReelOut,
        hydrate_post,
        hydrate_reel,
        make_product_out,
        Company,
        now_iso,
    )
    from services.recommendation.engine import recommendation_engine

recommendation_router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


class SaveLeadInterestsRequest(BaseModel):
    lead_ids: List[str] = Field(..., max_length=5, description="Up to 5 selected lead requirement IDs")


class LeadInterestStatusOut(BaseModel):
    status: str
    saved_count: int
    lead_ids: List[str]
    categories: List[str] = []
    top_keywords: List[str] = []


async def _resolve_lead_ids(
    request: Request,
    explicit_lead_ids: Optional[str],
    db: AsyncSession,
    user: Optional[dict] = None,
) -> List[str]:
    """
    Resolve active lead IDs from explicit query parameter or authenticated user's saved interests.
    """
    if explicit_lead_ids and explicit_lead_ids.strip():
        return [lid.strip() for lid in explicit_lead_ids.split(",") if lid.strip()][:5]

    cu = user if user is not None else await get_optional_user(request)
    if cu and cu.get("id"):
        stmt = (
            select(UserLeadInterest.lead_id)
            .where(UserLeadInterest.user_id == cu["id"])
            .order_by(UserLeadInterest.created_at.desc())
            .limit(5)
        )
        saved = (await db.execute(stmt)).scalars().all()
        if saved:
            return list(saved)

    return []


@recommendation_router.post("/interests", response_model=LeadInterestStatusOut)
async def save_lead_interests(
    payload: SaveLeadInterestsRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save up to 5 selected lead interests for the authenticated user and return extracted profile summary.
    """
    clean_ids = [lid.strip() for lid in payload.lead_ids if lid.strip()][:5]
    user_id = user["id"]

    # Clear previously saved lead interests for this user
    await db.execute(delete(UserLeadInterest).where(UserLeadInterest.user_id == user_id))

    # Insert new selected lead interests
    now_str = now_iso()
    for lid in clean_ids:
        entry = UserLeadInterest(
            id=str(uuid.uuid4()),
            user_id=user_id,
            lead_id=lid,
            created_at=now_str,
        )
        db.add(entry)

    await db.commit()

    # Build profile summary
    profile = await recommendation_engine.get_profile_from_lead_ids(db, clean_ids)

    return LeadInterestStatusOut(
        status="ok",
        saved_count=len(clean_ids),
        lead_ids=clean_ids,
        categories=list(profile.categories),
        top_keywords=list(profile.keywords)[:10],
    )


@recommendation_router.get("/interests", response_model=LeadInterestStatusOut)
async def get_lead_interests(
    request: Request,
    user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve active lead interests for the current user.
    """
    cu = user if user is not None else await get_optional_user(request)
    if not cu or not cu.get("id"):
        return LeadInterestStatusOut(
            status="ok",
            saved_count=0,
            lead_ids=[],
            categories=[],
            top_keywords=[],
        )

    stmt = (
        select(UserLeadInterest.lead_id)
        .where(UserLeadInterest.user_id == cu["id"])
        .order_by(UserLeadInterest.created_at.desc())
        .limit(5)
    )
    saved = (await db.execute(stmt)).scalars().all()
    lead_ids = list(saved)

    profile = await recommendation_engine.get_profile_from_lead_ids(db, lead_ids)

    return LeadInterestStatusOut(
        status="ok",
        saved_count=len(lead_ids),
        lead_ids=lead_ids,
        categories=list(profile.categories),
        top_keywords=list(profile.keywords)[:10],
    )


@recommendation_router.delete("/interests")
async def clear_lead_interests(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Clear saved lead interests for the authenticated user.
    """
    await db.execute(delete(UserLeadInterest).where(UserLeadInterest.user_id == user["id"]))
    await db.commit()
    return {"status": "ok", "message": "Lead interests cleared"}


@recommendation_router.get("/posts", response_model=List[PostOut])
async def get_recommended_posts_endpoint(
    request: Request,
    lead_ids: Optional[str] = Query(None, description="Comma-separated lead IDs (up to 5)"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch personalized posts ranked by the OOP recommendation engine with automatic trending fallback.
    """
    cu = user if user is not None else await get_optional_user(request)
    active_lead_ids = await _resolve_lead_ids(request, lead_ids, db, user=cu)

    res = await recommendation_engine.get_recommended_posts(
        db=db,
        lead_ids=active_lead_ids,
        limit=limit,
        offset=skip,
    )

    out = []
    for item in res.items:
        hydrated = await hydrate_post(item, cu, db)
        if hydrated:
            out.append(hydrated)

    return out


@recommendation_router.get("/products", response_model=List[ProductOut])
async def get_recommended_products_endpoint(
    request: Request,
    lead_ids: Optional[str] = Query(None, description="Comma-separated lead IDs (up to 5)"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch personalized products ranked by the OOP recommendation engine with automatic fallback.
    """
    cu = user if user is not None else await get_optional_user(request)
    active_lead_ids = await _resolve_lead_ids(request, lead_ids, db, user=cu)

    res = await recommendation_engine.get_recommended_products(
        db=db,
        lead_ids=active_lead_ids,
        limit=limit,
        offset=skip,
    )

    out = []
    for item in res.items:
        stmt_comp = select(Company).where(Company.id == item.company_id)
        company = (await db.execute(stmt_comp)).scalar_one_or_none()
        out.append(make_product_out(item, company))

    return out


@recommendation_router.get("/reels", response_model=List[ReelOut])
async def get_recommended_reels_endpoint(
    request: Request,
    lead_ids: Optional[str] = Query(None, description="Comma-separated lead IDs (up to 5)"),
    limit: int = Query(30, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch personalized reels ranked by the OOP recommendation engine with automatic fallback.
    """
    cu = user if user is not None else await get_optional_user(request)
    active_lead_ids = await _resolve_lead_ids(request, lead_ids, db, user=cu)

    res = await recommendation_engine.get_recommended_reels(
        db=db,
        lead_ids=active_lead_ids,
        limit=limit,
        offset=skip,
    )

    out = []
    for item in res.items:
        hydrated = await hydrate_reel(item, cu, db)
        if hydrated:
            out.append(hydrated)

    return out


@recommendation_router.get("/overview")
async def get_recommendations_overview(
    request: Request,
    lead_ids: Optional[str] = Query(None),
    user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified summary endpoint providing personalized preview of posts, products, reels, and categories.
    """
    cu = user if user is not None else await get_optional_user(request)
    active_lead_ids = await _resolve_lead_ids(request, lead_ids, db, user=cu)
    profile = await recommendation_engine.get_profile_from_lead_ids(db, active_lead_ids)

    post_res = await recommendation_engine.get_recommended_posts(db, active_lead_ids, limit=6)
    prod_res = await recommendation_engine.get_recommended_products(db, active_lead_ids, limit=6)
    reel_res = await recommendation_engine.get_recommended_reels(db, active_lead_ids, limit=6)

    posts_out = []
    for p in post_res.items:
        h = await hydrate_post(p, cu, db)
        if h: posts_out.append(h)

    products_out = []
    for pr in prod_res.items:
        stmt_c = select(Company).where(Company.id == pr.company_id)
        comp = (await db.execute(stmt_c)).scalar_one_or_none()
        products_out.append(make_product_out(pr, comp))

    reels_out = []
    for r in reel_res.items:
        h = await hydrate_reel(r, cu, db)
        if h: reels_out.append(h)

    return {
        "status": "ok",
        "has_interests": len(active_lead_ids) > 0,
        "lead_ids": active_lead_ids,
        "profile": {
            "categories": list(profile.categories),
            "top_keywords": list(profile.keywords)[:10],
            "locations": list(profile.locations),
        },
        "posts": posts_out,
        "products": products_out,
        "reels": reels_out,
        "fallback_applied": post_res.fallback_applied or prod_res.fallback_applied or reel_res.fallback_applied,
    }
