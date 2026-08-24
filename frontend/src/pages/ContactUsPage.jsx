import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, MessageSquare, ArrowLeft, Send, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { whatsappLink } from "../lib/api";

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const phone = process.env.REACT_APP_SUPPORT_PHONE || "+91 9380036328";
  const email = process.env.REACT_APP_SUPPORT_EMAIL || "support@indianindustrialplatform.com";
  const address = process.env.REACT_APP_SUPPORT_ADDRESS || "No. 35 Suvarna Nagar Doddabidrekallu Nagasandra - 560073";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitted(true);
    toast.success("Thank you! Your message has been received. Our team will contact you within 24 hours.");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 text-white p-6 md:p-10 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight">Contact Us</h1>
          <p className="text-blue-200 text-sm max-w-xl">
            Have questions about industrial product sourcing, orders, or merchant onboarding? We are here to help.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building2 size={18} className="text-blue-900" />
              Company Details
            </h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              <strong className="text-slate-900">Indian Industrial Products (IIP)</strong><br />
              Registered Office: {address}
            </p>

            <hr className="border-slate-100" />

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-xs">
                <Phone size={16} className="text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Customer Support Phone</div>
                  <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-blue-800 font-semibold hover:underline">
                    {phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <Mail size={16} className="text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Support Email</div>
                  <a href={`mailto:${email}`} className="text-blue-800 font-semibold hover:underline">
                    {email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <Clock size={16} className="text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Business Hours</div>
                  <div className="text-slate-600">Mon – Sat: 9:00 AM – 7:00 PM IST</div>
                </div>
              </div>
            </div>

            <a
              href={whatsappLink(phone, "Hi IIP Support, I need assistance regarding industrial products.")}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <MessageSquare size={16} /> Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Send us a Message</h2>
            {submitted ? (
              <div className="p-8 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-base">Message Sent Successfully!</h3>
                <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                  Thank you for reaching out. A support representative will respond to your query at <strong className="text-emerald-900">{form.email}</strong> shortly.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", mobile: "", subject: "", message: "" }); }}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-colors mt-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Product enquiry / Payment issue"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Provide details about your query or product requirements..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Send size={16} /> Submit Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
