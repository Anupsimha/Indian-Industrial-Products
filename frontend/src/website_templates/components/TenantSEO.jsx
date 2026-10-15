import { useEffect } from "react";

/**
 * TenantSEO component.
 * Injects dynamic page title, meta description, canonical URL, OpenGraph tags,
 * and JSON-LD schema markup into document.head so Google and social bots
 * index and discover the tenant subdomain as an authentic standalone website.
 */
export default function TenantSEO({ seo = {}, company = {} }) {
  const companyName = company.name || "Industrial Manufacturer";
  const title = seo.title || `${companyName} | Industrial Manufacturer & Supplier | ${company.city || "India"}`;
  const description = seo.description || (company.description ? company.description.slice(0, 160) : `Official website of ${companyName}. Explore products, industrial capabilities, and request quotation.`);
  const canonicalUrl = seo.canonical_url || window.location.href.split("?")[0];
  const ogImage = seo.og_image || company.cover_url || company.logo_url;

  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // Helper to set or create meta tag
    const setMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content || "");
    };

    // 2. Standard Search Meta Tags
    setMeta("description", description);
    setMeta("keywords", `${company.category || "Manufacturing"}, ${company.city || "India"}, industrial equipment, supplier, manufacturer, RFQ`);
    setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large");

    // 3. OpenGraph / WhatsApp / LinkedIn Preview Tags
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("og:url", canonicalUrl, true);
    if (ogImage) {
      setMeta("og:image", ogImage, true);
    }

    // 4. Twitter Cards
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) {
      setMeta("twitter:image", ogImage);
    }

    // 5. Canonical Link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalUrl);

    // 6. Google Schema.org JSON-LD Structured Data
    const schemaData = seo.schema_json || {
      "@context": "https://schema.org",
      "@type": "Manufacturer",
      "name": companyName,
      "url": canonicalUrl,
      "logo": company.logo_url,
      "description": description,
      "telephone": company.mobile,
      "email": company.email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": company.address || company.location || "",
        "addressLocality": company.city || "Industrial Area",
        "addressRegion": company.state || "India",
        "postalCode": company.pincode || "",
        "addressCountry": "IN"
      }
    };

    let scriptEl = document.getElementById("tenant-json-ld-schema");
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "tenant-json-ld-schema";
      scriptEl.type = "application/ld+json";
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaData);

    return () => {
      // Clean up dynamic schema script on unmount
      const existingScript = document.getElementById("tenant-json-ld-schema");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [title, description, canonicalUrl, ogImage, company, seo]);

  return null;
}
