import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, CheckCircle2, RefreshCw, ShieldCheck, ArrowRight, Lock, ArrowLeft, AlertTriangle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";

export default function VerifyOtpPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || user?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showExitModal, setShowExitModal] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split("");
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter complete 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp: code });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      toast.success(res.data?.message || "Account verified successfully!");
      navigate("/complete-profile", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired OTP code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    try {
      const res = await api.post("/auth/resend-otp", { email });
      toast.success(res.data?.message || "New OTP code sent to your email!");
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleConfirmExit = async () => {
    try {
      await logout();
      toast.message("Signed out of unverified session.");
    } catch (e) {}
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" data-testid="verify-otp-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Custom Back Button triggers Exit Confirmation Dialog */}
        <button
          type="button"
          onClick={() => setShowExitModal(true)}
          data-testid="verify-otp-back-btn"
          className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-all"
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6 text-center">
          
          <div className="w-16 h-16 bg-blue-50 text-blue-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={32} />
          </div>

          <div>
            <h2 className="font-display text-2xl font-black text-slate-900">Verify Your Email</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              We sent a 6-digit OTP confirmation code to <span className="font-bold text-slate-800">{email || "your email"}</span>
            </p>
          </div>

          {/* 6 Digit OTP Inputs */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  data-testid={`otp-input-${idx}`}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center font-display text-xl font-extrabold rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all shadow-2xs"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length < 6}
              data-testid="verify-otp-submit-btn"
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={timer > 0 || resending}
              data-testid="resend-otp-btn"
              className="font-bold text-blue-800 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={12} className={resending ? "animate-spin" : ""} />
              {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
            </button>
          </div>

        </div>
      </div>

      {/* Confirmation Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" data-testid="exit-otp-modal">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg">Cancel Verification?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                If you leave without verifying your email, you will be signed out of your unverified account.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmExit}
                data-testid="confirm-exit-btn"
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
              >
                Yes, Sign Out &amp; Return Home
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Continue Verification
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
