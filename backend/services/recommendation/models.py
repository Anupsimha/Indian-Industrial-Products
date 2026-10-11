"""
Data models for the Centralized OOP Recommendation Engine.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set


@dataclass
class LeadPreferenceProfile:
    """
    Extracted industrial preference profile derived from a user's selected leads.
    """
    lead_ids: List[str] = field(default_factory=list)
    categories: Set[str] = field(default_factory=set)
    keywords: Set[str] = field(default_factory=set)
    locations: Set[str] = field(default_factory=set)
    industrial_areas: Set[str] = field(default_factory=set)
    raw_requirements: List[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not bool(self.categories or self.keywords)


@dataclass
class ScoredItem:
    """
    Generic wrapper for any ranked entity with its calculated relevance score.
    """
    item: Any
    score: float
    matched_categories: List[str] = field(default_factory=list)
    matched_keywords: List[str] = field(default_factory=list)
    strategy: str = "content_similarity"


@dataclass
class RecommendationResult:
    """
    Final standardized result returned by the recommendation engine.
    """
    items: List[Any] = field(default_factory=list)
    total_count: int = 0
    matched_content_count: int = 0
    fallback_count: int = 0
    fallback_applied: bool = False
    profile_summary: Dict[str, Any] = field(default_factory=dict)


def get_server_models():
    """
    Safely resolve SQLAlchemy models avoiding circular import issues.
    """
    try:
        from backend.server import Post, Product, Reel, Enquiry, UserLeadInterest
    except ImportError:
        from server import Post, Product, Reel, Enquiry, UserLeadInterest
    return {
        "Post": Post,
        "Product": Product,
        "Reel": Reel,
        "Enquiry": Enquiry,
        "UserLeadInterest": UserLeadInterest,
    }

