import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ShieldCheck, HelpCircle, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw, Lock, HelpCircle as HelpIcon } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { Logo } from "../components/Logo";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState("primary_email"); // primary_email | secondary_email | security_question
  const [step, setStep] = useState(1); // 1: Enter Email, 2: Primary Email OTP, 3: Try Another Way (Options), 4: Secondary OTP/Security Question Reset, 5: Success

  const [securityQuestion, setSecurityQuestion] = useState("");
  const [otp, setOtp] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Step 1: Submit Primary Email to send OTP (Google-style default)
  const handleStartPrimaryRecovery = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your registered account email");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password/request-primary", { identifier });
      toast.success(res.data?.message || "Password reset OTP sent to your primary email!");
      setStatusMsg(res.data?.message);
      setMethod("primary_email");
      setOtp("");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Account recovery request failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Alternative Recovery Method ("Try Another Way")
  const handleSelectAlternativeMethod = async (selectedMethod) => {
    setMethod(selectedMethod);
    setLoading(true);
    try {
      if (selectedMethod === "secondary_email") {
        const res = await api.post("/auth/forgot-password/request-secondary", { identifier });
        toast.success(res.data?.message || "OTP code sent to your secondary email!");
        setStatusMsg(res.data?.message);
        setOtp("");
        setStep(4);
      } else if (selectedMethod === "security_question") {
        const res = await api.post("/auth/forgot-password/get-question", { identifier });
        if (!res.data?.security_question) {
          toast.error("No security question configured for this account");
          return;
        }
        setSecurityQuestion(res.data.security_question);
        setSecurityAnswer("");
        setStep(4);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Alternative recovery initiation failed");
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (method === "primary_email" || method === "secondary_email") {
        const res = await api.post("/auth/forgot-password/reset-via-otp", {
          identifier,
          otp,
          new_password: newPassword
        });
        toast.success(res.data?.message || "Password reset successfully!");
        setStep(5);
      } else if (method === "security_question") {
        const res = await api.post("/auth/forgot-password/reset-via-security", {
          identifier,
          answer: securityAnswer,
          new_password: newPassword
        });
        toast.success(res.data?.message || "Password reset successfully!");
        setStep(5);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" data-testid="forgot-password-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-2xs"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <Logo size={48} withText={false} className="mx-auto" />
            <h2 className="font-display text-2xl font-black text-slate-900">Account Recovery</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {step === 1 ? "Enter your email to receive a password reset code." : "Google-style secure account password recovery."}
            </p>
          </div>

          {/* STEP 1: Enter Account Email */}
          {step === 1 && (
            <form onSubmit={handleStartPrimaryRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  name="recovery_identifier_email_field"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  data-testid="forgot-identifier-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. user@domain.com"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="forgot-start-primary-btn"
                className="w-full py-3.5 rounded-2xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
              >
                {loading ? (
                  <span>Searching Account...</span>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Primary Email OTP Verification (Default Flow) */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Mail size={14} /> Verification Code Sent
                </div>
                <div className="text-[11px] mt-0.5 text-blue-800">
                  {statusMsg || `We sent a 6-digit OTP code to ${identifier}`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  name="reset_otp_input_unfilled"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  data-testid="forgot-otp-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-base tracking-widest font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="123456"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  name="new_pwd_input_unfilled"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="forgot-new-password-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  name="confirm_pwd_input_unfilled"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="forgot-confirm-password-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                data-testid="forgot-reset-submit-btn"
                className="w-full py-3.5 rounded-2xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/20"
              >
                <KeyRound size={16} />
                <span>{loading ? "Resetting..." : "Reset Password"}</span>
              </button>

              {/* Google-Style "Try Another Way" Button at Bottom */}
              <div className="pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  data-testid="try-another-way-btn"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-900 hover:underline transition-colors"
                >
                  <HelpIcon size={14} />
                  <span>Try another way to recover account</span>
                </button>
              </div>

            </form>
          )}

          {/* STEP 3: "Try Another Way" Options Drawer */}
          {step === 3 && (
            <div className="space-y-4">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Alternative Recovery Methods
              </span>

              {/* Option A: Secondary Email OTP */}
              <button
                type="button"
                onClick={() => handleSelectAlternativeMethod("secondary_email")}
                disabled={loading}
                data-testid="recovery-secondary-btn"
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left flex items-start gap-3.5 group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    Send OTP to Secondary Email
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Send reset code to your pre-configured backup recovery email.
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-800 self-center" />
              </button>

              {/* Option B: Security Question */}
              <button
                type="button"
                onClick={() => handleSelectAlternativeMethod("security_question")}
                disabled={loading}
                data-testid="recovery-security-btn"
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left flex items-start gap-3.5 group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-purple-800 transition-colors">
                    Answer Security Question
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Answer your security question for instant password reset.
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-purple-800 self-center" />
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors mt-2"
              >
                Back to Primary Email OTP
              </button>
            </div>
          )}

          {/* STEP 4: Secondary Email / Security Question Verification */}
          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              {method === "secondary_email" && (
                <div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 mb-3">
                    <div className="font-bold flex items-center gap-1.5">
                      <Mail size={14} /> Secondary Email Code Sent
                    </div>
                    <div className="text-[11px] mt-0.5 text-emerald-800">
                      {statusMsg || "We sent an OTP reset code to your secondary email."}
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    6-Digit Secondary Reset Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    data-testid="forgot-secondary-otp-input"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-base tracking-widest font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              )}

              {method === "security_question" && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-700">Security Question</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5 block">{securityQuestion}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Security Answer
                    </label>
                    <input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      data-testid="forgot-security-answer-input"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="Enter security answer"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="forgot-alt-new-password-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="forgot-alt-confirm-password-input"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 py-3 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="forgot-alt-reset-submit-btn"
                  className="flex-1 py-3 rounded-2xl bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>{loading ? "Resetting..." : "Reset Password"}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Success Confirmation */}
          {step === 5 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-xl">Password Reset Complete!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your password has been updated. You can now log in with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                data-testid="forgot-login-now-btn"
                className="w-full py-3.5 rounded-2xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20"
              >
                Sign In Now
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
