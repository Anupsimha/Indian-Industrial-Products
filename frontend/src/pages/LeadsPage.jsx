import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { Phone, MapPin, Tag, Clock, MessageSquare, Play, Lock, Sparkles, Filter, ChevronDown, CheckCircle2,
  AlertTriangle, Mail, X, ShieldCheck, Loader2, CheckCircle } from "lucide-react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";


// ─── OTP Unlock Modal (same as RequirementsPage) ──────────────────────────────
function UnlockModal({ stats, enqId, initialToken, initialEmailHint, onClose, onSuccess }) {
  const [step, setStep] = useState(initialToken ? "otp" : "warning");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState(initialToken || "");
  const [emailHint, setEmailHint] = useState(initialEmailHint || "");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const usedCount = stats?.used_this_month ?? 0;
  const totalLimit = stats?.unlocks_per_month;
  const remaining = stats?.remaining;
  const isUnlimited = totalLimit == null;
  const quotaFull = !isUnlimited && remaining === 0;

  const handleRequestOtp = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/requirements/${enqId}/request-unlock`);
      if (data.already_unlocked) { onSuccess(enqId, { mobile: data.mobile, name: data.name }); return; }
      setToken(data.token); setEmailHint(data.email_hint); setStep("otp");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send OTP."); onClose();
    } finally { setSending(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) { setOtpError("Please enter the 6-digit OTP."); return; }
    setVerifying(true); setOtpError("");
    try {
      const { data } = await api.post(`/requirements/${enqId}/confirm-unlock`, { token, otp: otp.trim() });
      onSuccess(enqId, { mobile: data.mobile, name: data.name });
    } catch (e) { setOtpError(e.response?.data?.detail || "Incorrect OTP."); }
    finally { setVerifying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUp 0.25s ease" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === "warning" ? <AlertTriangle size={18} className="text-amber-400" /> : <Mail size={18} className="text-blue-300" />}
            <span className="text-white font-semibold text-sm">{step === "warning" ? "Confirm Unlock" : "Enter OTP"}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" disabled={sending || verifying}><X size={18} /></button>
        </div>

        {/* Warning step */}
        {step === "warning" && (
          <div className="p-5 space-y-4">
            {!isUnlimited && (
              <div className={`rounded-xl p-4 border ${quotaFull ? "bg-red-50 border-red-200" : usedCount > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className={quotaFull ? "text-red-500" : usedCount > 0 ? "text-amber-500" : "text-emerald-500"} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${quotaFull ? "text-red-600" : usedCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>Monthly Quota</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-black ${quotaFull ? "text-red-600" : "text-slate-800"}`}>{usedCount}</span>
                  <span className="text-slate-400 font-medium mb-1"> / {totalLimit} used</span>
                </div>
                <div className="mt-2 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${quotaFull ? "bg-red-500" : usedCount / totalLimit > 0.7 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (usedCount / totalLimit) * 100)}%` }} />
                </div>
                <p className={`text-xs mt-2 ${quotaFull ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {quotaFull ? "Monthly limit reached. Resets on the 1st." : `${remaining} unlock${remaining === 1 ? "" : "s"} remaining`}
                </p>
              </div>
            )}
            {!quotaFull && <p className="text-sm text-slate-600">An OTP will be sent to your registered email to confirm this unlock.</p>}
            <div className="flex gap-2">
              <button onClick={onClose} disabled={sending} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              {!quotaFull ? (
                <button onClick={handleRequestOtp} disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send OTP</>}
                </button>
              ) : (
                <Link to="/pricing" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold text-center">Upgrade Plan</Link>
              )}
            </div>
          </div>
        )}

        {/* OTP step */}
        {step === "otp" && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3"><Mail size={24} className="text-blue-600" /></div>
              <p className="text-sm text-slate-600">OTP sent to <strong>{emailHint}</strong>. Enter it below.</p>
            </div>
            <div>
              <input type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                placeholder="• • • • • •"
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl border-2 outline-none ${otpError ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-blue-500"}`}
                autoFocus onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()} />
              {otpError && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><X size={12} /> {otpError}</p>}
            </div>
            <p className="text-xs text-slate-400 text-center">⏱ OTP expires in 10 minutes</p>
            <div className="flex gap-2">
              <button onClick={() => { setStep("warning"); setOtp(""); setOtpError(""); }} disabled={verifying}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Back</button>
              <button onClick={handleVerifyOtp} disabled={verifying || otp.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {verifying ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : <><CheckCircle size={14} /> Verify &amp; Unlock</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("All");
  const [unlockedLeads, setUnlockedLeads] = useState({}); // leadId -> {mobile, name}

  // OTP modal state
  const [modalLeadId, setModalLeadId] = useState(null);
  const [pendingUnlock, setPendingUnlock] = useState(null); // {id, token, emailHint}
  const [unlockStats, setUnlockStats] = useState(null);

  // Dropdown filter states
  const [stateFilter, setStateFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Latest");

  useEffect(() => {
    if (!user) return;
    api.get("/enquiries").then((r) => setLeads(r.data)).catch(() => {});

    // Seed unlocked map from user's existing unlocked_enquiries
    if (user.unlocked_enquiries) {
      const init = {};
      user.unlocked_enquiries.forEach((id) => { init[id] = true; });
      setUnlockedLeads(init);
    }

    // Fetch quota stats if paid plan
    const hasPlan = user.plan_name && user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (hasPlan || user.role === "admin") {
      api.get("/requirements/unlock-stats").then((r) => setUnlockStats(r.data)).catch(() => {});
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
      const { data } = await api.post(`/requirements/${leadId}/request-unlock`);
      if (data.already_unlocked) {
        // Already unlocked — reveal directly without modal/email
        setUnlockedLeads((prev) => ({ ...prev, [leadId]: true }));
        setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, name: data.name, mobile: data.mobile } : l));
        toast.success("Contact revealed!");
        return;
      }
      // Fresh unlock — open OTP modal
      setPendingUnlock({ id: leadId, token: data.token, emailHint: data.email_hint });
      setModalLeadId(leadId);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to initiate unlock");
    }
  };

  const handleModalSuccess = (leadId, { mobile, name }) => {
    setModalLeadId(null);
    setPendingUnlock(null);
    setUnlockedLeads((prev) => ({ ...prev, [leadId]: true }));
    setLeads((arr) => arr.map((l) => l.id === leadId ? { ...l, name, mobile } : l));
    toast.success("Contact unlocked! 🎉");
    // Refresh quota
    api.get("/requirements/unlock-stats").then((r) => setUnlockStats(r.data)).catch(() => {});
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

  // Status / tab filter logic
  const filteredLeads = leads
    .filter((l) => {
      const matchState = stateFilter === "All" || l.state === stateFilter;
      const matchCity = cityFilter === "All" || l.city === cityFilter;
      const matchArea = areaFilter === "All" || l.industrial_area === areaFilter;
      const matchCat = categoryFilter === "All" || l.category === categoryFilter;
      let matchTab = true;
      if (activeTab === "high_value") matchTab = l.quantity?.toLowerCase().includes("ton") || l.id % 2 === 0;
      else if (activeTab === "trending") matchTab = l.id % 3 === 0;
      let matchStatus = true;
      if (statusFilter === "my_leads") matchStatus = !!unlockedLeads[l.id];
      else if (statusFilter !== "All") matchStatus = l.status === statusFilter;
      return matchState && matchCity && matchArea && matchCat && matchTab && matchStatus;
    })
    .sort((a, b) => sortFilter === "Latest" ? new Date(b.created_at) - new Date(a.created_at) : 0);

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
              const isUnlocked = !!unlockedLeads[lead.id];
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
              onClick={() => {
                toast.info("Opening subscription plans...");
                navigate("/pricing");
              }}
              className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all shadow-sm active:scale-95"
            >
              Upgrade Now
            </button>
          </div>
        </>
      )}

      {/* OTP Unlock Modal */}
      {modalLeadId && (
        <UnlockModal
          stats={unlockStats}
          enqId={modalLeadId}
          initialToken={pendingUnlock?.token}
          initialEmailHint={pendingUnlock?.emailHint}
          onClose={() => { setModalLeadId(null); setPendingUnlock(null); }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
