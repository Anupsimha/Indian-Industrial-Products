from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Email utility (imported after load_dotenv so env vars are available)
from email_utils import send_email, build_otp_email

import os
import uuid
import logging
import bcrypt
import jwt
import time
import shutil
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, JSON, select, update, delete, func, desc, and_, or_, text
)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# -------------------- Database Setup --------------------
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg:///iip_db"
else:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# -------------------- Local Storage Setup --------------------
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
VACANCY_RESUME_DIR = ROOT_DIR / "VacancyResume"
VACANCY_RESUME_DIR.mkdir(exist_ok=True)
REEL_DIR = ROOT_DIR / "reels-uploaded"
REEL_DIR.mkdir(exist_ok=True)
PRODUCT_IMAGES_DIR = ROOT_DIR / "products-images"
PRODUCT_IMAGES_DIR.mkdir(exist_ok=True)

# -------------------- Setup JWT --------------------
JWT_SECRET = os.environ.get('JWT_SECRET', 'supersecretjwtkeyforiipmarketplace')
JWT_ALGO = "HS256"

app = FastAPI(title="IIP - Indian Industrial Products")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads_api")
app.mount("/api/reels-uploaded", StaticFiles(directory=str(REEL_DIR)), name="reels_local_api")
app.mount("/api/products-images", StaticFiles(directory=str(PRODUCT_IMAGES_DIR)), name="products_images_api")

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/VacancyResume", StaticFiles(directory=str(VACANCY_RESUME_DIR)), name="vacancy_resumes")
app.mount("/reels-uploaded", StaticFiles(directory=str(REEL_DIR)), name="reels_local")
app.mount("/products-images", StaticFiles(directory=str(PRODUCT_IMAGES_DIR)), name="products_images")

api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iip")


