import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-10 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight flex items-center gap-3">
            <ShieldCheck size={28} className="text-emerald-400" /> Privacy Policy
          </h1>
          <p className="text-slate-300 text-xs md:text-sm">
            Last Updated: August 2026 | How Indian Industrial Products Protects Your Data
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock size={18} className="text-blue-900" /> 1. Information We Collect
            </h2>
            <p>
              When you use Indian Industrial Products (IIP), we collect essential information required to fulfill product orders, verify buyer/seller profiles, and process transactions safely:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li><strong>Account Details:</strong> Name, business email, contact phone number, company name, GSTIN.</li>
              <li><strong>Transaction Data:</strong> Billing/shipping address, order history, and payment gateway tokens (via Razorpay).</li>
              <li><strong>Technical Logs:</strong> IP address, device browser type, and authentication cookies.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">2. How We Use Your Data</h2>
            <p>
              Your data is strictly utilized to provide marketplace services:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Processing product purchases, invoicing, and logistics shipment dispatch.</li>
              <li>Facilitating buyer-manufacturer enquiries and secure messaging.</li>
              <li>Detecting fraudulent activity and ensuring payment gateway security compliance.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">3. Data Sharing & Security</h2>
            <p>
              We do not sell or rent personal information to third-party advertisers. Data is shared exclusively with necessary operational infrastructure partners:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li><strong>Payment Partners:</strong> Razorpay for PCI-DSS compliant payment processing.</li>
              <li><strong>Logistics Partners:</strong> Shiprocket and courier partners to enable delivery.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye size={18} className="text-blue-900" /> 4. Data Protection & Contact
            </h2>
            <p>
              For privacy queries or data deletion requests, please contact our Data Protection Officer at:
              <br />
              <strong className="text-slate-900">Email:</strong> {process.env.REACT_APP_SUPPORT_EMAIL || "support@iipmarketplace.com"}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
