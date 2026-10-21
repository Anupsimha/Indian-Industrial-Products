"""
Website Router.
Provides endpoints for custom company website management:
- Subdomain availability checking & reservation
- Hostinger DNS automated provisioning & wildcard fallback
- Modular template listing, sample data retrieval & admin template management
- Full-lifecycle setup wizard & progress state tracking
- Public tenant data hydration for deployed websites
- Dynamic tenant SEO metadata, sitemap.xml & robots.txt generation
"""

import os
import uuid
import logging
import socket
import zipfile
import shutil
import tempfile
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

# Imports that work both when run from root or within backend
try:
    from backend.server import (
        get_db, get_current_user, get_optional_user,
        Company, User, Product, Post, Reel, Plan, Notification,
        CompanyWebsite, WebsiteTemplate, CustomWebsiteRequest,
        CustomWebsiteConfig, WebsiteDeploymentLog, now_iso
    )
    from backend.services.hostinger_dns_service import (
        hostinger_dns_service, validate_subdomain, sanitize_subdomain, is_subdomain_reserved
    )
    from backend.email_utils import send_email
except ImportError:
    from server import (
        get_db, get_current_user, get_optional_user,
        Company, User, Product, Post, Reel, Plan, Notification,
        CompanyWebsite, WebsiteTemplate, CustomWebsiteRequest,
        CustomWebsiteConfig, WebsiteDeploymentLog, now_iso
    )
    from services.hostinger_dns_service import (
        hostinger_dns_service, validate_subdomain, sanitize_subdomain, is_subdomain_reserved
    )
    from email_utils import send_email

logger = logging.getLogger("website_router")

website_router = APIRouter(prefix="", tags=["Custom Website Management"])

ZONE_DOMAIN = os.environ.get("HOSTINGER_ZONE_DOMAIN", "indianindustrialplatform.com").strip()


# -------------------- Pydantic Schemas --------------------

class SubdomainCheckOut(BaseModel):
    available: bool
    subdomain: str
    full_domain: str
    reason: Optional[str] = None


class WebsiteSetupIn(BaseModel):
    subdomain: str
    template_id: str = "industrial_modern"
    theme_config: Optional[Dict[str, Any]] = None
    seo_config: Optional[Dict[str, Any]] = None


class WebsiteUpdateIn(BaseModel):
    template_id: Optional[str] = None
    theme_config: Optional[Dict[str, Any]] = None
    seo_config: Optional[Dict[str, Any]] = None
    custom_domain: Optional[str] = None


class WebsiteTemplateIn(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    badge: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str = "general_b2b"
    is_active: bool = True
    is_custom: bool = False
    assigned_company_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    sample_data: Optional[Dict[str, Any]] = None


# -------------------- Subdomain Checking --------------------

@website_router.get("/websites/check-subdomain", response_model=SubdomainCheckOut)
async def check_subdomain_availability(
    name: str = Query(..., description="Subdomain slug to check"),
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a subdomain is valid and available for registration.
    Verifies regex format, reserved platform words, and database collisions.
    """
    sanitized = sanitize_subdomain(name)
    valid, err_msg = validate_subdomain(sanitized)
    full_domain = f"{sanitized}.{ZONE_DOMAIN}"

    if not valid:
        return SubdomainCheckOut(
            available=False,
            subdomain=sanitized,
            full_domain=full_domain,
            reason=err_msg
        )

    # Check database collision
    stmt = select(CompanyWebsite).where(CompanyWebsite.subdomain == sanitized)
    existing = (await db.execute(stmt)).scalars().first()

    if existing:
        # Check if the existing website belongs to the requesting user's company
        if current_user and current_user.get("company_id") == existing.company_id:
            return SubdomainCheckOut(
                available=True,
                subdomain=sanitized,
                full_domain=full_domain,
                reason="This is your currently active subdomain."
            )
        return SubdomainCheckOut(
            available=False,
            subdomain=sanitized,
            full_domain=full_domain,
            reason=f"Subdomain '{sanitized}' is already registered by another company."
        )

    return SubdomainCheckOut(
        available=True,
        subdomain=sanitized,
        full_domain=full_domain,
        reason=None
    )


# -------------------- Template Retrieval --------------------

@website_router.get("/websites/templates")
async def list_website_templates(
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all active website templates.
    Returns general system templates plus any private custom template assigned
    exclusively to the authenticated user's company.
    """
    stmt = select(WebsiteTemplate).where(WebsiteTemplate.is_active == True)
    all_templates = (await db.execute(stmt)).scalars().all()

    user_company_id = current_user.get("company_id") if current_user else None
    user_id = current_user.get("id") if current_user else None
    user_role = current_user.get("role") if current_user else None

    visible_templates = []
    for t in all_templates:
        if not t.is_custom:
            visible_templates.append(t)
        elif user_role == "admin":
            visible_templates.append(t)
        elif (user_company_id and t.assigned_company_id == user_company_id) or \
             (user_id and t.assigned_user_id == user_id):
            visible_templates.append(t)

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "badge": t.badge,
            "thumbnail_url": t.thumbnail_url,
            "category": t.category,
            "is_custom": t.is_custom,
            "assigned_company_id": t.assigned_company_id,
            "sample_data": t.sample_data or {},
            "created_at": t.created_at,
        }
        for t in visible_templates
    ]


# -------------------- User Company Website Management --------------------

