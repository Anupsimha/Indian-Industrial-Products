import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Logo } from "../components/Logo";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("rajesh@bharatsteel.com");
  const [password, setPassword] = useState("demo123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <div className="flex flex-col items-center mb-5">
          <Logo size={56} withText={false} />
          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-blue-950 tracking-tight text-center">
            Welcome to <span className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-600 bg-clip-text text-transparent">IIP</span>
          </h1>
          <p className="mt-1 text-xs text-center font-semibold leading-relaxed">
            <span className="text-orange-600 font-extrabold uppercase tracking-wider text-[11px]">Indian Industrial Platform</span>{" "}
            <span className="text-slate-800 font-medium">Marketplace & Business Network.</span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3" data-testid="login-form">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email or Mobile</label>
            <input
              required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              data-testid="login-identifier-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="email@example.com or 91XXXXXXXXXX"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-xs text-blue-800 font-semibold hover:underline" data-testid="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <input
              required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {err && <div className="text-xs text-rose-600 bg-rose-50 rounded-md p-2" data-testid="login-error">{err}</div>}
          <button
            type="submit" disabled={loading} data-testid="login-submit-btn"
            className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-xs text-center text-slate-500">
            New to IIP?{" "}
            <Link to="/register" className="font-semibold text-blue-800" data-testid="register-link">Create account</Link>
          </p>
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-center">
            <button
              type="button"
              onClick={() => {
                setIdentifier("demo@iip.com");
                setPassword("DemoUser@123");
                toast.success("Loaded Razorpay Reviewer Demo Account!");
              }}
              data-testid="fill-demo-reviewer-btn"
              className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-colors border border-blue-200"
            >
              Fill Reviewer Demo Account
            </button>
            <p className="text-[10px] text-slate-400">
              Demo: demo@iip.com / DemoUser@123
            </p>
          </div>
        </form>
      </div>

      <div className="mt-4 text-[11px] text-center text-slate-400 flex justify-center gap-3">
        <Link to="/contact" className="hover:text-slate-600">Contact Us</Link>
        <span>•</span>
        <Link to="/terms" className="hover:text-slate-600">Terms</Link>
        <span>•</span>
        <Link to="/privacy" className="hover:text-slate-600">Privacy</Link>
        <span>•</span>
        <Link to="/refund-policy" className="hover:text-slate-600">Refunds</Link>
      </div>
    </div>
  );

}
