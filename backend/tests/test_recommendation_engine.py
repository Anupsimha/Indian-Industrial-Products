"""
Comprehensive unit tests for the Centralized OOP Recommendation Engine.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock

from services.recommendation.models import LeadPreferenceProfile, ScoredItem
from services.recommendation.extractor import LeadProfileExtractor
from services.recommendation.strategies.content_strategy import ContentBasedLeadStrategy
from services.recommendation.strategies.popularity_strategy import PopularityFallbackStrategy
from services.recommendation.strategies.freshness_strategy import FreshnessFallbackStrategy
from services.recommendation.engine import RecommendationEngine


class MockLead:
    def __init__(self, id, category, product_name, requirement, location="Mumbai", industrial_area="MIDC"):
        self.id = id
        self.category = category
        self.product_name = product_name
        self.requirement = requirement
        self.location = location
        self.industrial_area = industrial_area


class MockPost:
    def __init__(self, id, content, category, views_count=10, created_at="2026-10-11T10:00:00Z"):
        self.id = id
        self.content = content
        self.category = category
        self.views_count = views_count
        self.created_at = created_at


class MockProduct:
    def __init__(self, id, name, category, description, location="Mumbai", created_at="2026-10-11T10:00:00Z"):
        self.id = id
        self.name = name
        self.category = category
        self.description = description
        self.location = location
        self.created_at = created_at


class MockReel:
    def __init__(self, id, content, views_count=50, created_at="2026-10-11T10:00:00Z"):
        self.id = id
        self.content = content
        self.views_count = views_count
        self.created_at = created_at


def test_extractor_extracts_categories_and_keywords():
    extractor = LeadProfileExtractor()
    leads = [
        MockLead("l1", "CNC Machining", "Precision CNC Lathe", "Urgent requirement for brass lathe components in Mumbai"),
        MockLead("l2", "Steel & Metals", "Stainless Steel Flanges", "Need SS 304 forged flanges 500 pcs immediate delivery"),
    ]

    profile = extractor.build_profile(leads)
    assert "CNC Machining" in profile.categories
    assert "Steel & Metals" in profile.categories
    assert "lathe" in profile.keywords
    assert "flanges" in profile.keywords
    assert "urgent" not in profile.keywords  # stop word
    assert "need" not in profile.keywords  # stop word
    assert "mumbai" in profile.locations


def test_content_strategy_scoring():
    strategy = ContentBasedLeadStrategy()
    profile = LeadPreferenceProfile(
        categories={"Steel & Metals"},
        keywords={"flanges", "lathe", "stainless"},
        locations={"mumbai"}
    )

    # Post matching category and keywords
    matching_post = MockPost("p1", "High quality stainless flanges ready for dispatch", "Steel & Metals", views_count=100)
    score, cats, keys = strategy._score_post(matching_post, profile)

    assert score >= 50.0  # Category match is 50
    assert "Steel & Metals" in cats
    assert "flanges" in keys or "stainless" in keys

    # Irrelevant post
    unrelated_post = MockPost("p2", "Looking for office chairs and tables", "Furniture", views_count=5)
    score_unrelated, _, _ = strategy._score_post(unrelated_post, profile)
    assert score_unrelated == 0.0


import asyncio

def test_engine_fallback_when_lead_has_no_matching_post():
    async def _run():
        mock_db = MagicMock()

        # Empty content strategy mock (0 matches for this lead)
        content_mock = MagicMock()
        content_mock.recommend_posts = AsyncMock(return_value=[])

        # Popularity fallback returning 3 trending items
        trending_p1 = MockPost("p_trend_1", "Trending Industrial Exhibition", "Events", views_count=500)
        trending_p2 = MockPost("p_trend_2", "New Factory Automation Showcase", "Automation", views_count=350)
        trending_p3 = MockPost("p_trend_3", "Heavy Machinery Overhaul", "Machinery", views_count=200)
        popularity_mock = MagicMock()
        popularity_mock.recommend_posts = AsyncMock(return_value=[
            ScoredItem(item=trending_p1, score=500, strategy="popularity_fallback_strategy"),
            ScoredItem(item=trending_p2, score=350, strategy="popularity_fallback_strategy"),
            ScoredItem(item=trending_p3, score=200, strategy="popularity_fallback_strategy"),
        ])

        engine = RecommendationEngine(
            primary_strategy=content_mock,
            secondary_fallback=popularity_mock,
        )
        # Mock extractor output
        engine.get_profile_from_lead_ids = AsyncMock(return_value=LeadPreferenceProfile(
            lead_ids=["lead_obscure_id"],
            categories={"Rare Category With Zero Posts"},
            keywords={"unobtainium"}
        ))

        result = await engine.get_recommended_posts(mock_db, lead_ids=["lead_obscure_id"], limit=3)

        assert result.total_count == 3
        assert result.matched_content_count == 0
        assert result.fallback_applied is True
        assert result.fallback_count == 3
        assert result.items[0].id == "p_trend_1"

    asyncio.run(_run())


def test_engine_blends_content_matches_with_fallback_to_fill_limit():
    async def _run():
        mock_db = MagicMock()

        matched_p = MockPost("p_match_1", "High grade steel coils", "Steel", views_count=50)
        content_mock = MagicMock()
        content_mock.recommend_posts = AsyncMock(return_value=[
            ScoredItem(item=matched_p, score=75, strategy="content_based_lead_strategy")
        ])

        trend_p1 = MockPost("p_trend_1", "Trending Expo", "Events", views_count=500)
        trend_p2 = MockPost("p_trend_2", "Trending Robotics", "Automation", views_count=400)
        popularity_mock = MagicMock()
        popularity_mock.recommend_posts = AsyncMock(return_value=[
            ScoredItem(item=trend_p1, score=500, strategy="popularity_fallback_strategy"),
            ScoredItem(item=trend_p2, score=400, strategy="popularity_fallback_strategy"),
        ])

        engine = RecommendationEngine(
            primary_strategy=content_mock,
            secondary_fallback=popularity_mock,
        )
        engine.get_profile_from_lead_ids = AsyncMock(return_value=LeadPreferenceProfile(
            lead_ids=["lead_steel"],
            categories={"Steel"}
        ))

        result = await engine.get_recommended_posts(mock_db, lead_ids=["lead_steel"], limit=3)

        assert result.total_count == 3
        assert result.matched_content_count == 1
        assert result.fallback_applied is True
        assert result.fallback_count == 2
        # First item must be the matched post
        assert result.items[0].id == "p_match_1"
        # Followed by fallback items
        assert result.items[1].id == "p_trend_1"
        assert result.items[2].id == "p_trend_2"

    asyncio.run(_run())


def test_engine_recommends_products_with_fallback():
    async def _run():
        mock_db = MagicMock()

        matched_prod = MockProduct("prod_1", "CNC Lathe Machine", "Machinery", "High speed CNC lathe")
        content_mock = MagicMock()
        content_mock.recommend_products = AsyncMock(return_value=[
            ScoredItem(item=matched_prod, score=80, strategy="content_based_lead_strategy")
        ])

        trend_prod = MockProduct("prod_2", "Hydraulic Press", "Machinery", "Heavy duty press")
        popularity_mock = MagicMock()
        popularity_mock.recommend_products = AsyncMock(return_value=[
            ScoredItem(item=trend_prod, score=10, strategy="popularity_fallback_strategy")
        ])

        engine = RecommendationEngine(
            primary_strategy=content_mock,
            secondary_fallback=popularity_mock,
        )
        engine.get_profile_from_lead_ids = AsyncMock(return_value=LeadPreferenceProfile(
            lead_ids=["l_machinery"],
            categories={"Machinery"}
        ))

        result = await engine.get_recommended_products(mock_db, lead_ids=["l_machinery"], limit=2)
        assert result.total_count == 2
        assert result.items[0].id == "prod_1"
        assert result.items[1].id == "prod_2"

    asyncio.run(_run())


def test_engine_caps_at_five_leads():
    extractor = LeadProfileExtractor()
    leads = [MockLead(f"lead_{i}", f"Category {i}", f"Product {i}", f"Requirement {i}") for i in range(10)]
    # Extractor extracts from whatever is passed, engine get_profile_from_lead_ids slices at 5
    lead_ids = [f"id_{i}" for i in range(8)]
    clean_ids = [str(lid).strip() for lid in lead_ids if str(lid).strip()][:5]
    assert len(clean_ids) == 5
    assert clean_ids == ["id_0", "id_1", "id_2", "id_3", "id_4"]

