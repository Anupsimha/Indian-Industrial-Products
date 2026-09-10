import pytest
from server import Reel, ReelOut, hydrate_reel

def test_reel_model_and_schema_views_count():
    reel = Reel(
        id="reel_test_views_123",
        company_id="comp_123",
        content="Testing reel views count",
        video_url="/uploaded/video.mp4",
        views_count=42,
        created_at="2026-09-10T00:00:00Z"
    )
    assert hasattr(reel, "views_count")
    assert reel.views_count == 42

    reel_out = ReelOut(
        id="reel_test_views_123",
        company_id="comp_123",
        company_name="Test Company",
        company_logo="",
        location="Delhi",
        content="Testing reel views count",
        video_url="/uploaded/video.mp4",
        likes_count=5,
        comments_count=2,
        views_count=42,
        is_liked=False,
        is_following=False,
        whatsapp="919876543210",
        created_at="2026-09-10T00:00:00Z"
    )
    assert reel_out.views_count == 42
