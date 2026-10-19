import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from server import (
    Base, Plan, Enquiry, LeadTopupPlan, User,
    parse_lead_valuation_inr, get_applicable_topup_for_lead, _get_plan_monthly_limit
)

def test_parse_lead_valuation_inr():
    # 0 to 10,000 -> average is 5000
    assert parse_lead_valuation_inr("₹0 - ₹10,000") == 5000
    # 10,000 to 50,000 -> average is 30,000
    assert parse_lead_valuation_inr("₹10,000 - 50,000") == 30000
    # 50,000 to 1 Lakh -> average is (50,000 + 100,000) / 2 = 75,000
    assert parse_lead_valuation_inr("50,000 - 1 Lakh") == 75000
    # 1 Lakh to 5 Lakh -> average is 300,000
    assert parse_lead_valuation_inr("₹1 Lakh - 5 Lakh") == 300000
    # 5 Lakh+ -> single number 5 Lakh = 500,000
    assert parse_lead_valuation_inr("5 Lakh+") == 500000
    # Single number
    assert parse_lead_valuation_inr("₹20,000") == 20000
    # Fallback when None
    assert parse_lead_valuation_inr(None) == 25000

@pytest.mark.anyio
async def test_topup_plan_matching():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        # Seed topup tiers
        t1 = LeadTopupPlan(
            id="t1",
            valuation_range="₹0 - ₹10,000",
            min_valuation=0,
            max_valuation=10000,
            price_inr=199,
            is_active=True,
            sort_order=1,
            created_at="2026-10-19T00:00:00Z",
            updated_at="2026-10-19T00:00:00Z"
        )
        t2 = LeadTopupPlan(
            id="t2",
            valuation_range="₹10,000 - ₹50,000",
            min_valuation=10000,
            max_valuation=50000,
            price_inr=499,
            is_active=True,
            sort_order=2,
            created_at="2026-10-19T00:00:00Z",
            updated_at="2026-10-19T00:00:00Z"
        )
        t3 = LeadTopupPlan(
            id="t3",
            valuation_range="₹50,000 - ₹1 Lakh",
            min_valuation=50000,
            max_valuation=100000,
            price_inr=999,
            is_active=True,
            sort_order=3,
            created_at="2026-10-19T00:00:00Z",
            updated_at="2026-10-19T00:00:00Z"
        )
        session.add_all([t1, t2, t3])

        # Seed enquiries
        enq1 = Enquiry(
            id="enq_small",
            name="Small Order",
            mobile="9876543210",
            requirement="Small parts",
            category="Hardware",
            location="Bengaluru",
            budget="₹0 - ₹10,000",
            status="new",
            created_at="2026-10-19T00:00:00Z"
        )
        enq2 = Enquiry(
            id="enq_medium",
            name="Medium Order",
            mobile="9876543211",
            requirement="CNC Machining",
            category="Machining",
            location="Pune",
            budget="₹10,000 - 50,000",
            status="new",
            created_at="2026-10-19T00:00:00Z"
        )
        enq_no_budget = Enquiry(
            id="enq_none",
            name="No Budget Order",
            mobile="9876543212",
            requirement="Consulting",
            category="Services",
            location="Delhi",
            budget=None,
            status="new",
            created_at="2026-10-19T00:00:00Z"
        )
        session.add_all([enq1, enq2, enq_no_budget])
        await session.commit()

        # Check matching
        res1 = await get_applicable_topup_for_lead("enq_small", session)
        assert res1["topup_plan_id"] == "t1"
        assert res1["price_inr"] == 199
        assert res1["valuation_range"] == "₹0 - ₹10,000"

        res2 = await get_applicable_topup_for_lead("enq_medium", session)
        assert res2["topup_plan_id"] == "t2"
        assert res2["price_inr"] == 499

        res_none = await get_applicable_topup_for_lead("enq_none", session)
        # 25000 falls in 10,000 - 50,000 range
        assert res_none["price_inr"] == 499

@pytest.mark.anyio
async def test_plan_lead_unlock_and_website_entitlement():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        # Unlimited leads plan
        p_unlimited = Plan(
            id="p_unlimited",
            name="Unlimited Enterprise",
            unlocks_per_month=None,
            has_website=True,
            monthly_price=9999.0,
            yearly_price=99999.0,
            features=["Unlimited Leads", "Custom Company Website"],
            color="#2563eb",
            is_active=True,
            created_at="2026-10-19T00:00:00Z"
        )
        # Limited leads plan without website
        p_basic = Plan(
            id="p_basic",
            name="Basic Starter",
            unlocks_per_month=15,
            has_website=False,
            monthly_price=499.0,
            yearly_price=4999.0,
            features=["15 Leads / Month"],
            color="#64748b",
            is_active=True,
            created_at="2026-10-19T00:00:00Z"
        )
        session.add_all([p_unlimited, p_basic])
        await session.commit()

        limit_unlimited = await _get_plan_monthly_limit("Unlimited Enterprise", session)
        assert limit_unlimited is None  # None represents unlimited

        limit_basic = await _get_plan_monthly_limit("Basic Starter", session)
        assert limit_basic == 15

        assert p_unlimited.has_website is True
        assert p_basic.has_website is False
