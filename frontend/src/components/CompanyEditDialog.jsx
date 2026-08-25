import React, { useEffect, useState } from "react";
import { X, Info } from "lucide-react";
import { MediaUploader, SingleImageUploader } from "./MediaUploader";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

export const CompanyEditDialog = ({ open, onClose, onSaved, company }) => {
  const [form, setForm] = useState({});
  const [logo, setLogo] = useState("");
  const [cover, setCover] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certs, setCerts] = useState("");

  useEffect(() => {
    if (open && company) {
      setForm({
        name: company.name || "",
        description: company.description || "",
        location: company.location || "",
        category: company.category || "",
        mobile: company.mobile || "",
        whatsapp: company.whatsapp || "",
        email: company.email || "",
        website: company.website || "",
        owner_name: company.owner_name || "",
        gst: company.gst || "",
        pan: company.pan || "",
        business_type: company.business_type || "",
        year_established: company.year_established || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        pincode: company.pincode || "",
        employees: company.employees || "",
      });
      setLogo(company.logo_url || "");
      setCover(company.cover_url || "");
      setCerts((company.certifications || []).join(", "));
    }
  }, [open, company]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error("Company name is required");
    if (!form.owner_name?.trim()) return toast.error("Owner name is required");
    if (!form.mobile?.trim()) return toast.error("Phone number is required for Shiprocket pickup");
    if (!form.email?.trim()) return toast.error("Email is required for Shiprocket pickup");
    if (!form.address?.trim()) return toast.error("Street Address / Factory Unit is required for Shiprocket pickup");
    if (!form.city?.trim()) return toast.error("City is required for Shiprocket pickup");
    if (!form.state?.trim()) return toast.error("State is required for Shiprocket pickup");
    if (!form.pincode?.trim() || form.pincode.trim().length !== 6 || !/^\d{6}$/.test(form.pincode.trim())) {
      return toast.error("Valid 6-Digit Warehouse Pincode is required for Shiprocket logistics");
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        logo_url: logo || null,
        cover_url: cover || null,
        year_established: form.year_established ? Number(form.year_established) : null,
        certifications: certs.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await api.patch(`/companies/${company.id}`, payload);
      if (res.data?.shiprocket_warning) {
        toast.warning(`Profile updated. Shiprocket Warning: ${res.data.shiprocket_warning}`);
      } else {
        toast.success("Profile & Shiprocket pickup location saved");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" data-testid="company-edit-dialog" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg text-slate-900">Edit Company Profile</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" data-testid="company-edit-close"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {/* Cover */}
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cover Banner</label>
          <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-200">
            <SingleImageUploader url={cover} onChange={setCover} folder="iip/covers" testid="company-cover-uploader" className="w-full h-full" label="Upload Cover" />
          </div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Logo</label>
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200">
            <SingleImageUploader url={logo} onChange={setLogo} folder="iip/logos" testid="company-logo-uploader" className="w-full h-full" label="Logo" />
          </div>

          <Section title="Basic">
            <Row label="Company name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="ce-name" />
            <Row label="Owner name" required value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} testid="ce-owner" />
            <Row label="Description" textarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} testid="ce-desc" />
            <Row label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} testid="ce-cat" />
            <Row label="Business type" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} testid="ce-btype" placeholder="Manufacturer / Supplier / Distributor" />
            <div className="grid grid-cols-2 gap-3">
              <Row label="Year established" value={form.year_established} onChange={(v) => setForm({ ...form, year_established: v })} testid="ce-year" type="number" />
              <Row label="Employees" value={form.employees} onChange={(v) => setForm({ ...form, employees: v })} testid="ce-emp" placeholder="e.g. 50-100" />
            </div>
          </Section>

          <Section title="Contact">
            <Row label="Phone" required value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} testid="ce-mobile" />
            <Row label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} testid="ce-wa" />
            <Row label="Email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="ce-email" />
            <Row label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} testid="ce-web" />
          </Section>

          <Section title="Shiprocket Warehouse & Pickup Location">
            <p className="text-[11px] text-slate-500 mb-2">Used by Shiprocket couriers for direct factory/shop pickup and rate calculation.</p>
            <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-950">
                <Info size={14} className="text-blue-600 shrink-0" /> Shiprocket Pickup Verification Policy
              </div>
              <p className="leading-relaxed text-blue-800">
                Shiprocket mandates 1-time OTP verification for new warehouse addresses. After saving, log into your <strong>Shiprocket Panel → Settings → Pickup Addresses</strong> to verify the OTP for this location so couriers pick up directly from your factory.
              </p>
            </div>
            <Row label="Street Address / Factory Unit" required textarea value={form.address} onChange={(v) => setForm({ ...form, address: v })} testid="ce-addr" placeholder="Unit 4B, Sector 58, Industrial Estate" />
            <div className="grid grid-cols-2 gap-3">
              <Row label="City" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} testid="ce-city" placeholder="e.g. New Delhi" />
              <Row label="State" required value={form.state} onChange={(v) => setForm({ ...form, state: v })} testid="ce-state" placeholder="e.g. Delhi" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Row label="6-Digit Warehouse Pincode" required value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} testid="ce-pincode" placeholder="110020" />
              <Row label="City / Region Summary" value={form.location} onChange={(v) => setForm({ ...form, location: v })} testid="ce-loc" placeholder="New Delhi, India" />
            </div>
          </Section>

          <Section title="Compliance">
            <Row label="GST Number" value={form.gst} onChange={(v) => setForm({ ...form, gst: v })} testid="ce-gst" />
            <Row label="PAN Number" value={form.pan} onChange={(v) => setForm({ ...form, pan: v })} testid="ce-pan" />
            <Row label="Certifications (comma separated)" value={certs} onChange={setCerts} testid="ce-certs" placeholder="ISO 9001:2015, BIS Certified" />
          </Section>

          <button type="submit" disabled={submitting} data-testid="company-save-btn" className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60">
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="pt-2 border-t border-slate-100">
    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 mb-2 mt-2">{title}</div>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const Row = ({ label, value, onChange, textarea, required, type = "text", placeholder, testid }) => (
  <div>
    <label className="text-[11px] font-semibold text-slate-600">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {textarea ? (
      <textarea
        rows={2} value={value || ""} required={required}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        data-testid={testid}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    ) : (
      <input
        value={value || ""} required={required} type={type}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        data-testid={testid}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    )}
  </div>
);
