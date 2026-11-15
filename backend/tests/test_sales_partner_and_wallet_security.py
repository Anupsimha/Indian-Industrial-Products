import hashlib
import hmac
from types import SimpleNamespace
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import server
from server import (
    Base,
    Company,
    Enquiry,
    Notification,
    Order,
    PayoutSettlement,
    Product,
    SalesPartnerLeadDeal,
    SellerWallet,
    User,
    WalletTransaction,
    app,
    create_token,
    credit_seller_wallet_for_order,
    get_db,
    hash_password,
    now_iso,
)


def _rzp_sig(order_id: str, payment_id: str) -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(server.RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {create_token(user_id)}"}


@pytest.fixture
async def test_env(monkeypatch, tmp_path):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with Session() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(server, "AsyncSessionLocal", Session)
    monkeypatch.setattr(server, "ENQUIRY_MEDIA_DIR", tmp_path)

    async def _noop_email(*args, **kwargs):
        return True

    monkeypatch.setattr(server, "send_email", _noop_email)

    class _FakeResp:
        status_code = 200
        text = "{}"

        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    def _fake_requests_post(url, json=None, auth=None, timeout=10):
        return _FakeResp({"id": f"order_rzp_{json.get('amount', 0)}"})

    import requests
    monkeypatch.setattr(requests, "post", _fake_requests_post)

    # Seed core test users & company
    async with Session() as s:
        now = now_iso()
        s.add_all([
            User(
                id="sp_1",
                name="Ramesh Partner",
                email="partner@test.com",
                mobile="9000000001",
                password_hash=hash_password("Pass123!"),
                role="sales_partner",
                is_verified=True,
                created_at=now,
            ),
            User(
                id="buyer_1",
                name="Priya Buyer",
                email="buyer1@test.com",
                mobile="9000000002",
                password_hash=hash_password("Pass123!"),
                role="buyer",
                plan_name="Premium",
                plan_expires_at="2099-01-01T00:00:00+00:00",
                is_verified=True,
                created_at=now,
            ),
            User(
                id="mfg_company_user",
                name="Vikram Manufacturer",
                email="mfg@test.com",
                mobile="9000000003",
                password_hash=hash_password("Pass123!"),
                role="manufacturer",
                company_id="comp_mfg_1",
                plan_name="Basic",
                plan_expires_at="2099-01-01T00:00:00+00:00",
                is_verified=True,
                created_at=now,
            ),
            Company(
                id="comp_mfg_1",
                name="Apex CNC Works",
                description="Industrial CNC machining works",
                logo_url="https://example.com/logo.png",
                owner_id="mfg_company_user",
                category="Machining",
                location="Bengaluru",
                mobile="9000000003",
                whatsapp="9000000003",
                email="mfg@test.com",
                address="Peenya, Bengaluru",
                created_at=now,
            ),
            User(
                id="admin_1",
                name="Platform Admin",
                email="admin@test.com",
                mobile="9000000099",
                password_hash=hash_password("Admin123!"),
                role="admin",
                is_verified=True,
                admin_setup_completed=True,
                created_at=now,
            ),
        ])
        await s.commit()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, Session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.anyio
async def test_sales_partner_end_to_end_approval_flow(test_env):
    client, Session = test_env

    # 1. Non-sales-partner cannot spoof is_sales_partner_lead
    bad_post = await client.post(
        "/api/enquiries",
        json={
            "name": "Fake Partner",
            "mobile": "9811111111",
            "requirement": "Trying to spoof SP lead",
            "total_deal_value": 100000,
            "is_sales_partner_lead": True,
        },
        headers=_auth("buyer_1"),
    )
    assert bad_post.status_code == 403

    # 2. Invalid deal value rejected
    zero_post = await client.post(
        "/api/sales-partner/leads",
        json={
            "name": "Client Zero",
            "mobile": "9811111112",
            "requirement": "Lathe machine requirement",
            "total_deal_value": 0,
        },
        headers=_auth("sp_1"),
    )
    assert zero_post.status_code == 400

    # 3. Sales Partner posts ₹1,00,000 deal -> ₹2,000 lead value (2%)
    res = await client.post(
        "/api/sales-partner/leads",
        json={
            "name": "Suresh Jindal",
            "mobile": "9822223333",
            "requirement": "Need 5 CNC Lathe machines for Pune plant",
            "product_name": "CNC Turning Center",
            "category": "Machinery",
            "location": "Pune, Maharashtra",
            "quantity": "5 Units",
            "total_deal_value": 100000,
        },
        headers=_auth("sp_1"),
    )
    assert res.status_code == 200, res.text
    lead = res.json()
    lead_id = lead["id"]
    assert lead["is_sales_partner_lead"] is True
    assert lead["total_deal_value"] == 100000.0
    assert lead["lead_value"] == 2000.0
    assert lead["is_sold_out"] is False

    # 4. Excluded from subscription packages (even Premium / Basic plans)
    req_otp = await client.post(f"/api/requirements/{lead_id}/request-unlock", headers=_auth("buyer_1"))
    assert req_otp.status_code == 403
    direct_unlock = await client.post(f"/api/requirements/{lead_id}/unlock", headers=_auth("mfg_company_user"))
    assert direct_unlock.status_code == 403

    # 5. Unauthenticated / other users see masked contact in feed
    feed_res = await client.get("/api/requirements", headers=_auth("buyer_1"))
    assert feed_res.status_code == 200
    feed_lead = next(x for x in feed_res.json() if x["id"] == lead_id)
    assert feed_lead["is_unlocked"] is False
    assert feed_lead["mobile"] != "9822223333"

    # 6. Sales partner cannot buy own lead
    self_ord = await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("sp_1"))
    assert self_ord.status_code == 400

    # 7. Buyer creates order -> 2000 + 18% GST (360) = 2360
    ord_res = await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("buyer_1"))
    assert ord_res.status_code == 200, ord_res.text
    ord_data = ord_res.json()
    assert ord_data["base_price"] == 2000.0
    assert ord_data["gst"] == 360.0
    assert ord_data["total"] == 2360.0
    assert ord_data["amount"] == 236000
    assert ord_data["partner_share_amount"] == 1000.0

    # 8. Verify payment -> Sold Out, contact unlocked, ₹1,000 held in partner pending escrow
    rzp_order_id = ord_data["order_id"]
    rzp_pay_id = "pay_sp_001"
    ver_res = await client.post(
        f"/api/sales-partner/leads/{lead_id}/verify-payment",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_pay_id,
            "razorpay_signature": _rzp_sig(rzp_order_id, rzp_pay_id),
        },
        headers=_auth("buyer_1"),
    )
    assert ver_res.status_code == 200, ver_res.text
    ver_data = ver_res.json()
    assert ver_data["ok"] is True
    assert ver_data["mobile"] == "9822223333"
    deal_id = ver_data["deal"]["id"]
    assert ver_data["deal"]["status"] == "UNLOCKED"
    assert ver_data["deal"]["total_paid"] == 2360.0
    assert ver_data["deal"]["partner_share_amount"] == 1000.0

    # Check invoices generated with 18% GST
    inv_res = await client.get("/api/invoices/my-invoices", headers=_auth("buyer_1"))
    assert inv_res.status_code == 200
    assert inv_res.json()[0]["total_amount"] == 2360.0
    assert inv_res.json()[0]["gst_amount"] == 360.0

    # Second buyer blocked: Sold Out
    ord2 = await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("mfg_company_user"))
    assert ord2.status_code == 400
    assert "Sold Out" in ord2.json()["detail"]

    # Non-admin cannot delete a sold lead
    del_res = await client.delete(f"/api/enquiries/{lead_id}", headers=_auth("sp_1"))
    assert del_res.status_code == 400

    # Sales partner wallet shows ₹1,000 pending, ₹0 available
    sp_wallet = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_wallet["pending_balance"] == 1000.0
    assert sp_wallet["available_balance"] == 0.0

    # 9. Sales Partner uploads transaction bill (multipart FormData like frontend)
    bill_res = await client.post(
        f"/api/sales-partner/deals/{deal_id}/upload-bill",
        files={"bill": ("invoice_991.jpg", b"\xff\xd8\xff\xe0testimagebytes", "image/jpeg")},
        data={"notes": "GST Invoice #991"},
        headers=_auth("sp_1"),
    )
    assert bill_res.status_code == 200, bill_res.text
    assert bill_res.json()["deal"]["status"] == "INVOICE_UPLOADED"
    assert bill_res.json()["deal"]["bill_image_url"].startswith("/api/enquiry-media/bill_")

    # Buyer receives notification
    async with Session() as s:
        notifs = (await s.execute(select(Notification).where(Notification.user_id == "buyer_1"))).scalars().all()
        assert any(n.type == "partner_bill_uploaded" for n in notifs)

    # 10. Buyer approves bill -> 50% (₹1,000) moves from pending to available
    app_res = await client.post(f"/api/sales-partner/deals/{deal_id}/approve-bill", headers=_auth("buyer_1"))
    assert app_res.status_code == 200, app_res.text
    assert app_res.json()["deal"]["status"] == "APPROVED"

    # Idempotent retry does not double-credit
    app_retry = await client.post(f"/api/sales-partner/deals/{deal_id}/approve-bill", headers=_auth("buyer_1"))
    assert app_retry.status_code == 200

    sp_wallet_after = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_wallet_after["pending_balance"] == 0.0
    assert sp_wallet_after["available_balance"] == 1000.0

    my_leads = (await client.get("/api/sales-partner/my-leads", headers=_auth("sp_1"))).json()
    assert my_leads["summary"]["earned_commission"] == 1000.0
    assert my_leads["summary"]["approved_deals"] == 1


