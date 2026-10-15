import React, { useState } from "react";
import { X, MessageCircle, Send, CheckCircle2, Package, MapPin, Tag, Layers } from "lucide-react";

export default function ProductDetailModal({ product, company = {}, isOpen, onClose, onRequestQuote }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
  const activeImage = images[activeImageIndex] || product.image_url;

  const cleanPhone = (company.whatsapp || company.mobile || "").replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${company.name || ""}, I am interested in your product "${product.name}" listed on your website. Please share specifications and best quotation.`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {product.category || "Industrial Product"}
            </span>
            {product.stock_left > 0 && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Available in Stock
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all"
                />
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx ? "border-blue-500 scale-105" : "border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta details */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white leading-snug">
                  {product.name}
                </h2>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white">
                    {product.price || "Price on Request"}
                  </span>
                  {product.moq && (
                    <span className="text-xs text-slate-400">
                      / MOQ: {product.moq}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center gap-2">
                    <Package size={15} className="text-blue-400 shrink-0" />
                    <span>MOQ: <strong>{product.moq || "Negotiable"}</strong></span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center gap-2">
                    <MapPin size={15} className="text-orange-400 shrink-0" />
                    <span className="truncate">{product.location || company.city || "India"}</span>
                  </div>
                </div>

                {product.description && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Specifications & Overview</h4>
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Call to Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onRequestQuote(product);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Send size={14} /> Request Quote
                </button>

                {cleanPhone && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <MessageCircle size={15} /> WhatsApp Inquire
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
