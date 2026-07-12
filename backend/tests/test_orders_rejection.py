import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def buyer_token(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "priya@buyer.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]["id"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def _clear_cookies(s):
    s.cookies.clear()
    yield


def test_order_rejection_lifecycle(s, buyer_token):
    buyer_tok, buyer_id = buyer_token

    # 1. Place a mock order
    order_payload = {
        "items": [
            {
                "product_id": "dummy-prod-123",
                "name": "Heavy Duty Industrial Drill",
                "qty": 2,
                "price": "₹2,500",
                "image_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c",
                "company_name": "Bharat Steel Industries"
            }
        ],
        "subtotal": 5000.0,
        "delivery_cost": 0.0,
        "gst": 900.0,
        "total": 5900.0,
        "delivery_option": "free",
        "payment_method": "upi",
        "address": "Peenya Industrial Area, Bengaluru"
    }

    r = s.post(f"{API}/orders", json=order_payload, headers=h(buyer_tok))
    assert r.status_code == 200, r.text
    order = r.json()
    order_id = order["id"]
    assert order["status"] == "pending"

    # 2. Reject the order (should succeed since it is fresh)
    r = s.post(f"{API}/orders/{order_id}/reject", headers=h(buyer_tok))
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    assert r.json()["status"] == "rejected"

    # 3. Retrieve order details to confirm persistence
    r = s.get(f"{API}/orders/{order_id}", headers=h(buyer_tok))
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
