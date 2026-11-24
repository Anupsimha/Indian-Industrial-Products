"""Services Catalog router providing CRUD and discovery endpoints for B2B service providers."""

import sys
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

if __package__ == "backend.routers" or ("backend.server" in sys.modules and "server" not in sys.modules):
    from backend.server import (
        Company,
        Service,
        _is_safe_http_or_local_url,
        clean_media_url,
        get_current_user,
        get_db,
        now_iso,
    )
else:
    try:
        from server import (
            Company,
            Service,
            _is_safe_http_or_local_url,
            clean_media_url,
            get_current_user,
            get_db,
            now_iso,
        )
    except ImportError:
        from backend.server import (
            Company,
            Service,
            _is_safe_http_or_local_url,
            clean_media_url,
            get_current_user,
            get_db,
            now_iso,
        )


services_router = APIRouter(prefix="", tags=["Services Catalog"])

PricingModelType = Literal["Fixed", "Starting From", "Per Hour", "Per Project", "Custom Quote"]
ServiceModeType = Literal["On-site", "Remote", "Both"]

_NON_NULLABLE_SERVICE_FIELDS = {"name", "category", "pricing_model", "service_mode", "is_active"}


class ServiceCreateIn(BaseModel):
    """Request payload for creating a service listing under an owned business company."""

    company_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    pricing_model: PricingModelType = "Custom Quote"
    price_range: Optional[str] = None
    service_mode: ServiceModeType = "On-site"
    service_area: Optional[str] = None
    turnaround_time: Optional[str] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=200)
    certifications: Optional[List[str]] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None
    is_active: bool = True


