from typing import Optional, Dict
import os
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class SupportContactDTO(BaseModel):
    support_phone: str = Field(..., description="Platform support phone number")
    support_whatsapp: str = Field(..., description="Platform support WhatsApp number")
    support_email: str = Field(..., description="Platform support email address")
    support_address: str = Field(..., description="Platform physical support address")


class SupportContactUpdateDTO(BaseModel):
    support_phone: Optional[str] = Field(None, description="Platform support phone number")
    support_whatsapp: Optional[str] = Field(None, description="Platform support WhatsApp number")
    support_email: Optional[str] = Field(None, description="Platform support email address")
    support_address: Optional[str] = Field(None, description="Platform physical support address")


class SupportContactManager:
    """
    Object-Oriented Manager for Platform Support Contact Details and System Settings.
    Encapsulates all database persistence, retrieval, and seeding operations.
    """

    SETTING_KEYS = {
        "phone": "support_phone",
        "whatsapp": "support_whatsapp",
        "email": "support_email",
        "address": "support_address",
    }

    # Initial fallbacks sourced strictly for seeding if missing in DB and .env
    DEFAULT_DEFAULTS = {
        "support_phone": "+91 9380036328",
        "support_whatsapp": "9380036328",
        "support_email": "support@indianindustrialplatform.com",
        "support_address": "No. 35 Suvarna Nagar Doddabidrekallu Nagasandra - 560073",
    }

    def __init__(self, db: AsyncSession, system_setting_model):
        self.db = db
        self.SystemSetting = system_setting_model

    async def get_setting(self, key: str, default: str = "") -> str:
        try:
            stmt = select(self.SystemSetting).where(self.SystemSetting.key == key)
            row = (await self.db.execute(stmt)).scalar_one_or_none()
            return row.value if row else default
        except Exception:
            return default

    async def set_setting(self, key: str, value: str) -> None:
        stmt = select(self.SystemSetting).where(self.SystemSetting.key == key)
        row = (await self.db.execute(stmt)).scalar_one_or_none()
        if row:
            row.value = value
        else:
            self.db.add(self.SystemSetting(key=key, value=value))

    async def get_support_contacts(self) -> SupportContactDTO:
        phone = await self.get_setting(self.SETTING_KEYS["phone"], default=self.DEFAULT_DEFAULTS["support_phone"])
        whatsapp = await self.get_setting(self.SETTING_KEYS["whatsapp"], default=self.DEFAULT_DEFAULTS["support_whatsapp"])
        email = await self.get_setting(self.SETTING_KEYS["email"], default=self.DEFAULT_DEFAULTS["support_email"])
        address = await self.get_setting(self.SETTING_KEYS["address"], default=self.DEFAULT_DEFAULTS["support_address"])

        return SupportContactDTO(
            support_phone=phone or self.DEFAULT_DEFAULTS["support_phone"],
            support_whatsapp=whatsapp or self.DEFAULT_DEFAULTS["support_whatsapp"],
            support_email=email or self.DEFAULT_DEFAULTS["support_email"],
            support_address=address or self.DEFAULT_DEFAULTS["support_address"],
        )


    async def update_support_contacts(self, update_data: SupportContactUpdateDTO) -> SupportContactDTO:
        if update_data.support_phone is not None:
            await self.set_setting(self.SETTING_KEYS["phone"], update_data.support_phone.strip())
        if update_data.support_whatsapp is not None:
            await self.set_setting(self.SETTING_KEYS["whatsapp"], update_data.support_whatsapp.strip())
        if update_data.support_email is not None:
            await self.set_setting(self.SETTING_KEYS["email"], update_data.support_email.strip())
        if update_data.support_address is not None:
            await self.set_setting(self.SETTING_KEYS["address"], update_data.support_address.strip())

        await self.db.commit()
        return await self.get_support_contacts()

    async def seed_initial_contacts_if_missing(self, initial_env_values: Optional[Dict[str, str]] = None) -> bool:
        """
        Seeds initial values into system_settings if they do not exist.
        Uses environment variables if provided, falling back to default configuration.
        """
        env_vals = initial_env_values or {}
        seeded_any = False

        seed_mapping = {
            self.SETTING_KEYS["phone"]: self.DEFAULT_DEFAULTS["support_phone"],
            self.SETTING_KEYS["whatsapp"]: self.DEFAULT_DEFAULTS["support_whatsapp"],
            self.SETTING_KEYS["email"]: self.DEFAULT_DEFAULTS["support_email"],
            self.SETTING_KEYS["address"]: self.DEFAULT_DEFAULTS["support_address"],
        }

        for key, initial_val in seed_mapping.items():
            existing = await self.get_setting(key, default="")
            if not existing:
                await self.set_setting(key, initial_val)
                seeded_any = True

        if seeded_any:
            await self.db.commit()

        return seeded_any
