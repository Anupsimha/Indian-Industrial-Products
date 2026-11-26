import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Send, FileText, Upload, Trash2, CheckCircle2, ChevronDown, ListTodo, Briefcase, IndianRupee, ShieldCheck, Wallet, Package, Wrench, Building2 } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";
import { useCategories } from "../hooks/useCategories";

const LEAD_TYPE_OPTIONS = [
  {
    id: "product",
    label: "Product Lead",
    subtitle: "Machinery, raw materials & goods",
    icon: Package,
    activeCls: "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20",
    iconActiveCls: "bg-blue-600 text-white",
  },
  {
    id: "service",
    label: "Service Lead",
    subtitle: "AMC, fabrication, logistics & audit",
    icon: Wrench,
    activeCls: "border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-500/20",
    iconActiveCls: "bg-teal-600 text-white",
  },
  {
    id: "real_estate",
    label: "Real Estate Lead",
    subtitle: "Plots, factory sheds & warehouses",
    icon: Building2,
    activeCls: "border-purple-600 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20",
    iconActiveCls: "bg-purple-600 text-white",
  },
  {
    id: "dealership",
    label: "Dealership Lead",
    subtitle: "Authorized dealers & distributors",
    icon: Briefcase,
    activeCls: "border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20",
    iconActiveCls: "bg-amber-600 text-white",
  },
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

export default function PostEnquiryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSalesPartner = user?.role === "sales_partner";

  const [leadType, setLeadType] = useState("product");
  const [form, setForm] = useState({
    name: "", mobile: "", requirement: "", category: "",
    product_name: "", quantity: "", budget: "₹50,000 - 1 Lakh",
    required_by: "15 Days", total_deal_value: ""
  });
  const [serviceMeta, setServiceMeta] = useState({
    service_name: "",
    service_mode: "On-site",
    project_duration: "",
    scope_details: "",
  });
  const [realEstateMeta, setRealEstateMeta] = useState({
    property_type: "Industrial Plot",
    transaction_type: "Buy",
    area_size: "",
    area_unit: "sq.ft",
    possession_timeline: "",
  });
  const [dealershipMeta, setDealershipMeta] = useState({
    territory_region: "",
    investment_budget: "",
    business_experience: "",
  });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const { loading: categoriesLoading, getOptions } = useCategories();
  const [submitting, setSubmitting] = useState(false);

  // File attachments state — each entry: { file: File, name: string, size: string }
  const [attachments, setAttachments] = useState([]);

  // Suppliers permissions state
  const [supplierTypes, setSupplierTypes] = useState({
    all: true,
    manufacturers: false,
    distributors: false,
    service_providers: false
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newEntries = files.map((file) => ({
      file,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
    setAttachments((prev) => [...prev, ...newEntries]);
    toast.success(`${files.length > 1 ? `${files.length} files` : files[0].name} attached`);
    // reset so same file can be re-added after removal
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    toast.info("Attachment removed");
  };

  const handleSupplierToggle = (key) => {
    setSupplierTypes((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // If toggled 'all', reset others, if toggled others, turn off 'all'
      if (key === "all" && updated.all) {
        return { all: true, manufacturers: false, distributors: false, service_providers: false };
      } else if (key !== "all" && (updated.manufacturers || updated.distributors || updated.service_providers)) {
        return { ...updated, all: false };
      }
      return updated;
    });
  };

  const dealValueNum = Number(form.total_deal_value) || 0;
  const leadValue = Math.round(dealValueNum * 0.02 * 100) / 100;

  const submit = async (e) => {
    e.preventDefault();
    if (!loc.state || !loc.city || !loc.industrial_area) {
      toast.error("Please select State, City and Industrial Area");
      return;
    }
    if (leadType === "service" && !serviceMeta.service_name.trim()) {
      toast.error("Please enter the Service Required / Title");
      return;
    }
    if (leadType === "real_estate" && (!realEstateMeta.property_type || !realEstateMeta.transaction_type)) {
      toast.error("Please select Property Type and Transaction Type");
      return;
    }
    if (isSalesPartner && (!form.total_deal_value || Number(form.total_deal_value) < 100)) {
      toast.error("Please enter a Total Deal Value of at least ₹100");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("mobile", form.mobile);
      fd.append("requirement", form.requirement);
      fd.append("category", form.category);
      fd.append("location", `${loc.industrial_area}, ${loc.city}, ${loc.state}`);
      fd.append("state", loc.state);
      fd.append("city", loc.city);
      fd.append("industrial_area", loc.industrial_area);
      fd.append("lead_type", leadType);

      let computedProductName = form.product_name.trim();
      let computedQuantity = form.quantity.trim();
      let leadMetadata = {};

      if (leadType === "service") {
        const svcName = serviceMeta.service_name.trim();
        const duration = serviceMeta.project_duration.trim();
        const scope = serviceMeta.scope_details.trim();
        computedProductName = svcName;
        computedQuantity = duration;
        leadMetadata = {
          service_name: svcName,
          service_mode: serviceMeta.service_mode || "On-site",
          ...(duration ? { project_duration: duration } : {}),
          ...(scope ? { scope_details: scope } : {}),
        };
      } else if (leadType === "real_estate") {
        const areaTrimmed = realEstateMeta.area_size.trim();
        const possession = realEstateMeta.possession_timeline.trim();
        computedProductName = `${realEstateMeta.transaction_type} - ${realEstateMeta.property_type}`;
        computedQuantity = areaTrimmed ? `${areaTrimmed} ${realEstateMeta.area_unit}` : "";
        leadMetadata = {
          property_type: realEstateMeta.property_type,
          transaction_type: realEstateMeta.transaction_type,
          area_unit: realEstateMeta.area_unit,
          ...(areaTrimmed ? { area_size: areaTrimmed } : {}),
          ...(possession ? { possession_timeline: possession } : {}),
        };
      } else if (leadType === "dealership") {
        const territory = dealershipMeta.territory_region.trim();
        const investment = dealershipMeta.investment_budget.trim();
        const experience = dealershipMeta.business_experience.trim();
        computedProductName = territory ? `Dealership - ${territory}` : "Dealership Enquiry";
        leadMetadata = {
          ...(territory ? { territory_region: territory } : {}),
          ...(investment ? { investment_budget: investment } : {}),
          ...(experience ? { business_experience: experience } : {}),
        };
      }

      fd.append("lead_metadata", JSON.stringify(leadMetadata));
      if (computedProductName) fd.append("product_name", computedProductName);
      if (computedQuantity) fd.append("quantity", computedQuantity);
      if (isSalesPartner) {
        fd.append("total_deal_value", String(form.total_deal_value));
        fd.append("is_sales_partner_lead", "true");
      } else if (form.budget) {
        fd.append("budget", form.budget);
      }
      if (form.required_by) fd.append("required_by", form.required_by);

      // Attach each real File object under the "media" key
      attachments.forEach(({ file }) => {
        if (file) fd.append("media", file);
      });

      await api.post("/enquiries", fd);
      if (isSalesPartner) {
        toast.success("Sales Partner lead posted! Track buyer unlocks and upload bills in Partner Hub.", {
          icon: <CheckCircle2 className="text-emerald-500" size={16} />
        });
        navigate("/sales-partner");
        return;
      }
      toast.success("Requirement posted! Verified suppliers will contact you on your number.", {
        description: "An SMS confirmation has been sent.",
        icon: <CheckCircle2 className="text-emerald-500" size={16} />
      });
      setLeadType("product");
      setForm({
        name: "", mobile: "", requirement: "", category: "",
        product_name: "", quantity: "", budget: "₹50,000 - 1 Lakh",
        required_by: "15 Days", total_deal_value: ""
      });
      setServiceMeta({
        service_name: "",
        service_mode: "On-site",
        project_duration: "",
        scope_details: "",
      });
      setRealEstateMeta({
        property_type: "Industrial Plot",
        transaction_type: "Buy",
        area_size: "",
        area_unit: "sq.ft",
        possession_timeline: "",
      });
      setDealershipMeta({
        territory_region: "",
        investment_budget: "",
        business_experience: "",
      });
      setLoc({ state: "", city: "", industrial_area: "" });
      setAttachments([]);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to post requirement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="post-enquiry-page">
      <BackButton className="mb-2" />

      {/* Header Info Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F294A] to-[#0A1D36] text-white shadow-xl p-5 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/10 text-orange-400">
            {isSalesPartner ? <Briefcase size={20} /> : <ListTodo size={20} />}
          </span>
          <div>
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-300">
              {isSalesPartner ? "Sales Partner Program" : "Post Requirement"}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black mt-0.5">
              {isSalesPartner ? "Post Sales Partner Lead" : "Tell us what you need"}
            </h1>
          </div>
        </div>
        <p className="text-white/75 text-xs sm:text-sm mt-3 leading-relaxed max-w-2xl">
          {isSalesPartner
            ? "Buyers pay 2% of the total deal value (+ 18% GST) to unlock your verified lead. Once you upload the transaction bill and the buyer approves it, you earn 50% of the lead value directly in your wallet."
            : "Your requirement reaches verified manufacturers across India. Get quotes from matching suppliers in minutes."}
        </p>
      </div>

      {/* Requirement Form */}
      <form onSubmit={submit} className="mt-4 bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Lead Type Selector */}
        <div className="border-b border-slate-100 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Select Lead Type</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" data-testid="lead-type-selector">
            {LEAD_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = leadType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLeadType(opt.id)}
                  data-testid={`lead-type-${opt.id}-btn`}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? opt.activeCls
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`grid place-items-center w-9 h-9 rounded-lg shrink-0 transition-colors ${
                      isSelected ? opt.iconActiveCls : "bg-white border border-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Contact Details */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Contact Details</div>
          <div className="flex flex-col gap-3">
            <Row label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="postenq-name-input"
                className={inputCls}
                placeholder="Rahul Sharma"
              />
            </Row>
            <Row label="Mobile">
              <input
                required
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                data-testid="postenq-mobile-input"
                className={inputCls}
                placeholder="91XXXXXXXXXX"
              />
            </Row>
          </div>
        </div>

        {/* Section 2: Product / Service / Property Details */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            {leadType === "service"
              ? "Service Details"
              : leadType === "real_estate"
              ? "Property Details"
              : leadType === "dealership"
              ? "Dealership Details"
              : "Product Details"}
          </div>

          {leadType === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Row label="Product Name">
                <input
                  required
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  data-testid="postenq-product-input"
                  className={inputCls}
                  placeholder="e.g. Mild Steel Plates"
                />
              </Row>
              <Row label="Quantity">
                <input
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  data-testid="postenq-quantity-input"
                  className={inputCls}
                  placeholder="e.g. 5 Tons"
                />
              </Row>
            </div>
          )}

          {leadType === "service" && (
            <div className="space-y-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row label="Service Required / Title">
                  <input
                    required
                    value={serviceMeta.service_name}
                    onChange={(e) => setServiceMeta({ ...serviceMeta, service_name: e.target.value })}
                    data-testid="postenq-service-name-input"
                    className={inputCls}
                    placeholder="e.g. CNC Machine Preventive Maintenance & AMC"
                  />
                </Row>
                <Row label="Service Mode">
                  <div className="relative">
                    <select
                      required
                      value={serviceMeta.service_mode}
                      onChange={(e) => setServiceMeta({ ...serviceMeta, service_mode: e.target.value })}
                      data-testid="postenq-service-mode-select"
                      className={inputCls}
                    >
                      {SERVICE_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Row>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row label="Project Scope / Duration (Optional)">
                  <input
                    value={serviceMeta.project_duration}
                    onChange={(e) => setServiceMeta({ ...serviceMeta, project_duration: e.target.value })}
                    data-testid="postenq-service-duration-input"
                    className={inputCls}
                    placeholder="e.g. 3 Months / Annual AMC"
                  />
                </Row>
                <Row label="Scope Summary (Optional)">
                  <input
                    value={serviceMeta.scope_details}
                    onChange={(e) => setServiceMeta({ ...serviceMeta, scope_details: e.target.value })}
                    data-testid="postenq-service-scope-input"
                    className={inputCls}
                    placeholder="e.g. 12 machines, quarterly calibration & spares"
                  />
                </Row>
              </div>
            </div>
          )}

          {leadType === "real_estate" && (
            <div className="space-y-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row label="Property Type">
                  <div className="relative">
                    <select
                      required
                      value={realEstateMeta.property_type}
                      onChange={(e) => setRealEstateMeta({ ...realEstateMeta, property_type: e.target.value })}
                      data-testid="postenq-property-type-select"
                      className={inputCls}
                    >
                      {PROPERTY_TYPES.map((pt) => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Row>
                <Row label="Transaction Type">
                  <div className="mt-1.5 grid grid-cols-3 gap-2" data-testid="postenq-transaction-type-group">
                    {TRANSACTION_TYPES.map((tx) => {
                      const active = realEstateMeta.transaction_type === tx;
                      return (
                        <button
                          key={tx}
                          type="button"
                          onClick={() => setRealEstateMeta({ ...realEstateMeta, transaction_type: tx })}
                          data-testid={`postenq-transaction-${tx.toLowerCase()}-btn`}
                          aria-pressed={active}
                          className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                            active
                              ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                              : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {tx}
                        </button>
                      );
                    })}
                  </div>
                </Row>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row label="Area / Size">
                  <div className="flex gap-2 mt-1.5">
                    <input
                      value={realEstateMeta.area_size}
                      onChange={(e) => setRealEstateMeta({ ...realEstateMeta, area_size: e.target.value })}
                      data-testid="postenq-area-size-input"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-bold text-slate-700"
                      placeholder="e.g. 5000"
                    />
                    <div className="relative shrink-0 w-28">
                      <select
                        value={realEstateMeta.area_unit}
                        onChange={(e) => setRealEstateMeta({ ...realEstateMeta, area_unit: e.target.value })}
                        data-testid="postenq-area-unit-select"
                        className="w-full rounded-lg border border-slate-200 pl-2.5 pr-7 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-bold text-slate-700 appearance-none"
                      >
                        {AREA_UNITS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </Row>
                <Row label="Possession / Timeline (Optional)">
                  <input
                    value={realEstateMeta.possession_timeline}
                    onChange={(e) => setRealEstateMeta({ ...realEstateMeta, possession_timeline: e.target.value })}
                    data-testid="postenq-possession-input"
                    className={inputCls}
                    placeholder="e.g. Immediate / Within 30 Days"
                  />
                </Row>
              </div>
            </div>
          )}

          {leadType === "dealership" && (
            <div className="space-y-3 mb-3" data-testid="postenq-dealership-fields">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Row label="Preferred Territory / Region">
                  <input
                    value={dealershipMeta.territory_region}
                    onChange={(e) => setDealershipMeta({ ...dealershipMeta, territory_region: e.target.value })}
                    data-testid="postenq-dealership-territory-input"
                    className={inputCls}
                    placeholder="e.g. Maharashtra & Goa"
                  />
                </Row>
                <Row label="Investment Capacity (Optional)">
                  <input
                    value={dealershipMeta.investment_budget}
                    onChange={(e) => setDealershipMeta({ ...dealershipMeta, investment_budget: e.target.value })}
                    data-testid="postenq-dealership-investment-input"
                    className={inputCls}
                    placeholder="e.g. ₹15-25 Lakh"
                  />
                </Row>
                <Row label="Business Experience (Optional)">
                  <input
                    value={dealershipMeta.business_experience}
                    onChange={(e) => setDealershipMeta({ ...dealershipMeta, business_experience: e.target.value })}
                    data-testid="postenq-dealership-experience-input"
                    className={inputCls}
                    placeholder="e.g. 6 Years Industrial Sales"
                  />
                </Row>
              </div>
            </div>
          )}

          <Row label="Category">
            <div className="relative">
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                data-testid="postenq-category-input"
                className={inputCls}
              >
                <option value="">{categoriesLoading ? "Loading categories..." : "Select Category"}</option>
                {getOptions(form.category).map((catName) => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </Row>
        </div>

        {/* Section 3: Location Details */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Industrial Location</div>
          <LocationPicker value={loc} onChange={setLoc} required testid="postenq-loc" />
        </div>

        {/* Section 4: Budget / Deal Value & Time */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            {isSalesPartner ? "Deal Value & Timeline" : "Budget & Time"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isSalesPartner ? (
              <Row label="Total Deal / Order Value (₹)">
                <input
                  required
                  type="number"
                  min="100"
                  step="any"
                  value={form.total_deal_value}
                  onChange={(e) => setForm({ ...form, total_deal_value: e.target.value })}
                  data-testid="postenq-deal-value-input"
                  className={inputCls}
                  placeholder="e.g. 500000"
                />
              </Row>
            ) : (
              <Row label="Budget (Approx)">
                <div className="relative">
                  <select
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className={inputCls}
                  >
                    <option value="₹10,000 - 50,000">₹10,000 - 50,000</option>
                    <option value="₹50,000 - 1 Lakh">₹50,000 - 1 Lakh</option>
                    <option value="₹1 Lakh - 5 Lakh">₹1 Lakh - 5 Lakh</option>
                    <option value="₹5 Lakh+">₹5 Lakh+</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Row>
            )}
            <Row label="Required By">
              <div className="relative">
                <select
                  value={form.required_by}
                  onChange={(e) => setForm({ ...form, required_by: e.target.value })}
                  className={inputCls}
                >
                  <option value="Immediate">Immediate</option>
                  <option value="5 Days">5 Days</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </Row>
          </div>

          {isSalesPartner && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="postenq-partner-preview-cards">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  <IndianRupee size={13} />
                  <span>Lead Unlock Price (2%)</span>
                </div>
                <div className="font-display text-lg font-black text-blue-950 mt-1" data-testid="preview-lead-price">
                  ₹{leadValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  + 18% GST = ₹{Math.round(leadValue * 1.18).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  <Wallet size={13} />
                  <span>Your 50% Earnings (on Bill Approval)</span>
                </div>
                <div className="font-display text-lg font-black text-emerald-900 mt-1" data-testid="preview-partner-earnings">
                  ₹{(leadValue * 0.5).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Credited to your wallet on approval
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  <ShieldCheck size={13} />
                  <span>Buyer 50% Fake-Lead Guarantee</span>
                </div>
                <div className="font-display text-lg font-black text-amber-900 mt-1" data-testid="preview-buyer-guarantee">
                  ₹{(leadValue * 0.5).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  Held in escrow for fake-lead protection
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Specifications details */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Requirement Details</div>
          <Row label="Specifications">
            <textarea
              required
              rows={4}
              value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              data-testid="postenq-requirement-input"
              className={inputCls}
              placeholder={
                leadType === "service"
                  ? "Describe service scope, SLA, equipment/site requirements, compliance standards..."
                  : leadType === "real_estate"
                  ? "Describe road access, power load (kVA), ceiling height, water/drainage, zoning, lease terms..."
                  : leadType === "dealership"
                  ? "Describe distribution network, warehouse setup, target territory & dealership products..."
                  : "Describe specs, dimensions, grade, finish, delivery timeline, other preferences..."
              }
            />
          </Row>
        </div>

        {/* Section 6: Attachment Drawing / PDF Upload */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Upload Drawing / File (Optional)</div>
          
          {/* Dotted Upload Card */}
          <label className="relative border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload size={24} className="text-slate-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-700">Drag files here or click to browse</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Supports PDF, JPG, PNG, DOC (Max 10MB)</div>
          </label>

          {/* Attached Files List */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{file.size}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Ready</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7: Who Can Contact You (Hidden for Sales Partner Leads) */}
        {!isSalesPartner && (
          <div className="pb-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Who can contact you?</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "all", label: "All Suppliers" },
                { key: "manufacturers", label: "Manufacturers" },
                { key: "distributors", label: "Distributors" },
                { key: "service_providers", label: "Service Providers" }
              ].map((sup) => (
                <label
                  key={sup.key}
                  className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                    supplierTypes[sup.key]
                      ? "border-blue-900 bg-blue-50/50 text-blue-900"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={supplierTypes[sup.key]}
                    onChange={() => handleSupplierToggle(sup.key)}
                    className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                  />
                  <span className="text-[10px] font-bold select-none">{sup.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          data-testid="postenq-submit-btn"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-orange-600 text-white font-extrabold text-xs uppercase hover:bg-orange-700 disabled:opacity-60 active:scale-95 transition-all shadow-md mt-4"
        >
          <Send size={14} />
          {submitting
            ? isSalesPartner
              ? "Posting Partner Lead..."
              : "Posting Requirement..."
            : isSalesPartner
            ? "Post Partner Lead"
            : "Post Requirement"}
        </button>
      </form>
    </div>
  );
}

const inputCls = "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-bold text-slate-700";

const Row = ({ label, children }) => (
  <div className="w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
    {children}
  </div>
);