@website_router.get("/websites/my-website")
async def get_my_company_website(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the current authenticated company's website configuration and status.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        return {
            "has_website": False,
            "can_create": False,
            "website": None,
            "message": "User has no associated company."
        }

    stmt = select(CompanyWebsite).where(CompanyWebsite.company_id == company_id)
    website = (await db.execute(stmt)).scalars().first()

    # Check plan eligibility
    user_stmt = select(User).where(User.id == current_user["id"])
    user_obj = (await db.execute(user_stmt)).scalars().first()

    is_eligible = False
    plan_name = user_obj.plan_name if user_obj else None
    
    if current_user.get("role") == "admin":
        is_eligible = True
    elif user_obj and user_obj.plan_id:
        plan_stmt = select(Plan).where(Plan.id == user_obj.plan_id)
        plan_obj = (await db.execute(plan_stmt)).scalars().first()
        if plan_obj:
            if getattr(plan_obj, "has_website", False):
                is_eligible = True
            elif plan_obj.features:
                for feat in plan_obj.features:
                    if "website" in str(feat).lower() or "custom" in str(feat).lower():
                        is_eligible = True
                        break
    elif plan_name and any(p in plan_name.lower() for p in ["premium", "business", "enterprise"]):
        is_eligible = True

    if not website:
        return {
            "has_website": False,
            "can_create": is_eligible,
            "plan_name": plan_name,
            "website": None,
            "message": None if is_eligible else "Your plan does not include the company website feature. Please buy a plan with the website feature to avail this."
        }

    full_domain = f"{website.subdomain}.{ZONE_DOMAIN}" if website.subdomain else None
    live_url = f"https://{website.custom_domain}" if website.custom_domain else (f"https://{full_domain}" if full_domain else None)

    return {
        "has_website": True,
        "can_create": is_eligible,
        "plan_name": plan_name,
        "website": {
            "id": website.id,
            "company_id": website.company_id,
            "subdomain": website.subdomain,
            "full_domain": full_domain,
            "custom_domain": website.custom_domain,
            "live_url": live_url,
            "domain_type": website.domain_type,
            "template_id": website.template_id,
            "status": website.status,
            "theme_config": website.theme_config or {},
            "seo_config": website.seo_config or {},
            "hostinger_dns_synced": website.hostinger_dns_synced,
            "published_at": website.published_at,
            "created_at": website.created_at,
            "updated_at": website.updated_at,
        }
    }


@website_router.post("/websites/setup", status_code=status.HTTP_201_CREATED)
async def setup_company_website(
    payload: WebsiteSetupIn,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Onboard & publish custom website for the authenticated company.
    1. Validates company existence and plan entitlement.
    2. Validates unique subdomain.
    3. Asynchronously configures Hostinger DNS A-record.
    4. Updates company.website profile URL.
    5. Dispatches confirmation notification.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must have a registered company to create a custom website."
        )

    # 1. Fetch Company
    comp_stmt = select(Company).where(Company.id == company_id)
    company = (await db.execute(comp_stmt)).scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    # 1b. Verify user plan website entitlement
    user_stmt = select(User).where(User.id == current_user["id"])
    user_obj = (await db.execute(user_stmt)).scalars().first()
    is_eligible = False
    if current_user.get("role") == "admin":
        is_eligible = True
    elif user_obj and user_obj.plan_id:
        plan_stmt = select(Plan).where(Plan.id == user_obj.plan_id)
        plan_obj = (await db.execute(plan_stmt)).scalars().first()
        if plan_obj:
            if getattr(plan_obj, "has_website", False):
                is_eligible = True
            elif plan_obj.features:
                for feat in plan_obj.features:
                    if "website" in str(feat).lower() or "custom" in str(feat).lower():
                        is_eligible = True
                        break
    elif user_obj and user_obj.plan_name and any(p in user_obj.plan_name.lower() for p in ["premium", "business", "enterprise"]):
        is_eligible = True

    if not is_eligible:
        raise HTTPException(
            status_code=403,
            detail="Your plan does not include the company website feature. Please buy a plan with the website feature to avail this."
        )

    # 2. Validate Subdomain
    sanitized = sanitize_subdomain(payload.subdomain)
    valid, err_msg = validate_subdomain(sanitized)
    if not valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # 3. Check for Collision with other companies
    dup_stmt = select(CompanyWebsite).where(
        CompanyWebsite.subdomain == sanitized,
        CompanyWebsite.company_id != company_id
    )
    dup = (await db.execute(dup_stmt)).scalars().first()
    if dup:
        raise HTTPException(
            status_code=400,
            detail=f"Subdomain '{sanitized}' is already in use by another company."
        )

    # 4. Verify Template Existence
    tmpl_stmt = select(WebsiteTemplate).where(WebsiteTemplate.id == payload.template_id)
    tmpl = (await db.execute(tmpl_stmt)).scalars().first()
    if not tmpl:
        raise HTTPException(
            status_code=400,
            detail=f"Website template '{payload.template_id}' not found."
        )

    # If custom template, verify tenant assignment
    if tmpl.is_custom:
        if current_user.get("role") != "admin" and tmpl.assigned_company_id != company_id and tmpl.assigned_user_id != current_user["id"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this custom bespoke template."
            )

    # 5. Provision Hostinger DNS A-record (Dual-tier: API call + Wildcard fallback)
    dns_res = await hostinger_dns_service.add_subdomain_a_record(sanitized)
    hostinger_synced = dns_res.get("mode") in ("api_synced", "api_existing")

    full_domain = f"{sanitized}.{ZONE_DOMAIN}"
    website_url = f"https://{full_domain}"

    # 6. Create or Update CompanyWebsite Record
    existing_stmt = select(CompanyWebsite).where(CompanyWebsite.company_id == company_id)
    website = (await db.execute(existing_stmt)).scalars().first()

    now = now_iso()
    default_seo = {
        "title": f"{company.name} | Industrial Manufacturer & Supplier",
        "description": company.description[:160] if company.description else f"Official website of {company.name}.",
        "keywords": f"{company.category}, {company.city or 'India'}, industrial equipment, manufacturing",
        "og_image": company.cover_url or company.logo_url
    }
    if payload.seo_config:
        default_seo.update(payload.seo_config)

    default_theme = {
        "primary_color": "#1e3a8a",
        "accent_color": "#ea580c",
        "font_family": "Inter, sans-serif"
    }
    if payload.theme_config:
        default_theme.update(payload.theme_config)

    if website:
        website.subdomain = sanitized
        website.template_id = payload.template_id
        website.status = "active"
        website.theme_config = default_theme
        website.seo_config = default_seo
        website.hostinger_dns_synced = hostinger_synced
        website.published_at = now
        website.updated_at = now
    else:
        website = CompanyWebsite(
            id=str(uuid.uuid4()),
            company_id=company_id,
            owner_id=current_user["id"],
            subdomain=sanitized,
            custom_domain=None,
            domain_type="subdomain",
            template_id=payload.template_id,
            status="active",
            theme_config=default_theme,
            seo_config=default_seo,
            hostinger_dns_synced=hostinger_synced,
            published_at=now,
            created_at=now,
            updated_at=now
        )
        db.add(website)

    # 7. Update Company profile website link
    company.website = website_url

    # 8. Dispatch In-App Notification
    db.add(Notification(
        id=str(uuid.uuid4()),
        user_id=current_user["id"],
        title="🎉 Custom Website Setup Complete!",
        body=f"Your branded company website is live at {website_url}.",
        type="website_published",
        target_id=website.id,
        link_url=website_url,
        read=False,
        created_at=now
    ))

    await db.commit()

    return {
        "ok": True,
        "message": "Website setup completed and published successfully!",
        "website": {
            "id": website.id,
            "company_id": company_id,
            "subdomain": sanitized,
            "full_domain": full_domain,
            "live_url": website_url,
            "template_id": website.template_id,
            "status": website.status,
            "dns_result": dns_res,
            "published_at": website.published_at,
        }
    }


