import hashlib
import hmac
import json
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import server
from server import (
    Base,
    Company,
    Enquiry,
    IndustrialGroup,
    SellerWallet,
    Service,
    User,
    app,
    create_token,
    get_db,
    hash_password,
    now_iso,
)
from services.recommendation.engine import RecommendationEngine
from services.recommendation.extractor import LeadProfileExtractor


def _rzp_sig(order_id: str, payment_id: str) -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(server.RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {create_token(user_id)}"}


@pytest.fixture
async def test_env(monkeypatch, tmp_path):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with Session() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(server, "AsyncSessionLocal", Session)
    try:
        import backend.server as _bserver

        app.dependency_overrides[_bserver.get_db] = override_get_db
        monkeypatch.setattr(_bserver, "AsyncSessionLocal", Session)
    except ImportError:
        pass

    monkeypatch.setattr(server, "ENQUIRY_MEDIA_DIR", tmp_path / "enquiry_media")
    monkeypatch.setattr(server, "UPLOADS_DIR", tmp_path / "uploads")
    monkeypatch.setattr(server, "VACANCY_RESUME_DIR", tmp_path / "resumes")
    server.ENQUIRY_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    server.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    server.VACANCY_RESUME_DIR.mkdir(parents=True, exist_ok=True)

    server._revoked_token_hashes.clear()
    server._otp_failed_attempts.clear()
    server._auth_rate_buckets.clear()
    server._razorpay_order_intents.clear()

    async def _spy_email(*args, **kwargs):
        return True

    monkeypatch.setattr(server, "send_email", _spy_email)
    try:
        import backend.server as _bserver

        monkeypatch.setattr(_bserver, "send_email", _spy_email)
    except ImportError:
        pass

    class _FakeResp:
        status_code = 200
        text = "{}"

        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    _order_seq = {"n": 0}

    def _fake_requests_post(url, json=None, auth=None, timeout=10):
        _order_seq["n"] += 1
        amt = (json or {}).get("amount", 0)
        return _FakeResp({"id": f"order_rzp_{amt}_{_order_seq['n']}"})

    import requests

    monkeypatch.setattr(requests, "post", _fake_requests_post)

    async with Session() as s:
        now = now_iso()
        s.add_all(
            [
                User(
                    id="admin_1",
                    name="Platform Admin",
                    email="admin@test.com",
                    mobile="9100000000",
                    password_hash=hash_password("Pass123!"),
                    role="admin",
                    is_verified=True,
                    created_at=now,
                ),
                User(
                    id="buyer_1",
                    name="Priya Buyer",
                    email="buyer@test.com",
                    mobile="9100000001",
                    password_hash=hash_password("Pass123!"),
                    role="buyer",
                    is_verified=True,
                    created_at=now,
                ),
                User(
                    id="sp_1",
                    name="Ramesh Partner",
                    email="sp@test.com",
                    mobile="9100000002",
                    password_hash=hash_password("Pass123!"),
                    role="sales_partner",
                    is_verified=True,
                    created_at=now,
                ),
                User(
                    id="mfg_owner_1",
                    name="Vikram Mfg",
                    email="mfg1@test.com",
                    mobile="9100000003",
                    password_hash=hash_password("Pass123!"),
                    role="manufacturer",
                    company_id="comp_1",
                    is_verified=True,
                    created_at=now,
                ),
                User(
                    id="sup_owner_2",
                    name="Sonal Services",
                    email="sup2@test.com",
                    mobile="9100000004",
                    password_hash=hash_password("Pass123!"),
                    role="supplier",
                    company_id="comp_2",
                    is_verified=True,
                    created_at=now,
                ),
                Company(
                    id="comp_1",
                    name="Precision CNC Pvt Ltd",
                    description="CNC manufacturing and automation",
                    location="Pune, Maharashtra",
                    logo_url="https://example.com/logo1.png",
                    category="Machinery",
                    mobile="9100000003",
                    whatsapp="9100000003",
                    email="mfg1@test.com",
                    owner_id="mfg_owner_1",
                    provider_type="both",
                    created_at=now,
                ),
                Company(
                    id="comp_2",
                    name="Apex Calibration Services",
                    description="Industrial calibration & audit specialists",
                    location="Bengaluru, Karnataka",
                    logo_url="https://example.com/logo2.png",
                    category="Testing & Calibration",
                    mobile="9100000004",
                    whatsapp="9100000004",
                    email="sup2@test.com",
                    owner_id="sup_owner_2",
                    provider_type="service",
                    created_at=now,
                ),
                IndustrialGroup(
                    id="grp_pune_1",
                    name="Pune Chakan MIDC",
                    slug="pune-chakan-midc",
                    location="Pune, Maharashtra",
                    description="Pune industrial belt",
                    image_url="",
                    created_at=now,
                ),
            ]
        )
        await s.commit()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, Session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.anyio
async def test_company_provider_type_registration_filtering_and_update(test_env):
    client, _ = test_env

    # 1. Register Manufacturer with provider_type="both"
    reg_mfg = await client.post(
        "/api/auth/register",
        json={
            "name": "Meera Dual",
            "email": "meera@dual.com",
            "mobile": "9200000001",
            "password": "Password123!",
            "role": "manufacturer",
            "company_name": "Dual Tech Industries",
            "provider_type": "both",
        },
    )
    assert reg_mfg.status_code == 200, reg_mfg.text
    mfg_cid = reg_mfg.json()["user"]["company_id"]
    mfg_token = reg_mfg.json()["token"]

    # 2. Register Supplier with provider_type="service"
    reg_svc = await client.post(
        "/api/auth/register",
        json={
            "name": "Arjun Service",
            "email": "arjun@service.com",
            "mobile": "9200000002",
            "password": "Password123!",
            "role": "supplier",
            "company_name": "Arjun Maintenance Co",
            "provider_type": "service",
        },
    )
    assert reg_svc.status_code == 200, reg_svc.text
    svc_cid = reg_svc.json()["user"]["company_id"]
    svc_token = reg_svc.json()["token"]

    # 3. Register Manufacturer omitting provider_type -> defaults to "product"
    reg_prod = await client.post(
        "/api/auth/register",
        json={
            "name": "Kiran Prod",
            "email": "kiran@prod.com",
            "mobile": "9200000003",
            "password": "Password123!",
            "role": "manufacturer",
            "company_name": "Kiran Steel Co",
        },
    )
    assert reg_prod.status_code == 200, reg_prod.text
    prod_cid = reg_prod.json()["user"]["company_id"]

    # Verify serialized provider_type on GET /companies/{id}
    assert (await client.get(f"/api/companies/{mfg_cid}")).json()["provider_type"] == "both"
    assert (await client.get(f"/api/companies/{svc_cid}")).json()["provider_type"] == "service"
    assert (await client.get(f"/api/companies/{prod_cid}")).json()["provider_type"] == "product"

    # 4. Filter GET /api/companies?provider_type=service -> returns "service" and "both", excludes "product"
    svc_list = (await client.get("/api/companies?provider_type=service")).json()
    svc_ids = {c["id"] for c in svc_list}
    assert svc_cid in svc_ids
    assert mfg_cid in svc_ids
    assert prod_cid not in svc_ids
    assert all(c["provider_type"] in ("service", "both") for c in svc_list)

    # 5. Filter GET /api/companies?provider_type=product -> returns "product" and "both", excludes "service"
    prod_list = (await client.get("/api/companies?provider_type=product")).json()
    prod_ids = {c["id"] for c in prod_list}
    assert prod_cid in prod_ids
    assert mfg_cid in prod_ids
    assert svc_cid not in prod_ids
    assert all(c["provider_type"] in ("product", "both") for c in prod_list)

    # 6. Filter GET /api/companies?provider_type=both -> only "both"
    both_list = (await client.get("/api/companies?provider_type=both")).json()
    both_ids = {c["id"] for c in both_list}
    assert mfg_cid in both_ids
    assert svc_cid not in both_ids
    assert prod_cid not in both_ids
    assert all(c["provider_type"] == "both" for c in both_list)

    # 7. Invalid provider_type filter -> 400
    assert (await client.get("/api/companies?provider_type=invalid")).status_code == 400

    # 8. PATCH /api/companies/{id} updates provider_type cleanly and preserves when omitted
    patch_res = await client.patch(
        f"/api/companies/{svc_cid}",
        json={"provider_type": "both"},
        headers={"Authorization": f"Bearer {svc_token}"},
    )
    assert patch_res.status_code == 200, patch_res.text
    assert patch_res.json()["provider_type"] == "both"

    patch_desc = await client.patch(
        f"/api/companies/{svc_cid}",
        json={"description": "Now offering products and maintenance"},
        headers={"Authorization": f"Bearer {svc_token}"},
    )
    assert patch_desc.status_code == 200, patch_desc.text
    assert patch_desc.json()["provider_type"] == "both"

    # Non-owner forbidden
    assert (
        await client.patch(
            f"/api/companies/{svc_cid}",
            json={"provider_type": "product"},
            headers={"Authorization": f"Bearer {mfg_token}"},
        )
    ).status_code == 403


@pytest.mark.anyio
async def test_services_crud_permissions_and_filtering(test_env):
    client, _ = test_env

    # 1. Buyer & Sales Partner without company cannot create services (403)
    service_payload = {
        "name": "CNC Spindle Overhaul & Calibration",
        "category": "Industrial Maintenance",
        "description": "Full spindle alignment and vibration diagnostics",
        "pricing_model": "Per Project",
        "price_range": "₹35,000 - ₹90,000",
        "service_mode": "On-site",
        "service_area": "Pune, Chakan MIDC",
        "turnaround_time": "3-5 Business Days",
        "experience_years": 12,
        "certifications": ["ISO 9001", "NABL Accredited"],
        "location": "Pune",
    }
    assert (await client.post("/api/services", json=service_payload, headers=_auth("buyer_1"))).status_code == 403
    assert (await client.post("/api/services", json=service_payload, headers=_auth("sp_1"))).status_code == 403
    assert (await client.post("/api/services", json=service_payload)).status_code == 401

    # 2. Owner cannot create a service for another company
    bad_target = {**service_payload, "company_id": "comp_2"}
    assert (await client.post("/api/services", json=bad_target, headers=_auth("mfg_owner_1"))).status_code == 403

    # 3. Owner creates service #1
    res1 = await client.post("/api/services", json=service_payload, headers=_auth("mfg_owner_1"))
    assert res1.status_code == 201, res1.text
    svc1 = res1.json()
    assert svc1["company_id"] == "comp_1"
    assert svc1["company_name"] == "Precision CNC Pvt Ltd"
    assert svc1["company_whatsapp"] == "9100000003"
    assert svc1["company_provider_type"] == "both"
    assert svc1["pricing_model"] == "Per Project"
    assert svc1["service_mode"] == "On-site"
    assert svc1["experience_years"] == 12
    assert svc1["certifications"] == ["ISO 9001", "NABL Accredited"]

    # 4. Second company owner creates Remote service #2 and inactive service #3
    res2 = await client.post(
        "/api/services",
        json={
            "name": "CAD/CAM Remote Consulting",
            "category": "Engineering Design",
            "description": "Remote tooling & CAM simulation",
            "pricing_model": "Per Hour",
            "price_range": "₹1,500/hr",
            "service_mode": "Remote",
            "service_area": "Pan India",
            "turnaround_time": "24 Hours",
            "experience_years": 8,
            "location": "Bengaluru",
        },
        headers=_auth("sup_owner_2"),
    )
    assert res2.status_code == 201, res2.text
    svc2 = res2.json()

    res3 = await client.post(
        "/api/services",
        json={
            "name": "Archived Audit Service",
            "category": "Compliance",
            "pricing_model": "Fixed",
            "service_mode": "On-site",
            "is_active": False,
        },
        headers=_auth("sup_owner_2"),
    )
    assert res3.status_code == 201
    svc3_id = res3.json()["id"]

    # 5. Admin creates service for comp_2
    res4 = await client.post(
        "/api/services",
        json={
            "company_id": "comp_2",
            "name": "NABL Thermal Calibration",
            "category": "Testing & Calibration",
            "pricing_model": "Starting From",
            "price_range": "₹8,000",
            "service_mode": "Both",
            "location": "Bengaluru",
        },
        headers=_auth("admin_1"),
    )
    assert res4.status_code == 201, res4.text
    assert res4.json()["company_id"] == "comp_2"

    # 6. List & filter /api/services
    all_svcs = (await client.get("/api/services")).json()
    all_ids = {s["id"] for s in all_svcs}
    assert svc1["id"] in all_ids
    assert svc2["id"] in all_ids
    assert svc3_id not in all_ids  # inactive excluded

    remote_svcs = (await client.get("/api/services?service_mode=Remote")).json()
    assert len(remote_svcs) == 1
    assert remote_svcs[0]["id"] == svc2["id"]

    cat_svcs = (await client.get("/api/services?category=Industrial Maintenance")).json()
    assert len(cat_svcs) == 1
    assert cat_svcs[0]["id"] == svc1["id"]

    q_svcs = (await client.get("/api/services?q=Chakan")).json()
    assert [s["id"] for s in q_svcs] == [svc1["id"]]

    loc_svcs = (await client.get("/api/services?location=Bengaluru")).json()
    assert {s["id"] for s in loc_svcs} == {svc2["id"], res4.json()["id"]}

    # 7. Get single service and company services
    single = await client.get(f"/api/services/{svc1['id']}")
    assert single.status_code == 200
    assert single.json()["name"] == "CNC Spindle Overhaul & Calibration"
    assert (await client.get("/api/services/nonexistent-id")).status_code == 404

    comp2_svcs = await client.get("/api/companies/comp_2/services")
    assert comp2_svcs.status_code == 200
    assert {s["id"] for s in comp2_svcs.json()} == {svc2["id"], res4.json()["id"]}
    assert (await client.get("/api/companies/nonexistent-comp/services")).status_code == 404

    # 8. Authorization on PATCH and DELETE
    assert (
        await client.patch(
            f"/api/services/{svc1['id']}",
            json={"price_range": "₹100"},
            headers=_auth("buyer_1"),
        )
    ).status_code == 403
    assert (
        await client.patch(
            f"/api/services/{svc1['id']}",
            json={"price_range": "₹100"},
            headers=_auth("sup_owner_2"),
        )
    ).status_code == 403
    assert (await client.delete(f"/api/services/{svc1['id']}", headers=_auth("buyer_1"))).status_code == 403
    assert (await client.delete(f"/api/services/{svc1['id']}", headers=_auth("sup_owner_2"))).status_code == 403

    # 9. Owner updates service #1
    upd = await client.patch(
        f"/api/services/{svc1['id']}",
        json={
            "pricing_model": "Starting From",
            "service_mode": "Both",
            "experience_years": 15,
            "turnaround_time": "48 Hours",
        },
        headers=_auth("mfg_owner_1"),
    )
    assert upd.status_code == 200, upd.text
    upd_json = upd.json()
    assert upd_json["pricing_model"] == "Starting From"
    assert upd_json["service_mode"] == "Both"
    assert upd_json["experience_years"] == 15
    assert upd_json["turnaround_time"] == "48 Hours"

    # 10. Owner deletes service #2
    del_res = await client.delete(f"/api/services/{svc2['id']}", headers=_auth("sup_owner_2"))
    assert del_res.status_code == 200
    assert del_res.json()["ok"] is True
    assert (await client.get(f"/api/services/{svc2['id']}")).status_code == 404


@pytest.mark.anyio
async def test_multitype_leads_creation_filtering_and_masking(test_env):
    client, _ = test_env

    # 1. Product lead (multipart form, omitted lead_type -> defaults to "product")
    prod_res = await client.post(
        "/api/enquiries",
        data={
            "name": "Rahul Sharma",
            "mobile": "9811112222",
            "requirement": "Need 500 SS 304 Flanges",
            "category": "Steel & Metals",
            "location": "Pune, Maharashtra",
            "product_name": "SS 304 Flanges",
        },
        headers=_auth("buyer_1"),
    )
    assert prod_res.status_code == 200, prod_res.text
    prod_lead = prod_res.json()
    assert prod_lead["lead_type"] == "product"
    assert prod_lead["lead_metadata"] == {}

    # 2. Service lead (multipart form with JSON lead_metadata and no product_name)
    svc_meta = {
        "service_name": "ISO 9001 Plant Audit & Calibration",
        "service_mode": "On-site",
        "frequency": "Annual",
    }
    svc_res = await client.post(
        "/api/enquiries",
        data={
            "name": "Neha Kulkarni",
            "mobile": "9822223333",
            "requirement": "Annual calibration and quality audit for Pune plant",
            "category": "Testing & Calibration",
            "location": "Pune, Maharashtra",
            "industrial_area": "Chakan MIDC",
            "lead_type": "service",
            "lead_metadata": json.dumps(svc_meta),
        },
        headers=_auth("buyer_1"),
    )
    assert svc_res.status_code == 200, svc_res.text
    svc_lead = svc_res.json()
    assert svc_lead["lead_type"] == "service"
    assert svc_lead["lead_metadata"] == svc_meta
    assert svc_lead["product_name"] is None

    # 3. Real estate lead (multipart form with JSON lead_metadata)
    re_meta = {
        "property_type": "Industrial Shed",
        "transaction_type": "Lease",
        "area_sqft": 18000,
        "power_load_kva": 300,
    }
    re_res = await client.post(
        "/api/enquiries",
        data={
            "name": "Sandeep Patil",
            "mobile": "9833334444",
            "requirement": "18,000 sq ft industrial shed with EOT crane provision in Chakan",
            "category": "Industrial Real Estate",
            "location": "Pune, Maharashtra",
            "industrial_area": "Chakan MIDC",
            "lead_type": "real_estate",
            "lead_metadata": json.dumps(re_meta),
        },
        headers=_auth("buyer_1"),
    )
    assert re_res.status_code == 200, re_res.text
    re_lead = re_res.json()
    assert re_lead["lead_type"] == "real_estate"
    assert re_lead["lead_metadata"] == re_meta

    # 4. Validation errors for bad lead_type or malformed lead_metadata
    bad_lt = await client.post(
        "/api/enquiries",
        data={
            "name": "Bad Type",
            "mobile": "9844445555",
            "requirement": "Invalid type",
            "lead_type": "crypto",
        },
    )
    assert bad_lt.status_code == 400

    bad_json_meta = await client.post(
        "/api/enquiries",
        data={
            "name": "Bad Meta",
            "mobile": "9844445556",
            "requirement": "Invalid json meta",
            "lead_type": "service",
            "lead_metadata": "{invalid-json",
        },
    )
    assert bad_json_meta.status_code == 400

    non_dict_meta = await client.post(
        "/api/enquiries",
        data={
            "name": "Array Meta",
            "mobile": "9844445557",
            "requirement": "Non dict meta",
            "lead_type": "service",
            "lead_metadata": '["a", "b"]',
        },
    )
    assert non_dict_meta.status_code == 400

    # 5. Filter GET /api/requirements?lead_type=service (unauthenticated masks contacts)
    req_svc = await client.get("/api/requirements?lead_type=service")
    assert req_svc.status_code == 200
    svc_items = req_svc.json()
    assert [x["id"] for x in svc_items] == [svc_lead["id"]]
    assert svc_items[0]["lead_type"] == "service"
    assert svc_items[0]["lead_metadata"] == svc_meta
    assert svc_items[0]["is_unlocked"] is False
    assert svc_items[0]["mobile"] != "9822223333"
    assert svc_items[0]["name"] == "Neha"

    # 6. Filter GET /api/requirements?lead_type=real_estate (unauthenticated masks contacts)
    req_re = await client.get("/api/requirements?lead_type=real_estate")
    assert req_re.status_code == 200
    re_items = req_re.json()
    assert [x["id"] for x in re_items] == [re_lead["id"]]
    assert re_items[0]["lead_type"] == "real_estate"
    assert re_items[0]["lead_metadata"] == re_meta
    assert re_items[0]["is_unlocked"] is False
    assert re_items[0]["mobile"] != "9833334444"
    assert re_items[0]["name"] == "Sandeep"

    # 7. Filter GET /api/requirements?lead_type=product
    req_prod = await client.get("/api/requirements?lead_type=product")
    assert req_prod.status_code == 200
    assert [x["id"] for x in req_prod.json()] == [prod_lead["id"]]

    # 8. Filter GET /api/requirements/my?lead_type=...
    my_re = await client.get("/api/requirements/my?lead_type=real_estate", headers=_auth("buyer_1"))
    assert my_re.status_code == 200
    assert [x["id"] for x in my_re.json()] == [re_lead["id"]]

    # 9. Filter GET /api/industrial-groups/{group_id}/leads?lead_type=...
    grp_re = await client.get("/api/industrial-groups/grp_pune_1/leads?lead_type=real_estate")
    assert grp_re.status_code == 200
    assert [x["id"] for x in grp_re.json()] == [re_lead["id"]]
    assert grp_re.json()[0]["mobile"] != "9833334444"

    # 10. Dealership enquiry via JSON + FormData and filtering
    dealer_meta = {
        "territory_region": "Maharashtra & Goa",
        "investment_budget": "₹25 Lakh",
        "business_experience": "8 years industrial distribution",
    }
    dealer_json_res = await client.post(
        "/api/enquiries",
        json={
            "name": "Amit Deshmukh",
            "mobile": "9877771111",
            "requirement": "Seeking authorized dealership for CNC tooling across Maharashtra",
            "category": "Machinery",
            "location": "Pune, Maharashtra",
            "product_name": "Dealership - Maharashtra & Goa",
            "lead_type": "dealership",
            "lead_metadata": dealer_meta,
        },
        headers=_auth("buyer_1"),
    )
    assert dealer_json_res.status_code == 200, dealer_json_res.text
    dealer_lead = dealer_json_res.json()
    assert dealer_lead["lead_type"] == "dealership"
    assert dealer_lead["lead_metadata"] == dealer_meta

    dealer_fd_res = await client.post(
        "/api/enquiries",
        data={
            "name": "Rohan Joshi",
            "mobile": "9877772222",
            "requirement": "Authorized distributor inquiry for Gujarat industrial belt",
            "category": "Electrical",
            "location": "Ahmedabad, Gujarat",
            "lead_type": "dealership",
            "lead_metadata": json.dumps({"territory_region": "Gujarat"}),
        },
        headers=_auth("buyer_1"),
    )
    assert dealer_fd_res.status_code == 200, dealer_fd_res.text
    dealer_fd_lead = dealer_fd_res.json()
    assert dealer_fd_lead["lead_type"] == "dealership"
    assert dealer_fd_lead["lead_metadata"] == {"territory_region": "Gujarat"}

    req_dealer = await client.get("/api/requirements?lead_type=dealership")
    assert req_dealer.status_code == 200
    dealer_ids = {x["id"] for x in req_dealer.json()}
    assert dealer_ids == {dealer_lead["id"], dealer_fd_lead["id"]}
    assert all(x["lead_type"] == "dealership" for x in req_dealer.json())


@pytest.mark.anyio
async def test_sales_partner_real_estate_and_service_lead_escrow_flow(test_env):
    client, Session = test_env

    # 1. Sales Partner posts a real_estate lead with total_deal_value=200000 -> lead_value=4000
    re_meta = {
        "property_type": "Warehouse",
        "transaction_type": "Lease",
        "area_sqft": 20000,
    }
    post_re = await client.post(
        "/api/sales-partner/leads",
        json={
            "name": "Devendra Estates",
            "mobile": "9855556666",
            "requirement": "20,000 sq ft logistics warehouse near Bhiwandi",
            "category": "Industrial Real Estate",
            "location": "Bhiwandi, Maharashtra",
            "lead_type": "real_estate",
            "lead_metadata": re_meta,
            "total_deal_value": 200000,
        },
        headers=_auth("sp_1"),
    )
    assert post_re.status_code == 200, post_re.text
    lead = post_re.json()
    lead_id = lead["id"]
    assert lead["lead_type"] == "real_estate"
    assert lead["lead_metadata"] == re_meta
    assert lead["product_name"] is None
    assert lead["is_sales_partner_lead"] is True
    assert lead["total_deal_value"] == 200000.0
    assert lead["lead_value"] == 4000.0

    # 2. Buyer creates Razorpay order -> 4000 + 720 GST = 4720
    ord_res = await client.post(
        f"/api/sales-partner/leads/{lead_id}/create-order",
        headers=_auth("buyer_1"),
    )
    assert ord_res.status_code == 200, ord_res.text
    ord_data = ord_res.json()
    assert ord_data["base_price"] == 4000.0
    assert ord_data["gst"] == 720.0
    assert ord_data["total"] == 4720.0
    assert ord_data["partner_share_amount"] == 2000.0

    # 3. Verify payment -> unlocks contact, sets is_sold_out, holds 2000 in SP pending escrow
    pay_id = "pay_re_test_001"
    ver_res = await client.post(
        f"/api/sales-partner/leads/{lead_id}/verify-payment",
        json={
            "razorpay_order_id": ord_data["order_id"],
            "razorpay_payment_id": pay_id,
            "razorpay_signature": _rzp_sig(ord_data["order_id"], pay_id),
        },
        headers=_auth("buyer_1"),
    )
    assert ver_res.status_code == 200, ver_res.text
    ver_data = ver_res.json()
    assert ver_data["ok"] is True
    assert ver_data["mobile"] == "9855556666"
    assert ver_data["deal"]["lead_value_base"] == 4000.0
    assert ver_data["deal"]["gst_amount"] == 720.0
    assert ver_data["deal"]["total_paid"] == 4720.0
    assert ver_data["deal"]["status"] == "UNLOCKED"

    async with Session() as s:
        sp_wallet = (
            await s.execute(select(SellerWallet).where(SellerWallet.company_id == "sp_1"))
        ).scalar_one()
        assert sp_wallet.pending_balance == 2000.0
        enq_row = (await s.execute(select(Enquiry).where(Enquiry.id == lead_id))).scalar_one()
        assert enq_row.is_sold_out is True
        assert enq_row.lead_type == "real_estate"

    # 4. Also verify Sales Partner service lead pricing (2% + 18% GST)
    post_svc = await client.post(
        "/api/sales-partner/leads",
        json={
            "name": "Gaurav Operations",
            "mobile": "9866667777",
            "requirement": "Annual HVAC chiller servicing contract",
            "category": "HVAC Services",
            "location": "Ahmedabad, Gujarat",
            "lead_type": "service",
            "lead_metadata": {"service_name": "Chiller AMC", "service_mode": "On-site"},
            "total_deal_value": 100000,
        },
        headers=_auth("sp_1"),
    )
    assert post_svc.status_code == 200, post_svc.text
    svc_lead = post_svc.json()
    assert svc_lead["lead_value"] == 2000.0
    svc_ord = (
        await client.post(
            f"/api/sales-partner/leads/{svc_lead['id']}/create-order",
            headers=_auth("mfg_owner_1"),
        )
    ).json()
    assert svc_ord["base_price"] == 2000.0
    assert svc_ord["gst"] == 360.0
    assert svc_ord["total"] == 2360.0


@pytest.mark.anyio
async def test_recommendation_extractor_multitype_leads(test_env):
    _, Session = test_env

    extractor = LeadProfileExtractor()
    now = now_iso()
    svc_enq = Enquiry(
        id="rec_svc_1",
        name="Client A",
        mobile="9900000001",
        requirement="Need preventive maintenance for industrial compressors",
        category="Plant Maintenance",
        location="Pune",
        product_name=None,
        lead_type="service",
        lead_metadata={
            "service_name": "Compressor Overhaul",
            "scope": ["Vibration Analysis", "Bearing Replacement"],
        },
        status="new",
        created_at=now,
    )
    re_enq = Enquiry(
        id="rec_re_1",
        name="Client B",
        mobile="9900000002",
        requirement="Looking for ready-to-move factory space",
        category="Industrial Real Estate",
        location="Chennai",
        product_name=None,
        lead_type="real_estate",
        lead_metadata={
            "property_type": "Warehouse",
            "transaction_type": "Lease",
            "amenities": ["Crane Bay", "Dock Leveler"],
        },
        status="new",
        created_at=now,
    )
    empty_meta_dict = {
        "id": "rec_empty_meta",
        "category": "Consulting",
        "product_name": None,
        "requirement": "Need ISO audit support",
        "lead_metadata": None,
        "location": "Mumbai",
    }

    profile = extractor.build_profile([svc_enq, re_enq, empty_meta_dict])
    assert "Plant Maintenance" in profile.categories
    assert "Industrial Real Estate" in profile.categories
    assert "overhaul" in profile.keywords
    assert "vibration" in profile.keywords
    assert "warehouse" in profile.keywords
    assert "lease" in profile.keywords
    assert "crane" in profile.keywords
    assert "audit" in profile.keywords
    assert "pune" in profile.locations
    assert "chennai" in profile.locations

    # Also test full RecommendationEngine against SQLite DB with product_name=None leads
    async with Session() as s:
        s.add_all(
            [
                svc_enq,
                re_enq,
                Enquiry(
                    id="rec_svc_candidate",
                    name="Client C",
                    mobile="9900000003",
                    requirement="Compressor vibration check and overhaul needed",
                    category="Plant Maintenance",
                    location="Pune",
                    product_name=None,
                    lead_type="service",
                    lead_metadata={"service_name": "Compressor Service"},
                    status="new",
                    created_at=now,
                ),
            ]
        )
        await s.commit()

        engine = RecommendationEngine()
        res = await engine.get_recommended_leads(s, ["rec_svc_1"], limit=5)
        assert res.total_count >= 1
        assert any(item.id == "rec_svc_candidate" for item in res.items)

