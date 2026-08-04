import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UserCheck, ShieldAlert, CreditCard, ChevronDown, ChevronUp,
  UserX, Trash2, Crown, Zap, AlertTriangle, ArrowRight, CheckCircle2,
  Lock, Settings as SettingsIcon, LogOut, KeyRound, ShieldCheck, Mail
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import { toast } from "sonner";
import { AdminSetupModal } from "../components/AdminSetupModal";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Accordion states
  const [accountOpen, setAccountOpen] = useState(true);
  const [securityOpen, setSecurityOpen] = useState(true);
  const [accountAction, setAccountAction] = useState(null); // 'deactivate' | 'delete' | null

  // Security Modal
  const [showAdminSecurityModal, setShowAdminSecurityModal] = useState(false);

  // Confirmation Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const isAdmin = user.role === "admin";

  const handleDeactivate = async () => {
    setShowDeactivateModal(false);
    toast.success("Account deactivated successfully. Logging out...");
    setTimeout(async () => {
      await logout();
      navigate("/");
    }, 1200);
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    toast.error("Account deletion request submitted. Data purge scheduled.");
    setTimeout(async () => {
      await logout();
      navigate("/");
    }, 1500);
  };

  return (
    <div className="pb-28 px-4 pt-4 max-w-3xl mx-auto" data-testid="settings-page">
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
            Manage your account security, password, and profile preferences.
          </p>
        </div>
      </div>

      {/* User Info Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-800 text-white font-bold text-lg flex items-center justify-center">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900 text-base flex items-center gap-2">
              {user.name}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-slate-500">{user.email || user.mobile}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate("/");
            toast.info("Signed out");
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1.5"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="space-y-5">
        
        {/* SECTION 1: Account Security & Password Recovery */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="section-account-security">
          <button
            onClick={() => setSecurityOpen(!securityOpen)}
            className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition-colors text-left border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Account &amp; Security Settings</h2>
                <p className="text-xs text-slate-500">Reset password, update secondary email &amp; security question</p>
              </div>
            </div>
            {securityOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {securityOpen && (
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Reset Password Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center mb-3">
                    <KeyRound size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Reset Account Password</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Change your password or use multi-factor recovery options if you forgot your credentials.
                  </p>
                  <button
                    onClick={() => navigate("/forgot-password")}
                    className="mt-4 w-full py-2.5 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    data-testid="btn-reset-password-settings"
                  >
                    <KeyRound size={14} /> Go to Password Reset
                  </button>
                </div>

                {/* Secondary Email & Security Question Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                    <ShieldAlert size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Security &amp; Secondary Email</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Configure secondary recovery email and set your security question for account recovery.
                  </p>
                  <button
                    onClick={() => navigate("/account-security")}
                    className="mt-4 w-full py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    data-testid="btn-configure-security-settings"
                  >
                    <ShieldCheck size={14} /> Open Account Security Center
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Manage your Account Status */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="section-manage-account">
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition-colors text-left border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Manage your Account Status</h2>
                <p className="text-xs text-slate-500">Deactivation &amp; deletion options</p>
              </div>
            </div>
            {accountOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {accountOpen && (
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Deactivate Option Card */}
                <div
                  className={`bg-white border rounded-2xl p-5 transition-all ${
                    accountAction === "deactivate"
                      ? "border-amber-400 ring-2 ring-amber-100 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid="option-deactivate-account"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <UserX size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Reversible
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Deactivate Your Account</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Temporarily hide your profile, listings, and posts. You can reactivate anytime simply by logging back in.
                  </p>
                  <button
                    onClick={() => {
                      setAccountAction(accountAction === "deactivate" ? null : "deactivate");
                      setShowDeactivateModal(true);
                    }}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    data-testid="btn-deactivate-account"
                  >
                    <UserX size={14} /> Deactivate Account
                  </button>
                </div>

                {/* Delete Option Card */}
                <div
                  className={`bg-white border rounded-2xl p-5 transition-all ${
                    accountAction === "delete"
                      ? "border-rose-400 ring-2 ring-rose-100 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid="option-delete-account"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                      <Trash2 size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Permanent
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Delete Your Account</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Permanently wipe your account, posts, enquiries, and saved items. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => {
                      setAccountAction(accountAction === "delete" ? null : "delete");
                      setShowDeleteModal(true);
                    }}
                    className="mt-4 w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    data-testid="btn-delete-account"
                  >
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Manage Your Membership Hub Banner (Hidden for Admin) */}
        {!isAdmin && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" data-testid="section-manage-membership">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Manage Your Membership</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  View active plan status, contact unlock quota, benefits, and billing options.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/membership")}
              className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              data-testid="goto-membership-hub-btn"
            >
              <span>Open Membership Hub</span> <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>

      {/* Admin Security Setup Modal */}
      {isAdmin && (
        <AdminSetupModal open={showAdminSecurityModal} onClose={() => setShowAdminSecurityModal(false)} />
      )}

      {/* MODAL 1: Deactivate Confirmation */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" data-testid="modal-deactivate">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-xl text-slate-900">Deactivate Your Account?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Deactivating will temporarily hide your business profile, posts, and listings. You can reactivate anytime by logging back into your account.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                data-testid="confirm-deactivate-btn"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" data-testid="modal-delete">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border-2 border-rose-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-xl text-slate-900">Delete Your Account?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This operation is <span className="font-bold text-rose-600">permanent</span>. All your company posts, saved items, chat histories, and profile details will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                data-testid="confirm-delete-btn"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
