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

    def _get_field(self, lead: Any, key: str) -> Any:
        if isinstance(lead, dict):
            return lead.get(key)
        return getattr(lead, key, None)

    def _extract_from_metadata_value(self, value: Any) -> Set[str]:
        """Recursively extract keywords from string/collection/dict values inside lead_metadata."""
        if value is None:
            return set()
        if isinstance(value, str):
            return self.extract_keywords(value)
        if isinstance(value, (list, tuple, set)):
            keywords: Set[str] = set()
            for item in value:
                keywords.update(self._extract_from_metadata_value(item))
            return keywords
        if isinstance(value, dict):
            keywords: Set[str] = set()
            for sub_val in value.values():
                keywords.update(self._extract_from_metadata_value(sub_val))
            return keywords
        return set()

    def build_profile(self, leads: List[Any]) -> LeadPreferenceProfile:
        """
        Build a LeadPreferenceProfile from a collection of lead entities or dictionaries.
        """
        profile = LeadPreferenceProfile()

        for lead in leads:
            lead_id = self._get_field(lead, "id")
            if lead_id:
                profile.lead_ids.append(str(lead_id))

            category = self._get_field(lead, "category")
            if category and isinstance(category, str) and category.strip():
                cat_clean = category.strip()
                profile.categories.add(cat_clean)
                # Also tokenize category into keywords (e.g. "CNC Machining" -> "cnc", "machining")
                profile.keywords.update(self.extract_keywords(cat_clean))

            product_name = self._get_field(lead, "product_name")
            if product_name and isinstance(product_name, str):
                profile.keywords.update(self.extract_keywords(product_name))

            req_text = self._get_field(lead, "requirement")
            if req_text and isinstance(req_text, str):
                profile.raw_requirements.append(req_text)
                profile.keywords.update(self.extract_keywords(req_text))

            lead_metadata = self._get_field(lead, "lead_metadata")
            if isinstance(lead_metadata, dict):
                for meta_val in lead_metadata.values():
                    profile.keywords.update(self._extract_from_metadata_value(meta_val))

            location = self._get_field(lead, "location")
            if location and isinstance(location, str) and location.strip():
                profile.locations.add(location.strip().lower())

            industrial_area = self._get_field(lead, "industrial_area")
            if industrial_area and isinstance(industrial_area, str) and industrial_area.strip():
                profile.industrial_areas.add(industrial_area.strip().lower())

        return profile
