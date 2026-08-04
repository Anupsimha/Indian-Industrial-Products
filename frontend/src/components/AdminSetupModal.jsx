import React, { useState } from "react";
import { ShieldAlert, KeyRound, Mail, Lock, HelpCircle, Save, CheckCircle2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "In what city were you born?",
  "What was the model of your first vehicle?",
  "What is your favorite industrial machine brand?"
];

export const AdminSetupModal = ({ open, onClose }) => {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState(user?.secondary_email || "");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !user || user.role !== "admin") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (!securityAnswer.trim()) {
      toast.error("Please answer the security question");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/auth/admin-setup", {
        email,
        password,
        secondary_email: secondaryEmail || null,
        security_question: securityQuestion,
        security_answer: securityAnswer
      });

      if (res.data?.user) {
        updateUser(res.data.user);
      }
      toast.success(res.data?.message || "Admin security credentials configured!");
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update admin security setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4" data-testid="admin-setup-modal">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3 className="font-display font-black text-slate-900 text-lg">Admin Security Setup Required</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure your primary credentials, recovery email, and security question.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Primary Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail size={14} className="text-blue-800" /> Admin Primary Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-primary-email-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="admin@yourdomain.com"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <KeyRound size={14} className="text-blue-800" /> New Secure Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-password-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="••••••••••••"
            />
          </div>

          {/* Secondary / Recovery Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail size={14} className="text-emerald-600" /> Secondary / Recovery Email
            </label>
            <input
              type="email"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
              data-testid="admin-secondary-email-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="backup@yourdomain.com (optional)"
            />
          </div>

          {/* Security Question */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-purple-600" /> Security Question
            </label>
            <select
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              data-testid="admin-security-question-select"
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
              required
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              data-testid="admin-security-answer-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Your answer (case-insensitive)"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              data-testid="admin-setup-submit-btn"
              className="w-full py-3 rounded-xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <Save size={16} />
              <span>{saving ? "Saving Security Setup..." : "Save Admin Credentials"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
