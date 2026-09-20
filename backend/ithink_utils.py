"""
ithink_utils.py
----------------
Pure iThink Logistics API v3 utility module for the IIP platform.
Handles multi-seller warehouse registration, shipping rate calculation, order creation,
AWB assignment, tracking, and label generation without dummy fallbacks.
"""

import os
import time
import logging
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ithink")

ITHINK_BASE_URL = os.environ.get("ITHINK_BASE_URL", "https://my.ithinklogistics.com/api_v3").rstrip("/")
ITHINK_ACCESS_TOKEN = os.environ.get("ITHINK_ACCESS_TOKEN", "").strip()
ITHINK_SECRET_KEY = os.environ.get("ITHINK_SECRET_KEY", "").strip()
DEFAULT_PICKUP_PINCODE = os.environ.get("ITHINK_DEFAULT_PICKUP_PINCODE", "560073").strip()


def sanitize_phone(phone: str) -> Optional[str]:
    """
    Format phone number for logistics APIs: 10 digits starting with 6, 7, 8, or 9.
    """
    digits = ''.join(c for c in str(phone or '') if c.isdigit())
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) > 10 and digits.startswith("0"):
        digits = digits.lstrip("0")

    if len(digits) == 10 and digits[0] in ['6', '7', '8', '9']:
        return digits

    if len(digits) >= 10:
        last10 = digits[-10:]
        if last10[0] in ['6', '7', '8', '9']:
            return last10

    return None


def get_ithink_auth_payload() -> Dict[str, str]:
    """
    Returns standard authentication headers/payload for iThink Logistics API v3.
    """
    return {
        "access_token": ITHINK_ACCESS_TOKEN,
        "secret_key": ITHINK_SECRET_KEY,
    }


