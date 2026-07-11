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
    data = r.json()
    return data["token"], data["user"]["id"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def _clear_cookies(s):
    s.cookies.clear()
    yield


def test_job_application_lifecycle(s, manu_token, buyer_token):
    buyer_tok, buyer_id = buyer_token

    # 1. Recruiter lists jobs to find one
    r = s.get(f"{API}/jobs")
    assert r.status_code == 200
    jobs = r.json()
    assert len(jobs) > 0
    
    # Select Pune job (Bharat Steel)
    target_job = next((j for j in jobs if j["company_name"] == "Bharat Steel Industries"), jobs[0])
    job_id = target_job["id"]

    # 2. Buyer applies with Form details and file upload
    payload = {
        "name": "Priya Iyer",
        "phone": "919800012345",
        "location_preferred": "Pune, Maharashtra",
        "qualification": "B.Tech Mechanical Engineering"
    }
    files = {
        "resume": ("resume.pdf", b"%PDF-1.4 mock content for testing", "application/pdf")
    }
    
    r = s.post(f"{API}/jobs/{job_id}/apply", data=payload, files=files, headers=h(buyer_tok))
    assert r.status_code == 200, r.text
    
    # 3. Recruiter lists applications for this job
    r = s.get(f"{API}/jobs/{job_id}/applications", headers=h(manu_token))
    assert r.status_code == 200, r.text
    apps = r.json()
    
    # Verify Priya's application details exist
    priya_app = next((a for a in apps if a["user_id"] == buyer_id), None)
    assert priya_app is not None
    assert priya_app["name"] == "Priya Iyer"
    assert priya_app["phone"] == "919800012345"
    assert priya_app["location_preferred"] == "Pune, Maharashtra"
    assert priya_app["qualification"] == "B.Tech Mechanical Engineering"
    assert priya_app["resume_filename"] == f"{buyer_id}.pdf"
    assert priya_app["resume_url"] == f"/VacancyResume/{job_id}/{buyer_id}.pdf"

    # 4. Verify resume file can be retrieved via the static file server
    resume_url = f"{BASE_URL}{priya_app['resume_url']}"
    r_file = s.get(resume_url)
    assert r_file.status_code == 200
    assert r_file.content == b"%PDF-1.4 mock content for testing"
