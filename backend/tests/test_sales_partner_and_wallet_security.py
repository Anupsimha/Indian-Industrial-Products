import asyncio
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
    try:
        import backend.server as _bserver
        app.dependency_overrides[_bserver.get_db] = override_get_db
        monkeypatch.setattr(_bserver, "AsyncSessionLocal", Session)
    except ImportError:
        pass
    monkeypatch.setattr(server, "ENQUIRY_MEDIA_DIR", tmp_path)
    monkeypatch.setattr(server, "UPLOADS_DIR", tmp_path / "uploads")
    monkeypatch.setattr(server, "VACANCY_RESUME_DIR", tmp_path / "resumes")
    server.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    server.VACANCY_RESUME_DIR.mkdir(parents=True, exist_ok=True)
    server._revoked_token_hashes.clear()
    server._otp_failed_attempts.clear()
    server._auth_rate_buckets.clear()
    server._razorpay_order_intents.clear()

    sent_emails = []

    async def _spy_email(*args, **kwargs):
        to = kwargs.get("to") if "to" in kwargs else (args[0] if len(args) > 0 else None)
        subject = kwargs.get("subject") if "subject" in kwargs else (args[1] if len(args) > 1 else None)
        html_body = kwargs.get("html_body") if "html_body" in kwargs else (args[2] if len(args) > 2 else None)
        sent_emails.append((to, subject, html_body))
        return True

    monkeypatch.setattr(server, "send_email", _spy_email)
    monkeypatch.setattr(server, "_test_sent_emails", sent_emails, raising=False)
    try:
        import backend.server as _bserver
        monkeypatch.setattr(_bserver, "send_email", _spy_email)
    except ImportError:
        pass

    class _FakeResp:
        status_code = 200
        text = "{}"

        def __init__(self, payload):
            self._payload = payload

        def json(self):
            return self._payload

    _order_seq = {"n": 0}

    def _fake_requests_post(url, json=None, auth=None, timeout=10):
        _order_seq["n"] += 1
        return _FakeResp({"id": f"order_rzp_{json.get('amount', 0)}_{_order_seq['n']}"})

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
        client.sent_emails = sent_emails
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

    # Admin deal listing & buyer purchased deals must serialize cleanly (no circular ref)
    admin_deals_res = await client.get("/api/admin/sales-partner-deals", headers=_auth("admin_1"))
    assert admin_deals_res.status_code == 200, admin_deals_res.text
    admin_deals = admin_deals_res.json()
    assert len(admin_deals) >= 1
    admin_deal = next(d for d in admin_deals if d["id"] == deal_id)
    assert admin_deal["lead"]["name"] == "Suresh Jindal"
    assert admin_deal["lead"]["mobile"] == "9822223333"
    assert admin_deal["lead"]["deal"] is None
    assert admin_deal["sales_partner"]["name"] == "Ramesh Partner"
    assert admin_deal["buyer"]["name"] == "Priya Buyer"

    purchased_res = await client.get("/api/sales-partner/purchased-deals", headers=_auth("buyer_1"))
    assert purchased_res.status_code == 200, purchased_res.text
    purchased_deals = purchased_res.json()
    assert len(purchased_deals) >= 1
    purchased_deal = next(d for d in purchased_deals if d["id"] == deal_id)
    assert purchased_deal["lead"]["name"] == "Suresh Jindal"
    assert purchased_deal["lead"]["mobile"] == "9822223333"
    assert purchased_deal["lead"]["deal"] is None
    assert purchased_deal["sales_partner"]["name"] == "Ramesh Partner"

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
            "razorpay_order_id": "rzp_ord_self_1",
            "razorpay_signature": _rzp_sig("rzp_ord_self_1", "pay_self_1"),
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
            "razorpay_order_id": "rzp_ord_real_1",
            "razorpay_signature": _rzp_sig("rzp_ord_real_1", "pay_real_1"),
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
        "payload": {
            "payment": {
                "entity": {
                    "order_id": "rzp_ord_webhook_1",
                    "id": "pay_wh_1",
                    "amount": int(round(pending_ord.json()["total"] * 100)),
                    "currency": "INR",
                    "status": "captured",
                }
            }
        },
    }).encode("utf-8")
    wh_sig = hmac.new(server.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), wh_body, hashlib.sha256).hexdigest() if server.RAZORPAY_WEBHOOK_SECRET else ""
    wh_res = await client.post("/api/payments/webhook", content=wh_body, headers={"X-Razorpay-Signature": wh_sig})
    assert wh_res.status_code == 200
    assert (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"] == 3920.0


@pytest.mark.anyio
async def test_pentest_vulnerability_remediations(test_env):
    client, Session = test_env

    # C1: Privilege escalation blocked on /auth/register and /users/me
    reg_admin = await client.post(
        "/api/auth/register",
        json={
            "name": "Evil Admin",
            "email": "evil_admin@test.com",
            "mobile": "9888877777",
            "password": "Password123!",
            "role": "admin",
        },
    )
    assert reg_admin.status_code in (403, 422), reg_admin.text

    patch_me = await client.patch(
        "/api/auth/me",
        json={
            "name": "Priya Updated",
            "role": "admin",
            "is_verified": False,
            "plan_name": "Enterprise",
        },
        headers=_auth("buyer_1"),
    )
    assert patch_me.status_code == 200, patch_me.text
    assert patch_me.json()["role"] == "buyer"
    assert patch_me.json()["plan_name"] == "Premium"
    assert patch_me.json()["is_verified"] is True

    # C2 & C4: "free_plan" bypass rejected for paid plan & cross-flow intent replay blocked
    async with Session() as s:
        s.add(
            server.Plan(
                id="plan_paid_1",
                name="Growth",
                monthly_price=5000.0,
                yearly_price=50000.0,
                color="blue",
                features=["Leads"],
                created_at=now_iso(),
            )
        )
        s.add(
            Product(
                id="prod_cart_1",
                company_id="comp_mfg_1",
                name="Lathe Chuck",
                description="Heavy duty chuck",
                category="Machining",
                price="₹3,000",
                moq="1 unit",
                image_url="https://example.com/chuck.jpg",
                created_at=now_iso(),
            )
        )
        s.add(
            server.MembershipInvoice(
                id="inv_buyer_1",
                invoice_number="INV-2026-9901",
                user_id="buyer_1",
                plan_id="plan_paid_1",
                plan_name="Growth",
                billing_cycle="monthly",
                base_amount=5000.0,
                gst_rate=18.0,
                gst_amount=900.0,
                total_amount=5900.0,
                payment_id="pay_inv_seed_1",
                razorpay_order_id="rzp_inv_seed_1",
                created_at=now_iso(),
            )
        )
        s.add(
            server.WebsiteTemplate(
                id="tmpl_private_other",
                name="Other Co Private",
                is_active=True,
                is_custom=True,
                assigned_company_id="comp_other_999",
                created_at=now_iso(),
                updated_at=now_iso(),
            )
        )
        s.add(
            server.CompanyWebsite(
                id="web_mfg_1",
                company_id="comp_mfg_1",
                owner_id="mfg_company_user",
                subdomain="apex-cnc",
                template_id="industrial_modern",
                created_at=now_iso(),
                updated_at=now_iso(),
            )
        )
        s.add(
            server.Job(
                id="job_sec_1",
                company_id="comp_mfg_1",
                company_name="Apex CNC Works",
                title="CNC Operator",
                location="Bengaluru",
                type="Full-time",
                description="CNC role",
                posted="Today",
                created_at=now_iso(),
            )
        )
        s.add(
            server.IndustrialGroup(
                id="grp_pub_1",
                name="Machining Buyers",
                slug="machining-buyers",
                location="Bengaluru",
                description="Test group",
                image_url="https://example.com/g.jpg",
                created_at=now_iso(),
            )
        )
        s.add(
            Enquiry(
                id="enq_grp_1",
                user_id="buyer_1",
                name="Hidden Contact Name",
                mobile="9876543210",
                requirement="Need CNC Turning Job Work",
                category="Machining",
                location="Bengaluru",
                status="new",
                group_id="grp_pub_1",
                created_at=now_iso(),
            )
        )
        await s.commit()

    free_bypass = await client.post(
        "/api/payments/verify",
        json={
            "plan_id": "plan_paid_1",
            "billing_cycle": "monthly",
            "razorpay_order_id": "free_plan",
            "razorpay_payment_id": "free",
            "razorpay_signature": "free",
        },
        headers=_auth("buyer_1"),
    )
    assert free_bypass.status_code == 400, free_bypass.text

    # Zero-rupee cart bypass blocked & tampered cart amount overridden by DB price
    zero_cart = await client.post(
        "/api/payments/create-order-cart",
        json={"amount": 0},
        headers=_auth("buyer_1"),
    )
    assert zero_cart.status_code == 400, zero_cart.text

    cart_order_res = await client.post(
        "/api/payments/create-order-cart",
        json={
            "amount": 1.0,
            "delivery_cost": 0.0,
            "items": [{"product_id": "prod_cart_1", "name": "Lathe Chuck", "qty": 2, "price": "₹1"}],
        },
        headers=_auth("buyer_1"),
    )
    assert cart_order_res.status_code == 200, cart_order_res.text
    cart_rzp_id = cart_order_res.json()["order_id"]
    assert cart_order_res.json()["amount"] == 708000  # 2 * 3000 + 18% GST = 7080 INR

    # Cross-flow intent replay: cart razorpay_order_id cannot buy a membership plan
    cross_replay = await client.post(
        "/api/payments/verify",
        json={
            "plan_id": "plan_paid_1",
            "billing_cycle": "monthly",
            "razorpay_order_id": cart_rzp_id,
            "razorpay_payment_id": "pay_cross_1",
            "razorpay_signature": _rzp_sig(cart_rzp_id, "pay_cross_1"),
        },
        headers=_auth("buyer_1"),
    )
    assert cross_replay.status_code == 400, cross_replay.text

    # C3: Paid order without signature rejected; valid paid order can be placed and wallet reversed when rejected
    unsigned_order = await client.post(
        "/api/orders",
        json={
            "items": [{"product_id": "prod_cart_1", "name": "Lathe Chuck", "qty": 1, "price": "₹3,000"}],
            "subtotal": 3000.0,
            "delivery_cost": 0.0,
            "gst": 540.0,
            "total": 3540.0,
            "delivery_option": "free",
            "payment_method": "razorpay",
            "payment_id": "pay_fake_only",
            "address": "Test Address",
        },
        headers=_auth("buyer_1"),
    )
    assert unsigned_order.status_code == 400, unsigned_order.text

    valid_paid_ord = await client.post(
        "/api/orders",
        json={
            "items": [{"product_id": "prod_cart_1", "name": "Lathe Chuck", "qty": 1, "price": "₹3,000"}],
            "subtotal": 3000.0,
            "delivery_cost": 0.0,
            "gst": 540.0,
            "total": 3540.0,
            "delivery_option": "free",
            "payment_method": "razorpay",
            "payment_id": "pay_cart_valid_1",
            "razorpay_order_id": cart_rzp_id,
            "razorpay_signature": _rzp_sig(cart_rzp_id, "pay_cart_valid_1"),
            "address": "Buyer Address",
        },
        headers=_auth("buyer_1"),
    )
    assert valid_paid_ord.status_code == 200, valid_paid_ord.text
    paid_ord_id = valid_paid_ord.json()["id"]
    w_before_reject = (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"]
    assert w_before_reject == 2940.0  # 3000 * 0.98

    # Rejecting a paid order debits the seller wallet via DEBIT_REFUND
    rej_res = await client.post(
        f"/api/orders/{paid_ord_id}/reject",
        headers=_auth("buyer_1"),
    )
    assert rej_res.status_code == 200, rej_res.text
    w_after_reject = (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()["available_balance"]
    assert w_after_reject == 0.0

    # H6: Shipping track IDOR protection
    assert (await client.get(f"/api/shipping/track/{paid_ord_id}")).status_code == 401
    assert (await client.get(f"/api/shipping/track/{paid_ord_id}", headers=_auth("sp_1"))).status_code == 403
    assert (await client.get(f"/api/shipping/track/{paid_ord_id}", headers=_auth("buyer_1"))).status_code == 200

    # H3: Invoice download requires auth + owner/admin
    assert (await client.get("/api/invoices/inv_buyer_1/download")).status_code == 401
    assert (await client.get("/api/invoices/inv_buyer_1/download", headers=_auth("sp_1"))).status_code == 403
    assert (await client.get(f"/api/invoices/inv_buyer_1/download?token={create_token('sp_1')}")).status_code == 403
    inv_ok = await client.get(f"/api/invoices/inv_buyer_1/download?token={create_token('buyer_1')}")
    assert inv_ok.status_code == 200, inv_ok.text

    # C6 / H2: Upload requires auth & safe extension/content; VacancyResume blocks unauth & .json
    assert (await client.post("/api/upload", files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")})).status_code == 401
    bad_ext = await client.post(
        "/api/upload",
        files={"file": ("shell.html", b"<script>alert(1)</script>", "text/html")},
        headers=_auth("buyer_1"),
    )
    assert bad_ext.status_code == 400, bad_ext.text

    job_dir = server.VACANCY_RESUME_DIR / "job_sec_1"
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "buyer_1.pdf").write_bytes(b"%PDF-1.4 sample")
    (job_dir / "buyer_1.pdf.json").write_text('{"phone":"secret"}')
    assert (await client.get("/VacancyResume/job_sec_1/buyer_1.pdf")).status_code == 401
    assert (await client.get("/VacancyResume/job_sec_1/buyer_1.pdf", headers=_auth("sp_1"))).status_code == 403
    assert (await client.get("/VacancyResume/job_sec_1/buyer_1.pdf.json", headers=_auth("buyer_1"))).status_code == 403
    assert (await client.get("/VacancyResume/job_sec_1/buyer_1.pdf", headers=_auth("buyer_1"))).status_code == 200
    assert (await client.get("/VacancyResume/job_sec_1/buyer_1.pdf", headers=_auth("mfg_company_user"))).status_code == 200

    # H8 / Website / Group masking / Deleted user checks
    assert (await client.post("/api/news/admin/fetch-now", headers=_auth("buyer_1"))).status_code == 403
    bad_url = await client.patch(
        "/api/companies/comp_mfg_1",
        json={"website": "javascript:alert(1)"},
        headers=_auth("mfg_company_user"),
    )
    assert bad_url.status_code == 400, bad_url.text
    bad_tmpl = await client.put(
        "/api/websites/my-website",
        json={"template_id": "tmpl_private_other"},
        headers=_auth("mfg_company_user"),
    )
    assert bad_tmpl.status_code == 403, bad_tmpl.text

    grp_leads = await client.get("/api/industrial-groups/grp_pub_1/leads")
    assert grp_leads.status_code == 200
    assert "9876543210" not in str(grp_leads.json())
    assert "Hidden Contact Name" not in str(grp_leads.json())

    # M2: OTP brute-force attempt lockout after 5 wrong tries
    from datetime import datetime, timedelta, timezone
    async with Session() as s:
        u = (await s.execute(select(User).where(User.id == "buyer_1"))).scalar_one()
        u.is_verified = False
        u.verification_code = "654321"
        u.verification_expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        await s.commit()
    for _ in range(5):
        r_bad_otp = await client.post("/api/auth/verify-otp", json={"email": "buyer1@test.com", "otp": "000000"})
        assert r_bad_otp.status_code == 400
    r_locked_otp = await client.post("/api/auth/verify-otp", json={"email": "buyer1@test.com", "otp": "654321"})
    assert r_locked_otp.status_code == 429

    # Restore verified + test H1 token revocation & deleted-account gating
    async with Session() as s:
        u = (await s.execute(select(User).where(User.id == "buyer_1"))).scalar_one()
        u.is_verified = True
        await s.commit()

    tok = create_token("buyer_1")
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})).status_code == 200
    assert (await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {tok}"})).status_code == 200
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})).status_code == 401

    async with Session() as s:
        u = (await s.execute(select(User).where(User.id == "sp_1"))).scalar_one()
        u.is_deleted = True
        await s.commit()
    assert (await client.get("/api/sales-partner/my-leads", headers=_auth("sp_1"))).status_code == 403


