import React, { useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Award, BadgeCheck, Box, Check,
  ChevronRight, CircleCheck, Factory, Mail, MapPin, Menu, MessageCircle,
  Phone, Play, ShieldCheck, Truck, X
} from "lucide-react";
import TemplateHeader from "../components/TemplateHeader";
import TemplateFooter from "../components/TemplateFooter";
import ProductDetailModal from "../components/ProductDetailModal";
import InquiryDrawer from "../components/InquiryDrawer";
import TenantSEO from "../components/TenantSEO";

export default function BloomProTemplate({
  company = {},
  products = [],
  posts = [],
  reels = [],
  theme = {},
  seo = {}
}) {
  const [category, setCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState(null);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const visibleProducts = category === null ? products : products.filter((p) => p.category === category);

  const rawCerts = company.certifications || [];
  const certifications = rawCerts.map((item) => (typeof item === "string" ? { name: item } : item));
  const iso = certifications.some((item) => /iso/i.test(item.name || ""));
  
  const estYear = company.year_established || 2012;
  const years = Math.max(1, new Date().getFullYear() - estYear);

  const rawPhone = (company.whatsapp || company.mobile || "").replace(/\D/g, "");
  const wa = `https://wa.me/${rawPhone}?text=${encodeURIComponent(
    `Hello ${company.name}, I am visiting your website on Indian Industrial Platform and would like to inquire about your products.`
  )}`;

  const city = (company.location || company.city || "Bengaluru").split(",").slice(-2).join(",").trim();

  const handleOpenInquiry = (product = null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <TenantSEO seo={seo} company={company} />

      {/* Global Tenant Navbar */}
      <TemplateHeader
        company={company}
        theme={theme}
        onOpenInquiry={() => handleOpenInquiry()}
      />

      {/* Hero Section */}
      <section id="overview" className="relative isolate overflow-hidden bg-slate-50 border-b border-slate-200">
        {company.cover_url && (
          <img
            src={company.cover_url}
            alt={`${company.name} facility`}
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-25 filter blur-[1px]"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-50 via-slate-50/95 to-slate-50/70" />

        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-10">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-50 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-teal-800 uppercase">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              {company.tagline || company.category || "Verified Industrial Manufacturer"}
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl text-slate-950 leading-[1.12]">
              {company.name}
              {company.headline && (
                <span className="mt-2 block text-2xl sm:text-3xl font-extrabold text-teal-800">
                  {company.headline}
                </span>
              )}
            </h1>

            <p className="mt-6 text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl">
              {company.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              {company.gst && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 shadow-sm">
                  <ShieldCheck size={16} className="text-teal-700" /> GST: {company.gst}
                </span>
              )}
              {iso && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 shadow-sm">
                  <Award size={16} className="text-teal-700" /> ISO Certified
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 shadow-sm">
                <MapPin size={16} className="text-teal-700" /> {city}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-800 text-white font-bold text-sm hover:bg-teal-900 shadow-md shadow-teal-900/10 transition-all hover:scale-[1.02]"
              >
                Explore Products <ArrowRight size={16} />
              </a>

              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02]"
              >
                <MessageCircle size={17} /> WhatsApp Inquiry
              </a>

              <button
                onClick={() => handleOpenInquiry()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-300 text-slate-800 font-bold text-sm hover:bg-slate-100 transition-all"
              >
                Request Custom Quote
              </button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
              <CircleCheck size={15} className="text-teal-700 shrink-0" />
              <span>Established {estYear}</span>
              <span className="mx-1">·</span>
              <span>{company.delivery_area ? `${company.delivery_area}` : `${company.location || "Pan-India delivery"}`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Strip */}
      <section className="border-b border-slate-200 bg-white" aria-label="Company statistics">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-6 py-8 sm:grid-cols-4 lg:px-10 gap-6">
          {[
            { icon: Factory, value: `${years}+`, label: "Years in Operation" },
            { icon: Box, value: String(products.length).padStart(2, "0"), label: "Products Cataloged" },
            { icon: Truck, value: company.delivery_area || "Pan-India", label: "Delivery Network" },
            { icon: BadgeCheck, value: iso ? "ISO" : String(certifications.length).padStart(2, "0"), label: iso ? "Certified Quality" : "Certifications" }
          ].map((stat, i) => (
            <div key={stat.label} className={`flex items-center gap-4 py-2 sm:justify-center ${i > 0 ? "sm:border-l sm:border-slate-100" : ""}`}>
              <stat.icon size={28} strokeWidth={1.5} className="hidden sm:block text-teal-800/80" />
              <div>
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products Catalog */}
      <section id="products" className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold tracking-widest text-teal-800 uppercase">
              Our Product Range
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
              {company.catalog_heading || "Engineered Products & Capabilities"}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Showing {visibleProducts.length} verified items manufactured by {company.name}
            </p>
          </div>

          <a
            href={`mailto:${company.email || ""}`}
            className="flex items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors"
          >
            Direct Technical Inquiry <ArrowUpRight size={16} />
          </a>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-8 mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              category === null
                ? "bg-teal-800 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((cName) => (
            <button
              key={cName}
              onClick={() => setCategory(cName)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                category === cName
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cName}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[1.65] overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.moq && (
                    <span className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur-sm">
                      MOQ: {product.moq}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                    {product.category || "Industrial Product"}
                  </p>
                  <h3
                    onClick={() => setSelectedProduct(product)}
                    className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors line-clamp-1 cursor-pointer"
                  >
                    {product.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-4">
                <div className="text-lg font-black text-slate-900">
                  {product.price || "Contact for Price"}
                  {product.price && <span className="ml-1 text-[10px] font-medium text-slate-400">/ unit</span>}
                </div>

                <button
                  onClick={() => handleOpenInquiry(product)}
                  className="px-4 py-2 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-teal-800 transition-all flex items-center gap-1.5 shrink-0"
                >
                  Request Quote <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>

        {visibleProducts.length === 0 && (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl">
            <Box size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No products found in this category.</p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
          <ShieldCheck size={16} className="text-teal-800" />
          <span>Quality-assured industrial manufacturing</span>
          <span className="mx-1">·</span>
          <Check size={15} className="text-teal-800" />
          <span>Direct quote from manufacturer</span>
        </div>
      </section>

      {/* Certifications Section */}
      {certifications.length > 0 && (
        <section id="certifications" className="border-y border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold tracking-widest text-teal-800 uppercase">
                  Quality & Compliance
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  Standards You Can Rely On
                </h2>
              </div>
              <p className="max-w-md text-xs sm:text-sm text-slate-600">
                Rigorous testing, industrial compliance, and quality frameworks implemented across our manufacturing processes.
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {certifications.map((cert, i) => {
                const Icon = i === 0 ? Award : i === 1 ? Factory : ShieldCheck;
                return (
                  <article key={cert.name} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                      <Icon size={24} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cert.name}</h3>
                      {cert.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{cert.description}</p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-teal-800">
                        <CircleCheck size={13} /> Verified Standard
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Factory Updates / Posts */}
      {(posts.length > 0 || reels.length > 0) && (
        <section id="updates" className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="text-[11px] font-extrabold tracking-widest text-teal-800 uppercase">
            Factory Floor Updates
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Latest From {company.name}
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={`post-${post.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {post.media_urls?.[0] ? (
                  <img
                    src={post.media_urls[0]}
                    alt={post.content}
                    className="aspect-[1.8] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[1.8] w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Factory size={36} />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                    Company Bulletin
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">
                    {post.content}
                  </p>
                </div>
              </article>
            ))}

            {reels.map((reel) => (
              <article key={`reel-${reel.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm relative">
                <div className="relative aspect-[1.8] overflow-hidden bg-black flex items-center justify-center">
                  {reel.thumbnail_url && (
                    <img src={reel.thumbnail_url} alt={reel.content} className="w-full h-full object-cover opacity-80" />
                  )}
                  <span className="absolute flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-teal-800 shadow-lg">
                    <Play size={20} className="ml-1" />
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-slate-800">{reel.content}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Global Tenant Footer */}
      <TemplateFooter
        company={company}
        onOpenInquiry={() => handleOpenInquiry()}
      />

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        company={company}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenInquiry={(p) => {
          setSelectedProduct(null);
          handleOpenInquiry(p);
        }}
      />

      <InquiryDrawer
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        product={inquiryProduct}
        company={company}
      />
    </div>
  );
}