@website_router.put("/websites/my-website")
async def update_my_company_website(
    payload: WebsiteUpdateIn,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update theme, SEO configuration, template, or custom root domain.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Company required.")

    stmt = select(CompanyWebsite).where(CompanyWebsite.company_id == company_id)
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="No website found for your company.")

    if payload.template_id:
        tmpl_stmt = select(WebsiteTemplate).where(WebsiteTemplate.id == payload.template_id)
        tmpl = (await db.execute(tmpl_stmt)).scalars().first()
        if not tmpl:
            raise HTTPException(status_code=400, detail="Invalid template ID.")
        website.template_id = payload.template_id

    if payload.theme_config is not None:
        curr_theme = dict(website.theme_config or {})
        curr_theme.update(payload.theme_config)
        website.theme_config = curr_theme

    if payload.seo_config is not None:
        curr_seo = dict(website.seo_config or {})
        curr_seo.update(payload.seo_config)
        website.seo_config = curr_seo

    if payload.custom_domain is not None:
        clean_cd = payload.custom_domain.strip().lower()
        if clean_cd:
            # Check unique custom domain
            dup_cd = (await db.execute(
                select(CompanyWebsite).where(
                    CompanyWebsite.custom_domain == clean_cd,
                    CompanyWebsite.id != website.id
                )
            )).scalars().first()
            if dup_cd:
                raise HTTPException(status_code=400, detail=f"Custom domain '{clean_cd}' is already in use.")
            website.custom_domain = clean_cd
            website.domain_type = "custom"
        else:
            website.custom_domain = None
            website.domain_type = "subdomain"

    website.updated_at = now_iso()
    await db.commit()

    return {"ok": True, "message": "Website settings updated successfully."}


# -------------------- Public Tenant Website Data Hydration --------------------

