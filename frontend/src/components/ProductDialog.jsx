import React, { useState, useEffect, useRef } from "react";
import { X, MapPin, ImagePlus, Loader2, Trash2, AlertTriangle } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

/** Upload a single file to the local /api/upload endpoint */
async function uploadLocalFile(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("resource_type", file.type.startsWith("video/") ? "video" : "image");
  // Do NOT manually set Content-Type — axios + FormData auto-sets it
  // with the correct multipart boundary (e.g. multipart/form-data; boundary=---XYZ)
  const res = await api.post("/upload", form);
  return res.data; // { secure_url, public_id, resource_type, thumbnail_url, ... }
}

/** Small image grid uploader component using local backend */
const LocalImageUploader = ({ images, onChange, testid = "product-media" }) => {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, 6 - images.length);
      const uploaded = [];
      for (const f of arr) {
        try {
          const result = await uploadLocalFile(f);
          uploaded.push({ url: result.secure_url, resource_type: "image" });
        } catch (e) {
          toast.error(`Failed to upload: ${f.name}`);
        }
      }
      if (uploaded.length) {
        onChange([...images, ...uploaded]);
        toast.success(`${uploaded.length} image(s) uploaded`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div data-testid={testid}>
      <div className="grid grid-cols-3 gap-2">
        {images.map((m, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
            data-testid={`${testid}-item-${i}`}
          >
            <img src={m.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              data-testid={`${testid}-remove-${i}`}
              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
            >
              <X size={12} />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                COVER
              </span>
            )}
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            data-testid={`${testid}-add-btn`}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-orange-400 flex flex-col items-center justify-center text-slate-500 hover:text-orange-600 transition-colors disabled:opacity-50 gap-1"
          >
            {uploading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ImagePlus size={22} />
            )}
            <span className="text-[10px] font-semibold">
              {uploading ? "Uploading..." : "Add Photo"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        data-testid={`${testid}-input`}
      />
    </div>
  );
};

export const ProductDialog = ({ open, onClose, onSaved, initial }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    moq: "",
    description: "",
    stock_left: "",
    location: "",
  });
  const [images, setImages] = useState([]); // [{url, resource_type}]
  const [submitting, setSubmitting] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        category: initial?.category || "",
        price: initial?.price || "",
        moq: initial?.moq || "",
        description: initial?.description || "",
        stock_left:
          initial?.stock_left !== undefined && initial?.stock_left !== null
            ? initial.stock_left.toString()
            : "",
        location: initial?.location || "",
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
    if (images.length === 0) {
      toast.error("Please upload at least 1 product image");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || "General",
        image_url: images[0].url,
        images: images.slice(1).map((m) => m.url),
        price: form.price || null,
        moq: form.moq || null,
        description: form.description || null,
        stock_left: form.stock_left ? parseInt(form.stock_left, 10) : null,
        location: form.location || null,
      };
      if (isEdit) {
        await api.patch(`/products/${initial.id}`, payload);
        toast.success("Product updated!");
        onSaved?.();
        onClose?.();
      } else {
        await api.post("/products", payload);
        toast.success("Product published!");
        onSaved?.();
        if (addAnother) {
          // Clear form fields for next product, keeping category and location for convenience
          setForm({
            name: "",
            category: form.category,
            price: "",
            moq: "",
            description: "",
            stock_left: "",
            location: form.location,
          });
          setImages([]);
        } else {
          onClose?.();
        }
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      data-testid="product-dialog"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              {isEdit ? "Edit Product" : "Publish Product"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in the details to list your product
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="product-dialog-close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Shiprocket Warehouse Logistics Notice</span>
              Couriers will calculate rates and pick up orders directly from your company's registered warehouse pincode and verified phone number.
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
              Product Photos <span className="text-rose-500">*</span>
              <span className="text-slate-400 normal-case font-normal ml-1">(first is cover)</span>
            </label>
            <LocalImageUploader
              images={images}
              onChange={setImages}
              testid="product-media"
            />
            {images.length === 0 && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <ImagePlus size={12} /> Tap "Add Photo" to select images from your device
              </p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Stainless Steel Rod 304 Grade"
              data-testid="product-name-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Steel, Chemicals, Plastics"
              data-testid="product-category-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Price <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. ₹62/kg"
                data-testid="product-price-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Stock Left <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.stock_left}
                onChange={(e) => setForm({ ...form, stock_left: e.target.value })}
                placeholder="Quantity"
                data-testid="product-stock-input"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin size={16} />
              </span>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Pune, Maharashtra"
                data-testid="product-location-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              />
            </div>
          </div>

          {/* MOQ */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Min. Order Qty (MOQ)
            </label>
            <input
              value={form.moq}
              onChange={(e) => setForm({ ...form, moq: e.target.value })}
              placeholder="e.g. 50 kg"
              data-testid="product-moq-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
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
              placeholder="Describe the product specs, applications, certifications..."
              data-testid="product-desc-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="submit"
              onClick={() => setAddAnother(false)}
              disabled={submitting}
              data-testid="product-save-btn"
              className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60 transition-all active:scale-95 shadow-md text-sm"
            >
              {submitting && !addAnother
                ? "Publishing..."
                : isEdit
                  ? "Save Changes"
                  : "Publish & Close"}
            </button>

            {!isEdit && (
              <button
                type="submit"
                onClick={() => setAddAnother(true)}
                disabled={submitting}
                className="w-full py-3 rounded-full bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60 transition-all active:scale-[0.98] shadow-sm text-sm"
              >
                {submitting && addAnother ? "Publishing..." : "Publish & Add Another"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
