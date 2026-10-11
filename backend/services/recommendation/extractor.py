"""
Feature extractor for turning selected leads into structured preference profiles.
"""
import re
from typing import List, Set, Any
from .models import LeadPreferenceProfile

# Industrial and general stop words that do not indicate specific product or category interests
STOP_WORDS: Set[str] = {
    "need", "needed", "needs", "urgent", "urgently", "looking", "look", "for",
    "require", "required", "requirement", "requirements", "want", "wanted",
    "supplier", "suppliers", "manufacturer", "manufacturers", "vendor", "vendors",
    "dealer", "dealers", "distributor", "distributors", "buyer", "buyers",
    "please", "call", "send", "details", "contact", "order", "orders", "quotation",
    "quote", "rate", "rates", "best", "good", "quality", "spec", "specs",
    "specification", "specifications", "price", "prices", "budget", "cost",
    "qty", "quantity", "nos", "pcs", "piece", "pieces", "ton", "tons", "kg",
    "meter", "meters", "immediate", "immediately", "delivery", "payment",
    "terms", "and", "the", "with", "from", "into", "onto", "that", "this",
    "these", "those", "have", "has", "had", "will", "would", "can", "could",
    "about", "above", "after", "again", "also", "any", "are", "been", "before",
    "being", "between", "both", "but", "down", "during", "each", "few", "more",
    "most", "other", "some", "such", "than", "too", "very", "what", "which",
    "who", "whom", "why", "how", "all", "our", "per", "via"
}


class LeadProfileExtractor:
    """
    OOP Extractor that converts raw Enquiry/Lead instances into a rich,
    searchable LeadPreferenceProfile.
    """

    def __init__(self, stop_words: Set[str] = None):
        self.stop_words = stop_words or STOP_WORDS

    def extract_keywords(self, text: str) -> Set[str]:
        """
        Tokenize and filter text to return high-signal domain keywords.
        """
        if not text or not isinstance(text, str):
            return set()

        tokens = re.findall(r"[a-zA-Z0-9_-]+", text.lower())
        meaningful_tokens = {
            t for t in tokens
            if len(t) >= 3 and not t.isdigit() and t not in self.stop_words
        }
        return meaningful_tokens

    def build_profile(self, leads: List[Any]) -> LeadPreferenceProfile:
        """
        Build a LeadPreferenceProfile from a collection of lead entities or dictionaries.
        """
        profile = LeadPreferenceProfile()

        for lead in leads:
            lead_id = getattr(lead, "id", None) or (lead.get("id") if isinstance(lead, dict) else None)
            if lead_id:
                profile.lead_ids.append(str(lead_id))

            category = getattr(lead, "category", None) or (lead.get("category") if isinstance(lead, dict) else None)
            if category and isinstance(category, str) and category.strip():
                cat_clean = category.strip()
                profile.categories.add(cat_clean)
                # Also tokenize category into keywords (e.g. "CNC Machining" -> "cnc", "machining")
                profile.keywords.update(self.extract_keywords(cat_clean))

            product_name = getattr(lead, "product_name", None) or (lead.get("product_name") if isinstance(lead, dict) else None)
            if product_name and isinstance(product_name, str):
                profile.keywords.update(self.extract_keywords(product_name))

            req_text = getattr(lead, "requirement", None) or (lead.get("requirement") if isinstance(lead, dict) else None)
            if req_text and isinstance(req_text, str):
                profile.raw_requirements.append(req_text)
                profile.keywords.update(self.extract_keywords(req_text))

            location = getattr(lead, "location", None) or (lead.get("location") if isinstance(lead, dict) else None)
            if location and isinstance(location, str) and location.strip():
                profile.locations.add(location.strip().lower())

            industrial_area = getattr(lead, "industrial_area", None) or (lead.get("industrial_area") if isinstance(lead, dict) else None)
            if industrial_area and isinstance(industrial_area, str) and industrial_area.strip():
                profile.industrial_areas.add(industrial_area.strip().lower())

        return profile