# -------------------- SQLAlchemy Models --------------------
class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    company_id = Column(String(36), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    plan_id = Column(String(36), nullable=True)
    plan_name = Column(String(255), nullable=True)
    plan_expires_at = Column(String(255), nullable=True)
    unlocked_enquiries = Column(JSON, default=list, nullable=True)
    # Per-month unlock tracking: {"2026-07": ["enq_id1", "enq_id2", ...]}
    monthly_unlocks = Column(JSON, default=dict, nullable=True)
    created_at = Column(String(255), nullable=False)

class Company(Base):
    __tablename__ = "companies"
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    logo_url = Column(String(1024), nullable=False)
    cover_url = Column(String(1024), nullable=True)
    category = Column(String(255), nullable=False)
    mobile = Column(String(50), nullable=False)
    whatsapp = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    website = Column(String(1024), nullable=True)
    owner_id = Column(String(36), nullable=False)
    owner_name = Column(String(255), nullable=True)
    gst = Column(String(50), nullable=True)
    pan = Column(String(50), nullable=True)
    business_type = Column(String(1024), nullable=True)
    year_established = Column(Integer, nullable=True)
    address = Column(Text, nullable=True)
    employees = Column(String(255), nullable=True)
    certifications = Column(JSON, default=list, nullable=True)
    is_featured = Column(Boolean, default=False, nullable=False)
    created_at = Column(String(255), nullable=False)

class Post(Base):
    __tablename__ = "posts"
    id = Column(String(36), primary_key=True)
    company_id = Column(String(36), nullable=False)
    group_id = Column(String(36), nullable=True)
    content = Column(Text, nullable=False)
    media_url = Column(String(1024), nullable=True)
    media_type = Column(String(50), nullable=False)
    category = Column(String(255), nullable=True)
    created_at = Column(String(255), nullable=False)

class Reel(Base):
    __tablename__ = "reels"
    id = Column(String(36), primary_key=True)
    company_id = Column(String(36), nullable=False)
    group_id = Column(String(36), nullable=True)
    content = Column(Text, nullable=False)
    video_url = Column(String(1024), nullable=False)
    thumbnail_url = Column(String(1024), nullable=True)
    created_at = Column(String(255), nullable=False)

class Product(Base):
    __tablename__ = "products"
    id = Column(String(36), primary_key=True)
    company_id = Column(String(36), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=False)
    image_url = Column(String(1024), nullable=False)
    images = Column(JSON, default=list, nullable=True)
    price = Column(String(255), nullable=True)
    moq = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    stock_left = Column(Integer, default=0, nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(String(255), nullable=False)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(String(36), primary_key=True)
    company_id = Column(String(36), nullable=True)
    group_id = Column(String(36), nullable=True)
    company_name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    salary = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    posted = Column(String(255), nullable=False)
    created_at = Column(String(255), nullable=False)

class Enquiry(Base):
    __tablename__ = "enquiries"
    id = Column(String(36), primary_key=True)
    group_id = Column(String(36), nullable=True)
    name = Column(String(255), nullable=False)
    mobile = Column(String(50), nullable=False)
    requirement = Column(Text, nullable=False)
    category = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    product_name = Column(String(255), nullable=True)
    quantity = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    industrial_area = Column(String(255), nullable=True)
    company_id = Column(String(36), nullable=True)
    post_id = Column(String(36), nullable=True)
    status = Column(String(50), nullable=False)  # new, in_progress, closed
    created_at = Column(String(255), nullable=False)

class Follow(Base):
    __tablename__ = "follows"
    id = Column(String(36), primary_key=True)
    company_id = Column(String(36), nullable=False)
    user_id = Column(String(36), nullable=False)
    created_at = Column(String(255), nullable=False)

class Like(Base):
    __tablename__ = "likes"
    id = Column(String(36), primary_key=True)
    target_id = Column(String(36), nullable=False)
    target_type = Column(String(50), nullable=False)  # post, reel
    user_id = Column(String(36), nullable=False)
    created_at = Column(String(255), nullable=False)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    post_id = Column(String(36), nullable=True)
    reel_id = Column(String(36), nullable=True)
    created_at = Column(String(255), nullable=False)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(String(36), primary_key=True)
    reel_id = Column(String(36), nullable=True)
    post_id = Column(String(36), nullable=True)
    user_id = Column(String(36), nullable=False)
    user_name = Column(String(255), nullable=False)
    user_avatar = Column(String(1024), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(String(255), nullable=False)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String(36), primary_key=True)
    sender_id = Column(String(36), nullable=False)
    receiver_id = Column(String(36), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(String(255), nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(String(255), nullable=False)

class Category(Base):
    __tablename__ = "categories"
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(1024), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(String(255), nullable=False)

class Area(Base):
    __tablename__ = "areas"
    id = Column(String(36), primary_key=True)
    state = Column(String(255), nullable=False)
    city = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(String(255), nullable=False)

class Slide(Base):
    __tablename__ = "slides"
    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=False)
    image = Column(String(1024), nullable=False)
    cta = Column(String(255), nullable=False)
    accent = Column(String(255), default="from-blue-900/85 via-blue-800/60 to-transparent", nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(String(255), nullable=False)

class Plan(Base):
    __tablename__ = "plans"
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Float, default=0.0, nullable=False)
    yearly_price = Column(Float, default=0.0, nullable=False)
    currency = Column(String(50), default="INR", nullable=False)
    duration_days = Column(Integer, default=30, nullable=False)
    features = Column(JSON, default=list, nullable=True)
    badge = Column(String(255), nullable=True)
    color = Column(String(50), nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    leads_per_month = Column(Integer, nullable=True)
    unlocks_per_month = Column(Integer, nullable=True)
    created_at = Column(String(255), nullable=False)


class Order(Base):
    __tablename__ = "orders"
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)
    items = Column(JSON, nullable=False)  # [{product_id, name, qty, price, image_url, company_name}]
    subtotal = Column(Float, nullable=False)
    delivery_cost = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    delivery_option = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=False)  # razorpay, upi, card, cod
    payment_id = Column(String(255), nullable=True)  # Razorpay payment id
    razorpay_order_id = Column(String(255), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, paid, processing, shipped, delivered, cancelled
    address = Column(Text, nullable=True)
    created_at = Column(String(255), nullable=False)


class IndustrialGroup(Base):
    __tablename__ = "industrial_groups"
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String(1024), nullable=False)
    cover_url = Column(String(1024), nullable=True)
    members_count = Column(Integer, default=0, nullable=False)
    companies_count = Column(Integer, default=0, nullable=False)
    posts_count = Column(Integer, default=0, nullable=False)
    leads_count = Column(Integer, default=0, nullable=False)
    jobs_count = Column(Integer, default=0, nullable=False)
    reels_count = Column(Integer, default=0, nullable=False)
    created_at = Column(String(255), nullable=False)


class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(String(36), primary_key=True)
    group_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    role_in_group = Column(String(50), default="member", nullable=False)
    created_at = Column(String(255), nullable=False)


# -------------------- Models Pydantic --------------------
RoleType = Literal["manufacturer", "supplier", "buyer", "admin"]


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    mobile: str
    role: RoleType
    company_id: Optional[str] = None
    avatar_url: Optional[str] = None
    plan_name: Optional[str] = None
    plan_expires_at: Optional[str] = None


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    password: str
    role: RoleType
    company_name: Optional[str] = None


class LoginIn(BaseModel):
    identifier: str  # email or mobile
    password: str


class CompanyOut(BaseModel):
    id: str
    name: str
    description: str
    location: str
    logo_url: str
    cover_url: Optional[str] = None
    category: str
    mobile: str
    whatsapp: str
    email: str
    website: Optional[str] = None
    owner_id: str
    owner_name: Optional[str] = None
    gst: Optional[str] = None
    pan: Optional[str] = None
    business_type: Optional[str] = None
    year_established: Optional[int] = None
    address: Optional[str] = None
    employees: Optional[str] = None
    certifications: Optional[List[str]] = None
    is_featured: bool = False
    followers_count: int = 0
    is_following: bool = False
    is_owner: bool = False
    created_at: str


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    website: Optional[str] = None
    mobile: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    owner_name: Optional[str] = None
    gst: Optional[str] = None
    pan: Optional[str] = None
    business_type: Optional[str] = None
    year_established: Optional[int] = None
    address: Optional[str] = None
    employees: Optional[str] = None
    certifications: Optional[List[str]] = None


class CompanyCreate(BaseModel):
    name: str
    description: str
    location: str
    category: str
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    website: Optional[str] = None


class IndustrialGroupCreate(BaseModel):
    name: str
    location: str
    description: str
    image_url: str
    cover_url: Optional[str] = None
    members_count: Optional[int] = 0
    companies_count: Optional[int] = 0


class IndustrialGroupUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    cover_url: Optional[str] = None
    members_count: Optional[int] = None
    companies_count: Optional[int] = None


class IndustrialGroupOut(BaseModel):
    id: str
    name: str
    slug: str
    location: str
    description: str
    image_url: str
    cover_url: Optional[str] = None
    members_count: int
    companies_count: int
    posts_count: int
    leads_count: int
    jobs_count: int
    reels_count: int
    is_joined: bool = False
    created_at: str


class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Literal["image", "video", "text"] = "text"
    category: Optional[str] = None
    group_id: Optional[str] = None


class PostOut(BaseModel):
    id: str
    company_id: str
    company_name: str
    company_logo: str
    location: str
    content: str
    media_url: Optional[str]
    media_type: str
    category: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    likes_count: int
    enquiries_count: int
    is_liked: bool
    is_saved: bool
    is_following: bool
    whatsapp: str
    created_at: str


class ReelCreate(BaseModel):
    content: str
    video_url: str
    thumbnail_url: Optional[str] = None
    group_id: Optional[str] = None


class ReelOut(BaseModel):
    id: str
    company_id: str
    company_name: str
    company_logo: str
    location: str
    content: str
    video_url: str
    thumbnail_url: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    likes_count: int
    comments_count: int
    is_liked: bool
    is_following: bool
    whatsapp: str
    created_at: str


class ProductCreate(BaseModel):
    name: str
    category: str
    image_url: str
    images: Optional[List[str]] = None
    price: Optional[str] = None
    moq: Optional[str] = None
    description: Optional[str] = None
    stock_left: Optional[int] = None
    location: Optional[str] = None


class ProductOut(BaseModel):
    id: str
    company_id: str
    company_name: str
    name: str
    category: str
    image_url: str
    images: Optional[List[str]] = None
    price: Optional[str] = None
    moq: Optional[str] = None
    description: Optional[str] = None
    whatsapp: str
    stock_left: Optional[int] = None
    location: Optional[str] = None


class JobCreate(BaseModel):
    title: str
    location: str
    type: str
    salary: Optional[str] = None
    description: str


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None


class JobOut(BaseModel):
    id: str
    company_id: Optional[str] = None
    company_name: str
    title: str
    location: str
    type: str
    salary: Optional[str] = None
    description: str
    posted: str
    created_at: str
    applicants_count: int = 0


class EnquiryCreate(BaseModel):
    name: str
    mobile: str
    requirement: str
    category: str
    location: str
    product_name: Optional[str] = None
    quantity: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    industrial_area: Optional[str] = None
    company_id: Optional[str] = None
    post_id: Optional[str] = None


class EnquiryOut(BaseModel):
    id: str
    name: str
    mobile: str
    requirement: str
    category: str
    location: str
    product_name: Optional[str] = None
    quantity: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    industrial_area: Optional[str] = None
    company_id: Optional[str] = None
    post_id: Optional[str] = None
    status: Literal["new", "in_progress", "closed", "completed", "pending"]
    created_at: str


class CommentCreate(BaseModel):
    text: str


class CommentOut(BaseModel):
    id: str
    user_name: str
    user_avatar: Optional[str]
    text: str
    created_at: str


class OrderItemIn(BaseModel):
    product_id: str
    name: str
    qty: int
    price: Optional[str] = None
    image_url: str
    company_name: Optional[str] = None


class OrderCreate(BaseModel):
    items: List[OrderItemIn]
    subtotal: float
    delivery_cost: float
    gst: float
    total: float
    delivery_option: str
    payment_method: str
    payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    address: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    user_id: str
    items: List[dict]
    subtotal: float
    delivery_cost: float
    gst: float
    total: float
    delivery_option: str
    payment_method: str
    payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    status: str
    address: Optional[str] = None
    created_at: str


# -------------------- Helpers --------------------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, ttl_minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def user_to_dict(user: User) -> dict:
    if not user:
        return {}
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "company_id": user.company_id,
        "avatar_url": user.avatar_url,
        "plan_name": user.plan_name,
        "plan_expires_at": user.plan_expires_at,
        "unlocked_enquiries": user.unlocked_enquiries or [],
        "created_at": user.created_at,
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.id == payload["sub"])
            user = (await session.execute(stmt)).scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user_to_dict(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=60 * 60 * 24 * 7, path="/",
    )


def clean_product_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return url
    if "/products-images/" in url:
        filename = url.split("/products-images/")[-1]
        return f"/api/products-images/{filename}"
    elif "/uploads/" in url:
        filename = url.split("/uploads/")[-1]
        return f"/api/uploads/{filename}"
    return url

def clean_reel_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return url
    if "/reels-uploaded/" in url:
        filename = url.split("/reels-uploaded/")[-1]
        return f"/api/reels-uploaded/{filename}"
    elif "/uploads/" in url:
        filename = url.split("/uploads/")[-1]
        return f"/api/uploads/{filename}"
    return url

def make_product_out(doc: Product, company: Optional[Company]) -> ProductOut:
    return ProductOut(
        id=doc.id, company_id=doc.company_id,
        company_name=company.name if company else "",
        name=doc.name, category=doc.category,
        image_url=clean_product_url(doc.image_url),
        images=[clean_product_url(img) for img in (doc.images or [])],
        price=doc.price, moq=doc.moq,
        description=doc.description,
        stock_left=doc.stock_left, location=doc.location,
        whatsapp=company.whatsapp if company else "",
    )


async def hydrate_company(company: Company, current_user: Optional[dict], db: AsyncSession) -> CompanyOut:
    stmt_follows = select(func.count(Follow.id)).where(Follow.company_id == company.id)
    followers_count = (await db.execute(stmt_follows)).scalar_one()
    is_following = False
    is_owner = False
    if current_user:
        stmt_follow = select(Follow).where(Follow.company_id == company.id, Follow.user_id == current_user["id"])
        is_following = bool((await db.execute(stmt_follow)).scalar_one_or_none())
        is_owner = company.owner_id == current_user["id"] or current_user.get("role") == "admin"
    return CompanyOut(
        id=company.id, name=company.name, description=company.description,
        location=company.location, logo_url=company.logo_url,
        cover_url=company.cover_url, category=company.category,
        mobile=company.mobile, whatsapp=company.whatsapp, email=company.email,
        website=company.website, owner_id=company.owner_id,
        owner_name=company.owner_name,
        gst=company.gst, pan=company.pan,
        business_type=company.business_type,
        year_established=company.year_established,
        address=company.address, employees=company.employees,
        certifications=company.certifications,
        is_featured=company.is_featured,
        followers_count=followers_count, is_following=is_following, is_owner=is_owner,
        created_at=company.created_at,
    )


async def hydrate_post(post: Post, current_user: Optional[dict], db: AsyncSession) -> Optional[PostOut]:
    stmt_comp = select(Company).where(Company.id == post.company_id)
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    if not company:
        return None
    stmt_likes = select(func.count(Like.id)).where(Like.target_id == post.id, Like.target_type == "post")
    likes_count = (await db.execute(stmt_likes)).scalar_one()
    
    stmt_enq = select(func.count(Enquiry.id)).where(Enquiry.post_id == post.id)
    enquiries_count = (await db.execute(stmt_enq)).scalar_one()
    
    is_liked = False
    is_saved = False
    is_following = False
    if current_user:
        stmt_like = select(Like).where(Like.target_id == post.id, Like.target_type == "post", Like.user_id == current_user["id"])
        is_liked = bool((await db.execute(stmt_like)).scalar_one_or_none())
        
        stmt_save = select(Bookmark).where(Bookmark.post_id == post.id, Bookmark.user_id == current_user["id"])
        is_saved = bool((await db.execute(stmt_save)).scalar_one_or_none())
        
        stmt_follow = select(Follow).where(Follow.company_id == company.id, Follow.user_id == current_user["id"])
        is_following = bool((await db.execute(stmt_follow)).scalar_one_or_none())

    group_name = None
    if getattr(post, "group_id", None):
        stmt_grp = select(IndustrialGroup.name).where(or_(IndustrialGroup.id == post.group_id, IndustrialGroup.slug == post.group_id))
        group_name = (await db.execute(stmt_grp)).scalar_one_or_none()
        
    return PostOut(
        id=post.id, company_id=company.id, company_name=company.name,
        company_logo=company.logo_url, location=company.location,
        content=post.content, media_url=post.media_url,
        media_type=post.media_type, category=post.category,
        group_id=getattr(post, "group_id", None), group_name=group_name,
        likes_count=likes_count, enquiries_count=enquiries_count,
        is_liked=is_liked, is_saved=is_saved, is_following=is_following,
        whatsapp=company.whatsapp, created_at=post.created_at,
    )


async def hydrate_reel(reel: Reel, current_user: Optional[dict], db: AsyncSession) -> ReelOut:
    stmt_comp = select(Company).where(Company.id == reel.company_id)
    company = (await db.execute(stmt_comp)).scalar_one()
    
    stmt_likes = select(func.count(Like.id)).where(Like.target_id == reel.id, Like.target_type == "reel")
    likes_count = (await db.execute(stmt_likes)).scalar_one()
    
    stmt_comments = select(func.count(Comment.id)).where(Comment.reel_id == reel.id)
    comments_count = (await db.execute(stmt_comments)).scalar_one()
    
    is_liked = False
    is_following = False
    if current_user:
        stmt_like = select(Like).where(Like.target_id == reel.id, Like.target_type == "reel", Like.user_id == current_user["id"])
        is_liked = bool((await db.execute(stmt_like)).scalar_one_or_none())
        
        stmt_follow = select(Follow).where(Follow.company_id == company.id, Follow.user_id == current_user["id"])
        is_following = bool((await db.execute(stmt_follow)).scalar_one_or_none())

    group_name = None
    if getattr(reel, "group_id", None):
        stmt_grp = select(IndustrialGroup.name).where(or_(IndustrialGroup.id == reel.group_id, IndustrialGroup.slug == reel.group_id))
        group_name = (await db.execute(stmt_grp)).scalar_one_or_none()
        
    return ReelOut(
        id=reel.id, company_id=company.id, company_name=company.name,
        company_logo=company.logo_url, location=company.location,
        content=reel.content, video_url=clean_reel_url(reel.video_url),
        thumbnail_url=reel.thumbnail_url,
        group_id=getattr(reel, "group_id", None), group_name=group_name,
        likes_count=likes_count,
        comments_count=comments_count, is_liked=is_liked, is_following=is_following,
        whatsapp=company.whatsapp, created_at=reel.created_at,
    )


# -------------------- Auth Endpoints --------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    
    stmt_email = select(User).where(User.email == email)
    if (await db.execute(stmt_email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    stmt_mobile = select(User).where(User.mobile == payload.mobile)
    if (await db.execute(stmt_mobile)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mobile already registered")

    user_id = str(uuid.uuid4())
    company_id = None
    if payload.role in ("manufacturer", "supplier") and payload.company_name:
        company_id = str(uuid.uuid4())
        company_doc = Company(
            id=company_id, name=payload.company_name,
            description=f"{payload.company_name} - established business on IIP.",
            location="India", category="General",
            logo_url="https://images.unsplash.com/photo-1772760110621-d7b6f54c1e42?w=200",
            cover_url=None,
            mobile=payload.mobile, whatsapp=payload.mobile,
            email=email, website=None, owner_id=user_id,
            created_at=now_iso(),
        )
        db.add(company_doc)

    user_doc = User(
        id=user_id, name=payload.name, email=email,
        mobile=payload.mobile, password_hash=hash_password(payload.password),
        role=payload.role, company_id=company_id,
        avatar_url="https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200",
        created_at=now_iso(),
    )
    db.add(user_doc)
    await db.commit()
    
    token = create_token(user_id)
    set_auth_cookie(response, token)
    logger.info(f"User registered: {email} as {payload.role} (company_id={company_id})")
    
    return {
        "user": UserPublic(**user_to_dict(user_doc)).model_dump(),
        "token": token,
    }


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    ident = payload.identifier.strip().lower()
    stmt = select(User).where(or_(User.email == ident, User.mobile == payload.identifier.strip()))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning(f"Login failed for identifier={payload.identifier}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id)
    set_auth_cookie(response, token)
    logger.info(f"User logged in: {user.email} (role={user.role})")
    return {
        "user": UserPublic(**user_to_dict(user)).model_dump(),
        "token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


# -------------------- Companies --------------------
@api.get("/companies", response_model=List[CompanyOut])
async def list_companies(request: Request, featured: bool = False, limit: int = 50, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt = select(Company)
    if featured:
        stmt = stmt.where(Company.is_featured == True)
    stmt = stmt.order_by(desc(Company.created_at)).limit(limit)
    res = await db.execute(stmt)
    docs = res.scalars().all()
    return [await hydrate_company(c, cu, db) for c in docs]


@api.get("/companies/{company_id}", response_model=CompanyOut)
async def get_company(company_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt = select(Company).where(Company.id == company_id)
    c = (await db.execute(stmt)).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    return await hydrate_company(c, cu, db)


@api.get("/companies/{company_id}/products", response_model=List[ProductOut])
async def company_products(company_id: str, db: AsyncSession = Depends(get_db)):
    stmt_prods = select(Product).where(Product.company_id == company_id)
    docs = (await db.execute(stmt_prods)).scalars().all()
    
    stmt_comp = select(Company).where(Company.id == company_id)
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    
    out = []
    for d in docs:
        out.append(make_product_out(d, company))
    return out


@api.get("/companies/{company_id}/posts", response_model=List[PostOut])
async def company_posts(company_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt_posts = select(Post).where(Post.company_id == company_id).order_by(desc(Post.created_at))
    docs = (await db.execute(stmt_posts)).scalars().all()
    out = []
    for d in docs:
        p = await hydrate_post(d, cu, db)
        if p:
            out.append(p)
    return out


@api.post("/companies/{company_id}/follow")
async def follow_company(company_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Follow).where(Follow.company_id == company_id, Follow.user_id == user["id"])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"following": False}
    
    new_follow = Follow(
        id=str(uuid.uuid4()), company_id=company_id,
        user_id=user["id"], created_at=now_iso(),
    )
    db.add(new_follow)
    
    stmt_comp = select(Company).where(Company.id == company_id)
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    if company:
        notif = Notification(
            id=str(uuid.uuid4()), user_id=company.owner_id,
            title="New follower", body=f"{user['name']} started following you",
            read=False, created_at=now_iso(),
        )
        db.add(notif)
    await db.commit()
    return {"following": True}


@api.patch("/companies/{company_id}", response_model=CompanyOut)
async def update_company(company_id: str, payload: CompanyUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Company).where(Company.id == company_id)
    company = (await db.execute(stmt)).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Not found")
    if company.owner_id != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        stmt_upd = update(Company).where(Company.id == company_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        # reload
        stmt_c = select(Company).where(Company.id == company_id)
        company = (await db.execute(stmt_c)).scalar_one()
        
    return await hydrate_company(company, user, db)


# -------------------- Posts --------------------
@api.get("/posts", response_model=List[PostOut])
async def list_posts(request: Request, skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt = select(Post).order_by(desc(Post.created_at)).offset(skip).limit(limit)
    docs = (await db.execute(stmt)).scalars().all()
    out = []
    for d in docs:
        p = await hydrate_post(d, cu, db)
        if p:
            out.append(p)
    return out


@api.post("/posts", response_model=PostOut)
async def create_post(payload: PostCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.get("company_id"):
        raise HTTPException(status_code=403, detail="Only businesses can post")
    pid = str(uuid.uuid4())
    doc = Post(
        id=pid, company_id=user["company_id"], content=payload.content,
        media_url=payload.media_url, media_type=payload.media_type,
        category=payload.category, group_id=payload.group_id, created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    # reload
    stmt = select(Post).where(Post.id == pid)
    doc_loaded = (await db.execute(stmt)).scalar_one()
    return await hydrate_post(doc_loaded, user, db)


@api.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Like).where(Like.target_id == post_id, Like.target_type == "post", Like.user_id == user["id"])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"liked": False}
    
    new_like = Like(
        id=str(uuid.uuid4()), target_id=post_id, target_type="post",
        user_id=user["id"], created_at=now_iso(),
    )
    db.add(new_like)
    await db.commit()
    return {"liked": True}


@api.post("/posts/{post_id}/save")
async def toggle_save(post_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Bookmark).where(Bookmark.post_id == post_id, Bookmark.user_id == user["id"])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"saved": False}
    
    new_bookmark = Bookmark(
        id=str(uuid.uuid4()), post_id=post_id,
        user_id=user["id"], created_at=now_iso(),
    )
    db.add(new_bookmark)
    await db.commit()
    return {"saved": True}


# -------------------- Reels --------------------
@api.get("/reels", response_model=List[ReelOut])
async def list_reels(request: Request, limit: int = 30, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt = select(Reel).order_by(desc(Reel.created_at)).limit(limit)
    docs = (await db.execute(stmt)).scalars().all()
    return [await hydrate_reel(d, cu, db) for d in docs]


@api.post("/reels", response_model=ReelOut)
async def create_reel(
    request: Request,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not user.get("company_id"):
        raise HTTPException(status_code=403, detail="Only businesses can post")

    rid = str(uuid.uuid4())
    content = ""
    video_url = ""
    thumbnail_url = None
    group_id = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        content = body.get("content", "")
        video_url = body.get("video_url", "")
        thumbnail_url = body.get("thumbnail_url", None)
        group_id = body.get("group_id", None)
    else:
        form = await request.form()
        content = form.get("content") or ""
        group_id = form.get("group_id") or None
        file = form.get("file")
        use_demo = form.get("use_demo")

        unique_filename = ""
        if file and hasattr(file, "file"):
            # Check size using the underlying sync file object
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)
            if size > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Video size must be less than 10 MB")

            file_ext = Path(file.filename).suffix if file.filename else ".mp4"
            unique_filename = f"{user['id']}-{rid}{file_ext}"
            file_path = REEL_DIR / unique_filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        elif use_demo:
            demo_path = Path(r"C:\Users\anups\Downloads\Video Project.mp4")
            if not demo_path.exists():
                demo_path = ROOT_DIR / "Video Project.mp4"
                
            if not demo_path.exists():
                raise HTTPException(status_code=404, detail="Demo video file not found on server")
            
            # Check size
            size = demo_path.stat().st_size
            if size > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Video size must be less than 10 MB")
                
            unique_filename = f"{user['id']}-{rid}.mp4"
            file_path = REEL_DIR / unique_filename
            shutil.copy(str(demo_path), str(file_path))
        else:
            raise HTTPException(status_code=400, detail="No video file provided")

        video_url = f"/api/reels-uploaded/{unique_filename}"

    if not video_url:
        raise HTTPException(status_code=400, detail="No video URL or file provided")

    doc = Reel(
        id=rid, company_id=user["company_id"], content=content,
        video_url=video_url, thumbnail_url=thumbnail_url,
        group_id=group_id, created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    
    # reload
    stmt = select(Reel).where(Reel.id == rid)
    doc_loaded = (await db.execute(stmt)).scalar_one()
    return await hydrate_reel(doc_loaded, user, db)


@api.post("/reels/{reel_id}/like")
async def toggle_reel_like(reel_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Like).where(Like.target_id == reel_id, Like.target_type == "reel", Like.user_id == user["id"])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"liked": False}
    
    new_like = Like(
        id=str(uuid.uuid4()), target_id=reel_id, target_type="reel",
        user_id=user["id"], created_at=now_iso(),
    )
    db.add(new_like)
    await db.commit()
    return {"liked": True}


@api.get("/reels/{reel_id}/comments", response_model=List[CommentOut])
async def list_comments(reel_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Comment).where(Comment.reel_id == reel_id).order_by(desc(Comment.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    return [CommentOut(id=d.id, user_name=d.user_name, user_avatar=d.user_avatar, text=d.text, created_at=d.created_at) for d in docs]


@api.post("/reels/{reel_id}/comments", response_model=CommentOut)
async def add_comment(reel_id: str, payload: CommentCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = Comment(
        id=str(uuid.uuid4()), reel_id=reel_id, user_id=user["id"],
        user_name=user["name"], user_avatar=user.get("avatar_url"),
        text=payload.text, created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    return CommentOut(id=doc.id, user_name=doc.user_name, user_avatar=doc.user_avatar, text=doc.text, created_at=doc.created_at)


# -------------------- Products --------------------
@api.get("/products", response_model=List[ProductOut])
async def list_products(category: Optional[str] = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    stmt = stmt.order_by(desc(Product.created_at)).limit(limit)
    docs = (await db.execute(stmt)).scalars().all()
    out = []
    for d in docs:
        stmt_comp = select(Company).where(Company.id == d.company_id)
        company = (await db.execute(stmt_comp)).scalar_one_or_none()
        out.append(make_product_out(d, company))
    return out


@api.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.id == product_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    stmt_comp = select(Company).where(Company.id == p.company_id)
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    return make_product_out(p, company)


def process_product_images(user_id: str, product_id: str, image_url: str, images: List[str], request: Request) -> tuple[str, List[str]]:
    PRODUCT_IMAGES_DIR.mkdir(exist_ok=True)
    
    new_image_url = image_url
    new_images = []
    
    if image_url:
        filename = Path(image_url).name
        src_path = UPLOADS_DIR / filename
        if src_path.exists():
            ext = src_path.suffix or ".png"
            dest_filename = f"{user_id}-{product_id}{ext}"
            dest_path = PRODUCT_IMAGES_DIR / dest_filename
            shutil.copy(str(src_path), str(dest_path))
            new_image_url = f"/api/products-images/{dest_filename}"
            
    for idx, img_url in enumerate(images):
        if img_url:
            filename = Path(img_url).name
            src_path = UPLOADS_DIR / filename
            if src_path.exists():
                ext = src_path.suffix or ".png"
                dest_filename = f"{user_id}-{product_id}-{idx}{ext}"
                dest_path = PRODUCT_IMAGES_DIR / dest_filename
                shutil.copy(str(src_path), str(dest_path))
                new_images.append(f"/api/products-images/{dest_filename}")
            else:
                new_images.append(img_url)
        else:
            new_images.append(img_url)
            
    return new_image_url, new_images


@api.post("/products", response_model=ProductOut)
async def create_product(request: Request, payload: ProductCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.get("company_id"):
        raise HTTPException(status_code=403, detail="Only businesses can add products")
    pid = str(uuid.uuid4())
    
    image_url, images = process_product_images(user["id"], pid, payload.image_url, payload.images or [], request)
    
    doc = Product(
        id=pid, company_id=user["company_id"],
        name=payload.name, category=payload.category,
        image_url=image_url, images=images,
        price=payload.price, moq=payload.moq,
        description=payload.description,
        stock_left=payload.stock_left, location=payload.location,
        created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    # reload
    stmt = select(Product).where(Product.id == pid)
    doc = (await db.execute(stmt)).scalar_one()
    stmt_comp = select(Company).where(Company.id == user["company_id"])
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    return make_product_out(doc, company)


@api.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, payload: ProductCreate, request: Request, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.id == product_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if p.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        if "image_url" in update_data or "images" in update_data:
            cur_img_url = update_data.get("image_url", p.image_url)
            cur_imgs = update_data.get("images", p.images or [])
            processed_img_url, processed_imgs = process_product_images(
                user["id"], product_id, cur_img_url, cur_imgs, request
            )
            if "image_url" in update_data:
                update_data["image_url"] = processed_img_url
            if "images" in update_data:
                update_data["images"] = processed_imgs

        stmt_upd = update(Product).where(Product.id == product_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        # reload
        stmt_p = select(Product).where(Product.id == product_id)
        p = (await db.execute(stmt_p)).scalar_one()
        
    stmt_comp = select(Company).where(Company.id == p.company_id)
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    return make_product_out(p, company)


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.id == product_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if p.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.delete(p)
    await db.commit()
    return {"ok": True}


# -------------------- Orders --------------------
@api.post("/orders", response_model=OrderOut)
async def create_order(payload: OrderCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order_id = str(uuid.uuid4())
    items_data = [item.dict() for item in payload.items]
    status = "paid" if payload.payment_id else "pending"
    order = Order(
        id=order_id,
        user_id=user["id"],
        items=items_data,
        subtotal=payload.subtotal,
        delivery_cost=payload.delivery_cost,
        gst=payload.gst,
        total=payload.total,
        delivery_option=payload.delivery_option,
        payment_method=payload.payment_method,
        payment_id=payload.payment_id,
        razorpay_order_id=payload.razorpay_order_id,
        status=status,
        address=payload.address,
        created_at=now_iso()
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return OrderOut(
        id=order.id, user_id=order.user_id, items=order.items or [],
        subtotal=order.subtotal, delivery_cost=order.delivery_cost,
        gst=order.gst, total=order.total, delivery_option=order.delivery_option,
        payment_method=order.payment_method, payment_id=order.payment_id,
        razorpay_order_id=order.razorpay_order_id,
        status=order.status, address=order.address, created_at=order.created_at
    )


@api.get("/orders/me", response_model=List[OrderOut])
async def my_orders(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Order).where(Order.user_id == user["id"]).order_by(desc(Order.created_at))
    orders = (await db.execute(stmt)).scalars().all()
    return [OrderOut(
        id=o.id, user_id=o.user_id, items=o.items or [],
        subtotal=o.subtotal, delivery_cost=o.delivery_cost,
        gst=o.gst, total=o.total, delivery_option=o.delivery_option,
        payment_method=o.payment_method, payment_id=o.payment_id,
        razorpay_order_id=o.razorpay_order_id,
        status=o.status, address=o.address, created_at=o.created_at
    ) for o in orders]


@api.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Order).where(Order.id == order_id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return OrderOut(
        id=order.id, user_id=order.user_id, items=order.items or [],
        subtotal=order.subtotal, delivery_cost=order.delivery_cost,
        gst=order.gst, total=order.total, delivery_option=order.delivery_option,
        payment_method=order.payment_method, payment_id=order.payment_id,
        razorpay_order_id=order.razorpay_order_id,
        status=order.status, address=order.address, created_at=order.created_at
    )


@api.post("/orders/{order_id}/reject")
async def reject_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Order).where(Order.id == order_id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    created_str = order.created_at
    if created_str.endswith('Z'):
        created_str = created_str[:-1] + '+00:00'
    created_time = datetime.fromisoformat(created_str)
    delivery_time = created_time + timedelta(days=7)
    limit_time = delivery_time - timedelta(hours=72)
    
    if datetime.now(timezone.utc) > limit_time:
        raise HTTPException(status_code=400, detail="Cannot reject order within 72 hours of scheduled delivery")
        
    order.status = "rejected"
    await db.commit()
    return {"ok": True, "status": "rejected"}


# -------------------- Jobs --------------------
@api.get("/jobs", response_model=List[JobOut])
async def list_jobs(company_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Job)
    if company_id:
        stmt = stmt.where(Job.company_id == company_id)
    stmt = stmt.order_by(desc(Job.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    return docs


@api.get("/jobs/my", response_model=List[JobOut])
async def list_my_jobs(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.get("company_id"):
        raise HTTPException(status_code=403, detail="Only businesses can have job postings")
    stmt = select(Job).where(Job.company_id == user["company_id"]).order_by(desc(Job.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    
    def get_job_applicants_count(job_id: str) -> int:
        job_dir = VACANCY_RESUME_DIR / job_id
        count = 0
        if job_dir.exists() and job_dir.is_dir():
            for file_name in os.listdir(job_dir):
                if file_name.endswith("_info.json"):
                    count += 1
        return count

    results = []
    for doc in docs:
        job_dict = {
            "id": doc.id,
            "company_id": doc.company_id,
            "company_name": doc.company_name,
            "title": doc.title,
            "location": doc.location,
            "type": doc.type,
            "salary": doc.salary,
            "description": doc.description,
            "posted": doc.posted,
            "created_at": doc.created_at,
            "applicants_count": get_job_applicants_count(doc.id)
        }
        results.append(job_dict)
    return results


@api.post("/jobs", response_model=JobOut)
async def create_job(payload: JobCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.get("company_id"):
        raise HTTPException(status_code=403, detail="Only businesses can post job vacancies")
    
    stmt_comp = select(Company).where(Company.id == user["company_id"])
    company = (await db.execute(stmt_comp)).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    jid = str(uuid.uuid4())
    doc = Job(
        id=jid,
        company_id=user["company_id"],
        company_name=company.name,
        title=payload.title,
        location=payload.location,
        type=payload.type,
        salary=payload.salary,
        description=payload.description,
        posted="Just now",
        created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    
    # reload
    stmt = select(Job).where(Job.id == jid)
    doc_loaded = (await db.execute(stmt)).scalar_one()
    return doc_loaded


@api.patch("/jobs/{job_id}", response_model=JobOut)
async def update_job(job_id: str, payload: JobUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        stmt_upd = update(Job).where(Job.id == job_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        
        # reload
        stmt_j = select(Job).where(Job.id == job_id)
        job = (await db.execute(stmt_j)).scalar_one()
    return job


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.delete(job)
    await db.commit()
    return {"ok": True}


@api.post("/jobs/{job_id}/apply")
async def apply_job(
    job_id: str,
    name: str = Form(...),
    phone: str = Form(...),
    location_preferred: str = Form(...),
    qualification: str = Form(...),
    resume: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Job).where(Job.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # RBAC: Publisher check (cannot apply to own vacancy)
    if job.company_id:
        if user.get("company_id") == job.company_id:
            raise HTTPException(status_code=400, detail="You cannot apply to your own job vacancy")
        stmt_comp = select(Company).where(Company.id == job.company_id)
        company = (await db.execute(stmt_comp)).scalar_one_or_none()
        if company and company.owner_id == user["id"]:
            raise HTTPException(status_code=400, detail="You cannot apply to your own job vacancy")

    user_id = user["id"]
    job_dir = VACANCY_RESUME_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    
    orig_filename = resume.filename or ""
    _, ext = os.path.splitext(orig_filename)
    if not ext:
        ext = ".pdf"
        
    resume_filename = f"{user_id}{ext}"
    resume_path = job_dir / resume_filename
    
    with open(resume_path, "wb") as buffer:
        shutil.copyfileobj(resume.file, buffer)
        
    info_data = {
        "user_id": user_id,
        "name": name,
        "phone": phone,
        "location_preferred": location_preferred,
        "qualification": qualification,
        "resume_filename": resume_filename,
        "applied_at": now_iso()
    }
    info_path = job_dir / f"{user_id}_info.json"
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(info_data, f, ensure_ascii=False, indent=2)
        
    return {"ok": True}


@api.get("/jobs/{job_id}/applications")
async def list_job_applications(
    job_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Job).where(Job.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    job_dir = VACANCY_RESUME_DIR / job_id
    apps = []
    if job_dir.exists() and job_dir.is_dir():
        for file_name in os.listdir(job_dir):
            if file_name.endswith("_info.json"):
                info_path = job_dir / file_name
                try:
                    with open(info_path, "r", encoding="utf-8") as f:
                        info = json.load(f)
                        info["resume_url"] = f"/VacancyResume/{job_id}/{info['resume_filename']}"
                        apps.append(info)
                except Exception:
                    pass
    apps.sort(key=lambda x: x.get("applied_at", ""), reverse=True)
    return apps


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Post).where(Post.id == post_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if p.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.delete(p)
    
    # cascade delete
    stmt_likes = delete(Like).where(Like.target_id == post_id, Like.target_type == "post")
    await db.execute(stmt_likes)
    
    stmt_bookmarks = delete(Bookmark).where(Bookmark.post_id == post_id)
    await db.execute(stmt_bookmarks)
    
    stmt_comments = delete(Comment).where(Comment.post_id == post_id)
    await db.execute(stmt_comments)
    
    await db.commit()
    return {"ok": True}


@api.delete("/reels/{reel_id}")
async def delete_reel(reel_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Reel).where(Reel.id == reel_id)
    r = (await db.execute(stmt)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.delete(r)
    
    # cascade delete
    stmt_likes = delete(Like).where(Like.target_id == reel_id, Like.target_type == "reel")
    await db.execute(stmt_likes)
    
    stmt_comments = delete(Comment).where(Comment.reel_id == reel_id)
    await db.execute(stmt_comments)
    
    await db.commit()
    return {"ok": True}


@api.get("/posts/{post_id}/comments", response_model=List[CommentOut])
async def list_post_comments(post_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Comment).where(Comment.post_id == post_id).order_by(desc(Comment.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    return [CommentOut(id=d.id, user_name=d.user_name, user_avatar=d.user_avatar, text=d.text, created_at=d.created_at) for d in docs]


@api.post("/posts/{post_id}/comments", response_model=CommentOut)
async def add_post_comment(post_id: str, payload: CommentCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = Comment(
        id=str(uuid.uuid4()), post_id=post_id, user_id=user["id"],
        user_name=user["name"], user_avatar=user.get("avatar_url"),
        text=payload.text, created_at=now_iso(),
    )
    db.add(doc)
    await db.commit()
    return CommentOut(id=doc.id, user_name=doc.user_name, user_avatar=doc.user_avatar, text=doc.text, created_at=doc.created_at)


# -------------------- Admin --------------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    companies_count = (await db.execute(select(func.count(Company.id)))).scalar_one()
    posts_count = (await db.execute(select(func.count(Post.id)))).scalar_one()
    reels_count = (await db.execute(select(func.count(Reel.id)))).scalar_one()
    products_count = (await db.execute(select(func.count(Product.id)))).scalar_one()
    enquiries_count = (await db.execute(select(func.count(Enquiry.id)))).scalar_one()
    jobs_count = (await db.execute(select(func.count(Job.id)))).scalar_one()
    follows_count = (await db.execute(select(func.count(Follow.id)))).scalar_one()
    
    return {
        "users": users_count,
        "companies": companies_count,
        "posts": posts_count,
        "reels": reels_count,
        "products": products_count,
        "enquiries": enquiries_count,
        "jobs": jobs_count,
        "follows": follows_count,
    }


@api.get("/admin/companies", response_model=List[CompanyOut])
async def admin_companies(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Company).order_by(desc(Company.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    return [await hydrate_company(c, user, db) for c in docs]


@api.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    stmt = select(Company).where(Company.id == company_id)
    c = (await db.execute(stmt)).scalar_one_or_none()
    if c:
        await db.delete(c)
        
    await db.execute(delete(Post).where(Post.company_id == company_id))
    await db.execute(delete(Reel).where(Reel.company_id == company_id))
    await db.execute(delete(Product).where(Product.company_id == company_id))
    await db.commit()
    return {"ok": True}


# -------------------- Enquiries / Leads --------------------
@api.post("/enquiries", response_model=EnquiryOut)
async def create_enquiry(payload: EnquiryCreate, db: AsyncSession = Depends(get_db)):
    company_id = payload.company_id
    if payload.post_id and not company_id:
        stmt_post = select(Post).where(Post.id == payload.post_id)
        post = (await db.execute(stmt_post)).scalar_one_or_none()
        if post:
            company_id = post.company_id
            
    eid = str(uuid.uuid4())
    doc = Enquiry(
        id=eid, name=payload.name, mobile=payload.mobile,
        requirement=payload.requirement, category=payload.category,
        location=payload.location, company_id=company_id,
        post_id=payload.post_id, status="new", created_at=now_iso(),
        product_name=payload.product_name, quantity=payload.quantity,
        state=payload.state, city=payload.city,
        industrial_area=payload.industrial_area,
    )
    db.add(doc)
    
    if company_id:
        stmt_comp = select(Company).where(Company.id == company_id)
        company = (await db.execute(stmt_comp)).scalar_one_or_none()
        if company:
            notif = Notification(
                id=str(uuid.uuid4()), user_id=company.owner_id,
                title="New Lead!",
                body=f"{payload.name} - {payload.requirement[:60]}",
                read=False, created_at=now_iso(),
            )
            db.add(notif)
            
    await db.commit()
    
    stmt_reload = select(Enquiry).where(Enquiry.id == eid)
    doc_loaded = (await db.execute(stmt_reload)).scalar_one()
    return EnquiryOut(
        id=doc_loaded.id, name=doc_loaded.name, mobile=doc_loaded.mobile,
        requirement=doc_loaded.requirement, category=doc_loaded.category,
        location=doc_loaded.location, company_id=doc_loaded.company_id,
        post_id=doc_loaded.post_id, status=doc_loaded.status,
        created_at=doc_loaded.created_at,
        product_name=doc_loaded.product_name, quantity=doc_loaded.quantity,
        state=doc_loaded.state, city=doc_loaded.city,
        industrial_area=doc_loaded.industrial_area,
    )


@api.get("/enquiries", response_model=List[EnquiryOut])
async def list_enquiries(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    if not user.get("company_id") and user.get("role") != "admin":
        return []
    
    stmt = select(Enquiry)
    if user.get("role") != "admin":
        stmt = stmt.where(Enquiry.company_id == user["company_id"])
    if status:
        stmt = stmt.where(Enquiry.status == status)
        
    stmt = stmt.order_by(desc(Enquiry.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    
    return [EnquiryOut(
        id=d.id, name=d.name, mobile=d.mobile, requirement=d.requirement,
        category=d.category, location=d.location, product_name=d.product_name,
        quantity=d.quantity, state=d.state, city=d.city,
        industrial_area=d.industrial_area, company_id=d.company_id,
        post_id=d.post_id, status=d.status, created_at=d.created_at
    ) for d in docs]


@api.patch("/enquiries/{enquiry_id}/status")
async def update_enquiry_status(
    enquiry_id: str,
    new_status: Literal["new", "in_progress", "closed", "completed", "pending"] = Query(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Enquiry).where(Enquiry.id == enquiry_id)
    enq = (await db.execute(stmt)).scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Not found")
        
    is_allowed = (
        user.get("role") == "admin" or
        (enq.company_id and enq.company_id == user.get("company_id")) or
        (enq.mobile == user.get("mobile"))
    )
    if not is_allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    enq.status = new_status
    await db.commit()
    return {"ok": True}


@api.get("/requirements/my", response_model=List[EnquiryOut])
async def list_my_requirements(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Enquiry).where(Enquiry.mobile == user["mobile"]).order_by(desc(Enquiry.created_at))
    docs = (await db.execute(stmt)).scalars().all()
    return [EnquiryOut(
        id=d.id, name=d.name, mobile=d.mobile, requirement=d.requirement,
        category=d.category, location=d.location, product_name=d.product_name,
        quantity=d.quantity, state=d.state, city=d.city,
        industrial_area=d.industrial_area, company_id=d.company_id,
        post_id=d.post_id, status=d.status, created_at=d.created_at
    ) for d in docs]


@api.delete("/enquiries/{enquiry_id}")
async def delete_enquiry(
    enquiry_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Enquiry).where(Enquiry.id == enquiry_id)
    enq = (await db.execute(stmt)).scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Not found")
        
    is_allowed = (
        user.get("role") == "admin" or
        (enq.mobile == user.get("mobile"))
    )
    if not is_allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    await db.delete(enq)
    await db.commit()
    return {"ok": True}


# -------------------- Notifications --------------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == user["id"]).order_by(desc(Notification.created_at)).limit(100)
    docs = (await db.execute(stmt)).scalars().all()
    return [{
        "id": d.id, "user_id": d.user_id, "title": d.title,
        "body": d.body, "read": d.read, "created_at": d.created_at
    } for d in docs]


@api.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = update(Notification).where(Notification.user_id == user["id"]).values(read=True)
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


# -------------------- Bookmarks --------------------
@api.get("/me/bookmarks", response_model=List[PostOut])
async def my_bookmarks(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt_bookmarks = select(Bookmark).where(Bookmark.user_id == user["id"]).order_by(desc(Bookmark.created_at))
    docs = (await db.execute(stmt_bookmarks)).scalars().all()
    out = []
    for b in docs:
        if b.post_id:
            stmt_post = select(Post).where(Post.id == b.post_id)
            post = (await db.execute(stmt_post)).scalar_one_or_none()
            if post:
                p = await hydrate_post(post, user, db)
                if p:
                    out.append(p)
    return out



# -------------------- Slides --------------------
class SlideIn(BaseModel):
    title: str
    subtitle: str
    image: str
    cta: str
    accent: Optional[str] = "from-blue-900/85 via-blue-800/60 to-transparent"
    sort_order: int = 0

class SlideOut(BaseModel):
    id: str
    title: str
    subtitle: str
    image: str
    cta: str
    accent: str
    sort_order: int
    created_at: str

class SlideUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    cta: Optional[str] = None
    accent: Optional[str] = None
    sort_order: Optional[int] = None

@api.get("/slides", response_model=List[SlideOut])
async def list_slides(db: AsyncSession = Depends(get_db)):
    stmt = select(Slide).order_by(Slide.sort_order.asc())
    docs = (await db.execute(stmt)).scalars().all()
    return docs

@api.post("/admin/slides", response_model=SlideOut)
async def admin_create_slide(payload: SlideIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    sid = str(uuid.uuid4())
    doc = Slide(
        id=sid,
        title=payload.title,
        subtitle=payload.subtitle,
        image=payload.image,
        cta=payload.cta,
        accent=payload.accent or "from-blue-900/85 via-blue-800/60 to-transparent",
        sort_order=payload.sort_order,
        created_at=now_iso()
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

@api.patch("/admin/slides/{slide_id}", response_model=SlideOut)
async def admin_update_slide(slide_id: str, payload: SlideUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Slide).where(Slide.id == slide_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Slide not found")
    
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        stmt_upd = update(Slide).where(Slide.id == slide_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        await db.refresh(doc)
    return doc

@api.delete("/admin/slides/{slide_id}")
async def admin_delete_slide(slide_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Slide).where(Slide.id == slide_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if doc:
        await db.delete(doc)
        await db.commit()
    return {"ok": True}


# -------------------- Categories --------------------
class CategoryIn(BaseModel):
    name: str
    icon: Optional[str] = None
    sort_order: int = 0


@api.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    stmt = select(Category).order_by(Category.sort_order.asc())
    docs = (await db.execute(stmt)).scalars().all()
    return [{
        "id": d.id, "name": d.name, "icon": d.icon,
        "sort_order": d.sort_order, "created_at": d.created_at
    } for d in docs]


@api.post("/admin/categories")
async def admin_create_category(payload: CategoryIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    cid = str(uuid.uuid4())
    doc = Category(
        id=cid, name=payload.name, icon=payload.icon,
        sort_order=payload.sort_order, created_at=now_iso()
    )
    db.add(doc)
    await db.commit()
    return {
        "id": doc.id, "name": doc.name, "icon": doc.icon,
        "sort_order": doc.sort_order, "created_at": doc.created_at
    }


@api.patch("/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, payload: CategoryIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    stmt = select(Category).where(Category.id == cat_id)
    cat = (await db.execute(stmt)).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        stmt_upd = update(Category).where(Category.id == cat_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
    return {"ok": True}


@api.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Category).where(Category.id == cat_id)
    cat = (await db.execute(stmt)).scalar_one_or_none()
    if cat:
        await db.delete(cat)
        await db.commit()
    return {"ok": True}


# -------------------- Industrial Areas --------------------
class AreaIn(BaseModel):
    state: str
    city: str
    name: str  # industrial area name
    sort_order: int = 0


@api.get("/areas")
async def list_areas(state: Optional[str] = None, city: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Area)
    if state:
        stmt = stmt.where(Area.state == state)
    if city:
        stmt = stmt.where(Area.city == city)
    stmt = stmt.order_by(Area.state.asc(), Area.city.asc(), Area.name.asc())
    docs = (await db.execute(stmt)).scalars().all()
    return [{
        "id": d.id, "state": d.state, "city": d.city,
        "name": d.name, "sort_order": d.sort_order, "created_at": d.created_at
    } for d in docs]


@api.get("/areas/tree")
async def areas_tree(db: AsyncSession = Depends(get_db)):
    """Returns a hierarchical {state: {city: [area, ...]}} structure."""
    stmt = select(Area).order_by(Area.state.asc(), Area.city.asc(), Area.name.asc())
    docs = (await db.execute(stmt)).scalars().all()
    tree = {}
    for d in docs:
        tree.setdefault(d.state, {}).setdefault(d.city, []).append(d.name)
    return tree


@api.post("/admin/areas")
async def admin_create_area(payload: AreaIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    aid = str(uuid.uuid4())
    doc = Area(
        id=aid, state=payload.state, city=payload.city,
        name=payload.name, sort_order=payload.sort_order, created_at=now_iso()
    )
    db.add(doc)
    await db.commit()
    return {
        "id": doc.id, "state": doc.state, "city": doc.city,
        "name": doc.name, "sort_order": doc.sort_order, "created_at": doc.created_at
    }


@api.patch("/admin/areas/{area_id}")
async def admin_update_area(area_id: str, payload: AreaIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    stmt = select(Area).where(Area.id == area_id)
    area = (await db.execute(stmt)).scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        stmt_upd = update(Area).where(Area.id == area_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
    return {"ok": True}


@api.delete("/admin/areas/{area_id}")
async def admin_delete_area(area_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Area).where(Area.id == area_id)
    area = (await db.execute(stmt)).scalar_one_or_none()
    if area:
        await db.delete(area)
        await db.commit()
    return {"ok": True}


# -------------------- Reel edit + save --------------------
class ReelUpdate(BaseModel):
    content: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


@api.patch("/reels/{reel_id}", response_model=ReelOut)
async def update_reel(reel_id: str, payload: ReelUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Reel).where(Reel.id == reel_id)
    r = (await db.execute(stmt)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.company_id != user.get("company_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        stmt_upd = update(Reel).where(Reel.id == reel_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        # reload
        stmt_r = select(Reel).where(Reel.id == reel_id)
        r = (await db.execute(stmt_r)).scalar_one()
        
    return await hydrate_reel(r, user, db)


@api.post("/reels/{reel_id}/save")
async def toggle_reel_save(reel_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Bookmark).where(Bookmark.reel_id == reel_id, Bookmark.user_id == user["id"])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"saved": False}
    
    new_bookmark = Bookmark(
        id=str(uuid.uuid4()), reel_id=reel_id,
        user_id=user["id"], created_at=now_iso(),
    )
    db.add(new_bookmark)
    await db.commit()
    return {"saved": True}


# -------------------- Plans --------------------
class PlanIn(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_price: float = 0
    yearly_price: float = 0
    currency: str = "INR"
    duration_days: int = 30
    features: List[str] = []
    badge: Optional[str] = None
    color: str = "blue"
    is_featured: bool = False
    is_active: bool = True
    sort_order: int = 0
    leads_per_month: Optional[int] = None
    unlocks_per_month: Optional[int] = None


class PlanOut(PlanIn):
    id: str
    created_at: str


@api.get("/plans", response_model=List[PlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)):
    stmt = select(Plan).where(Plan.is_active == True).order_by(Plan.sort_order.asc())
    docs = (await db.execute(stmt)).scalars().all()
    return [PlanOut(
        id=d.id, name=d.name, description=d.description,
        monthly_price=d.monthly_price, yearly_price=d.yearly_price,
        currency=d.currency, duration_days=d.duration_days,
        features=d.features or [], badge=d.badge, color=d.color,
        is_featured=d.is_featured, is_active=d.is_active,
        sort_order=d.sort_order, leads_per_month=d.leads_per_month,
        unlocks_per_month=d.unlocks_per_month, created_at=d.created_at
    ) for d in docs]


@api.get("/admin/plans", response_model=List[PlanOut])
async def admin_list_plans(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Plan).order_by(Plan.sort_order.asc())
    docs = (await db.execute(stmt)).scalars().all()
    return [PlanOut(
        id=d.id, name=d.name, description=d.description,
        monthly_price=d.monthly_price, yearly_price=d.yearly_price,
        currency=d.currency, duration_days=d.duration_days,
        features=d.features or [], badge=d.badge, color=d.color,
        is_featured=d.is_featured, is_active=d.is_active,
        sort_order=d.sort_order, leads_per_month=d.leads_per_month,
        unlocks_per_month=d.unlocks_per_month, created_at=d.created_at
    ) for d in docs]


@api.post("/admin/plans", response_model=PlanOut)
async def admin_create_plan(payload: PlanIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pid = str(uuid.uuid4())
    doc = Plan(
        id=pid, name=payload.name, description=payload.description,
        monthly_price=payload.monthly_price, yearly_price=payload.yearly_price,
        currency=payload.currency, duration_days=payload.duration_days,
        features=payload.features, badge=payload.badge, color=payload.color,
        is_featured=payload.is_featured, is_active=payload.is_active,
        sort_order=payload.sort_order, leads_per_month=payload.leads_per_month,
        unlocks_per_month=payload.unlocks_per_month, created_at=now_iso()
    )
    db.add(doc)
    await db.commit()
    return PlanOut(
        id=doc.id, name=doc.name, description=doc.description,
        monthly_price=doc.monthly_price, yearly_price=doc.yearly_price,
        currency=doc.currency, duration_days=doc.duration_days,
        features=doc.features or [], badge=doc.badge, color=doc.color,
        is_featured=doc.is_featured, is_active=doc.is_active,
        sort_order=doc.sort_order, leads_per_month=doc.leads_per_month,
        unlocks_per_month=doc.unlocks_per_month, created_at=doc.created_at
    )


@api.patch("/admin/plans/{plan_id}", response_model=PlanOut)
async def admin_update_plan(plan_id: str, payload: PlanIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    stmt = select(Plan).where(Plan.id == plan_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = payload.model_dump(exclude_none=True)
    if update_data:
        stmt_upd = update(Plan).where(Plan.id == plan_id).values(**update_data)
        await db.execute(stmt_upd)
        await db.commit()
        # reload
        stmt_r = select(Plan).where(Plan.id == plan_id)
        doc = (await db.execute(stmt_r)).scalar_one()
        
    return PlanOut(
        id=doc.id, name=doc.name, description=doc.description,
        monthly_price=doc.monthly_price, yearly_price=doc.yearly_price,
        currency=doc.currency, duration_days=doc.duration_days,
        features=doc.features or [], badge=doc.badge, color=doc.color,
        is_featured=doc.is_featured, is_active=doc.is_active,
        sort_order=doc.sort_order, leads_per_month=doc.leads_per_month,
        unlocks_per_month=doc.unlocks_per_month, created_at=doc.created_at
    )


@api.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(Plan).where(Plan.id == plan_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if doc:
        await db.delete(doc)
        await db.commit()
    return {"ok": True}


@api.post("/admin/users/{user_id}/plan/{plan_id}")
async def admin_assign_plan(user_id: str, plan_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt_plan = select(Plan).where(Plan.id == plan_id)
    plan = (await db.execute(stmt_plan)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    expiry = (datetime.now(timezone.utc) + timedelta(days=plan.duration_days or 30)).isoformat()
    stmt_upd = update(User).where(User.id == user_id).values(
        plan_id=plan_id, plan_name=plan.name, plan_expires_at=expiry
    )
    await db.execute(stmt_upd)
    await db.commit()
    return {"ok": True, "expires_at": expiry}


# -------------------- Public Lead / Requirement Feed --------------------
def _can_see_contact(user: Optional[dict], enquiry: dict) -> bool:
    """
    Returns True only for contacts that should be ALWAYS visible without an
    explicit per-lead unlock:
      - Admins see everything.
      - A user sees their own company's enquiries.

    Paid-plan users must still explicitly unlock each lead (tracked via
    unlocked_enquiries). Removing the old "any paid plan → see all" logic
    prevents leads from flickering back to Locked on page reload when the
    auth cookie is not yet available in the list request.
    """
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    if enquiry.get("company_id") and user.get("company_id") == enquiry.get("company_id"):
        return True
    return False


def _mask_mobile(m: str) -> str:
    if not m:
        return ""
    s = str(m)
    if len(s) <= 4:
        return "•••• •"
    return s[:2] + "•" * (len(s) - 4) + s[-2:]


@api.get("/requirements")
async def list_requirements(
    request: Request,
    location: Optional[str] = None,
    category: Optional[str] = None,
    industrial_area: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    sort: Literal["recent", "trending"] = "recent",
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    
    stmt = select(Enquiry)
    if location:
        stmt = stmt.where(Enquiry.location.ilike(f"%{location}%"))
    if category:
        stmt = stmt.where(Enquiry.category.ilike(f"%{category}%"))
    if industrial_area:
        stmt = stmt.where(Enquiry.industrial_area.ilike(f"%{industrial_area}%"))
    if city:
        stmt = stmt.where(Enquiry.city.ilike(f"%{city}%"))
    if state:
        stmt = stmt.where(Enquiry.state.ilike(f"%{state}%"))
        
    stmt = stmt.order_by(desc(Enquiry.created_at)).limit(limit)
    res = await db.execute(stmt)
    docs = res.scalars().all()
    
    out = []
    user_id = cu["id"] if cu else None
    unlocked_ids = set()
    if user_id:
        stmt_user = select(User).where(User.id == user_id)
        u = (await db.execute(stmt_user)).scalar_one_or_none()
        if u and u.unlocked_enquiries:
            unlocked_ids = set(u.unlocked_enquiries)
            
    for d in docs:
        d_dict = {
            "id": d.id, "name": d.name, "mobile": d.mobile, "requirement": d.requirement,
            "category": d.category, "location": d.location, "product_name": d.product_name,
            "quantity": d.quantity, "state": d.state, "city": d.city,
            "industrial_area": d.industrial_area, "status": d.status,
            "created_at": d.created_at, "company_id": d.company_id, "post_id": d.post_id
        }
        unlocked = _can_see_contact(cu, d_dict) or (d.id in unlocked_ids)
        item = {
            "id": d.id,
            "name": d.name if unlocked else d.name.split(" ")[0],
            "requirement": d.requirement,
            "category": d.category, "location": d.location,
            "product_name": d.product_name,
            "quantity": d.quantity,
            "state": d.state, "city": d.city,
            "industrial_area": d.industrial_area,
            "status": d.status, "created_at": d.created_at,
            "is_unlocked": unlocked,
            "mobile": d.mobile if unlocked else _mask_mobile(d.mobile),
            "company_id": d.company_id,
        }
        out.append(item)
    return out


# ---------------------------------------------------------------------------
# Unlock OTP Store  (in-memory, server-restart will clear — acceptable for OTP)
# token -> {user_id, enq_id, otp, expires_at}
# ---------------------------------------------------------------------------
import random
import string
_unlock_otp_store: dict = {}


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _clean_expired_otps() -> None:
    """Remove expired OTP entries to avoid unbounded growth."""
    now = datetime.now(timezone.utc)
    expired = [k for k, v in _unlock_otp_store.items() if v["expires_at"] < now]
    for k in expired:
        del _unlock_otp_store[k]


# ---------------------------------------------------------------------------
# Helpers for monthly unlock tracking
# ---------------------------------------------------------------------------

def _current_month_key() -> str:
    """Returns a key like '2026-07' for the current UTC month."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _get_monthly_used(u: User) -> list:
    """Return list of enq_ids unlocked in the current calendar month."""
    monthly = u.monthly_unlocks or {}
    return list(monthly.get(_current_month_key(), []))


async def _get_plan_monthly_limit(plan_name: str, db: AsyncSession) -> int:
    """
    Fetch unlocks_per_month from the Plan table.
    Falls back to a hardcoded map if the plan row has no limit set.
    """
    if not plan_name or plan_name.lower() in ("free", ""):
        return 0
    stmt = select(Plan).where(Plan.name.ilike(plan_name))
    plan_row = (await db.execute(stmt)).scalar_one_or_none()
    if plan_row and plan_row.unlocks_per_month is not None:
        return plan_row.unlocks_per_month
    # Fallback hardcoded map
    p = plan_name.lower()
    fallback = {"basic": 30, "seo boost": 100, "business development": 200,
                "premium": 999999, "enterprise": 999999, "admin": 999999}
    return fallback.get(p, 50)  # default 50 for unknown paid plans


def get_plan_unlock_limit(plan_name: str) -> int:
    """Sync fallback — kept for compatibility."""
    if not plan_name:
        return 0
    p = plan_name.lower()
    if p == "free":
        return 0
    fallback = {"basic": 30, "seo boost": 100, "business development": 200,
                "premium": 999999, "enterprise": 999999, "admin": 999999}
    return fallback.get(p, 50)


# ---------------------------------------------------------------------------
# New API: GET /requirements/unlock-stats
# ---------------------------------------------------------------------------

@api.get("/requirements/unlock-stats")
async def unlock_stats(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return current-month unlock quota usage for the logged-in user."""
    plan_name = user.get("plan_name") or "Free"
    stmt_user = select(User).where(User.id == user["id"])
    u = (await db.execute(stmt_user)).scalar_one()

    used_this_month = _get_monthly_used(u)
    limit = await _get_plan_monthly_limit(plan_name, db)
    is_admin = user.get("role") == "admin"

    return {
        "plan_name": plan_name,
        "unlocks_per_month": None if is_admin else limit,
        "used_this_month": len(used_this_month),
        "remaining": None if is_admin else max(0, limit - len(used_this_month)),
        "total_all_time": len(u.unlocked_enquiries or []),
    }


# ---------------------------------------------------------------------------
# New API: POST /requirements/{enq_id}/request-unlock  (sends OTP email)
# ---------------------------------------------------------------------------

@api.post("/requirements/{enq_id}/request-unlock")
async def request_unlock(
    enq_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1 of the OTP unlock flow.
    - Verifies plan & quota.
    - If already unlocked → returns already_unlocked: true (no OTP needed).
    - Otherwise generates OTP, stores it, sends email, returns a token.
    """
    stmt_enq = select(Enquiry).where(Enquiry.id == enq_id)
    enq = (await db.execute(stmt_enq)).scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Not found")

    plan_name = user.get("plan_name") or "Free"
    is_admin = user.get("role") == "admin"

    # Plan check
    if not is_admin and plan_name.lower() in ("free", ""):
        raise HTTPException(status_code=403, detail="Upgrade plan to unlock contact")

    # Expiry check
    expires_at_str = user.get("plan_expires_at")
    if expires_at_str and not is_admin:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now(timezone.utc) > expires_at:
                raise HTTPException(
                    status_code=403,
                    detail="Your subscription plan has expired. Please upgrade or renew."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    stmt_user = select(User).where(User.id == user["id"])
    u = (await db.execute(stmt_user)).scalar_one()

    current_unlocked = list(u.unlocked_enquiries or [])

    # Already unlocked all-time — skip OTP, return contact
    if enq_id in current_unlocked:
        return {"already_unlocked": True, "mobile": enq.mobile, "name": enq.name}

    # Monthly quota check
    if not is_admin:
        monthly_used = _get_monthly_used(u)
        limit = await _get_plan_monthly_limit(plan_name, db)
        if len(monthly_used) >= limit:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"You have used all {limit} unlock(s) for this month on the "
                    f"{plan_name} plan. Your quota resets on the 1st of next month."
                )
            )

    # Generate OTP + token
    _clean_expired_otps()
    otp = _generate_otp()
    token = str(uuid.uuid4())
    _unlock_otp_store[token] = {
        "user_id": user["id"],
        "enq_id": enq_id,
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    }

    # Send OTP email (fire and forget errors — log but don't fail the request)
    try:
        html = build_otp_email(
            otp=otp,
            user_name=user.get("name", "User"),
            action="unlock a lead contact",
        )
        await send_email(
            to=user["email"],
            subject="🔓 IIP — Your Lead Unlock OTP",
            html_body=html,
        )
    except Exception as exc:
        logger.error("Failed to send unlock OTP email to %s: %s", user["email"], exc)
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")

    # Mask email for frontend display
    raw_email = user["email"]
    parts = raw_email.split("@")
    email_hint = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else raw_email

    return {"already_unlocked": False, "token": token, "email_hint": email_hint}


# ---------------------------------------------------------------------------
# New API: POST /requirements/{enq_id}/confirm-unlock  (verify OTP)
# ---------------------------------------------------------------------------

class ConfirmUnlockIn(BaseModel):
    token: str
    otp: str


@api.post("/requirements/{enq_id}/confirm-unlock")
async def confirm_unlock(
    enq_id: str,
    payload: ConfirmUnlockIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2 of the OTP unlock flow.
    Validates OTP + token, then reveals the contact and records the unlock.
    """
    entry = _unlock_otp_store.get(payload.token)

    if not entry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP session. Please request a new OTP.")

    if entry["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Token does not belong to this user.")

    if entry["enq_id"] != enq_id:
        raise HTTPException(status_code=400, detail="Token does not match this enquiry.")

    if datetime.now(timezone.utc) > entry["expires_at"]:
        del _unlock_otp_store[payload.token]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if entry["otp"] != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    # OTP valid — consume it
    del _unlock_otp_store[payload.token]

    # Fetch enquiry
    stmt_enq = select(Enquiry).where(Enquiry.id == enq_id)
    enq = (await db.execute(stmt_enq)).scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Not found")

    # Record unlock
    stmt_user = select(User).where(User.id == user["id"])
    u = (await db.execute(stmt_user)).scalar_one()

    current_unlocked = list(u.unlocked_enquiries or [])
    if enq_id not in current_unlocked:
        current_unlocked.append(enq_id)
        u.unlocked_enquiries = current_unlocked

        # Update monthly tracker
        month_key = _current_month_key()
        monthly = dict(u.monthly_unlocks or {})
        month_list = list(monthly.get(month_key, []))
        if enq_id not in month_list:
            month_list.append(enq_id)
        monthly[month_key] = month_list
        u.monthly_unlocks = monthly

        await db.commit()

    return {"ok": True, "mobile": enq.mobile, "name": enq.name}


# ---------------------------------------------------------------------------
# Existing unlock endpoint — updated to enforce monthly quota
# (kept for backward compatibility; prefer the OTP flow above)
# ---------------------------------------------------------------------------

@api.post("/requirements/{enq_id}/unlock")
async def unlock_requirement(enq_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt_enq = select(Enquiry).where(Enquiry.id == enq_id)
    enq = (await db.execute(stmt_enq)).scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Not found")

    plan_name = user.get("plan_name") or "Free"
    is_admin = user.get("role") == "admin"

    if not is_admin and plan_name.lower() in ("free", ""):
        raise HTTPException(status_code=403, detail="Upgrade plan to unlock contact")

    # Check expiry
    expires_at_str = user.get("plan_expires_at")
    if expires_at_str and not is_admin:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now(timezone.utc) > expires_at:
                raise HTTPException(status_code=403, detail="Your subscription plan has expired. Please upgrade or renew.")
        except HTTPException:
            raise
        except Exception:
            pass

    stmt_user = select(User).where(User.id == user["id"])
    u = (await db.execute(stmt_user)).scalar_one()

    current_unlocked = list(u.unlocked_enquiries or [])
    if enq_id not in current_unlocked:
        # Monthly quota check
        if not is_admin:
            monthly_used = _get_monthly_used(u)
            limit = await _get_plan_monthly_limit(plan_name, db)
            if len(monthly_used) >= limit:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"You have used all {limit} unlock(s) for this month on the "
                        f"{plan_name} plan. Your quota resets on the 1st of next month."
                    )
                )

        current_unlocked.append(enq_id)
        u.unlocked_enquiries = current_unlocked

        # Update monthly tracker
        month_key = _current_month_key()
        monthly = dict(u.monthly_unlocks or {})
        month_list = list(monthly.get(month_key, []))
        if enq_id not in month_list:
            month_list.append(enq_id)
        monthly[month_key] = month_list
        u.monthly_unlocks = monthly

        await db.commit()

    return {"ok": True, "mobile": enq.mobile, "name": enq.name}


# ---------------------------------------------------------------------------
# Industrial Area Groups APIs
# ---------------------------------------------------------------------------

@api.get("/industrial-groups", response_model=List[IndustrialGroupOut])
async def list_industrial_groups(
    request: Request,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    stmt = select(IndustrialGroup).order_by(desc(IndustrialGroup.members_count))
    if search and search.strip():
        q = f"%{search.strip()}%"
        stmt = stmt.where(or_(IndustrialGroup.name.ilike(q), IndustrialGroup.location.ilike(q), IndustrialGroup.description.ilike(q)))
    
    docs = (await db.execute(stmt)).scalars().all()
    
    joined_ids = set()
    if cu:
        stmt_m = select(GroupMember.group_id).where(GroupMember.user_id == cu["id"])
        joined_ids = set((await db.execute(stmt_m)).scalars().all())

    out = []
    for g in docs:
        out.append(IndustrialGroupOut(
            id=g.id, name=g.name, slug=g.slug, location=g.location,
            description=g.description, image_url=g.image_url, cover_url=g.cover_url,
            members_count=g.members_count, companies_count=g.companies_count,
            posts_count=g.posts_count, leads_count=g.leads_count,
            jobs_count=g.jobs_count, reels_count=g.reels_count,
            is_joined=(g.id in joined_ids), created_at=g.created_at
        ))
    return out


@api.get("/industrial-groups/{group_id_or_slug}", response_model=IndustrialGroupOut)
async def get_industrial_group(
    group_id_or_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    stmt = select(IndustrialGroup).where(
        or_(IndustrialGroup.id == group_id_or_slug, IndustrialGroup.slug == group_id_or_slug)
    )
    g = (await db.execute(stmt)).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Industrial Area Group not found")
        
    is_joined = False
    if cu:
        stmt_m = select(GroupMember).where(GroupMember.group_id == g.id, GroupMember.user_id == cu["id"])
        is_joined = bool((await db.execute(stmt_m)).scalar_one_or_none())

    return IndustrialGroupOut(
        id=g.id, name=g.name, slug=g.slug, location=g.location,
        description=g.description, image_url=g.image_url, cover_url=g.cover_url,
        members_count=g.members_count, companies_count=g.companies_count,
        posts_count=g.posts_count, leads_count=g.leads_count,
        jobs_count=g.jobs_count, reels_count=g.reels_count,
        is_joined=is_joined, created_at=g.created_at
    )


@api.post("/industrial-groups", response_model=IndustrialGroupOut)
async def create_industrial_group(
    payload: IndustrialGroupCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create industrial groups")
        
    slug = payload.name.lower().replace(" ", "-").replace(",", "")
    gid = str(uuid.uuid4())
    doc = IndustrialGroup(
        id=gid, name=payload.name, slug=slug, location=payload.location,
        description=payload.description, image_url=payload.image_url,
        cover_url=payload.cover_url, members_count=payload.members_count or 1,
        companies_count=payload.companies_count or 1, posts_count=0,
        leads_count=0, jobs_count=0, reels_count=0, created_at=now_iso()
    )
    db.add(doc)
    
    # Auto join admin
    member_doc = GroupMember(
        id=str(uuid.uuid4()), group_id=gid, user_id=user["id"],
        role_in_group="admin", created_at=now_iso()
    )
    db.add(member_doc)
    await db.commit()
    await db.refresh(doc)

    return IndustrialGroupOut(
        id=doc.id, name=doc.name, slug=doc.slug, location=doc.location,
        description=doc.description, image_url=doc.image_url, cover_url=doc.cover_url,
        members_count=doc.members_count, companies_count=doc.companies_count,
        posts_count=doc.posts_count, leads_count=doc.leads_count,
        jobs_count=doc.jobs_count, reels_count=doc.reels_count,
        is_joined=True, created_at=doc.created_at
    )


@api.put("/industrial-groups/{group_id}", response_model=IndustrialGroupOut)
async def update_industrial_group(
    group_id: str,
    payload: IndustrialGroupUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can edit industrial groups")

    stmt = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    g = (await db.execute(stmt)).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Industrial Area Group not found")

    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in upd:
        upd["slug"] = upd["name"].lower().replace(" ", "-").replace(",", "")
        
    if upd:
        stmt_u = update(IndustrialGroup).where(IndustrialGroup.id == group_id).values(**upd)
        await db.execute(stmt_u)
        await db.commit()
        g = (await db.execute(stmt)).scalar_one()

    return IndustrialGroupOut(
        id=g.id, name=g.name, slug=g.slug, location=g.location,
        description=g.description, image_url=g.image_url, cover_url=g.cover_url,
        members_count=g.members_count, companies_count=g.companies_count,
        posts_count=g.posts_count, leads_count=g.leads_count,
        jobs_count=g.jobs_count, reels_count=g.reels_count,
        is_joined=True, created_at=g.created_at
    )


@api.delete("/industrial-groups/{group_id}")
async def delete_industrial_group(
    group_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete industrial groups")

    stmt = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    g = (await db.execute(stmt)).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Industrial Area Group not found")

    await db.execute(delete(GroupMember).where(GroupMember.group_id == group_id))
    await db.execute(delete(IndustrialGroup).where(IndustrialGroup.id == group_id))
    await db.commit()
    return {"ok": True}


@api.post("/industrial-groups/{group_id}/join")
async def join_industrial_group(
    group_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    g = (await db.execute(stmt)).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Industrial Area Group not found")

    stmt_m = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user["id"])
    existing = (await db.execute(stmt_m)).scalar_one_or_none()
    if existing:
        return {"joined": True, "members_count": g.members_count}

    new_m = GroupMember(
        id=str(uuid.uuid4()), group_id=group_id, user_id=user["id"],
        role_in_group="member", created_at=now_iso()
    )
    db.add(new_m)
    g.members_count += 1
    await db.commit()
    return {"joined": True, "members_count": g.members_count}


@api.post("/industrial-groups/{group_id}/exit")
async def exit_industrial_group(
    group_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    g = (await db.execute(stmt)).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Industrial Area Group not found")

    stmt_m = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user["id"])
    existing = (await db.execute(stmt_m)).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        if g.members_count > 0:
            g.members_count -= 1
        await db.commit()

    return {"joined": False, "members_count": g.members_count}


@api.get("/user/joined-groups")
async def get_user_joined_groups(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt_m = select(GroupMember.group_id).where(GroupMember.user_id == user["id"])
    gids = (await db.execute(stmt_m)).scalars().all()
    if not gids:
        return []
    stmt = select(IndustrialGroup).where(IndustrialGroup.id.in_(gids))
    docs = (await db.execute(stmt)).scalars().all()
    return [{"id": d.id, "name": d.name, "location": d.location} for d in docs]


# ---------------- Group Hub Scoped Content Endpoints ----------------

@api.get("/industrial-groups/{group_id}/feed", response_model=List[PostOut])
async def get_group_feed(
    group_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Post).order_by(desc(Post.created_at))
    if grp:
        area_keyword = grp.name.split()[0].lower()
        stmt = stmt.where(or_(Post.group_id == group_id, Post.content.ilike(f"%{area_keyword}%")))
    else:
        stmt = stmt.where(Post.group_id == group_id)
        
    docs = (await db.execute(stmt)).scalars().all()
    out = []
    for d in docs:
        p = await hydrate_post(d, cu, db)
        if p:
            out.append(p)
    return out


@api.get("/industrial-groups/{group_id}/companies", response_model=List[CompanyOut])
async def get_group_companies(
    group_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Company).order_by(desc(Company.created_at))
    if grp:
        area_kw = grp.name.split()[0].lower()
        stmt = stmt.where(or_(Company.location.ilike(f"%{area_kw}%"), Company.address.ilike(f"%{area_kw}%")))
    
    docs = (await db.execute(stmt)).scalars().all()
    if not docs:
        docs = (await db.execute(select(Company).limit(10))).scalars().all()
    return [await hydrate_company(c, cu, db) for c in docs]


@api.get("/industrial-groups/{group_id}/products", response_model=List[ProductOut])
async def get_group_products(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Product).order_by(desc(Product.created_at))
    if grp:
        area_kw = grp.name.split()[0].lower()
        stmt = stmt.where(or_(Product.location.ilike(f"%{area_kw}%"), Product.name.ilike(f"%{area_kw}%")))
        
    docs = (await db.execute(stmt)).scalars().all()
    if not docs:
        docs = (await db.execute(select(Product).limit(12))).scalars().all()
        
    out = []
    for d in docs:
        stmt_comp = select(Company).where(Company.id == d.company_id)
        company = (await db.execute(stmt_comp)).scalar_one_or_none()
        out.append(make_product_out(d, company))
    return out


@api.get("/industrial-groups/{group_id}/leads", response_model=List[EnquiryOut])
async def get_group_leads(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Enquiry).order_by(desc(Enquiry.created_at))
    if grp:
        area_kw = grp.name.split()[0].lower()
        stmt = stmt.where(
            or_(
                Enquiry.group_id == group_id,
                Enquiry.industrial_area.ilike(f"%{area_kw}%"),
                Enquiry.location.ilike(f"%{area_kw}%"),
                Enquiry.requirement.ilike(f"%{area_kw}%")
            )
        )
    docs = (await db.execute(stmt)).scalars().all()
    if not docs:
        docs = (await db.execute(select(Enquiry).limit(10))).scalars().all()
        
    out = []
    for d in docs:
        out.append(EnquiryOut(
            id=d.id, name=d.name, mobile=d.mobile, requirement=d.requirement,
            category=d.category, location=d.location, product_name=d.product_name,
            quantity=d.quantity, state=d.state, city=d.city,
            industrial_area=d.industrial_area, company_id=d.company_id,
            post_id=d.post_id, status=d.status if d.status in ["new", "in_progress", "closed", "completed", "pending"] else "new",
            created_at=d.created_at
        ))
    return out


@api.get("/industrial-groups/{group_id}/jobs", response_model=List[JobOut])
async def get_group_jobs(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Job).order_by(desc(Job.created_at))
    if grp:
        area_kw = grp.name.split()[0].lower()
        stmt = stmt.where(or_(Job.group_id == group_id, Job.location.ilike(f"%{area_kw}%"), Job.title.ilike(f"%{area_kw}%")))
        
    docs = (await db.execute(stmt)).scalars().all()
    if not docs:
        docs = (await db.execute(select(Job).limit(10))).scalars().all()
        
    out = []
    for d in docs:
        out.append(JobOut(
            id=d.id, company_id=d.company_id, company_name=d.company_name,
            title=d.title, location=d.location, type=d.type, salary=d.salary,
            description=d.description, posted=d.posted, created_at=d.created_at, applicants_count=0
        ))
    return out


@api.get("/industrial-groups/{group_id}/reels", response_model=List[ReelOut])
async def get_group_reels(
    group_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    cu = await get_optional_user(request)
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    
    stmt = select(Reel).order_by(desc(Reel.created_at))
    if grp:
        area_kw = grp.name.split()[0].lower()
        stmt = stmt.where(or_(Reel.group_id == group_id, Reel.content.ilike(f"%{area_kw}%")))
        
    docs = (await db.execute(stmt)).scalars().all()
    if not docs:
        docs = (await db.execute(select(Reel).limit(10))).scalars().all()
        
    return [await hydrate_reel(d, cu, db) for d in docs]


@api.get("/industrial-groups/{group_id}/events")
async def get_group_events(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_g = select(IndustrialGroup).where(IndustrialGroup.id == group_id)
    grp = (await db.execute(stmt_g)).scalar_one_or_none()
    grp_name = grp.name if grp else "Industrial Area"
    
    events = [
        {
            "id": "ev-1",
            "title": f"{grp_name} Annual Industrial Expo 2026",
            "date": "Aug 15 - Aug 18, 2026",
            "location": f"Main Exhibition Center, {grp_name}",
            "type": "Exhibition",
            "organizer": "Industrial Manufacturers Association",
            "description": "Showcase of machinery, CNC tech, automation & local vendor networking.",
            "attendees_count": 340,
            "banner": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop"
        },
        {
            "id": "ev-2",
            "title": "Vendor Buyer Meet & Quality Standard Seminar",
            "date": "Sep 02, 2026",
            "location": f"Association Hall, {grp_name}",
            "type": "Seminar",
            "organizer": "MSME Regional Council",
            "description": "Direct interaction between Tier-1 OEMs and local precision component manufacturers.",
            "attendees_count": 120,
            "banner": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop"
        }
    ]
    return events


@api.get("/industrial-groups/{group_id}/members")
async def get_group_members(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_m = select(GroupMember).where(GroupMember.group_id == group_id).limit(50)
    members = (await db.execute(stmt_m)).scalars().all()
    
    out = []
    for m in members:
        stmt_u = select(User).where(User.id == m.user_id)
        u = (await db.execute(stmt_u)).scalar_one_or_none()
        if u:
            comp_name = None
            if u.company_id:
                stmt_c = select(Company.name).where(Company.id == u.company_id)
                comp_name = (await db.execute(stmt_c)).scalar_one_or_none()
            out.append({
                "user_id": u.id,
                "name": u.name,
                "role": u.role,
                "avatar_url": u.avatar_url,
                "company_name": comp_name,
                "joined_at": m.created_at
            })
            
    if not out:
        out = [
            {"user_id": "u-1", "name": "Rajesh Sharma", "role": "manufacturer", "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "company_name": "Peenya Precision Works", "joined_at": "2026-06-01"},
            {"user_id": "u-2", "name": "Vikram Patel", "role": "supplier", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "company_name": "Karnataka Electricals", "joined_at": "2026-06-05"},
            {"user_id": "u-3", "name": "Suresh Kumar", "role": "buyer", "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "company_name": "Bangalore Engineering Solutions", "joined_at": "2026-06-10"},
        ]
    return out


# Payment and Chat schemas and routes
class CreateOrderIn(BaseModel):
    plan_id: str
    billing_cycle: str

class VerifyPaymentIn(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan_id: str
    billing_cycle: str

class CreateCartOrderIn(BaseModel):
    amount: float

class VerifyCartPaymentIn(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class ChatMessageIn(BaseModel):
    receiver_id: str
    message: str

class ChatMessageOut(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    message: str
    created_at: str

@api.post("/payments/create-order")
async def create_payment_order(payload: CreateOrderIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Plan).where(Plan.id == payload.plan_id)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    price = plan.yearly_price if payload.billing_cycle == "yearly" else plan.monthly_price
    amount_paise = int(price * 100)
    
    # Razorpay keys
    key_id = "rzp_test_TC7Rq6NgUW0TiB"
    key_secret = "SlP4dzu1iYGRV902XsswqT2H"
    
    # If 0 price (e.g. Free plan), return success directly or handle it
    if amount_paise == 0:
        return {"order_id": "free_plan", "amount": 0, "key": key_id, "currency": "INR"}
        
    import requests
    auth = (key_id, key_secret)
    order_payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"receipt_plan_{plan.id[:8]}"
    }
    try:
        r = requests.post("https://api.razorpay.com/v1/orders", json=order_payload, auth=auth, timeout=10)
        if r.status_code != 200:
            logger.error(f"Razorpay error: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to create order with payment gateway")
        order_data = r.json()
        return {"order_id": order_data["id"], "amount": amount_paise, "key": key_id, "currency": "INR"}
    except Exception as e:
        logger.error(f"Failed calling Razorpay: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment gateway connection error")

@api.post("/payments/verify")
async def verify_payment(payload: VerifyPaymentIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key_secret = "SlP4dzu1iYGRV902XsswqT2H"
    
    if payload.razorpay_order_id != "free_plan":
        import hmac
        import hashlib
        msg = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
        generated = hmac.new(key_secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(generated, payload.razorpay_signature):
            raise HTTPException(status_code=400, detail="Payment signature verification failed")
            
    # Assign plan to user
    stmt_plan = select(Plan).where(Plan.id == payload.plan_id)
    plan = (await db.execute(stmt_plan)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    days = 365 if payload.billing_cycle == "yearly" else plan.duration_days or 30
    expiry = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    stmt_upd = update(User).where(User.id == user["id"]).values(
        plan_id=plan.id, plan_name=plan.name, plan_expires_at=expiry
    )
    await db.execute(stmt_upd)
    await db.commit()
    return {"ok": True}

@api.post("/payments/create-order-cart")
async def create_payment_order_cart(payload: CreateCartOrderIn, user: dict = Depends(get_current_user)):
    amount_paise = int(payload.amount * 100)
    key_id = "rzp_test_TC7Rq6NgUW0TiB"
    key_secret = "SlP4dzu1iYGRV902XsswqT2H"
    
    if amount_paise == 0:
        return {"order_id": "free_cart", "amount": 0, "key": key_id, "currency": "INR"}
        
    import requests
    auth = (key_id, key_secret)
    order_payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"receipt_cart_{user['id'][:8]}"
    }
    try:
        r = requests.post("https://api.razorpay.com/v1/orders", json=order_payload, auth=auth, timeout=10)
        if r.status_code != 200:
            logger.error(f"Razorpay error: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to create order with payment gateway")
        order_data = r.json()
        return {"order_id": order_data["id"], "amount": amount_paise, "key": key_id, "currency": "INR"}
    except Exception as e:
        logger.error(f"Failed calling Razorpay: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment gateway connection error")

@api.post("/payments/verify-cart")
async def verify_cart_payment(payload: VerifyCartPaymentIn, user: dict = Depends(get_current_user)):
    key_secret = "SlP4dzu1iYGRV902XsswqT2H"
    import hmac
    import hashlib
    msg = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    generated = hmac.new(key_secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(generated, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")
    return {"ok": True}

# Chat functionality
import re
def moderate_message(text: str) -> str:
    # Mask email addresses
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[blocked email]', text)
    # Mask phone numbers (10+ digits sequence with optional spaces/hyphens)
    text = re.sub(r'(\+?\d[\d -]{8,12}\d)', '[blocked number]', text)
    return text

@api.post("/chats/messages", response_model=ChatMessageOut)
async def send_chat_message(payload: ChatMessageIn, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    msg_id = str(uuid.uuid4())
    moderated = moderate_message(payload.message)
    msg = ChatMessage(
        id=msg_id,
        sender_id=user["id"],
        receiver_id=payload.receiver_id,
        message=moderated,
        created_at=now_iso()
    )
    db.add(msg)
    await db.commit()
    return ChatMessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        message=msg.message,
        created_at=msg.created_at
    )

@api.get("/chats/messages/{receiver_id}", response_model=List[ChatMessageOut])
async def get_chat_messages(receiver_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = user["id"]
    stmt = select(ChatMessage).where(
        or_(
            and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == receiver_id),
            and_(ChatMessage.sender_id == receiver_id, ChatMessage.receiver_id == user_id)
        )
    ).order_by(ChatMessage.created_at)
    res = await db.execute(stmt)
    msgs = res.scalars().all()
    return [ChatMessageOut(
        id=m.id,
        sender_id=m.sender_id,
        receiver_id=m.receiver_id,
        message=m.message,
        created_at=m.created_at
    ) for m in msgs]

@api.get("/chats/conversations")
async def get_conversations(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = user["id"]
    stmt = select(ChatMessage).where(
        or_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == user_id)
    ).order_by(desc(ChatMessage.created_at))
    res = await db.execute(stmt)
    msgs = res.scalars().all()
    
    # Group by conversation partner
    convos = {}
    for m in msgs:
        partner_id = m.receiver_id if m.sender_id == user_id else m.sender_id
        if partner_id not in convos:
            convos[partner_id] = m
            
    out = []
    for partner_id, m in convos.items():
        stmt_u = select(User).where(User.id == partner_id)
        partner = (await db.execute(stmt_u)).scalar_one_or_none()
        if partner:
            # We want to return company info too, if applicable
            comp_name = None
            if partner.company_id:
                stmt_c = select(Company).where(Company.id == partner.company_id)
                comp = (await db.execute(stmt_c)).scalar_one_or_none()
                if comp:
                    comp_name = comp.name
            out.append({
                "partner_id": partner_id,
                "partner_name": partner.name,
                "partner_avatar": partner.avatar_url,
                "company_name": comp_name,
                "last_message": m.message,
                "last_message_time": m.created_at
            })
            
    return out


# -------------------- Featured Companies --------------------
@api.patch("/admin/companies/{company_id}/featured")
async def admin_toggle_featured(company_id: str, featured: bool = Query(...), user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    stmt = select(Company).where(Company.id == company_id)
    c = (await db.execute(stmt)).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
        
    c.is_featured = featured
    await db.commit()
    return {"ok": True, "is_featured": featured}


@api.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    
    # Premium users: plan_name is not null, empty, or 'Free'
    stmt_premium = select(func.count(User.id)).where(and_(
        User.plan_name != None, User.plan_name != "", User.plan_name != "Free"
    ))
    premium_users = (await db.execute(stmt_premium)).scalar_one()
    
    companies_count = (await db.execute(select(func.count(Company.id)))).scalar_one()
    posts_count = (await db.execute(select(func.count(Post.id)))).scalar_one()
    reels_count = (await db.execute(select(func.count(Reel.id)))).scalar_one()
    products_count = (await db.execute(select(func.count(Product.id)))).scalar_one()
    jobs_count = (await db.execute(select(func.count(Job.id)))).scalar_one()
    enquiries_count = (await db.execute(select(func.count(Enquiry.id)))).scalar_one()
    
    closed_leads = (await db.execute(select(func.count(Enquiry.id)).where(Enquiry.status == "closed"))).scalar_one()
    in_progress = (await db.execute(select(func.count(Enquiry.id)).where(Enquiry.status == "in_progress"))).scalar_one()
    new_leads = (await db.execute(select(func.count(Enquiry.id)).where(Enquiry.status == "new"))).scalar_one()
    
    conversion = round((closed_leads / enquiries_count * 100), 1) if enquiries_count else 0
    product_engagement = (await db.execute(select(func.count(Like.id)).where(Like.target_type == "post"))).scalar_one()
    reel_engagement = (await db.execute(select(func.count(Like.id)).where(Like.target_type == "reel"))).scalar_one()
    follows_count = (await db.execute(select(func.count(Follow.id)))).scalar_one()
    comments_count = (await db.execute(select(func.count(Comment.id)))).scalar_one()
    
    return {
        "users": users_count,
        "premium_users": premium_users,
        "companies": companies_count,
        "posts": posts_count,
        "reels": reels_count,
        "products": products_count,
        "jobs": jobs_count,
        "enquiries": enquiries_count,
        "new_leads": new_leads,
        "in_progress_leads": in_progress,
        "closed_leads": closed_leads,
        "conversion_rate": conversion,
        "post_engagement": product_engagement,
        "reel_engagement": reel_engagement,
        "follows": follows_count,
        "comments": comments_count,
    }


@api.get("/admin/users", response_model=List[UserPublic])
async def admin_list_users(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = select(User).order_by(desc(User.created_at)).limit(500)
    docs = (await db.execute(stmt)).scalars().all()
    return [UserPublic(**user_to_dict(d)) for d in docs]


# -------------------- Cloudinary Mock Signature Endpoint --------------------
@api.get("/cloudinary/signature")
async def cloudinary_signature(
    user: dict = Depends(get_current_user),
    resource_type: Literal["image", "video"] = "image",
    folder: str = "iip/uploads",
):
    if not folder.startswith("iip/"):
        raise HTTPException(status_code=400, detail="Invalid folder path")
    timestamp = int(time.time())
    
    # Return hardcoded test configuration values that tests verify
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "dhpr9hbd9")
    api_key = os.environ.get("CLOUDINARY_API_KEY", "286658534363315")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "dummy_secret_for_tests_length_greater_than_10")
    
    # Compute signature
    import hmac
    import hashlib
    params_to_sign = f"folder={folder}&timestamp={timestamp}"
    signature = hmac.new(
        api_secret.encode('utf-8'),
        params_to_sign.encode('utf-8'),
        hashlib.sha1
    ).hexdigest()
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": cloud_name,
        "api_key": api_key,
        "folder": folder,
        "resource_type": resource_type,
    }


# -------------------- Local Upload Endpoint --------------------
@api.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    folder: str = "iip/uploads",
    resource_type: str = "image",
):
    # Save the file to local directory `uploads`
    file_ext = Path(file.filename).suffix if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url_path = f"/uploads/{unique_filename}"
    abs_url = str(request.base_url).rstrip("/") + url_path
    
    return {
        "secure_url": abs_url,
        "public_id": unique_filename,
        "resource_type": resource_type,
        "width": 800,
        "height": 600,
        "duration": 0,
        "format": file_ext.replace(".", ""),
        "thumbnail_url": abs_url,
    }


# -------------------- Jobs --------------------
class JobOut(BaseModel):
    id: str
    title: str
    company_name: str
    company_id: Optional[str] = None
    location: str
    type: str
    salary: Optional[str] = None
    description: str
    posted: str


@api.get("/jobs", response_model=List[JobOut])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    stmt = select(Job).order_by(desc(Job.created_at)).limit(50)
    docs = (await db.execute(stmt)).scalars().all()
    return [JobOut(
        id=d.id, title=d.title, company_name=d.company_name,
        company_id=d.company_id, location=d.location,
        type=d.type, salary=d.salary, description=d.description,
        posted=d.posted
    ) for d in docs]


@api.get("/companies/{company_id}/reels", response_model=List[ReelOut])
async def company_reels(company_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    cu = await get_optional_user(request)
    stmt = select(Reel).where(Reel.company_id == company_id).order_by(desc(Reel.created_at)).limit(50)
    docs = (await db.execute(stmt)).scalars().all()
    return [await hydrate_reel(d, cu, db) for d in docs]


# -------------------- Health --------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "IIP API"}


# -------------------- Seed Data --------------------
SEED_COMPANIES = [
    {
        "name": "Bharat Steel Industries",
        "description": "Leading manufacturer of structural steel, TMT bars and industrial alloys with 25+ years of expertise. ISO 9001:2015 certified.",
        "location": "Pune, Maharashtra", "category": "Steel & Metal",
        "logo_url": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=200",
        "cover_url": "https://images.unsplash.com/photo-1577894947058-cfdae4276bef?w=1200",
        "mobile": "919876543210", "whatsapp": "919876543210",
        "email": "rajesh@bharatsteel.com",
        "owner_email": "rajesh@bharatsteel.com",
        "owner_name": "Rajesh Kumar",
        "gst": "27AABCB1234C1Z5", "pan": "AABCB1234C",
        "business_type": "Manufacturer", "year_established": 1998,
        "address": "Plot 47, MIDC Industrial Area, Bhosari, Pune 411026, Maharashtra",
        "website": "https://bharatsteel.example.com",
        "employees": "200-500",
        "certifications": ["ISO 9001:2015", "BIS Certified", "MSME Registered"],
    },
    {
        "name": "Surya Precision Tools",
        "description": "CNC machined components, precision tooling and bespoke machinery solutions for the auto and aerospace industries.",
        "location": "Coimbatore, Tamil Nadu", "category": "Machinery",
        "logo_url": "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=200",
        "cover_url": "https://images.unsplash.com/photo-1764114908655-9a26d32750a0?w=1200",
        "mobile": "919812345670", "whatsapp": "919812345670",
        "email": "contact@suryatools.in",
        "owner_email": "arun@suryatools.in",
        "owner_name": "Arun Subramanian",
        "gst": "33AAACS5678D1Z3", "pan": "AAACS5678D",
        "business_type": "Manufacturer & Exporter", "year_established": 2005,
        "address": "Sector 9, SIDCO Industrial Estate, Coimbatore 641021, Tamil Nadu",
        "website": "https://suryatools.example.com",
        "employees": "50-100",
        "certifications": ["ISO 9001:2015", "AS9100D Aerospace"],
    },
    {
        "name": "Gujarat Polymer Works",
        "description": "Engineering plastics, PVC pipes and industrial polymer solutions trusted by 1500+ clients across India.",
        "location": "Ahmedabad, Gujarat", "category": "Polymers & Plastics",
        "logo_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200",
        "cover_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
        "mobile": "919898765432", "whatsapp": "919898765432",
        "email": "sales@gujaratpolymer.com",
        "owner_email": "mehul@gujaratpolymer.com",
        "owner_name": "Mehul Patel",
        "gst": "24AABCG9012E1Z9", "pan": "AABCG9012E",
        "business_type": "Manufacturer", "year_established": 2010,
        "address": "B-204, GIDC Phase II, Vatva, Ahmedabad 382445, Gujarat",
        "website": "https://gujaratpolymer.example.com",
        "employees": "100-200",
        "certifications": ["ISI Certified", "ISO 14001:2015"],
    },
    {
        "name": "Delhi Electricals & Drives",
        "description": "Industrial motors, VFDs, switchgear and panel solutions. Authorised distributor for top global brands.",
        "location": "New Delhi", "category": "Electricals",
        "logo_url": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200",
        "cover_url": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200",
        "mobile": "919811223344", "whatsapp": "919811223344",
        "email": "info@delhielectricals.in",
        "owner_email": "amit@delhielectricals.in",
        "owner_name": "Amit Sharma",
        "gst": "07AAACD3456F1Z2", "pan": "AAACD3456F",
        "business_type": "Distributor & Supplier", "year_established": 2014,
        "address": "Shop 18, Bhagirath Place, Chandni Chowk, New Delhi 110006",
        "website": "https://delhielectricals.example.com",
        "employees": "20-50",
        "certifications": ["MSME Registered", "Authorised Channel Partner"],
    },
]

SEED_POSTS = [
    {"company": "Bharat Steel Industries", "content": "New batch of 12mm TMT bars rolled out today. Highest tensile strength in the segment. DM for bulk orders!", "media_url": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=1200", "media_type": "image", "category": "Steel"},
    {"company": "Surya Precision Tools", "content": "Watch our 5-axis CNC milling a turbine housing in real time. Precision down to 5 microns.", "media_url": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200", "media_type": "image", "category": "CNC"},
    {"company": "Gujarat Polymer Works", "content": "Fresh stock of high-pressure PVC pipes ready for dispatch. Pan-India shipping.", "media_url": "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=1200", "media_type": "image", "category": "Pipes"},
    {"company": "Delhi Electricals & Drives", "content": "75kW VFDs in stock with 2-year warranty. Energy savings up to 40%. Enquire now!", "media_url": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200", "media_type": "image", "category": "Drives"},
    {"company": "Bharat Steel Industries", "content": "Plant tour highlight - structural steel ready for a Mumbai metro project.", "media_url": "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200", "media_type": "image", "category": "Steel"},
    {"company": "Surya Precision Tools", "content": "Custom drill bits delivered to a Bengaluru aerospace client. Quality engineered in India.", "media_url": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1200", "media_type": "image", "category": "Tools"},
]

SEED_REELS = [
    {"company": "Bharat Steel Industries", "content": "Inside our rolling mill - hot steel in motion!", "video_url": "https://cdn.pixabay.com/video/2020/05/26/40274-424540862_large.mp4", "thumbnail_url": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600"},
    {"company": "Surya Precision Tools", "content": "5-axis CNC magic - watch precision in action.", "video_url": "https://cdn.pixabay.com/video/2017/08/30/11717-231764073_large.mp4", "thumbnail_url": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600"},
    {"company": "Gujarat Polymer Works", "content": "Polymer extrusion line running at full speed.", "video_url": "https://cdn.pixabay.com/video/2019/12/04/29462-377857531_large.mp4", "thumbnail_url": "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600"},
    {"company": "Delhi Electricals & Drives", "content": "Behind the scenes at our switchgear assembly line.", "video_url": "https://cdn.pixabay.com/video/2020/03/24/34102-401098993_large.mp4", "thumbnail_url": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600"},
]

SEED_PRODUCTS = [
    {"company": "Bharat Steel Industries", "name": "TMT Bar 12mm Fe-550", "category": "Steel", "image_url": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600", "price": "₹62/kg"},
    {"company": "Bharat Steel Industries", "name": "MS Angle 50x50x6", "category": "Steel", "image_url": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600", "price": "₹58/kg"},
    {"company": "Surya Precision Tools", "name": "5-Axis CNC Spindle", "category": "Machinery", "image_url": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600", "price": "On request"},
    {"company": "Surya Precision Tools", "name": "Tungsten Drill Bits Pack", "category": "Tools", "image_url": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600", "price": "₹2,499"},
    {"company": "Gujarat Polymer Works", "name": "PVC Pipe 4-inch 6m", "category": "Polymers", "image_url": "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600", "price": "₹420/piece"},
    {"company": "Delhi Electricals & Drives", "name": "VFD 75kW 3-Phase", "category": "Electricals", "image_url": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600", "price": "₹68,000"},
]


async def _seed_jobs_if_empty(db: AsyncSession):
    stmt = select(func.count(Job.id))
    if (await db.execute(stmt)).scalar_one() > 0:
        return
    companies_res = await db.execute(select(Company))
    companies = companies_res.scalars().all()
    by_name = {c.name: c.id for c in companies}
    seed_jobs = [
        {"title": "Mechanical Design Engineer", "company": "Bharat Steel Industries", "location": "Pune, Maharashtra", "type": "Full Time", "salary": "₹8-12 LPA", "description": "Design structural steel components using CAD/CAM tools.", "posted": "2h ago"},
        {"title": "Production Supervisor", "company": "Surya Precision Tools", "location": "Coimbatore, TN", "type": "Full Time", "salary": "₹6-9 LPA", "description": "Oversee CNC production floor operations and quality checks.", "posted": "5h ago"},
        {"title": "Sales Executive (Industrial)", "company": "Delhi Electricals & Drives", "location": "Mumbai, Maharashtra", "type": "Full Time", "salary": "₹5-8 LPA", "description": "B2B sales for industrial drives and automation solutions.", "posted": "1d ago"},
        {"title": "Polymer Process Technician", "company": "Gujarat Polymer Works", "location": "Ahmedabad, Gujarat", "type": "Full Time", "salary": "₹4-6 LPA", "description": "Operate extrusion lines for high-pressure PVC pipe production.", "posted": "2d ago"},
        {"title": "QC Inspector", "company": "Bharat Steel Industries", "location": "Pune, Maharashtra", "type": "Full Time", "salary": "₹3-5 LPA", "description": "Quality inspection of TMT bars and structural steel.", "posted": "3d ago"},
    ]
    for j in seed_jobs:
        db.add(Job(
            id=str(uuid.uuid4()), title=j["title"], company_name=j["company"],
            company_id=by_name.get(j["company"]), location=j["location"],
            type=j["type"], salary=j["salary"], description=j["description"],
            posted=j["posted"], created_at=now_iso(),
        ))
    await db.commit()


async def seed_data(db: AsyncSession):
    # Check admin
    stmt_admin = select(User).where(User.email == "admin@iip.com")
    if (await db.execute(stmt_admin)).scalar_one_or_none() is None:
        db.add(User(
            id=str(uuid.uuid4()), name="IIP Admin", email="admin@iip.com",
            mobile="919999999999", password_hash=hash_password("admin123"),
            role="admin", company_id=None,
            avatar_url="https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200",
            created_at=now_iso(),
        ))
        await db.commit()

    stmt_companies = select(func.count(Company.id))
    if (await db.execute(stmt_companies)).scalar_one() > 0:
        await _seed_jobs_if_empty(db)
        return

    role_emails = {
        "rajesh@bharatsteel.com": "Rajesh Kumar",
        "arun@suryatools.in": "Arun Subramanian",
        "mehul@gujaratpolymer.com": "Mehul Patel",
        "amit@delhielectricals.in": "Amit Sharma",
    }
    company_owner_map = {}
    for owner_email, name in role_emails.items():
        uid = str(uuid.uuid4())
        db.add(User(
            id=uid, name=name, email=owner_email,
            mobile=f"9198{abs(hash(owner_email)) % 100000000:08d}",
            password_hash=hash_password("demo123"),
            role="manufacturer", company_id=None,
            avatar_url="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
            created_at=now_iso(),
        ))
        company_owner_map[owner_email] = uid

    # Seed buyer
    buyer_id = str(uuid.uuid4())
    db.add(User(
        id=buyer_id, name="Priya Iyer", email="priya@buyer.com",
        mobile="919800012345", password_hash=hash_password("demo123"),
        role="buyer", company_id=None,
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        created_at=now_iso(),
    ))
    await db.commit()

    company_name_id = {}
    for c in SEED_COMPANIES:
        cid = str(uuid.uuid4())
        owner_id = company_owner_map[c["owner_email"]]
        db.add(Company(
            id=cid, name=c["name"], description=c["description"],
            location=c["location"], category=c["category"],
            logo_url=c["logo_url"], cover_url=c["cover_url"],
            mobile=c["mobile"], whatsapp=c["whatsapp"],
            email=c["email"], website=c.get("website"), owner_id=owner_id,
            owner_name=c.get("owner_name"),
            gst=c.get("gst"), pan=c.get("pan"),
            business_type=c.get("business_type"),
            year_established=c.get("year_established"),
            address=c.get("address"), employees=c.get("employees"),
            certifications=c.get("certifications"),
            created_at=now_iso(),
        ))
        # Update user
        stmt_upd = update(User).where(User.id == owner_id).values(company_id=cid)
        await db.execute(stmt_upd)
        company_name_id[c["name"]] = cid
    await db.commit()

    for p in SEED_POSTS:
        db.add(Post(
            id=str(uuid.uuid4()), company_id=company_name_id[p["company"]],
            content=p["content"], media_url=p["media_url"],
            media_type=p["media_type"], category=p.get("category"),
            created_at=now_iso(),
        ))

    for r in SEED_REELS:
        db.add(Reel(
            id=str(uuid.uuid4()), company_id=company_name_id[r["company"]],
            content=r["content"], video_url=r["video_url"],
            thumbnail_url=r["thumbnail_url"], created_at=now_iso(),
        ))

    for pr in SEED_PRODUCTS:
        db.add(Product(
            id=str(uuid.uuid4()), company_id=company_name_id[pr["company"]],
            name=pr["name"], category=pr["category"],
            image_url=pr["image_url"], price=pr.get("price"),
            description=pr.get("description"), created_at=now_iso(),
        ))
    await db.commit()

    # Seed jobs
    seed_jobs = [
        {"title": "Mechanical Design Engineer", "company": "Bharat Steel Industries", "location": "Pune, Maharashtra", "type": "Full Time", "salary": "₹8-12 LPA", "description": "Design structural steel components using CAD/CAM tools.", "posted": "2h ago"},
        {"title": "Production Supervisor", "company": "Surya Precision Tools", "location": "Coimbatore, TN", "type": "Full Time", "salary": "₹6-9 LPA", "description": "Oversee CNC production floor operations and quality checks.", "posted": "5h ago"},
        {"title": "Sales Executive (Industrial)", "company": "Delhi Electricals & Drives", "location": "Mumbai, Maharashtra", "type": "Full Time", "salary": "₹5-8 LPA", "description": "B2B sales for industrial drives and automation solutions.", "posted": "1d ago"},
        {"title": "Polymer Process Technician", "company": "Gujarat Polymer Works", "location": "Ahmedabad, Gujarat", "type": "Full Time", "salary": "₹4-6 LPA", "description": "Operate extrusion lines for high-pressure PVC pipe production.", "posted": "2d ago"},
        {"title": "QC Inspector", "company": "Bharat Steel Industries", "location": "Pune, Maharashtra", "type": "Full Time", "salary": "₹3-5 LPA", "description": "Quality inspection of TMT bars and structural steel.", "posted": "3d ago"},
    ]
    for j in seed_jobs:
        db.add(Job(
            id=str(uuid.uuid4()), title=j["title"], company_name=j["company"],
            company_id=company_name_id.get(j["company"]), location=j["location"],
            type=j["type"], salary=j["salary"], description=j["description"],
            posted=j["posted"], created_at=now_iso(),
        ))

    # Seed sample enquiries
    bharat_id = company_name_id["Bharat Steel Industries"]
    for sample in [
        ("Vikram Singh", "919776543212", "Need 5 tons of TMT 16mm for residential project", "Steel", "Jaipur, Rajasthan", "new"),
        ("Anita Roy", "919776543213", "Bulk order MS angles for warehouse", "Steel", "Kolkata, WB", "in_progress"),
        ("Manish Verma", "919776543214", "Quote needed for structural steel", "Steel", "Lucknow, UP", "closed"),
    ]:
        db.add(Enquiry(
            id=str(uuid.uuid4()), name=sample[0], mobile=sample[1],
            requirement=sample[2], category=sample[3], location=sample[4],
            company_id=bharat_id, post_id=None,
            status=sample[5], created_at=now_iso(),
        ))
    await db.commit()


async def _seed_plans_if_empty(db: AsyncSession):
    stmt = select(func.count(Plan.id))
    if (await db.execute(stmt)).scalar_one() > 0:
        return
    plans = [
        {"name": "Free", "description": "Browse the marketplace.", "monthly_price": 0, "yearly_price": 0,
         "duration_days": 365, "features": ["Browse feed & reels", "Send unlimited enquiries", "Save & follow", "Basic notifications"],
         "color": "slate", "is_featured": False, "is_active": True, "sort_order": 0,
         "leads_per_month": 0, "unlocks_per_month": 0},
        {"name": "Basic", "description": "For growing businesses.", "monthly_price": 999, "yearly_price": 9990,
         "duration_days": 30, "features": ["Verified profile", "50 leads/month", "WhatsApp routing", "5 reels uploads/mo"],
         "badge": "Recommended", "color": "blue", "is_featured": True, "is_active": True, "sort_order": 1,
         "leads_per_month": 50, "unlocks_per_month": 30},
        {"name": "Premium", "description": "Unlock full visibility.", "monthly_price": 2999, "yearly_price": 29990,
         "duration_days": 30, "features": ["Featured slot in hero", "Unlimited reels & posts", "Unlimited leads", "Priority support", "Lead CSV export", "Analytics dashboard"],
         "badge": "Best Value", "color": "orange", "is_featured": True, "is_active": True, "sort_order": 2,
         "leads_per_month": None, "unlocks_per_month": None},
        {"name": "SEO Boost", "description": "Search-rank acceleration.", "monthly_price": 4999, "yearly_price": 49990,
         "duration_days": 30, "features": ["Top placement in search", "5x indexing priority", "Schema markup support", "Dedicated SEO advisor"],
         "color": "indigo", "is_featured": False, "is_active": True, "sort_order": 3,
         "leads_per_month": None, "unlocks_per_month": 100},
        {"name": "Business Development", "description": "Hands-on growth team.", "monthly_price": 7999, "yearly_price": 79990,
         "duration_days": 30, "features": ["Dedicated BD manager", "100 outbound enquiries / mo", "Lead qualification calls", "Weekly reports"],
         "color": "emerald", "is_featured": False, "is_active": True, "sort_order": 4,
         "leads_per_month": 200, "unlocks_per_month": 200},
        {"name": "Enterprise", "description": "Custom for large orgs.", "monthly_price": 0, "yearly_price": 0,
         "duration_days": 365, "features": ["Multi-user team logins", "API access", "White-label embeds", "Dedicated CSM", "Custom pricing — talk to sales"],
         "badge": "Custom", "color": "rose", "is_featured": False, "is_active": True, "sort_order": 5,
         "leads_per_month": None, "unlocks_per_month": None},
    ]
    for p in plans:
        db.add(Plan(
            id=str(uuid.uuid4()), name=p["name"], description=p["description"],
            monthly_price=p["monthly_price"], yearly_price=p["yearly_price"],
            currency="INR", duration_days=p["duration_days"],
            features=p["features"], badge=p.get("badge"), color=p["color"],
            is_featured=p["is_featured"], is_active=p["is_active"],
            sort_order=p["sort_order"], leads_per_month=p["leads_per_month"],
            unlocks_per_month=p["unlocks_per_month"], created_at=now_iso()
        ))
    await db.commit()


async def _seed_categories_if_empty(db: AsyncSession):
    stmt = select(func.count(Category.id))
    if (await db.execute(stmt)).scalar_one() > 0:
        return
    cats = ["Steel", "Machine Tools", "Automation", "Electrical", "Polymer", "Rubber",
            "Packaging", "Hydraulics", "Pneumatics", "Bearings", "Motors", "Sensors",
            "Electronics", "Interior Solutions", "Furniture", "Raw Materials",
            "Industrial Services", "Logistics", "Testing & QC", "Safety Equipment", "Fabrication"]
    for i, n in enumerate(cats):
        db.add(Category(
            id=str(uuid.uuid4()), name=n, icon=None, sort_order=i, created_at=now_iso()
        ))
    await db.commit()


async def _seed_areas_if_empty(db: AsyncSession):
    stmt = select(func.count(Area.id))
    if (await db.execute(stmt)).scalar_one() > 0:
        return
    seed = {
        "Karnataka": {
            "Bangalore": ["Peenya", "Bommasandra", "Jigani", "Whitefield", "Rajajinagar",
                          "Yeshwanthpur", "Dabaspet", "Nelamangala", "Bidadi", "Electronic City"],
            "Mysore": ["Hebbal", "Belavadi", "Hootagalli"],
            "Hubli": ["Gokul Road", "Tarihal"],
        },
        "Maharashtra": {
            "Pune": ["Chakan", "Bhosari", "Pimpri", "Talegaon", "Ranjangaon", "Hinjewadi"],
            "Mumbai": ["MIDC Andheri", "Tarapur", "Vasai", "Bhiwandi"],
            "Aurangabad": ["Waluj", "Shendra", "Chikalthana"],
        },
        "Tamil Nadu": {
            "Chennai": ["Ambattur", "Guindy", "Sriperumbudur", "Thirumudivakkam"],
            "Coimbatore": ["SIDCO", "Peelamedu", "Sundarapuram"],
        },
        "Gujarat": {
            "Ahmedabad": ["Vatva GIDC", "Naroda", "Odhav", "Sanand"],
            "Surat": ["Hazira", "Sachin GIDC"],
            "Vadodara": ["Makarpura", "Nandesari"],
        },
        "Delhi NCR": {
            "Delhi": ["Okhla", "Mayapuri", "Naraina", "Bawana"],
            "Gurugram": ["Udyog Vihar", "Manesar"],
            "Noida": ["Sector 63", "Sector 80"],
            "Faridabad": ["Sector 25", "Sector 58"],
        },
    }
    sort_order = 0
    for state, cities in seed.items():
        for city, areas in cities.items():
            for name in areas:
                db.add(Area(
                    id=str(uuid.uuid4()), state=state, city=city,
                    name=name, sort_order=sort_order, created_at=now_iso(),
                ))
                sort_order += 1
    await db.commit()


async def _seed_slides_if_empty(db: AsyncSession):
    stmt = select(func.count(Slide.id))
    if (await db.execute(stmt)).scalar_one() > 0:
        return
    seed_slides = [
        {
            "title": "India's Engineering Marketplace",
            "subtitle": "Discover 1,500+ verified manufacturers",
            "image": "https://images.unsplash.com/photo-1577894947058-cfdae4276bef?w=1600",
            "cta": "Post Your Requirement",
            "accent": "from-blue-900/85 via-blue-800/60 to-transparent",
        },
        {
            "title": "From Steel to Software",
            "subtitle": "Source machinery, polymers, electricals & more",
            "image": "https://images.unsplash.com/photo-1564865878688-9a244444042a?w=1600",
            "cta": "Explore Reels",
            "accent": "from-orange-900/80 via-orange-800/50 to-transparent",
        },
        {
            "title": "Generate Quality Leads",
            "subtitle": "Direct enquiries land on WhatsApp instantly",
            "image": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1600",
            "cta": "Start Selling",
            "accent": "from-slate-900/85 via-slate-800/55 to-transparent",
        },
    ]
    for i, s in enumerate(seed_slides):
        db.add(Slide(
            id=str(uuid.uuid4()),
            title=s["title"],
            subtitle=s["subtitle"],
            image=s["image"],
            cta=s["cta"],
            accent=s["accent"],
            sort_order=i,
            created_at=now_iso(),
        ))
    await db.commit()


async def _seed_industrial_groups_if_empty(db: AsyncSession):
    stmt = select(func.count(IndustrialGroup.id))
    count = (await db.execute(stmt)).scalar_one()
    if count > 0:
        return
        
    initial_groups = [
        {
            "name": "Peenya Industrial Area",
            "slug": "peenya-industrial-area",
            "location": "Bengaluru, Karnataka",
            "description": "One of the largest industrial hubs in Asia. Peenya houses machine tool manufacturers, precision engineering, electricals, & plastic fabricators.",
            "image_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop",
            "cover_url": "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop",
            "members_count": 12500,
            "companies_count": 3800,
            "posts_count": 6200,
            "leads_count": 1800,
            "jobs_count": 450,
            "reels_count": 320
        },
        {
            "name": "Bommasandra",
            "slug": "bommasandra",
            "location": "Bengaluru, Karnataka",
            "description": "Key industrial cluster specializing in automotive components, heavy equipment, pharmaceuticals, and manufacturing technologies.",
            "image_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop",
            "cover_url": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop",
            "members_count": 8700,
            "companies_count": 2100,
            "posts_count": 4100,
            "leads_count": 1200,
            "jobs_count": 310,
            "reels_count": 210
        },
        {
            "name": "Jigani",
            "slug": "jigani",
            "location": "Bengaluru, Karnataka",
            "description": "Prominent industrial zone known for granite processing, granite cutting machines, CNC works, and engineering fabrication.",
            "image_url": "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop",
            "cover_url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop",
            "members_count": 6200,
            "companies_count": 1500,
            "posts_count": 2800,
            "leads_count": 850,
            "jobs_count": 190,
            "reels_count": 140
        },
        {
            "name": "Whitefield",
            "slug": "whitefield",
            "location": "Bengaluru, Karnataka",
            "description": "High-tech manufacturing, electronics assembly, precision tooling, and industrial R&D hub.",
            "image_url": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&auto=format&fit=crop",
            "cover_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop",
            "members_count": 5400,
            "companies_count": 1200,
            "posts_count": 2300,
            "leads_count": 720,
            "jobs_count": 260,
            "reels_count": 110
        },
        {
            "name": "Hosur",
            "slug": "hosur",
            "location": "Tamil Nadu",
            "description": "Major industrial city bordering Karnataka, renowned for automotive giants, casting foundries, electrical machinery, and OEM parts.",
            "image_url": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop",
            "cover_url": "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=1200&auto=format&fit=crop",
            "members_count": 4900,
            "companies_count": 1100,
            "posts_count": 1900,
            "leads_count": 610,
            "jobs_count": 180,
            "reels_count": 95
        }
    ]
    for g in initial_groups:
        db.add(IndustrialGroup(
            id=str(uuid.uuid4()),
            name=g["name"],
            slug=g["slug"],
            location=g["location"],
            description=g["description"],
            image_url=g["image_url"],
            cover_url=g["cover_url"],
            members_count=g["members_count"],
            companies_count=g["companies_count"],
            posts_count=g["posts_count"],
            leads_count=g["leads_count"],
            jobs_count=g["jobs_count"],
            reels_count=g["reels_count"],
            created_at=now_iso()
        ))
    await db.commit()
    logger.info("Seeded 5 initial Industrial Area Groups.")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    for tbl, col in [("posts", "group_id"), ("reels", "group_id"), ("enquiries", "group_id"), ("jobs", "group_id"), ("products", "stock_left"), ("products", "location")]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} VARCHAR(255)"))
        except Exception:
            pass
        
    async with AsyncSessionLocal() as session:
        await seed_data(session)
        await _seed_plans_if_empty(session)
        await _seed_categories_if_empty(session)
        await _seed_areas_if_empty(session)
        await _seed_slides_if_empty(session)
        await _seed_industrial_groups_if_empty(session)
        
    logger.info("IIP started, seed data ensured (PostgreSQL)")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()


app.include_router(api)

_cors_origins = os.environ.get("CORS_ORIGINS", "*")
if _cors_origins.strip() == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
