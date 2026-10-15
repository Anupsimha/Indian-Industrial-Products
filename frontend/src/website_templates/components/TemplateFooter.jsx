import React from "react";
import { ShieldCheck, MapPin, Phone, Mail, Building2, ExternalLink } from "lucide-react";

export default function TemplateFooter({ company = {} }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-14 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
          
          {/* Company Brief & GST */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-10 h-10 rounded-xl object-cover bg-white/10 p-0.5 border border-white/20"
                />
              )}
              <div>
                <h3 className="text-white font-bold text-base tracking-tight">{company.name}</h3>
                <p className="text-xs text-slate-400">{company.business_type || "Verified Industrial Manufacturer"}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {company.description || "Manufacturer and supplier of high precision industrial components and manufacturing solutions."}
            </p>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {company.gst && (
                <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
                  GST: <strong>{company.gst}</strong>
                </span>
              )}
              {company.pan && (
                <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
                  PAN: <strong>{company.pan}</strong>
                </span>
              )}
              {company.year_established && (
                <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                  Est. <strong>{company.year_established}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#about" className="hover:text-white transition-colors">About Enterprise</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Product Catalog</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">Machinery & Certifications</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact & Factory Map</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Factory & Works</h4>
            <div className="space-y-2.5">
              <p className="flex items-start gap-2 text-slate-300">
                <MapPin size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <span>{company.address || company.location || "Industrial Cluster, India"}</span>
              </p>
              {company.mobile && (
                <p className="flex items-center gap-2 text-slate-300">
                  <Phone size={14} className="text-emerald-400 shrink-0" />
                  <span>{company.mobile}</span>
                </p>
              )}
              {company.email && (
                <p className="flex items-center gap-2 text-slate-300">
                  <Mail size={14} className="text-orange-400 shrink-0" />
                  <span>{company.email}</span>
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Platform Attribution */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {currentYear} {company.name}. All industrial rights reserved.</p>
          
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://indianindustrialplatform.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Building2 size={13} />
              Indian Industrial Platform
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
