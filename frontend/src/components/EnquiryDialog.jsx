import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, INDUSTRIAL_LOCATIONS } from "../lib/constants";

export const EnquiryDialog = ({ open, onClose, companyId, postId, defaultCategory, companyName }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    requirement: "",
    category: defaultCategory || CATEGORIES[0],
    location: INDUSTRIAL_LOCATIONS[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        name: user?.name || "",
        mobile: user?.mobile || "",
        category: defaultCategory || f.category || CATEGORIES[0],
        location: f.location || INDUSTRIAL_LOCATIONS[0],
      }));

      if (user?.company_id) {
        api.get(`/companies/${user.company_id}`)
          .then((res) => {
            if (res.data && res.data.location) {
              // Match location if exists, or keep standard location
              const matched = INDUSTRIAL_LOCATIONS.find((loc) =>
                loc.toLowerCase().includes((res.data.location || "").toLowerCase())
              );
              setForm((f) => ({ ...f, location: matched || res.data.location || INDUSTRIAL_LOCATIONS[0] }));
            }
          })
          .catch(() => {});
      }
    }
  }, [open, user, defaultCategory]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/enquiries", { ...form, company_id: companyId, post_id: postId });
      toast.success("Enquiry sent! The business will contact you shortly.");
      onClose?.();
      setForm({
        name: user?.name || "",
        mobile: user?.mobile || "",
        requirement: "",
        category: defaultCategory || CATEGORIES[0],
        location: INDUSTRIAL_LOCATIONS[0],
      });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to send enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4"
      data-testid="enquiry-dialog-portal"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Send Enquiry</h3>
            {companyName && <p className="text-xs text-slate-500">to {companyName}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            data-testid="enquiry-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Your Name
            </label>
            <input
              required
              readOnly
              value={form.name}
              data-testid="enquiry-name-input"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 cursor-not-allowed focus:outline-none"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Mobile Number
            </label>
            <input
              required
              readOnly
              value={form.mobile}
              data-testid="enquiry-mobile-input"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 cursor-not-allowed focus:outline-none"
              placeholder="91XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Requirement Description
            </label>
            <textarea
              required
              rows={3}
              value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              data-testid="enquiry-requirement-input"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Describe product specifications, quantity, or service details..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                data-testid="enquiry-category-select"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Industrial Location
              </label>
              <select
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                data-testid="enquiry-location-select"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {INDUSTRIAL_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="enquiry-submit-btn"
            className="w-full mt-2 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-md shadow-orange-600/20"
          >
            {submitting ? "Sending..." : "Submit Enquiry"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
