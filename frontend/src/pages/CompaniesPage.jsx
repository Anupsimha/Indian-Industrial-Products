import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link } from "react-router-dom";
import { MapPin, Verified } from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  useEffect(() => { api.get("/companies").then((r) => setCompanies(r.data)).catch(() => {}); }, []);

  return (
    <div className="pb-28 px-4 pt-4" data-testid="companies-page">
      <h1 className="font-display text-2xl font-bold text-slate-900">All Companies</h1>
      <div className="mt-4 space-y-3">
        {companies.map((c) => (
          <Link key={c.id} to={`/company/${c.id}`}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300"
            data-testid={`companies-list-${c.id}`}>
            <img src={c.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-display font-semibold text-slate-900 truncate">{c.name}</span>
                <Verified size={14} className="text-blue-700" />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} /> {c.location}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{c.followers_count} followers • {c.category}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
