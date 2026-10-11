"""
Centralized OOP Recommendation Engine Orchestrator.
"""
from typing import List, Optional, Set, Dict, Any, Callable
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import LeadPreferenceProfile, ScoredItem, RecommendationResult, get_server_models
from .extractor import LeadProfileExtractor
from .strategies.base import BaseRecommendationStrategy
from .strategies.content_strategy import ContentBasedLeadStrategy
from .strategies.popularity_strategy import PopularityFallbackStrategy
from .strategies.freshness_strategy import FreshnessFallbackStrategy


class RecommendationEngine:
    """
    Centralized Recommendation Engine adhering to OOP principles:
    - Open/Closed: New recommendation strategies can be added without modifying engine core.
    - Single Responsibility: Orchestrates profile extraction, execution, and multi-tier fallbacks.
    - Dependency Injection: Strategies and extractors are injected in constructor.
    """

    def __init__(
        self,
        extractor: Optional[LeadProfileExtractor] = None,
        primary_strategy: Optional[BaseRecommendationStrategy] = None,
        secondary_fallback: Optional[BaseRecommendationStrategy] = None,
        tertiary_fallback: Optional[BaseRecommendationStrategy] = None,
    ):
        self.extractor = extractor or LeadProfileExtractor()
        self.primary_strategy = primary_strategy or ContentBasedLeadStrategy()
        self.secondary_fallback = secondary_fallback or PopularityFallbackStrategy()
        self.tertiary_fallback = tertiary_fallback or FreshnessFallbackStrategy()

    async def get_profile_from_lead_ids(
        self,
        db: AsyncSession,
        lead_ids: List[str]
    ) -> LeadPreferenceProfile:
        """
        Fetch Enquiry entities for the given IDs and build a structured profile.
        """
        if not lead_ids:
            return LeadPreferenceProfile()

        Enquiry = get_server_models()["Enquiry"]

        clean_ids = [str(lid).strip() for lid in lead_ids if str(lid).strip()][:5]
        if not clean_ids:
            return LeadPreferenceProfile()

        stmt = select(Enquiry).where(Enquiry.id.in_(clean_ids))
        leads = (await db.execute(stmt)).scalars().all()

        return self.extractor.build_profile(leads)

    async def _execute_pipeline(
        self,
        pipeline_fn_name: str,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
    ) -> RecommendationResult:
        """
        Generic execution pipeline with seamless multi-tier fallback.
        1. Executes primary strategy (Content similarity from leads).
        2. If result items < limit, triggers secondary fallback (Popularity / engagement).
        3. If still < limit, triggers tertiary fallback (Freshness / latest).
        """
        collected_items: List[Any] = []
        collected_ids: Set[str] = set()
        matched_content_count = 0
        fallback_count = 0
        fallback_applied = False

        # Tier 1: Primary Strategy (Lead content matching)
        if not profile.is_empty:
            strategy_method = getattr(self.primary_strategy, pipeline_fn_name)
            primary_scored: List[ScoredItem] = await strategy_method(
                db=db,
                profile=profile,
                limit=limit,
                offset=offset,
                exclude_ids=collected_ids,
            )
            for s in primary_scored:
                collected_items.append(s.item)
                collected_ids.add(s.item.id)
            matched_content_count = len(collected_items)

        # Tier 2: Secondary Fallback (Popularity / trending) if fewer items than limit
        remaining_needed = limit - len(collected_items)
        if remaining_needed > 0:
            fallback_applied = True
            sec_method = getattr(self.secondary_fallback, pipeline_fn_name)
            sec_scored: List[ScoredItem] = await sec_method(
                db=db,
                profile=profile,
                limit=remaining_needed,
                offset=0,
                exclude_ids=collected_ids,
            )
            for s in sec_scored:
                collected_items.append(s.item)
                collected_ids.add(s.item.id)
                fallback_count += 1

        # Tier 3: Tertiary Fallback (Freshness / latest) if still fewer items
        remaining_needed = limit - len(collected_items)
        if remaining_needed > 0:
            fallback_applied = True
            tert_method = getattr(self.tertiary_fallback, pipeline_fn_name)
            tert_scored: List[ScoredItem] = await tert_method(
                db=db,
                profile=profile,
                limit=remaining_needed,
                offset=0,
                exclude_ids=collected_ids,
            )
            for s in tert_scored:
                collected_items.append(s.item)
                collected_ids.add(s.item.id)
                fallback_count += 1

        profile_summary = {
            "lead_ids": profile.lead_ids,
            "categories": list(profile.categories),
            "top_keywords": list(profile.keywords)[:10],
            "locations": list(profile.locations),
        }

        return RecommendationResult(
            items=collected_items,
            total_count=len(collected_items),
            matched_content_count=matched_content_count,
            fallback_count=fallback_count,
            fallback_applied=fallback_applied,
            profile_summary=profile_summary,
        )

    async def get_recommended_posts(
        self,
        db: AsyncSession,
        lead_ids: List[str],
        limit: int = 20,
        offset: int = 0,
    ) -> RecommendationResult:
        """
        Get tailored posts based on the 5 selected leads with seamless fallback.
        """
        profile = await self.get_profile_from_lead_ids(db, lead_ids)
        return await self._execute_pipeline(
            pipeline_fn_name="recommend_posts",
            db=db,
            profile=profile,
            limit=limit,
            offset=offset,
        )

    async def get_recommended_products(
        self,
        db: AsyncSession,
        lead_ids: List[str],
        limit: int = 50,
        offset: int = 0,
    ) -> RecommendationResult:
        """
        Get tailored products based on the 5 selected leads with seamless fallback.
        """
        profile = await self.get_profile_from_lead_ids(db, lead_ids)
        return await self._execute_pipeline(
            pipeline_fn_name="recommend_products",
            db=db,
            profile=profile,
            limit=limit,
            offset=offset,
        )

    async def get_recommended_reels(
        self,
        db: AsyncSession,
        lead_ids: List[str],
        limit: int = 30,
        offset: int = 0,
    ) -> RecommendationResult:
        """
        Get tailored reels based on the 5 selected leads with seamless fallback.
        """
        profile = await self.get_profile_from_lead_ids(db, lead_ids)
        return await self._execute_pipeline(
            pipeline_fn_name="recommend_reels",
            db=db,
            profile=profile,
            limit=limit,
            offset=offset,
        )


# Global singleton instance
recommendation_engine = RecommendationEngine()
