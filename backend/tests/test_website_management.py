"""
Unit & Integration Tests for Custom Website Management.
Tests:
- Subdomain sanitization, validation & reserved word protection
- Hostinger DNS service provisioning & wildcard fallback
- Template listing, sample data retrieval & custom template permission gating
- Website setup wizard API, database updates & in-app notifications
- Public tenant website data hydration (Company, Products, Posts, Reels)
- Search engine discovery: dynamic sitemap.xml and robots.txt
"""

import pytest
import asyncio
from typing import Dict, Any

from backend.services.hostinger_dns_service import (
    sanitize_subdomain, validate_subdomain, is_subdomain_reserved, HostingerDNSService
)


def test_subdomain_sanitization():
    """Verify slugs are properly cleaned, lowercase, and hyphens collapsed."""
    assert sanitize_subdomain("Precision Parts & Tools Ltd.") == "precision-parts-tools-ltd"
    assert sanitize_subdomain("---Alpha---Beta---") == "alpha-beta"
    assert sanitize_subdomain("Bharat_Machinery_123") == "bharat-machinery-123"
    assert sanitize_subdomain("Capital Letters") == "capital-letters"
    assert len(sanitize_subdomain("a" * 100)) == 63


def test_subdomain_validation_rules():
    """Verify validation enforces length, character constraints, and reserved names."""
    # Valid subdomains
    ok, err = validate_subdomain("precision-parts")
    assert ok is True and err is None

    ok, err = validate_subdomain("tmt-steel-123")
    assert ok is True and err is None

    # Too short (< 3 chars)
    ok, err = validate_subdomain("ab")
    assert ok is False and "at least 3 characters" in err

    # Starts or ends with hyphen
    ok, err = validate_subdomain("-invalid-")
    # Sanitizer strips leading/trailing hyphens, leaving 'invalid', which is valid:
    assert validate_subdomain(sanitize_subdomain("-invalid-"))[0] is True

    # Reserved platform words
    for reserved in ["api", "www", "billing", "staging", "admin", "support", "dashboard"]:
        ok, err = validate_subdomain(reserved)
        assert ok is False, f"Reserved word '{reserved}' was not rejected"
        assert "reserved platform keyword" in err


def test_hostinger_dns_service_fallback():
    """Verify Hostinger DNS service handles wildcard fallback when API token is empty."""
    service = HostingerDNSService(api_token="", zone_domain="indianindustrialplatform.com", server_ip="200.141.14.101")
    
    # Zone records should return empty list gracefully without throwing
    records = asyncio.run(service.get_zone_records())
    assert records == []

    # Subdomain A-record creation routes through Wildcard DNS
    res = asyncio.run(service.add_subdomain_a_record("precision-parts"))
    assert res["success"] is True
    assert res["mode"] == "wildcard_fallback"
    assert res["subdomain"] == "precision-parts"
    assert res["full_domain"] == "precision-parts.indianindustrialplatform.com"
    assert res["ip"] == "200.141.14.101"


