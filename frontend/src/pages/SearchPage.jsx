import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link } from "react-router-dom";
import { Search, MapPin, Verified } from "lucide-react";

export default function SearchPage() {
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/companies").then((r) => setCompanies(r.data)).catch(() => {});
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const fc = companies.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase())
  );
  const fp = products.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="pb-28 px-4 pt-4" data-testid="search-page">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, products, categories..."
          data-testid="search-input"
          className="w-full pl-9 pr-3 py-3 rounded-full bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <h2 className="mt-4 font-display font-semibold text-sm uppercase tracking-wider text-slate-600">Companies</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {fc.map((c) => (
          <Link key={c.id} to={`/company/${c.id}`} data-testid={`search-company-${c.id}`}
            className="bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-2">
              <img src={c.logo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
              <Verified size={14} className="text-blue-700" />
            </div>
            <div className="mt-2 font-semibold text-sm text-slate-900 line-clamp-1">{c.name}</div>
            <div className="text-[10px] text-slate-500 truncate"><MapPin size={10} className="inline" /> {c.location}</div>
            <div className="mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-800 font-semibold">{c.category}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-5 font-display font-semibold text-sm uppercase tracking-wider text-slate-600">Products</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {fp.map((p) => (
          <Link key={p.id} to={`/company/${p.company_id}`} data-testid={`search-product-${p.id}`}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors">
            <img src={p.image_url} alt="" className="w-full aspect-square object-cover" />
            <div className="p-2">
              <div className="font-semibold text-sm text-slate-900 line-clamp-1">{p.name}</div>
              <div className="text-[10px] text-slate-500">{p.company_name}</div>
              {p.price && <div className="font-display font-bold text-blue-800 text-sm">{p.price}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
