"""Unit & Integration tests for Industrial News Feed system (backend/news)."""
import sys
import html
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from news.models import Base, NewsItem, FeedHealthLog
from news.service import IndustrialNewsService
from news.config import SOURCE_CONFIG, CATEGORY_KEYWORDS

# Setup in-memory SQLite database for testing
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


@pytest.fixture
def db_session():
    """Provides a transactional database session for unit tests."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


def test_source_configuration():
    """Verify that RSS sources configuration is well-formed with display names and URLs."""
    assert len(SOURCE_CONFIG) > 0
    for key, cfg in SOURCE_CONFIG.items():
        assert "display_name" in cfg
        assert "url" in cfg
        assert "enabled" in cfg
        assert "max_snippet_chars" in cfg


def test_categorize_article():
    """Test text categorization logic based on industrial sector keywords."""
    cat_steel = IndustrialNewsService.categorize_article("Steel production spikes in Jamshedpur plant", "Iron ore prices rise")
    assert cat_steel == "Steel & Metals"

    cat_chem = IndustrialNewsService.categorize_article("Specialty Chemical manufacturing expansion in Gujarat", "Solvent production")
    assert cat_chem == "Chemicals & Polymers"

    cat_gen = IndustrialNewsService.categorize_article("Quarterly B2B financial earnings overview", "Generic market summary")
    assert cat_gen == "General Industry"


def test_title_normalization_and_fuzzy_deduplication():
    """Test title normalization and fuzzy title matching deduplication."""
    norm = IndustrialNewsService.normalize_title("JSW Steel Expands Vijayanagar Plant (5MT)")
    assert norm == "jsw steel expands vijayanagar plant 5mt"

    recent = ["JSW Steel Expands Vijayanagar Plant Capacity by 5MT"]
    is_dup_1 = IndustrialNewsService.is_near_duplicate("JSW Steel Expands Vijayanagar Plant Capacity by 5 MT", recent)
    assert is_dup_1 is True

    is_dup_2 = IndustrialNewsService.is_near_duplicate("Tata Motors Launches Commercial Electric Trucks", recent)
    assert is_dup_2 is False


def test_mock_rss_feed_parsing(db_session):
    """Test parsing an RSS feed via mock feedparser response."""
    mock_feed = MagicMock()
    mock_feed.bozo = 0
    mock_feed.entries = [
        {
            "title": "BHEL Bags Rs 4000 Crore Order for Power Equipment",
            "link": "https://economictimes.indiatimes.com/industry/energy/bhel-order",
            "published_parsed": (2026, 9, 5, 12, 0, 0, 5, 248, 0),
            "summary": "Bharat Heavy Electricals Limited secures major contract for turbine equipment supply.",
            "media_content": [{"url": "https://img.et.com/bhel.jpg"}]
        }
    ]

    with patch("feedparser.parse") as mock_parse:
        mock_parse.return_value = mock_feed
        added_count = IndustrialNewsService.fetch_single_source(
            db_session, "et_manufacturing", SOURCE_CONFIG["et_manufacturing"]
        )
        assert added_count == 1

        items = db_session.query(NewsItem).filter_by(source="Economic Times").all()
        assert len(items) == 1
        assert "BHEL" in items[0].title
        assert items[0].category == "Electricals & Electronics"
        assert items[0].image_url == "https://img.et.com/bhel.jpg"


def test_generate_svg_card_sanitization():
    """Test SVG preview card generation and parameter escaping to prevent SVG injection."""
    dirty_title = "<script>alert(1)</script> Metal & Steel <'Quota'>"
    dirty_source = "ET & LiveMint <BadTag>"

    svg_content = IndustrialNewsService.generate_svg_card(source=dirty_source, category="Steel")
    
    assert "<script>" not in svg_content
    assert "ET &amp; LiveMint" in svg_content
    assert 'xmlns="http://www.w3.org/2000/svg"' in svg_content
