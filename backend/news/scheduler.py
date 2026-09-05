"""
Background Scheduler for News Aggregator
-----------------------------------------
Runs periodic RSS feed fetching guarded by ENABLE_NEWS_SCHEDULER environment configuration.
Uses AsyncIOScheduler for native integration with FastAPI asyncio event loop.
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .config import NEWS_FETCH_INTERVAL_MINUTES, ENABLE_NEWS_SCHEDULER
from .service import IndustrialNewsService

logger = logging.getLogger("iip.news.scheduler")

_scheduler = None


async def scheduled_job():
    logger.info("Starting scheduled RSS feed fetch job...")
    try:
        from server import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            def _sync_fetch(sync_session):
                return IndustrialNewsService.fetch_all_sources(sync_session)
            
            results = await session.run_sync(_sync_fetch)
            await session.commit()
            logger.info(f"News feed fetch completed successfully: {results}")
            return results
    except Exception as e:
        logger.error(f"Error running news fetch scheduled job: {e}", exc_info=True)
        return {}


def start_news_scheduler():
    global _scheduler

    if not ENABLE_NEWS_SCHEDULER:
        logger.info("News scheduler is disabled via ENABLE_NEWS_SCHEDULER env flag.")
        return None

    if _scheduler and _scheduler.running:
        logger.info("News scheduler is already running.")
        return _scheduler

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        scheduled_job,
        "interval",
        minutes=NEWS_FETCH_INTERVAL_MINUTES,
        id="news_rss_fetch_job",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"News AsyncIOScheduler started! Fetch interval set to {NEWS_FETCH_INTERVAL_MINUTES} minutes.")

    # Trigger one immediate fetch execution asynchronously at startup
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(scheduled_job())
        else:
            loop.run_until_complete(scheduled_job())
    except Exception as e:
        logger.error(f"Initial news fetch on startup failed: {e}")

    return _scheduler
