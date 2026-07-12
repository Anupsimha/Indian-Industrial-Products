import os
from pathlib import Path
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
ROOT_DIR = Path("/app")

@pytest.fixture(scope="module")
def s():
    return requests.Session()

@pytest.fixture(scope="module")
def auth_headers(s):
    # Log in as manufacturer
    r = s.post(f"{API}/auth/login", json={"identifier": "rajesh@bharatsteel.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    token = data["token"]
    user_id = data["user"]["id"]
    return {"Authorization": f"Bearer {token}"}, user_id

def test_product_image_restructure(s, auth_headers):
    headers, user_id = auth_headers
    
    # 1. Upload mock image to /api/upload
    files = {"file": ("test_product.png", b"fake-png-content", "image/png")}
    r = s.post(f"{API}/upload", files=files, headers=headers)
    assert r.status_code == 200, r.text
    upload_data = r.json()
    assert "secure_url" in upload_data
    
    uploaded_url = upload_data["secure_url"]
    assert "/uploads/" in uploaded_url
    
    # 2. Create a product with the uploaded image URL
    payload = {
        "name": "Heavy Duty Steel Girder",
        "category": "Steel Construction",
        "image_url": uploaded_url,
        "images": [uploaded_url],
        "price": "₹15,000/ton",
        "moq": "5 tons",
        "description": "Constructed with premium grade structural steel.",
        "stock_left": 100,
        "location": "Pune"
    }
    
    r = s.post(f"{API}/products", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    product_data = r.json()
    product_id = product_data["id"]
    
    # 3. Verify the product image URLs are restructured
    expected_image_url = f"/api/products-images/{user_id}-{product_id}.png"
    expected_extra_image = f"/api/products-images/{user_id}-{product_id}-0.png"
    
    assert product_data["image_url"] == expected_image_url
    assert len(product_data["images"]) == 1
    assert product_data["images"][0] == expected_extra_image
    
    # 4. Verify that the files exist in the products-images directory
    assert (ROOT_DIR / "products-images" / f"{user_id}-{product_id}.png").exists()
    assert (ROOT_DIR / "products-images" / f"{user_id}-{product_id}-0.png").exists()


def test_reels_upload_restructure(s, auth_headers):
    headers, user_id = auth_headers
    
    # 1. Upload mock video file under 10MB
    files = {"file": ("my_reel.mp4", b"fake-mp4-video-content-under-10mb", "video/mp4")}
    data = {"content": "Test Reel Upload Restructure"}
    
    r = s.post(f"{API}/reels", files=files, data=data, headers=headers)
    assert r.status_code == 200, r.text
    reel_data = r.json()
    reel_id = reel_data["id"]
    
    # 2. Verify that the video_url points to the reels-uploaded folder
    expected_video_url = f"/api/reels-uploaded/{user_id}-{reel_id}.mp4"
    assert reel_data["video_url"] == expected_video_url
    
    # 3. Verify that the file exists in the reels-uploaded directory
    assert (ROOT_DIR / "reels-uploaded" / f"{user_id}-{reel_id}.mp4").exists()


def test_reels_upload_size_limit(s, auth_headers):
    headers, user_id = auth_headers
    
    # 1. Try to upload a video larger than 10MB
    # 11MB = 11 * 1024 * 1024 bytes
    large_content = b"x" * (11 * 1024 * 1024)
    files = {"file": ("huge_reel.mp4", large_content, "video/mp4")}
    data = {"content": "Too large reel"}
    
    r = s.post(f"{API}/reels", files=files, data=data, headers=headers)
    assert r.status_code == 400, r.text
    assert "Video size must be less than 10 MB" in r.json()["detail"]


def test_cart_payment_gateway(s, auth_headers):
    headers, user_id = auth_headers
    
    # 1. Create a payment order for a cart total of 5000.50
    r = s.post(f"{API}/payments/create-order-cart", json={"amount": 5000.50}, headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "order_id" in data
    assert data["amount"] == 500050  # paise
    assert data["key"] == "rzp_test_TC7Rq6NgUW0TiB"
    
    # 2. Try to verify payment with invalid signature
    verify_payload = {
        "razorpay_payment_id": "pay_mock123",
        "razorpay_order_id": data["order_id"],
        "razorpay_signature": "invalid_sig"
    }
    r = s.post(f"{API}/payments/verify-cart", json=verify_payload, headers=headers)
    assert r.status_code == 400, r.text
    assert "verification failed" in r.json()["detail"]

    # 3. Create a free/0 amount cart order order_id
    r = s.post(f"{API}/payments/create-order-cart", json={"amount": 0}, headers=headers)
    assert r.status_code == 200, r.text
    free_data = r.json()
    assert free_data["order_id"] == "free_cart"
    assert free_data["amount"] == 0


def test_url_sanitization():
    import sys
    sys.path.append("/app")
    from server import clean_product_url, clean_reel_url
    assert clean_product_url("http://localhost:8000/products-images/user-prod.png") == "/api/products-images/user-prod.png"
    assert clean_product_url("http://backend:8000/products-images/user-prod.png") == "/api/products-images/user-prod.png"
    assert clean_product_url("/products-images/user-prod.png") == "/api/products-images/user-prod.png"
    assert clean_product_url("http://localhost:8000/uploads/file.png") == "/api/uploads/file.png"
    
    assert clean_reel_url("http://localhost:8000/reels-uploaded/user-reel.mp4") == "/api/reels-uploaded/user-reel.mp4"
    assert clean_reel_url("http://backend:8000/reels-uploaded/user-reel.mp4") == "/api/reels-uploaded/user-reel.mp4"
    assert clean_reel_url("/reels-uploaded/user-reel.mp4") == "/api/reels-uploaded/user-reel.mp4"