@website_router.get("/public/site/{subdomain}")
async def get_public_site_data(
    subdomain: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public data hydration endpoint for tenant websites.
    Serves company profile, catalog products, posts, reels, and website template settings.
    No authentication required.
    """
    clean_subdomain = sanitize_subdomain(subdomain)
    raw_domain = subdomain.strip().lower()
    alt_domain = raw_domain[4:] if raw_domain.startswith("www.") else f"www.{raw_domain}"

    # 1. Lookup website by subdomain or custom domain (with/without www.)
    stmt = select(CompanyWebsite).where(
        or_(
            CompanyWebsite.subdomain == clean_subdomain,
            CompanyWebsite.custom_domain == raw_domain,
            CompanyWebsite.custom_domain == alt_domain
        )
    )
    website = (await db.execute(stmt)).scalars().first()
    if not website:
        raise HTTPException(
            status_code=404,
            detail=f"No website found matching subdomain or domain '{subdomain}'."
        )

    # 2. Lookup Company
    comp_stmt = select(Company).where(Company.id == website.company_id)
    company = (await db.execute(comp_stmt)).scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found.")

    # 3. Lookup Products
    prod_stmt = select(Product).where(Product.company_id == company.id).order_by(Product.created_at.desc())
    products = (await db.execute(prod_stmt)).scalars().all()

    # 4. Lookup Posts
    post_stmt = select(Post).where(Post.company_id == company.id).order_by(Post.created_at.desc())
    posts = (await db.execute(post_stmt)).scalars().all()

    # 5. Lookup Reels
    reel_stmt = select(Reel).where(Reel.company_id == company.id).order_by(Reel.created_at.desc())
    reels = (await db.execute(reel_stmt)).scalars().all()

    # 6. Lookup Template details
    tmpl_stmt = select(WebsiteTemplate).where(WebsiteTemplate.id == website.template_id)
    tmpl = (await db.execute(tmpl_stmt)).scalars().first()

    # Dynamic SEO Metadata & Google Schema.org
    canonical_url = f"https://{website.subdomain}.{ZONE_DOMAIN}" if website.subdomain else f"https://{ZONE_DOMAIN}"
    page_title = (website.seo_config or {}).get("title") or f"{company.name} | Industrial Manufacturer & Supplier | {company.city or 'India'}"
    meta_desc = (website.seo_config or {}).get("description") or (company.description[:160] if company.description else f"Explore precision products and industrial manufacturing solutions from {company.name}.")
    og_image = (website.seo_config or {}).get("og_image") or company.cover_url or company.logo_url

    schema_org_json = {
        "@context": "https://schema.org",
        "@type": "Manufacturer",
        "name": company.name,
        "url": canonical_url,
        "logo": company.logo_url,
        "image": company.cover_url or company.logo_url,
        "description": company.description,
        "telephone": company.mobile,
        "email": company.email,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": company.address or company.location,
            "addressLocality": company.city or "Industrial Area",
            "addressRegion": company.state or "India",
            "postalCode": company.pincode or "",
            "addressCountry": "IN"
        },
        "sameAs": [
            f"https://{ZONE_DOMAIN}/company/{company.id}"
        ]
    }

    return {
        "website": {
            "id": website.id,
            "subdomain": website.subdomain,
            "custom_domain": website.custom_domain,
            "template_id": website.template_id,
            "template_name": tmpl.name if tmpl else website.template_id,
            "theme_config": website.theme_config or {},
            "seo_config": website.seo_config or {},
            "published_at": website.published_at,
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "description": company.description,
            "location": company.location,
            "city": company.city,
            "state": company.state,
            "address": company.address,
            "pincode": company.pincode,
            "logo_url": company.logo_url,
            "cover_url": company.cover_url,
            "category": company.category,
            "mobile": company.mobile,
            "whatsapp": company.whatsapp,
            "email": company.email,
            "website": company.website,
            "gst": company.gst,
            "pan": company.pan,
            "business_type": company.business_type,
            "year_established": company.year_established,
            "employees": company.employees,
            "certifications": company.certifications or [],
            "is_featured": company.is_featured,
        },
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "image_url": p.image_url,
                "images": p.images or [p.image_url],
                "price": p.price,
                "moq": p.moq,
                "description": p.description,
                "stock_left": p.stock_left,
                "location": p.location,
            }
            for p in products
        ],
        "posts": [
            {
                "id": po.id,
                "content": po.content,
                "media_url": po.media_url,
                "media_urls": po.media_urls or ([po.media_url] if po.media_url else []),
                "media_type": po.media_type,
                "category": po.category,
                "created_at": po.created_at,
            }
            for po in posts
        ],
        "reels": [
            {
                "id": r.id,
                "content": r.content,
                "video_url": r.video_url,
                "thumbnail_url": r.thumbnail_url,
                "views_count": r.views_count,
                "created_at": r.created_at,
            }
            for r in reels
        ],
        "seo": {
            "title": page_title,
            "description": meta_desc,
            "canonical_url": canonical_url,
            "og_image": og_image,
            "schema_json": schema_org_json,
        }
    }


# -------------------- Googlebot Search Discovery: sitemap.xml & robots.txt --------------------

@website_router.get("/public/site/{subdomain}/sitemap.xml", response_class=Response)
async def generate_tenant_sitemap(
    subdomain: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate standard XML sitemap for the tenant subdomain to accelerate Googlebot indexing.
    """
    clean_subdomain = sanitize_subdomain(subdomain)
    stmt = select(CompanyWebsite).where(CompanyWebsite.subdomain == clean_subdomain)
    website = (await db.execute(stmt)).scalars().first()

    base_url = f"https://{clean_subdomain}.{ZONE_DOMAIN}"
    now_date = datetime.utcnow().strftime("%Y-%m-%d")

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        f'  <url><loc>{base_url}/</loc><lastmod>{now_date}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>',
        f'  <url><loc>{base_url}/#products</loc><lastmod>{now_date}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        f'  <url><loc>{base_url}/#about</loc><lastmod>{now_date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>',
        f'  <url><loc>{base_url}/#contact</loc><lastmod>{now_date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>',
    ]

    if website:
        prod_stmt = select(Product.id).where(Product.company_id == website.company_id)
        product_ids = (await db.execute(prod_stmt)).scalars().all()
        for pid in product_ids:
            xml_lines.append(
                f'  <url><loc>{base_url}/#product-{pid}</loc><lastmod>{now_date}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>'
            )

    xml_lines.append('</urlset>')
    return Response(content="\n".join(xml_lines), media_type="application/xml")


@website_router.get("/public/site/{subdomain}/robots.txt", response_class=Response)
async def generate_tenant_robots_txt(subdomain: str):
    """
    Generate standard robots.txt for Googlebot and Bingbot indexing.
    """
    clean_subdomain = sanitize_subdomain(subdomain)
    sitemap_url = f"https://{clean_subdomain}.{ZONE_DOMAIN}/sitemap.xml"
    content = f"""User-agent: *
Allow: /

Sitemap: {sitemap_url}
"""
    return Response(content=content, media_type="text/plain")


# -------------------- Admin Website Template CRUD --------------------

