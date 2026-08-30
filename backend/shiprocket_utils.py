import os
import time
import logging
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger("shiprocket")

SHIPROCKET_BASE_URL = os.environ.get("SHIPROCKET_BASE_URL", "https://apiv2.shiprocket.in/v1/external")
SHIPROCKET_EMAIL = os.environ.get("SHIPROCKET_EMAIL", "")
SHIPROCKET_PASSWORD = os.environ.get("SHIPROCKET_PASSWORD", "")
DEFAULT_PICKUP_PINCODE = os.environ.get("SHIPROCKET_PICKUP_PINCODE", "110001")

_token_cache: Dict[str, Any] = {
    "token": None,
    "expires_at": 0
}

def sanitize_shiprocket_phone(phone: str) -> Optional[str]:
    """
    Format phone number for Shiprocket API: must be 10 digits starting with 6, 7, 8, or 9.
    Strips leading +91, 91, 0, spaces, and non-digit characters.
    Returns sanitized 10-digit phone string if valid, or None if invalid/missing.
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


def get_shiprocket_token() -> Optional[str]:
    """
    Fetch authentication token from Shiprocket API. Token remains valid for 10 days.
    """
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now:
        return _token_cache["token"]

    if not SHIPROCKET_EMAIL or not SHIPROCKET_PASSWORD:
        logger.error("Shiprocket authentication error: SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not configured.")
        return None

    try:
        url = f"{SHIPROCKET_BASE_URL}/auth/login"
        payload = {
            "email": SHIPROCKET_EMAIL,
            "password": SHIPROCKET_PASSWORD
        }

        res = requests.post(url, json=payload, timeout=10)
        if res.status_code == 200:
            data = res.json()
            token = data.get("token")
            if token:
                _token_cache["token"] = token
                _token_cache["expires_at"] = now + (9 * 24 * 3600)  # cache 9 days
                return token
        if res.status_code == 403:
            logger.error(f"Shiprocket auth failed (403 Access Forbidden): Please enable API User access in Shiprocket Dashboard (Settings -> API Users). Details: {res.text}")
        else:
            logger.error(f"Shiprocket auth failed ({res.status_code}): {res.text}")
    except Exception as e:
        logger.error(f"Shiprocket auth exception: {str(e)}")

    return None


def fetch_shipping_rates(
    delivery_pincode: str,
    weight_kg: float = 1.0,
    cod: bool = False,
    pickup_pincode: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch available courier serviceability and calculated rates from Shiprocket API.
    Returns {"ok": True, "options": [...]} on success or {"ok": False, "error": "..."} on failure.
    No fallback mocking.
    """
    token = get_shiprocket_token()
    pickup = (pickup_pincode or "").strip()

    if not pickup or len(pickup) != 6 or not pickup.isdigit():
        return {
            "ok": False,
            "error": "Seller warehouse pickup pincode is required for shipping rate calculation."
        }

    if not token:
        return {
            "ok": False,
            "error": "Shiprocket authentication failed. Credentials missing or unauthorized access."
        }

    try:
        url = f"{SHIPROCKET_BASE_URL}/courier/serviceability"
        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "pickup_postcode": pickup,
            "delivery_postcode": delivery_pincode,
            "weight": max(0.5, weight_kg),
            "cod": 1 if cod else 0
        }
        res = requests.get(url, headers=headers, params=params, timeout=10)
        if res.status_code == 200:
            data = res.json()
            courier_list = data.get("data", {}).get("available_courier_companies", [])
            options = []
            for c in courier_list[:4]:  # Return top 4 available options
                rate = float(c.get("rate", 99))
                options.append({
                    "id": f"shiprocket_{c.get('courier_company_id', 'std')}",
                    "courier_name": c.get("courier_name", "Shiprocket Partner"),
                    "rate": int(rate),
                    "etd": c.get("etd", "3-5 Days"),
                    "badge": "Recommended" if c.get("is_surface") else "Express",
                    "cod_available": bool(c.get("cod")),
                    "min_weight": c.get("min_weight", "0.5kg")
                })
            if options:
                return {"ok": True, "options": options}
            else:
                return {
                    "ok": False,
                    "error": f"Pincode {delivery_pincode} is currently not serviceable by Shiprocket courier partners."
                }
        else:
            err_msg = ""
            try:
                err_msg = res.json().get("message", res.text)
            except Exception:
                err_msg = res.text
            logger.error(f"Shiprocket serviceability query failed ({res.status_code}): {err_msg}")
            return {
                "ok": False,
                "error": f"Shiprocket Serviceability API Error ({res.status_code}): {err_msg}"
            }
    except Exception as e:
        logger.error(f"Shiprocket serviceability exception: {str(e)}")
        return {
            "ok": False,
            "error": f"Shiprocket serviceability connection failed: {str(e)}"
        }


