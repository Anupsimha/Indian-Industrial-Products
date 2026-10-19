"""
Hostinger DNS Management Service.
Handles domain name validation, reserved subdomain protection, and Hostinger Developer API DNS A-record provisioning.
Supported by Wildcard DNS fallback for instant sub-second propagation.
"""

import os
import re
import logging
import asyncio
from typing import Tuple, Optional, List, Dict, Any
import requests

logger = logging.getLogger("hostinger_dns_service")

RESERVED_SUBDOMAINS = {
    "api", "www", "billing", "staging", "admin", "mail", "smtp", "ftp",
    "cname", "ns1", "ns2", "support", "help", "app", "dev", "test", "demo",
    "status", "auth", "login", "signup", "dashboard", "portal", "webhook",
    "webhooks", "cdn", "assets", "static", "docs", "blog", "iip",
    "indianindustrialplatform", "backend", "frontend", "postgres", "redis",
    "mongo", "database", "payment", "payments", "checkout", "orders",
    "root", "internal", "graphql", "ws", "socket"
}

SUBDOMAIN_REGEX = re.compile(r"^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$")


def sanitize_subdomain(name: str) -> str:
    """
    Sanitize input string into a lowercase valid subdomain slug.
    Example: 'Precision Parts & Tools Ltd.' -> 'precision-parts-tools-ltd'
    """
    if not name:
        return ""
    slug = name.strip().lower()
    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    # Collapse multiple consecutive hyphens
    slug = re.sub(r"-+", "-", slug)
    # Strip leading and trailing hyphens
    slug = slug.strip("-")
    # Truncate to maximum RFC 1035 label length (63 characters)
    return slug[:63]


def is_subdomain_reserved(name: str) -> bool:
    """Check if subdomain belongs to platform infrastructure or reserved names."""
    sanitized = sanitize_subdomain(name)
    return sanitized in RESERVED_SUBDOMAINS