class ServiceUpdateIn(BaseModel):
    """Partial update payload for modifying an existing service listing."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    pricing_model: Optional[PricingModelType] = None
    price_range: Optional[str] = None
    service_mode: Optional[ServiceModeType] = None
    service_area: Optional[str] = None
    turnaround_time: Optional[str] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=200)
    certifications: Optional[List[str]] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    """Serialized service catalog item hydrated with provider company metadata."""

    id: str
    company_id: str
    name: str
    category: str
    description: Optional[str] = None
    pricing_model: str
    price_range: Optional[str] = None
    service_mode: str
    service_area: Optional[str] = None
    turnaround_time: Optional[str] = None
    experience_years: Optional[int] = None
    certifications: List[str] = []
    image_url: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None
    is_active: bool = True
    company_name: str = ""
    company_logo_url: Optional[str] = None
    company_location: Optional[str] = None
    company_whatsapp: Optional[str] = None
    company_provider_type: Optional[str] = None
    created_at: str
    updated_at: str


def _validate_service_media_url(url: Optional[str]) -> Optional[str]:
    if url is None:
        return None
    cleaned = url.strip()
    if not cleaned:
        return None
    if not (_is_safe_http_or_local_url(cleaned) or (cleaned.startswith("/api/products-images/") and ".." not in cleaned)):
        raise HTTPException(status_code=400, detail="Unsupported or unsafe image URL.")
    return cleaned


def _validate_service_media_list(urls: Optional[List[str]]) -> List[str]:
    if not urls:
        return []
    validated: List[str] = []
    for u in urls:
        if u is None:
            continue
        checked = _validate_service_media_url(u)
        if checked:
            validated.append(checked)
    return validated


def _serialize_service(svc: Service, company: Optional[Company]) -> ServiceOut:
    raw_imgs = getattr(svc, "images", None) or []
    cleaned_imgs = [clean_media_url(img) for img in raw_imgs if img]
    raw_certs = getattr(svc, "certifications", None) or []
    return ServiceOut(
        id=svc.id,
        company_id=svc.company_id,
        name=svc.name,
        category=svc.category,
        description=svc.description,
        pricing_model=svc.pricing_model or "Custom Quote",
        price_range=svc.price_range,
        service_mode=svc.service_mode or "On-site",
        service_area=svc.service_area,
        turnaround_time=svc.turnaround_time,
        experience_years=svc.experience_years,
        certifications=[str(c) for c in raw_certs if c],
        image_url=clean_media_url(svc.image_url),
        images=[img for img in cleaned_imgs if img],
        location=svc.location,
        is_active=bool(svc.is_active),
        company_name=company.name if company else "",
        company_logo_url=clean_media_url(company.logo_url) if company else None,
        company_location=company.location if company else None,
        company_whatsapp=company.whatsapp if company else None,
        company_provider_type=(getattr(company, "provider_type", None) or "product") if company else None,
        created_at=svc.created_at,
        updated_at=svc.updated_at,
    )


async def _hydrate_services(services: List[Service], db: AsyncSession) -> List[ServiceOut]:
    if not services:
        return []
    company_ids = list({s.company_id for s in services if s.company_id})
    companies_by_id: dict[str, Company] = {}
    if company_ids:
        rows = (await db.execute(select(Company).where(Company.id.in_(company_ids)))).scalars().all()
        companies_by_id = {c.id: c for c in rows}
    return [_serialize_service(s, companies_by_id.get(s.company_id)) for s in services]


async def _resolve_company_for_service_create(
    user: dict,
    requested_company_id: Optional[str],
    db: AsyncSession,
) -> Company:
    is_admin = user.get("role") == "admin"
    if is_admin:
        target_cid = requested_company_id or user.get("company_id")
        if not target_cid:
            owned = (
                await db.execute(select(Company).where(Company.owner_id == user["id"]))
            ).scalars().first()
            target_cid = owned.id if owned else None
        if not target_cid:
            raise HTTPException(status_code=400, detail="company_id is required to create a service.")
        comp = (await db.execute(select(Company).where(Company.id == target_cid))).scalar_one_or_none()
        if not comp:
            raise HTTPException(status_code=404, detail="Company not found")
        return comp

    company: Optional[Company] = None
    if user.get("company_id"):
        company = (
            await db.execute(select(Company).where(Company.id == user["company_id"]))
        ).scalar_one_or_none()
    if not company:
        company = (
            await db.execute(select(Company).where(Company.owner_id == user["id"]))
        ).scalars().first()

    if not company:
        raise HTTPException(
            status_code=403,
            detail="Only business accounts with a company profile can add services.",
        )

    if requested_company_id and requested_company_id != company.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only add services to your own company.",
        )
    return company


async def _assert_service_owner_or_admin(svc: Service, user: dict, db: AsyncSession) -> None:
    if user.get("role") == "admin":
        return
    if user.get("company_id") and user["company_id"] == svc.company_id:
        return
    company = (
        await db.execute(select(Company).where(Company.id == svc.company_id))
    ).scalar_one_or_none()
    if company and company.owner_id == user["id"]:
        return
    raise HTTPException(
        status_code=403,
        detail="Forbidden: You do not have permission to modify this service.",
    )


@services_router.get("/services", response_model=List[ServiceOut])
async def list_services(
    q: Optional[str] = None,
    category: Optional[str] = None,
    service_mode: Optional[str] = None,
    company_id: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List active services with optional search and catalog filters."""
    stmt = (
        select(Service)
        .outerjoin(Company, Service.company_id == Company.id)
        .where(Service.is_active == True)
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Service.name.ilike(term),
                Service.category.ilike(term),
                Service.description.ilike(term),
                Service.service_area.ilike(term),
                Service.location.ilike(term),
                Company.name.ilike(term),
            )
        )
    if category and category.strip():
        stmt = stmt.where(Service.category.ilike(f"%{category.strip()}%"))
    if service_mode and service_mode.strip():
        stmt = stmt.where(Service.service_mode.ilike(service_mode.strip()))
    if company_id and company_id.strip():
        stmt = stmt.where(Service.company_id == company_id.strip())
    if location and location.strip():
        loc_term = f"%{location.strip()}%"
        stmt = stmt.where(
            or_(
                Service.location.ilike(loc_term),
                Service.service_area.ilike(loc_term),
                Company.location.ilike(loc_term),
                Company.city.ilike(loc_term),
                Company.state.ilike(loc_term),
            )
        )

    stmt = stmt.order_by(desc(Service.created_at)).offset(skip).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return await _hydrate_services(rows, db)


