from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
try:
    from backend.services.support_contact_service import (
        SupportContactManager,
        SupportContactDTO,
        SupportContactUpdateDTO,
    )
except ImportError:
    from services.support_contact_service import (
        SupportContactManager,
        SupportContactDTO,
        SupportContactUpdateDTO,
    )

support_contact_router = APIRouter(tags=["Support Contact"])


async def _get_db_and_model():
    try:
        from backend.server import get_db, SystemSetting
    except ImportError:
        from server import get_db, SystemSetting
    return get_db, SystemSetting


@support_contact_router.get("/support-contact", response_model=SupportContactDTO)
async def get_public_support_contact_route(
    db: AsyncSession = Depends(lambda: None)  # Fallback for router definition
):
    """
    Public endpoint to fetch system support contact details.
    """
    try:
        from server import AsyncSessionLocal, SystemSetting
    except ImportError:
        from backend.server import AsyncSessionLocal, SystemSetting

    async with AsyncSessionLocal() as session:
        manager = SupportContactManager(session, SystemSetting)
        return await manager.get_support_contacts()
