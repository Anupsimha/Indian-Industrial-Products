import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-10 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight flex items-center gap-3">
            <Scale size={28} className="text-blue-400" /> Terms & Conditions
          </h1>
          <p className="text-slate-300 text-xs md:text-sm">
            Last Updated: August 2026 | Indian Industrial Platform (IIP) Marketplace
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-blue-900" /> 1. Introduction & Acceptance
            </h2>
            <p>
              Welcome to <strong>Indian Industrial Platform (IIP)</strong>. These Terms & Conditions govern your access to and use of our B2B e-commerce platform, website, and mobile services. By registering an account, placing an order, or accessing any part of IIP, you agree to be bound by these Terms and our Privacy & Refund Policies.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">2. User Accounts & Identity Verification</h2>
            <p>
              To purchase or list industrial products, users must register an account with valid contact credentials. Business buyers and sellers agree to provide accurate company names, GST numbers, and contact details. You are responsible for keeping your login credentials confidential.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">3. Pricing, Payments & Razorpay Gateway</h2>
            <p>
              All prices listed on IIP are displayed in <strong>Indian Rupees (INR)</strong> and include applicable Goods and Services Tax (GST) unless explicitly indicated otherwise.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Payments are processed securely via authorized payment gateways (including <strong>Razorpay</strong>, Credit/Debit cards, NetBanking, and UPI).</li>
              <li>IIP does not store full credit card numbers, CVVs, or banking PINs on its servers.</li>
              <li>Order confirmation is issued upon successful gateway signature verification.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">4. Shipping, Logistics & Delivery</h2>
            <p>
              Industrial product delivery is fulfilled in partnership with integrated logistics providers (such as <strong>Shiprocket</strong> and carrier partners).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Estimated delivery timelines are provided during checkout based on delivery Pincode.</li>
              <li>Dispatches occur within 1–3 business days following payment confirmation.</li>
              <li>Buyers receive live tracking details via SMS/Email or the Order History page.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">5. Cancellation, Return & Refund Policy</h2>
            <p>
              Buyers may cancel un-shipped orders through the dashboard within 24 hours of order placement.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Damaged, defective, or incorrect industrial products can be reported within 7 days of delivery for replacement or full refund.</li>
              <li>Approved refunds are processed back to the original payment source via Razorpay within <strong>5–7 business days</strong>.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">6. Limitation of Liability & Governing Law</h2>
            <p>
              IIP shall not be held liable for indirect or consequential damages resulting from platform downtime or third-party carrier delays. These terms shall be governed by and construed in accordance with the laws of <strong>India</strong>, and disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-4">
            <Link to="/contact" className="text-blue-800 font-bold hover:underline">Contact Support</Link>
            <Link to="/privacy" className="text-blue-800 font-bold hover:underline">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-blue-800 font-bold hover:underline">Refund & Shipping Policy</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
