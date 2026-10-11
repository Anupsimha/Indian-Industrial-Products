"""
Popularity-based fallback strategy prioritizing high engagement / views.
"""
from typing import List, Set
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRecommendationStrategy
from ..models import LeadPreferenceProfile, ScoredItem, get_server_models


class PopularityFallbackStrategy(BaseRecommendationStrategy):
    """
    Fallback strategy that surfaces popular / high-viewed industrial items.
    Ensures users still see engaging content even when their specific lead criteria
    has zero exact matches in the catalog.
    """

    @property
    def name(self) -> str:
        return "popularity_fallback_strategy"

    async def recommend_posts(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        Post = get_server_models()["Post"]

        stmt = select(Post).order_by(desc(Post.views_count), desc(Post.created_at)).limit(limit + len(exclude_ids))
        candidates = (await db.execute(stmt)).scalars().all()

        scored = [
            ScoredItem(item=p, score=float(p.views_count or 1), strategy=self.name)
            for p in candidates
            if p.id not in exclude_ids
        ]
        return scored[offset : offset + limit]

    async def recommend_products(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        Product = get_server_models()["Product"]

        stmt = select(Product).order_by(desc(Product.created_at)).limit(limit + len(exclude_ids))
        candidates = (await db.execute(stmt)).scalars().all()

        scored = [
            ScoredItem(item=p, score=1.0, strategy=self.name)
            for p in candidates
            if p.id not in exclude_ids
        ]
        return scored[offset : offset + limit]

    async def recommend_reels(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        Reel = get_server_models()["Reel"]

        stmt = select(Reel).order_by(desc(Reel.views_count), desc(Reel.created_at)).limit(limit + len(exclude_ids))
        candidates = (await db.execute(stmt)).scalars().all()

        scored = [
            ScoredItem(item=r, score=float(r.views_count or 1), strategy=self.name)
            for r in candidates
            if r.id not in exclude_ids
        ]
        return scored[offset : offset + limit]
