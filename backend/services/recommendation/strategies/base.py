"""
Abstract base class defining the Recommendation Strategy contract.
"""
from abc import ABC, abstractmethod
from typing import List, Set, Any
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import LeadPreferenceProfile, ScoredItem


class BaseRecommendationStrategy(ABC):
    """
    Abstract strategy in the Recommendation Engine Strategy Pattern.
    Every recommendation algorithm must implement this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the strategy for telemetry and diagnostics."""
        pass

    @abstractmethod
    async def recommend_posts(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        """Rank and return posts according to this strategy."""
        pass

    @abstractmethod
    async def recommend_products(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        """Rank and return products according to this strategy."""
        pass

    @abstractmethod
    async def recommend_reels(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        """Rank and return reels according to this strategy."""
        pass

    @abstractmethod
    async def recommend_leads(
        self,
        db: AsyncSession,
        profile: LeadPreferenceProfile,
        limit: int,
        offset: int,
        exclude_ids: Set[str],
    ) -> List[ScoredItem]:
        """Rank and return leads/requirements according to this strategy."""
        pass
