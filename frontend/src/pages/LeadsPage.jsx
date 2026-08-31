import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import {
  Phone, MapPin, Tag, Clock, MessageSquare, Play, Lock, Sparkles, X,
  ShieldCheck, Loader2, CheckCircle, Mail, AlertTriangle, Search, ChevronDown, CheckCircle2, Image, Zap
} from "lucide-react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";

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
      if (data.already_unlocked) {
        onSuccess(enqId, { mobile: data.mobile, name: data.name });
        return;
      }
      setToken(data.token);
      setEmailHint(data.email_hint);
      setStep("otp");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send OTP.");
      onClose();
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      const { data } = await api.post(`/requirements/${enqId}/confirm-unlock`, {
        token,
        otp: otp.trim(),
      });
      onSuccess(enqId, { mobile: data.mobile, name: data.name });
    } catch (e) {
      setOtpError(e.response?.data?.detail || "Incorrect OTP.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ animation: "slideUp 0.25s ease" }}
      >
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === "warning" ? (
              <AlertTriangle size={18} className="text-amber-400" />
            ) : (
              <Mail size={18} className="text-blue-300" />
            )}
            <span className="text-white font-semibold text-sm">
              {step === "warning" ? "Confirm Unlock" : "Enter OTP"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white"
            disabled={sending || verifying}
          >
            <X size={18} />
          </button>
        </div>

        {step === "warning" && (
          <div className="p-5 space-y-4">
            {!isUnlimited && (
              <div className={`rounded-xl p-4 border ${
                quotaFull
                  ? "bg-red-50 border-red-200"
                  : usedCount > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className={quotaFull ? "text-red-500" : usedCount > 0 ? "text-amber-500" : "text-emerald-500"} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${quotaFull ? "text-red-600" : usedCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    Monthly Quota
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-black ${quotaFull ? "text-red-600" : "text-slate-800"}`}>{usedCount}</span>
                  <span className="text-slate-400 font-medium mb-1"> / {totalLimit} used</span>
                </div>
                <div className="mt-2 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${quotaFull ? "bg-red-500" : usedCount / totalLimit > 0.7 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (usedCount / totalLimit) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-2 ${quotaFull ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {quotaFull ? "Monthly limit reached. Resets on the 1st." : `${remaining} unlock${remaining === 1 ? "" : "s"} remaining`}
                </p>
              </div>
            )}
            {isUnlimited && (
              <div className="rounded-xl p-4 border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Admin — Unlimited Unlocks</span>
                </div>
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

        {step === "otp" && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <Mail size={24} className="text-blue-600" />
              </div>
              <p className="text-sm text-slate-600">OTP sent to <strong>{emailHint}</strong>. Enter it below.</p>
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                placeholder="• • • • • •"
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl border-2 outline-none ${otpError ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 focus:border-blue-500"}`}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
              {otpError && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><X size={12} /> {otpError}</p>}
            </div>
            <p className="text-xs text-slate-400 text-center">⏱ OTP expires in 10 minutes</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setStep("warning"); setOtp(""); setOtpError(""); }}
                disabled={verifying}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={verifying || otp.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
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

// ─── Media thumbnail strip (always visible, not gated) ────────────────────────
function LeadMediaStrip({ urls }) {
  const [lightbox, setLightbox] = useState(null);
  if (!urls || urls.length === 0) return null;

  const BASE = import.meta.env.VITE_API_BASE || "";
  const toSrc = (u) => (u.startsWith("http") ? u : `${BASE}${u}`);

  const isPdf = (u) => u.toLowerCase().endsWith(".pdf");
  const visible = urls.slice(0, 3);
  const extra = urls.length - visible.length;

  return (
    <>
      <div className="mt-3 flex gap-2 flex-wrap">
        {visible.map((url, i) => (
          isPdf(url) ? (
            <a
              key={i}
              href={toSrc(url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Image size={13} className="text-red-500" />
              PDF
            </a>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(toSrc(url))}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0"
            >
              <img
                src={toSrc(url)}
                alt={`Attachment ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 2 && extra > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-black">+{extra}</span>
                </div>
              )}
            </button>
          )
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>
          <img
            src={lightbox}
            alt="Attachment"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filter, setFilter] = useState({ category: "", sort: "recent" });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // OTP State
  const [modalLeadId, setModalLeadId] = useState(null);
  const [pendingUnlock, setPendingUnlock] = useState(null); // {id, token, emailHint}
  const [unlockStats, setUnlockStats] = useState(null);

  // ── Fetch categories ──
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  // ── Fetch requirements / leads ──
  const loadLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (loc.state) params.set("state", loc.state);
      if (loc.city) params.set("city", loc.city);
      if (loc.industrial_area) params.set("industrial_area", loc.industrial_area);
      params.set("sort", filter.sort);
      
      const { data } = await api.get(`/requirements?${params}`);
      setLeads(data);
    } catch (err) {
      console.error("Error loading leads:", err);
      toast.error("Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [filter, loc, user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ── Fetch unlock stats ──
  const fetchStats = useCallback(async () => {
    if (!user) return;
    const hasPlan = user.plan_name && user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (hasPlan || user.role === "admin") {
      try {
        const { data } = await api.get("/requirements/unlock-stats");
        setUnlockStats(data);
      } catch (err) {}
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (authLoading) return <div className="p-10 text-center text-slate-400 font-semibold" data-testid="leads-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isBusiness = user.role === "manufacturer" || user.role === "supplier" || user.role === "admin";
  const hasPaidPlan = user.plan_name && user.plan_name.toLowerCase() !== "free" &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  const handleUnlockClick = async (leadId) => {
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }
    try {
      const { data } = await api.post(`/requirements/${leadId}/request-unlock`);
      if (data.already_unlocked) {
        setLeads((arr) =>
          arr.map((l) =>
            l.id === leadId ? { ...l, is_unlocked: true, mobile: data.mobile, name: data.name } : l
          )
        );
        toast.success("Contact revealed!");
        return;
      }
      setPendingUnlock({ id: leadId, token: data.token, emailHint: data.email_hint });
      setModalLeadId(leadId);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to initiate unlock");
    }
  };

  const handleModalSuccess = (leadId, { mobile, name }) => {
    setModalLeadId(null);
    setPendingUnlock(null);
    setLeads((arr) =>
      arr.map((l) =>
        l.id === leadId ? { ...l, is_unlocked: true, mobile, name } : l
      )
    );
    toast.success("Contact unlocked! 🎉");
    fetchStats();
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/enquiries/${id}/status?new_status=${status}`);
      setLeads((arr) => arr.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success(`Lead status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Filter in Frontend for Status & Search
  const filteredLeads = leads.filter((l) => {
    // 1. Status Tab filter
    let matchStatus = true;
    if (statusFilter === "my_leads") {
      matchStatus = l.is_unlocked;
    } else if (statusFilter === "new") {
      matchStatus = l.status === "new" || l.status === "pending";
    } else if (statusFilter === "in_progress") {
      matchStatus = l.status === "in_progress";
    } else if (statusFilter === "closed") {
      matchStatus = l.status === "closed" || l.status === "completed";
    }

    // 2. Search query filter
    let matchQuery = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchQuery =
        l.requirement.toLowerCase().includes(q) ||
        (l.product_name || "").toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q);
    }

    return matchStatus && matchQuery;
  });

  return (
    <div className="pb-36 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto" data-testid="leads-page">
      <BackButton className="mb-2" />

      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Live Buyer Feed</div>
          <h1 className="font-display text-2xl font-black text-slate-900 leading-tight">Leads</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time buyer requirements — unlock to reveal contact details.</p>
        </div>
        <button
          onClick={() => toast.success("Learn how buyer lead matching works!")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-blue-900 text-blue-900 font-extrabold text-[10px] uppercase hover:bg-blue-50 transition-colors"
        >
          <Play size={10} className="fill-blue-900" /> How it works
        </button>
      </div>

      {!isBusiness ? (
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500" data-testid="leads-empty-state">
          You are signed in as a Buyer. Switch to a Manufacturer or Supplier account to browse leads.
        </div>
      ) : (
        <>
          {/* Quota Usage Banner (for paid users) */}
          {unlockStats && (
            <div className={`mt-3 rounded-xl px-4 py-3 flex items-center gap-3 border ${
              unlockStats.remaining === 0
                ? "bg-red-50 border-red-200"
                : unlockStats.remaining <= 5
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <ShieldCheck size={16} className={
                unlockStats.remaining === 0 ? "text-red-500 shrink-0"
                : unlockStats.remaining <= 5 ? "text-amber-500 shrink-0"
                : "text-emerald-500 shrink-0"
              } />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  {unlockStats.unlocks_per_month == null
                    ? "Unlimited unlocks (Admin)"
                    : `${unlockStats.used_this_month} / ${unlockStats.unlocks_per_month} unlocks used this month`}
                </p>
                {unlockStats.unlocks_per_month != null && (
                  <div className="mt-1 h-1.5 bg-white/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        unlockStats.remaining === 0 ? "bg-red-500"
                        : unlockStats.remaining <= 5 ? "bg-amber-500"
                        : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (unlockStats.used_this_month / unlockStats.unlocks_per_month) * 100)}%`
                      }}
                    />
                  </div>
                )}
              </div>
              {unlockStats.remaining === 0 && (
                <Link to="/pricing" className="text-xs font-bold text-blue-700 shrink-0 hover:underline">
                  Upgrade
                </Link>
              )}
            </div>
          )}

          {/* Clean Filters (Adopted from original RequirementsPage) */}
          <div className="mt-3 space-y-2 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
            <LocationPicker value={loc} onChange={setLoc} testid="req-loc" />
            <div className="relative">
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                data-testid="req-filter-category"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none appearance-none font-semibold text-slate-700"
              >
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ ...filter, sort: "recent" })}
                data-testid="req-sort-recent"
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${filter.sort === "recent" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"}`}
              >
                <Clock size={11} /> Recent
              </button>
              <button
                onClick={() => setFilter({ ...filter, sort: "trending" })}
                data-testid="req-sort-trending"
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${filter.sort === "trending" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"}`}
              >
                <Sparkles size={11} /> Trending
              </button>
              {(filter.category || loc.state) && (
                <button
                  onClick={() => { setFilter({ category: "", sort: "recent" }); setLoc({ state: "", city: "", industrial_area: "" }); }}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Status capsules and search bar inline container */}
          <div className="mt-4 flex flex-col gap-2.5">
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="leads-status-tabs">
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

            {/* Live Search bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by requirement, product or category..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-white text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Leads Card list */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
                No active buyer requirements matching your filters.
              </div>
            )}

            {filteredLeads.map((lead) => {
              const isUnlocked = lead.is_unlocked;
              return (
                <article
                  key={lead.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all text-left"
                  data-testid={`lead-card-${lead.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                        {lead.product_name || lead.requirement.slice(0, 60)}
                      </h3>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 mt-1 inline-flex items-center gap-1.5">
                        <Tag size={11} /> {lead.category}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                      isUnlocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {isUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2 border-b border-slate-100 pb-3.5 text-xs text-slate-600">
                    {lead.quantity && (
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Qty</span>
                        <span className="font-bold text-slate-900">{lead.quantity}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span>
                        {lead.industrial_area
                          ? `${lead.industrial_area}, ${lead.city || lead.location}`
                          : lead.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {lead.requirement}
                  </p>

                  {/* Media attachments — visible before and after unlock */}
                  <LeadMediaStrip urls={lead.media_urls} />

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                      <div className={`text-slate-500 inline-flex items-center gap-1 ${isUnlocked ? "" : "blur-[3px] select-none"}`}>
                        <Phone size={11} /> {lead.mobile}
                      </div>
                    </div>

                    {!isUnlocked ? (
                      <button
                        onClick={() => handleUnlockClick(lead.id)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <Lock size={12} /> Unlock Contact
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center flex-wrap">
                        <a
                          href={`tel:${lead.mobile}`}
                          className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-blue-100"
                        >
                          <Phone size={12} /> Call
                        </a>
                        <a
                          href={whatsappLink(lead.mobile, `Hi ${lead.name}, regarding your requirement: ${lead.requirement.slice(0, 60)}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-[#20bd5a]"
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                        {lead.status !== "in_progress" && (
                          <button
                            onClick={() => updateStatus(lead.id, "in_progress")}
                            className="px-2.5 py-1.5 bg-orange-50 text-orange-800 rounded-lg text-[10px] font-bold hover:bg-orange-100"
                          >
                            In Progress
                          </button>
                        )}
                        {lead.status !== "closed" && (
                          <button
                            onClick={() => updateStatus(lead.id, "closed")}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-200"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Bottom Upgrade Banner */}
          <div className="fixed bottom-[72px] right-4 z-20 md:left-4 md:right-4 md:max-w-lg md:mx-auto">
            {/* Mobile Compact Floating Button */}
            <button
              onClick={() => {
                toast.info("Opening subscription plans...");
                navigate("/pricing");
              }}
              className="md:hidden px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-xl border border-orange-400/30 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Zap size={14} className="text-yellow-200 fill-yellow-200" /> Upgrade Plan
            </button>

            {/* Desktop Banner Card */}
            <div className="hidden md:flex bg-gradient-to-r from-blue-950 to-blue-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 items-center justify-between gap-4">
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
                Upgrade Plan
              </button>
            </div>
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
