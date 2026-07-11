"""Iteration 4 tests: Cloudinary signature, extended company fields, owner CRUD, admin dashboard, post comments."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://iip-marketplace.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def manu_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def buyer_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": "priya@buyer.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": "admin@iip.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def bharat_id():
    s = requests.Session()
    comps = s.get(f"{API}/companies").json()
    return next(c for c in comps if c["name"] == "Bharat Steel Industries")["id"]


# ---------- Cloudinary Signature ----------
class TestCloudinary:
    def test_signature_requires_auth(self):
        r = requests.get(f"{API}/cloudinary/signature")
        assert r.status_code == 401

    def test_signature_with_auth_returns_params(self, manu_session):
        r = manu_session.get(f"{API}/cloudinary/signature")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("signature", "timestamp", "cloud_name", "api_key", "folder", "resource_type"):
            assert k in data, f"missing key {k}: {data}"
        assert data["cloud_name"] == "dhpr9hbd9"
        assert data["api_key"] == "286658534363315"
        assert data["folder"].startswith("iip/")
        assert isinstance(data["timestamp"], int)
        assert isinstance(data["signature"], str) and len(data["signature"]) > 10

    def test_signature_rejects_bad_folder(self, manu_session):
        r = manu_session.get(f"{API}/cloudinary/signature", params={"folder": "evil/uploads"})
        assert r.status_code == 400

    def test_signature_video_resource(self, manu_session):
        r = manu_session.get(f"{API}/cloudinary/signature", params={"resource_type": "video", "folder": "iip/reels"})
        assert r.status_code == 200
        assert r.json()["resource_type"] == "video"


# ---------- Company Extended Fields & PATCH ----------
class TestCompanyExtended:
    def test_owner_sees_is_owner_and_extended_fields(self, manu_session, bharat_id):
        r = manu_session.get(f"{API}/companies/{bharat_id}")
        assert r.status_code == 200
        c = r.json()
        assert c["is_owner"] is True
        assert c["gst"] == "27AABCB1234C1Z5"
        assert c["pan"] == "AABCB1234C"
        assert c["owner_name"] == "Rajesh Kumar"
        assert c["business_type"] == "Manufacturer"
        assert c["year_established"] == 1998
        assert c["address"] and "Pune" in c["address"]
        assert c["website"]
        assert c["employees"] == "200-500"
        assert isinstance(c["certifications"], list) and len(c["certifications"]) >= 2

    def test_buyer_is_not_owner(self, buyer_session, bharat_id):
        r = buyer_session.get(f"{API}/companies/{bharat_id}")
        assert r.status_code == 200
        assert r.json()["is_owner"] is False

    def test_owner_can_patch_company(self, manu_session, bharat_id):
        new_desc = f"TEST updated description {uuid.uuid4().hex[:6]}"
        r = manu_session.patch(f"{API}/companies/{bharat_id}", json={"description": new_desc})
        assert r.status_code == 200, r.text
        assert r.json()["description"] == new_desc
        # GET to verify persistence
        verify = manu_session.get(f"{API}/companies/{bharat_id}").json()
        assert verify["description"] == new_desc

    def test_non_owner_cannot_patch(self, buyer_session, bharat_id):
        r = buyer_session.patch(f"{API}/companies/{bharat_id}", json={"description": "hacked"})
        assert r.status_code == 403


# ---------- Products CRUD ----------
class TestProductCRUD:
    def test_owner_create_update_delete(self, manu_session):
        # Create
        payload = {
            "name": "TEST Product " + uuid.uuid4().hex[:6],
            "category": "Steel",
            "image_url": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600",
            "images": ["https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600"],
            "price": "₹100/kg",
            "moq": "100 kg",
            "description": "Test product desc",
        }
        r = manu_session.post(f"{API}/products", json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        pid = prod["id"]
        assert prod["moq"] == "100 kg"
        assert prod["description"] == "Test product desc"

        # Patch
        r = manu_session.patch(f"{API}/products/{pid}", json={**payload, "price": "₹150/kg"})
        assert r.status_code == 200
        assert r.json()["price"] == "₹150/kg"

        # GET to verify
        all_prods = manu_session.get(f"{API}/products").json()
        assert any(p["id"] == pid and p["price"] == "₹150/kg" for p in all_prods)

        # Delete
        r = manu_session.delete(f"{API}/products/{pid}")
        assert r.status_code == 200
        # Verify gone
        all_prods = manu_session.get(f"{API}/products").json()
        assert not any(p["id"] == pid for p in all_prods)

    def test_non_owner_cannot_delete(self, manu_session, buyer_session):
        # Create as owner
        payload = {
            "name": "TEST DelGuard " + uuid.uuid4().hex[:6],
            "category": "Steel",
            "image_url": "https://example.com/img.jpg",
        }
        r = manu_session.post(f"{API}/products", json=payload)
        assert r.status_code == 200
        pid = r.json()["id"]

        # Non-owner cannot delete
        r = buyer_session.delete(f"{API}/products/{pid}")
        assert r.status_code == 403

        # Cleanup
        manu_session.delete(f"{API}/products/{pid}")


# ---------- Post / Reel Delete + Comments ----------
class TestPostReelDelete:
    def test_post_delete_owner_only(self, manu_session, buyer_session):
        # Create a post
        r = manu_session.post(f"{API}/posts", json={
            "content": "TEST post delete",
            "media_type": "text",
        })
        assert r.status_code == 200
        post_id = r.json()["id"]

        # Buyer cannot delete
        assert buyer_session.delete(f"{API}/posts/{post_id}").status_code == 403

        # Owner can delete
        assert manu_session.delete(f"{API}/posts/{post_id}").status_code == 200

    def test_reel_delete_owner_only(self, manu_session, buyer_session):
        r = manu_session.post(f"{API}/reels", json={
            "content": "TEST reel delete",
            "video_url": "https://example.com/video.mp4",
            "thumbnail_url": "https://example.com/thumb.jpg",
        })
        assert r.status_code == 200
        rid = r.json()["id"]

        assert buyer_session.delete(f"{API}/reels/{rid}").status_code == 403
        assert manu_session.delete(f"{API}/reels/{rid}").status_code == 200


class TestPostComments:
    def test_create_and_list_post_comments(self, manu_session, buyer_session):
        # Create a post
        r = manu_session.post(f"{API}/posts", json={"content": "TEST comments", "media_type": "text"})
        assert r.status_code == 200
        post_id = r.json()["id"]

        # Buyer comments
        text = "TEST comment " + uuid.uuid4().hex[:6]
        r = buyer_session.post(f"{API}/posts/{post_id}/comments", json={"text": text})
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["text"] == text
        assert c["user_name"]

        # GET
        r = manu_session.get(f"{API}/posts/{post_id}/comments")
        assert r.status_code == 200
        assert any(x["text"] == text for x in r.json())

        # Cleanup
        manu_session.delete(f"{API}/posts/{post_id}")


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats_requires_admin(self, buyer_session):
        r = buyer_session.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_admin_stats_returns_counts(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ("users", "companies", "posts", "reels", "products", "enquiries", "jobs", "follows"):
            assert k in data, f"missing {k}"
            assert isinstance(data[k], int)
        assert data["companies"] >= 4
        assert data["users"] >= 5

    def test_admin_companies_list(self, admin_session, buyer_session):
        # Forbidden to non-admin
        assert buyer_session.get(f"{API}/admin/companies").status_code == 403
        r = admin_session.get(f"{API}/admin/companies")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4

    def test_admin_delete_company_cascades(self, admin_session):
        # Create a TEST company by registering a TEST manufacturer
        s = requests.Session()
        u = uuid.uuid4().hex[:8]
        reg = s.post(f"{API}/auth/register", json={
            "name": f"TEST Cascade {u}", "email": f"test_cascade_{u}@example.com",
            "mobile": f"9100{u[:7]}", "password": "pass12345",
            "role": "manufacturer", "company_name": f"TEST Cascade Co {u}",
        })
        assert reg.status_code == 200
        cid = reg.json()["user"]["company_id"]
        assert cid

        # Add post + reel + product
        s.post(f"{API}/posts", json={"content": "TEST cascade post", "media_type": "text"})
        s.post(f"{API}/reels", json={"content": "TEST", "video_url": "https://x/v.mp4"})
        s.post(f"{API}/products", json={
            "name": "TEST cascade product", "category": "Steel",
            "image_url": "https://x/i.jpg",
        })

        # Admin deletes
        r = admin_session.delete(f"{API}/admin/companies/{cid}")
        assert r.status_code == 200

        # Verify company gone
        assert admin_session.get(f"{API}/companies/{cid}").status_code == 404
