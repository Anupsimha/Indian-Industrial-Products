import React, { useState } from "react";
import {
  ArrowRight, ArrowUpRight, Send, ClipboardList, Cog, FileCheck2, Truck,
  Phone, Mail, MapPin, MessageCircle, ShieldCheck, Award, Receipt,
  CheckCircle2, Box, Sparkles, Building2, ExternalLink, ChevronRight, Menu, X
} from "lucide-react";
import ProductDetailModal from "../components/ProductDetailModal";
import InquiryDrawer from "../components/InquiryDrawer";
import TenantSEO from "../components/TenantSEO";

export default function ApexPrecisionTemplate({
  company = {},
  products = [],
  posts = [],
  reels = [],
  theme = {},
  seo = {},
  services: propServices
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive categories
  const rawCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const categories = rawCategories.length > 0 ? rawCategories : ["Carbide Tools", "Industrial Nameplates", "Insulator Components"];

  const filteredProducts = activeCategory === "all"
    ? products
    : products.filter((p) => p.category === activeCategory);

  // Group products by category for section blocks
  const groupedProducts = categories.map((cat, idx) => ({
    name: cat,
    code: String.fromCharCode(65 + idx),
    products: products.filter((p) => p.category === cat)
  })).filter((g) => g.products.length > 0);

  const displayProducts = groupedProducts.length > 0 ? groupedProducts : [
    {
      name: "Precision Products",
      code: "A",
      products: products
    }
  ];

  // Default engineering services if none passed
  const services = propServices || [
    {
      id: "srv-1",
      code: "S/01",
      name: "Precision Laser Marking & Engraving",
      image_url: "https://static.prod-images.emergentagent.com/jobs/96a2efa0-0eaa-4f41-bbb2-7b99710e3c34/images/81bf597b606198466cb69d2668158019225e704851212a25e2f3cff1c1e91c48.jpeg",
      description: "Permanent laser marking and deep engraving for nameplates, tooling, medical parts, and components with serial numbers, barcodes, and logos."
    },
    {
      id: "srv-2",
      code: "S/02",
      name: "CNC Machining Job Work (Desktop & VMC)",
      image_url: "https://static.prod-images.emergentagent.com/jobs/96a2efa0-0eaa-4f41-bbb2-7b99710e3c34/images/9e6d388667022fa614b889c2df6616562faaaa45d1eeeb5b79e45794970f2d3f.jpeg",
      description: "Desktop VMC precision machining job work for small batch components, prototypes, fixtures, and custom insulator assemblies."
    },
    {
      id: "srv-3",
      code: "S/03",
      name: "Industrial 3D Additive Prototyping",
      image_url: "https://static.prod-images.emergentagent.com/jobs/96a2efa0-0eaa-4f41-bbb2-7b99710e3c34/images/2d5d2dc015e9862afea2399db22e44b20e57f8b068c0d65cdb6b53dcc556e08a.jpeg",
      description: "Rapid 3D additive manufacturing for prototypes, fit-check models, concept validation, and custom jigs directly from CAD."
    }
  ];

  const handleOpenInquiry = (product = null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  const rawPhone = (company.whatsapp || company.mobile || "").replace(/\D/g, "");
  const cleanPhone = (company.mobile || company.phone || "").replace(/[^0-9+]/g, "");
  const waUrl = rawPhone
    ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(
        `Hello ${company.name}, I am visiting your website on Indian Industrial Platform and would like to inquire about your products.`
      )}`
    : null;

  const city = company.city || (company.location ? company.location.split(",").slice(-2)[0]?.trim() : "Industrial Hub");
  const coverImg = company.cover_url || "/template_assets/apex_precision/showcase.jpg";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#f26b1d] selection:text-white">
      <TenantSEO seo={seo} company={company} />

      {/* Top Bar */}
      <div className="bg-[#050f24] text-slate-300 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-[#f26b1d]" />
            <span>{company.address || `${city}, India`}</span>
          </div>
          <div className="flex items-center gap-4 text-[12.5px]">
            {cleanPhone && (
              <a href={`tel:${cleanPhone}`} className="hover:text-white flex items-center gap-1.5 transition-colors">
                <Phone size={12} className="text-[#f26b1d]" />
                <span>{cleanPhone}</span>
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="hover:text-white flex items-center gap-1.5 transition-colors">
                <Mail size={12} className="text-[#f26b1d]" />
                <span>{company.email}</span>
              </a>
            )}
            {company.gst && (
              <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
                <Receipt size={12} className="text-emerald-400" />
                <span>GSTIN: {company.gst}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-shadow duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo / Brand Name */}
            <a href="#overview" className="flex items-center gap-3 group">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 p-0.5 shadow-sm group-hover:border-[#f26b1d] transition-colors"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#0a1f44] flex items-center justify-center text-white font-bold text-lg shadow-sm border border-slate-700">
                  <Building2 size={24} className="text-[#f26b1d]" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-[#0a1f44] uppercase leading-none">
                  {company.name || "Precision Engineering"}
                </span>
                <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase mt-1">
                  {company.tagline || `${city} · Verified Manufacturer`}
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#0a1f44]">
              <a href="#overview" className="hover:text-[#f26b1d] transition-colors">Overview</a>
              <a href="#products" className="hover:text-[#f26b1d] transition-colors">Products</a>
              <a href="#services" className="hover:text-[#f26b1d] transition-colors">Engineering Services</a>
              <a href="#process" className="hover:text-[#f26b1d] transition-colors">Process</a>
              <a href="#contact" className="hover:text-[#f26b1d] transition-colors">Contact</a>
            </nav>

            {/* Actions: Direct WhatsApp & Enquiry Button */}
            <div className="hidden lg:flex items-center gap-3">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
              <button
                onClick={() => handleOpenInquiry()}
                className="px-5 py-2.5 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white text-xs font-bold inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Send size={14} /> Send Enquiry
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-[#0a1f44] hover:bg-slate-50 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3">
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0a1f44] py-1"
            >
              Overview
            </a>
            <a
              href="#products"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0a1f44] py-1"
            >
              Products & Catalog
            </a>
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0a1f44] py-1"
            >
              Engineering Services
            </a>
            <a
              href="#process"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0a1f44] py-1"
            >
              Process
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0a1f44] py-1"
            >
              Contact Us
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenInquiry();
                }}
                className="w-full py-2.5 rounded-full bg-[#f26b1d] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow"
              >
                <Send size={14} /> Send Enquiry
              </button>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-full bg-emerald-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} /> WhatsApp Chat
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="overview"
        className="relative overflow-hidden bg-[#0a1f44] text-white pt-16 pb-20 lg:pt-24 lg:pb-28"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px"
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#f26b1d] uppercase mb-4">
              <span className="w-6 h-0.5 bg-[#f26b1d]" />
              <span>{company.name || "Industrial Enterprise"} · {city}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black uppercase tracking-tight leading-[1.05] text-white mb-6">
              {company.headline || "Precision Tools. Permanent Marking. Engineered Parts."}
            </h1>

            {/* Description */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
              {company.description ||
                "Carbide cutting tools, laser-marked and UV-printed industrial nameplates, electrical insulator parts, and precision CNC job-work services - built around your requirement."}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#products"
                className="px-7 py-3.5 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <span>Explore Products</span>
                <ArrowRight size={16} />
              </a>
              <button
                onClick={() => handleOpenInquiry()}
                className="px-7 py-3.5 rounded-full border border-white/40 hover:border-white text-white hover:bg-white hover:text-[#0a1f44] font-bold text-sm inline-flex items-center gap-2 transition-all"
              >
                <Send size={15} />
                <span>Send Enquiry</span>
              </button>
            </div>
          </div>

          {/* Hero Showcase Frame with Category Tags */}
          <div className="mt-14 relative">
            <div className="relative rounded-2xl overflow-hidden p-2 sm:p-3 bg-gradient-to-b from-white/20 to-white/5 border border-white/20 shadow-2xl">
              <img
                src={coverImg}
                alt={`${company.name} facility & precision output`}
                className="w-full aspect-[21/9] sm:aspect-[16/7] object-cover rounded-xl"
              />
            </div>

            {/* Floating Category Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 -mt-5 relative z-20 px-4">
              {categories.slice(0, 3).map((cat, idx) => (
                <span
                  key={cat}
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-[#0a1f44] bg-white border border-slate-200 shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #e4e9ef 45%, #f7f9fb 60%, #d6dde6 100%)"
                  }}
                >
                  <span className="text-[#f26b1d] mr-1.5">{String.fromCharCode(65 + idx)} ·</span> {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Blocks & Catalog Section */}
      <div id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#f26b1d] uppercase mb-2">
              <span className="w-5 h-0.5 bg-[#f26b1d]" />
              <span>What We Supply</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-[#0a1f44] tracking-tight">
              {company.catalog_heading || "Focused Product Categories"}
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Each product line is supported with dedicated technical specifications and drawings review, so your requirement reaches us with the details that matter.
            </p>
          </div>

          {/* Category Filter Pills (if multiple categories) */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-12 pb-2 border-b border-slate-100">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                  activeCategory === "all"
                    ? "bg-[#0a1f44] text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                    activeCategory === c
                      ? "bg-[#0a1f44] text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Render Products */}
          {activeCategory === "all" ? (
            // Grouped By Category Block
            <div className="space-y-20">
              {displayProducts.map((group, gIdx) => (
                <div
                  key={group.name}
                  className={`rounded-3xl p-6 sm:p-10 ${
                    gIdx % 2 === 1 ? "bg-slate-50 border border-slate-200/80" : "bg-white"
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-5">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl text-[#0a1f44] border border-white shadow-md shrink-0"
                        style={{
                          background: "linear-gradient(135deg, #ffffff 0%, #e4e9ef 45%, #f7f9fb 60%, #d6dde6 100%)"
                        }}
                      >
                        {group.code}
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f26b1d]">
                          Product Line {group.code}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#0a1f44] tracking-tight">
                          {group.name}
                        </h3>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {group.products.length} Products Cataloged
                    </span>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {group.products.map((p) => (
                      <ProductCard
                        key={p.id || p.name}
                        product={p}
                        company={company}
                        onDetails={() => setSelectedProduct(p)}
                        onEnquire={() => handleOpenInquiry(p)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Filtered Products Flat Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id || p.name}
                  product={p}
                  company={company}
                  onDetails={() => setSelectedProduct(p)}
                  onEnquire={() => handleOpenInquiry(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Featured Quality & Drawing Band */}
      <section className="bg-[#050f24] text-white py-16 sm:py-20 relative overflow-hidden border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#f26b1d] uppercase mb-2">
                <span className="w-5 h-0.5 bg-[#f26b1d]" />
                <span>Custom Engineering Capabilities</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mt-1">
                Custom Tooling & Precision Components To Your CAD Drawing
              </h2>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Whether you need specialized micrograin carbide form tools, high-dielectric electrical insulators, or industrial rating plates, send your CAD / PDF drawing for an immediate feasibility check.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => handleOpenInquiry()}
                className="px-6 py-3.5 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg transition-all"
              >
                <Send size={15} /> Request Quotation
              </button>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 border border-slate-700 transition-all"
                >
                  <MessageCircle size={15} /> Chat With Engineers
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Services Band */}
      <section id="services" className="bg-[#0a1f44] text-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#f26b1d] uppercase mb-2">
              <span className="w-5 h-0.5 bg-[#f26b1d]" />
              <span>Job-Work Services</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              Engineering Services & Job Work
            </h2>
            <p className="mt-3 text-slate-300 text-base leading-relaxed">
              Marking, machining and additive manufacturing services for prototypes, small batches, and production line support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((s, idx) => (
              <div
                key={s.id || s.name}
                className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#f26b1d]/50 transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={s.image_url}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#050f24]/80 backdrop-blur-md text-white border border-white/10">
                    {s.code || `S/0${idx + 1}`}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold uppercase text-white tracking-tight mb-2">
                    {s.name}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6">
                    {s.description}
                  </p>
                  <div>
                    <button
                      onClick={() => handleOpenInquiry({ name: s.name, category: "Engineering Service" })}
                      className="w-full py-2.5 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow"
                    >
                      <Send size={13} /> Send Enquiry
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section: From Enquiry to Delivery */}
      <section id="process" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-[#f26b1d] uppercase mb-2">
              <span className="w-5 h-0.5 bg-[#f26b1d]" />
              <span>How It Works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-[#0a1f44] tracking-tight">
              From Enquiry To Delivery
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Transparent, rapid turnaround built for industrial engineers and B2B procurement managers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {[
              {
                num: "01",
                icon: ClipboardList,
                title: "Share Requirement",
                desc: "Send drawings, CAD files, samples or technical parameters through our quotation drawer."
              },
              {
                num: "02",
                icon: Cog,
                title: "Technical Review",
                desc: "Our engineering team reviews specifications, materials, tolerance requirements, and volume."
              },
              {
                num: "03",
                icon: FileCheck2,
                title: "Clear Quotation",
                desc: "You receive a formal commercial quotation with confirmed delivery timelines and specs."
              },
              {
                num: "04",
                icon: Truck,
                title: "Production & Delivery",
                desc: "Your order is precision manufactured, QC inspected, and securely dispatched to your facility."
              }
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className={`p-8 bg-white hover:bg-slate-50 transition-colors ${
                    idx < 3 ? "border-b lg:border-b-0 lg:border-r border-slate-200" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#f26b1d] block mb-5">
                    {step.num}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#0a1f44] mb-5">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold uppercase text-[#0a1f44] tracking-tight mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="py-14 sm:py-16 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 border-t border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#f26b1d] block mb-1">
                Have a drawing or a requirement?
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#0a1f44] tracking-tight">
                Send it to us. We'll take it from there.
              </h2>
            </div>
            <button
              onClick={() => handleOpenInquiry()}
              className="px-8 py-4 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg transition-all"
            >
              <Send size={16} /> Send Enquiry
            </button>
          </div>
        </div>
      </section>

      {/* Contact & Facility Section */}
      <section id="contact" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Contact Details Card */}
            <div className="lg:col-span-5 bg-slate-50 p-8 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#f26b1d]">
                  Direct Contact
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#0a1f44] tracking-tight mt-1">
                  {company.name}
                </h3>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                {cleanPhone && (
                  <a href={`tel:${cleanPhone}`} className="flex items-center gap-3 hover:text-[#f26b1d] transition-colors">
                    <Phone size={18} className="text-[#f26b1d] shrink-0" />
                    <span>+91 {cleanPhone}</span>
                  </a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="flex items-center gap-3 hover:text-[#f26b1d] transition-colors">
                    <Mail size={18} className="text-[#f26b1d] shrink-0" />
                    <span>{company.email}</span>
                  </a>
                )}
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#f26b1d] shrink-0 mt-0.5" />
                  <span>{company.address || company.location || `${city}, Karnataka`}</span>
                </div>
                {company.gst && (
                  <div className="flex items-center gap-3">
                    <Receipt size={18} className="text-[#f26b1d] shrink-0" />
                    <span className="font-mono">GSTIN: {company.gst}</span>
                  </div>
                )}
              </div>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow transition-all"
                >
                  <MessageCircle size={18} /> Chat on WhatsApp
                </a>
              )}
            </div>

            {/* Quick Inquiry Form Box */}
            <div className="lg:col-span-7 bg-[#0a1f44] text-white p-8 sm:p-10 rounded-3xl border border-slate-800">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#f26b1d]">
                Fast Technical Response
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 mb-3">
                Send an Enquiry
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Tell us about your requirements, tooling specs, or nameplate details. You can also specify drawing files and required quantities.
              </p>
              <button
                onClick={() => handleOpenInquiry()}
                className="w-full py-4 rounded-xl bg-[#f26b1d] hover:bg-[#d9560c] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Send size={16} /> Open Technical RFQ Drawer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050f24] text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Brand column */}
            <div className="space-y-4">
              <span className="text-lg font-black uppercase text-white tracking-wider">
                {company.name}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {company.description || "Precision carbide tools, industrial nameplates, electrical insulator parts and CNC job-work services."}
              </p>
            </div>

            {/* Navigation links */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Explore
              </h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#overview" className="hover:text-white transition-colors">Overview</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">Products & Catalog</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Engineering Services</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Categories
              </h4>
              <ul className="space-y-2 text-xs">
                {categories.slice(0, 4).map((c) => (
                  <li key={c}>
                    <a href="#products" className="hover:text-white transition-colors">{c}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact column */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Facility & Dispatch
              </h4>
              <div className="space-y-2 text-xs text-slate-400">
                <p>{company.address || `${city}, India`}</p>
                {cleanPhone && <p>Phone: +91 {cleanPhone}</p>}
                {company.email && <p>Email: {company.email}</p>}
                {company.gst && <p className="font-mono">GSTIN: {company.gst}</p>}
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} {company.name}. All rights reserved.</span>
            <span className="font-mono tracking-widest text-slate-400">
              PRECISION · QUALITY · RELIABILITY
            </span>
          </div>
        </div>
      </footer>

      {/* Global Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEnquire={(prod) => {
          setSelectedProduct(null);
          handleOpenInquiry(prod);
        }}
        company={company}
      />

      {/* Global RFQ Drawer */}
      <InquiryDrawer
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        product={inquiryProduct}
        company={company}
      />
    </div>
  );
}

function ProductCard({ product, company, onDetails, onEnquire }) {
  const imgUrl = product.image_url || product.image || (product.images && product.images[0]) || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80";

  return (
    <article className="h-full flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Product Image */}
      <div
        onClick={onDetails}
        className="aspect-[16/10] overflow-hidden bg-slate-100 cursor-pointer relative group"
      >
        <img
          src={imgUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[#050f24]/85 backdrop-blur-md text-white border border-white/10">
            {product.category}
          </span>
        )}
      </div>

      {/* Product Body */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h4
          onClick={onDetails}
          className="text-lg font-bold uppercase text-[#0a1f44] tracking-tight hover:text-[#f26b1d] transition-colors cursor-pointer"
        >
          {product.name}
        </h4>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2 mb-4 line-clamp-2 flex-1">
          {product.description}
        </p>

        {/* Pricing / MOQ badge if available */}
        {(product.price || product.moq) && (
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pt-2 border-t border-slate-100">
            {product.price && <span className="font-bold text-slate-900">{product.price}</span>}
            {product.moq && <span>MOQ: {product.moq}</span>}
          </div>
        )}

        {/* Card Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onEnquire}
            className="flex-1 py-2 px-3 rounded-full bg-[#f26b1d] hover:bg-[#d9560c] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow transition-all"
          >
            <Send size={12} /> Send Enquiry
          </button>
          <button
            onClick={onDetails}
            className="py-2 px-3 rounded-full border border-slate-300 hover:border-[#0a1f44] text-[#0a1f44] text-xs font-bold inline-flex items-center justify-center gap-1 transition-all"
          >
            Details <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}
