import React, { useState } from "react";
import { Phone, MessageCircle, ShieldCheck, Menu, X, ExternalLink, Building2 } from "lucide-react";

export default function TemplateHeader({ company, theme = {}, onOpenInquiry }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cleanPhone = (company.mobile || "").replace(/[^0-9+]/g, "");
  const whatsappNum = (company.whatsapp || company.mobile || "").replace(/[^0-9]/g, "");
  const primaryColor = theme.primary_color || "#1e3a8a";

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-all shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Company Branding */}
          <div className="flex items-center gap-3.5 min-w-0">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-12 h-12 rounded-xl object-cover bg-white/10 p-0.5 border border-white/20 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                <Building2 size={24} className="text-white" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {company.name || "Industrial Enterprise"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  Verified Manufacturer
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs">
                {company.location || "Industrial Hub, India"}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
            <a href="#products" className="hover:text-white transition-colors">Catalog & Products</a>
            <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
            {company.posts_count > 0 && (
              <a href="#updates" className="hover:text-white transition-colors">Factory Updates</a>
            )}
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          {/* Direct CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {whatsappNum && (
              <a
                href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(`Hello ${company.name}, I found your website on Indian Industrial Platform and would like to inquire about your products.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}

            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
              >
                <Phone size={14} />
                Call Now
              </a>
            )}

            {onOpenInquiry && (
              <button
                onClick={onOpenInquiry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-500/25 transition-all"
              >
                Request Quote
              </button>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {whatsappNum && (
              <a
                href={`https://wa.me/${whatsappNum}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-emerald-600 text-white"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-300">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white"
            >
              About Us
            </a>
            <a
              href="#products"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white"
            >
              Catalog & Products
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white"
            >
              Capabilities
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white"
            >
              Contact & Location
            </a>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {onOpenInquiry && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenInquiry();
                }}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-blue-600 text-white shadow-md"
              >
                Request Quotation
              </button>
            )}
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="w-full py-2.5 rounded-xl text-center text-xs font-semibold bg-white/10 text-white border border-white/15 flex items-center justify-center gap-2"
              >
                <Phone size={14} /> Call {company.mobile}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