@services_router.get("/services/{service_id}", response_model=ServiceOut)
async def get_service(service_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single service listing hydrated with provider company details."""
    svc = (await db.execute(select(Service).where(Service.id == service_id))).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    company = (
        await db.execute(select(Company).where(Company.id == svc.company_id))
    ).scalar_one_or_none()
    return _serialize_service(svc, company)


@services_router.get("/companies/{company_id}/services", response_model=List[ServiceOut])
async def list_company_services(
    company_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List active services offered by a specific company."""
    company = (
        await db.execute(select(Company).where(Company.id == company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    stmt = (
        select(Service)
        .where(Service.company_id == company_id, Service.is_active == True)
        .order_by(desc(Service.created_at))
        .offset(skip)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize_service(s, company) for s in rows]


@services_router.post("/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: ServiceCreateIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new service listing for the authenticated user's company (or target company for admin)."""
    company = await _resolve_company_for_service_create(user, payload.company_id, db)

    name_clean = payload.name.strip()
    category_clean = payload.category.strip()
    if not name_clean or not category_clean:
        raise HTTPException(status_code=400, detail="Service name and category are required.")

    image_url = _validate_service_media_url(payload.image_url)
    images = _validate_service_media_list(payload.images)
    certs = [c.strip() for c in (payload.certifications or []) if c and c.strip()]

    now = now_iso()
    sid = str(uuid.uuid4())
    svc = Service(
        id=sid,
        company_id=company.id,
        name=name_clean,
        category=category_clean,
        description=payload.description.strip() if payload.description else None,
        pricing_model=payload.pricing_model,
        price_range=payload.price_range.strip() if payload.price_range else None,
        service_mode=payload.service_mode,
        service_area=payload.service_area.strip() if payload.service_area else None,
        turnaround_time=payload.turnaround_time.strip() if payload.turnaround_time else None,
        experience_years=payload.experience_years,
        certifications=certs,
        image_url=image_url,
        images=images,
        location=payload.location.strip() if payload.location else None,
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    db.add(svc)
    await db.commit()

    loaded = (await db.execute(select(Service).where(Service.id == sid))).scalar_one()
    return _serialize_service(loaded, company)


@services_router.patch("/services/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: str,
    payload: ServiceUpdateIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing service listing owned by the authenticated user or admin."""
    svc = (await db.execute(select(Service).where(Service.id == service_id))).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    await _assert_service_owner_or_admin(svc, user, db)

    raw_updates = payload.model_dump(exclude_unset=True)
    update_data: dict = {}
    for key, val in raw_updates.items():
        if key in _NON_NULLABLE_SERVICE_FIELDS and val is None:
            continue
        if key == "image_url":
            update_data[key] = _validate_service_media_url(val)
        elif key == "images":
            update_data[key] = _validate_service_media_list(val)
        elif key == "certifications":
            update_data[key] = [c.strip() for c in (val or []) if c and c.strip()]
        elif isinstance(val, str):
            trimmed = val.strip()
            if key in ("name", "category") and not trimmed:
                raise HTTPException(status_code=400, detail=f"{key} cannot be blank.")
            update_data[key] = trimmed if trimmed else None
        else:
            update_data[key] = val

    if update_data:
        update_data["updated_at"] = now_iso()
        await db.execute(update(Service).where(Service.id == service_id).values(**update_data))
        await db.commit()
        svc = (await db.execute(select(Service).where(Service.id == service_id))).scalar_one()

    company = (
        await db.execute(select(Company).where(Company.id == svc.company_id))
    ).scalar_one_or_none()
    return _serialize_service(svc, company)


@services_router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a service listing owned by the authenticated user or admin."""
    svc = (await db.execute(select(Service).where(Service.id == service_id))).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    await _assert_service_owner_or_admin(svc, user, db)

    await db.delete(svc)
    await db.commit()
    return {"ok": True, "message": "Service deleted successfully"}