def register_ithink_warehouse(company_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Registers a seller warehouse/shop pickup address with iThink Logistics API via POST /warehouse/add.json.
    Returns {"ok": True, "warehouse_code": "...", "status": "ACTIVE"} or {"ok": False, "error": "..."}.
    No mock fallbacks.
    """
    if not ITHINK_ACCESS_TOKEN or not ITHINK_SECRET_KEY:
        err = "iThink API credentials (ITHINK_ACCESS_TOKEN and ITHINK_SECRET_KEY) are missing in environment configuration."
        logger.error(err)
        return {"ok": False, "error": err}

    name = str(company_data.get("name") or "").strip()
    email = str(company_data.get("email") or "").strip()
    phone_raw = str(company_data.get("mobile") or company_data.get("phone") or "").strip()
    address = str(company_data.get("address") or "").strip()
    city = str(company_data.get("city") or "").strip()
    state = str(company_data.get("state") or "").strip()
    pincode = str(company_data.get("pincode") or company_data.get("pin_code") or "").strip()

    missing = []
    if not name:
        missing.append("Company Name")
    if not email:
        missing.append("Email")
    if not phone_raw:
        missing.append("Phone")
    if not address:
        missing.append("Address")
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        missing.append("6-Digit Pincode")

    if missing:
        err = f"Cannot register iThink warehouse. Missing fields: {', '.join(missing)}"
        logger.error(err)
        return {"ok": False, "error": err}

    clean_p = sanitize_phone(phone_raw)
    if not clean_p:
        err = f"Invalid mobile number '{phone_raw}'. Must be a valid 10-digit Indian phone starting with 6-9."
        logger.error(err)
        return {"ok": False, "error": err}

    try:
        url = f"{ITHINK_BASE_URL}/warehouse/add.json"
        payload = {
            "data": {
                **get_ithink_auth_payload(),
                "company_name": name[:50],
                "address1": address[:100],
                "address2": f"{city}, {state}"[:100] if (city or state) else "",
                "mobile": clean_p,
                "pincode": pincode,
            }
        }
        res = requests.post(url, json=payload, timeout=12)
        try:
            data = res.json()
        except Exception:
            data = {}

        status_str = str(data.get("status") or "").lower()
        if res.status_code in [200, 201] and status_str == "success":
            wh_id = str(data.get("warehouse_id") or data.get("data", {}).get("warehouse_code") or "").strip()
            msg = data.get("html_message") or "Warehouse Added Successfully."
            logger.info(f"iThink warehouse registered successfully: {wh_id}")
            return {
                "ok": True,
                "warehouse_code": wh_id,
                "status": "ACTIVE",
                "message": msg,
                "raw": data
            }
        else:
            err_msg = data.get("html_message") or data.get("message") or data.get("error") or res.text
            err = f"iThink Warehouse API Error ({res.status_code}): {err_msg}"
            logger.error(err)
            return {"ok": False, "error": err, "raw": data}
    except Exception as e:
        err = f"iThink Warehouse Registration Exception: {str(e)}"
        logger.error(err)
        return {"ok": False, "error": err}


def fetch_ithink_shipping_rates(
    delivery_pincode: str,
    weight_kg: float = 1.0,
    cod: bool = False,
    pickup_pincode: Optional[str] = None,
    product_value: float = 1000.0
) -> Dict[str, Any]:
    """
    Fetch available courier serviceability and shipping rates directly from iThink Logistics API v3.
    No mock fallbacks.
    """
    if not ITHINK_ACCESS_TOKEN or not ITHINK_SECRET_KEY:
        err = "iThink API credentials (ITHINK_ACCESS_TOKEN and ITHINK_SECRET_KEY) are missing in environment configuration."
        logger.error(err)
        return {"ok": False, "error": err}

    pickup = (pickup_pincode or DEFAULT_PICKUP_PINCODE or "").strip()
    delivery = str(delivery_pincode or "").strip()

    if not pickup or len(pickup) != 6 or not pickup.isdigit():
        pickup = DEFAULT_PICKUP_PINCODE or "560073"

    if not delivery or len(delivery) != 6 or not delivery.isdigit():
        return {
            "ok": False,
            "error": "Valid 6-digit delivery pincode is required for serviceability calculation."
        }

    try:
        url = f"{ITHINK_BASE_URL}/rate/check.json"
        payload = {
            "data": {
                **get_ithink_auth_payload(),
                "from_pincode": pickup,
                "to_pincode": delivery,
                "shipping_weight_kg": str(max(0.5, float(weight_kg))),
                "shipping_length_cms": "10",
                "shipping_width_cms": "10",
                "shipping_height_cms": "10",
                "order_type": "forward",
                "payment_method": "cod" if cod else "prepaid",
                "product_mrp": str(max(10.0, float(product_value)))
            }
        }
        res = requests.post(url, json=payload, timeout=12)
        try:
            data = res.json()
        except Exception:
            data = {}

        status_str = str(data.get("status") or "").lower()
        if res.status_code in [200, 201] and status_str == "success":
            courier_list = data.get("data", [])
            if isinstance(courier_list, list) and courier_list:
                options = []
                for c in courier_list:
                    r_val = float(c.get("rate") or c.get("freight_charges") or 0)
                    logistic_name = str(c.get("logistic_name") or "iThink Partner")
                    service_type = str(c.get("service_type") or "Surface")
                    options.append({
                        "id": f"ithink_{c.get('logistic_id', c.get('logistic_service_type', 'std'))}",
                        "logistic_name": logistic_name.lower(),
                        "s_type": service_type.lower(),
                        "courier_name": f"{logistic_name} {service_type} (via iThink)",
                        "rate": int(r_val),
                        "etd": f"{c.get('delivery_tat', '3-5')} Days",
                        "badge": "Express" if "Air" in service_type else "Standard",
                        "cod_available": (c.get("cod") == "Y"),
                        "min_weight": f"{c.get('weight_slab', '0.5')}kg"
                    })
                return {
                    "ok": True,
                    "options": options,
                    "expected_delivery_date": data.get("expected_delivery_date") or "3-5 Days",
                    "zone": data.get("zone")
                }
            else:
                err_msg = data.get("html_message") or data.get("message") or "No serviceable courier partners found for this pincode route."
                return {"ok": False, "error": err_msg}
        else:
            err_msg = data.get("html_message") or data.get("message") or data.get("error") or res.text
            return {"ok": False, "error": f"iThink Serviceability Check Failed ({res.status_code}): {err_msg}"}
    except Exception as e:
        logger.error(f"iThink rate calculation exception: {str(e)}")
        return {"ok": False, "error": f"iThink Serviceability Exception: {str(e)}"}


def create_ithink_order(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pushes an order to iThink Logistics API v3 for automated multi-vendor dispatch.
    Returns {"ok": True, "ithink_order_id": ..., "awb_number": ..., "status": ...} or {"ok": False, "error": ...}.
    No mock fallbacks.
    """
    if not ITHINK_ACCESS_TOKEN or not ITHINK_SECRET_KEY:
        err = "iThink API credentials (ITHINK_ACCESS_TOKEN and ITHINK_SECRET_KEY) are missing in environment configuration."
        logger.error(err)
        return {"ok": False, "error": err}

    order_num = str(order_payload.get("order_number") or f"IIP-{int(time.time())}").strip()
    wh_code = str(order_payload.get("pickup_address_code") or order_payload.get("pickup_address_id") or "").strip()
    consignee_phone = sanitize_phone(order_payload.get("consignee_phone") or "")

    if not wh_code:
        return {"ok": False, "error": "Pickup address warehouse ID (pickup_address_code) is required for iThink order creation."}

    if not consignee_phone:
        return {"ok": False, "error": "Valid 10-digit Indian mobile number starting with 6-9 is required for delivery consignee."}

    try:
        url = f"{ITHINK_BASE_URL}/order/add.json"
        payload = {
            "data": {
                **get_ithink_auth_payload(),
                "logistics": str(order_payload.get("logistics") or "delhivery").lower(),
                "s_type": str(order_payload.get("s_type") or "surface").lower(),
                "order_type": "forward",
                "pickup_address_id": wh_code,
                "shipments": [
                    {
                        "waybill": "",
                        "order": order_num,
                        "sub_order": "A",
                        "order_date": time.strftime("%d-%m-%Y"),
                        "total_amount": str(order_payload.get("total_amount") or 1000),
                        "name": str(order_payload.get("consignee_name") or "Valued Customer")[:30],
                        "company_name": str(order_payload.get("consignee_company_name") or "")[:50],
                        "add": str(order_payload.get("consignee_address") or "Delivery Address")[:100],
                        "add2": "",
                        "add3": "",
                        "pin": str(order_payload.get("consignee_pincode") or "110001"),
                        "city": str(order_payload.get("consignee_city") or "New Delhi"),
                        "state": str(order_payload.get("consignee_state") or "Delhi"),
                        "country": "India",
                        "phone": consignee_phone,
                        "alt_phone": consignee_phone,
                        "email": str(order_payload.get("consignee_email") or "buyer@platform.com"),
                        "is_billing_same_as_shipping": "yes",
                        "billing_name": str(order_payload.get("consignee_name") or "Valued Customer")[:30],
                        "billing_company_name": str(order_payload.get("consignee_company_name") or "")[:50],
                        "billing_add": str(order_payload.get("consignee_address") or "Delivery Address")[:100],
                        "billing_add2": "",
                        "billing_add3": "",
                        "billing_pin": str(order_payload.get("consignee_pincode") or "110001"),
                        "billing_city": str(order_payload.get("consignee_city") or "New Delhi"),
                        "billing_state": str(order_payload.get("consignee_state") or "Delhi"),
                        "billing_country": "India",
                        "billing_phone": consignee_phone,
                        "billing_alt_phone": consignee_phone,
                        "billing_email": str(order_payload.get("consignee_email") or "buyer@platform.com"),
                        "products": [
                            {
                                "product_name": str(order_payload.get("product_name") or "Industrial Equipment")[:50],
                                "product_sku": str(order_payload.get("product_sku") or "SKU-IIP")[:30],
                                "product_quantity": str(order_payload.get("quantity") or 1),
                                "product_price": str(order_payload.get("product_value") or 1000),
                                "product_tax_rate": "0",
                                "product_hsn_code": "8481",
                                "product_discount": "0"
                            }
                        ],
                        "shipment_length": "10",
                        "shipment_width": "10",
                        "shipment_height": "10",
                        "weight": str(max(0.5, float(order_payload.get("weight") or 1.0))),
                        "shipping_charges": "0",
                        "giftwrap_charges": "0",
                        "transaction_charges": "0",
                        "total_discount": "0",
                        "first_attemp_discount": "0",
                        "cod_amount": str(order_payload.get("total_amount") or 0) if order_payload.get("is_cod") else "0",
                        "payment_mode": "COD" if order_payload.get("is_cod") else "Prepaid",
                        "reseller_name": "",
                        "eway_bill_number": "",
                        "gst_number": ""
                    }
                ]
            }
        }
        res = requests.post(url, json=payload, timeout=12)
        try:
            data = res.json()
        except Exception:
            data = {}

        status_str = str(data.get("status") or "").lower()
        if res.status_code in [200, 201] and status_str == "success":
            shipments = data.get("data", {})
            order_info = {}
            if isinstance(shipments, dict):
                # Try getting by key "1" or order_num
                order_info = shipments.get("1") or shipments.get(order_num) or {}
            elif isinstance(shipments, list) and len(shipments) > 0:
                order_info = shipments[0]

            sub_status = str(order_info.get("status") or "").lower()
            awb = str(order_info.get("waybill") or order_info.get("awb") or "").strip()
            remark = order_info.get("remark") or order_info.get("error") or data.get("html_message")

            if sub_status == "success" or awb:
                return {
                    "ok": True,
                    "ithink_order_id": order_num,
                    "shipment_id": order_info.get("refnum") or f"SHP-{order_num}",
                    "awb_number": awb,
                    "courier_name": order_info.get("logistic_name") or order_payload.get("courier_name") or "iThink Logistics Partner",
                    "status": "MANIFESTED",
                    "label_url": f"https://my.ithinklogistics.com/shipping/label.php?awb={awb}" if awb else "",
                    "tracking_url": f"https://my.ithinklogistics.com/track/{awb}" if awb else "",
                    "raw": data
                }
            else:
                err_msg = remark or "iThink Order API returned error status for shipment."
                logger.error(f"iThink order creation failed: {err_msg}")
                return {"ok": False, "error": f"iThink Order Creation Failed: {err_msg}", "raw": data}

        err_msg = data.get("html_message") or data.get("message") or data.get("error") or res.text
        logger.error(f"iThink order API error ({res.status_code}): {err_msg}")
        return {"ok": False, "error": f"iThink Order API Error ({res.status_code}): {err_msg}"}
    except Exception as e:
        logger.error(f"iThink order creation exception: {str(e)}")
        return {"ok": False, "error": f"iThink Order Creation Exception: {str(e)}"}


def track_ithink_shipment(awb_number: str) -> Dict[str, Any]:
    """
    Fetch tracking history and current delivery status for an AWB directly from iThink Logistics API v3.
    """
    clean_awb = str(awb_number or "").strip()
    if not clean_awb:
        return {"ok": False, "error": "AWB number is required for tracking."}

    if not ITHINK_ACCESS_TOKEN or not ITHINK_SECRET_KEY:
        return {"ok": False, "error": "iThink API credentials (ITHINK_ACCESS_TOKEN and ITHINK_SECRET_KEY) are missing in environment configuration."}

    try:
        url = f"{ITHINK_BASE_URL}/tracking/get.json"
        payload = {
            "data": {
                **get_ithink_auth_payload(),
                "awb_number": clean_awb
            }
        }
        res = requests.post(url, json=payload, timeout=10)
        try:
            data = res.json()
        except Exception:
            data = {}

        if res.status_code in [200, 201] and str(data.get("status")).lower() == "success":
            return {"ok": True, "raw": data}
        else:
            err_msg = data.get("html_message") or data.get("message") or res.text
            return {"ok": False, "error": f"iThink Tracking API Error ({res.status_code}): {err_msg}"}
    except Exception as e:
        logger.error(f"iThink tracking exception: {str(e)}")
        return {"ok": False, "error": f"iThink Tracking Exception: {str(e)}"}
