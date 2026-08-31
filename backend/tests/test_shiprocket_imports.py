import pytest
from server import (
    sanitize_shiprocket_phone,
    get_shiprocket_pickup_locations,
    create_shiprocket_adhoc_order,
    register_shiprocket_pickup_location,
    check_shiprocket_pickup_verification,
    fetch_shipping_rates,
)

def test_shiprocket_utils_imports_available():
    assert callable(sanitize_shiprocket_phone)
    assert callable(get_shiprocket_pickup_locations)
    assert callable(create_shiprocket_adhoc_order)
    assert callable(register_shiprocket_pickup_location)
    assert callable(check_shiprocket_pickup_verification)
    assert callable(fetch_shipping_rates)

def test_sanitize_shiprocket_phone_formatting():
    assert sanitize_shiprocket_phone("+919876543210") == "9876543210"
    assert sanitize_shiprocket_phone("9876543210") == "9876543210"
    assert sanitize_shiprocket_phone("09876543210") == "9876543210"
    assert sanitize_shiprocket_phone("123") is None
