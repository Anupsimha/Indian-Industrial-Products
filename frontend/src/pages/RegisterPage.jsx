import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Logo } from "../components/Logo";
import { toast } from "sonner";

const roles = [
  { id: "manufacturer", label: "Manufacturer" },
  { id: "supplier", label: "Supplier" },
  { id: "buyer", label: "Buyer" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", password: "", role: "buyer", company_name: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await register(form);
      toast.success("Account created! Please verify the OTP sent to your email.");
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (e2) {
      const respData = e2.response?.data;
      const status = e2.response?.status;
      let msg = "Registration failed. Please try again.";

      if (respData?.detail) {
        msg = formatApiError(respData.detail);
      } else if (respData?.message) {
        msg = respData.message;
      } else if (status === 500) {
        msg = "Server error — please try again in a moment.";
      } else if (status === 400) {
        msg = respData ? JSON.stringify(respData) : "Invalid registration details.";
      } else if (e2.message) {
        msg = e2.message;
      }

      console.error("[RegisterPage] Registration error:", { status, data: respData, err: e2 });
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isBusiness = form.role === "manufacturer" || form.role === "supplier";

  return (
    <div className="min-h-[100dvh] grid place-items-center px-4 py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <div className="flex flex-col items-center mb-4">
          <Logo size={48} withText={false} />
          <h1 className="mt-2 font-display text-xl font-bold text-slate-900">Create your IIP account</h1>
        </div>
        <form onSubmit={submit} className="space-y-3" data-testid="register-form">
          <div className="grid grid-cols-3 gap-2" data-testid="role-selector">
            {roles.map((r) => (
              <button
                type="button" key={r.id}
                onClick={() => setForm({ ...form, role: r.id })}
                data-testid={`role-${r.id}-btn`}
                className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  form.role === r.id
                    ? "bg-blue-800 text-white border-blue-800"
                    : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name" data-testid="register-name-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email" data-testid="register-email-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="Mobile (91XXXXXXXXXX)" data-testid="register-mobile-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password" data-testid="register-password-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          {isBusiness && (
            <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Company name" data-testid="register-company-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          )}
          {err && <div className="text-xs text-rose-600 bg-rose-50 rounded-md p-2" data-testid="register-error">{err}</div>}
          <button type="submit" disabled={loading} data-testid="register-submit-btn"
            className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60">
            {loading ? "Creating..." : "Create account"}
          </button>
          <p className="text-xs text-center text-slate-500">
            Have an account?{" "}
            <Link to="/login" className="font-semibold text-blue-800" data-testid="login-link">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
