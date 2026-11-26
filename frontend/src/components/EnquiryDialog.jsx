import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { X, Package, Wrench, Building2, Briefcase } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { INDUSTRIAL_LOCATIONS } from "../lib/constants";
import { useCategories } from "../hooks/useCategories";

const LEAD_TYPE_TABS = [
  { id: "product", label: "Product", icon: Package, activeCls: "bg-blue-600 text-white border-blue-600 shadow-xs" },
  { id: "service", label: "Service", icon: Wrench, activeCls: "bg-teal-600 text-white border-teal-600 shadow-xs" },
  { id: "real_estate", label: "Real Estate", icon: Building2, activeCls: "bg-purple-600 text-white border-purple-600 shadow-xs" },
  { id: "dealership", label: "Dealership", icon: Briefcase, activeCls: "bg-amber-600 text-white border-amber-600 shadow-xs" },
];

const PROPERTY_TYPES = [
  "Industrial Plot",
  "Factory Shed",
  "Warehouse / Godown",
  "Commercial Space",
  "Agricultural / Land",
  "Other",
];

const TRANSACTION_TYPES = ["Buy", "Rent", "Lease"];
const AREA_UNITS = ["sq.ft", "sq.m", "Acres", "Sq. Yards"];
const SERVICE_MODES = ["On-site", "Remote", "Both"];

const normalizeLeadType = (val) =>
  ["product", "service", "real_estate", "dealership"].includes(val) ? val : "product";

