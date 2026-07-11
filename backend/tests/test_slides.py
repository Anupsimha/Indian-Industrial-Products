import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
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
def buyer_token(s):
    return login(s, "priya@buyer.com", "demo123")

def h(tok):
    return {"Authorization": f"Bearer {tok}"}

def test_get_slides(s):
    # Verify public retrieval of slides
    r = s.get(f"{API}/slides")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 3
    assert all("id" in slide and "title" in slide and "cta" in slide for slide in data)

def test_admin_slides_crud(s, admin_token, buyer_token):
    payload = {
        "title": "Test Slide",
        "subtitle": "Test Subtitle",
        "image": "https://example.com/test.jpg",
        "cta": "Click Here",
        "accent": "from-red-500 to-transparent",
        "sort_order": 99
    }
    
    # 1. Non-admin should be forbidden (403)
    s.cookies.clear()
    r = s.post(f"{API}/admin/slides", json=payload, headers=h(buyer_token))
    assert r.status_code == 403

    # 2. Admin should successfully create slide
    s.cookies.clear()
    r = s.post(f"{API}/admin/slides", json=payload, headers=h(admin_token))
    assert r.status_code == 200
    slide = r.json()
    assert slide["title"] == "Test Slide"
    sid = slide["id"]

    # 3. Non-admin should be forbidden from updating slide
    s.cookies.clear()
    r = s.patch(f"{API}/admin/slides/{sid}", json={"title": "Updated Title"}, headers=h(buyer_token))
    assert r.status_code == 403

    # 4. Admin should successfully update slide
    s.cookies.clear()
    r = s.patch(f"{API}/admin/slides/{sid}", json={"title": "Updated Title"}, headers=h(admin_token))
    assert r.status_code == 200
    assert r.json()["title"] == "Updated Title"

    # 5. Non-admin should be forbidden from deleting slide
    s.cookies.clear()
    r = s.delete(f"{API}/admin/slides/{sid}", headers=h(buyer_token))
    assert r.status_code == 403

    # 6. Admin should successfully delete slide
    s.cookies.clear()
    r = s.delete(f"{API}/admin/slides/{sid}", headers=h(admin_token))
    assert r.status_code == 200

    # 7. Verification: Slide should no longer exist or not be in public list
    s.cookies.clear()
    r = s.get(f"{API}/slides")
    assert r.status_code == 200
    assert not any(slide["id"] == sid for slide in r.json())
