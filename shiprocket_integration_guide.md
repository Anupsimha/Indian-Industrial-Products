# Shiprocket Integration & Configuration Guide

This document outlines the Shiprocket logistics integration in **Indian Industrial Platform (IIP)**, including environment variables, API endpoints, workflow details, and setup instructions.

---

## 1. Required Environment Variables

Add the following environment variables to your backend `.env` file (or `docker-compose.yml`):

```env
# Shiprocket API Configuration
SHIPROCKET_EMAIL="your_shiprocket_account_email@domain.com"
SHIPROCKET_PASSWORD="your_shiprocket_password"
SHIPROCKET_PICKUP_PINCODE="110001"
SHIPROCKET_BASE_URL="https://apiv2.shiprocket.in/v1/external"

# Support & Contact Information
REACT_APP_SUPPORT_PHONE="919876543210"
REACT_APP_SUPPORT_WHATSAPP="919876543210"
REACT_APP_SUPPORT_EMAIL="support@iipmarketplace.com"
```

---

## 2. Integrated Features & Architecture

### Backend Module (`backend/shiprocket_utils.py`)
1. **Authentication Token Management (`get_shiprocket_token`)**:
   - Authenticates against `POST /v1/external/auth/login`.
   - Automatically caches the JWT bearer token for **9 days** to minimize latency and API calls.

2. **Real-time Courier Serviceability & Rate Calculation (`fetch_shipping_rates`)**:
   - Queries `GET /v1/external/couriers/serviceability` using destination pincode, parcel weight, and COD preferences.
   - Filters top courier options (e.g., Delhivery, Bluedart, Shadowfax, DTDC).
   - Includes fallback rate estimation if Shiprocket credentials are omitted or API rate limits occur.

3. **Dynamic Seller Pickup Locations (`register_shiprocket_pickup_location`)**:
   - Calls `POST /v1/external/settings/company/addpickup` whenever a seller/manufacturer registers or edits their factory/shop address.
   - Assigns a unique pickup nickname (`IIP_WH_<COMPANY_ID[:8]>`) storing shop address, city, state, pincode, and contact phone.

4. **Automated Order Dispatch (`create_shiprocket_adhoc_order`)**:
   - Pushes paid orders directly to the Shiprocket panel via `POST /v1/external/orders/create/adhoc`.
   - Passes the seller's dynamic `pickup_location` nickname so courier pickup executives are dispatched directly to the seller's specific warehouse address.


---

## 3. API Endpoints Reference

### A. Calculate Shipping Rates
- **Endpoint**: `POST /api/shipping/calculate-rate`
- **Request Body**:
```json
{
  "pincode": "110001",
  "weight_kg": 1.5,
  "cod": false
}
```
- **Response**:
```json
{
  "ok": true,
  "options": [
    {
      "id": "shiprocket_1",
      "courier_name": "Delhivery Air Express",
      "rate": 149,
      "etd": "1-2 Business Days",
      "badge": "Fastest",
      "cod_available": true
    }
  ]
}
```

### B. Push Order to Shiprocket Panel
- **Endpoint**: `POST /api/shipping/create-order`
- **Request Body**:
```json
{
  "order_id": "ORD-UUID-HERE",
  "delivery_pincode": "110001",
  "shipping_address": "Factory 4B, Okhla Industrial Area Phase 3, New Delhi",
  "consignee_name": "Rajesh Kumar",
  "consignee_phone": "919876543210"
}
```

### C. Track Shipment Status
- **Endpoint**: `GET /api/shipping/track/{order_id}`
- **Response**:
```json
{
  "ok": true,
  "order_id": "ORD-UUID-HERE",
  "status": "shipped",
  "tracking": {
    "current_status": "In Transit",
    "courier": "Shiprocket Partner",
    "estimated_delivery": "25 Aug 2026",
    "location": "Central Distribution Hub"
  }
}
```

---

## 4. Setup & Verification Steps

1. Sign up on [Shiprocket.in](https://www.shiprocket.in/).
2. Obtain your account login email & password.
3. Configure your Primary Warehouse address and Pickup Pincode in the Shiprocket dashboard.
4. Set `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` in `backend/.env`.
5. Test rate calculation on the Checkout Delivery screen (`/cart`).
