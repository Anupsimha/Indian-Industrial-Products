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
      toast.success("Welcome back!");
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
          <h1 className="mt-3 font-display text-2xl font-bold text-slate-900">Welcome to IIP</h1>
          <p className="text-xs text-slate-500">Engineering Tomorrow, Together.</p>
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
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
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
          <p className="text-[10px] text-center text-slate-400">
            Demo: rajesh@bharatsteel.com / demo123
          </p>
        </form>
      </div>
    </div>
  );
}
