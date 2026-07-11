import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Lock, MapPin, Tag, Clock, Phone, TrendingUp, Sparkles, Package, Boxes } from "lucide-react";
import { whatsappLink } from "../lib/api";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";

export default function RequirementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ category: "", sort: "recent" });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const [categories, setCategories] = useState([]);

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const load = async () => {
    const params = new URLSearchParams();
    if (filter.category) params.set("category", filter.category);
    if (loc.state) params.set("state", loc.state);
    if (loc.city) params.set("city", loc.city);
    if (loc.industrial_area) params.set("industrial_area", loc.industrial_area);
    params.set("sort", filter.sort);
    const { data } = await api.get(`/requirements?${params}`);
    setItems(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, loc]);

  const unlock = async (id) => {
    if (!user) { navigate("/login"); return; }
    const hasPaidPlan = user && user.plan_name && user.plan_name.toLowerCase() !== "free" && (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }
    try {
      const { data } = await api.post(`/requirements/${id}/unlock`);
      setItems((arr) => arr.map((it) => it.id === id ? { ...it, is_unlocked: true, mobile: data.mobile, name: data.name } : it));
      toast.success("Contact unlocked!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upgrade plan to unlock");
    }
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="requirements-page">
      <BackButton className="mb-2" />
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Live Buyer Feed</div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Requirements</h1>
        <p className="text-xs text-slate-500">Verified buyer enquiries — unlock to reveal contact details.</p>
      </div>

      <div className="mt-3 space-y-2">
        <LocationPicker value={loc} onChange={setLoc} testid="req-loc" />
        <select
          value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          data-testid="req-filter-category"
          className="w-full rounded-full bg-white border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <div className="flex gap-2">
          <button onClick={() => setFilter({ ...filter, sort: "recent" })} data-testid="req-sort-recent"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${filter.sort === "recent" ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
            <Clock size={12} /> Recent
          </button>
          <button onClick={() => setFilter({ ...filter, sort: "trending" })} data-testid="req-sort-trending"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${filter.sort === "trending" ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
            <TrendingUp size={12} /> Trending
          </button>
          {(filter.category || loc.state) && (
            <button onClick={() => { setFilter({ category: "", sort: "recent" }); setLoc({ state: "", city: "", industrial_area: "" }); }}
              data-testid="req-filter-clear" className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500" data-testid="req-empty">
            No requirements match your filters.
          </div>
        )}
        {items.map((it) => (
          <article key={it.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all" data-testid={`req-card-${it.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display font-semibold text-base text-slate-900 line-clamp-2">
                  {it.product_name || it.requirement.slice(0, 60)}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 mt-1 inline-flex items-center gap-2">
                  <Tag size={11} /> {it.category}
                </div>
              </div>
              {it.is_unlocked ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700">Unlocked</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-50 text-amber-700">Locked</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
              {it.quantity && <span className="inline-flex items-center gap-1"><Boxes size={12} /> Qty: {it.quantity}</span>}
              {it.industrial_area && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {it.industrial_area}, {it.city || it.location}
                </span>
              )}
              {!it.industrial_area && (
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {it.location}</span>
              )}
              <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(it.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700 line-clamp-3">{it.requirement}</p>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="font-semibold text-slate-900">{it.name}</div>
                <div className={`text-slate-500 inline-flex items-center gap-1 ${it.is_unlocked ? "" : "blur-[3px] select-none"}`}>
                  <Phone size={11} /> {it.mobile}
                </div>
              </div>
              {it.is_unlocked ? (
                <a href={whatsappLink(it.mobile, `Hi ${it.name}, regarding your enquiry: ${it.requirement.slice(0,60)}`)} target="_blank" rel="noreferrer"
                  data-testid={`req-wa-${it.id}`}
                  className="px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#128C7E]">
                  WhatsApp
                </a>
              ) : (
                <button onClick={() => unlock(it.id)} data-testid={`req-unlock-${it.id}`}
                  className="px-3 py-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-orange-700 active:scale-95 transition-all">
                  <Lock size={12} /> Unlock Contact
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 bg-gradient-to-br from-blue-800 to-blue-700 text-white rounded-2xl p-5 shadow-md" data-testid="req-upsell">
        <div className="flex items-center gap-2 text-orange-200 text-[10px] font-bold uppercase tracking-[0.25em]">
          <Sparkles size={14} /> Premium Lead Access
        </div>
        <h3 className="font-display text-lg font-bold mt-1">Unlock unlimited buyer contacts</h3>
        <p className="text-white/80 text-xs mt-1">Upgrade to Basic or Premium and respond to leads in real time on WhatsApp.</p>
        <Link to="/pricing" className="mt-3 inline-block px-4 py-2 rounded-full bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700" data-testid="req-upgrade-link">
          See plans
        </Link>
      </div>
    </div>
  );
}
