import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link } from "react-router-dom";
import { MapPin, Verified } from "lucide-react";

const PROVIDER_FILTERS = [
  { id: "all", label: "All Companies" },
  { id: "product", label: "Product Providers" },
  { id: "service", label: "Service Providers" },
  { id: "both", label: "Both" },
];

const PROVIDER_BADGES = {
  product: { label: "Products", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  service: { label: "Services", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  both: { label: "Products & Services", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [providerFilter, setProviderFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = providerFilter !== "all" ? { provider_type: providerFilter } : undefined;
    api
      .get("/companies", { params })
      .then((r) => {
        if (active) setCompanies(r.data || []);
      })
      .catch(() => {
        if (active) setCompanies([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [providerFilter]);

  return (
    <div className="pb-28 px-4 pt-4" data-testid="companies-page">
      <h1 className="font-display text-2xl font-bold text-slate-900">All Companies</h1>

      <div className="mt-3 flex flex-wrap gap-2" data-testid="companies-provider-filters">
        {PROVIDER_FILTERS.map((f) => {
          const active = providerFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setProviderFilter(f.id)}
              data-testid={`companies-filter-${f.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "bg-blue-800 text-white border-blue-800"
                  : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {!loading && companies.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
            No companies found for this filter.
          </div>
        )}
        {companies.map((c) => {
          const badge = PROVIDER_BADGES[c.provider_type] || PROVIDER_BADGES.product;
          return (
            <Link key={c.id} to={`/company/${c.id}`}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300"
              data-testid={`companies-list-${c.id}`}>
              <img src={c.logo_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-display font-semibold text-slate-900 truncate">{c.name}</span>
                    <Verified size={14} className="text-blue-700 shrink-0" />
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}
                    data-testid={`company-provider-badge-${c.id}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} /> {c.location}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{c.followers_count} followers • {c.category}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
