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
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

# Imports that work both when run from root or within backend
try:
    from backend.server import (
        get_db, get_current_user, get_optional_user,
        Company, User, Product, Post, Reel, Plan, Notification,
        CompanyWebsite, WebsiteTemplate, now_iso
    )
    from backend.services.hostinger_dns_service import (
        hostinger_dns_service, validate_subdomain, sanitize_subdomain, is_subdomain_reserved
    )
except ImportError:
    from server import (
        get_db, get_current_user, get_optional_user,
        Company, User, Product, Post, Reel, Plan, Notification,
        CompanyWebsite, WebsiteTemplate, now_iso
    )
    from services.hostinger_dns_service import (
        hostinger_dns_service, validate_subdomain, sanitize_subdomain, is_subdomain_reserved
    )

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

    # 1. Lookup website by subdomain or custom domain
    stmt = select(CompanyWebsite).where(
        or_(
            CompanyWebsite.subdomain == clean_subdomain,
            CompanyWebsite.custom_domain == subdomain.strip().lower()
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