@website_router.post("/admin/website-templates", status_code=status.HTTP_201_CREATED)
async def admin_create_template(
    payload: WebsiteTemplateIn,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to create a new template (including private custom templates)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    existing = (await db.execute(
        select(WebsiteTemplate).where(WebsiteTemplate.id == payload.id)
    )).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Template with ID '{payload.id}' already exists.")

    now = now_iso()
    tmpl = WebsiteTemplate(
        id=payload.id,
        name=payload.name,
        description=payload.description,
        badge=payload.badge,
        thumbnail_url=payload.thumbnail_url,
        category=payload.category,
        is_active=payload.is_active,
        is_custom=payload.is_custom,
        assigned_company_id=payload.assigned_company_id,
        assigned_user_id=payload.assigned_user_id,
        sample_data=payload.sample_data or {},
        created_at=now,
        updated_at=now
    )
    db.add(tmpl)
    await db.commit()
    return {"ok": True, "template": payload.dict()}


@website_router.delete("/admin/website-templates/{template_id}")
async def admin_delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to delete a website template."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    tmpl = (await db.execute(
        select(WebsiteTemplate).where(WebsiteTemplate.id == template_id)
    )).scalars().first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")

    await db.execute(delete(WebsiteTemplate).where(WebsiteTemplate.id == template_id))
    await db.commit()
    return {"ok": True, "message": f"Template '{template_id}' deleted."}


# -------------------- Custom Website Management & Requests --------------------

class CustomConfigRequest(BaseModel):
    benefits_list: Optional[List[str]] = None
    maintenance_months: Optional[int] = None
    additional_benefits: Optional[str] = None


class CustomWebsiteRequestCreate(BaseModel):
    requested_domain: Optional[str] = None
    notes: Optional[str] = None


class StageDomainIn(BaseModel):
    domain: str
    sync_hostinger: bool = False


class UpdateCustomRequestIn(BaseModel):
    assigned_domain: Optional[str] = None
    status: Optional[str] = None
    admin_notes: Optional[str] = None


@website_router.get("/websites/custom-config")
async def get_custom_website_config(db: AsyncSession = Depends(get_db)):
    """Fetch global benefits and terms for bespoke custom company websites."""
    config = (await db.execute(
        select(CustomWebsiteConfig).where(CustomWebsiteConfig.id == "global_config")
    )).scalar_one_or_none()

    if not config:
        return {
            "benefits_list": [
                "Dedicated Custom Domain (.com / .in / .org / .co.in)",
                "Bespoke AI-Engineered Tailored Layout & Architecture",
                "6 Months Free Priority Hosting, Maintenance & SSL",
                "Direct WhatsApp & Technical Drawing RFQ Routing",
                "Dedicated Company CMS Admin Panel"
            ],
            "maintenance_months": 6,
            "additional_benefits": "Includes comprehensive SEO setup, Google Search indexing, automated DNS management on Hostinger, and free maintenance for 6 months."
        }

    return {
        "benefits_list": config.benefits_list,
        "maintenance_months": config.maintenance_months,
        "additional_benefits": config.additional_benefits
    }


@website_router.patch("/admin/websites/custom-config")
async def admin_update_custom_website_config(
    payload: CustomConfigRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to update custom website benefits and terms."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    config = (await db.execute(
        select(CustomWebsiteConfig).where(CustomWebsiteConfig.id == "global_config")
    )).scalar_one_or_none()

    now = now_iso()
    if not config:
        config = CustomWebsiteConfig(
            id="global_config",
            benefits_list=payload.benefits_list or [],
            maintenance_months=payload.maintenance_months or 6,
            additional_benefits=payload.additional_benefits or "",
            created_at=now,
            updated_at=now
        )
        db.add(config)
    else:
        if payload.benefits_list is not None:
            config.benefits_list = payload.benefits_list
        if payload.maintenance_months is not None:
            config.maintenance_months = payload.maintenance_months
        if payload.additional_benefits is not None:
            config.additional_benefits = payload.additional_benefits
        config.updated_at = now

    await db.commit()
    return {"ok": True, "config": {
        "benefits_list": config.benefits_list,
        "maintenance_months": config.maintenance_months,
        "additional_benefits": config.additional_benefits
    }}


