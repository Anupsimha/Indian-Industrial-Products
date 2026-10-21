/**
 * Subdomain and Custom Domain Helper Utilities
 */

export const isTenantHost = (hostname) => {
  if (!hostname) return false;
  const host = hostname.toLowerCase().split(":")[0];
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "200.141.14.101" ||
    host === "indianindustrialplatform.com" ||
    host === "www.indianindustrialplatform.com" ||
    host === "staging.indianindustrialplatform.com" ||
    host === "billing.indianindustrialplatform.com"
  ) {
    return false;
  }
  // Subdomain of indianindustrialplatform.com (e.g. sai-sam-enterprises.indianindustrialplatform.com)
  if (host.endsWith(".indianindustrialplatform.com")) {
    const parts = host.split(".");
    return parts.length > 2 && !["www", "staging", "billing", "api"].includes(parts[0]);
  }
  // Any external custom domain (e.g. saisamenterprises.com or www.saisamenterprises.com)
  return true;
};

export const getTenantIdentifier = (hostname) => {
  if (!hostname || !isTenantHost(hostname)) return null;
  const host = hostname.toLowerCase().split(":")[0];
  if (host.endsWith(".indianindustrialplatform.com")) {
    const parts = host.split(".");
    if (parts.length > 2 && !["www", "staging", "billing", "api"].includes(parts[0])) {
      return parts[0];
    }
  }
  // If custom domain, remove www. prefix if present
  return host.startsWith("www.") ? host.slice(4) : host;
};
