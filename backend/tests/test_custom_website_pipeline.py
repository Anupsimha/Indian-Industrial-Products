import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from sqlalchemy import select

from backend.server import app, Base, get_db, User, Company, CustomWebsiteRequest, CustomWebsiteConfig, WebsiteDeploymentLog, hash_password, now_iso
from backend.services.hostinger_dns_service import hostinger_dns_service
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker


import backend.server as server_module

@pytest.mark.anyio
async def test_custom_website_config_and_requests_flow():
    orig_session_local = server_module.AsyncSessionLocal
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    server_module.AsyncSessionLocal = session_factory

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    now = now_iso()
    test_company_id = "comp_test_custom_1"
    test_user_id = "user_test_custom_1"
    admin_user_id = "admin_test_custom_1"

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        # Create test company
        c = Company(
            id=test_company_id,
            name="Apex Tools Pvt Ltd",
            description="Leading manufacturer of high precision CNC machine tooling.",
            location="Bengaluru, Karnataka",
            logo_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            cover_url="https://res.cloudinary.com/demo/image/upload/cover.jpg",
            category="Precision Tooling",
            city="Bengaluru",
            mobile="9876543210",
            whatsapp="9876543210",
            email="ramesh@apextools.in",
            owner_id=test_user_id,
            created_at=now
        )
        db.add(c)

        # Create normal company owner user
        u = User(
            id=test_user_id,
            name="Ramesh Kumar",
            email="ramesh@apextools.in",
            mobile="9876543210",
            role="manufacturer",
            password_hash=hash_password("ApexPass123!"),
            company_id=test_company_id,
            is_verified=True,
            created_at=now
        )
        db.add(u)

        # Create admin user
        a = User(
            id=admin_user_id,
            name="Platform SuperAdmin",
            email="admin_custom@iip.in",
            mobile="9998887776",
            role="admin",
            password_hash=hash_password("AdminPass123!"),
            is_verified=True,
            created_at=now
        )
        db.add(a)

        # Ensure custom config exists
        cfg = CustomWebsiteConfig(
            id="global_config",
            benefits_list=["Custom Domain", "6 Months Maintenance"],
            maintenance_months=6,
            additional_benefits="Full enterprise setup.",
            created_at=now,
            updated_at=now
        )
        db.add(cfg)
        await db.commit()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Login user
            login_u = await client.post("/api/auth/login", json={"identifier": "9876543210", "password": "ApexPass123!"})
            assert login_u.status_code == 200
            u_token = login_u.json()["token"]

            # 2. Login admin
            login_a = await client.post("/api/auth/login", json={"identifier": "9998887776", "password": "AdminPass123!"})
            assert login_a.status_code == 200
            a_token = login_a.json()["token"]

            # 3. Check public custom config
            cfg_res = await client.get("/api/websites/custom-config")
            assert cfg_res.status_code == 200
            assert "Custom Domain" in cfg_res.json()["benefits_list"]

            # 4. Customer submits custom website request
            req_res = await client.post(
                "/api/websites/custom-requests",
                json={"requested_domain": "apextoolsbengaluru.com", "notes": "Need high precision dark theme layout."},
                headers={"Authorization": f"Bearer {u_token}"}
            )
            assert req_res.status_code == 200
            req_id = req_res.json()["request"]["id"]
            assert req_res.json()["request"]["status"] == "PENDING_REVIEW"

            # 5. Customer checks their request
            my_req = await client.get("/api/websites/my-custom-request", headers={"Authorization": f"Bearer {u_token}"})
            assert my_req.status_code == 200
            assert my_req.json()["has_request"] is True
            assert my_req.json()["request"]["id"] == req_id

            # 6. Admin lists requests
            admin_list = await client.get("/api/admin/websites/custom-requests", headers={"Authorization": f"Bearer {a_token}"})
            assert admin_list.status_code == 200
            found = any(item["id"] == req_id for item in admin_list.json())
            assert found is True

            # 7. Stage 1: Domain sanity check
            stage1 = await client.post(
                f"/api/admin/websites/custom-requests/{req_id}/stage-domain",
                json={"domain": "indianindustrialplatform.com", "sync_hostinger": False},
                headers={"Authorization": f"Bearer {a_token}"}
            )
            assert stage1.status_code == 200
            assert stage1.json()["ok"] is True
            assert stage1.json()["target_ip"] == "200.141.14.101"

            # 8. Check audit logs
            logs_res = await client.get(f"/api/admin/websites/custom-requests/{req_id}/logs", headers={"Authorization": f"Bearer {a_token}"})
            assert logs_res.status_code == 200
            logs = logs_res.json()
            assert len(logs) >= 2  # Request submitted + Domain check
            assert any(l["stage"] == "DOMAIN_SANITY_CHECK" for l in logs)

            # 9. Stage 2 (Platform Template Selection)
            stage2 = await client.post(
                f"/api/admin/websites/custom-requests/{req_id}/stage-select-template",
                json={"template_id": "apex_precision"},
                headers={"Authorization": f"Bearer {a_token}"}
            )
            assert stage2.status_code == 200
            assert stage2.json()["ok"] is True
            assert stage2.json()["template_id"] == "apex_precision"

            # 10. Extensible Section CRUD: Company Owner adds a service
            sec_create = await client.post(
                "/api/websites/sections",
                json={
                    "section_key": "services",
                    "title": "Precision CNC Milling",
                    "subtitle": "S/01",
                    "description": "High tolerance 5-axis CNC job-work for aerospace and tooling.",
                    "icon_or_image": "https://example.com/cnc.jpg",
                    "metadata_json": {"turnaround": "48 Hours", "capacity": "5-Axis VMC"}
                },
                headers={"Authorization": f"Bearer {u_token}"}
            )
            assert sec_create.status_code == 201
            sec_id = sec_create.json()["id"]

            # 11. List sections
            sec_list = await client.get("/api/websites/sections?section_key=services", headers={"Authorization": f"Bearer {u_token}"})
            assert sec_list.status_code == 200
            assert len(sec_list.json()) == 1
            assert sec_list.json()[0]["title"] == "Precision CNC Milling"

            # 12. Stage 3: Deploy & Link
            stage3 = await client.post(
                f"/api/admin/websites/custom-requests/{req_id}/stage-deploy",
                headers={"Authorization": f"Bearer {a_token}"}
            )
            assert stage3.status_code == 200
            assert stage3.json()["status"] == "DEPLOYED"

            # 13. Verify public site resolver returns the company's live services
            public_site = await client.get("/api/public/site/indianindustrialplatform.com")
            assert public_site.status_code == 200
            assert public_site.json()["company"]["name"] == "Apex Tools Pvt Ltd"
            assert public_site.json()["website"]["template_id"] == "apex_precision"
            assert len(public_site.json()["services"]) == 1
            assert public_site.json()["services"][0]["name"] == "Precision CNC Milling"
            assert public_site.json()["services"][0]["code"] == "S/01"

            # 14. Delete section
            del_sec = await client.delete(f"/api/websites/sections/{sec_id}", headers={"Authorization": f"Bearer {u_token}"})
            assert del_sec.status_code == 200
    finally:
        app.dependency_overrides.clear()
        server_module.AsyncSessionLocal = orig_session_local
