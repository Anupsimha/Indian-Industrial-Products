import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, Building2, ExternalLink } from "lucide-react";
import api from "../lib/api";
import { getTemplate } from "../website_templates/registry";

export default function TenantWebsitePage() {
  const { subdomain: paramSubdomain } = useParams();
  const [searchParams] = useSearchParams();
  const querySubdomain = searchParams.get("subdomain");

  // Determine subdomain from hostname (e.g., precisionparts.indianindustrialplatform.com) or route/query
  const [targetSubdomain, setTargetSubdomain] = useState(() => {
    if (paramSubdomain) return paramSubdomain;
    if (querySubdomain) return querySubdomain;

    const hostname = window.location.hostname;
    // Check if domain is a subdomain of indianindustrialplatform.com or localhost
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "staging" && parts[0] !== "billing" && parts[0] !== "api") {
      return parts[0];
    }
    return null;
  });

  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = paramSubdomain || querySubdomain || targetSubdomain;
    if (!slug) {
      setError("No company website subdomain specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get(`/public/site/${slug}`)
      .then((res) => {
        setSiteData(res.data);
      })
      .catch((err) => {
        const detail = err.response?.data?.detail || "Company website not found or under maintenance.";
        setError(detail);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [paramSubdomain, querySubdomain, targetSubdomain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Loading company website...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white">Website Not Found</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
          {error || "The requested industrial company website could not be located on our platform."}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Go to Indian Industrial Platform
          </a>
        </div>
      </div>
    );
  }

  // Lookup chosen template component
  const templateId = siteData.website?.template_id || "industrial_modern";
  const templateConfig = getTemplate(templateId);
  const TemplateComponent = templateConfig.component;

  return (
    <TemplateComponent
      company={siteData.company}
      products={siteData.products || []}
      posts={siteData.posts || []}
      reels={siteData.reels || []}
      theme={siteData.website?.theme_config || {}}
      seo={siteData.seo || {}}
    />
  );
}
