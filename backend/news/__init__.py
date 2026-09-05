"""
Backend News Aggregator Package
-------------------------------
Exports news_router and start_news_scheduler.
"""
from .routes import news_router
from .scheduler import start_news_scheduler

__all__ = ["news_router", "start_news_scheduler"]