def validate_subdomain(name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate subdomain rules:
    - Must be between 3 and 63 characters
    - Must only contain lowercase letters, numbers, and hyphens
    - Cannot start or end with a hyphen
    - Cannot be a reserved system name
    """
    if not name:
        return False, "Subdomain name is required."

    sanitized = sanitize_subdomain(name)

    if len(sanitized) < 3:
        return False, "Subdomain must be at least 3 characters long."

    if len(sanitized) > 63:
        return False, "Subdomain cannot exceed 63 characters."

    if not SUBDOMAIN_REGEX.match(sanitized):
        return False, "Subdomain must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."

    if sanitized in RESERVED_SUBDOMAINS:
        return False, f"'{sanitized}' is a reserved platform keyword and cannot be used."

    return True, None


class HostingerDNSService:
    """
    Client for Hostinger Developer API (https://developers.hostinger.com)
    Handles zone retrieval, A-record creation, and fallback for Wildcard DNS.
    """

    def __init__(
        self,
        api_token: Optional[str] = None,
        base_url: Optional[str] = None,
        zone_domain: Optional[str] = None,
        server_ip: Optional[str] = None,
    ):
        self.api_token = os.environ.get("HOSTINGER_API_TOKEN", "").strip() if api_token is None else api_token
        self.base_url = (base_url or os.environ.get("HOSTINGER_BASE_URL", "https://developers.hostinger.com")).rstrip("/")
        self.zone_domain = zone_domain or os.environ.get("HOSTINGER_ZONE_DOMAIN", "indianindustrialplatform.com").strip()
        self.server_ip = server_ip or os.environ.get("SERVER_PUBLIC_IP", "200.141.14.101").strip()

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def get_zone_records(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch active DNS records for domain from Hostinger API."""
        target_domain = domain or self.zone_domain
        if not self.api_token:
            logger.info("No HOSTINGER_API_TOKEN set; returning simulated zone records.")
            return []

        url = f"{self.base_url}/api/dns/v1/zones/{target_domain}"
        def _fetch():
            try:
                res = requests.get(url, headers=self.headers, timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list):
                        return data
                    if isinstance(data, dict):
                        return data.get("records", []) or data.get("zone", [])
                logger.warning(f"Hostinger API get_zone failed ({res.status_code}): {res.text}")
                return []
            except Exception as e:
                logger.error(f"Error fetching Hostinger DNS records for {target_domain}: {e}")
                return []

        return await asyncio.to_thread(_fetch)

    async def add_subdomain_a_record(
        self,
        subdomain: str,
        ip: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add or update an 'A' record for the subdomain pointing to the server public IP.
        If Hostinger API credentials are not provided or error occurs, gracefully succeeds
        with Wildcard DNS fallback so customer website creation is never blocked.
        """
        valid, err = validate_subdomain(subdomain)
        if not valid:
            raise ValueError(err)

        target_subdomain = sanitize_subdomain(subdomain)
        target_domain = domain or self.zone_domain
        target_ip = ip or self.server_ip
        full_domain = f"{target_subdomain}.{target_domain}"

        # If no API token is configured, log and utilize Wildcard DNS
        if not self.api_token:
            logger.info(
                f"Hostinger API token not configured. Subdomain '{full_domain}' will route via Wildcard DNS (*.{target_domain} -> {target_ip})."
            )
            return {
                "success": True,
                "mode": "wildcard_fallback",
                "subdomain": target_subdomain,
                "full_domain": full_domain,
                "ip": target_ip,
                "message": "Subdomain routed via Wildcard DNS."
            }

        url = f"{self.base_url}/api/dns/v1/zones/{target_domain}"
        def _sync_dns():
            try:
                # 1. Fetch current zone records
                res_zone = requests.get(url, headers=self.headers, timeout=10.0)
                current_records = []
                if res_zone.status_code == 200:
                    data = res_zone.json()
                    if isinstance(data, list):
                        current_records = data
                    elif isinstance(data, dict):
                        current_records = data.get("records", []) or data.get("zone", [])

                # 2. Check if identical A record already exists
                existing = False
                for r in current_records:
                    if r.get("name") == target_subdomain and r.get("type") == "A":
                        records_list = r.get("records", [])
                        if any(sub_r.get("content") == target_ip for sub_r in records_list):
                            existing = True
                            break

                if existing:
                    logger.info(f"Hostinger DNS record for '{full_domain}' -> {target_ip} already exists.")
                    return {
                        "success": True,
                        "mode": "api_existing",
                        "subdomain": target_subdomain,
                        "full_domain": full_domain,
                        "ip": target_ip,
                        "message": "Record already present in Hostinger DNS."
                    }

                # 3. Create or append record using Hostinger 'zone' array schema
                payload = {
                    "zone": [
                        {
                            "name": target_subdomain,
                            "type": "A",
                            "ttl": 300,
                            "records": [
                                {
                                    "content": target_ip,
                                    "is_disabled": False
                                }
                            ]
                        }
                    ]
                }

                res = requests.put(url, headers=self.headers, json=payload, timeout=12.0)
                if res.status_code in (200, 201, 204):
                    logger.info(f"Successfully registered Hostinger DNS record for '{full_domain}' -> {target_ip}")
                    return {
                        "success": True,
                        "mode": "api_synced",
                        "subdomain": target_subdomain,
                        "full_domain": full_domain,
                        "ip": target_ip,
                        "message": "A record successfully updated on Hostinger."
                    }
                else:
                    logger.warning(
                        f"Hostinger PUT DNS zone returned {res.status_code}: {res.text}. Utilizing Wildcard DNS fallback."
                    )
                    return {
                        "success": True,
                        "mode": "wildcard_fallback",
                        "subdomain": target_subdomain,
                        "full_domain": full_domain,
                        "ip": target_ip,
                        "warning": f"Hostinger API returned {res.status_code}, routed via Wildcard DNS."
                    }
            except Exception as ex:
                logger.error(f"Error provisioning Hostinger DNS record for {full_domain}: {ex}")
                # Do not fail customer onboarding; wildcard DNS guarantees traffic reaches server
                return {
                    "success": True,
                    "mode": "wildcard_fallback",
                    "subdomain": target_subdomain,
                    "full_domain": full_domain,
                    "ip": target_ip,
                    "warning": f"Hostinger API connection failed ({ex}), routed via Wildcard DNS."
                }

        return await asyncio.to_thread(_sync_dns)

    async def delete_subdomain_record(
        self,
        subdomain: str,
        record_type: str = "A",
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete a DNS record from Hostinger DNS zone using DELETE with filters.
        """
        target_subdomain = sanitize_subdomain(subdomain)
        target_domain = domain or self.zone_domain

        if not self.api_token:
            return {"success": True, "message": "Simulated delete (no API token)"}

        url = f"{self.base_url}/api/dns/v1/zones/{target_domain}"
        payload = {
            "filters": [
                {
                    "name": target_subdomain,
                    "type": record_type
                }
            ]
        }

        def _delete():
            try:
                res = requests.delete(url, headers=self.headers, json=payload, timeout=12.0)
                if res.status_code in (200, 204):
                    logger.info(f"Successfully deleted Hostinger DNS record '{target_subdomain}' ({record_type})")
                    return {"success": True, "message": "Record deleted from Hostinger DNS."}
                else:
                    logger.warning(f"Hostinger DELETE returned {res.status_code}: {res.text}")
                    return {"success": False, "status_code": res.status_code, "detail": res.text}
            except Exception as e:
                logger.error(f"Error deleting Hostinger DNS record for {target_subdomain}: {e}")
                return {"success": False, "error": str(e)}

        return await asyncio.to_thread(_delete)


# Shared singleton instance
hostinger_dns_service = HostingerDNSService()
