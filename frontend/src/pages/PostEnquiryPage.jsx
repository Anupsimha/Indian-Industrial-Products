import React, { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Send, FileText, Upload, Trash2, CheckCircle2, ChevronDown, ListTodo, Paperclip } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";
import { CATEGORIES } from "../lib/constants";

export default function PostEnquiryPage() {
  const [form, setForm] = useState({
    name: "", mobile: "", requirement: "", category: "",
    product_name: "", quantity: "", budget: "₹50,000 - 1 Lakh",
    required_by: "15 Days"
  });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

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

  const submit = async (e) => {
    e.preventDefault();
    if (!loc.state || !loc.city || !loc.industrial_area) {
      toast.error("Please select State, City and Industrial Area");
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
      if (form.product_name) fd.append("product_name", form.product_name);
      if (form.quantity)     fd.append("quantity", form.quantity);

      // Attach each real File object under the "media" key
      attachments.forEach(({ file }) => {
        if (file) fd.append("media", file);
      });

      await api.post("/enquiries", fd);
      toast.success("Requirement posted! Verified suppliers will contact you on your number.", {
        description: "An SMS confirmation has been sent.",
        icon: <CheckCircle2 className="text-emerald-500" size={16} />
      });
      setForm({
        name: "", mobile: "", requirement: "", category: "",
        product_name: "", quantity: "", budget: "₹50,000 - 1 Lakh",
        required_by: "15 Days"
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
            <ListTodo size={20} />
          </span>
          <div>
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-300">Post Requirement</div>
            <h1 className="font-display text-xl sm:text-2xl font-black mt-0.5">Tell us what you need</h1>
          </div>
        </div>
        <p className="text-white/70 text-xs sm:text-sm mt-3 leading-relaxed max-w-lg">
          Your requirement reaches verified manufacturers across India. Get quotes from matching suppliers in minutes.
        </p>
      </div>

      {/* Requirement Form */}
      <form onSubmit={submit} className="mt-4 bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
        
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

        {/* Section 2: Product Details */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Product Details</div>
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
          <Row label="Category">
            <div className="relative">
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                data-testid="postenq-category-input"
                className={inputCls}
              >
                <option value="">Select Category</option>
                {Array.from(new Set([...CATEGORIES, ...categories.map(c => typeof c === 'string' ? c : c.name)])).map((catName) => (
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

        {/* Section 4: Budget & Time */}
        <div className="border-b border-slate-50 pb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Budget & Time</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              placeholder="Describe specs, dimensions, grade, finish, delivery timeline, other preferences..."
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

        {/* Section 7: Who Can Contact You */}
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

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          data-testid="postenq-submit-btn"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-orange-600 text-white font-extrabold text-xs uppercase hover:bg-orange-700 disabled:opacity-60 active:scale-95 transition-all shadow-md mt-4"
        >
          <Send size={14} />
          {submitting ? "Posting Requirement..." : "Post Requirement"}
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
