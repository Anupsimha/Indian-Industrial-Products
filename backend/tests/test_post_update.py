import pytest
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from server import Base, Post, PostCreate, PostUpdate, PostOut, hydrate_post, Company, User, now_iso, update_post

def test_post_update_schema():
    payload = PostUpdate(
        content="Updated post content",
        category="Machinery",
        media_urls=["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    )
    assert payload.content == "Updated post content"
    assert payload.category == "Machinery"
    assert len(payload.media_urls) == 2


@pytest.mark.anyio
async def test_post_update_functionality_and_authorization():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        owner_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())
        other_company_id = str(uuid.uuid4())

        user_owner = {
            "id": owner_id,
            "company_id": company_id,
            "role": "manufacturer"
        }
        user_intruder = {
            "id": str(uuid.uuid4()),
            "company_id": other_company_id,
            "role": "buyer"
        }
        user_admin = {
            "id": str(uuid.uuid4()),
            "company_id": None,
            "role": "admin"
        }

        # Create Company
        comp = Company(
            id=company_id,
            name="Apex Precision",
            description="Precision tools",
            category="Machinery",
            owner_id=owner_id,
            mobile="9876543210",
            whatsapp="9876543210",
            email="apex@example.com",
            location="Bengaluru",
            logo_url="https://example.com/logo.png",
            created_at=now_iso(),
        )
        session.add(comp)

        # Create original post
        post_id = str(uuid.uuid4())
        post = Post(
            id=post_id,
            company_id=company_id,
            content="Original post text",
            media_url="https://example.com/old.jpg",
            media_urls=["https://example.com/old.jpg"],
            media_type="image",
            category="Old Category",
            group_id=None,
            created_at=now_iso(),
        )
        session.add(post)
        await session.commit()

        # 1. Attempt update with non-owner non-admin user -> should raise 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await update_post(
                post_id=post_id,
                payload=PostUpdate(content="Hacked content"),
                user=user_intruder,
                db=session,
            )
        assert exc_info.value.status_code == 403

        # 2. Attempt update on non-existent post -> should raise 404 Not Found
        with pytest.raises(HTTPException) as exc_info404:
            await update_post(
                post_id=str(uuid.uuid4()),
                payload=PostUpdate(content="Missing"),
                user=user_owner,
                db=session,
            )
        assert exc_info404.value.status_code == 404

        # 3. Successful update by post owner
        updated_res = await update_post(
            post_id=post_id,
            payload=PostUpdate(
                content="Brand new CNC milling machines arrived in Bengaluru!",
                category="Industrial CNC",
                media_urls=["https://example.com/new1.jpg", "https://example.com/new2.jpg"],
            ),
            user=user_owner,
            db=session,
        )

        assert updated_res.id == post_id
        assert updated_res.content == "Brand new CNC milling machines arrived in Bengaluru!"
        assert updated_res.category == "Industrial CNC"
        assert updated_res.media_urls == ["https://example.com/new1.jpg", "https://example.com/new2.jpg"]
        assert updated_res.media_url == "https://example.com/new1.jpg"

        # 4. Admin can also edit post
        admin_update = await update_post(
            post_id=post_id,
            payload=PostUpdate(content="Admin audited content"),
            user=user_admin,
            db=session,
        )
        assert admin_update.content == "Admin audited content"
