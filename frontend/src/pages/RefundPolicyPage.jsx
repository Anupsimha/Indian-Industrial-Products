import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Truck, CheckCircle, AlertTriangle } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-10 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight flex items-center gap-3">
            <RefreshCw size={28} className="text-blue-400" /> Refund, Cancellation & Shipping Policy
          </h1>
          <p className="text-slate-300 text-xs md:text-sm">
            Merchant Compliance Policies for Indian Industrial Platform (IIP Marketplace)
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">

          {/* Section 1: Cancellation */}
          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" /> 1. Order Cancellation Policy
            </h2>
            <p>
              Buyers can cancel an order directly from their account dashboard or by contacting customer support before the order has been dispatched by the manufacturer/warehouse.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li><strong>Pre-dispatch Cancellation:</strong> 100% full refund with zero cancellation fees if cancelled prior to courier pickup.</li>
              <li><strong>Post-dispatch Cancellation:</strong> Once an order is handed over to the courier partner (Shiprocket), dispatch cannot be recalled immediately. You may request a return upon delivery.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2: Returns & Refunds */}
          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw size={18} className="text-blue-900" /> 2. Return & Refund Eligibility
            </h2>
            <p>
              We accept return and refund requests within <strong>7 days of delivery</strong> under the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Product delivered is physically damaged, defective, or non-functional.</li>
              <li>Product specifications or dimensions delivered differ significantly from the listed specifications.</li>
              <li>Incorrect items or missing quantities delivered.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3: Refund Process & Timelines */}
          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" /> 3. Refund Processing Timelines
            </h2>
            <p>
              Once a returned item is received and inspected at our distribution warehouse, your refund will be processed promptly:
            </p>
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs text-blue-950 font-medium">
              <div><strong>Payment Method:</strong> Original Source (Razorpay Gateway / Credit Card / UPI / NetBanking)</div>
              <div><strong>Processing Window:</strong> Approved refunds will be credited within <strong>5 to 7 business days</strong> back to your original payment account.</div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4: Shipping & Delivery Policy */}
          <section className="space-y-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck size={18} className="text-purple-700" /> 4. Shipping & Delivery Terms
            </h2>
            <p>
              Logistics services are operated via integrated courier providers (including <strong>Shiprocket</strong>, Delhivery, Bluedart, Shadowfax, and DTDC).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li><strong>Dispatch Time:</strong> Orders are processed and dispatched within 1–3 business days.</li>
              <li><strong>Delivery Timelines:</strong> Estimated delivery timeline is 2–7 business days depending on location and courier service selected during checkout.</li>
              <li><strong>Shipment Tracking:</strong> Customers receive real-time AWB tracking updates via SMS, email, and the IIP Orders Dashboard.</li>
            </ul>
          </section>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-4">
            <Link to="/contact" className="text-blue-800 font-bold hover:underline">Contact Customer Support</Link>
            <Link to="/terms" className="text-blue-800 font-bold hover:underline">Terms & Conditions</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