@pytest.mark.anyio
async def test_structured_disputes_relist_soldout_and_emails(test_env):
    client, Session = test_env

    # 1. Sales partner posts ₹1,00,000 deal -> ₹2,000 base lead value -> ₹1,000 (50%) escrow / refund share
    lead_res = await client.post(
        "/api/sales-partner/leads",
        json={
            "name": "Mahesh Kulkarni",
            "mobile": "9855556666",
            "requirement": "Need Hydraulic Press 200T",
            "product_name": "Hydraulic Press 200T",
            "category": "Machinery",
            "location": "Nashik, Maharashtra",
            "quantity": "1 Unit",
            "total_deal_value": 100000,
        },
        headers=_auth("sp_1"),
    )
    assert lead_res.status_code == 200, lead_res.text
    lead_id = lead_res.json()["id"]

    # 2. Buyer 1 unlocks the lead
    ord1 = (await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("buyer_1"))).json()
    ver1 = await client.post(
        f"/api/sales-partner/leads/{lead_id}/verify-payment",
        json={
            "razorpay_order_id": ord1["order_id"],
            "razorpay_payment_id": "pay_relist_1",
            "razorpay_signature": _rzp_sig(ord1["order_id"], "pay_relist_1"),
        },
        headers=_auth("buyer_1"),
    )
    assert ver1.status_code == 200, ver1.text
    deal1_id = ver1.json()["deal"]["id"]
    assert ver1.json()["mobile"] == "9855556666"

    # Validation check: omitting reason_code with short reason fails
    bad_rep = await client.post(
        f"/api/sales-partner/deals/{deal1_id}/report-fake",
        json={"reason": "no"},
        headers=_auth("buyer_1"),
    )
    assert bad_rep.status_code == 400

    # 3. Buyer 1 reports structured dispute `deal_not_done` with optional empty notes
    client.sent_emails.clear()
    rep1 = await client.post(
        f"/api/sales-partner/deals/{deal1_id}/report-fake",
        json={"reason_code": "deal_not_done", "reason": ""},
        headers=_auth("buyer_1"),
    )
    assert rep1.status_code == 200, rep1.text
    rep1_data = rep1.json()
    assert rep1_data["ok"] is True
    assert "50% of the base lead will be refunded to your wallet" in rep1_data["message"]
    assert rep1_data["deal"]["status"] == "FAKE_REPORTED"
    assert rep1_data["deal"]["dispute_reason_code"] == "deal_not_done"
    assert rep1_data["deal"]["fake_report_reason"] == "Deal not done"

    await asyncio.sleep(0)
    await asyncio.sleep(0)
    email_recipients = {to for (to, _, _) in client.sent_emails}
    assert "buyer1@test.com" in email_recipients
    assert "partner@test.com" in email_recipients
    assert "admin@test.com" in email_recipients

    async with Session() as s:
        buyer_notifs = (await s.execute(select(Notification).where(Notification.user_id == "buyer_1"))).scalars().all()
        sp_notifs = (await s.execute(select(Notification).where(Notification.user_id == "sp_1"))).scalars().all()
        adm_notifs = (await s.execute(select(Notification).where(Notification.user_id == "admin_1"))).scalars().all()
        assert any("50% of the base lead will be refunded" in n.body for n in buyer_notifs)
        assert any("Deal not done" in n.body or "Deal not done" in n.title for n in sp_notifs)
        assert any("Deal not done" in n.body or "Deal not done" in n.title for n in adm_notifs)

    # While FAKE_REPORTED, partner pending commission still reflects ₹1,000
    my_leads_disputed = (await client.get("/api/sales-partner/my-leads", headers=_auth("sp_1"))).json()
    assert my_leads_disputed["summary"]["pending_commission"] == 1000.0

    # 4. Admin resolves deal_1 with `approve_relist_refund`
    client.sent_emails.clear()
    rel_res = await client.post(
        f"/api/admin/sales-partner-deals/{deal1_id}/resolve",
        json={"action": "approve_relist_refund", "notes": "Buyer & partner confirmed deal did not close"},
        headers=_auth("admin_1"),
    )
    assert rel_res.status_code == 200, rel_res.text
    rel_deal = rel_res.json()["deal"]
    assert rel_deal["status"] == "RELISTED"
    assert rel_deal["dispute_reason_code"] == "deal_not_done"
    assert rel_deal["relisted_at"] is not None

    await asyncio.sleep(0)
    await asyncio.sleep(0)
    rel_emails = {to: (subj, body) for (to, subj, body) in client.sent_emails}
    assert "buyer1@test.com" in rel_emails
    assert "partner@test.com" in rel_emails
    assert "1,000.00" in rel_emails["buyer1@test.com"][1]
    assert "re-listed" in rel_emails["partner@test.com"][1].lower()

    # Double-resolution / double-refund is rejected on finalized RELISTED deal
    for bad_action in ("approve_relist_refund", "approve_fake_refund", "reject_fake_report", "approve_partner_payout"):
        dup_res = await client.post(
            f"/api/admin/sales-partner-deals/{deal1_id}/resolve",
            json={"action": bad_action},
            headers=_auth("admin_1"),
        )
        assert dup_res.status_code == 400, f"Expected 400 for {bad_action} on RELISTED deal"

    # Buyer 1 wallet received 50% (₹1,000.0), partner pending escrow returned to ₹0
    buyer1_w = (await client.get("/api/wallet/me", headers=_auth("buyer_1"))).json()
    assert buyer1_w["available_balance"] == 1000.0
    buyer1_txs = (await client.get("/api/wallet/me/transactions", headers=_auth("buyer_1"))).json()
    assert any(t["type"] == "CREDIT_DISPUTE_REFUND" and t["amount"] == 1000.0 for t in buyer1_txs)

    sp_w_relist = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_w_relist["pending_balance"] == 0.0
    assert sp_w_relist["available_balance"] == 0.0

    # Lead is open again (`is_sold_out=False`) on marketplace feed, Buyer 1 is no longer active owner,
    # while Buyer 1 still sees historical RELISTED deal in `/api/sales-partner/purchased-deals`
    feed_b1 = (await client.get("/api/requirements", headers=_auth("buyer_1"))).json()
    feed_lead_b1 = next(x for x in feed_b1 if x["id"] == lead_id)
    assert feed_lead_b1["is_sold_out"] is False
    assert feed_lead_b1["is_unlocked"] is False
    assert feed_lead_b1["mobile"] != "9855556666"
    assert feed_lead_b1["deal"] is None

    purchased_b1 = (await client.get("/api/sales-partner/purchased-deals", headers=_auth("buyer_1"))).json()
    assert any(d["id"] == deal1_id and d["status"] == "RELISTED" for d in purchased_b1)

    my_leads_relisted = (await client.get("/api/sales-partner/my-leads", headers=_auth("sp_1"))).json()
    assert my_leads_relisted["summary"]["sold_leads"] == 0
    assert my_leads_relisted["summary"]["pending_commission"] == 0.0

    # 5. Buyer 2 (mfg_company_user) purchases the re-listed lead cleanly!
    ord2 = await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("mfg_company_user"))
    assert ord2.status_code == 200, ord2.text
    ord2_id = ord2.json()["order_id"]

    ver2 = await client.post(
        f"/api/sales-partner/leads/{lead_id}/verify-payment",
        json={
            "razorpay_order_id": ord2_id,
            "razorpay_payment_id": "pay_relist_2",
            "razorpay_signature": _rzp_sig(ord2_id, "pay_relist_2"),
        },
        headers=_auth("mfg_company_user"),
    )
    assert ver2.status_code == 200, ver2.text
    deal2 = ver2.json()["deal"]
    deal2_id = deal2["id"]
    assert deal2_id != deal1_id
    assert deal2["status"] == "UNLOCKED"
    assert ver2.json()["mobile"] == "9855556666"

    # Multi-deal precedence checks: SP & Buyer 2 see active Deal 2; Buyer 1 sees Sold Out without Deal 2 leaked
    my_leads_resold = (await client.get("/api/sales-partner/my-leads", headers=_auth("sp_1"))).json()
    assert my_leads_resold["summary"]["sold_leads"] == 1
    assert my_leads_resold["summary"]["pending_commission"] == 1000.0
    sp_lead_row = next(x for x in my_leads_resold["leads"] if x["id"] == lead_id)
    assert sp_lead_row["deal"]["id"] == deal2_id
    assert sp_lead_row["deal"]["status"] == "UNLOCKED"
    assert len(sp_lead_row["deals"]) == 2

    feed_b2 = (await client.get("/api/requirements", headers=_auth("mfg_company_user"))).json()
    feed_lead_b2 = next(x for x in feed_b2 if x["id"] == lead_id)
    assert feed_lead_b2["is_sold_out"] is True
    assert feed_lead_b2["is_unlocked"] is True
    assert feed_lead_b2["deal"]["id"] == deal2_id

    feed_b1_after = (await client.get("/api/requirements", headers=_auth("buyer_1"))).json()
    feed_lead_b1_after = next(x for x in feed_b1_after if x["id"] == lead_id)
    assert feed_lead_b1_after["is_sold_out"] is True
    assert feed_lead_b1_after["is_unlocked"] is False
    assert feed_lead_b1_after["deal"] is None

    # 6. Buyer 2 reports `wrong_phone` with details -> Admin resolves with `approve_fake_refund`
    client.sent_emails.clear()
    rep2 = await client.post(
        f"/api/sales-partner/deals/{deal2_id}/report-fake",
        json={"reason_code": "wrong_phone", "reason": "Called twice, number belongs to unrelated salon"},
        headers=_auth("mfg_company_user"),
    )
    assert rep2.status_code == 200, rep2.text
    assert rep2.json()["deal"]["status"] == "FAKE_REPORTED"
    assert rep2.json()["deal"]["dispute_reason_code"] == "wrong_phone"
    assert rep2.json()["deal"]["fake_report_reason"] == "Wrong phone: Called twice, number belongs to unrelated salon"

    await asyncio.sleep(0)
    await asyncio.sleep(0)
    rep2_emails = {to for (to, _, _) in client.sent_emails}
    assert "mfg@test.com" in rep2_emails
    assert "partner@test.com" in rep2_emails
    assert "admin@test.com" in rep2_emails

    client.sent_emails.clear()
    fake_res = await client.post(
        f"/api/admin/sales-partner-deals/{deal2_id}/resolve",
        json={"action": "approve_fake_refund", "notes": "Confirmed wrong phone number"},
        headers=_auth("admin_1"),
    )
    assert fake_res.status_code == 200, fake_res.text
    assert fake_res.json()["deal"]["status"] == "REFUNDED"

    await asyncio.sleep(0)
    await asyncio.sleep(0)
    fake_emails = {to: (subj, body) for (to, subj, body) in client.sent_emails}
    assert "mfg@test.com" in fake_emails
    assert "partner@test.com" in fake_emails
    assert "1,000.00" in fake_emails["mfg@test.com"][1]
    assert "sold out" in fake_emails["partner@test.com"][1].lower()

    async with Session() as s:
        mfg_notifs = (await s.execute(select(Notification).where(Notification.user_id == "mfg_company_user"))).scalars().all()
        sp_notifs_after = (await s.execute(select(Notification).where(Notification.user_id == "sp_1"))).scalars().all()
        assert any(n.type == "partner_fake_refund" and "1,000.00" in n.body for n in mfg_notifs)
        assert any("Sold Out" in n.body or "Sold Out" in n.title for n in sp_notifs_after)

    # Buyer 2's company wallet received ₹1,000 refund; SP pending is ₹0; lead stays permanently Sold Out
    mfg_w = (await client.get("/api/companies/me/wallet", headers=_auth("mfg_company_user"))).json()
    assert mfg_w["available_balance"] == 1000.0
    sp_w_end = (await client.get("/api/wallet/me", headers=_auth("sp_1"))).json()
    assert sp_w_end["pending_balance"] == 0.0

    ord3 = await client.post(f"/api/sales-partner/leads/{lead_id}/create-order", headers=_auth("buyer_1"))
    assert ord3.status_code == 400
    assert "Sold Out" in ord3.json()["detail"]

    # 7. Verify reject_fake_report & admin override payout also email both Buyer and Sales Partner
    lead_c = (await client.post(
        "/api/sales-partner/leads",
        json={"name": "Lead C", "mobile": "9866667777", "requirement": "Air Compressors", "total_deal_value": 50000},
        headers=_auth("sp_1"),
    )).json()
    ord_c = (await client.post(f"/api/sales-partner/leads/{lead_c['id']}/create-order", headers=_auth("buyer_1"))).json()
    ver_c = (await client.post(
        f"/api/sales-partner/leads/{lead_c['id']}/verify-payment",
        json={
            "razorpay_order_id": ord_c["order_id"],
            "razorpay_payment_id": "pay_c_1",
            "razorpay_signature": _rzp_sig(ord_c["order_id"], "pay_c_1"),
        },
        headers=_auth("buyer_1"),
    )).json()
    deal_c_id = ver_c["deal"]["id"]

    await client.post(
        f"/api/sales-partner/deals/{deal_c_id}/report-fake",
        json={"reason_code": "price_too_high", "reason": "Quoted slightly higher than budget"},
        headers=_auth("buyer_1"),
    )
    client.sent_emails.clear()
    rej_c = await client.post(
        f"/api/admin/sales-partner-deals/{deal_c_id}/resolve",
        json={"action": "reject_fake_report", "notes": "Price negotiation normal"},
        headers=_auth("admin_1"),
    )
    assert rej_c.status_code == 200
    await asyncio.sleep(0)
    await asyncio.sleep(0)
    assert {"buyer1@test.com", "partner@test.com"}.issubset({to for (to, _, _) in client.sent_emails})

    client.sent_emails.clear()
    ov_c = await client.post(
        f"/api/admin/sales-partner-deals/{deal_c_id}/resolve",
        json={"action": "approve_partner_payout", "notes": "Confirmed offline delivery"},
        headers=_auth("admin_1"),
    )
    assert ov_c.status_code == 200
    await asyncio.sleep(0)
    await asyncio.sleep(0)
    assert {"buyer1@test.com", "partner@test.com"}.issubset({to for (to, _, _) in client.sent_emails})


