"""
SQLAlchemy Database Models for Industrial News Aggregator
---------------------------------------------------------
"""
import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Index, UniqueConstraint, Text
from sqlalchemy.orm import declarative_base

try:
    from server import Base
except ImportError:
    from sqlalchemy.orm import declarative_base
    Base = declarative_base()


class NewsItem(Base):
    __tablename__ = "news_items"

    id = Column(String(64), primary_key=True)               # SHA-256 hash of normalized title
    title = Column(String(512), nullable=False)
    snippet = Column(Text, nullable=True)
    url = Column(String(1024), nullable=False)
    image_url = Column(String(1024), nullable=True)
    source = Column(String(100), nullable=False, index=True)   # "Economic Times"
    category = Column(String(100), nullable=False, index=True) # "Steel & Metals"
    published_at = Column(DateTime, nullable=False, index=True)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
    dedup_hash = Column(String(64), nullable=False, index=True)
    view_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    moderated_by = Column(String(36), nullable=True)           # Admin user ID if hidden/restored
    moderated_at = Column(String(255), nullable=True)          # Timestamp of moderation action

    __table_args__ = (
        UniqueConstraint("dedup_hash", name="uq_news_items_dedup_hash"),
        Index("ix_news_category_published", "category", "published_at"),
    )


class FeedHealthLog(Base):
    __tablename__ = "feed_health_logs"

    source_key = Column(String(100), primary_key=True)
    display_name = Column(String(100), nullable=False)
    last_success_at = Column(String(255), nullable=True)
    last_error_at = Column(String(255), nullable=True)
    consecutive_failures = Column(Integer, default=0, nullable=False)
    item_count = Column(Integer, default=0, nullable=False)
    last_error_message = Column(Text, nullable=True)
