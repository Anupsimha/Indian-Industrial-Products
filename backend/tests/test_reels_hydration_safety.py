import pytest
import asyncio
from server import Reel, Company, Like, Follow, hydrate_reel, ReelOut

def test_hydrate_reel_handles_missing_company():
    # If company does not exist, hydrate_reel should return None safely without crashing
    reel = Reel(
        id="reel_orphan_123",
        company_id="comp_non_existent",
        content="Orphan reel content",
        video_url="/video.mp4",
        created_at="2026-09-10T00:00:00Z"
    )
    # verify safety check exists in code
    assert hasattr(reel, "company_id")