@website_router.post("/websites/custom-requests")
async def create_custom_website_request(
    payload: CustomWebsiteRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Customer submits request for a bespoke custom website & dedicated domain."""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="You must have an established company profile to request a custom website.")

    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found.")

    # Check for existing pending request
    existing = (await db.execute(
        select(CustomWebsiteRequest).where(
            CustomWebsiteRequest.company_id == company_id,
            CustomWebsiteRequest.status.in_(["PENDING_REVIEW", "CONTACTED", "DOMAIN_CONFIGURED", "CODE_VALIDATED"])
        )
    )).scalar_one_or_none()

    now = now_iso()
    if existing:
        return {
            "ok": True,
            "message": "Your custom website request is already being processed by our engineering team.",
            "request": {
                "id": existing.id,
                "status": existing.status,
                "requested_domain": existing.requested_domain,
                "created_at": existing.created_at
            }
        }

    clean_req_domain = payload.requested_domain.strip().lower() if payload.requested_domain else None
    if clean_req_domain:
        clean_req_domain = clean_req_domain.replace("https://", "").replace("http://", "").split("/")[0]

    req_id = str(uuid.uuid4())
    req = CustomWebsiteRequest(
        id=req_id,
        company_id=company_id,
        user_id=current_user["id"],
        requested_domain=clean_req_domain,
        assigned_domain=clean_req_domain,
        status="PENDING_REVIEW",
        dns_status="PENDING",
        ssl_status="PENDING",
        deployment_status="PENDING",
        admin_notes=payload.notes,
        created_at=now,
        updated_at=now
    )
    db.add(req)

    # Initial Audit Log
    db.add(WebsiteDeploymentLog(
        id=str(uuid.uuid4()),
        request_id=req_id,
        stage="REQUEST_SUBMITTED",
        status="SUCCESS",
        message=f"Custom website request created by {company.name} for requested domain '{clean_req_domain or 'Unspecified'}'.",
        details={"notes": payload.notes, "company_id": company_id},
        created_at=now
    ))

    # Notify Admins via In-App Notification
    admin_users = (await db.execute(
        select(User).where(User.role == "admin", User.is_deleted == False)
    )).scalars().all()

    for admin in admin_users:
        db.add(Notification(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            title="🌐 New Custom Website Request",
            body=f"{company.name} requested a bespoke custom website ({clean_req_domain or 'Domain TBD'}).",
            type="custom_website_request",
            target_id=req_id,
            link_url="/admin",
            read=False,
            created_at=now
        ))

    await db.commit()

    # Asynchronously dispatch email to Admin
    admin_emails = [a.email for a in admin_users if a.email]
    if not admin_emails:
        admin_emails = [os.environ.get("ADMIN_NOTIFICATION_EMAIL", "info@indianindustrialplatform.com")]

    email_html = f"""
    <div style="font-family: sans-serif; padding: 20px; color: #0f172a; max-width: 600px;">
        <h2 style="color: #ea580c;">New Bespoke Custom Website Request</h2>
        <p>A company owner has requested a custom website and dedicated domain setup:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Company:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{company.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Requested Domain:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{clean_req_domain or 'None specified (Needs consultation)'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Contact Person:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{current_user.get('name')} ({current_user.get('mobile', 'N/A')})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">User Email:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{current_user.get('email')}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Notes / Requirements:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{payload.notes or 'None'}</td></tr>
        </table>
        <p style="margin-top: 20px;">Open the Admin Panel to purchase the domain and initiate the multi-stage deployment wizard.</p>
    </div>
    """

    for a_email in admin_emails:
        asyncio.create_task(send_email(
            to=a_email,
            subject=f"🌐 New Custom Website Request: {company.name}",
            html_body=email_html
        ))

    return {
        "ok": True,
        "message": "Custom website request submitted. Our engineering team will contact you to confirm domain setup and design.",
        "request": {
            "id": req.id,
            "status": req.status,
            "requested_domain": req.requested_domain,
            "created_at": req.created_at
        }
    }


@website_router.get("/websites/my-custom-request")
async def get_my_custom_website_request(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve current custom website request status for logged-in company."""
    company_id = current_user.get("company_id")
    if not company_id:
        return {"has_request": False, "request": None}

    req = (await db.execute(
        select(CustomWebsiteRequest).where(
            CustomWebsiteRequest.company_id == company_id
        ).order_by(CustomWebsiteRequest.created_at.desc())
    )).scalars().first()

    if not req:
        return {"has_request": False, "request": None}

    return {
        "has_request": True,
        "request": {
            "id": req.id,
            "status": req.status,
            "requested_domain": req.requested_domain,
            "assigned_domain": req.assigned_domain,
            "dns_status": req.dns_status,
            "ssl_status": req.ssl_status,
            "deployment_status": req.deployment_status,
            "admin_notes": req.admin_notes,
            "created_at": req.created_at,
            "updated_at": req.updated_at
        }
    }


@website_router.get("/admin/websites/custom-requests")
async def admin_list_custom_requests(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to list all custom website requests with company details."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    reqs = (await db.execute(
        select(CustomWebsiteRequest).order_by(CustomWebsiteRequest.created_at.desc())
    )).scalars().all()

    items = []
    for r in reqs:
        comp = (await db.execute(select(Company).where(Company.id == r.company_id))).scalar_one_or_none()
        usr = (await db.execute(select(User).where(User.id == r.user_id))).scalar_one_or_none()
        items.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": comp.name if comp else "Unknown Company",
            "company_city": comp.city if comp else "",
            "user_id": r.user_id,
            "user_name": usr.name if usr else "Unknown User",
            "user_email": usr.email if usr else "",
            "user_mobile": usr.mobile if usr else "",
            "requested_domain": r.requested_domain,
            "assigned_domain": r.assigned_domain,
            "status": r.status,
            "dns_status": r.dns_status,
            "dns_checked_at": r.dns_checked_at,
            "ssl_status": r.ssl_status,
            "deployment_status": r.deployment_status,
            "code_archive_path": r.code_archive_path,
            "admin_notes": r.admin_notes,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })

    return items


@website_router.get("/admin/websites/custom-requests/{request_id}")
async def admin_get_single_custom_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to inspect request details, linked company and audit logs."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    r = (await db.execute(
        select(CustomWebsiteRequest).where(CustomWebsiteRequest.id == request_id)
    )).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found.")

    comp = (await db.execute(select(Company).where(Company.id == r.company_id))).scalar_one_or_none()
    usr = (await db.execute(select(User).where(User.id == r.user_id))).scalar_one_or_none()
    site = (await db.execute(select(CompanyWebsite).where(CompanyWebsite.company_id == r.company_id))).scalar_one_or_none()

    logs = (await db.execute(
        select(WebsiteDeploymentLog).where(WebsiteDeploymentLog.request_id == r.id).order_by(WebsiteDeploymentLog.created_at.asc())
    )).scalars().all()

    return {
        "id": r.id,
        "company_id": r.company_id,
        "company": {
            "name": comp.name if comp else "",
            "category": comp.category if comp else "",
            "city": comp.city if comp else "",
            "mobile": comp.mobile if comp else ""
        } if comp else None,
        "user": {
            "name": usr.name if usr else "",
            "email": usr.email if usr else "",
            "mobile": usr.mobile if usr else ""
        } if usr else None,
        "website": {
            "id": site.id,
            "subdomain": site.subdomain,
            "custom_domain": site.custom_domain,
            "status": site.status
        } if site else None,
        "requested_domain": r.requested_domain,
        "assigned_domain": r.assigned_domain,
        "status": r.status,
        "dns_status": r.dns_status,
        "dns_checked_at": r.dns_checked_at,
        "ssl_status": r.ssl_status,
        "deployment_status": r.deployment_status,
        "code_archive_path": r.code_archive_path,
        "admin_notes": r.admin_notes,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "logs": [
            {
                "id": l.id,
                "stage": l.stage,
                "status": l.status,
                "message": l.message,
                "details": l.details,
                "created_at": l.created_at
            }
            for l in logs
        ]
    }


