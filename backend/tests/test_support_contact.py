import asyncio
import sys
from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
root_dir = backend_dir.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from server import Base, SystemSetting
from services.support_contact_service import (
    SupportContactManager,
    SupportContactUpdateDTO,
)
from migrations.support_contact_migration import SupportContactMigration


def run_async(coro):
    return asyncio.run(coro)


def test_support_contact_migration_and_seeding():
    async def _test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            migration = SupportContactMigration(session, SystemSetting)
            seeded = await migration.run()
            assert seeded is True

            # Re-running should skip since settings already exist
            seeded_again = await migration.run()
            assert seeded_again is False

            manager = SupportContactManager(session, SystemSetting)
            contacts = await manager.get_support_contacts()

            assert contacts.support_phone != ""
            assert contacts.support_email != ""
            assert contacts.support_whatsapp != ""
            assert contacts.support_address != ""

        await engine.dispose()

    run_async(_test())


def test_support_contact_manager_update():
    async def _test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            manager = SupportContactManager(session, SystemSetting)
            # First seed
            await manager.seed_initial_contacts_if_missing()

            update_dto = SupportContactUpdateDTO(
                support_phone="+91 9999988888",
                support_whatsapp="9999988888",
                support_email="custom_support@platform.com",
                support_address="123 Industrial Park, Tech Hub",
            )

            updated = await manager.update_support_contacts(update_dto)

            assert updated.support_phone == "+91 9999988888"
            assert updated.support_whatsapp == "9999988888"
            assert updated.support_email == "custom_support@platform.com"
            assert updated.support_address == "123 Industrial Park, Tech Hub"

            # Fetch again to verify persistence
            persisted = await manager.get_support_contacts()
            assert persisted.support_phone == "+91 9999988888"
            assert persisted.support_email == "custom_support@platform.com"

        await engine.dispose()

    run_async(_test())
