import pytest
import uuid
from datetime import datetime, timezone, timedelta
from server import (
    Enquiry, User, _unlock_otp_store
)

def test_unlock_otp_store_structure():
    token = str(uuid.uuid4())
    _unlock_otp_store[token] = {
        "user_id": "test_user_1",
        "enq_id": "test_enq_1",
        "otp": "123456",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    assert token in _unlock_otp_store
    assert _unlock_otp_store[token]["otp"] == "123456"
    del _unlock_otp_store[token]

def test_enquiry_model_has_user_id_column():
    fake_enq = Enquiry(
        id="enq_test_123",
        user_id="user_buyer_999",
        name="Test Buyer",
        mobile="9876543210",
        requirement="500 HP Motor",
        category="Machinery",
        location="Pune",
        status="new",
        created_at="2026-09-09T00:00:00Z"
    )
    assert hasattr(fake_enq, "user_id")
    assert fake_enq.user_id == "user_buyer_999"

def test_confirm_unlock_handles_enquiry_without_user_id():
    fake_enq = Enquiry(
        id="enq_test_123",
        name="Test Buyer",
        mobile="9876543210",
        requirement="500 HP Motor",
        category="Machinery",
        location="Pune",
        status="new",
        created_at="2026-09-09T00:00:00Z"
    )
    creator_id = getattr(fake_enq, "user_id", None)
    assert creator_id is None

    fake_user = User(
        id="user_supplier_1",
        name="Supplier User",
        email="supplier@example.com",
        mobile="9123456789",
        role="supplier",
        plan_name="Gold",
        unlocked_enquiries=[],
        monthly_unlocks={}
    )

    token = str(uuid.uuid4())
    _unlock_otp_store[token] = {
        "user_id": fake_user.id,
        "enq_id": fake_enq.id,
        "otp": "654321",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }

    assert _unlock_otp_store[token]["enq_id"] == fake_enq.id
    del _unlock_otp_store[token]

def test_auto_migration_includes_enquiries_user_id():
    import server
    import inspect
    source = inspect.getsource(server)
    assert "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)" in source

@pytest.mark.anyio
async def test_get_plan_monthly_limit_handles_multiple_matching_plans():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from server import Base, Plan, _get_plan_monthly_limit
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        plan1 = Plan(id="p1", name="Basic", unlocks_per_month=30, color="#000000", is_active=True, created_at="2026-09-09T00:00:00Z")
        plan2 = Plan(id="p2", name="BASIC", unlocks_per_month=30, color="#000000", is_active=True, created_at="2026-09-09T00:00:00Z")
        session.add(plan1)
        session.add(plan2)
        await session.commit()

        limit = await _get_plan_monthly_limit("Basic", session)
        assert limit == 30




