import os
import uuid
import pytest
import requests
import hmac
import hashlib

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"identifier": "admin@iip.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]

@pytest.fixture(scope="module")
def user1_token():
    # Priya (buyer)
    r = requests.post(f"{API}/auth/login", json={"identifier": "priya@buyer.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]["id"]

@pytest.fixture(scope="module")
def user2_token():
    # Rajesh (manufacturer)
    r = requests.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]["id"]

def h(tok):
    return {"Authorization": f"Bearer {tok}"}

def test_chat_lifecycle_and_moderation(user1_token, user2_token):
    tok1, uid1 = user1_token
    tok2, uid2 = user2_token

    # 1. User 1 sends message containing personal details
    msg_text = "Hi, my phone is +91-9876543210 and my email is test@xyz.com. Let's connect!"
    r = requests.post(f"{API}/chats/messages", json={"receiver_id": uid2, "message": msg_text}, headers=h(tok1))
    assert r.status_code == 200, r.text
    sent_msg = r.json()
    
    # Verify moderation: phone and email should be blocked/censored
    assert "[blocked email]" in sent_msg["message"]
    assert "[blocked number]" in sent_msg["message"]
    assert "+91-9876543210" not in sent_msg["message"]
    assert "test@xyz.com" not in sent_msg["message"]

    # 2. User 2 fetches messages history
    r = requests.get(f"{API}/chats/messages/{uid1}", headers=h(tok2))
    assert r.status_code == 200, r.text
    msgs = r.json()
    assert len(msgs) >= 1
    assert msgs[-1]["id"] == sent_msg["id"]
    assert msgs[-1]["message"] == sent_msg["message"]

    # 3. User 2 checks active conversations
    r = requests.get(f"{API}/chats/conversations", headers=h(tok2))
    assert r.status_code == 200, r.text
    convs = r.json()
    assert len(convs) >= 1
    priya_convo = next((c for c in convs if c["partner_id"] == uid1), None)
    assert priya_convo is not None
    assert priya_convo["partner_name"] == "Priya Iyer"
    assert priya_convo["last_message"] == sent_msg["message"]

def test_payments_and_unlock_limits(user1_token, admin_token):
    tok1, uid1 = user1_token

    # 1. Fetch available plans to find Basic plan ID
    r = requests.get(f"{API}/plans")
    assert r.status_code == 200
    plans = r.json()
    free_plan = next(p for p in plans if p["name"] == "Free")
    basic_plan = next(p for p in plans if p["name"] == "Basic")
    
    # 2. Reset user1 to Free plan using admin endpoint
    r = requests.post(f"{API}/admin/users/{uid1}/plan/{free_plan['id']}", headers=h(admin_token))
    assert r.status_code == 200

    # 3. Find a requirements/lead to unlock
    r = requests.get(f"{API}/requirements")
    assert r.status_code == 200
    reqs = r.json()
    assert len(reqs) > 0
    target_req = reqs[0]
    req_id = target_req["id"]

    # 4. Try to unlock contact details - should fail because plan is Free
    me_res = requests.get(f"{API}/auth/me", headers=h(tok1))
    print("ME USER RETRIEVED:", me_res.json())
    
    r = requests.post(f"{API}/requirements/{req_id}/unlock", headers=h(tok1))
    assert r.status_code == 403, r.text

    # 5. Purchase Basic plan via payments API
    # Create order
    r = requests.post(f"{API}/payments/create-order", json={"plan_id": basic_plan["id"], "billing_cycle": "monthly"}, headers=h(tok1))
    assert r.status_code == 200, r.text
    order = r.json()
    assert "order_id" in order
    assert order["amount"] == int(basic_plan["monthly_price"] * 100)

    # Verify payment (generate mock signature)
    key_secret = "SlP4dzu1iYGRV902XsswqT2H"
    mock_payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    msg = f"{order['order_id']}|{mock_payment_id}"
    generated_sig = hmac.new(key_secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()

    r = requests.post(f"{API}/payments/verify", json={
        "razorpay_payment_id": mock_payment_id,
        "razorpay_order_id": order["order_id"],
        "razorpay_signature": generated_sig,
        "plan_id": basic_plan["id"],
        "billing_cycle": "monthly"
    }, headers=h(tok1))
    assert r.status_code == 200, r.text

    # Verify user's plan is now updated to Basic
    r = requests.get(f"{API}/auth/me", headers=h(tok1))
    assert r.status_code == 200
    me = r.json()
    assert me["plan_name"] == "Basic"

    # 6. Try to unlock contact details - should succeed now
    r = requests.post(f"{API}/requirements/{req_id}/unlock", headers=h(tok1))
    assert r.status_code == 200, r.text
    unlocked_data = r.json()
    assert "mobile" in unlocked_data
    assert unlocked_data["mobile"] != ""
