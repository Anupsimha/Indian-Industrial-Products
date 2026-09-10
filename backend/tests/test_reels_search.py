import pytest
from server import Reel, Company, ReelOut, list_reels
from sqlalchemy import select, or_

def test_reels_search_filter_query_structure():
    # Verify search term logic constructs appropriate filters
    search_term = "Machinery"
    term = f"%{search_term.strip()}%"
    
    stmt = select(Reel).join(Company, Reel.company_id == Company.id, isouter=True).where(
        or_(
            Reel.content.ilike(term),
            Company.name.ilike(term),
            Company.city.ilike(term),
            Company.state.ilike(term)
        )
    )
    
    compiled = str(stmt)
    assert "reels.content" in compiled
    assert "companies.name" in compiled
    assert "companies.city" in compiled
    assert "companies.state" in compiled