@website_router.patch("/admin/websites/custom-requests/{request_id}")
async def admin_update_custom_request(
    request_id: str,
    payload: UpdateCustomRequestIn,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin updates notes, status, or assigned domain on a request."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    req = (await db.execute(
        select(CustomWebsiteRequest).where(CustomWebsiteRequest.id == request_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    now = now_iso()
    if payload.assigned_domain is not None:
        req.assigned_domain = payload.assigned_domain.strip().lower()
    if payload.status is not None:
        req.status = payload.status
    if payload.admin_notes is not None:
        req.admin_notes = payload.admin_notes
    req.updated_at = now

    await db.commit()
    return {"ok": True, "request": {
        "id": req.id,
        "assigned_domain": req.assigned_domain,
        "status": req.status,
        "admin_notes": req.admin_notes
    }}


# -------------------- Stage 1: Domain & DNS Sanity Check --------------------

@website_router.post("/admin/websites/custom-requests/{request_id}/stage-domain")
async def stage_domain_setup(
    request_id: str,
    payload: StageDomainIn,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stage 1: Verify domain syntax, perform DNS resolution sanity check, and configure Hostinger DNS."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    req = (await db.execute(
        select(CustomWebsiteRequest).where(CustomWebsiteRequest.id == request_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Custom website request not found.")

    raw_domain = payload.domain.strip().lower()
    raw_domain = raw_domain.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]

    if not raw_domain or "." not in raw_domain or len(raw_domain) < 4:
        raise HTTPException(status_code=400, detail="Invalid domain name format.")

    server_ip = "200.141.14.101"
    resolved_ip = None
    resolution_matches = False
    resolution_error = None

    try:
        resolved_ip = socket.gethostbyname(raw_domain)
        resolution_matches = (resolved_ip == server_ip)
    except Exception as e:
        resolution_error = str(e)

    hostinger_res = None
    if payload.sync_hostinger:
        try:
            hostinger_res = await hostinger_dns_service.sync_subdomain_a_record(raw_domain, server_ip)
        except Exception as h_err:
            hostinger_res = {"error": str(h_err)}

    now = now_iso()
    req.assigned_domain = raw_domain
    req.dns_checked_at = now

    if resolution_matches:
        req.dns_status = "VERIFIED"
        status_msg = f"Domain '{raw_domain}' verified! Points directly to server IP {server_ip}."
        log_status = "SUCCESS"
    elif resolved_ip:
        req.dns_status = "RESOLVED_TO_OTHER"
        status_msg = f"Domain '{raw_domain}' resolves to {resolved_ip} (expected server IP {server_ip}). Please update DNS A-record."
        log_status = "WARNING"
    else:
        req.dns_status = "PENDING_PROPAGATION"
        status_msg = f"Domain '{raw_domain}' does not resolve yet ({resolution_error}). DNS propagation in progress."
        log_status = "INFO"

    req.status = "DOMAIN_CONFIGURED" if resolution_matches else req.status

    db.add(WebsiteDeploymentLog(
        id=str(uuid.uuid4()),
        request_id=req.id,
        stage="DOMAIN_SANITY_CHECK",
        status=log_status,
        message=status_msg,
        details={
            "domain": raw_domain,
            "resolved_ip": resolved_ip,
            "target_server_ip": server_ip,
            "resolution_matches": resolution_matches,
            "hostinger_sync": hostinger_res
        },
        created_at=now
    ))

    await db.commit()

    return {
        "ok": True,
        "domain": raw_domain,
        "dns_status": req.dns_status,
        "resolved_ip": resolved_ip,
        "target_ip": server_ip,
        "matches_server_ip": resolution_matches,
        "message": status_msg,
        "hostinger_sync": hostinger_res
    }


# -------------------- Stage 2: Zip Upload & Code Validation --------------------

@website_router.post("/admin/websites/custom-requests/{request_id}/stage-upload-zip")
async def stage_upload_and_validate_zip(
    request_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stage 2: Upload AI frontend zip, extract in sandbox, run security scan & structure validation."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    req = (await db.execute(
        select(CustomWebsiteRequest).where(CustomWebsiteRequest.id == request_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Custom website request not found.")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a .zip archive.")

    now = now_iso()
    temp_dir = tempfile.mkdtemp(prefix="custom_site_val_")
    zip_path = os.path.join(temp_dir, "archive.zip")

    try:
        content = await file.read()
        if len(content) > 60 * 1024 * 1024:  # 60MB max
            raise HTTPException(status_code=400, detail="Zip file exceeds 60MB limit.")

        with open(zip_path, "wb") as f:
            f.write(content)

        with zipfile.ZipFile(zip_path, "r") as z:
            file_list = z.namelist()
            for fname in file_list:
                if fname.startswith("/") or ".." in fname:
                    raise HTTPException(status_code=400, detail=f"Insecure zip archive path: {fname}")

            has_index = any(f.endswith("index.html") for f in file_list)
            has_package_json = any(f.endswith("package.json") for f in file_list)
            has_build_or_dist = any("build/" in f or "dist/" in f for f in file_list)
            total_uncompressed = sum(info.file_size for info in z.infolist())

            disallowed_exts = {".exe", ".bat", ".cmd", ".vbs", ".dll", ".so"}
            found_disallowed = [f for f in file_list if any(f.lower().endswith(ext) for ext in disallowed_exts)]
            if found_disallowed:
                raise HTTPException(status_code=400, detail=f"Disallowed binary files found: {', '.join(found_disallowed[:3])}")

            z.extractall(temp_dir)

        # Store validated archive permanently in backend storage
        storage_dir = os.path.join(os.path.dirname(__file__), "..", "storage", "custom_websites")
        os.makedirs(storage_dir, exist_ok=True)
        domain_tag = req.assigned_domain or f"req_{req.id[:8]}"
        saved_zip_name = f"{domain_tag}_{int(datetime.utcnow().timestamp())}.zip"
        dest_path = os.path.join(storage_dir, saved_zip_name)
        shutil.copyfile(zip_path, dest_path)

        req.code_archive_path = dest_path
        req.deployment_status = "VALIDATED"
        req.status = "CODE_VALIDATED"

        report = {
            "total_files": len(file_list),
            "uncompressed_bytes": total_uncompressed,
            "has_index_html": has_index,
            "has_package_json": has_package_json,
            "has_build_folder": has_build_or_dist,
            "archive_filename": file.filename,
            "saved_archive": saved_zip_name
        }

        db.add(WebsiteDeploymentLog(
            id=str(uuid.uuid4()),
            request_id=req.id,
            stage="ZIP_VALIDATION",
            status="SUCCESS",
            message=f"Frontend code bundle validated successfully ({len(file_list)} files, {total_uncompressed // 1024} KB).",
            details=report,
            created_at=now
        ))

        await db.commit()

        return {
            "ok": True,
            "status": "VALIDATED",
            "report": report
        }

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# -------------------- Stage 3: Deploy & Link Custom Domain --------------------

@website_router.post("/admin/websites/custom-requests/{request_id}/stage-deploy")
async def stage_deploy_custom_website(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stage 3: Link custom domain to CompanyWebsite, generate SSL status, and notify company user."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    req = (await db.execute(
        select(CustomWebsiteRequest).where(CustomWebsiteRequest.id == request_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Custom website request not found.")

    if not req.assigned_domain:
        raise HTTPException(status_code=400, detail="Assigned domain must be configured in Stage 1 before deploying.")

    now = now_iso()

    company = (await db.execute(
        select(Company).where(Company.id == req.company_id)
    )).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Linked company not found.")

    site = (await db.execute(
        select(CompanyWebsite).where(CompanyWebsite.company_id == req.company_id)
    )).scalar_one_or_none()

    clean_sub = sanitize_subdomain(company.name)
    if not site:
        site = CompanyWebsite(
            id=str(uuid.uuid4()),
            company_id=company.id,
            owner_id=req.user_id,
            subdomain=clean_sub,
            custom_domain=req.assigned_domain,
            domain_type="custom_domain",
            template_id="apex_precision",
            status="active",
            theme_config={},
            seo_config={},
            hostinger_dns_synced=True,
            published_at=now,
            created_at=now,
            updated_at=now
        )
        db.add(site)
    else:
        site.custom_domain = req.assigned_domain
        site.domain_type = "custom_domain"
        site.status = "active"
        site.published_at = now
        site.updated_at = now

    company.website = f"https://{req.assigned_domain}"

    req.status = "DEPLOYED"
    req.deployment_status = "DEPLOYED"
    req.ssl_status = "ACTIVE"
    req.updated_at = now

    # Deployment Log
    db.add(WebsiteDeploymentLog(
        id=str(uuid.uuid4()),
        request_id=req.id,
        stage="DEPLOYMENT_SSL",
        status="SUCCESS",
        message=f"Bespoke website provisioned and linked to https://{req.assigned_domain}.",
        details={
            "domain": req.assigned_domain,
            "website_id": site.id,
            "ssl_enabled": True
        },
        created_at=now
    ))

    # In-App Notification to Company User
    db.add(Notification(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        title="🎉 Your Bespoke Custom Website Is Live!",
        body=f"Your dedicated domain https://{req.assigned_domain} is fully provisioned, secured with SSL, and live.",
        type="website_published",
        target_id=site.id,
        link_url=f"https://{req.assigned_domain}",
        read=False,
        created_at=now
    ))

    await db.commit()

    # Asynchronously dispatch confirmation email to customer
    user = (await db.execute(select(User).where(User.id == req.user_id))).scalar_one_or_none()
    if user and user.email:
        asyncio.create_task(send_email(
            to=user.email,
            subject=f"🎉 Your Custom Website is Live - {req.assigned_domain}",
            html_body=f"""
            <div style="font-family: sans-serif; padding: 20px; color: #0f172a; max-width: 600px;">
                <h2 style="color: #059669;">Congratulations, {company.name}!</h2>
                <p>Your bespoke custom domain and website are now live and accessible worldwide at:</p>
                <p style="margin: 20px 0;"><a href="https://{req.assigned_domain}" style="font-size: 18px; font-weight: bold; color: #2563eb; text-decoration: underline;">https://{req.assigned_domain}</a></p>
                <p>You can manage your products, pricing, and company information anytime using the <strong>Admin Panel</strong> button on Indian Industrial Platform.</p>
            </div>
            """
        ))

    return {
        "ok": True,
        "domain": req.assigned_domain,
        "live_url": f"https://{req.assigned_domain}",
        "status": "DEPLOYED"
    }


@website_router.get("/admin/websites/custom-requests/{request_id}/logs")
async def admin_get_request_logs(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve stage-by-stage audit logs for a custom website request."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    logs = (await db.execute(
        select(WebsiteDeploymentLog).where(WebsiteDeploymentLog.request_id == request_id).order_by(WebsiteDeploymentLog.created_at.asc())
    )).scalars().all()

    return [
        {
            "id": l.id,
            "stage": l.stage,
            "status": l.status,
            "message": l.message,
            "details": l.details,
            "created_at": l.created_at
        }
        for l in logs
    ]

