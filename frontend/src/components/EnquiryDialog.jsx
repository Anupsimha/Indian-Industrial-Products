import React, { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { X } from "lucide-react";

export const EnquiryDialog = ({ open, onClose, companyId, postId, defaultCategory, companyName }) => {
  const [form, setForm] = useState({
    name: "", mobile: "", requirement: "", category: defaultCategory || "", location: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, category: defaultCategory || f.category }));
    }
  }, [open, defaultCategory]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/enquiries", { ...form, company_id: companyId, post_id: postId });
      toast.success("Enquiry sent! The business will contact you shortly.");
      onClose?.();
      setForm({ name: "", mobile: "", requirement: "", category: defaultCategory || "", location: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      data-testid="enquiry-dialog"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Send Enquiry</h3>
            {companyName && <p className="text-xs text-slate-500">to {companyName}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" data-testid="enquiry-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</label>
            <input
              required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="enquiry-name-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Mobile</label>
            <input
              required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              data-testid="enquiry-mobile-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="91XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Requirement</label>
            <textarea
              required rows={3} value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              data-testid="enquiry-requirement-input"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Describe what you need..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</label>
              <input
                required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                data-testid="enquiry-category-input"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. Steel"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Location</label>
              <input
                required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                data-testid="enquiry-location-input"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="City, State"
              />
            </div>
          </div>
          <button
            type="submit" disabled={submitting} data-testid="enquiry-submit-btn"
            className="w-full mt-2 py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Submit Enquiry"}
          </button>
        </form>
      </div>
    </div>
  );
};
