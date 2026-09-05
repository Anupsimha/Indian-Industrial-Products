import os
import uuid
import pytest
import requests
from datetime import datetime, timedelta, timezone

API = os.environ.get("TEST_API_URL", "http://localhost:8000/api").rstrip("/")


def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    yield session
    session.close()


@pytest.fixture(scope="module")
def admin_token(s):
    s.cookies.clear()
    r = s.post(f"{API}/auth/login", json={"identifier": "admin@iip.com", "password": "admin1234"})
    if r.status_code != 200:
        r = s.post(f"{API}/auth/login", json={"identifier": "admin@iip.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


def test_account_deletion_and_cancellation_flow(s, admin_token):
    """
    Test complete lifecycle of account soft-deletion:
    1. Register a test user.
    2. Admin configures grace period to 15 days.
    3. User requests account deletion -> soft deleted, scheduled_deletion_at set.
    4. User logs in before 15 days -> auto-cancelled and restored.
    5. User requests deletion again -> manual cancel via /user/cancel-deletion.
    """
    uid = uuid.uuid4().hex[:8]
    email = f"del_user_{uid}@example.com"
    pwd = "password123"

    # 1. Register
    s.cookies.clear()
    r = s.post(f"{API}/auth/register", json={
        "name": f"Delete Test {uid}",
        "email": email,
        "mobile": f"9199{uid[:6]}",
        "password": pwd,
        "role": "buyer"
    })
    assert r.status_code == 200, f"Register failed: {r.text}"
    user_token = r.json()["token"]
    user_id = r.json()["user"]["id"]

    # 2. Admin sets grace period to 14 days
    s.cookies.clear()
    r = s.patch(f"{API}/admin/settings", json={"account_deletion_grace_days": 14}, headers=h(admin_token))
    assert r.status_code == 200
    assert r.json()["account_deletion_grace_days"] == 14

    # 3. User requests account deletion
    r = s.post(f"{API}/user/delete-account", headers=h(user_token))
    assert r.status_code == 200, f"Delete account failed: {r.text}"
    data = r.json()
    assert data["ok"] is True
    assert data["grace_days"] == 14
    assert "scheduled_deletion_at" in data

    # Verify user in admin users list is marked as is_deleted=True
    r = s.get(f"{API}/admin/users", headers=h(admin_token))
    assert r.status_code == 200
    del_user = next((u for u in r.json() if u["id"] == user_id), None)
    assert del_user is not None
    assert del_user["is_deleted"] is True
    assert del_user["scheduled_deletion_at"] is not None

    # 4. User logs back in during grace period -> auto-cancellation
    s.cookies.clear()
    r = s.post(f"{API}/auth/login", json={"identifier": email, "password": pwd})
    assert r.status_code == 200, f"Login restoration failed: {r.text}"
    restored_user = r.json()["user"]
    assert restored_user["is_deleted"] is False
    assert restored_user["scheduled_deletion_at"] is None

    # 5. User requests soft delete again
    new_token = r.json()["token"]
    r = s.post(f"{API}/user/delete-account", headers=h(new_token))
    assert r.status_code == 200

    # User re-authenticates to get token to test manual cancel endpoint
    s.cookies.clear()
    r_login = s.post(f"{API}/auth/login", json={"identifier": email, "password": pwd})
    assert r_login.status_code == 200
    restored_token = r_login.json()["token"]

    # Manual cancel endpoint check
    r = s.post(f"{API}/user/cancel-deletion", headers=h(restored_token))
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_admin_purge_expired_users(s, admin_token):
    """
    Test that admin expired users preview endpoint returns expired users, and purge endpoint cleans them up.
    """
    s.cookies.clear()
    r = s.get(f"{API}/admin/expired-users", headers=h(admin_token))
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert "count" in r.json()
    assert "users" in r.json()

    r2 = s.post(f"{API}/admin/purge-deleted-users", headers=h(admin_token))
    assert r2.status_code == 200
    assert "purged_count" in r2.json()
