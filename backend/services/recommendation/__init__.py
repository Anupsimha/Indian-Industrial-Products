"""
Centralized Recommendation Engine Package.
"""
from .models import LeadPreferenceProfile, ScoredItem, RecommendationResult
from .extractor import LeadProfileExtractor
from .strategies import (
    BaseRecommendationStrategy,
    ContentBasedLeadStrategy,
    PopularityFallbackStrategy,
    FreshnessFallbackStrategy,
)
from .engine import RecommendationEngine, recommendation_engine

__all__ = [
    "LeadPreferenceProfile",
    "ScoredItem",
    "RecommendationResult",
    "LeadProfileExtractor",
    "BaseRecommendationStrategy",
    "ContentBasedLeadStrategy",
    "PopularityFallbackStrategy",
    "FreshnessFallbackStrategy",
    "RecommendationEngine",
    "recommendation_engine",
]