@pytest.mark.anyio
async def test_admin_override_and_fake_lead_refund_flows(test_env):
    client, _ = test_env

    # Lead A: ₹50,000 deal -> ₹1,000 lead value -> ₹500 escrow -> Admin override approval
    lead_a = (await client.post(
        "/api/sales-partner/leads",
        json={"name": "Lead A", "mobile": "9833334444", "requirement": "Valves", "total_deal_value": 50000},
        headers=_auth("sp_1"),
    )).json()
    ver_a = (await client.post(
        "/api/payments/verify-topup",
        json={
            "lead_id": lead_a["id"],
            "razorpay_order_id": "ord_a",
            "razorpay_payment_id": "pay_a",
            "razorpay_signature": _rzp_sig("ord_a", "pay_a"),
        },
        headers=_auth("mfg_company_user"),
    )).json()
    deal_a_id = ver_a["deal"]["id"]

    # Non-admin cannot access admin deals
    assert (await client.get("/api/admin/sales-partner-deals", headers=_auth("buyer_1"))).status_code == 403

    # Admin overrides payout even though buyer never approved
    res_ov = await client.post(
        f"/api/admin/sales-partner-deals/{deal_a_id}/resolve",
        json={"action": "approve_partner_payout", "notes": "Verified offline with supplier"},
        headers=_auth("admin_1"),
    )
    assert res_ov.status_code == 200, res_ov.text
    assert res_ov.json()["deal"]["status"] == "APPROVED"

    sp_w = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_w["pending_balance"] == 0.0
    assert sp_w["available_balance"] == 500.0

    # Lead B: ₹2,00,000 deal -> ₹4,000 lead value -> ₹2,000 escrow -> Buyer reports fake -> Admin refunds 50%
    lead_b = (await client.post(
        "/api/sales-partner/leads",
        json={"name": "Lead B", "mobile": "9844445555", "requirement": "Boilers", "total_deal_value": 200000},
        headers=_auth("sp_1"),
    )).json()
    ver_b = (await client.post(
        f"/api/sales-partner/leads/{lead_b['id']}/verify-payment",
        json={
            "razorpay_order_id": "ord_b",
            "razorpay_payment_id": "pay_b",
            "razorpay_signature": _rzp_sig("ord_b", "pay_b"),
        },
        headers=_auth("buyer_1"),
    )).json()
    deal_b_id = ver_b["deal"]["id"]

    # Sales partner now has ₹2,000 pending, ₹500 available
    assert (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()["pending_balance"] == 2000.0

    # Buyer reports fake lead
    rep = await client.post(
        f"/api/sales-partner/deals/{deal_b_id}/report-fake",
        json={"reason": "Phone number unreachable and client denies any requirement"},
        headers=_auth("buyer_1"),
    )
    assert rep.status_code == 200
    assert rep.json()["deal"]["status"] == "FAKE_REPORTED"

    # Admin can reject false fake-report (restores UNLOCKED), then re-report and approve refund
    rej_fake = await client.post(
        f"/api/admin/sales-partner-deals/{deal_b_id}/resolve",
        json={"action": "reject_fake_report", "notes": "Buyer asked to retry"},
        headers=_auth("admin_1"),
    )
    assert rej_fake.status_code == 200
    assert rej_fake.json()["deal"]["status"] == "UNLOCKED"

    rep2 = await client.post(
        f"/api/sales-partner/deals/{deal_b_id}/report-fake",
        json={"reason": "Confirmed invalid client contact after retry"},
        headers=_auth("buyer_1"),
    )
    assert rep2.status_code == 200
    assert rep2.json()["deal"]["status"] == "FAKE_REPORTED"

    # Admin approves 50% refund to buyer
    refund_res = await client.post(
        f"/api/admin/sales-partner-deals/{deal_b_id}/resolve",
        json={"action": "approve_fake_refund", "notes": "Call logs confirmed invalid number"},
        headers=_auth("admin_1"),
    )
    assert refund_res.status_code == 200, refund_res.text
    assert refund_res.json()["deal"]["status"] == "REFUNDED"

    # Sales partner's ₹2,000 pending escrow cancelled; ₹500 available untouched
    sp_w_final = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_w_final["pending_balance"] == 0.0
    assert sp_w_final["available_balance"] == 500.0

    # Buyer (no company_id!) received ₹2,000 refund in their wallet
    buyer_w = (await client.get("/api/wallet/me", headers=_auth("buyer_1"))).json()
    assert buyer_w["available_balance"] == 2000.0
    buyer_txs = (await client.get("/api/wallet/me/transactions", headers=_auth("buyer_1"))).json()
    assert any(t["type"] == "CREDIT_FAKE_REFUND" and t["amount"] == 2000.0 for t in buyer_txs)


@pytest.mark.anyio
async def test_wallet_security_audit_non_company_and_order_guards(test_env):
    client, Session = test_env

    # 1. Strict bank validation rejects malformed account number / IFSC / type
    bad_acc = await client.put(
        "/api/wallet/me/bank-account",
        json={
            "bank_name": "HDFC Bank",
            "account_holder_name": "Ramesh Partner",
            "account_number": "ABC1234567",
            "ifsc_code": "HDFC0001234",
            "account_type": "savings",
        },
        headers=_auth("sp_1"),
    )
    assert bad_acc.status_code == 400

    bad_ifsc = await client.put(
        "/api/wallet/me/bank-account",
        json={
            "bank_name": "HDFC Bank",
            "account_holder_name": "Ramesh Partner",
            "account_number": "123456789012",
            "ifsc_code": "BAD",
            "account_type": "savings",
        },
        headers=_auth("sp_1"),
    )
    assert bad_ifsc.status_code == 400

    bad_type = await client.put(
        "/api/wallet/me/bank-account",
        json={
            "bank_name": "HDFC Bank",
            "account_holder_name": "Ramesh Partner",
            "account_number": "123456789012",
            "ifsc_code": "HDFC0001234",
            "account_type": "crypto",
        },
        headers=_auth("sp_1"),
    )
    assert bad_type.status_code == 400

    # 2. Valid bank account saves for non-company sales partner & funds redeem/settlement works
    good_bank = await client.put(
        "/api/wallet/me/bank-account",
        json={
            "bank_name": "HDFC Bank",
            "account_holder_name": "Ramesh Partner",
            "account_number": "123456789012",
            "ifsc_code": "HDFC0001234",
            "account_type": "savings",
        },
        headers=_auth("sp_1"),
    )
    assert good_bank.status_code == 200
    assert good_bank.json()["masked_account_number"].endswith("9012")

    async with Session() as s:
        s.add(SellerWallet(
            id="w_sp1",
            company_id="sp_1",
            available_balance=1500.0,
            pending_balance=0.0,
            total_settled=0.0,
            settlement_policy="weekly",
            created_at=now_iso(),
            updated_at=now_iso(),
        ))
        await s.commit()

    # Redeem ₹1,500
    redeem_1 = await client.post("/api/wallet/me/redeem", headers=_auth("sp_1"))
    assert redeem_1.status_code == 200, redeem_1.text
    settlement_id = redeem_1.json()["id"]
    assert redeem_1.json()["amount"] == 1500.0
    assert redeem_1.json()["company_name"] == "Ramesh Partner (Sales Partner)"

    # Double redemption blocked while PENDING or empty
    redeem_2 = await client.post("/api/wallet/me/redeem", headers=_auth("sp_1"))
    assert redeem_2.status_code == 400

    # Admin rejects -> funds refunded atomically; second process fails 400
    rej = await client.patch(
        f"/api/admin/settlements/{settlement_id}/process",
        json={"status": "REJECTED", "rejection_reason": "Test refund"},
        headers=_auth("admin_1"),
    )
    assert rej.status_code == 200
    assert (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()["available_balance"] == 1500.0
    rej_dup = await client.patch(
        f"/api/admin/settlements/{settlement_id}/process",
        json={"status": "SETTLED", "utr_reference_number": "UTR99999"},
        headers=_auth("admin_1"),
    )
    assert rej_dup.status_code == 400

    # 3. Order wallet audit: unpaid non-COD order does NOT credit wallet; price spoofing & self-dealing blocked; idempotency enforced
    async with Session() as s:
        s.add(Product(
            id="prod_real_1",
            company_id="comp_mfg_1",
            name="Precision Gear",
            price="₹2,000/unit",
            category="Machining",
            image_url="https://example.com/gear.png",
            description="Test product",
            created_at=now_iso(),
        ))
        await s.commit()

    # Unpaid UPI order (no payment_id -> pending) MUST NOT credit SellerWallet
    pending_ord = await client.post(
        "/api/orders",
        json={
            "items": [{"product_id": "prod_real_1", "name": "Precision Gear", "qty": 1, "price": "₹2,000/unit"}],
            "subtotal": 2000.0,
            "delivery_cost": 0.0,
            "gst": 360.0,
            "total": 2360.0,
            "delivery_option": "free",
            "payment_method": "upi",
            "address": "Test Address",
        },
        headers=_auth("buyer_1"),
    )
    assert pending_ord.status_code == 200, pending_ord.text
    assert pending_ord.json()["status"] == "pending"
    assert (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"] == 0.0

    # Self-dealing: owner of comp_mfg_1 pays for own product -> wallet stays 0
    self_deal_ord = await client.post(
        "/api/orders",
        json={
            "items": [{"product_id": "prod_real_1", "name": "Precision Gear", "qty": 2, "price": "₹50,000"}],
            "subtotal": 4000.0,
            "delivery_cost": 0.0,
            "gst": 0.0,
            "total": 4000.0,
            "delivery_option": "free",
            "payment_method": "razorpay",
            "payment_id": "pay_self_1",
            "address": "Self Address",
        },
        headers=_auth("mfg_company_user"),
    )
    assert self_deal_ord.status_code == 200, self_deal_ord.text
    assert (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"] == 0.0

    # Paid order by real external buyer with tampered item price -> uses authoritative ₹2,000 DB price (qty=1 -> 1960.0 net after 2% fee)
    real_ord = await client.post(
        "/api/orders",
        json={
            "items": [{"product_id": "prod_real_1", "name": "Precision Gear", "qty": 1, "price": "₹9,99,999"}],
            "subtotal": 2000.0,
            "delivery_cost": 0.0,
            "gst": 360.0,
            "total": 2360.0,
            "delivery_option": "free",
            "payment_method": "razorpay",
            "payment_id": "pay_real_1",
            "address": "Buyer Address",
        },
        headers=_auth("buyer_1"),
    )
    assert real_ord.status_code == 200, real_ord.text
    ord_obj_id = real_ord.json()["id"]
    mfg_w = (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()
    assert mfg_w["available_balance"] == 1960.0

    # Re-calling credit_seller_wallet_for_order directly is idempotent
    async with Session() as s:
        ord_row = (await s.execute(select(Order).where(Order.id == ord_obj_id))).scalar_one()
        await credit_seller_wallet_for_order(ord_row, s)
    assert (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"] == 1960.0

    # Webhook capturing payment for previously pending order marks paid AND credits seller wallet
    pend_id = pending_ord.json()["id"]
    async with Session() as s:
        p_row = (await s.execute(select(Order).where(Order.id == pend_id))).scalar_one()
        p_row.razorpay_order_id = "rzp_ord_webhook_1"
        await s.commit()

    import json as _json
    wh_body = _json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"order_id": "rzp_ord_webhook_1", "id": "pay_wh_1"}}},
    }).encode("utf-8")
    wh_sig = hmac.new(server.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), wh_body, hashlib.sha256).hexdigest() if server.RAZORPAY_WEBHOOK_SECRET else ""
    wh_res = await client.post("/api/payments/webhook", content=wh_body, headers={"X-Razorpay-Signature": wh_sig})
    assert wh_res.status_code == 200
    assert (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"] == 3920.0
