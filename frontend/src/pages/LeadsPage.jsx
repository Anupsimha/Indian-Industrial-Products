import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { Phone, MapPin, Tag, Clock, MessageSquare, Play, Lock, Sparkles, Filter, ChevronDown, CheckCircle2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";

export default function LeadsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState("recent"); // 'recent' | 'trending' | 'high_value'
  const [statusFilter, setStatusFilter] = useState("All"); // 'All' | 'new' | 'in_progress' | 'closed' | 'my_leads'
  const [unlockedLeads, setUnlockedLeads] = useState({}); // leadId -> boolean

  // Dropdown filter states
  const [stateFilter, setStateFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Latest");

  useEffect(() => {
    if (!user) return;
    api.get("/enquiries").then((r) => setLeads(r.data)).catch(() => {});
    
    if (user.unlocked_enquiries) {
      const initialUnlocked = {};
      user.unlocked_enquiries.forEach((id) => {
        initialUnlocked[id] = true;
      });
      setUnlockedLeads(initialUnlocked);
    }
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400 font-semibold" data-testid="leads-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isBusiness = user.role === "manufacturer" || user.role === "supplier" || user.role === "admin";

  const hasPaidPlan = user && user.plan_name && user.plan_name.toLowerCase() !== "free" && (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  const handleUnlockContact = async (leadId) => {
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }
    try {
      await api.post(`/requirements/${leadId}/unlock`);
      setUnlockedLeads((prev) => ({ ...prev, [leadId]: true }));
      toast.success("Contact Details Unlocked Successfully!", {
        description: "Premium access granted for this lead.",
        icon: <Sparkles className="text-orange-500" size={16} />
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to unlock contact");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/enquiries/${id}/status?new_status=${status}`);
      setLeads((arr) => arr.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success(`Lead status updated to ${status.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Categories and Location lists for filtering
  const categoriesList = ["All", ...Array.from(new Set(leads.map((l) => l.category).filter(Boolean)))];
  const statesList = ["All", ...Array.from(new Set(leads.map((l) => l.state).filter(Boolean)))];
  const citiesList = ["All", ...Array.from(new Set(leads.map((l) => l.city).filter(Boolean)))];
  const areasList = ["All", ...Array.from(new Set(leads.map((l) => l.industrial_area).filter(Boolean)))];

  // Filtering & Sorting logic
  const filteredLeads = leads
    .filter((l) => {
      const matchState = stateFilter === "All" || l.state === stateFilter;
      const matchCity = cityFilter === "All" || l.city === cityFilter;
      const matchArea = areaFilter === "All" || l.industrial_area === areaFilter;
      const matchCat = categoryFilter === "All" || l.category === categoryFilter;
      
      // Tab filter
      let matchTab = true;
      if (activeTab === "high_value") {
        matchTab = l.quantity?.toLowerCase().includes("ton") || l.id % 2 === 0;
      } else if (activeTab === "trending") {
        matchTab = l.id % 3 === 0;
      }
      
      // Status filter
      let matchStatus = true;
      if (statusFilter === "my_leads") {
        matchStatus = unlockedLeads[l.id] === true;
      } else if (statusFilter !== "All") {
        matchStatus = l.status === statusFilter;
      }
      
      return matchState && matchCity && matchArea && matchCat && matchTab && matchStatus;
    })
    .sort((a, b) => {
      if (sortFilter === "Latest") {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

  return (
    <div className="pb-28 px-4 pt-4" data-testid="leads-page">
      <BackButton className="mb-2" />

      {/* 1. Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 leading-tight">Live Buyer Feed</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time requirements from verified buyers</p>
        </div>
        <button
          onClick={() => toast.success("Learn how buyer feed matching works!")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-blue-900 text-blue-900 font-extrabold text-[10px] uppercase hover:bg-blue-50 transition-colors"
        >
          <Play size={10} className="fill-blue-900" /> How it works
        </button>
      </div>

      {!isBusiness ? (
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500" data-testid="leads-empty-state">
          You are signed in as a Buyer. Switch to a Manufacturer or Supplier account to receive leads.
        </div>
      ) : (
        <>
          {/* 2. Filter Dropdowns Bar (Two Rows) */}
          <div className="mt-4 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-2.5 text-[10px] sm:text-xs">
            {/* Row 1: State, City, Area (3 Columns) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">State</label>
                <div className="relative">
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-bold text-slate-700 appearance-none focus:outline-none"
                  >
                    {statesList.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">City</label>
                <div className="relative">
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-bold text-slate-700 appearance-none focus:outline-none"
                  >
                    {citiesList.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Area</label>
                <div className="relative">
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-bold text-slate-700 appearance-none focus:outline-none"
                  >
                    {areasList.map((ar) => <option key={ar} value={ar}>{ar}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Category, Sort (2 Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg font-bold text-slate-700 appearance-none focus:outline-none text-ellipsis"
                  >
                    {categoriesList.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sort</label>
                <div className="relative">
                  <select
                    value={sortFilter}
                    onChange={(e) => setSortFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg font-bold text-slate-700 appearance-none focus:outline-none"
                  >
                    <option value="Latest">Latest</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Live Tabs Segmented Control */}
          <div className="mt-4 flex bg-white border border-slate-100 p-1 rounded-full text-xs font-bold shadow-sm">
            {["recent", "trending", "high_value"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-center rounded-full transition-all ${
                  activeTab === tab
                    ? "bg-blue-900 text-white shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "recent" && "Recent"}
                {tab === "trending" && "Trending"}
                {tab === "high_value" && "High Value"}
              </button>
            ))}
          </div>

          {/* Status Filter Capsules */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200" data-testid="leads-status-tabs">
            {[
              { id: "All", label: "All" },
              { id: "new", label: "New" },
              { id: "in_progress", label: "In Progress" },
              { id: "closed", label: "Closed" },
              { id: "my_leads", label: "My Leads" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
                data-testid={`lead-status-tab-${tab.id.toLowerCase().replace("_", "-")}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 4. Leads List */}
          <div className="mt-4 space-y-3">
            {filteredLeads.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
                No active buyer requirements matching your filters.
              </div>
            )}

            {filteredLeads.map((lead) => {
              const isUnlocked = unlockedLeads[lead.id];
              // Generate clean tags
              const badgeType = lead.id % 2 === 0 ? "New" : "High Value";
              const hotType = lead.id % 2 === 0 ? "HOT" : "PREMIUM";

              return (
                <article
                  key={lead.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 relative overflow-hidden"
                  data-testid={`lead-card-${lead.id}`}
                >
                  {/* Tags Row */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                      badgeType === "New" ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"
                    }`}>
                      {badgeType}
                    </span>
                    <span className={`text-[10px] font-black tracking-wider ${
                      hotType === "HOT" ? "text-orange-600" : "text-purple-600"
                    }`}>
                      {hotType}
                    </span>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                      {lead.product_name || lead.requirement?.split(" ").slice(0, 3).join(" ") || "Mild Steel Plates"}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {lead.category || "Steel & Metal"}
                    </div>
                  </div>

                  {/* Quantity, Location & Date Grid */}
                  <div className="mt-3.5 space-y-2 border-b border-slate-50 pb-3.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-5 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Qty</span>
                      <span className="font-bold text-slate-900">{lead.quantity || "2 Tons"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{lead.location || "Bengaluru, Karnataka"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Requirement Details */}
                  <p className="mt-3.5 text-xs text-slate-600 leading-relaxed">
                    {lead.requirement}
                  </p>

                  {/* Bottom Panel (Lock / Contact Details) */}
                  <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[10px] font-bold text-slate-400">
                      Buyer ID: <span className="font-mono text-slate-700">B-78{100 + lead.id}</span>
                    </div>

                    {!isUnlocked ? (
                      <button
                        onClick={() => handleUnlockContact(lead.id)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <Lock size={12} /> Unlock Contact
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold text-slate-800">{lead.name}</span>
                            <span className="text-slate-500 font-semibold ml-2">{lead.mobile}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${lead.mobile}`}
                            className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                          >
                            <Phone size={12} /> Call
                          </a>
                          <a
                            href={whatsappLink(lead.mobile, `Hi ${lead.name}, regarding your requirement for ${lead.product_name}`)}
                            target="_blank" rel="noreferrer"
                            className="flex-1 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 hover:bg-[#20bd5a] transition-colors"
                          >
                            <MessageSquare size={12} /> WhatsApp
                          </a>
                          {lead.status !== "in_progress" && (
                            <button
                              onClick={() => updateStatus(lead.id, "in_progress")}
                              className="px-2.5 py-1.5 bg-orange-50 text-orange-800 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-colors"
                            >
                              In Progress
                            </button>
                          )}
                          {lead.status !== "closed" && (
                            <button
                              onClick={() => updateStatus(lead.id, "closed")}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* 5. Bottom Upgrade Banner */}
          <div className="mt-6 bg-gradient-to-r from-blue-950 to-blue-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-sm">Unlock Unlimited Leads</h4>
              <p className="text-[10px] text-white/70 mt-0.5">Upgrade to premium and unlock all buyer contact details instantly.</p>
            </div>
            <button
              onClick={() => toast.success("Redirecting to subscription plans...")}
              className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all shadow-sm active:scale-95"
            >
              Upgrade Now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
