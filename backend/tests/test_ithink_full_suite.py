import unittest
import os
import sys
from unittest.mock import patch, MagicMock

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set mock env variables for testing
os.environ["ITHINK_ACCESS_TOKEN"] = "test_access_token_123"
os.environ["ITHINK_SECRET_KEY"] = "test_secret_key_456"
os.environ["ITHINK_BASE_URL"] = "https://my.ithinklogistics.com/api_v3"
os.environ["ITHINK_DEFAULT_PICKUP_PINCODE"] = "560073"

import ithink_utils
from ithink_utils import (
    sanitize_phone,
    get_ithink_auth_payload,
    register_ithink_warehouse,
    fetch_ithink_shipping_rates,
    create_ithink_order,
    track_ithink_shipment
)


class TestIThinkUtilsComprehensive(unittest.TestCase):

    def test_sanitize_phone_variants(self):
        # Valid 10-digit numbers
        self.assertEqual(sanitize_phone("9876543210"), "9876543210")
        self.assertEqual(sanitize_phone("8123456789"), "8123456789")
        self.assertEqual(sanitize_phone("7000011111"), "7000011111")
        self.assertEqual(sanitize_phone("6333344444"), "6333344444")
        
        # Prefixed numbers (+91, 0, spaces)
        self.assertEqual(sanitize_phone("+91 98765 43210"), "9876543210")
        self.assertEqual(sanitize_phone("09876543210"), "9876543210")
        self.assertEqual(sanitize_phone("919876543210"), "9876543210")
        self.assertEqual(sanitize_phone("+91 09876543210"), "9876543210")
        
        # Invalid numbers
        self.assertIsNone(sanitize_phone("1234567890"))
        self.assertIsNone(sanitize_phone("5555555555"))
        self.assertIsNone(sanitize_phone("123"))
        self.assertIsNone(sanitize_phone(""))
        self.assertIsNone(sanitize_phone(None))

    def test_get_ithink_auth_payload(self):
        payload = get_ithink_auth_payload()
        self.assertEqual(payload["access_token"], "test_access_token_123")
        self.assertEqual(payload["secret_key"], "test_secret_key_456")

    # ------------------ WAREHOUSE REGISTRATION TESTS ------------------

    def test_register_warehouse_missing_credentials(self):
        with patch.object(ithink_utils, "ITHINK_ACCESS_TOKEN", ""):
            res = register_ithink_warehouse({"name": "Test"})
            self.assertFalse(res["ok"])
            self.assertIn("missing", res["error"].lower())

    def test_register_warehouse_missing_fields(self):
        res = register_ithink_warehouse({
            "name": "",
            "email": "",
            "mobile": "",
            "address": "",
            "pincode": ""
        })
        self.assertFalse(res["ok"])
        self.assertIn("Missing fields", res["error"])

    def test_register_warehouse_invalid_phone(self):
        res = register_ithink_warehouse({
            "name": "Bharat Steel",
            "email": "test@steel.com",
            "mobile": "12345",
            "address": "MIDC Pune",
            "pincode": "411026"
        })
        self.assertFalse(res["ok"])
        self.assertIn("Invalid mobile number", res["error"])

    @patch("requests.post")
    def test_register_warehouse_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "warehouse_id": 124621,
            "html_message": "Warehouse Added Successfully."
        }
        mock_post.return_value = mock_resp

        res = register_ithink_warehouse({
            "name": "Bharat Steel Industries",
            "email": "info@bharatsteel.com",
            "mobile": "9876543210",
            "address": "Plot 47, MIDC Industrial Area",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411026"
        })
        self.assertTrue(res["ok"])
        self.assertEqual(res["warehouse_code"], "124621")
        self.assertEqual(res["status"], "ACTIVE")

    @patch("requests.post")
    def test_register_warehouse_api_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "error",
            "html_message": "Invalid address provided"
        }
        mock_post.return_value = mock_resp

        res = register_ithink_warehouse({
            "name": "Bharat Steel",
            "email": "test@steel.com",
            "mobile": "9876543210",
            "address": "Test",
            "pincode": "411026"
        })
        self.assertFalse(res["ok"])
        self.assertIn("Invalid address", res["error"])

    @patch("requests.post")
    def test_register_warehouse_non_json(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.json.side_effect = Exception("Invalid JSON")
        mock_resp.text = "Server Error"
        mock_post.return_value = mock_resp

        res = register_ithink_warehouse({
            "name": "Bharat Steel",
            "email": "test@steel.com",
            "mobile": "9876543210",
            "address": "Test",
            "pincode": "411026"
        })
        self.assertFalse(res["ok"])

    @patch("requests.post")
    def test_register_warehouse_exception(self, mock_post):
        mock_post.side_effect = Exception("Connection Timeout")
        res = register_ithink_warehouse({
            "name": "Bharat Steel",
            "email": "test@steel.com",
            "mobile": "9876543210",
            "address": "Test",
            "pincode": "411026"
        })
        self.assertFalse(res["ok"])
        self.assertIn("Exception", res["error"])

    # ------------------ SHIPPING RATE CALCULATION TESTS ------------------

    def test_fetch_shipping_rates_missing_credentials(self):
        with patch.object(ithink_utils, "ITHINK_ACCESS_TOKEN", ""):
            res = fetch_ithink_shipping_rates(delivery_pincode="110001")
            self.assertFalse(res["ok"])

    def test_fetch_shipping_rates_invalid_delivery_pincode(self):
        res = fetch_ithink_shipping_rates(delivery_pincode="invalid_pin")
        self.assertFalse(res["ok"])
        self.assertIn("pincode", res["error"].lower())

    @patch("requests.post")
    def test_fetch_shipping_rates_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": [
                {
                    "logistic_id": "1",
                    "logistic_name": "Delhivery",
                    "service_type": "Surface",
                    "rate": "120.00",
                    "delivery_tat": "3-4",
                    "cod": "Y",
                    "weight_slab": "0.5"
                },
                {
                    "logistic_id": "2",
                    "logistic_name": "BlueDart",
                    "service_type": "Air",
                    "rate": "250.00",
                    "delivery_tat": "1-2",
                    "cod": "N",
                    "weight_slab": "0.5"
                }
            ],
            "expected_delivery_date": "3-4 Days",
            "zone": "A"
        }
        mock_post.return_value = mock_resp

        res = fetch_ithink_shipping_rates(
            delivery_pincode="110001",
            pickup_pincode="560073",
            weight_kg=1.5,
            cod=True
        )
        self.assertTrue(res["ok"])
        self.assertEqual(len(res["options"]), 2)
        self.assertEqual(res["options"][0]["courier_name"], "Delhivery Surface (via iThink)")
        self.assertEqual(res["options"][1]["badge"], "Express")

    @patch("requests.post")
    def test_fetch_shipping_rates_empty_couriers(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": [],
            "html_message": "No courier partners available"
        }
        mock_post.return_value = mock_resp

        res = fetch_ithink_shipping_rates(delivery_pincode="999999")
        self.assertFalse(res["ok"])
        self.assertIn("No courier", res["error"])

    @patch("requests.post")
    def test_fetch_shipping_rates_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_resp.json.side_effect = Exception("Not JSON")
        mock_post.return_value = mock_resp

        res = fetch_ithink_shipping_rates(delivery_pincode="110001")
        self.assertFalse(res["ok"])
        self.assertIn("500", res["error"])

    @patch("requests.post")
    def test_fetch_shipping_rates_exception(self, mock_post):
        mock_post.side_effect = Exception("Network Connection Refused")
        res = fetch_ithink_shipping_rates(delivery_pincode="110001")
        self.assertFalse(res["ok"])
        self.assertIn("Exception", res["error"])

    # ------------------ ORDER CREATION TESTS ------------------

    def test_create_order_missing_credentials(self):
        with patch.object(ithink_utils, "ITHINK_ACCESS_TOKEN", ""):
            res = create_ithink_order({"pickup_address_code": "123", "consignee_phone": "9876543210"})
            self.assertFalse(res["ok"])

    def test_create_order_missing_warehouse_code(self):
        res = create_ithink_order({"pickup_address_code": "", "consignee_phone": "9876543210"})
        self.assertFalse(res["ok"])
        self.assertIn("warehouse ID", res["error"])

    def test_create_order_invalid_phone(self):
        res = create_ithink_order({"pickup_address_code": "124621", "consignee_phone": "123"})
        self.assertFalse(res["ok"])
        self.assertIn("mobile number", res["error"])

    @patch("requests.post")
    def test_create_order_success_dict(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": {
                "1": {
                    "status": "success",
                    "waybill": "WAYBILL9988",
                    "refnum": "SHP-123456",
                    "logistic_name": "Delhivery Surface"
                }
            }
        }
        mock_post.return_value = mock_resp

        res = create_ithink_order({
            "order_number": "IIP-1001",
            "pickup_address_code": "124621",
            "consignee_name": "Rajesh Kumar",
            "consignee_phone": "9876543210",
            "consignee_email": "rajesh@example.com",
            "consignee_address": "MG Road, Pune",
            "consignee_pincode": "411001",
            "product_name": "TMT Bar 12mm",
            "quantity": 2,
            "product_value": 1500,
            "total_amount": 1600
        })
        self.assertTrue(res["ok"])
        self.assertEqual(res["awb_number"], "WAYBILL9988")
        self.assertEqual(res["courier_name"], "Delhivery Surface")

    @patch("requests.post")
    def test_create_order_success_list(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": [
                {
                    "status": "success",
                    "waybill": "WAYBILL_LIST_123",
                    "refnum": "SHP-1002",
                    "logistic_name": "Xpressbees"
                }
            ]
        }
        mock_post.return_value = mock_resp

        res = create_ithink_order({
            "order_number": "IIP-1002",
            "pickup_address_code": "124621",
            "consignee_phone": "9876543210"
        })
        self.assertTrue(res["ok"])
        self.assertEqual(res["awb_number"], "WAYBILL_LIST_123")

    @patch("requests.post")
    def test_create_order_insufficient_balance_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": {
                "1": {
                    "status": "error",
                    "remark": "Insufficient wallet balance.",
                    "refnum": "IIP-1001"
                }
            }
        }
        mock_post.return_value = mock_resp

        res = create_ithink_order({
            "order_number": "IIP-1001",
            "pickup_address_code": "124621",
            "consignee_phone": "9876543210"
        })
        self.assertFalse(res["ok"])
        self.assertIn("Insufficient wallet balance", res["error"])

    @patch("requests.post")
    def test_create_order_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.json.return_value = {"error": "Bad Request"}
        mock_post.return_value = mock_resp

        res = create_ithink_order({
            "pickup_address_code": "124621",
            "consignee_phone": "9876543210"
        })
        self.assertFalse(res["ok"])
        self.assertIn("400", res["error"])

    @patch("requests.post")
    def test_create_order_exception(self, mock_post):
        mock_post.side_effect = Exception("Order Post Exception")
        res = create_ithink_order({
            "pickup_address_code": "124621",
            "consignee_phone": "9876543210"
        })
        self.assertFalse(res["ok"])
        self.assertIn("Exception", res["error"])

    # ------------------ TRACKING TESTS ------------------

    def test_track_shipment_missing_awb(self):
        res = track_ithink_shipment("")
        self.assertFalse(res["ok"])
        self.assertIn("AWB number is required", res["error"])

    def test_track_shipment_missing_credentials(self):
        with patch.object(ithink_utils, "ITHINK_ACCESS_TOKEN", ""):
            res = track_ithink_shipment("AWB123")
            self.assertFalse(res["ok"])

    @patch("requests.post")
    def test_track_shipment_success_dict(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "data": {
                "AWB123": {
                    "shipment_status": "In Transit",
                    "courier_name": "Delhivery Surface",
                    "expected_delivery_date": "02-10-2026",
                    "scan_details": [
                        {
                            "scan_date_time": "29-09-2026 10:00:00",
                            "scan_location": "Bhosari Hub, Pune",
                            "status_name": "Picked Up",
                            "remark": "Shipment picked up from seller warehouse"
                        },
                        {
                            "scan_date_time": "29-09-2026 18:00:00",
                            "scan_location": "Chakan Sorting Center",
                            "status_name": "In Transit",
                            "remark": "In transit to destination city"
                        }
                    ]
                }
            }
        }
        mock_post.return_value = mock_resp

        res = track_ithink_shipment("AWB123")
        self.assertTrue(res["ok"])
        self.assertEqual(res["status"], "In Transit")
        self.assertEqual(res["courier_name"], "Delhivery Surface")
        self.assertEqual(len(res["scans"]), 2)
        self.assertEqual(res["scans"][0]["location"], "Bhosari Hub, Pune")

    @patch("requests.post")
    def test_track_shipment_success_list(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "shipment_status": "Out For Delivery",
                "courier_name": "Xpressbees",
                "scans": [
                    {
                        "date": "29-09-2026 08:00:00",
                        "city": "Bangalore",
                        "status": "Out For Delivery"
                    }
                ]
            }
        ]
        mock_post.return_value = mock_resp

        res = track_ithink_shipment("AWB456")
        self.assertTrue(res["ok"])
        self.assertEqual(res["status"], "Out For Delivery")
        self.assertEqual(len(res["scans"]), 1)

    @patch("requests.post")
    def test_track_shipment_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = "Tracking Not Found"
        mock_resp.json.side_effect = Exception("Not JSON")
        mock_post.return_value = mock_resp

        res = track_ithink_shipment("AWB_INVALID")
        self.assertFalse(res["ok"])
        self.assertIn("404", res["error"])

    @patch("requests.post")
    def test_track_shipment_exception(self, mock_post):
        mock_post.side_effect = Exception("Tracking Exception Error")
        res = track_ithink_shipment("AWB123")
        self.assertFalse(res["ok"])
        self.assertIn("Exception", res["error"])


if __name__ == '__main__':
    unittest.main()
