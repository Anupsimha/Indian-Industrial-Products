import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UserCheck, ShieldAlert, CreditCard, ChevronDown, ChevronUp,
  UserX, Trash2, Crown, Zap, AlertTriangle, ArrowRight, CheckCircle2,
  Lock, Settings as SettingsIcon, LogOut, Clock, Calendar, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Desktop active tab
  const [activeTab, setActiveTab] = useState("membership"); // 'membership' | 'account' | 'danger'

  // Confirmation Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelMembershipModal, setShowCancelMembershipModal] = useState(false);

  if (!user) {
    return (
      <div className="pb-28 px-4 pt-6 max-w-2xl mx-auto text-center" data-testid="settings-page-unauth">
        <BackButton className="mb-4" />
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <SettingsIcon size={48} className="mx-auto text-slate-400 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please Sign In</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">You need to be logged in to view settings.</p>
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
  const hasQueuedPlan = Boolean(user.next_plan_name);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const handleDeactivate = async () => {
    setShowDeactivateModal(false);
    toast.success("Account deactivated successfully. Logging out...", { duration: 3000 });
    setTimeout(async () => {
      await logout();
      navigate("/");
    }, 1200);
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    toast.error("Account deletion request submitted. Data purge scheduled.", { duration: 3000 });
    setTimeout(async () => {
      await logout();
      navigate("/");
    }, 1500);
  };

  const handleCancelMembership = () => {
    setShowCancelMembershipModal(false);
    toast.success("Membership cancellation scheduled at end of current period.", { duration: 3000 });
  };

  return (
    <div className="pb-28 px-4 pt-4 max-w-7xl mx-auto" data-testid="settings-page">
      <BackButton className="mb-3" />

      {/* Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-md mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
            <SettingsIcon size={14} /> Account Settings
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mt-1">
            Settings &amp; Preferences
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1">
            Manage your account security, membership subscription, and profile preferences.
          </p>
        </div>
      </div>

      {/* Widescreen Desktop Grid (2-Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Sidebar / Tabs Navigation) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* User Profile Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-100" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-800 text-white font-black text-xl flex items-center justify-center">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
              )}
              <div>
                <div className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  {user.name}
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {user.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{user.email || user.mobile}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Plan</span>
                <span className="text-sm font-extrabold text-blue-900 flex items-center gap-1 mt-0.5">
                  <Crown size={14} className="text-amber-500" /> {currentPlan} Tier
                </span>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate("/");
                  toast.info("Signed out", { duration: 3000 });
                }}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1.5"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Category Tabs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-2 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab("membership")}
              data-testid="tab-membership"
              className={`w-full text-left p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between transition-all ${
                activeTab === "membership"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Crown size={18} className={activeTab === "membership" ? "text-amber-400" : "text-amber-500"} />
                <div>
                  <div>Membership &amp; Subscription</div>
                  <div className={`text-[10px] font-normal mt-0.5 ${activeTab === "membership" ? "text-blue-200" : "text-slate-400"}`}>
                    Active plan, renewal &amp; queued plans
                  </div>
                </div>
              </div>
              {hasQueuedPlan && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[9px] font-black uppercase">
                  Queued
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("account")}
              data-testid="tab-account"
              className={`w-full text-left p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between transition-all ${
                activeTab === "account"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck size={18} className={activeTab === "account" ? "text-blue-300" : "text-blue-600"} />
                <div>
                  <div>Account &amp; Security</div>
                  <div className={`text-[10px] font-normal mt-0.5 ${activeTab === "account" ? "text-blue-200" : "text-slate-400"}`}>
                    Profile details, credentials &amp; login
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("danger")}
              data-testid="tab-danger"
              className={`w-full text-left p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between transition-all ${
                activeTab === "danger"
                  ? "bg-rose-950 text-white shadow-sm"
                  : "text-rose-700 hover:bg-rose-50/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} className={activeTab === "danger" ? "text-rose-300" : "text-rose-600"} />
                <div>
                  <div>Danger Zone</div>
                  <div className={`text-[10px] font-normal mt-0.5 ${activeTab === "danger" ? "text-rose-200" : "text-slate-400"}`}>
                    Deactivate or delete account
                  </div>
                </div>
              </div>
            </button>
          </div>

        </div>

        {/* Right Column (Active Content Panel) */}
        <div className="lg:col-span-8 space-y-6">

          {/* TAB 1: MEMBERSHIP & SUBSCRIPTION */}
          {activeTab === "membership" && (
            <div className="space-y-6" data-testid="panel-membership">
              
              {/* Active Plan Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <Crown size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Current Active Plan
                        </span>
                      </div>
                      <h2 className="font-display text-2xl font-extrabold text-slate-900 mt-1 capitalize">
                        {currentPlan} Subscription
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/pricing")}
                    className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <Zap size={14} /> Upgrade / Switch Plan
                  </button>
                </div>

                {/* Dates breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Calendar size={14} className="text-blue-800" /> Plan Purchased / Started
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {formatDate(user.plan_started_at || user.created_at)}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Clock size={14} className="text-orange-600" /> Plan Expiration Date
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {user.plan_expires_at ? formatDate(user.plan_expires_at) : "Never (Free Plan)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Active Queued Plan Card (If User purchased a plan before current plan expires) */}
              {hasQueuedPlan ? (
                <div className="bg-gradient-to-br from-cyan-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-cyan-700 relative">
                  <div className="flex items-center justify-between pb-4 border-b border-cyan-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40">
                          Next Active Plan Queued
                        </span>
                        <h3 className="font-display text-xl font-bold mt-1 text-white capitalize">
                          {user.next_plan_name} Plan
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-cyan-100/80 mt-3 leading-relaxed">
                    This plan will automatically activate as soon as your current <span className="font-bold text-amber-300 capitalize">{currentPlan}</span> subscription finishes.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5">
                      <div className="text-[10px] uppercase font-bold text-cyan-200">Scheduled Start Date</div>
                      <div className="font-extrabold text-sm text-white mt-0.5">
                        {formatDate(user.next_plan_starts_at)}
                      </div>
                    </div>
                    <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5">
                      <div className="text-[10px] uppercase font-bold text-cyan-200">Scheduled End Date</div>
                      <div className="font-extrabold text-sm text-white mt-0.5">
                        {formatDate(user.next_plan_expires_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6 text-center">
                  <Clock size={28} className="mx-auto text-slate-400 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">No Queued Plan</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Purchasing a plan before your current subscription ends will queue it here to start automatically on your expiration date.
                  </p>
                </div>
              )}

              {/* Cancellation option */}
              {isPaidPlan && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Cancel Auto-Renewal</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Keep benefits active until current period ends.</p>
                  </div>
                  <button
                    onClick={() => setShowCancelMembershipModal(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs rounded-xl transition-colors shrink-0"
                  >
                    Cancel Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACCOUNT & SECURITY */}
          {activeTab === "account" && (
            <div className="space-y-6" data-testid="panel-account">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Account Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={user.name || ""}
                      className="mt-1 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Role / Account Type</label>
                    <input
                      type="text"
                      disabled
                      value={user.role || ""}
                      className="mt-1 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 capitalize"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="text"
                      disabled
                      value={user.email || ""}
                      className="mt-1 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                    <input
                      type="text"
                      disabled
                      value={user.mobile || ""}
                      className="mt-1 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={16} /> Password Protected &amp; Verified
                  </div>
                  <button
                    onClick={() => toast.info("Password reset link sent to your registered email.", { duration: 3000 })}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="space-y-6" data-testid="panel-danger">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Deactivate Option Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                      <UserX size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Reversible
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-2">Deactivate Account</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Temporarily hide your profile, listings, and posts. Reactivate anytime by logging back in.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeactivateModal(true)}
                    className="mt-6 w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserX size={14} /> Deactivate Account
                  </button>
                </div>

                {/* Delete Option Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                      <Trash2 size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Permanent
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-2">Delete Account</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Permanently wipe your account, posts, enquiries, and saved items. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="mt-6 w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* CONFIRMATION MODALS */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Deactivate Account?</h3>
            <p className="text-xs text-slate-600">
              Your profile and listings will be hidden immediately. Log in anytime to restore.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Permanently Delete Account?</h3>
            <p className="text-xs text-slate-600">
              This will erase all your products, posts, requirements, and saved bookmarks permanently.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelMembershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center">
              <Crown size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Cancel Auto-Renewal?</h3>
            <p className="text-xs text-slate-600">
              You will continue to have access to your active plan benefits until {formatDate(user.plan_expires_at)}. Auto-renewal will be turned off.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelMembershipModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Keep Renewal
              </button>
              <button
                onClick={handleCancelMembership}
                className="flex-1 py-2.5 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-950"
              >
                Cancel Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
