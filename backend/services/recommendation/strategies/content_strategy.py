"""
Content-based recommendation strategy matching entities against user's lead profile.
"""
import math
import re
from typing import List, Set, Dict, Any, Tuple
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRecommendationStrategy
from ..models import LeadPreferenceProfile, ScoredItem, get_server_models


class ContentBasedLeadStrategy(BaseRecommendationStrategy):
    """
    Primary content-based recommendation strategy.
    Extracts category and keyword overlap to score and rank candidates.
    """

    @property
    def name(self) -> str:
        return "content_based_lead_strategy"

    def _tokenize(self, text: str) -> Set[str]:
        if not text:
            return set()
        return set(re.findall(r"[a-zA-Z0-9_-]+", text.lower()))

    def _score_post(self, post: Any, profile: LeadPreferenceProfile) -> Tuple[float, List[str], List[str]]:
        score = 0.0
        matched_cats = []
        matched_keys = []

        # 1. Category match
        post_cat = (getattr(post, "category", "") or "").strip().lower()
        if post_cat:
            for prof_cat in profile.categories:
                if prof_cat.lower() == post_cat:
                    score += 50.0
                    matched_cats.append(prof_cat)
                    break

        # 2. Keyword overlap in content
        tokens = self._tokenize(getattr(post, "content", ""))
        for kw in profile.keywords:
            if kw in tokens:
                score += 15.0
                matched_keys.append(kw)

        # 3. Engagement boost (only applied if there is relevant content overlap)
        if score > 0:
            views = getattr(post, "views_count", 0) or 0
            if views > 0:
                score += min(math.log1p(views) * 2.0, 8.0)

        return score, matched_cats, matched_keys

    def _score_product(self, product: Any, profile: LeadPreferenceProfile) -> Tuple[float, List[str], List[str]]:
        score = 0.0
        matched_cats = []
        matched_keys = []

        # 1. Category match
        prod_cat = (getattr(product, "category", "") or "").strip().lower()
        if prod_cat:
            for prof_cat in profile.categories:
                if prof_cat.lower() == prod_cat:
                    score += 55.0
                    matched_cats.append(prof_cat)
                    break

        # 2. Keyword overlap in name and description
        tokens = self._tokenize(f"{getattr(product, 'name', '')} {getattr(product, 'description', '')}")
        for kw in profile.keywords:
            if kw in tokens:
                score += 18.0
                matched_keys.append(kw)

        # 3. Location match if present
        prod_loc = (getattr(product, "location", "") or "").lower()
        if prod_loc and score > 0:
            for loc in profile.locations:
                if loc in prod_loc:
                    score += 15.0
                    break

        return score, matched_cats, matched_keys

    def _score_reel(self, reel: Any, profile: LeadPreferenceProfile) -> Tuple[float, List[str], List[str]]:
        score = 0.0
        matched_cats = []
        matched_keys = []

        tokens = self._tokenize(getattr(reel, "content", ""))
        for kw in profile.keywords:
            if kw in tokens:
                score += 20.0
                matched_keys.append(kw)

        # Engagement boost (only applied if there is relevant content overlap)
        if score > 0:
            views = getattr(reel, "views_count", 0) or 0
            if views > 0:
                score += min(math.log1p(views) * 2.5, 10.0)

        return score, matched_cats, matched_keys

    async def recommend_posts(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        if profile.is_empty:
            return []

        Post = get_server_models()["Post"]

        # Pull a pool of recent posts (up to 200) to score
        stmt = select(Post).order_by(desc(Post.created_at)).limit(200)
        candidates = (await db.execute(stmt)).scalars().all()

        scored: List[ScoredItem] = []
        for post in candidates:
            if post.id in exclude_ids:
                continue
            score, cats, keys = self._score_post(post, profile)
            if score > 0.0:
                scored.append(ScoredItem(
                    item=post,
                    score=score,
                    matched_categories=cats,
                    matched_keywords=keys,
                    strategy=self.name
                ))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[offset : offset + limit]

    async def recommend_products(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        if profile.is_empty:
            return []

        Product = get_server_models()["Product"]

        stmt = select(Product).order_by(desc(Product.created_at)).limit(200)
        candidates = (await db.execute(stmt)).scalars().all()

        scored: List[ScoredItem] = []
        for product in candidates:
            if product.id in exclude_ids:
                continue
            score, cats, keys = self._score_product(product, profile)
            if score > 0.0:
                scored.append(ScoredItem(
                    item=product,
                    score=score,
                    matched_categories=cats,
                    matched_keywords=keys,
                    strategy=self.name
                ))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[offset : offset + limit]

    async def recommend_reels(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        if profile.is_empty:
            return []

        Reel = get_server_models()["Reel"]

        stmt = select(Reel).order_by(desc(Reel.created_at)).limit(200)
        candidates = (await db.execute(stmt)).scalars().all()

        scored: List[ScoredItem] = []
        for reel in candidates:
            if reel.id in exclude_ids:
                continue
            score, cats, keys = self._score_reel(reel, profile)
            if score > 0.0:
                scored.append(ScoredItem(
                    item=reel,
                    score=score,
                    matched_categories=cats,
                    matched_keywords=keys,
                    strategy=self.name
                ))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[offset : offset + limit]
