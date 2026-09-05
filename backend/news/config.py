"""
Industrial News Aggregator Configuration
------------------------------------------
Contains feed sources, sector keywords, brand colors, and legal compliance settings.
"""
import os

NEWS_FETCH_INTERVAL_MINUTES = int(os.environ.get("NEWS_FETCH_INTERVAL_MINUTES", "20"))
ENABLE_NEWS_SCHEDULER = os.environ.get("ENABLE_NEWS_SCHEDULER", "true").lower() in ("true", "1", "yes")

# Legal & Compliance Source Config
# Note: google_news_industrial is DISABLED by default due to Google News RSS commercial redistribution terms.
SOURCE_CONFIG = {
    "et_manufacturing": {
        "enabled": True,
        "display_name": "Economic Times",
        "url": "https://manufacturing.economictimes.indiatimes.com/rss/topstories",
        "max_snippet_chars": 220,
        "use_source_image": True,
    },
    "business_standard": {
        "enabled": True,
        "display_name": "Business Standard",
        "url": "https://www.business-standard.com/rss/industry-105.rss",
        "max_snippet_chars": 220,
        "use_source_image": True,
    },
    "livemint_industry": {
        "enabled": True,
        "display_name": "LiveMint",
        "url": "https://www.livemint.com/rss/industry",
        "max_snippet_chars": 220,
        "use_source_image": True,
    },
    "pib_commerce": {
        "enabled": True,
        "display_name": "PIB India",
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "max_snippet_chars": 300,
        "use_source_image": True,
    },
    "google_news_industrial": {
        "enabled": False,  # DISABLED by default pending legal clearance
        "display_name": "Google News Industrial",
        "url": "https://news.google.com/rss/search?q=manufacturing+india&hl=en-IN&gl=IN&ceid=IN:en",
        "max_snippet_chars": 200,
        "use_source_image": False,
    },
}

# Sector classification rules
CATEGORY_KEYWORDS = {
    "Steel & Metals": ["steel", "iron ore", "aluminium", "aluminum", "copper", "metal", "smelting", "sail", "tata steel", "jsw", "foundry", "forge"],
    "Machinery & Tools": ["machinery", "machine tool", "cnc", "manufacturing equipment", "capital goods", "automation", "hydraulic", "bearing", "robotics"],
    "Chemicals & Polymers": ["chemical", "petrochemical", "polymer", "plastics", "fertilizer", "specialty chemical", "resin", "solvent"],
    "Electricals & Electronics": ["electrical", "electronics", "semiconductor", "chip", "power equipment", "transformer", "switchgear", "cable", "solar"],
    "Logistics & B2B Trade": ["logistics", "supply chain", "freight", "export", "import", "trade deficit", "shipping", "warehousing", "customs", "container"],
    "Govt Policies": ["pli scheme", "gst", "policy", "ministry", "budget", "tariff", "subsidy", "notification", "make in india", "bis mark"],
}

# Publisher branding colors for fallback SVG card generation
PUBLISHER_COLORS = {
    "Economic Times": "#0F52BA",
    "LiveMint": "#E01E37",
    "Business Standard": "#1B4332",
    "PIB India": "#D4A017",
    "Google News Industrial": "#4285F4",
}