export const EnquiryDialog = ({
  open,
  onClose,
  companyId,
  postId,
  defaultCategory,
  companyName,
  defaultLeadType = "product",
  productName,
}) => {
  const { user } = useAuth();
  const { categories, loading: categoriesLoading, getOptions } = useCategories();
  const [leadType, setLeadType] = useState(() => normalizeLeadType(defaultLeadType));
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    requirement: "",
    category: defaultCategory || "",
    location: INDUSTRIAL_LOCATIONS[0],
  });
  const [serviceMeta, setServiceMeta] = useState({
    service_name: "",
    service_mode: "On-site",
    project_duration: "",
  });
  const [realEstateMeta, setRealEstateMeta] = useState({
    property_type: "Industrial Plot",
    transaction_type: "Buy",
    area_size: "",
    area_unit: "sq.ft",
  });
  const [dealershipMeta, setDealershipMeta] = useState({
    territory_region: "",
    investment_budget: "",
    business_experience: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLeadType(normalizeLeadType(defaultLeadType));
      setServiceMeta({
        service_name: "",
        service_mode: "On-site",
        project_duration: "",
      });
      setRealEstateMeta({
        property_type: "Industrial Plot",
        transaction_type: "Buy",
        area_size: "",
        area_unit: "sq.ft",
      });
      setDealershipMeta({
        territory_region: "",
        investment_budget: "",
        business_experience: "",
      });
      setForm((f) => ({
        ...f,
        name: user?.name || "",
        mobile: user?.mobile || "",
        category: defaultCategory || f.category || categories[0] || "",
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
  }, [open, user, defaultCategory, defaultLeadType]);

  useEffect(() => {
    if (open && !form.category && categories.length > 0) {
      setForm((f) => (f.category ? f : { ...f, category: defaultCategory || categories[0] }));
    }
  }, [open, categories, defaultCategory, form.category]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let leadMetadata = {};
      let computedProductName = productName || undefined;
      let computedQuantity;

      if (leadType === "service") {
        const svcName = serviceMeta.service_name.trim() || productName || "";
        const duration = serviceMeta.project_duration.trim();
        if (svcName) computedProductName = svcName;
        if (duration) computedQuantity = duration;
        leadMetadata = {
          ...(svcName ? { service_name: svcName } : {}),
          service_mode: serviceMeta.service_mode || "On-site",
          ...(duration ? { project_duration: duration } : {}),
        };
      } else if (leadType === "real_estate") {
        const areaTrimmed = realEstateMeta.area_size.trim();
        computedProductName = `${realEstateMeta.transaction_type} - ${realEstateMeta.property_type}`;
        if (areaTrimmed) computedQuantity = `${areaTrimmed} ${realEstateMeta.area_unit}`;
        leadMetadata = {
          property_type: realEstateMeta.property_type,
          transaction_type: realEstateMeta.transaction_type,
          area_unit: realEstateMeta.area_unit,
          ...(areaTrimmed ? { area_size: areaTrimmed } : {}),
        };
      } else if (leadType === "dealership") {
        const territory = dealershipMeta.territory_region.trim();
        const investment = dealershipMeta.investment_budget.trim();
        const experience = dealershipMeta.business_experience.trim();
        computedProductName = productName || (territory ? `Dealership - ${territory}` : "Dealership Enquiry");
        leadMetadata = {
          ...(territory ? { territory_region: territory } : {}),
          ...(investment ? { investment_budget: investment } : {}),
          ...(experience ? { business_experience: experience } : {}),
        };
      }

      await api.post("/enquiries", {
        ...form,
        company_id: companyId,
        post_id: postId,
        lead_type: leadType,
        lead_metadata: leadMetadata,
        ...(computedProductName ? { product_name: computedProductName } : {}),
        ...(computedQuantity ? { quantity: computedQuantity } : {}),
      });
      toast.success("Enquiry sent! The business will contact you shortly.");
      onClose?.();
      setLeadType(normalizeLeadType(defaultLeadType));
      setServiceMeta({
        service_name: "",
        service_mode: "On-site",
        project_duration: "",
      });
      setRealEstateMeta({
        property_type: "Industrial Plot",
        transaction_type: "Buy",
        area_size: "",
        area_unit: "sq.ft",
      });
      setDealershipMeta({
        territory_region: "",
        investment_budget: "",
        business_experience: "",
      });
      setForm({
        name: user?.name || "",
        mobile: user?.mobile || "",
        requirement: "",
        category: defaultCategory || categories[0] || "",
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
            <h3 className="font-display font-bold text-lg text-slate-900">
              {leadType === "dealership" ? "Dealership Enquiry" : "Send Enquiry"}
            </h3>
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
          {/* Compact Lead Type Pill Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Enquiry Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="enquiry-lead-type-selector">
              {LEAD_TYPE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = leadType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLeadType(tab.id)}
                    data-testid={`enquiry-lead-type-${tab.id}`}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                      active
                        ? tab.activeCls
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

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

          {leadType === "service" && (
            <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 space-y-2.5" data-testid="enquiry-service-fields">
              <div>
                <label className="block text-[11px] font-semibold text-teal-900 uppercase tracking-wider mb-1">
                  Service Title (Optional)
                </label>
                <input
                  value={serviceMeta.service_name}
                  onChange={(e) => setServiceMeta({ ...serviceMeta, service_name: e.target.value })}
                  data-testid="enquiry-service-name-input"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  placeholder="e.g. Plant Calibration & AMC"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 uppercase tracking-wider mb-1">
                    Service Mode
                  </label>
                  <select
                    value={serviceMeta.service_mode}
                    onChange={(e) => setServiceMeta({ ...serviceMeta, service_mode: e.target.value })}
                    data-testid="enquiry-service-mode-select"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300"
                  >
                    {SERVICE_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 uppercase tracking-wider mb-1">
                    Duration (Optional)
                  </label>
                  <input
                    value={serviceMeta.project_duration}
                    onChange={(e) => setServiceMeta({ ...serviceMeta, project_duration: e.target.value })}
                    data-testid="enquiry-service-duration-input"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
                    placeholder="e.g. 6 Months"
                  />
                </div>
              </div>
            </div>
          )}

          {leadType === "real_estate" && (
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2.5" data-testid="enquiry-real-estate-fields">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 uppercase tracking-wider mb-1">
                    Property Type
                  </label>
                  <select
                    value={realEstateMeta.property_type}
                    onChange={(e) => setRealEstateMeta({ ...realEstateMeta, property_type: e.target.value })}
                    data-testid="enquiry-property-type-select"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 uppercase tracking-wider mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={realEstateMeta.transaction_type}
                    onChange={(e) => setRealEstateMeta({ ...realEstateMeta, transaction_type: e.target.value })}
                    data-testid="enquiry-transaction-type-select"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {TRANSACTION_TYPES.map((tx) => (
                      <option key={tx} value={tx}>{tx}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-900 uppercase tracking-wider mb-1">
                  Area / Size
                </label>
                <div className="flex gap-2">
                  <input
                    value={realEstateMeta.area_size}
                    onChange={(e) => setRealEstateMeta({ ...realEstateMeta, area_size: e.target.value })}
                    data-testid="enquiry-area-size-input"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g. 5000"
                  />
                  <select
                    value={realEstateMeta.area_unit}
                    onChange={(e) => setRealEstateMeta({ ...realEstateMeta, area_unit: e.target.value })}
                    data-testid="enquiry-area-unit-select"
                    className="w-24 shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {AREA_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {leadType === "dealership" && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-2.5" data-testid="enquiry-dealership-fields">
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-1">
                  Preferred Territory / Region
                </label>
                <input
                  value={dealershipMeta.territory_region}
                  onChange={(e) => setDealershipMeta({ ...dealershipMeta, territory_region: e.target.value })}
                  data-testid="enquiry-dealership-territory-input"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="e.g. Maharashtra / Pune District"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-1">
                    Investment Capacity
                  </label>
                  <input
                    value={dealershipMeta.investment_budget}
                    onChange={(e) => setDealershipMeta({ ...dealershipMeta, investment_budget: e.target.value })}
                    data-testid="enquiry-dealership-investment-input"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="e.g. ₹10-25 Lakh"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-1">
                    Experience
                  </label>
                  <input
                    value={dealershipMeta.business_experience}
                    onChange={(e) => setDealershipMeta({ ...dealershipMeta, business_experience: e.target.value })}
                    data-testid="enquiry-dealership-experience-input"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="e.g. 5+ Years B2B"
                  />
                </div>
              </div>
            </div>
          )}

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
              placeholder={
                leadType === "service"
                  ? "Describe service scope, timeline, site requirements..."
                  : leadType === "real_estate"
                  ? "Describe location preference, power load, road access, lease terms..."
                  : leadType === "dealership"
                  ? "Describe your distribution network, warehouse setup, target territory & dealership interest..."
                  : "Describe product specifications, quantity, or service details..."
              }
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
                {!form.category && (
                  <option value="">
                    {categoriesLoading ? "Loading categories..." : "Select Category..."}
                  </option>
                )}
                {getOptions(form.category).map((cat) => (
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
            {submitting
              ? "Sending..."
              : leadType === "dealership"
              ? "Submit Dealership Enquiry"
              : "Submit Enquiry"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
