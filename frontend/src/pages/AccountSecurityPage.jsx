import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck, ShieldAlert, Mail, Lock, KeyRound, HelpCircle, Eye, EyeOff,
  Edit, ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle, RefreshCw, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import api from "../lib/api";
import { toast } from "sonner";

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "In what city were you born?",
  "What was the model of your first vehicle?",
  "What is your favorite industrial machine brand?"
];

export default function AccountSecurityPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);

  // Form State
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState(user?.secondary_email || "");
  const [securityQuestion, setSecurityQuestion] = useState(user?.security_question || SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="pb-28 px-4 pt-6 max-w-2xl mx-auto text-center" data-testid="account-security-unauth">
        <BackButton className="mb-4" />
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <ShieldCheck size={48} className="mx-auto text-slate-400 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please Sign In</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">You need to be logged in to manage account security settings.</p>
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

  // Mask helper
  const maskEmail = (str) => {
    if (!str) return "Not configured";
    const parts = str.split("@");
    if (parts.length !== 2) return str;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***${name.slice(-1)}` : `${name}***`;
    return `${maskedName}@${domain}`;
  };

  // Trigger OTP Request
  const handleInitiateUpdate = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await api.post("/auth/security-setup/request-otp");
      toast.success(res.data?.message || "OTP sent to your primary email!");
      setShowOtpModal(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to dispatch verification OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Confirm OTP & Save Changes
  const handleVerifyAndSave = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        otp,
        email: email !== user.email ? email : undefined,
        new_password: newPassword || undefined,
        secondary_email: secondaryEmail || null,
        security_question: securityQuestion,
        security_answer: securityAnswer || undefined,
      };

      const res = await api.post("/auth/security-setup/verify-and-update", payload);
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      toast.success(res.data?.message || "Account security credentials updated successfully!");
      setShowOtpModal(false);
      setIsEditing(false);
      setNewPassword("");
      setConfirmPassword("");
      setSecurityAnswer("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to verify OTP or update credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28 px-4 pt-4 max-w-3xl mx-auto" data-testid="account-security-page">
      
      {/* Top Header Back Button */}
      <BackButton className="mb-3" />

      {/* Hero Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-md mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-300">
            <ShieldCheck size={16} /> Account Security Center
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-black mt-1">
            Security &amp; Recovery Hub
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1">
            Manage your credentials, backup recovery email, and security questions.
          </p>
        </div>
      </div>

      {/* VIEW-ONLY MODE */}
      {!isEditing ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5" data-testid="security-view-card">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="text-purple-600" size={22} />
                <h2 className="font-display font-bold text-slate-900 text-lg">Active Security Credentials</h2>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                data-testid="edit-security-credentials-btn"
                className="px-4 py-2 rounded-full bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Edit size={13} /> Update Security Setup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* Primary Email */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Mail size={14} className="text-blue-800" /> Primary Email
                </div>
                <div className="font-bold text-slate-900 text-sm truncate">{user.email}</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Verified Primary Email
                </div>
              </div>

              {/* Secondary Recovery Email */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Mail size={14} className="text-emerald-600" /> Secondary Recovery Email
                  </div>
                  {user.secondary_email && (
                    <button
                      onClick={() => setShowSecondaryEmail(!showSecondaryEmail)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      title={showSecondaryEmail ? "Hide email" : "Show email"}
                    >
                      {showSecondaryEmail ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-sm truncate">
                  {user.secondary_email
                    ? (showSecondaryEmail ? user.secondary_email : maskEmail(user.secondary_email))
                    : "Not configured"}
                </div>
                <div className="text-[10px] text-slate-400">Used for alternative password recovery</div>
              </div>

              {/* Security Question */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 md:col-span-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <HelpCircle size={14} className="text-purple-600" /> Security Question
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {user.security_question || "Not configured yet"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {user.security_question ? "Configured for instant question-based account recovery" : "Click 'Update Security Setup' to configure"}
                </div>
              </div>

              {/* Password Status */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 md:col-span-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <KeyRound size={14} className="text-slate-700" /> Account Password
                  </div>
                  <div className="font-mono text-slate-900 font-bold text-sm mt-0.5">••••••••••••</div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
                >
                  Change Password
                </button>
              </div>

            </div>

          </div>
        </div>
      ) : (
        
        /* EDIT / UPDATE MODE FORM */
        <form onSubmit={handleInitiateUpdate} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5" data-testid="security-edit-form">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="text-blue-800" size={22} />
              <h2 className="font-display font-bold text-slate-900 text-lg">Update Security Credentials</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>OTP Verification Required:</strong> An OTP code will be sent to your primary email (<span className="font-bold">{user.email}</span>) before any credential changes are saved.
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Primary Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="edit-primary-email-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Change Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="edit-new-password-input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="edit-confirm-password-input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            {/* Secondary Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Secondary Recovery Email
              </label>
              <input
                type="email"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                data-testid="edit-secondary-email-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="backup@domain.com (for password recovery)"
              />
            </div>

            {/* Security Question */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Security Question
              </label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                data-testid="edit-security-question-select"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                {SECURITY_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {/* Security Answer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Security Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                data-testid="edit-security-answer-input"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Enter security answer (case-insensitive)"
              />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={otpLoading}
              data-testid="request-otp-update-btn"
              className="px-6 py-2.5 rounded-xl bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-blue-900/20"
            >
              <Mail size={15} />
              <span>{otpLoading ? "Sending OTP..." : "Request Primary Email OTP & Save"}</span>
            </button>
          </div>

        </form>
      )}

      {/* OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4" data-testid="otp-verification-modal">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-center">
            
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={26} />
            </div>

            <div>
              <h3 className="font-display font-black text-slate-900 text-lg">Verify OTP Code</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter the 6-digit verification code sent to <span className="font-bold text-slate-800">{user.email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyAndSave} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  data-testid="security-otp-modal-input"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 font-display text-xl font-black tracking-widest text-center focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                  placeholder="123456"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || otp.length < 6}
                  data-testid="confirm-security-otp-btn"
                  className="flex-1 py-2.5 rounded-xl bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {submitting ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
