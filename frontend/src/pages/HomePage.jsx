import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { whatsappLink } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { HeroSlider } from "../components/HeroSlider";
import { CategoryDrawer } from "../components/CategoryDrawer";
import { ApplyJobDialog } from "../components/ApplyJobDialog";
import { JobDialog } from "../components/CreateDialogs";
import {
  Loader2, Verified, Search, Package, Target, Bookmark, BarChart3,
  Lock, Phone, MapPin, Tag, Clock, Boxes, ShieldCheck, Mail, CheckCircle, X, AlertTriangle,
  LayoutGrid, Cpu, Settings, Zap, MoreHorizontal, ChevronRight, Layers, Users, Building2, Sparkles,
  Briefcase, IndianRupee, Trash2, Edit3
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const SteelIBeam = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
    <path d="M6 4h12M6 20h12M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// UnlockModal — OTP unlock dialog for leads
// ─────────────────────────────────────────────────────────────────────────────
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
      toast.error(e.response?.data?.detail || "Could not send OTP. Please try again.");
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
      setOtpError(e.response?.data?.detail || "Incorrect OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/65 backdrop-blur-[4px]"
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
            className="text-white/60 hover:text-white transition-colors"
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
              <p className="text-sm text-slate-600 leading-relaxed text-left">
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

        {step === "otp" && (
          <div className="p-5 space-y-4">
            <div className="text-center flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <Mail size={24} className="text-blue-600" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                We sent a 6-digit OTP to{" "}
                <span className="font-semibold text-slate-900">{emailHint}</span>.
                <br />Enter it below to unlock this contact.
              </p>
            </div>

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
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState(["All", "Steel", "Machinery", "Polymers", "Electricals", "Tools", "Pipes", "Drives"]);
  const [posts, setPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState("All");
  
  // Feed & Dialog states
  const [activeFeedTab, setActiveFeedTab] = useState("For You");
  const [searchQuery, setSearchQuery] = useState("");
  const [unlockStats, setUnlockStats] = useState(null);
  const [modalEnqId, setModalEnqId] = useState(null);
  const [pendingUnlock, setPendingUnlock] = useState(null);
  const [openCatDrawer, setOpenCatDrawer] = useState(false);
  const [industrialGroups, setIndustrialGroups] = useState([]);
  const [platformStats, setPlatformStats] = useState({
    formatted: { companies: "50K+", products: "2L+", leads: "1L+", members: "5L+" }
  });

  // Job dialog states
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyJobOpen, setApplyJobOpen] = useState(false);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);

  const sentinelRef = useRef();
  const navigate = useNavigate();

  const fetchPosts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const s = reset ? 0 : skip;
      const { data } = await api.get(`/posts?skip=${s}&limit=10`);
      setPosts((p) => (reset ? data : [...p, ...data]));
      setSkip(s + data.length);
      if (data.length < 10) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, skip]);

  const fetchRequirements = useCallback(async () => {
    try {
      const { data } = await api.get("/requirements");
      setRequirements(data);
    } catch (err) {
      console.error("Error fetching requirements", err);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/jobs");
      setJobs(data || []);
    } catch (err) {
      console.error("Error fetching jobs", err);
    }
  }, []);

  const fetchUnlockStats = useCallback(async () => {
    if (!user) return;
    const hasPaidPlan = user.plan_name &&
      user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (hasPaidPlan || user.role === "admin") {
      try {
        const r = await api.get("/requirements/unlock-stats");
        setUnlockStats(r.data);
      } catch (err) {}
    }
  }, [user]);

  useEffect(() => {
    fetchPosts(true);
    fetchRequirements();
    loadJobs();
    fetchUnlockStats();
    api.get("/stats/summary").then((r) => setPlatformStats(r.data)).catch(() => {});
    api.get("/companies?limit=8").then((r) => setCompanies(r.data)).catch(() => {});
    api.get("/industrial-groups").then((r) => setIndustrialGroups(r.data)).catch(() => {});
    api.get("/categories")
      .then((r) => {
        if (r.data && r.data.length > 0) {
          setCategories(["All", ...r.data.map((c) => c.name)]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    // Infinite scroll only for posts tabs
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && activeFeedTab !== "Leads" && activeFeedTab !== "Jobs") {
        fetchPosts();
      }
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [fetchPosts, hasMore, loading, activeFeedTab]);

  const handleUnlockClick = async (id) => {
    if (!user) { navigate("/login"); return; }
    const hasPaidPlan = user.plan_name &&
      user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }

    try {
      const { data } = await api.post(`/requirements/${id}/request-unlock`);
      if (data.already_unlocked) {
        setRequirements((arr) =>
          arr.map((it) =>
            it.id === id ? { ...it, is_unlocked: true, mobile: data.mobile, name: data.name } : it
          )
        );
        toast.success("Contact revealed!");
        return;
      }
      setPendingUnlock({ id, token: data.token, emailHint: data.email_hint });
      setModalEnqId(id);
    } catch (e) {
      const msg = e.response?.data?.detail || "";
      if (msg.toLowerCase().includes("upgrade") || msg.toLowerCase().includes("plan") || e.response?.status === 403) {
        toast.error(msg || "Upgrade your plan to unlock contacts.");
        if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("upgrade")) navigate("/pricing");
      } else {
        toast.error(msg || "Could not initiate unlock. Please try again.");
      }
    }
  };

  const handleUnlockSuccess = (enqId, { mobile, name }) => {
    setModalEnqId(null);
    setPendingUnlock(null);
    setRequirements((arr) =>
      arr.map((it) =>
        it.id === enqId ? { ...it, is_unlocked: true, mobile, name } : it
      )
    );
    toast.success("Contact unlocked! 🎉");
    api.get("/requirements/unlock-stats")
      .then((r) => setUnlockStats(r.data))
      .catch(() => {});
  };

  const handleApplyJobClick = (j) => {
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login");
      return;
    }
    if (user?.company_id && user.company_id === j.company_id) {
      toast.error("You cannot apply to your own job vacancy");
      return;
    }
    setSelectedJob(j);
    setApplyJobOpen(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this vacancy?")) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success("Vacancy deleted successfully");
      loadJobs();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete vacancy");
    }
  };

  // Active tabs filter
  const getFilteredMobilePosts = () => {
    let base = [...posts];
    if (activeCat !== "All") {
      base = base.filter((p) => (p.category || "").toLowerCase() === activeCat.toLowerCase());
    }
    if (activeFeedTab === "Following") {
      base = base.filter((p) => p.is_following);
    } else if (activeFeedTab === "Trending") {
      base = base.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (activeFeedTab === "Local") {
      base = base.filter((p) =>
        (p.location || "").toLowerCase().match(/bengaluru|bangalore|peenya|karnataka/i)
      );
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.company_name.toLowerCase().includes(q)
      );
    }
    return base;
  };

  const getFilteredMobileRequirements = () => {
    let base = [...requirements];
    if (activeCat !== "All") {
      base = base.filter((it) => (it.category || "").toLowerCase() === activeCat.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (it) =>
          it.requirement.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (it.product_name || "").toLowerCase().includes(q)
      );
    }
    return base;
  };

  const getFilteredMobileJobs = () => {
    let base = [...jobs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company_name.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (j.type || "").toLowerCase().includes(q)
      );
    }
    return base;
  };

  const filteredMobilePosts = getFilteredMobilePosts();
  const filteredMobileRequirements = getFilteredMobileRequirements();
  const filteredMobileJobs = getFilteredMobileJobs();

  return (
    <div className="pb-24 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto" data-testid="home-page">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        
        {/* Main Feed Column — 8 cols on web desktop */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 1. Featured Slides */}
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <HeroSlider onCta={() => navigate("/post-enquiry")} />
          </div>

          {/* 2. Key Metrics Bar */}
          <div className="grid grid-cols-4 gap-1.5 bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 p-2.5 rounded-2xl text-white shadow-sm text-center">
            <div className="space-y-0.5">
              <div className="font-display font-extrabold text-sm sm:text-base text-blue-300">
                {platformStats?.formatted?.companies || "50K+"}
              </div>
              <div className="text-[9px] text-slate-300 font-semibold tracking-tight">Companies</div>
            </div>
            <div className="space-y-0.5 border-l border-white/10">
              <div className="font-display font-extrabold text-sm sm:text-base text-orange-400">
                {platformStats?.formatted?.products || "2L+"}
              </div>
              <div className="text-[9px] text-slate-300 font-semibold tracking-tight">Products</div>
            </div>
            <div className="space-y-0.5 border-l border-white/10">
              <div className="font-display font-extrabold text-sm sm:text-base text-emerald-400">
                {platformStats?.formatted?.leads || "1L+"}
              </div>
              <div className="text-[9px] text-slate-300 font-semibold tracking-tight">Leads</div>
            </div>
            <div className="space-y-0.5 border-l border-white/10">
              <div className="font-display font-extrabold text-sm sm:text-base text-amber-300">
                {platformStats?.formatted?.members || "5L+"}
              </div>
              <div className="text-[9px] text-slate-300 font-semibold tracking-tight">Members</div>
            </div>
          </div>

          {/* 3. CATEGORIES grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700">CATEGORIES</h3>
              <button
                onClick={() => setOpenCatDrawer(true)}
                data-testid="view-all-categories-btn"
                className="text-xs font-bold text-blue-800 hover:text-blue-900 inline-flex items-center gap-0.5"
              >
                View All &gt;
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { name: "Machinery", icon: Settings, color: "text-blue-700 bg-blue-50/80 border-blue-200/60" },
                { name: "Electricals", icon: Zap, color: "text-amber-600 bg-amber-50/80 border-amber-200/60" },
                { name: "Raw Materials", icon: Layers, color: "text-emerald-600 bg-emerald-50/80 border-emerald-200/60" },
                { name: "Components", icon: Boxes, color: "text-indigo-600 bg-indigo-50/80 border-indigo-200/60" },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCat === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCat(activeCat === cat.name ? "All" : cat.name)}
                    data-testid={`cat-card-${cat.name}`}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-800 text-white border-blue-800 shadow-md scale-[1.02]"
                        : "bg-white border-slate-200 hover:border-blue-300 text-slate-800"
                    }`}
                  >
                    <div className={`p-2 rounded-xl mb-1.5 ${isSelected ? "bg-white/20 text-white" : cat.color} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <span className={`text-[10px] text-center font-bold leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. INDUSTRIAL AREA GROUPS Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-500" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">INDUSTRIAL AREA GROUPS</h3>
              </div>
              <button
                onClick={() => navigate("/industrial-groups")}
                data-testid="view-all-groups-btn"
                className="text-xs font-bold text-blue-800 hover:text-blue-900 inline-flex items-center gap-0.5"
              >
                View All &gt;
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {industrialGroups.slice(0, 5).map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/industrial-groups/${g.id}`)}
                  data-testid={`home-group-card-${g.id}`}
                  className="shrink-0 w-44 bg-white border border-slate-200 rounded-2xl p-2.5 text-left hover:border-blue-400 hover:shadow-md transition-all space-y-2 group"
                >
                  <div className="relative h-20 w-full rounded-xl overflow-hidden bg-slate-100">
                    <img src={g.image_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white line-clamp-1">
                      {g.name}
                    </span>
                  </div>

                  <div className="space-y-0.5 px-0.5">
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      <span className="truncate">{g.location.split(",")[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                      <span className="text-blue-700 font-bold">{g.members_count >= 1000 ? (g.members_count / 1000).toFixed(1) + "K" : g.members_count} Members</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Search Bar & Feed Tabs (Including Jobs) */}
          <div className="space-y-2">
            <div className="relative mt-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, jobs, companies, leads..."
                className="w-full pl-9 pr-3 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-6 border-b border-slate-200 text-center w-full bg-white z-10 sticky top-14 lg:top-16">
              {["For You", "Following", "Trending", "Local", "Leads", "Jobs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFeedTab(tab)}
                  data-testid={`feed-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`py-3 text-[11px] sm:text-xs font-bold transition-colors border-b-2 ${
                    activeFeedTab === tab
                      ? "border-blue-800 text-blue-800 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Feed Content Section */}
          <section className="mt-3 space-y-4">
            {activeFeedTab === "Jobs" ? (
              <div className="space-y-3">
                {filteredMobileJobs.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
                    No jobs matching your search criteria.
                  </div>
                )}
                {filteredMobileJobs.map((j) => {
                  const isOwner = user && (user.company_id === j.company_id || user.role === "admin");
                  return (
                    <article
                      key={j.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left shadow-sm"
                      data-testid={`job-card-${j.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display font-bold text-base text-slate-900">{j.title}</div>
                          <Link to={`/company/${j.company_id}`} className="text-xs text-blue-800 font-semibold hover:underline">
                            {j.company_name}
                          </Link>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {j.type}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-700 line-clamp-2 leading-relaxed">{j.description}</p>

                      <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {j.location}</span>
                        {j.salary && <span className="inline-flex items-center gap-1"><IndianRupee size={12} className="text-slate-400" /> {j.salary}</span>}
                        <span className="inline-flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {j.posted || (j.created_at ? new Date(j.created_at).toLocaleDateString() : "Recently")}</span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyJobClick(j)}
                          className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                          data-testid={`apply-job-${j.id}`}
                        >
                          <Briefcase size={13} /> Apply Now
                        </button>

                        {isOwner && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setJobToEdit(j);
                                setEditJobOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Edit Vacancy"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(j.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete Vacancy"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : activeFeedTab === "Leads" ? (
              <div className="space-y-3">
                {filteredMobileRequirements.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
                    No leads matching your search criteria.
                  </div>
                )}
                {filteredMobileRequirements.map((it) => (
                  <article
                    key={it.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left shadow-sm"
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
                      {it.industrial_area ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {it.industrial_area}, {it.city || it.location}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><MapPin size={12} /> {it.location}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(it.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-3 leading-relaxed">{it.requirement}</p>

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
                          className="px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#128C7E]"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <button
                          onClick={() => handleUnlockClick(it.id)}
                          className="px-3 py-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-orange-700 active:scale-95 transition-all"
                        >
                          <Lock size={12} /> Unlock Contact
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <>
                {filteredMobilePosts.map((p) => (
                  <PostCard key={p.id} post={p} onUpdate={() => fetchPosts(true)} />
                ))}
                {filteredMobilePosts.length === 0 && !loading && (
                  <div className="text-center text-sm text-slate-500 py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    No posts yet under this section.
                  </div>
                )}
                <div ref={sentinelRef} className="h-8" />
              </>
            )}
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-800" size={22} />
              </div>
            )}
          </section>

        </div>

        {/* Sidebar Column — 4 cols on web desktop (hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6 sticky top-20">
          
          {/* 1. Live Buyer Feed CTA Card */}
          <Link to="/leads" data-testid="home-requirements-cta" className="block p-5 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80">Live Buyer Feed</div>
                <div className="font-display text-xl font-bold mt-1">Browse Requirements →</div>
                <div className="text-xs text-white/90 mt-1.5">Verified buyer leads from across India</div>
              </div>
            </div>
          </Link>

          {/* 2. Featured Companies Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700">FEATURED COMPANIES</h3>
              <button onClick={() => navigate("/companies")} className="text-xs font-bold text-blue-800 hover:text-blue-900">See all &gt;</button>
            </div>
            <div className="space-y-2">
              {companies.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/company/${c.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <img src={c.logo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                      <span>{c.name}</span>
                      <Verified size={13} className="text-blue-700 shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{c.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Vacancies / Jobs Summary Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700">LATEST VACANCIES</h3>
              <button onClick={() => setActiveFeedTab("Jobs")} className="text-xs font-bold text-blue-800 hover:text-blue-900">View all &gt;</button>
            </div>
            <div className="space-y-2.5">
              {jobs.slice(0, 3).map((j) => (
                <div key={j.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{j.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{j.company_name} • {j.location}</div>
                  <button
                    onClick={() => handleApplyJobClick(j)}
                    className="mt-1 px-3 py-1 rounded-full bg-orange-600 text-white text-[10px] font-bold hover:bg-orange-700 transition-colors inline-flex items-center gap-1"
                  >
                    <Briefcase size={10} /> Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── Unlock Modal ── */}
      {modalEnqId && (
        <UnlockModal
          stats={unlockStats}
          enqId={modalEnqId}
          initialToken={pendingUnlock?.token}
          initialEmailHint={pendingUnlock?.emailHint}
          onClose={() => { setModalEnqId(null); setPendingUnlock(null); }}
          onSuccess={handleUnlockSuccess}
        />
      )}

      {/* ── Apply Job Dialog ── */}
      <ApplyJobDialog
        open={applyJobOpen}
        onClose={() => setApplyJobOpen(false)}
        job={selectedJob}
      />

      {/* ── Edit Job Dialog ── */}
      <JobDialog
        open={editJobOpen}
        onClose={() => { setEditJobOpen(false); setJobToEdit(null); }}
        onSaved={loadJobs}
        jobToEdit={jobToEdit}
      />

      {/* ── Category Slide-over Drawer ── */}
      <CategoryDrawer
        open={openCatDrawer}
        onClose={() => setOpenCatDrawer(false)}
        selectedCategory={activeCat}
        onSelectCategory={(cat) => setActiveCat(cat)}
        categoriesList={categories}
      />
    </div>
  );
}
