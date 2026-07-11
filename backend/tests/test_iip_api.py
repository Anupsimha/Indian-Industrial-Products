import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://iip-marketplace.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def manu_token(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["user"]["email"] == "rajesh@bharatsteel.com"
    return data["token"]


@pytest.fixture(scope="module")
def buyer_token(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "priya@buyer.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def _clear_cookies(s):
    """Backend prefers cookie over Authorization header. Clear cookies between tests
    so the Bearer token from h() is used (otherwise stale cookie from a previous
    register/login test will hijack the request)."""
    s.cookies.clear()
    yield


# ---------- Public seed data ----------
def test_companies(s):
    r = s.get(f"{API}/companies")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 4
    assert all("id" in c and "name" in c for c in data)


def test_posts(s):
    r = s.get(f"{API}/posts")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert "company_name" in data[0] and "likes_count" in data[0]


def test_reels(s):
    r = s.get(f"{API}/reels")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_products(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ---------- Auth ----------
def test_login_mobile(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "919999999999", "password": "admin123"})
    assert r.status_code == 200


def test_login_invalid(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "wrong"})
    assert r.status_code == 401


def test_me(s, manu_token):
    r = s.get(f"{API}/auth/me", headers=h(manu_token))
    assert r.status_code == 200
    assert r.json()["email"] == "rajesh@bharatsteel.com"


def test_register_manufacturer_creates_company(s):
    u = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST User {u}", "email": f"test_{u}@example.com",
        "mobile": f"9111{u[:7]}", "password": "pass12345",
        "role": "manufacturer", "company_name": f"TEST Co {u}",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["user"]["company_id"]
    # Verify via /me
    me = s.get(f"{API}/auth/me", headers=h(data["token"]))
    assert me.status_code == 200
    assert me.json()["company_id"] == data["user"]["company_id"]


# ---------- Enquiries / Leads ----------
def test_enquiry_and_leads_flow(s, manu_token):
    # fetch a company to attach enquiry
    comps = s.get(f"{API}/companies").json()
    bharat = next(c for c in comps if c["name"] == "Bharat Steel Industries")
    enq_payload = {
        "name": "TEST Buyer", "mobile": "919000111222",
        "requirement": "TEST 10 tons TMT bars", "category": "Steel",
        "location": "Mumbai", "company_id": bharat["id"],
    }
    r = s.post(f"{API}/enquiries", json=enq_payload)
    assert r.status_code == 200, r.text
    enq = r.json()
    assert enq["status"] == "new"

    # Manufacturer sees lead
    leads = s.get(f"{API}/enquiries", headers=h(manu_token))
    assert leads.status_code == 200
    ids = [e["id"] for e in leads.json()]
    assert enq["id"] in ids

    # Filter by status
    new_leads = s.get(f"{API}/enquiries?status=new", headers=h(manu_token)).json()
    assert all(x["status"] == "new" for x in new_leads)

    # Patch status
    pr = s.patch(f"{API}/enquiries/{enq['id']}/status?new_status=in_progress", headers=h(manu_token))
    assert pr.status_code == 200

    updated = s.get(f"{API}/enquiries?status=in_progress", headers=h(manu_token)).json()
    assert any(x["id"] == enq["id"] for x in updated)

    # Notification created for owner
    notifs = s.get(f"{API}/notifications", headers=h(manu_token)).json()
    assert any("New Lead" in n.get("title", "") for n in notifs)


def test_buyer_no_leads(s, buyer_token):
    r = s.get(f"{API}/enquiries", headers=h(buyer_token))
    assert r.status_code == 200
    assert r.json() == []


# ---------- Likes/Save/Follow ----------
def test_like_save_follow(s, buyer_token):
    posts = s.get(f"{API}/posts").json()
    pid = posts[0]["id"]
    r1 = s.post(f"{API}/posts/{pid}/like", headers=h(buyer_token))
    assert r1.status_code == 200 and r1.json()["liked"] is True
    r2 = s.post(f"{API}/posts/{pid}/like", headers=h(buyer_token))
    assert r2.json()["liked"] is False

    s.post(f"{API}/posts/{pid}/save", headers=h(buyer_token))
    bm = s.get(f"{API}/me/bookmarks", headers=h(buyer_token))
    assert bm.status_code == 200

    comps = s.get(f"{API}/companies").json()
    cid = comps[0]["id"]
    f1 = s.post(f"{API}/companies/{cid}/follow", headers=h(buyer_token))
    assert f1.status_code == 200 and f1.json()["following"] is True
    c = s.get(f"{API}/companies/{cid}", headers=h(buyer_token)).json()
    assert c["is_following"] is True and c["followers_count"] >= 1
    s.post(f"{API}/companies/{cid}/follow", headers=h(buyer_token))  # unfollow cleanup



# ---------- Jobs / Company Reels ----------
def test_jobs_endpoint(s):
    r = s.get(f"{API}/jobs")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 5
    # Validate shape
    j = data[0]
    for k in ("id", "title"):
        assert k in j


def test_company_reels_endpoint(s):
    comps = s.get(f"{API}/companies").json()
    bharat = next(c for c in comps if c["name"] == "Bharat Steel Industries")
    r = s.get(f"{API}/companies/{bharat['id']}/reels")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_login_sets_cookie(s):
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200
    # Should set httpOnly cookie
    cookie_names = [c.name for c in sess.cookies]
    assert any("token" in n.lower() or "session" in n.lower() or "auth" in n.lower() for n in cookie_names), f"No auth cookie set. Cookies: {cookie_names}"
    # /me with cookie
    me = sess.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "rajesh@bharatsteel.com"


def test_seeded_companies_and_posts_count(s):
    comps = s.get(f"{API}/companies").json()
    assert len(comps) >= 4
    posts = s.get(f"{API}/posts").json()
    assert len(posts) >= 6
    reels = s.get(f"{API}/reels").json()
    assert len(reels) >= 4
    products = s.get(f"{API}/products").json()
    assert len(products) >= 6


def test_bharat_seed_leads_present(s, manu_token):
    leads = s.get(f"{API}/enquiries", headers=h(manu_token)).json()
    assert len(leads) >= 3, f"Expected >=3 seeded leads for Bharat Steel, got {len(leads)}"