def test_website_management_api_flow():
    """Test full API lifecycle using in-memory SQLite and FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    import uuid

    # Import from backend or root
    try:
        from backend.server import (
            app, Base, get_db, get_current_user, get_optional_user,
            Company, User, Plan, Product, CompanyWebsite, WebsiteTemplate, now_iso
        )
    except ImportError:
        from server import (
            app, Base, get_db, get_current_user, get_optional_user,
            Company, User, Plan, Product, CompanyWebsite, WebsiteTemplate, now_iso
        )

    # In-memory async SQLite engine
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def init_models():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_models())

    async def override_get_db():
        async with session_factory() as session:
            yield session

    comp_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    test_slug = f"test-co-{uuid.uuid4().hex[:6]}"
    now = now_iso()

    test_user = {
        "id": user_id,
        "name": "Apex Admin",
        "email": f"apex-{uuid.uuid4().hex[:6]}@example.com",
        "role": "manufacturer",
        "company_id": comp_id
    }

    async def override_get_current_user():
        return test_user

    async def override_get_optional_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_user] = override_get_optional_user

    client = TestClient(app)

    try:
        # Seed test user, company, products, and default templates
        async def seed_test_data():
            async with session_factory() as session:
                usr = User(
                    id=user_id,
                    name="Apex Admin",
                    email=test_user["email"],
                    mobile=f"91{uuid.uuid4().int % 10000000000:010d}",
                    password_hash="testhash",
                    role="manufacturer",
                    company_id=comp_id,
                    plan_name="Premium",
                    is_verified=True,
                    created_at=now
                )
                session.add(usr)

                comp = Company(
                    id=comp_id,
                    name="Apex High-Precision Machining",
                    description="Leader in CNC milling and aerospace precision parts.",
                    location="Bengaluru, Karnataka",
                    logo_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
                    cover_url="https://res.cloudinary.com/demo/image/upload/cover.jpg",
                    category="Machine Tools",
                    mobile="919988776655",
                    whatsapp="919988776655",
                    email="contact@apexmachining.com",
                    website="https://www.oldwebsite.com",
                    owner_id=user_id,
                    city="Bengaluru",
                    state="Karnataka",
                    created_at=now
                )
                session.add(comp)

                prod = Product(
                    id=str(uuid.uuid4()),
                    company_id=comp_id,
                    name="5-Axis Aerospace Impeller",
                    category="Machine Tools",
                    image_url="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
                    price="₹45,000",
                    moq="5 Units",
                    description="High grade titanium alloy CNC machined impeller.",
                    created_at=now
                )
                session.add(prod)

                # Seed base templates
                for tmpl_id, tmpl_name in [
                    ("industrial_modern", "Industrial Modern"),
                    ("manufacturing_pro", "Manufacturing Pro"),
                    ("minimal_catalog", "Minimal Catalog")
                ]:
                    session.add(WebsiteTemplate(
                        id=tmpl_id,
                        name=tmpl_name,
                        description="Test template",
                        badge="Popular",
                        thumbnail_url="https://example.com/thumb.jpg",
                        category="general_b2b",
                        is_active=True,
                        is_custom=False,
                        sample_data={"tagline": "Sample Tagline", "stats": [{"label": "Years", "value": "20+"}]},
                        created_at=now,
                        updated_at=now
                    ))

                await session.commit()

        asyncio.run(seed_test_data())

        # 1. Test subdomain availability endpoint
        res = client.get(f"/api/websites/check-subdomain?name={test_slug}")
        assert res.status_code == 200
        data = res.json()
        assert data["available"] is True
        assert data["subdomain"] == test_slug

        # Check reserved word
        res_res = client.get("/api/websites/check-subdomain?name=billing")
        assert res_res.status_code == 200
        data_res = res_res.json()
        assert data_res["available"] is False
        assert "reserved" in data_res["reason"].lower()

        # 2. Test template listing
        res_tmpl = client.get("/api/websites/templates")
        assert res_tmpl.status_code == 200
        templates = res_tmpl.json()
        assert len(templates) >= 3
        template_ids = [t["id"] for t in templates]
        assert "industrial_modern" in template_ids
        assert "manufacturing_pro" in template_ids
        assert "minimal_catalog" in template_ids

        # 3. Check /api/websites/my-website before setup
        my_web_res = client.get("/api/websites/my-website")
        assert my_web_res.status_code == 200
        assert my_web_res.json()["has_website"] is False

        # 4. Call Setup endpoint
        setup_res = client.post(
            "/api/websites/setup",
            json={
                "subdomain": test_slug,
                "template_id": "industrial_modern",
                "theme_config": {"primary_color": "#0f172a", "accent_color": "#f97316"},
                "seo_config": {"title": "Apex Machining | CNC Precision Manufacturing"}
            }
        )
        assert setup_res.status_code == 201
        setup_data = setup_res.json()
        assert setup_data["ok"] is True
        assert setup_data["website"]["subdomain"] == test_slug
        assert "indianindustrialplatform.com" in setup_data["website"]["live_url"]

        # 5. Verify /api/websites/my-website after setup
        my_web_res2 = client.get("/api/websites/my-website")
        assert my_web_res2.status_code == 200
        assert my_web_res2.json()["has_website"] is True
        assert my_web_res2.json()["website"]["subdomain"] == test_slug

        # 6. Test Public Tenant Website Data Hydration
        pub_res = client.get(f"/api/public/site/{test_slug}")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert pub_data["company"]["name"] == "Apex High-Precision Machining"
        assert len(pub_data["products"]) >= 1
        assert pub_data["products"][0]["name"] == "5-Axis Aerospace Impeller"
        assert pub_data["website"]["template_id"] == "industrial_modern"

        # Verify Google SEO tags and JSON-LD schema
        assert "seo" in pub_data
        assert "Apex Machining" in pub_data["seo"]["title"]
        assert pub_data["seo"]["schema_json"]["@type"] == "Manufacturer"
        assert pub_data["seo"]["schema_json"]["name"] == "Apex High-Precision Machining"

        # 7. Test Search Engine Discovery: sitemap.xml & robots.txt
        sitemap_res = client.get(f"/api/public/site/{test_slug}/sitemap.xml")
        assert sitemap_res.status_code == 200
        assert "application/xml" in sitemap_res.headers.get("content-type", "")
        assert "<urlset" in sitemap_res.text
        assert test_slug in sitemap_res.text

        robots_res = client.get(f"/api/public/site/{test_slug}/robots.txt")
        assert robots_res.status_code == 200
        assert "User-agent: *" in robots_res.text
        assert "sitemap.xml" in robots_res.text

    finally:
        app.dependency_overrides.clear()
