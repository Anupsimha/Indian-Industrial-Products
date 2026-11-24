import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Wrench, Award, Clock, Globe } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useCategories } from "../hooks/useCategories";
import { MediaUploader } from "./MediaUploader";

const PRICING_MODELS = [
  "Custom Quote",
  "Fixed",
  "Starting From",
  "Per Hour",
  "Per Project",
];

const SERVICE_MODES = ["On-site", "Remote", "Both"];

const EMPTY_FORM = {
  name: "",
  category: "",
  pricing_model: "Custom Quote",
  price_range: "",
  service_mode: "On-site",
  service_area: "",
  turnaround_time: "",
  experience_years: "",
  certifications: "",
  location: "",
  description: "",
};

export const ServiceDialog = ({ open, onClose, onSaved, initial }) => {
  const isEdit = !!initial;
  const { loading: categoriesLoading, getOptions } = useCategories();
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        category: initial?.category || "",
        pricing_model: initial?.pricing_model || "Custom Quote",
        price_range: initial?.price_range || "",
        service_mode: initial?.service_mode || "On-site",
        service_area: initial?.service_area || "",
        turnaround_time: initial?.turnaround_time || "",
        experience_years:
          initial?.experience_years !== undefined && initial?.experience_years !== null
            ? String(initial.experience_years)
            : "",
        certifications: Array.isArray(initial?.certifications)
          ? initial.certifications.join(", ")
          : "",
        location: initial?.location || "",
        description: initial?.description || "",
      });

      const imgs = initial
        ? [initial.image_url, ...(initial.images || [])]
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((u) => ({ url: u, resource_type: "image" }))
        : [];
      setImages(imgs);
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim()) {
      toast.error("Service name and category are required");
      return;
    }

    setSubmitting(true);
    try {
      const parsedExp =
        form.experience_years !== "" && form.experience_years !== null
          ? parseInt(form.experience_years, 10)
          : null;

      const certsArray = form.certifications
        ? form.certifications
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        pricing_model: form.pricing_model || "Custom Quote",
        price_range: form.price_range.trim() || null,
        service_mode: form.service_mode || "On-site",
        service_area: form.service_area.trim() || null,
        turnaround_time: form.turnaround_time.trim() || null,
        experience_years: Number.isNaN(parsedExp) ? null : parsedExp,
        certifications: certsArray,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        image_url: images[0]?.url || null,
        images: images.slice(1).map((m) => m.url),
      };

      if (isEdit) {
        await api.patch(`/services/${initial.id}`, payload);
        toast.success("Service updated!");
        onSaved?.();
        onClose?.();
      } else {
        await api.post("/services", payload);
        toast.success("Service published!");
        onSaved?.();
        if (addAnother) {
          setForm({
            ...EMPTY_FORM,
            category: form.category,
            location: form.location,
            service_mode: form.service_mode,
          });
          setImages([]);
        } else {
          onClose?.();
        }
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      data-testid="service-dialog"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-fade-up max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <Wrench size={17} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 leading-tight">
                {isEdit ? "Edit Service" : "Publish Service"}
              </h3>
              <p className="text-xs text-slate-500">
                List your industrial or B2B service capability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="service-dialog-close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Images via MediaUploader */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
              Service Photos
              <span className="text-slate-400 normal-case font-normal ml-1">(optional, first is cover)</span>
            </label>
            <MediaUploader
              value={images}
              onChange={setImages}
              accept="image/*"
              folder="iip/services"
              maxItems={6}
              label="Add Photo"
              testid="service-media"
            />
          </div>

          {/* Service Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Service Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. CNC Precision Machining & Fabrication"
              data-testid="service-name-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="service-category-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            >
              <option value="">
                {categoriesLoading ? "Loading categories..." : "Select Category..."}
              </option>
              {getOptions(form.category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Model & Price Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Pricing Model
              </label>
              <select
                value={form.pricing_model}
                onChange={(e) => setForm({ ...form, pricing_model: e.target.value })}
                data-testid="service-pricing-model-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              >
                {PRICING_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Price / Rate Range
              </label>
              <input
                value={form.price_range}
                onChange={(e) => setForm({ ...form, price_range: e.target.value })}
                placeholder="e.g. ₹1,500 - ₹5,000/hr"
                data-testid="service-price-range-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Service Mode & Years of Experience */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Service Mode
              </label>
              <select
                value={form.service_mode}
                onChange={(e) => setForm({ ...form, service_mode: e.target.value })}
                data-testid="service-mode-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              >
                {SERVICE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                placeholder="e.g. 10"
                data-testid="service-experience-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Service Coverage Area & Turnaround / SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Coverage Area
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Globe size={14} />
                </span>
                <input
                  value={form.service_area}
                  onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                  placeholder="e.g. Pan India"
                  data-testid="service-area-input"
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Turnaround / SLA
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Clock size={14} />
                </span>
                <input
                  value={form.turnaround_time}
                  onChange={(e) => setForm({ ...form, turnaround_time: e.target.value })}
                  placeholder="e.g. 48 Hours"
                  data-testid="service-turnaround-input"
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Location
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin size={15} />
              </span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Pune, Maharashtra"
                data-testid="service-location-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Certifications
              <span className="text-slate-400 font-normal ml-1">(comma-separated)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Award size={15} />
              </span>
              <input
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="e.g. ISO 9001, NABL, CE Certified"
                data-testid="service-certifications-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe service scope, equipment/tooling capabilities, SLA guarantees..."
              data-testid="service-desc-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="submit"
              onClick={() => setAddAnother(false)}
              disabled={submitting}
              data-testid="service-save-btn"
              className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60 transition-all active:scale-95 shadow-md text-sm"
            >
              {submitting && !addAnother
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Publish & Close"}
            </button>

            {!isEdit && (
              <button
                type="submit"
                onClick={() => setAddAnother(true)}
                disabled={submitting}
                data-testid="service-save-another-btn"
                className="w-full py-3 rounded-full bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60 transition-all active:scale-[0.98] shadow-sm text-sm"
              >
                {submitting && addAnother ? "Publishing..." : "Publish & Add Another"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ServiceDialog;
