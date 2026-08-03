import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Crown, ShieldCheck, Zap, Sparkles, CheckCircle2, ArrowRight,
  Clock, CreditCard, ChevronRight, AlertCircle, RefreshCw
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import api from "../lib/api";
import { toast } from "sonner";

export default function MembershipPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unlockStats, setUnlockStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get("/requirements/unlock-stats")
      .then((r) => setUnlockStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="pb-28 px-4 pt-6 max-w-2xl mx-auto text-center" data-testid="membership-unauth">
        <BackButton className="mb-4" />
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <Crown size={48} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Sign In to View Membership</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Manage your active plan, unlock quota, and subscription benefits.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-blue-800 text-white font-semibold hover:bg-blue-900 transition-colors"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  const currentPlan = user.plan_name || "Free";
  const isPaidPlan = currentPlan.toLowerCase() !== "free";
  const isAdmin = user.role === "admin";
  const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : null;

  const usedCount = unlockStats?.used_this_month ?? 0;
  const totalLimit = unlockStats?.unlocks_per_month;
  const remaining = unlockStats?.remaining;
  const isUnlimited = totalLimit == null || isAdmin;
  const quotaFull = !isUnlimited && remaining === 0;

  return (
    <div className="pb-28 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-5xl mx-auto space-y-6" data-testid="membership-page">
      <BackButton className="mb-2" />

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/15 text-xs font-bold uppercase tracking-widest mb-3">
              <Crown size={14} className="text-amber-400" /> Dedicated Membership Hub
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-black">Manage Your Plan &amp; Benefits</h1>
            <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Unlock verified buyer requirements, post unlimited products &amp; vacancies, and grow your industrial reach.
            </p>
          </div>

          <Link
            to="/pricing"
            data-testid="upgrade-plan-hero-btn"
            className="shrink-0 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 hover:scale-[1.02] active:scale-95 transition-all text-center inline-flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> {isPaidPlan ? "Upgrade / Change Plan" : "Upgrade to Premium"}
          </Link>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column — Active Subscription Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Current Active Plan */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Subscription</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                isPaidPlan
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}>
                {isPaidPlan ? "Active Paid Plan" : "Free Tier"}
              </span>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <h2 className="font-display text-3xl font-black text-slate-900">{currentPlan} Plan</h2>
              {expiresAt && <span className="text-xs text-slate-500">Renews / Expires: {expiresAt}</span>}
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Account Role</div>
                <div className="text-sm font-bold text-slate-800 capitalize mt-0.5">{user.role || "Member"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Billing Status</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{isPaidPlan ? "Monthly Billing" : "No active billing"}</div>
              </div>
            </div>
          </div>

          {/* Card: Contact Unlock Quota */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className={quotaFull ? "text-red-500" : "text-emerald-600"} />
                <h3 className="font-display font-bold text-slate-900 text-base">Monthly Contact Unlocks</h3>
              </div>
              {isUnlimited && (
                <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Unlimited
                </span>
              )}
            </div>

            {!isUnlimited && (
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-slate-900">{usedCount} <span className="text-sm text-slate-400 font-medium">/ {totalLimit} unlocks used</span></span>
                  <span className={`text-xs font-bold ${quotaFull ? "text-red-600" : "text-slate-600"}`}>{remaining} remaining</span>
                </div>
                
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      quotaFull ? "bg-red-500" : usedCount / totalLimit > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (usedCount / (totalLimit || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Quota resets on the 1st of every calendar month. Upgrade your plan for higher unlock limits.
                </p>
              </div>
            )}

            {isUnlimited && (
              <p className="text-xs text-slate-600 leading-relaxed">
                Your current account tier allows unlimited contact unlocks for verified buyer requirements across India.
              </p>
            )}
          </div>

        </div>

        {/* Right Column — Plan Benefits & Actions */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Plan Benefits */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap size={18} className="text-amber-500" /> Plan Included Features
            </h3>

            <ul className="space-y-3 text-xs text-slate-700 font-medium">
              {[
                "Verified Buyer Requirements Feed Access",
                "Real-time WhatsApp & Contact Unlocks",
                "Product Catalog Showcase & Industrial Listing",
                "Reel Video Uploads & Promotion",
                "Job Vacancies Posting & Candidate Applications",
                "Direct Industrial Area Group Networking"
              ].map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Action Navigation */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Membership Management</h4>
            
            <Link
              to="/pricing"
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Crown size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Explore All Membership Plans</div>
                  <div className="text-[10px] text-slate-500">Compare monthly and yearly pricing options</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/orders"
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-800 group-hover:bg-blue-800 group-hover:text-white transition-colors">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Billing &amp; Invoice History</div>
                  <div className="text-[10px] text-slate-500">View past payments and transaction receipts</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
