"""Iteration 5 tests - Categories CRUD, Areas hierarchical CRUD, Reels patch/save,
Plans CRUD, Requirements public feed + unlock flow, Admin analytics/users, Featured."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://iip-marketplace.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def login(session, email, password):
    session.cookies.clear()
    r = session.post(f"{API}/auth/login", json={"identifier": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token(s):
    return login(s, "admin@iip.com", "admin123")


@pytest.fixture(scope="module")
def manu_token(s):
    return login(s, "rajesh@bharatsteel.com", "demo123")


@pytest.fixture(scope="module")
def buyer_token(s):
    return login(s, "priya@buyer.com", "demo123")


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def _clear_cookies(s):
    s.cookies.clear()
    yield


# ---------- Categories ----------
def test_categories_seeded(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 21, f"Expected >=21 seeded categories, got {len(data)}"
    for c in data:
        assert "id" in c and "name" in c and "sort_order" in c


def test_admin_categories_crud(s, admin_token, buyer_token):
    name = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
    # non-admin 403
    r = s.post(f"{API}/admin/categories", json={"name": name, "sort_order": 99}, headers=h(buyer_token))
    assert r.status_code == 403
    # admin create
    r = s.post(f"{API}/admin/categories", json={"name": name, "sort_order": 99}, headers=h(admin_token))
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    # patch
    r = s.patch(f"{API}/admin/categories/{cid}", json={"name": name + "_upd", "sort_order": 100}, headers=h(admin_token))
    assert r.status_code == 200
    # verify
    cats = s.get(f"{API}/categories").json()
    assert any(c["id"] == cid and c["name"] == name + "_upd" for c in cats)
    # delete
    r = s.delete(f"{API}/admin/categories/{cid}", headers=h(admin_token))
    assert r.status_code == 200
    cats = s.get(f"{API}/categories").json()
    assert not any(c["id"] == cid for c in cats)


# ---------- Areas ----------
def test_areas_tree_structure(s):
    r = s.get(f"{API}/areas/tree")
    assert r.status_code == 200
    tree = r.json()
    assert "Karnataka" in tree
    assert "Bangalore" in tree["Karnataka"]
    bangalore = tree["Karnataka"]["Bangalore"]
    for a in ("Peenya", "Bommasandra", "Whitefield", "Electronic City"):
        assert a in bangalore, f"{a} missing in Bangalore areas"


def test_admin_areas_crud(s, admin_token, buyer_token):
    name = f"TEST_Area_{uuid.uuid4().hex[:6]}"
    payload = {"state": "TestState", "city": "TestCity", "name": name, "sort_order": 999}
    r = s.post(f"{API}/admin/areas", json=payload, headers=h(buyer_token))
    assert r.status_code == 403
    r = s.post(f"{API}/admin/areas", json=payload, headers=h(admin_token))
    assert r.status_code == 200
    aid = r.json()["id"]
    r = s.delete(f"{API}/admin/areas/{aid}", headers=h(admin_token))
    assert r.status_code == 200


# ---------- Enquiries with extra fields ----------
def test_enquiry_persists_extra_fields(s, admin_token):
    comps = s.get(f"{API}/companies").json()
    bharat = next(c for c in comps if c["name"] == "Bharat Steel Industries")
    payload = {
        "name": "TEST Iter5 Buyer",
        "mobile": "919987654321",
        "requirement": "TEST iter5 needs TMT bars urgently",
        "category": "Steel",
        "location": "Bangalore",
        "product_name": "TMT Bars 12mm",
        "quantity": "50 tons",
        "state": "Karnataka",
        "city": "Bangalore",
        "industrial_area": "Peenya",
        "company_id": bharat["id"],
    }
    r = s.post(f"{API}/enquiries", json=payload)
    assert r.status_code == 200, r.text
    enq = r.json()
    # Verify response includes the new fields (CRITICAL)
    assert enq.get("product_name") == "TMT Bars 12mm", f"product_name missing/wrong: {enq}"
    assert enq.get("quantity") == "50 tons"
    assert enq.get("state") == "Karnataka"
    assert enq.get("city") == "Bangalore"
    assert enq.get("industrial_area") == "Peenya"
    # Verify persistence via admin GET
    admin_enqs = s.get(f"{API}/enquiries", headers=h(admin_token)).json()
    match = next((e for e in admin_enqs if e["id"] == enq["id"]), None)
    assert match is not None
    assert match.get("industrial_area") == "Peenya"
    assert match.get("product_name") == "TMT Bars 12mm"


# ---------- Requirements feed ----------
def test_requirements_public_masked(s):
    r = s.get(f"{API}/requirements")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    item = data[0]
    assert item["is_unlocked"] is False
    assert "•" in item["mobile"], f"Mobile not masked: {item['mobile']}"
    # product_name & quantity & industrial_area keys exist
    for k in ("product_name", "quantity", "industrial_area"):
        assert k in item


def test_requirements_filter(s):
    # Filter by state/city/industrial_area - test that filter accepts these params
    r = s.get(f"{API}/requirements", params={"state": "Karnataka", "city": "Bangalore", "industrial_area": "Peenya"})
    assert r.status_code == 200
    data = r.json()
    # All returned items should match (case-insensitive regex)
    for item in data:
        if item.get("industrial_area"):
            assert "peenya" in item["industrial_area"].lower()


def test_requirements_unlock_flow(s, admin_token):
    """Buyer (Free) → 403 ; admin assigns Premium ; same unlock → 200 with mobile."""
    # Ensure there's an enquiry to unlock - create one
    comps = s.get(f"{API}/companies").json()
    bharat = next(c for c in comps if c["name"] == "Bharat Steel Industries")
    enq_payload = {
        "name": "TEST Unlock Buyer", "mobile": "919876543210",
        "requirement": "TEST unlock target", "category": "Steel", "location": "Bangalore",
        "company_id": bharat["id"],
    }
    enq = s.post(f"{API}/enquiries", json=enq_payload).json()
    enq_id = enq["id"]

    # Login as buyer - reset plan first by re-login
    buyer_tok = login(s, "priya@buyer.com", "demo123")
    buyer_me = s.get(f"{API}/auth/me", headers=h(buyer_tok)).json()
    buyer_id = buyer_me["id"]

    # Reset to free by assigning Free plan first
    plans = s.get(f"{API}/plans").json()
    free_plan = next((p for p in plans if p["name"] == "Free"), None)
    premium_plan = next((p for p in plans if p["name"] == "Premium"), None)
    assert free_plan and premium_plan
    s.cookies.clear()  # admin Bearer must take effect (cookie else shadows)
    s.post(f"{API}/admin/users/{buyer_id}/plan/{free_plan['id']}", headers=h(admin_token))

    # Re-login buyer to refresh plan claim in token? Token-based check uses DB plan_name, OK.
    s.cookies.clear()
    r = s.post(f"{API}/requirements/{enq_id}/unlock", headers=h(buyer_tok))
    assert r.status_code == 403, f"Expected 403 for free buyer, got {r.status_code}: {r.text}"

    # Admin assigns Premium
    s.cookies.clear()
    r = s.post(f"{API}/admin/users/{buyer_id}/plan/{premium_plan['id']}", headers=h(admin_token))
    assert r.status_code == 200

    # Now unlock should succeed
    s.cookies.clear()
    r = s.post(f"{API}/requirements/{enq_id}/unlock", headers=h(buyer_tok))
    assert r.status_code == 200, f"Expected 200 after premium, got {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("mobile") == "919876543210"

    # Reset buyer to Free for next test runs
    s.cookies.clear()
    s.post(f"{API}/admin/users/{buyer_id}/plan/{free_plan['id']}", headers=h(admin_token))


def test_requirements_admin_sees_unlocked(s, admin_token):
    r = s.get(f"{API}/requirements", headers=h(admin_token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    # Admin should see at least one with is_unlocked True and unmasked mobile
    unlocked = [d for d in data if d["is_unlocked"]]
    assert len(unlocked) >= 1
    assert "•" not in unlocked[0]["mobile"]


# ---------- Plans ----------
def test_plans_seeded(s):
    r = s.get(f"{API}/plans")
    assert r.status_code == 200
    plans = r.json()
    names = {p["name"] for p in plans}
    expected = {"Free", "Basic", "Premium", "SEO Boost", "Business Development", "Enterprise"}
    assert expected.issubset(names), f"Missing plans: {expected - names}"


def test_admin_plans_crud(s, admin_token, buyer_token):
    payload = {"name": f"TEST_Plan_{uuid.uuid4().hex[:6]}", "monthly_price": 100, "yearly_price": 1000,
               "currency": "INR", "features": ["x"], "color": "blue", "duration_days": 30}
    r = s.post(f"{API}/admin/plans", json=payload, headers=h(buyer_token))
    assert r.status_code == 403
    r = s.post(f"{API}/admin/plans", json=payload, headers=h(admin_token))
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # patch
    r = s.patch(f"{API}/admin/plans/{pid}", json={**payload, "monthly_price": 200}, headers=h(admin_token))
    assert r.status_code == 200 and r.json()["monthly_price"] == 200
    # delete
    r = s.delete(f"{API}/admin/plans/{pid}", headers=h(admin_token))
    assert r.status_code == 200


# ---------- Reels patch + save ----------
def test_reel_patch_owner_only(s, manu_token, buyer_token):
    reels = s.get(f"{API}/reels").json()
    # Find one owned by Bharat Steel
    me = s.get(f"{API}/auth/me", headers=h(manu_token)).json()
    own_reel = next((r for r in reels if r["company_id"] == me["company_id"]), None)
    assert own_reel, "Manufacturer has no reels in seed"
    rid = own_reel["id"]
    new_content = f"TEST iter5 updated {uuid.uuid4().hex[:6]}"
    # non-owner forbidden
    r = s.patch(f"{API}/reels/{rid}", json={"content": new_content}, headers=h(buyer_token))
    assert r.status_code == 403
    # owner ok
    r = s.patch(f"{API}/reels/{rid}", json={"content": new_content}, headers=h(manu_token))
    assert r.status_code == 200, r.text
    assert r.json()["content"] == new_content


def test_reel_save_toggle(s, buyer_token):
    reels = s.get(f"{API}/reels").json()
    rid = reels[0]["id"]
    r1 = s.post(f"{API}/reels/{rid}/save", headers=h(buyer_token))
    assert r1.status_code == 200
    state1 = r1.json()["saved"]
    r2 = s.post(f"{API}/reels/{rid}/save", headers=h(buyer_token))
    assert r2.json()["saved"] != state1


# ---------- Admin featured + analytics + users ----------
def test_admin_featured_company(s, admin_token):
    comps = s.get(f"{API}/companies").json()
    cid = comps[0]["id"]
    r = s.patch(f"{API}/admin/companies/{cid}/featured", params={"featured": True}, headers=h(admin_token))
    assert r.status_code == 200
    assert r.json()["is_featured"] is True


def test_admin_analytics(s, admin_token, buyer_token):
    r = s.get(f"{API}/admin/analytics", headers=h(buyer_token))
    assert r.status_code == 403
    r = s.get(f"{API}/admin/analytics", headers=h(admin_token))
    assert r.status_code == 200
    d = r.json()
    for k in ("users", "premium_users", "companies", "posts", "reels", "products",
              "enquiries", "new_leads", "in_progress_leads", "closed_leads",
              "conversion_rate", "post_engagement", "reel_engagement"):
        assert k in d, f"Missing analytics key: {k}"


def test_admin_users_list(s, admin_token, buyer_token):
    r = s.get(f"{API}/admin/users", headers=h(buyer_token))
    assert r.status_code == 403
    r = s.get(f"{API}/admin/users", headers=h(admin_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 3
