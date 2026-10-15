import React, { useState } from "react";
import {
  ShieldCheck, ArrowRight, Package, MessageCircle, Phone, Mail, MapPin,
  Sparkles, CheckCircle2, Award, FileText, Send, Download, Settings, Cpu
} from "lucide-react";
import TemplateHeader from "../components/TemplateHeader";
import TemplateFooter from "../components/TemplateFooter";
import ProductDetailModal from "../components/ProductDetailModal";
import InquiryDrawer from "../components/InquiryDrawer";
import TenantSEO from "../components/TenantSEO";

export default function ManufacturingProTemplate({
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

  const displayStats = stats.length > 0 ? stats : [
    { label: "Machining Tolerance", value: "±2 Microns" },
    { label: "Machining Centers", value: "30+ Units" },
    { label: "Annual Production", value: "500k+ Parts" },
    { label: "QA Acceptance Rate", value: "99.8%" },
  ];

  const handleOpenInquiry = (product = null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
      <TenantSEO seo={seo} company={company} />

      {/* Top Engineering RFQ Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2 px-4 text-xs font-semibold text-center flex items-center justify-center gap-2">
        <Sparkles size={13} />
        <span>Direct OEM Sub-Contracting & Precision Job-Work Accepted</span>
        <button
          onClick={() => handleOpenInquiry()}
          className="ml-2 underline font-bold hover:text-orange-100"
        >
          Submit RFQ Drawing &rarr;
        </button>
      </div>

      {/* Header */}
      <TemplateHeader
        company={company}
        theme={theme}
        onOpenInquiry={() => handleOpenInquiry()}
      />

      {/* Precision Engineering Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24 border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-semibold">
                <Cpu size={14} />
                <span>AS9100 / ISO Certified Facility</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {company.tagline || `${company.name} Precision Components`}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                {company.description || "Precision component manufacturing with advanced multi-axis CNC milling, wire EDM, and titanium/Inconel machining capabilities for aerospace, defense, and heavy engineering."}
              </p>

              <div className="flex items-center gap-4 flex-wrap pt-2">
                <button
                  onClick={() => handleOpenInquiry()}
                  className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/25 flex items-center gap-2 transition-all"
                >
                  <Send size={15} /> Request Technical Quote
                </button>
                <a
                  href="#catalog-specs"
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2"
                >
                  <FileText size={15} /> View Technical Catalog
                </a>
              </div>
            </div>

            {/* Metrics cards block */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              {displayStats.map((st, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg">
                  <div className="text-2xl font-black text-orange-400 font-mono">{st.value}</div>
                  <div className="text-xs text-slate-400 font-medium mt-1">{st.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Technical Specifications Catalog */}
      <section id="catalog-specs" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="mb-10">
          <h2 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">Component Catalog</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Manufactured Components & Assemblies
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-orange-500/40 transition-all"
            >
              <div>
                <div className="h-48 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(p)}>
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 space-y-3">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {p.category || "Component"}
                  </span>
                  <h3 className="text-sm font-bold text-white hover:text-orange-400 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                  <div className="pt-3 border-t border-slate-800 text-xs flex justify-between items-center text-slate-300">
                    <span>MOQ: <strong>{p.moq || "5 Pcs"}</strong></span>
                    <span className="font-bold text-white text-sm">{p.price || "Quote on Drawing"}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors"
                >
                  Specs Sheet
                </button>
                <button
                  onClick={() => handleOpenInquiry(p)}
                  className="py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors"
                >
                  RFQ Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quality Control & Inspection Standards */}
      <section id="capabilities" className="py-16 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Award size={20} className="text-orange-400" />
              <h4 className="text-sm font-bold text-white">Full Traceability & Certs</h4>
              <p className="text-slate-400 leading-relaxed">
                Raw material test reports (MTR), heat treatment certificates, and 100% CMM dimensional audit logs provided with every production batch.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Settings size={20} className="text-blue-400" />
              <h4 className="text-sm font-bold text-white">High-Speed Multi-Axis CNC</h4>
              <p className="text-slate-400 leading-relaxed">
                Simultaneous 5-axis machining centers with laser tool setting and probing for micron-level concentricity and surface finish.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Verified Factory Location</h4>
              <p className="text-slate-400 leading-relaxed">
                {company.address || company.location || "Industrial Cluster, India"}. Facility visits and client audits welcomed by appointment.
              </p>
            </div>
          </div>
        </div>
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
