import React, { useState } from "react";
import {
  ShieldCheck, ArrowRight, Package, MessageCircle, Phone, Mail, MapPin,
  Sparkles, CheckCircle2, Play, Award, Layers, Clock, Send
} from "lucide-react";
import TemplateHeader from "../components/TemplateHeader";
import TemplateFooter from "../components/TemplateFooter";
import ProductDetailModal from "../components/ProductDetailModal";
import InquiryDrawer from "../components/InquiryDrawer";
import TenantSEO from "../components/TenantSEO";

export default function IndustrialModernTemplate({
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
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const displayStats = stats.length > 0 ? stats : [
    { label: "Years in Industry", value: `${new Date().getFullYear() - (company.year_established || 2010)}+` },
    { label: "Products Cataloged", value: `${products.length}+ Items` },
    { label: "Verified Standards", value: "ISO Certified" },
    { label: "Location", value: company.city || "Pan-India" },
  ];

  const handleOpenInquiry = (product = null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  const whatsappNum = (company.whatsapp || company.mobile || "").replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <TenantSEO seo={seo} company={company} />

      {/* Global Navigation */}
      <TemplateHeader
        company={company}
        theme={theme}
        onOpenInquiry={() => handleOpenInquiry()}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Sparkles size={14} className="text-orange-400" />
                <span>Verified Direct Industrial Manufacturer</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                {company.tagline || `${company.name} Industrial Solutions`}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {company.description || "Delivering high-reliability industrial machinery, precision tools, and engineering components designed for maximum uptime and strict manufacturing tolerances."}
              </p>

              <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 flex-wrap pt-2">
                <a
                  href="#products"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  <Package size={17} /> Explore Catalog
                </a>
                <button
                  onClick={() => handleOpenInquiry()}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/15 transition-all flex items-center gap-2"
                >
                  <Send size={16} /> Request Quote
                </button>
              </div>

              {/* Verified Trust Badges */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 flex-wrap text-xs text-slate-400">
                {company.gst && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    GST: {company.gst}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-400" />
                  Verified on Indian Industrial Platform
                </span>
              </div>
            </div>

            {/* Right Column: Featured Image / Cover Banner */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group">
                <img
                  src={company.cover_url || company.logo_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80"}
                  alt={company.name}
                  className="w-full h-80 sm:h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs">
                  <p className="font-bold text-white text-sm">{company.name}</p>
                  <p className="text-slate-400 flex items-center gap-1 mt-1 truncate">
                    <MapPin size={13} className="text-orange-400 shrink-0" />
                    {company.address || company.location || "Industrial Hub, India"}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Metrics / Key Stats Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {displayStats.map((st, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700 transition-colors"
              >
                <div className="text-2xl sm:text-3xl font-black text-white">{st.value}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">{st.label}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Catalog & Products Grid */}
      <section id="products" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Product Catalog</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Industrial Machinery & Components
            </p>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cat === "all" ? "All Products" : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Cards */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-8">
            <Package size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white">No products listed in this category</h3>
            <p className="text-xs text-slate-400 mt-1">Please select another filter or request a custom quotation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden flex flex-col justify-between hover:border-slate-700 hover:shadow-xl transition-all duration-300"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-semibold text-blue-300 border border-slate-800">
                      {p.category || "Machinery"}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3
                      onClick={() => setSelectedProduct(p)}
                      className="text-sm font-bold text-white line-clamp-2 hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description || "High-precision manufacturing specification."}
                    </p>
                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-800/60">
                      <span className="text-sm font-extrabold text-white">{p.price || "On Request"}</span>
                      {p.moq && <span className="text-[11px] text-slate-400">MOQ: {p.moq}</span>}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleOpenInquiry(p)}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Factory Capabilities & Quality Assurance */}
      <section id="capabilities" className="py-20 bg-slate-900/50 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Enterprise Credentials</h3>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Engineered For High Precision & Zero Defect Standards
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {company.description || "Our modern production facility integrates advanced multi-axis machining, robotic material handling, and rigorous CMM testing protocols to deliver exceptional industrial consistency."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <Award size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Certifications</h4>
                    <p className="text-slate-400 mt-0.5">
                      {company.certifications && company.certifications.length > 0
                        ? company.certifications.join(", ")
                        : "ISO 9001:2015 Accredited"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <Clock size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Established</h4>
                    <p className="text-slate-400 mt-0.5">Since {company.year_established || 2012} ({new Date().getFullYear() - (company.year_established || 2012)} Years)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Contact & RFQ Card */}
            <div id="contact" className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white">Connect with {company.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Have a customized requirement or project quotation? Submit your drawing or talk directly to our engineering sales team.
              </p>

              <div className="space-y-3 text-xs">
                {company.mobile && (
                  <a href={`tel:${company.mobile}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors">
                    <Phone size={16} className="text-blue-400 shrink-0" />
                    <span>Direct Call: <strong>{company.mobile}</strong></span>
                  </a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors">
                    <Mail size={16} className="text-orange-400 shrink-0" />
                    <span>Official Email: <strong>{company.email}</strong></span>
                  </a>
                )}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 text-slate-200">
                  <MapPin size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Works: <strong>{company.address || company.location}</strong></span>
                </div>
              </div>

              <button
                onClick={() => handleOpenInquiry()}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Send size={15} /> Request Direct Quotation
              </button>
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
