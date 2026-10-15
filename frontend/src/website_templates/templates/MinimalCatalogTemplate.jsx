import React, { useState } from "react";
import {
  ShieldCheck, ArrowRight, Package, MessageCircle, Phone, Mail, MapPin,
  Search, CheckCircle2, Send, Tag, Building2
} from "lucide-react";
import TemplateHeader from "../components/TemplateHeader";
import TemplateFooter from "../components/TemplateFooter";
import ProductDetailModal from "../components/ProductDetailModal";
import InquiryDrawer from "../components/InquiryDrawer";
import TenantSEO from "../components/TenantSEO";

export default function MinimalCatalogTemplate({
  company = {},
  products = [],
  posts = [],
  reels = [],
  stats = [],
  theme = {},
  seo = {}
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cleanPhone = (company.whatsapp || company.mobile || "").replace(/[^0-9]/g, "");

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
  });

  const handleOpenInquiry = (product = null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <TenantSEO seo={seo} company={company} />

      {/* Header */}
      <TemplateHeader
        company={company}
        theme={theme}
        onOpenInquiry={() => handleOpenInquiry()}
      />

      {/* Minimal Hero Header */}
      <section className="py-12 md:py-16 border-b border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-3 max-w-2xl">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Industrial Stockist & Manufacturer
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {company.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {company.description || "Direct supplier of industrial fasteners, cutting tools, valves, and workshop hardware equipment."}
              </p>
            </div>

            {/* Quick WhatsApp & Call CTAs */}
            <div className="flex items-center gap-3 shrink-0">
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  <MessageCircle size={15} />
                  WhatsApp Direct
                </a>
              )}
              <button
                onClick={() => handleOpenInquiry()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2"
              >
                <Send size={14} /> Request Quote
              </button>
            </div>

          </div>

          {/* Search bar inside header */}
          <div className="mt-8 max-w-lg relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search catalog by SKU, tool name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
            />
          </div>
        </div>
      </section>

      {/* Product Catalog Grid */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs font-semibold text-slate-400">
            Showing <strong className="text-white">{filteredProducts.length}</strong> items in catalog
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-emerald-400 hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-950/60 rounded-2xl border border-slate-800 p-8">
            <Package size={36} className="mx-auto text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-white">No items found matching "{searchQuery}"</h3>
            <p className="text-xs text-slate-400 mt-1">Please try searching with another keyword.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const itemWhatsapp = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${company.name}, I want to order "${p.name}" listed on your catalog.`)}`;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all"
                >
                  <div className="cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    <div className="h-44 bg-slate-900 overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-semibold text-emerald-400">
                        {p.category || "General"}
                      </span>
                      <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      <div className="pt-2 flex items-baseline justify-between text-xs">
                        <span className="font-bold text-white text-sm">{p.price || "On Request"}</span>
                        {p.moq && <span className="text-[11px] text-slate-400">MOQ: {p.moq}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 grid grid-cols-2 gap-2 border-t border-slate-900 mt-2">
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-white text-[11px] font-semibold transition-colors"
                    >
                      View Specs
                    </button>
                    {cleanPhone ? (
                      <a
                        href={itemWhatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 transition-colors"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    ) : (
                      <button
                        onClick={() => handleOpenInquiry(p)}
                        className="py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors"
                      >
                        Quote
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Global Footer */}
      <TemplateFooter company={company} />

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        company={company}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRequestQuote={(prod) => handleOpenInquiry(prod)}
      />

      <InquiryDrawer
        company={company}
        preselectedProduct={inquiryProduct}
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
      />
    </div>
  );
}
