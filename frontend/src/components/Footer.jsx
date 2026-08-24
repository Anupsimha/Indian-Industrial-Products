import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, ShieldCheck, Scale, FileText, RefreshCw, HelpCircle, Heart } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => {
  const phone = process.env.REACT_APP_SUPPORT_PHONE || "+91 9876543210";
  const email = process.env.REACT_APP_SUPPORT_EMAIL || "support@iipmarketplace.com";
  const address = process.env.REACT_APP_SUPPORT_ADDRESS || "Ground Floor, B-12, Industrial Hub, Okhla Phase 3, New Delhi - 110020";

  return (
    <footer className="bg-slate-900 text-slate-300 pt-10 pb-20 md:pb-10 border-t border-slate-800" data-testid="global-footer">
      <div className="max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="bg-white/10 p-2.5 rounded-2xl inline-block">
              <Logo size={36} />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              India's Premier Industrial B2B Marketplace & Business Network. Connecting verified manufacturers, suppliers, and industrial buyers pan-India.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold pt-1">
              <ShieldCheck size={16} /> Verified Razorpay Merchant
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Marketplace</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Home Feed</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Industrial Products</Link></li>
              <li><Link to="/companies" className="hover:text-white transition-colors">Verified Companies</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Subscription Plans</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
            </ul>
          </div>

          {/* Compliance & Legal Policies (Razorpay Requirements) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Legal & Support</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors flex items-center gap-1.5" data-testid="footer-link-contact">
                  <HelpCircle size={14} className="text-blue-400" /> Contact Us & Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors flex items-center gap-1.5" data-testid="footer-link-terms">
                  <Scale size={14} className="text-blue-400" /> Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors flex items-center gap-1.5" data-testid="footer-link-privacy">
                  <FileText size={14} className="text-blue-400" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-blue-400 transition-colors flex items-center gap-1.5" data-testid="footer-link-refund">
                  <RefreshCw size={14} className="text-blue-400" /> Refund & Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Contact Headquarters</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-orange-500 shrink-0" />
                <a href={`tel:${phone.replace(/\D/g, "")}`} className="hover:text-white transition-colors">{phone}</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-orange-500 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>© {new Date().getFullYear()} Indian Industrial Products (IIP). All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-400">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-400">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-slate-400">Refunds</Link>
            <Link to="/contact" className="hover:text-slate-400">Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
