import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { MediaUploader } from "./MediaUploader";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

export const ProductDialog = ({ open, onClose, onSaved, initial }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: "", category: "", price: "", moq: "", description: "",
  });
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        category: initial?.category || "",
        price: initial?.price || "",
        moq: initial?.moq || "",
        description: initial?.description || "",
      });
      const imgs = initial
        ? [initial.image_url, ...(initial.images || [])]
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((u) => ({ url: u, resource_type: "image" }))
        : [];
      setMedia(imgs);
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (media.length === 0) {
      toast.error("Upload at least 1 product image");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        image_url: media[0].url,
        images: media.slice(1).map((m) => m.url),
        price: form.price || null,
        moq: form.moq || null,
        description: form.description || null,
      };
      if (isEdit) {
        await api.patch(`/products/${initial.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product added");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" data-testid="product-dialog" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg text-slate-900">{isEdit ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" data-testid="product-dialog-close"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Photos (first is cover)</label>
            <div className="mt-2">
              <MediaUploader value={media} onChange={setMedia} accept="image/*" folder="iip/products" maxItems={6} testid="product-media" />
            </div>
          </div>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" data-testid="product-name-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. Steel)" data-testid="product-category-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (e.g. ₹62/kg)" data-testid="product-price-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} placeholder="MOQ (e.g. 100 units)" data-testid="product-moq-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description, specs, applications..." data-testid="product-desc-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <button type="submit" disabled={submitting} data-testid="product-save-btn" className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60">
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
};
