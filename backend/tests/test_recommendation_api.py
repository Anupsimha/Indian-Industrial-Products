"""
Integration tests for the Recommendation API Router and Lead Interest Tracking.
"""
import uuid
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from starlette.testclient import TestClient

from server import (
    app,
    Base,
    get_db,
    get_current_user,
    get_optional_user,
    UserLeadInterest,
    Post,
    Product,
    Reel,
    Company,
    Enquiry,
    now_iso,
)


def make_company(cid="comp-1", name="Test Co", category="CNC Machinery"):
    return Company(
        id=cid,
        name=name,
        description="Industrial tools supplier",
        location="Bengaluru, Karnataka",
        logo_url="https://example.com/logo.png",
        category=category,
        mobile="9876543210",
        whatsapp="9876543210",
        email="info@testco.com",
        owner_id="owner-123",
        created_at=now_iso(),
    )


@pytest.fixture
def test_setup():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    import asyncio
    async def init_models():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_models())

    async def override_get_db():
        async with session_factory() as session:
            yield session

    test_user = {"id": "test-user-uuid", "role": "buyer", "company_id": "test-comp-1"}

    async def override_get_current_user():
        return test_user

    async def override_get_optional_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_user] = override_get_optional_user

    client = TestClient(app)

    yield {
        "client": client,
        "engine": engine,
        "session_factory": session_factory,
        "user": test_user,
    }

    app.dependency_overrides.clear()


def test_save_and_get_lead_interests(test_setup):
    """Test POST /api/recommendations/interests and GET /api/recommendations/interests."""
    client = test_setup["client"]
    session_factory = test_setup["session_factory"]

    import asyncio
    async def seed_data():
        async with session_factory() as session:
            comp = make_company("comp-buyer-lead", "Buyer Hub", "CNC Machinery")
            session.add(comp)

            lead1 = Enquiry(
                id="lead-101",
                name="Buyer Rahul",
                mobile="9876543210",
                category="CNC Machinery",
                product_name="VMC Milling Spindle",
                requirement="High precision 12000 RPM spindle needed urgently",
                location="Pune",
                quantity="5",
                budget="50000",
                status="new",
                created_at=now_iso(),
            )
            session.add(lead1)
            await session.commit()

    asyncio.run(seed_data())

    # Save interest in lead-101
    resp = client.post(
        "/api/recommendations/interests",
        json={"lead_ids": ["lead-101"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["saved_count"] == 1
    assert "lead-101" in data["lead_ids"]
    assert "CNC Machinery" in data["categories"]

    # Retrieve saved interests
    get_resp = client.get("/api/recommendations/interests")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["saved_count"] == 1
    assert get_data["lead_ids"] == ["lead-101"]


def test_recommendation_posts_and_fallback(test_setup):
    """Test GET /api/recommendations/posts with seeded posts."""
    client = test_setup["client"]
    session_factory = test_setup["session_factory"]

    import asyncio
    async def seed_posts():
        async with session_factory() as session:
            comp = make_company("comp-cnc", "CNC Dynamics", "CNC Machinery")
            session.add(comp)

            post1 = Post(
                id="post-cnc-1",
                company_id="comp-cnc",
                content="Brand new CNC Milling and VMC machining centers",
                category="CNC Machinery",
                media_type="image",
                views_count=100,
                created_at=now_iso(),
            )
            session.add(post1)
            await session.commit()

    asyncio.run(seed_posts())

    # Query recommended posts for CNC lead
    resp = client.get("/api/recommendations/posts?lead_ids=lead-101&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == "post-cnc-1"


def test_recommendation_products(test_setup):
    """Test GET /api/recommendations/products with seeded products."""
    client = test_setup["client"]
    session_factory = test_setup["session_factory"]

    import asyncio
    async def seed_products():
        async with session_factory() as session:
            comp = make_company("comp-hyd", "Hydraulic Master", "Hydraulics")
            session.add(comp)

            prod1 = Product(
                id="prod-hyd-1",
                company_id="comp-hyd",
                name="Industrial Hydraulic Cylinder 200 Bar",
                description="Double acting cylinder",
                category="Hydraulics",
                image_url="https://example.com/cylinder.jpg",
                created_at=now_iso(),
            )
            session.add(prod1)
            await session.commit()

    asyncio.run(seed_products())

    resp = client.get("/api/recommendations/products?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == "prod-hyd-1"


def test_recommendation_overview(test_setup):
    """Test GET /api/recommendations/overview."""
    client = test_setup["client"]
    resp = client.get("/api/recommendations/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "profile" in data
    assert "posts" in data
    assert "products" in data
    assert "reels" in data