def create_shiprocket_adhoc_order(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new shipment order in Shiprocket panel for automated dispatch.
    Returns {"ok": True, "shiprocket_order_id": ...} or {"ok": False, "error": "..."}.
    No fallback mocking.
    """
    token = get_shiprocket_token()
    if not token:
        return {
            "ok": False,
            "error": "Shiprocket authentication failed. Order could not be pushed to Shiprocket panel."
        }

    # Sanitize billing phone number
    if "billing_phone" in order_payload:
        clean_p = sanitize_shiprocket_phone(order_payload["billing_phone"])
        if not clean_p:
            return {
                "ok": False,
                "error": f"Billing phone number '{order_payload.get('billing_phone')}' is invalid. Must be a valid 10-digit mobile number starting with 6, 7, 8, or 9."
            }
        order_payload["billing_phone"] = clean_p

    try:
        url = f"{SHIPROCKET_BASE_URL}/orders/create/adhoc"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        res = requests.post(url, headers=headers, json=order_payload, timeout=12)
        if res.status_code in [200, 201]:
            data = res.json()
            if data.get("order_id") or data.get("status_code") == 1:
                return {
                    "ok": True,
                    "shiprocket_order_id": data.get("order_id"),
                    "shipment_id": data.get("shipment_id"),
                    "status": data.get("status", "NEW"),
                    "raw": data
                }
            else:
                err_msg = data.get("message") or data.get("packaging_box_error") or str(data)
                logger.error(f"Shiprocket order creation rejected by panel: {err_msg}")
                return {
                    "ok": False,
                    "error": f"Shiprocket Panel Error: {err_msg}",
                    "raw": data
                }
        
        err_msg = ""
        try:
            err_msg = res.json().get("message", res.text)
        except Exception:
            err_msg = res.text
        logger.error(f"Shiprocket order creation failed ({res.status_code}): {err_msg}")
        return {
            "ok": False,
            "error": f"Shiprocket Order API Error ({res.status_code}): {err_msg}",
            "raw": res.text
        }
    except Exception as e:
        logger.error(f"Shiprocket order creation exception: {str(e)}")
        return {
            "ok": False,
            "error": f"Shiprocket Order Creation Exception: {str(e)}"
        }


def get_shiprocket_pickup_locations() -> List[Dict[str, Any]]:
    """
    Fetch list of all registered pickup locations in Shiprocket account.
    """
    token = get_shiprocket_token()
    if not token:
        return []
    try:
        url = f"{SHIPROCKET_BASE_URL}/settings/company/pickup"
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            return data.get("data", {}).get("shipping_address", [])
    except Exception as e:
        logger.error(f"Failed fetching Shiprocket pickup locations: {str(e)}")
    return []


def check_shiprocket_pickup_verification(nickname: Optional[str], phone_raw: Optional[str], pincode: Optional[str]) -> Dict[str, Any]:
    """
    Check live verification status of a registered pickup location in Shiprocket master account.
    Returns {"ok": True, "phone_verified": True/False, "pickup_location": nickname, "status": "VERIFIED"/"PENDING_VERIFICATION"}.
    """
    locations = get_shiprocket_pickup_locations()
    if not locations:
        return {"ok": False, "phone_verified": False, "pickup_location": nickname, "status": "NOT_FOUND"}

    clean_p = sanitize_shiprocket_phone(phone_raw or "")
    clean_pin = str(pincode or "").strip()
    clean_nick = str(nickname or "").strip().lower()

    for loc in locations:
        loc_nick = str(loc.get("pickup_location") or "").strip().lower()
        loc_pin = str(loc.get("pin_code") or "").strip()
        loc_phone = sanitize_shiprocket_phone(str(loc.get("phone") or ""))
        is_verified = bool(loc.get("phone_verified") == 1 or loc.get("status") == 1)

        if (clean_nick and loc_nick == clean_nick) or (clean_pin and loc_pin == clean_pin and clean_p and loc_phone == clean_p):
            return {
                "ok": True,
                "phone_verified": is_verified,
                "pickup_location": loc.get("pickup_location"),
                "status": "VERIFIED" if is_verified else "PENDING_VERIFICATION",
                "raw": loc
            }

    return {"ok": False, "phone_verified": False, "pickup_location": nickname, "status": "NOT_FOUND"}


def register_shiprocket_pickup_location(pickup_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Register or update a seller's shop/warehouse address with Shiprocket via POST /v1/external/settings/company/addpickup.
    Requires mandatory fields: name, email, phone, address, city, state, pin_code.
    If pickup location already exists in Shiprocket, checks whether address changed or reuses existing location.
    """
    token = get_shiprocket_token()
    if not token:
        return {
            "ok": False,
            "error": "Shiprocket authentication failed. Credentials missing or unauthorized access."
        }

    pickup_nickname = str(pickup_data.get("pickup_location") or "IIP_WH_DEFAULT").strip()
    name = str(pickup_data.get("name") or "").strip()
    email = str(pickup_data.get("email") or "").strip()
    phone_raw = str(pickup_data.get("phone") or "").strip()
    address = str(pickup_data.get("address") or "").strip()
    address_2 = str(pickup_data.get("address_2") or "").strip()
    city = str(pickup_data.get("city") or "").strip()
    state = str(pickup_data.get("state") or "").strip()
    pincode = str(pickup_data.get("pin_code") or "").strip()
    gstin = str(pickup_data.get("gstin") or "").strip()

    missing_fields = []
    if not name:
        missing_fields.append("Warehouse / Owner Contact Name")
    if not email:
        missing_fields.append("Email")
    if not phone_raw:
        missing_fields.append("Phone Number")
    if not address:
        missing_fields.append("Street Address / Factory Unit")
    if not city:
        missing_fields.append("City")
    if not state:
        missing_fields.append("State")
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        missing_fields.append("6-Digit Warehouse Pincode")

    if missing_fields:
        err_msg = f"Cannot register Shiprocket pickup location. Missing mandatory fields: {', '.join(missing_fields)}"
        logger.error(err_msg)
        return {
            "ok": False,
            "error": err_msg
        }

    clean_phone = sanitize_shiprocket_phone(phone_raw)
    if not clean_phone:
        err_msg = f"Phone number '{phone_raw}' is invalid for Shiprocket pickup location. Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
        logger.error(err_msg)
        return {
            "ok": False,
            "error": err_msg
        }

    # Check existing pickup locations in Shiprocket account
    existing_locations = get_shiprocket_pickup_locations()
    matched_by_details = None
    matched_by_name = None

    for loc in existing_locations:
        loc_nickname = str(loc.get("pickup_location") or "").strip()
        loc_pin = str(loc.get("pin_code") or "").strip()
        loc_phone = sanitize_shiprocket_phone(str(loc.get("phone") or ""))
        loc_addr = str(loc.get("address") or "").strip().lower()

        if loc_nickname.lower() == pickup_nickname.lower():
            matched_by_name = loc

        if loc_pin == pincode and loc_phone == clean_phone and (loc_addr in address.lower() or address.lower() in loc_addr):
            matched_by_details = loc

    # 1. If an exact match for these address/phone details already exists under ANY nickname, reuse it!
    if matched_by_details:
        registered_nick = matched_by_details.get("pickup_location")
        is_phone_verified = bool(matched_by_details.get("phone_verified") == 1)
        logger.info(f"Shiprocket pickup location already registered under nickname '{registered_nick}' (Phone Verified: {is_phone_verified}). Reusing.")
        return {
            "ok": True,
            "pickup_location": registered_nick,
            "status": "REGISTERED",
            "existing": True,
            "phone_verified": is_phone_verified,
            "phone_warning": None if is_phone_verified else f"Pickup location '{registered_nick}' is registered on Shiprocket, but 1-time phone OTP verification is pending in your Shiprocket Panel (Settings -> Pickup Addresses).",
            "raw": matched_by_details
        }

    # 2. If the base nickname is taken by an older address, append a timestamp/version suffix
    if matched_by_name:
        pickup_nickname = f"{pickup_nickname}_{int(time.time())[-4:]}"
        logger.info(f"Warehouse contact/address details updated: registering new Shiprocket pickup location nickname '{pickup_nickname}'")

    payload = {
        "pickup_location": pickup_nickname,
        "name": name[:30],
        "email": email,
        "phone": clean_phone,
        "address": address,
        "address_2": address_2,
        "city": city,
        "state": state,
        "country": "India",
        "pin_code": pincode,
        "gstin": gstin
    }

    try:
        url = f"{SHIPROCKET_BASE_URL}/settings/company/addpickup"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        if res.status_code in [200, 201]:
            data = res.json()
            logger.info(f"Shiprocket pickup location registered successfully: {pickup_nickname}")
            verification = check_shiprocket_pickup_verification(pickup_nickname, clean_phone, pincode)
            return {
                "ok": True,
                "pickup_location": pickup_nickname,
                "status": "REGISTERED",
                "phone_verified": verification.get("phone_verified", False),
                "raw": data
            }

        err_msg = ""
        try:
            data = res.json()
            err_msg = data.get("message") or data.get("detail") or str(data)
        except Exception:
            err_msg = res.text

        if res.status_code == 403:
            err_msg = "Access Forbidden (403): Enable API User permissions in Shiprocket Dashboard (Settings -> API Users)."
        
        logger.error(f"Shiprocket addpickup failed ({res.status_code}): {err_msg}")
        return {
            "ok": False,
            "error": f"Shiprocket Pickup Location Registration Error ({res.status_code}): {err_msg}",
            "raw": res.text
        }
    except Exception as e:
        logger.error(f"Shiprocket addpickup exception: {str(e)}")
        return {
            "ok": False,
            "error": f"Shiprocket Pickup Location Registration Exception: {str(e)}"
        }
