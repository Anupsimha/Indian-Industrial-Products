"""
test_ithink_logistics.py
------------------------
Unit and integration tests for iThink Logistics utility module.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ithink_utils import (
    sanitize_phone,
    register_ithink_warehouse,
    fetch_ithink_shipping_rates,
    create_ithink_order,
    track_ithink_shipment
)


def test_sanitize_phone():
    assert sanitize_phone("+91 9876543210") == "9876543210"
    assert sanitize_phone("09876543210") == "9876543210"
    assert sanitize_phone("9876543210") == "9876543210"
    assert sanitize_phone("12345") is None
    assert sanitize_phone("5876543210") is None  # Must start with 6,7,8,9


def test_register_ithink_warehouse():
    comp_data = {
        "id": "comp-test-12345678",
        "name": "Peenya Precision Steel Ltd",
        "owner_name": "Rajesh Kumar",
        "email": "rajesh@peenyasteel.com",
        "mobile": "+91 9876543210",
        "address": "Plot 12, Phase 1, Peenya Industrial Area",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560058",
        "gst": "29AABCB1234C1Z5"
    }

    res = register_ithink_warehouse(comp_data)
    assert res["ok"] is True
    assert "warehouse_code" in res
    assert res["warehouse_code"].startswith("WH_IIP_")
    assert res["status"] == "ACTIVE"


def test_register_ithink_warehouse_validation():
    invalid_comp = {
        "id": "comp-invalid",
        "name": "",
        "email": "",
    }
    res = register_ithink_warehouse(invalid_comp)
    assert res["ok"] is False
    assert "Missing fields" in res["error"]


def test_fetch_ithink_shipping_rates():
    res = fetch_ithink_shipping_rates(
        delivery_pincode="110001",
        weight_kg=2.5,
        cod=False,
        pickup_pincode="560058"
    )
    assert res["ok"] is True
    assert "options" in res
    assert len(res["options"]) > 0
    assert "courier_name" in res["options"][0]
    assert "rate" in res["options"][0]


def test_create_ithink_order():
    order_data = {
        "order_number": "IIP-TEST-9901",
        "pickup_address_code": "WH_IIP_COMP1234",
        "is_cod": False,
        "product_name": "Heavy Duty Industrial Lathe Chuck",
        "product_sku": "SKU-LATHE-01",
        "quantity": 1,
        "product_value": 4500,
        "shipping_cost": 185,
        "total_amount": 4685,
        "consignee_name": "Priya Sharma",
        "consignee_phone": "+91 9988776655",
        "consignee_email": "priya@buyer.com",
        "consignee_address": "Flat 201, TVS Residency",
        "consignee_pincode": "110001",
        "consignee_city": "New Delhi",
        "consignee_state": "Delhi",
        "weight": 2.5
    }

    res = create_ithink_order(order_data)
    assert res["ok"] is True
    assert "ithink_order_id" in res
    assert "awb_number" in res
    assert res["awb_number"].startswith("ITHK")


def test_track_ithink_shipment():
    res = track_ithink_shipment("ITHK1700000000")
    assert res["ok"] is True
    assert res["awb_number"] == "ITHK1700000000"
    assert "current_status" in res
