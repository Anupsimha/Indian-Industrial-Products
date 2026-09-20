import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from server import Base, Post, PostCreate, PostOut, hydrate_post, Company, User, now_iso

def test_post_create_schema():
    payload = PostCreate(
        content="Testing multiple media post",
        media_urls=["https://res.cloudinary.com/demo/image/upload/sample.jpg", "https://res.cloudinary.com/demo/image/upload/sample2.jpg"],
        media_type="image",
    )
    assert payload.media_urls == [
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "https://res.cloudinary.com/demo/image/upload/sample2.jpg",
    ]
    assert payload.content == "Testing multiple media post"

def test_post_out_schema():
    out = PostOut(
        id=str(uuid.uuid4()),
        company_id=str(uuid.uuid4()),
        company_name="Test Co",
        company_logo="https://example.com/logo.png",
        location="Mumbai",
        content="Hello world",
        media_url="https://example.com/img1.jpg",
        media_urls=["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
        media_type="image",
        whatsapp="+919876543210",
        created_at="2026-09-20T18:00:00Z",
    )
    assert len(out.media_urls) == 2
    assert out.media_url == "https://example.com/img1.jpg"

@pytest.mark.anyio
async def test_post_creation_and_hydration_multiple_media():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        user_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())
        
        user = User(id=user_id, name="Test User", email="user1@example.com", password_hash="secret", mobile="9999999999", role="manufacturer", company_id=company_id, created_at=now_iso())
        company = Company(
            id=company_id,
            name="Test Corp",
            description="Leading manufacturer of industrial gearboxes.",
            category="Industrial Machinery",
            owner_id=user_id,
            mobile="9999999999",
            whatsapp="9999999999",
            email="test@example.com",
            location="Pune",
            logo_url="https://example.com/logo.png",
            created_at=now_iso(),
        )
        session.add(user)
        session.add(company)
        await session.commit()

        media_list = ["https://example.com/img1.jpg", "https://example.com/img2.jpg", "https://example.com/img3.jpg"]
        post_id = str(uuid.uuid4())
        post = Post(
            id=post_id,
            company_id=company_id,
            content="Post with 3 images",
            media_url=media_list[0],
            media_urls=media_list,
            media_type="image",
            created_at=now_iso(),
        )
        session.add(post)
        await session.commit()

        hydrated = await hydrate_post(post, None, session)
        assert hydrated is not None
        assert hydrated.id == post_id
        assert hydrated.media_url == "https://example.com/img1.jpg"
        assert hydrated.media_urls == media_list
        assert len(hydrated.media_urls) == 3

@pytest.mark.anyio
async def test_post_fallback_media_url():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        user_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())
        
        user = User(id=user_id, name="Legacy User", email="user2@example.com", password_hash="secret", mobile="8888888888", role="manufacturer", company_id=company_id, created_at=now_iso())
        company = Company(
            id=company_id,
            name="Legacy Corp",
            description="Legacy supplier of valves.",
            category="Pipes & Valves",
            owner_id=user_id,
            mobile="8888888888",
            whatsapp="8888888888",
            email="legacy@example.com",
            location="Delhi",
            logo_url="https://example.com/logo.png",
            created_at=now_iso(),
        )
        session.add(user)
        session.add(company)
        await session.commit()

        post_id = str(uuid.uuid4())
        post = Post(
            id=post_id,
            company_id=company_id,
            content="Legacy post",
            media_url="https://example.com/single.jpg",
            media_urls=None,
            media_type="image",
            created_at=now_iso(),
        )
        session.add(post)
        await session.commit()

        hydrated = await hydrate_post(post, None, session)
        assert hydrated is not None
        assert hydrated.media_url == "https://example.com/single.jpg"
        assert hydrated.media_urls == ["https://example.com/single.jpg"]
