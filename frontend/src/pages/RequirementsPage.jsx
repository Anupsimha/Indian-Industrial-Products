import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Lock, MapPin, Tag, Clock, Phone, TrendingUp, Sparkles,
  Package, Boxes, X, Mail, AlertTriangle, CheckCircle,
  ShieldCheck, Loader2
} from "lucide-react";
import { whatsappLink } from "../lib/api";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";

// ─────────────────────────────────────────────────────────────────────────────
// UnlockModal — two-step: Warning → OTP input
// ─────────────────────────────────────────────────────────────────────────────
function UnlockModal({ stats, enqId, onClose, onSuccess }) {
  const [step, setStep] = useState("warning"); // "warning" | "otp" | "loading"
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const usedCount = stats?.used_this_month ?? 0;
  const totalLimit = stats?.unlocks_per_month;
  const remaining = stats?.remaining;
  const isUnlimited = totalLimit == null; // admin

  const quotaFull = !isUnlimited && remaining === 0;

  // Step 1 — request OTP
  const handleRequestOtp = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/requirements/${enqId}/request-unlock`);
      if (data.already_unlocked) {
        // Previously unlocked — pass through directly
        onSuccess({ mobile: data.mobile, name: data.name });
        return;
      }
      setToken(data.token);
      setEmailHint(data.email_hint);
      setStep("otp");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send OTP. Please try again.");
      onClose();
    } finally {
      setSending(false);
    }
  };

  // Step 2 — verify OTP
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
      onSuccess({ mobile: data.mobile, name: data.name });
    } catch (e) {
      setOtpError(e.response?.data?.detail || "Incorrect OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ animation: "slideUp 0.25s ease" }}
      >
        {/* ── Header ── */}
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
            className="text-white/60 hover:text-white transition-colors"
            disabled={sending || verifying}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Step: Warning ── */}
        {step === "warning" && (
          <div className="p-5 space-y-4">
            {/* Quota indicator */}
            {!isUnlimited && (
              <div className={`rounded-xl p-4 border ${
                quotaFull
                  ? "bg-red-50 border-red-200"
                  : usedCount > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className={
                    quotaFull ? "text-red-500" : usedCount > 0 ? "text-amber-500" : "text-emerald-500"
                  } />
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    quotaFull ? "text-red-600" : usedCount > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}>
                    Monthly Unlock Quota
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-black ${
                    quotaFull ? "text-red-600" : "text-slate-800"
                  }`}>{usedCount}</span>
                  <span className="text-slate-400 font-medium mb-1"> / {totalLimit} used</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quotaFull
                        ? "bg-red-500"
                        : usedCount / totalLimit > 0.7
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (usedCount / totalLimit) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-2 ${quotaFull ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {quotaFull
                    ? "You've reached your monthly limit. Quota resets on the 1st."
                    : `${remaining} unlock${remaining === 1 ? "" : "s"} remaining this month`}
                </p>
              </div>
            )}

            {isUnlimited && (
              <div className="rounded-xl p-4 border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Admin — Unlimited Unlocks
                  </span>
                </div>
              </div>
            )}

            {!quotaFull && (
              <p className="text-sm text-slate-600 leading-relaxed">
                An OTP will be sent to your registered email address to confirm this unlock.
                Are you sure you want to proceed?
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                disabled={sending}
              >
                Cancel
              </button>
              {!quotaFull && (
                <button
                  onClick={handleRequestOtp}
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? (
                    <><Loader2 size={15} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Mail size={14} /> Send OTP</>
                  )}
                </button>
              )}
              {quotaFull && (
                <Link
                  to="/pricing"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors text-center"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Step: OTP Input ── */}
        {step === "otp" && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <Mail size={24} className="text-blue-600" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                We sent a 6-digit OTP to{" "}
                <span className="font-semibold text-slate-900">{emailHint}</span>.
                <br />Enter it below to unlock this contact.
              </p>
            </div>

            {/* OTP input */}
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setOtpError("");
                }}
                placeholder="• • • • • •"
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl border-2 outline-none transition-all ${
                  otpError
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 focus:border-blue-500 text-slate-900"
                }`}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
              {otpError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <X size={12} /> {otpError}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              ⏱ OTP expires in 10 minutes
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setStep("warning"); setOtp(""); setOtpError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                disabled={verifying}
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={verifying || otp.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {verifying ? (
                  <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                ) : (
                  <><CheckCircle size={14} /> Verify &amp; Unlock</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequirementsPage
// ─────────────────────────────────────────────────────────────────────────────
export default function RequirementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ category: "", sort: "recent" });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const [categories, setCategories] = useState([]);

  // Unlock stats (quota usage)
  const [unlockStats, setUnlockStats] = useState(null);

  // Modal state
  const [modalEnqId, setModalEnqId] = useState(null); // null = closed

  // ── Fetch categories ──
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  // ── Fetch requirements ──
  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.category) params.set("category", filter.category);
    if (loc.state) params.set("state", loc.state);
    if (loc.city) params.set("city", loc.city);
    if (loc.industrial_area) params.set("industrial_area", loc.industrial_area);
    params.set("sort", filter.sort);
    const { data } = await api.get(`/requirements?${params}`);
    setItems(data);
  }, [filter, loc]);

  useEffect(() => { load(); }, [load]);

  // ── Fetch unlock quota stats (only if logged in with paid plan) ──
  useEffect(() => {
    if (!user) return;
    const hasPaidPlan = user.plan_name &&
      user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (hasPaidPlan || user.role === "admin") {
      api.get("/requirements/unlock-stats")
        .then((r) => setUnlockStats(r.data))
        .catch(() => {});
    }
  }, [user]);

  // ── Click "Unlock Contact" ──
  const handleUnlockClick = (id) => {
    if (!user) { navigate("/login"); return; }
    const hasPaidPlan = user.plan_name &&
      user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }
    setModalEnqId(id);
  };

  // ── Modal success callback ──
  const handleUnlockSuccess = ({ mobile, name }) => {
    setModalEnqId(null);
    setItems((arr) =>
      arr.map((it) =>
        it.id === modalEnqId
          ? { ...it, is_unlocked: true, mobile, name }
          : it
      )
    );
    toast.success("Contact unlocked! 🎉");
    // Refresh stats
    api.get("/requirements/unlock-stats")
      .then((r) => setUnlockStats(r.data))
      .catch(() => {});
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="requirements-page">
      <BackButton className="mb-2" />
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Live Buyer Feed</div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Requirements</h1>
        <p className="text-xs text-slate-500">Verified buyer enquiries — unlock to reveal contact details.</p>
      </div>

      {/* ── Quota Usage Banner (for paid users) ── */}
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

      {/* ── Filters ── */}
      <div className="mt-3 space-y-2">
        <LocationPicker value={loc} onChange={setLoc} testid="req-loc" />
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          data-testid="req-filter-category"
          className="w-full rounded-full bg-white border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter({ ...filter, sort: "recent" })}
            data-testid="req-sort-recent"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${filter.sort === "recent" ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
          >
            <Clock size={12} /> Recent
          </button>
          <button
            onClick={() => setFilter({ ...filter, sort: "trending" })}
            data-testid="req-sort-trending"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${filter.sort === "trending" ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
          >
            <TrendingUp size={12} /> Trending
          </button>
          {(filter.category || loc.state) && (
            <button
              onClick={() => { setFilter({ category: "", sort: "recent" }); setLoc({ state: "", city: "", industrial_area: "" }); }}
              data-testid="req-filter-clear"
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Card List ── */}
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500" data-testid="req-empty">
            No requirements match your filters.
          </div>
        )}
        {items.map((it) => (
          <article
            key={it.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
            data-testid={`req-card-${it.id}`}
          >
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
                <a
                  href={whatsappLink(it.mobile, `Hi ${it.name}, regarding your enquiry: ${it.requirement.slice(0, 60)}`)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid={`req-wa-${it.id}`}
                  className="px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#128C7E]"
                >
                  WhatsApp
                </a>
              ) : (
                <button
                  onClick={() => handleUnlockClick(it.id)}
                  data-testid={`req-unlock-${it.id}`}
                  className="px-3 py-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-orange-700 active:scale-95 transition-all"
                >
                  <Lock size={12} /> Unlock Contact
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* ── Upsell Banner ── */}
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

      {/* ── Unlock Modal ── */}
      {modalEnqId && (
        <UnlockModal
          stats={unlockStats}
          enqId={modalEnqId}
          onClose={() => setModalEnqId(null)}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
