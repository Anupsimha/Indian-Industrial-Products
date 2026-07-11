import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def manu_token(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def buyer_token(s):
    r = s.post(f"{API}/auth/login", json={"identifier": "priya@buyer.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def _clear_cookies(s):
    s.cookies.clear()
    yield


def test_list_jobs(s):
    r = s.get(f"{API}/jobs")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert "title" in data[0]
    assert "company_name" in data[0]


def test_create_job_buyer_denied(s, buyer_token):
    payload = {
        "title": "Unauthorised Role",
        "location": "Bangalore, KA",
        "type": "Full Time",
        "salary": "₹5-8 LPA",
        "description": "This should fail because role is buyer."
    }
    r = s.post(f"{API}/jobs", json=payload, headers=h(buyer_token))
    assert r.status_code == 403


def test_job_crud_lifecycle(s, manu_token):
    # 1. Create
    payload = {
        "title": "CNC Laser Operator",
        "location": "Peenya, Bangalore",
        "type": "Contract",
        "salary": "₹3-4 LPA",
        "description": "Operate high precision fiber laser cutting machines."
    }
    r = s.post(f"{API}/jobs", json=payload, headers=h(manu_token))
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["title"] == "CNC Laser Operator"
    assert job["company_name"] == "Bharat Steel Industries"
    assert job["posted"] == "Just now"
    job_id = job["id"]

    # 2. List My Jobs
    r = s.get(f"{API}/jobs/my", headers=h(manu_token))
    assert r.status_code == 200
    my_jobs = r.json()
    assert any(j["id"] == job_id for j in my_jobs)

    # 3. Update
    r = s.patch(
        f"{API}/jobs/{job_id}",
        json={"title": "Senior CNC Laser Operator", "salary": "₹4-5 LPA"},
        headers=h(manu_token)
    )
    assert r.status_code == 200
    updated_job = r.json()
    assert updated_job["title"] == "Senior CNC Laser Operator"
    assert updated_job["salary"] == "₹4-5 LPA"

    # 4. Delete
    r = s.delete(f"{API}/jobs/{job_id}", headers=h(manu_token))
    assert r.status_code == 200
    
    # 5. Verify deleted
    r = s.get(f"{API}/jobs/my", headers=h(manu_token))
    assert r.status_code == 200
    my_jobs_after = r.json()
    assert not any(j["id"] == job_id for j in my_jobs_after)
