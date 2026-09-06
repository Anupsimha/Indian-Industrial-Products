import asyncio
import logging
import os
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
try:
    from backend.services.support_contact_service import SupportContactManager
except ImportError:
    from services.support_contact_service import SupportContactManager

logger = logging.getLogger("iip.migrations.support_contact")


def load_frontend_env_values() -> Dict[str, str]:
    """
    Parses frontend/.env file to retrieve initial support contact values if available.
    """
    env_values = {}
    base_dir = Path(__file__).resolve().parent.parent.parent
    frontend_env_path = base_dir / "frontend" / ".env"

    if frontend_env_path.exists():
        try:
            with open(frontend_env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        env_values[k.strip()] = v.strip().strip('"').strip("'")
        except Exception as e:
            logger.warning(f"Could not read frontend .env file: {e}")

    return env_values


class SupportContactMigration:
    """
    Separately handled migration class for initializing system_settings table with support contact details.
    """

    def __init__(self, db: AsyncSession, system_setting_model):
        self.db = db
        self.system_setting_model = system_setting_model

    async def run(self) -> bool:
        """
        Executes support contact details migration.
        """
        logger.info("Executing support contact details migration...")
        frontend_env = load_frontend_env_values()

        # Combine OS env with frontend env values (OS env takes priority)
        merged_env = {**frontend_env, **os.environ}

        manager = SupportContactManager(self.db, self.system_setting_model)
        seeded = await manager.seed_initial_contacts_if_missing(merged_env)

        if seeded:
            logger.info("Support contact details successfully migrated and seeded into system_settings.")
        else:
            logger.info("Support contact details already exist in system_settings. Migration skipped.")

        return seeded


async def run_migration_standalone():
    """
    CLI Standalone Migration runner.
    """
    try:
        from backend.server import AsyncSessionLocal, SystemSetting
    except ImportError:
        from server import AsyncSessionLocal, SystemSetting

    async with AsyncSessionLocal() as session:
        migration = SupportContactMigration(session, SystemSetting)
        await migration.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_migration_standalone())
