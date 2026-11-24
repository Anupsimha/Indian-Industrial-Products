import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api, { directWhatsappLink, formatApiError } from "../lib/api";
import {
  Phone, MapPin, Tag, Clock, MessageSquare, Play, Lock, Sparkles, X,
  ShieldCheck, Loader2, CheckCircle, Mail, AlertTriangle, Search, ChevronDown, CheckCircle2, Image, Zap, Trash2,
  FileText, ExternalLink, Eye, IndianRupee, UserCheck, ShieldAlert, Package, Wrench, Building2, Layers
} from "lucide-react";
import { Navigate, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";
import { LocationPicker } from "../components/LocationPicker";
import { useLeadInterests } from "../context/LeadInterestContext";

const LEAD_TYPE_FILTERS = [
  { id: "all", label: "All Leads", icon: Layers },
  { id: "product", label: "Product Leads", icon: Package },
  { id: "service", label: "Service Leads", icon: Wrench },
  { id: "real_estate", label: "Real Estate Leads", icon: Building2 },
];

const LEAD_TYPE_META = {
  product: {
    label: "Product",
    icon: Package,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  service: {
    label: "Service",
    icon: Wrench,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200",
  },
  real_estate: {
    label: "Real Estate",
    icon: Building2,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

function getLeadTypeBadge(leadType) {
  return LEAD_TYPE_META[leadType] || LEAD_TYPE_META.product;
}

function getLeadTitle(lead) {
  if (lead?.product_name) return lead.product_name;
  const meta = lead?.lead_metadata && typeof lead.lead_metadata === "object" ? lead.lead_metadata : {};
  if ((lead?.lead_type || "product") === "service" && meta.service_name) {
    return meta.service_name;
  }
  if ((lead?.lead_type || "product") === "real_estate") {
    const title = [meta.transaction_type, meta.property_type].filter(Boolean).join(" - ");
    if (title) return title;
  }
  return (lead?.requirement || "").slice(0, 60);
}

function getLeadMetadataChips(lead) {
  const leadType = lead?.lead_type || "product";
  const meta = lead?.lead_metadata && typeof lead.lead_metadata === "object" ? lead.lead_metadata : {};
  const chips = [];

  if (leadType === "service") {
    if (meta.service_mode) {
      chips.push({ label: "Mode", value: meta.service_mode, cls: "bg-teal-50 text-teal-800 border-teal-200" });
    }
    const durationVal = meta.project_duration || (!meta.project_duration && lead?.quantity ? lead.quantity : "");
    if (durationVal) {
      chips.push({ label: "Duration", value: durationVal, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.frequency) {
      chips.push({ label: "Frequency", value: meta.frequency, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.scope_details) {
      chips.push({ label: "Scope", value: meta.scope_details, cls: "bg-emerald-50 text-emerald-800 border-emerald-200" });
    }
  } else if (leadType === "real_estate") {
    if (meta.transaction_type) {
      chips.push({ label: "Deal", value: meta.transaction_type, cls: "bg-amber-50 text-amber-800 border-amber-200" });
    }
    if (meta.property_type) {
      chips.push({ label: "Property", value: meta.property_type, cls: "bg-purple-50 text-purple-800 border-purple-200" });
    }
    if (meta.area_size) {
      chips.push({
        label: "Area",
        value: [meta.area_size, meta.area_unit].filter(Boolean).join(" "),
        cls: "bg-slate-100 text-slate-800 border-slate-200",
      });
    } else if (meta.area_sqft) {
      chips.push({
        label: "Area",
        value: `${Number(meta.area_sqft).toLocaleString("en-IN")} sq.ft`,
        cls: "bg-slate-100 text-slate-800 border-slate-200",
      });
    } else if (lead?.quantity) {
      chips.push({ label: "Area", value: lead.quantity, cls: "bg-slate-100 text-slate-800 border-slate-200" });
    }
    if (meta.possession_timeline) {
      chips.push({ label: "Possession", value: meta.possession_timeline, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.power_load_kva) {
      chips.push({ label: "Power", value: `${meta.power_load_kva} kVA`, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
  }

  return chips;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

function resolveBackendUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return `${BACKEND_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function isPdfUrl(url) {
  return String(url || "").toLowerCase().split("?")[0].endsWith(".pdf");
}

function formatINR(val, maxDecimals = 0) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: maxDecimals })}`;
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── OTP Unlock Modal (same as RequirementsPage) ──────────────────────────────
function UnlockModal({ stats, enqId, initialToken, initialEmailHint, onClose, onSuccess }) {
  const [step, setStep] = useState(initialToken ? "otp" : "warning");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState(initialToken || "");
  const [emailHint, setEmailHint] = useState(initialEmailHint || "");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Top-Up states
  const [topupRate, setTopupRate] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [buyingTopup, setBuyingTopup] = useState(false);

  const usedCount = stats?.used_this_month ?? 0;
  const totalLimit = stats?.unlocks_per_month;
  const remaining = stats?.remaining;
  const isUnlimited = totalLimit == null;
  const quotaFull = !isUnlimited && remaining === 0;

  useEffect(() => {
    if (quotaFull && enqId) {
      setTopupLoading(true);
      api.get(`/topup-plans/lead-rate/${enqId}`)
        .then((res) => setTopupRate(res.data))
        .catch(() => {})
        .finally(() => setTopupLoading(false));
    }
  }, [quotaFull, enqId]);

  const handlePayTopup = async () => {
    setBuyingTopup(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay payment gateway.");
        setBuyingTopup(false);
        return;
      }

      const orderRes = await api.post("/payments/create-order-topup", {
        lead_id: enqId,
      });
      const orderData = orderRes.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Indian Industrial Platform",
        description: `Lead Unlock Top-Up (₹${orderData.base_price} + ₹${orderData.gst} 18% GST = ₹${orderData.total})`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post("/payments/verify-topup", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              lead_id: enqId,
            });
            if (verifyRes.data.ok) {
              toast.success("Lead unlocked via top-up purchase!");
              if (verifyRes.data.download_url) {
                // Offer invoice download
                toast("Tax Invoice ready", {
                  action: {
                    label: "Download Invoice",
                    onClick: () => window.open(resolveBackendUrl(verifyRes.data.download_url), "_blank"),
                  },
                  duration: 8000,
                });
              }
              onSuccess(enqId, {
                mobile: verifyRes.data.mobile,
                name: verifyRes.data.name,
              });
            }
          } catch (err) {
            toast.error(err.response?.data?.detail || "Payment verification failed.");
          } finally {
            setBuyingTopup(false);
          }
        },
        prefill: {
          name: "Subscriber",
        },
        modal: {
          ondismiss: () => {
            setBuyingTopup(false);
            toast.info("Payment cancelled.");
          },
        },
        theme: {
          color: "#ea580c"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(response.error?.description || "Transaction failed");
        setBuyingTopup(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create payment order");
      setBuyingTopup(false);
    }
  };

  const handleRequestOtp = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/requirements/${enqId}/request-unlock`);
      if (data.already_unlocked) {
        onSuccess(enqId, { mobile: data.mobile, name: data.name });
        return;
      }
      setToken(data.token);
      setEmailHint(data.email_hint);
      setStep("otp");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send OTP.");
      onClose();
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      const { data } = await api.post(`/requirements/${enqId}/confirm-unlock`, {
        token,
        otp: otp.trim(),
      });
      onSuccess(enqId, { mobile: data.mobile, name: data.name });
    } catch (e) {
      setOtpError(e.response?.data?.detail || "Incorrect OTP.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ animation: "slideUp 0.25s ease" }}
      >
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === "warning" ? (
              <AlertTriangle size={18} className="text-amber-400" />
            ) : (
              <Mail size={18} className="text-blue-300" />
            )}
            <span className="text-white font-semibold text-sm">
              {step === "warning" ? "Confirm Unlock" : "Enter OTP"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white"
            disabled={sending || verifying}
          >
            <X size={18} />
          </button>
        </div>

        {step === "warning" && (
          <div className="p-5 space-y-4">
            {!isUnlimited && (
              <div className={`rounded-xl p-4 border ${
                quotaFull
                  ? "bg-red-50 border-red-200"
                  : usedCount > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className={quotaFull ? "text-red-500" : usedCount > 0 ? "text-amber-500" : "text-emerald-500"} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${quotaFull ? "text-red-600" : usedCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    Monthly Quota
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-black ${quotaFull ? "text-red-600" : "text-slate-800"}`}>{usedCount}</span>
                  <span className="text-slate-400 font-medium mb-1"> / {totalLimit} used</span>
                </div>
                <div className="mt-2 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${quotaFull ? "bg-red-500" : usedCount / totalLimit > 0.7 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (usedCount / totalLimit) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-2 ${quotaFull ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {quotaFull ? "Monthly limit reached. Resets on the 1st." : `${remaining} unlock${remaining === 1 ? "" : "s"} remaining`}
                </p>
              </div>
            )}
            {isUnlimited && (
              <div className="rounded-xl p-4 border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Unlimited Lead Unlocks Available</span>
                </div>
              </div>
            )}
            
            {quotaFull ? (
              <div className="p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                    Lead Top-Up Unlock
                  </span>
                  {topupLoading && <Loader2 size={12} className="animate-spin text-orange-600" />}
                </div>
                <h4 className="font-display font-bold text-sm text-slate-900">
                  {topupRate ? `Unlock this lead for ₹${topupRate.price_inr}` : "Purchase Individual Lead Unlock"}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your monthly quota is exhausted. Based on this buyer lead's valuation ({topupRate?.valuation_range || "standard"}), you can buy an instant single lead unlock. Includes 18% GST Tax Invoice.
                </p>
                {topupRate && (
                  <div className="pt-1 text-xs text-slate-700 font-semibold flex items-center justify-between border-t border-orange-200/60">
                    <span>Rate: ₹{topupRate.price_inr} + ₹{Math.round(topupRate.price_inr * 0.18)} (18% GST)</span>
                    <span className="font-black text-blue-900">Total: ₹{Math.round(topupRate.price_inr * 1.18)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">An OTP will be sent to your registered email to confirm this unlock.</p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} disabled={sending || buyingTopup} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              {!quotaFull ? (
                <button onClick={handleRequestOtp} disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send OTP</>}
                </button>
              ) : (
                <button
                  onClick={handlePayTopup}
                  disabled={buyingTopup || topupLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-60"
                >
                  {buyingTopup ? (
                    <><Loader2 size={15} className="animate-spin" /> Processing…</>
                  ) : (
                    <><Sparkles size={14} /> Buy Top-Up Lead</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <Mail size={24} className="text-blue-600" />
              </div>
              <p className="text-sm text-slate-600">OTP sent to <strong>{emailHint}</strong>. Enter it below.</p>
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                placeholder="• • • • • •"
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl border-2 outline-none ${otpError ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 focus:border-blue-500"}`}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
              {otpError && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><X size={12} /> {otpError}</p>}
            </div>
            <p className="text-xs text-slate-400 text-center">⏱ OTP expires in 10 minutes</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setStep("warning"); setOtp(""); setOtpError(""); }}
                disabled={verifying}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={verifying || otp.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {verifying ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : <><CheckCircle size={14} /> Verify &amp; Unlock</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
    </div>
  );
}

// ─── Sales Partner Lead Purchase Modal ────────────────────────────────────────
function SalesPartnerBuyModal({ lead, user, onClose, onSuccess }) {
  const [paying, setPaying] = useState(false);

  const totalDealValue = Number(lead.total_deal_value || 0);
  const baseLeadValue = Number(lead.lead_value ?? Math.round(totalDealValue * 0.02));
  const gstAmount = Number((baseLeadValue * 0.18).toFixed(2));
  const totalPayable = Number((baseLeadValue + gstAmount).toFixed(2));
  const protectionAmount = Number((baseLeadValue * 0.5).toFixed(2));

  const handlePayAndUnlock = async () => {
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        toast.error("Failed to load Razorpay payment gateway.");
        setPaying(false);
        return;
      }

      const { data: orderData } = await api.post(`/sales-partner/leads/${lead.id}/create-order`);

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Indian Industrial Platform",
        description: `Sales Partner Lead Unlock (${formatINR(orderData.base_price)} + ${formatINR(orderData.gst, 2)} GST = ${formatINR(orderData.total, 2)})`,
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || "Buyer",
          email: user?.email || undefined,
          contact: user?.mobile || undefined,
        },
        handler: async function (response) {
          try {
            const verifyRes = await api.post(`/sales-partner/leads/${lead.id}/verify-payment`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data?.ok) {
              toast.success("Sales Partner lead purchased & unlocked!");
              if (verifyRes.data.download_url) {
                const invoiceUrl = resolveBackendUrl(verifyRes.data.download_url);
                toast("Tax Invoice ready", {
                  description: verifyRes.data.invoice_number ? `Invoice #${verifyRes.data.invoice_number}` : undefined,
                  action: {
                    label: "Download Invoice",
                    onClick: () => window.open(invoiceUrl, "_blank"),
                  },
                  duration: 10000,
                });
              }
              onSuccess(lead.id, verifyRes.data);
            } else {
              toast.error("Payment verification did not complete.");
            }
          } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail) || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info("Payment cancelled.");
          },
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(response.error?.description || "Transaction failed");
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to initiate payment");
      setPaying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !paying && onClose()}
      data-testid="sales-partner-buy-modal"
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUp 0.25s ease" }}
      >
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-amber-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <IndianRupee size={18} className="text-amber-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">Buy Sales Partner Lead</div>
              <div className="text-[10px] text-amber-200 font-semibold uppercase tracking-wider">
                Paid Unlock Only • Exclusive Lead
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={paying}
            className="text-white/70 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-xs font-extrabold text-slate-900 line-clamp-1">
              {getLeadTitle(lead)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{lead.category}</span>
              {lead.location && <span>• {lead.location}</span>}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Deal Value</span>
              <span className="font-bold text-slate-900">{formatINR(totalDealValue)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Base Lead Value (2%)</span>
              <span className="font-bold text-slate-900">{formatINR(baseLeadValue, 2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>GST (18%)</span>
              <span className="font-bold text-slate-900">{formatINR(gstAmount, 2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="font-extrabold text-slate-900">Total Payable</span>
              <span className="font-black text-indigo-700" data-testid="partner-modal-total">
                {formatINR(totalPayable, 2)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Excluded from monthly packages:</span> Sales Partner leads are verified high-intent deals unlocked individually via direct payment and never consume package credits.
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">50% Fake-Lead Protection:</span> If admin confirms this lead is fake, 50% ({formatINR(protectionAmount, 2)}) is refunded to your wallet.
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={paying}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePayAndUnlock}
              disabled={paying}
              data-testid="pay-unlock-partner-lead-btn"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-700 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-60"
            >
              {paying ? (
                <><Loader2 size={14} className="animate-spin" /> Processing…</>
              ) : (
                <><Lock size={14} /> Pay &amp; Unlock Lead</>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
    </div>
  );
}

// ─── Dispute Reason Options & Labels ──────────────────────────────────────────
const DISPUTE_REASON_OPTIONS = [
  {
    code: "deal_not_done",
    label: "Deal not done",
    description: "Contacted client, but requirement did not convert into a deal",
    tone: "sky",
  },
  {
    code: "price_too_high",
    label: "Price too high",
    description: "Client budget or pricing expectations did not match",
    tone: "sky",
  },
  {
    code: "fake_lead",
    label: "Fake lead",
    description: "Client denied any requirement or lead details are fabricated",
    tone: "rose",
  },
  {
    code: "wrong_phone",
    label: "Wrong phone",
    description: "Phone number is incorrect, unreachable, or disconnected",
    tone: "rose",
  },
];

const DISPUTE_REASON_LABELS = Object.fromEntries(
  DISPUTE_REASON_OPTIONS.map((opt) => [opt.code, opt.label])
);

// ─── Report Lead Dispute Modal ────────────────────────────────────────────────
function FakeReportModal({ target, onClose, onSubmit, submitting }) {
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setReasonCode("");
    setNotes("");
  }, [target?.deal?.id]);

  if (!target) return null;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!reasonCode) {
      toast.error("Please select a reason for this dispute.");
      return;
    }
    onSubmit(target.deal.id, reasonCode, notes.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
      data-testid="fake-report-modal"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-rose-700 to-rose-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <ShieldAlert size={18} />
            <span className="font-bold text-sm">Report Lead Dispute</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-white/70 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900">
            <div className="font-bold mb-0.5">{target.leadTitle}</div>
            <p className="text-rose-800">
              Our admin team will review your dispute. If confirmed, 50% of the base lead price (
              <strong>{formatINR(target.deal.refund_share_amount ?? Number(target.deal.lead_value_base || 0) * 0.5, 2)}</strong>) will be refunded to your wallet.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Dispute Reason *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISPUTE_REASON_OPTIONS.map((opt) => {
                const selected = reasonCode === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setReasonCode(opt.code)}
                    data-testid={`dispute-reason-${opt.code}`}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selected
                        ? "border-rose-500 bg-rose-50 ring-2 ring-rose-200"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`text-xs font-bold ${selected ? "text-rose-800" : "text-slate-900"}`}>
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Additional Notes / Context (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details for admin review (e.g., call summary, quoted price vs client budget, exact issue)..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
              data-testid="fake-report-reason-input"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reasonCode}
              data-testid="submit-fake-report-btn"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> Submitting…</>
              ) : (
                <><AlertTriangle size={14} /> Submit Dispute</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bill Preview Modal ───────────────────────────────────────────────────────
function BillPreviewModal({ bill, onClose }) {
  if (!bill) return null;
  const fullUrl = resolveBackendUrl(bill.url);
  const pdf = isPdfUrl(fullUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="bill-preview-modal"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600 shrink-0" />
              Uploaded Transaction Bill
            </h3>
            {bill.uploadedAt && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Uploaded on {new Date(bill.uploadedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold inline-flex items-center gap-1"
            >
              <ExternalLink size={13} /> Open in New Tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-auto flex-1 bg-slate-50 flex flex-col items-center justify-center gap-3">
          {bill.notes && (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Partner Notes: </span>
              {bill.notes}
            </div>
          )}
          {pdf ? (
            <div className="w-full text-center space-y-3 py-8">
              <FileText size={40} className="mx-auto text-rose-500" />
              <p className="text-xs text-slate-600 font-medium">PDF Document attached by Sales Partner.</p>
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                <ExternalLink size={14} /> View / Download PDF Bill
              </a>
            </div>
          ) : (
            <img
              src={fullUrl}
              alt="Uploaded Transaction Bill"
              className="max-w-full max-h-[65vh] rounded-xl border border-slate-200 shadow-sm object-contain bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sales Partner Deal Lifecycle & Verification Panel ────────────────────────
function SalesPartnerDealPanel({ lead, approvingDealId, onApproveBill, onOpenFakeReport, onViewBill }) {
  const deal = lead?.deal;
  if (!deal) return null;

  const status = deal.status;
  const refundAmt = Number(deal.refund_share_amount ?? Number(deal.lead_value_base || 0) * 0.5);
  const partnerAmt = Number(deal.partner_share_amount ?? Number(deal.lead_value_base || 0) * 0.5);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5" data-testid={`partner-deal-panel-${deal.id}`}>
      {/* Sales Partner Contact Details alongside client contact */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <UserCheck size={11} /> Sales Partner Contact
          </div>
          <div className="font-bold text-slate-900 mt-0.5">
            {deal.sales_partner_name || "Verified Sales Partner"}
          </div>
          {deal.sales_partner_mobile && (
            <div className="text-slate-600 inline-flex items-center gap-1 mt-0.5">
              <Phone size={11} /> {deal.sales_partner_mobile}
            </div>
          )}
        </div>
        {deal.sales_partner_mobile && (
          <a
            href={`tel:${deal.sales_partner_mobile}`}
            className="px-3 py-1.5 bg-white text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-indigo-100 shrink-0"
          >
            <Phone size={12} /> Call Partner
          </a>
        )}
      </div>

      {/* Deal Lifecycle & Verification Status */}
      {status === "UNLOCKED" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Awaiting transaction bill upload from Sales Partner</div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Once your deal proceeds, the Sales Partner will upload the transaction bill for your approval.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenFakeReport(lead, deal)}
            data-testid={`report-fake-btn-${deal.id}`}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert size={13} /> Report Issue / Dispute
          </button>
        </div>
      )}

      {status === "INVOICE_UPLOADED" && (
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-amber-50 border-2 border-indigo-300 rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-extrabold text-indigo-950">
                  Transaction Bill Uploaded by Sales Partner
                </div>
                {deal.bill_notes && (
                  <p className="text-[11px] text-slate-700 mt-0.5">Notes: {deal.bill_notes}</p>
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
              Action Needed
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {deal.bill_image_url && (
              <button
                type="button"
                onClick={() => onViewBill(deal)}
                data-testid={`view-bill-btn-${deal.id}`}
                className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Eye size={13} /> View Uploaded Bill
              </button>
            )}
            <button
              type="button"
              onClick={() => onApproveBill(deal.id)}
              disabled={approvingDealId === deal.id}
              data-testid={`approve-bill-btn-${deal.id}`}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              {approvingDealId === deal.id ? (
                <><Loader2 size={13} className="animate-spin" /> Approving…</>
              ) : (
                <><CheckCircle2 size={13} /> Approve Invoice &amp; Release 50% ({formatINR(partnerAmt, 2)})</>
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenFakeReport(lead, deal)}
              data-testid={`report-fake-btn-${deal.id}`}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ShieldAlert size={13} /> Report Issue / Dispute
            </button>
          </div>
        </div>
      )}

      {status === "FAKE_REPORTED" && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
              <AlertTriangle size={12} /> Dispute Reported — Our admin team will review your dispute
            </span>
            {deal.dispute_reason_code && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-800 font-bold text-[11px]"
                data-testid={`deal-dispute-reason-${deal.id}`}
              >
                {DISPUTE_REASON_LABELS[deal.dispute_reason_code] || deal.dispute_reason_code}
              </span>
            )}
          </div>
          {deal.fake_report_reason && (
            <p className="text-rose-900 mt-1">
              <span className="font-bold">Your Notes: </span>
              {deal.fake_report_reason}
            </p>
          )}
        </div>
      )}

      {status === "RELISTED" && (
        <div
          className="bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs"
          data-testid={`deal-relisted-card-${deal.id}`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
              <ShieldCheck size={12} /> Deal Re-listed • 50% Refund Credited to Wallet ({formatINR(refundAmt, 2)})
            </span>
            {deal.dispute_reason_code && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-800 font-bold text-[11px]">
                {DISPUTE_REASON_LABELS[deal.dispute_reason_code] || deal.dispute_reason_code}
              </span>
            )}
          </div>
          {deal.relisted_at && (
            <p className="text-[11px] text-indigo-900 font-medium">
              Re-listed on {new Date(deal.relisted_at).toLocaleString("en-IN")}
            </p>
          )}
          {deal.admin_decision_notes && (
            <p className="text-[11px] text-slate-700">
              <span className="font-bold">Admin Decision Notes: </span>
              {deal.admin_decision_notes}
            </p>
          )}
        </div>
      )}

      {status === "APPROVED" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              <CheckCircle2 size={12} /> Invoice Approved • Deal Completed
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {deal.resolved_by ? "Approved via Admin Override" : "Approved by Buyer"}
            </span>
          </div>
          {deal.bill_image_url && (
            <button
              type="button"
              onClick={() => onViewBill(deal)}
              className="text-[11px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
            >
              <Eye size={12} /> View Uploaded Bill
            </button>
          )}
          {deal.admin_decision_notes && (
            <p className="text-[11px] text-emerald-900">
              <span className="font-bold">Admin Notes: </span>
              {deal.admin_decision_notes}
            </p>
          )}
        </div>
      )}

      {status === "REFUNDED" && (
        <div className="bg-rose-50 border border-emerald-200 rounded-xl p-3 space-y-1 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-rose-200 font-bold text-[11px]">
            <ShieldCheck size={12} /> 50% Refunded ({formatINR(refundAmt, 2)}) to Your Wallet
          </div>
          {deal.admin_decision_notes && (
            <p className="text-[11px] text-slate-700 mt-1">
              <span className="font-bold">Admin Decision Notes: </span>
              {deal.admin_decision_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Media thumbnail strip (always visible, not gated) ────────────────────────
function LeadMediaStrip({ urls }) {
  const [lightbox, setLightbox] = useState(null);
  if (!urls || urls.length === 0) return null;

  const BASE = import.meta.env.VITE_API_BASE || "";
  const toSrc = (u) => {
    if (!u || typeof u !== "string") return "";
    const trimmed = u.trim();
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) return trimmed;
    return `${BASE}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  };

  const isPdf = (u) => u.toLowerCase().endsWith(".pdf");
  const visible = urls.slice(0, 3);
  const extra = urls.length - visible.length;

  return (
    <>
      <div className="mt-3 flex gap-2 flex-wrap">
        {visible.map((url, i) => (
          isPdf(url) ? (
            <a
              key={i}
              href={toSrc(url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Image size={13} className="text-red-500" />
              PDF
            </a>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(toSrc(url))}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0"
            >
              <img
                src={toSrc(url)}
                alt={`Attachment ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 2 && extra > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-black">+{extra}</span>
                </div>
              )}
            </button>
          )
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>
          <img
            src={lightbox}
            alt="Attachment"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialStatusFilter =
    initialTabParam === "partner_leads" || initialTabParam === "partner_purchased"
      ? initialTabParam
      : "All";
  const initialLeadTypeParam = searchParams.get("lead_type");
  const initialLeadTypeFilter = ["product", "service", "real_estate"].includes(initialLeadTypeParam)
    ? initialLeadTypeParam
    : "all";

  const {
    selectedLeads,
    selectedLeadIds,
    count,
    isPersonalized,
    isWidgetDismissed,
    dismissInterestWidget,
    isLeadSelected,
    toggleLeadInterest,
    setShowConfirmModal,
    resetInterests,
  } = useLeadInterests();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);

  // Filters
  const [filter, setFilter] = useState({ category: "", sort: "recent" });
  const [loc, setLoc] = useState({ state: "", city: "", industrial_area: "" });
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [leadTypeFilter, setLeadTypeFilter] = useState(initialLeadTypeFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // OTP State (standard leads)
  const [modalLeadId, setModalLeadId] = useState(null);
  const [pendingUnlock, setPendingUnlock] = useState(null); // {id, token, emailHint}
  const [unlockStats, setUnlockStats] = useState(null);

  // Sales Partner Lead Purchase & Deal Lifecycle State
  const [buyPartnerLead, setBuyPartnerLead] = useState(null);
  const [approvingDealId, setApprovingDealId] = useState(null);
  const [fakeReportTarget, setFakeReportTarget] = useState(null); // { leadTitle, deal }
  const [reportingFake, setReportingFake] = useState(false);
  const [billPreview, setBillPreview] = useState(null); // { url, notes, uploadedAt }

  // Sync URL ?tab= changes (e.g. navigating from header/profile to ?tab=partner_purchased)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "partner_leads" || tabParam === "partner_purchased") {
      setStatusFilter(tabParam);
      setShowRecommendedOnly(false);
    }
  }, [searchParams]);

  // ── Fetch categories ──
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  // ── Fetch requirements / leads ──
  const loadLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (loc.state) params.set("state", loc.state);
      if (loc.city) params.set("city", loc.city);
      if (loc.industrial_area) params.set("industrial_area", loc.industrial_area);
      if (leadTypeFilter !== "all") params.set("lead_type", leadTypeFilter);
      params.set("sort", filter.sort);

      if (isPersonalized && (showRecommendedOnly || statusFilter === "recommended")) {
        params.set("personalized", "true");
        if (selectedLeadIds && selectedLeadIds.length > 0) {
          params.set("lead_ids", selectedLeadIds.join(","));
        }
      }

      const [reqRes, purchasedRes] = await Promise.all([
        api.get(`/requirements?${params}`),
        statusFilter === "partner_purchased"
          ? api.get("/sales-partner/purchased-deals").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const baseLeads = Array.isArray(reqRes.data) ? reqRes.data : [];
      const purchasedDeals = Array.isArray(purchasedRes.data) ? purchasedRes.data : [];

      if (statusFilter === "partner_purchased" && purchasedDeals.length > 0) {
        const dealByLeadId = new Map(purchasedDeals.map((d) => [d.lead_id, d]));
        const seenIds = new Set();
        const merged = baseLeads.map((l) => {
          seenIds.add(l.id);
          const pd = dealByLeadId.get(l.id);
          if (!pd) return l;
          return {
            ...l,
            deal: {
              ...(l.deal || {}),
              ...pd,
            },
          };
        });

        purchasedDeals.forEach((pd) => {
          if (!seenIds.has(pd.lead_id) && pd.lead) {
            const leadInfo = pd.lead;
            merged.push({
              ...leadInfo,
              id: leadInfo.id || pd.lead_id,
              is_sales_partner_lead: true,
              is_sold_out: true,
              sold_to_user_id: user.id,
              is_unlocked: true,
              created_at: leadInfo.created_at || pd.created_at,
              requirement: leadInfo.requirement || "",
              deal: pd,
            });
          }
        });
        setLeads(merged);
      } else {
        setLeads(baseLeads);
      }
    } catch (err) {
      console.error("Error loading leads:", err);
      toast.error("Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [filter, loc, leadTypeFilter, user, isPersonalized, showRecommendedOnly, statusFilter, selectedLeadIds]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ── Fetch unlock stats (manufacturer/supplier/admin with paid plans only) ──
  const fetchStats = useCallback(async () => {
    if (!user) return;
    if (!["manufacturer", "supplier", "admin"].includes(user.role)) return;
    const hasPlan = user.plan_name && user.plan_name.toLowerCase() !== "free" &&
      (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    if (hasPlan || user.role === "admin") {
      try {
        const { data } = await api.get("/requirements/unlock-stats");
        setUnlockStats(data);
      } catch (err) {}
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (authLoading) return <div className="p-10 text-center text-slate-400 font-semibold" data-testid="leads-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const canBrowseLeads = ["buyer", "manufacturer", "supplier", "admin"].includes(user.role);
  const hasPaidPlan = user.plan_name && user.plan_name.toLowerCase() !== "free" &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  const handleStatusTabClick = (tabId) => {
    setStatusFilter(tabId);
    if (tabId === "recommended") setShowRecommendedOnly(true);
    else setShowRecommendedOnly(false);

    if (tabId === "partner_leads" || tabId === "partner_purchased") {
      setSearchParams({ tab: tabId }, { replace: true });
    } else if (searchParams.get("tab")) {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      setSearchParams(next, { replace: true });
    }
  };

  const handleUnlockClick = async (leadId) => {
    if (!hasPaidPlan && user.role !== "admin") {
      toast.error("Subscription required to unlock contact details.");
      navigate("/pricing");
      return;
    }
    try {
      const { data } = await api.post(`/requirements/${leadId}/request-unlock`);
      if (data.already_unlocked) {
        setLeads((arr) =>
          arr.map((l) =>
            l.id === leadId ? { ...l, is_unlocked: true, mobile: data.mobile, name: data.name } : l
          )
        );
        toast.success("Contact revealed!");
        return;
      }
      setPendingUnlock({ id: leadId, token: data.token, emailHint: data.email_hint });
      setModalLeadId(leadId);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to initiate unlock");
    }
  };

  const handleModalSuccess = (leadId, { mobile, name }) => {
    setModalLeadId(null);
    setPendingUnlock(null);
    setLeads((arr) =>
      arr.map((l) =>
        l.id === leadId ? { ...l, is_unlocked: true, mobile, name } : l
      )
    );
    toast.success("Contact unlocked! 🎉");
    fetchStats();
  };

  const handlePartnerPurchaseSuccess = (leadId, verifyData) => {
    setBuyPartnerLead(null);
    setLeads((arr) =>
      arr.map((l) =>
        l.id === leadId
          ? {
              ...l,
              is_unlocked: true,
              is_sold_out: true,
              sold_to_user_id: user.id,
              mobile: verifyData?.mobile || l.mobile,
              name: verifyData?.name || l.name,
              deal: verifyData?.deal || l.deal,
            }
          : l
      )
    );
    loadLeads();
  };

  const handleApprovePartnerBill = async (dealId) => {
    setApprovingDealId(dealId);
    try {
      const { data } = await api.post(`/sales-partner/deals/${dealId}/approve-bill`);
      if (data?.deal) {
        setLeads((arr) =>
          arr.map((l) =>
            l.deal?.id === dealId ? { ...l, deal: { ...l.deal, ...data.deal } } : l
          )
        );
      }
      toast.success("Invoice approved! 50% share released to Sales Partner.");
      loadLeads();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to approve invoice");
    } finally {
      setApprovingDealId(null);
    }
  };

  const handleSubmitFakeReport = async (dealId, reasonCode, notes) => {
    setReportingFake(true);
    try {
      const { data } = await api.post(`/sales-partner/deals/${dealId}/report-fake`, {
        reason_code: reasonCode,
        reason: notes || "",
      });
      if (data?.deal) {
        setLeads((arr) =>
          arr.map((l) =>
            l.deal?.id === dealId ? { ...l, deal: { ...l.deal, ...data.deal } } : l
          )
        );
      }
      toast.success(
        data?.message ||
          "Our admin team will review your dispute. If confirmed, 50% of the base lead will be refunded to your wallet."
      );
      setFakeReportTarget(null);
      loadLeads();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to submit lead dispute");
    } finally {
      setReportingFake(false);
    }
  };

  const handleDeleteLead = async (leadId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this lead requirement? This cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/requirements/${leadId}`);
      toast.success("Lead requirement deleted successfully");
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete lead");
    }
  };

  // Filter in Frontend for Lead Type, Status & Search
  const filteredLeads = leads.filter((l) => {
    // 0. Lead Type filter
    const normalizedLeadType = l.lead_type || "product";
    const matchLeadType = leadTypeFilter === "all" || normalizedLeadType === leadTypeFilter;

    // 1. Status Tab filter
    let matchStatus = true;
    if (statusFilter === "partner_leads") {
      matchStatus = Boolean(l.is_sales_partner_lead);
    } else if (statusFilter === "partner_purchased") {
      matchStatus = Boolean(l.is_sales_partner_lead && l.is_unlocked && l.sold_to_user_id === user.id);
    } else if (statusFilter === "my_leads") {
      matchStatus = l.is_unlocked;
    } else if (statusFilter === "new") {
      matchStatus = l.status === "new" || l.status === "pending";
    } else if (statusFilter === "in_progress") {
      matchStatus = l.status === "in_progress";
    } else if (statusFilter === "closed") {
      matchStatus = l.status === "closed" || l.status === "completed";
    }

    // 2. Search query filter
    let matchQuery = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const metaText =
        l.lead_metadata && typeof l.lead_metadata === "object"
          ? Object.values(l.lead_metadata).filter(Boolean).join(" ").toLowerCase()
          : "";
      matchQuery =
        (l.requirement || "").toLowerCase().includes(q) ||
        (l.product_name || "").toLowerCase().includes(q) ||
        (l.category || "").toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q) ||
        metaText.includes(q);
    }

    return matchLeadType && matchStatus && matchQuery;
  });

  return (
    <div className="pb-36 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto" data-testid="leads-page">
      <BackButton className="mb-2" />

      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Live Buyer Feed</div>
          <h1 className="font-display text-2xl font-black text-slate-900 leading-tight">Leads</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time buyer requirements — unlock to reveal contact details.</p>
        </div>
        <button
          onClick={() => toast.success("Learn how buyer lead matching works!")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-blue-900 text-blue-900 font-extrabold text-[10px] uppercase hover:bg-blue-50 transition-colors"
        >
          <Play size={10} className="fill-blue-900" /> How it works
        </button>
      </div>

      {!canBrowseLeads ? (
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500" data-testid="leads-empty-state">
          Switch to a Buyer, Manufacturer, or Supplier account to browse and unlock leads.
        </div>
      ) : (
        <>
          {/* Quota Usage Banner (for paid users) */}
          {unlockStats && (
            <div className={`mt-3 rounded-xl px-4 py-3 flex items-center justify-between gap-3 border ${
              unlockStats.remaining === 0
                ? "bg-red-50 border-red-200"
                : unlockStats.remaining <= 5
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ShieldCheck size={18} className={
                  unlockStats.remaining === 0 ? "text-red-500 shrink-0"
                  : unlockStats.remaining <= 5 ? "text-amber-500 shrink-0"
                  : "text-emerald-500 shrink-0"
                } />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800">
                      {unlockStats.unlocks_per_month == null
                        ? "Unlimited Lead Unlocks Available"
                        : `Lead Balance: ${unlockStats.remaining} remaining (${unlockStats.used_this_month} / ${unlockStats.unlocks_per_month} used)`}
                    </p>
                  </div>
                  {unlockStats.unlocks_per_month != null && (
                    <div className="mt-1.5 h-1.5 bg-white/80 rounded-full overflow-hidden max-w-xs">
                      <div
                        className={`h-full rounded-full transition-all ${
                          unlockStats.remaining === 0 ? "bg-red-500"
                          : unlockStats.remaining <= 5 ? "bg-amber-500"
                          : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (unlockStats.used_this_month / unlockStats.unlocks_per_month) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                  {unlockStats.remaining === 0 && (
                    <p className="text-[10px] text-red-600 font-semibold mt-1">
                      Monthly plan unlock balance is over. You can purchase instant lead top-ups based on lead value!
                    </p>
                  )}
                </div>
              </div>
              {unlockStats.remaining === 0 && (
                <Link to="/pricing" className="text-xs font-extrabold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shrink-0 hover:bg-blue-50 shadow-sm">
                  Upgrade Plan
                </Link>
              )}
            </div>
          )}

          {/* Top Lead Type Filter Row */}
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="leads-type-filter-row">
            {LEAD_TYPE_FILTERS.map((lt) => {
              const Icon = lt.icon;
              const active = leadTypeFilter === lt.id;
              return (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => setLeadTypeFilter(lt.id)}
                  data-testid={`lead-type-filter-${lt.id}`}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all inline-flex items-center gap-1.5 ${
                    active
                      ? lt.id === "service"
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : lt.id === "real_estate"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-blue-900 text-white border-blue-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={13} />
                  <span>{lt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Clean Filters (Adopted from original RequirementsPage) */}
          <div className="mt-2.5 space-y-2 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
            <LocationPicker value={loc} onChange={setLoc} testid="req-loc" />
            <div className="relative">
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                data-testid="req-filter-category"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none appearance-none font-semibold text-slate-700"
              >
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ ...filter, sort: "recent" })}
                data-testid="req-sort-recent"
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${filter.sort === "recent" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"}`}
              >
                <Clock size={11} /> Recent
              </button>
              <button
                onClick={() => setFilter({ ...filter, sort: "trending" })}
                data-testid="req-sort-trending"
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${filter.sort === "trending" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"}`}
              >
                <Sparkles size={11} /> Trending
              </button>
              {(filter.category || loc.state || leadTypeFilter !== "all") && (
                <button
                  onClick={() => {
                    setFilter({ category: "", sort: "recent" });
                    setLoc({ state: "", city: "", industrial_area: "" });
                    setLeadTypeFilter("all");
                  }}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Status capsules and search bar inline container */}
          <div className="mt-4 flex flex-col gap-2.5">
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="leads-status-tabs">
              {[
                { id: "All", label: "All" },
                ...(isPersonalized ? [{ id: "recommended", label: "★ Recommended" }] : []),
                { id: "new", label: "New" },
                { id: "in_progress", label: "In Progress" },
                { id: "closed", label: "Closed" },
                { id: "my_leads", label: "My Leads" },
                { id: "partner_leads", label: "Sales Partner Leads" },
                { id: "partner_purchased", label: "Purchased Partner Leads" },
              ].map((tab) => {
                const isPartnerTab = tab.id === "partner_leads" || tab.id === "partner_purchased";
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleStatusTabClick(tab.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      statusFilter === tab.id
                        ? tab.id === "recommended"
                          ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-sm ring-2 ring-blue-300"
                          : isPartnerTab
                          ? "bg-gradient-to-r from-indigo-600 to-amber-600 text-white shadow-sm ring-2 ring-amber-200"
                          : "bg-orange-600 text-white shadow-sm"
                        : tab.id === "recommended"
                        ? "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                        : isPartnerTab
                        ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                    data-testid={`lead-status-tab-${tab.id.toLowerCase().replace(/_/g, "-")}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Live Search bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by requirement, product or category..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-white text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Personalization Active Banner */}
          {isPersonalized && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 text-xs text-blue-950">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles size={16} className="fill-white" />
                </div>
                <div>
                  <span className="font-bold">Tailored recommendations are active!</span>
                  <p className="text-[11px] text-blue-800">
                    Your feed, products, reels, and leads are customized for your selected industrial interests.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showRecommendedOnly;
                    setShowRecommendedOnly(next);
                    if (next) setStatusFilter("recommended");
                    else setStatusFilter("All");
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                    showRecommendedOnly || statusFilter === "recommended"
                      ? "bg-blue-600 text-white ring-2 ring-blue-300"
                      : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                  }`}
                  data-testid="toggle-recommended-leads-btn"
                >
                  <Sparkles size={12} className={showRecommendedOnly || statusFilter === "recommended" ? "fill-white" : "text-blue-600"} />
                  {showRecommendedOnly || statusFilter === "recommended" ? "Showing Tailored Leads" : "View Tailored Leads"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Interests ({count})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecommendedOnly(false);
                    if (statusFilter === "recommended") setStatusFilter("All");
                    resetInterests();
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Leads Card list */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.length === 0 && (
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
                {loading
                  ? "Loading leads..."
                  : statusFilter === "partner_purchased"
                  ? "You haven't purchased any Sales Partner leads yet."
                  : statusFilter === "partner_leads"
                  ? "No Sales Partner leads matching your filters right now."
                  : "No active buyer requirements matching your filters."}
              </div>
            )}

            {filteredLeads.map((lead) => {
              const isUnlocked = Boolean(lead.is_unlocked);
              const isPartnerLead = Boolean(lead.is_sales_partner_lead);
              const isSoldOut = Boolean(isPartnerLead && lead.is_sold_out && !isUnlocked);
              const dealValue = Number(lead.total_deal_value || 0);
              const leadPrice = Number(lead.lead_value ?? Math.round(dealValue * 0.02));
              const isInterested = isLeadSelected(lead.id);
              const directMobile = isPartnerLead
                ? (lead.mobile && !String(lead.mobile).includes("•") ? lead.mobile : lead.client_mobile)
                : lead.mobile;
              const isMobileUnmasked = Boolean(directMobile && !String(directMobile).includes("•"));
              const leadType = lead.lead_type || "product";
              const typeBadge = getLeadTypeBadge(leadType);
              const TypeBadgeIcon = typeBadge.icon;
              const metaChips = getLeadMetadataChips(lead);
              const cardTitle = getLeadTitle(lead);
              return (
                <article
                  key={lead.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all text-left ${
                    isInterested
                      ? "border-blue-400 ring-1 ring-blue-400/30"
                      : isPartnerLead
                      ? "border-amber-200/90"
                      : "border-slate-200"
                  }`}
                  data-testid={`lead-card-${lead.id}`}
                >
                  {isPartnerLead && (
                    <div className="mb-3 flex items-center justify-between gap-2 flex-wrap bg-gradient-to-r from-amber-50 via-indigo-50 to-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-900">
                        <ShieldCheck size={12} className="text-amber-600 shrink-0" />
                        Sales Partner Lead • Paid Unlock Only
                      </span>
                      <span className="text-[10px] font-semibold italic text-amber-800">
                        Excluded from subscription packages
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${typeBadge.badgeCls}`}
                          data-testid={`lead-type-badge-${lead.id}`}
                        >
                          <TypeBadgeIcon size={10} />
                          {typeBadge.label}
                        </span>
                        {lead.category && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 inline-flex items-center gap-1">
                            <Tag size={10} /> {lead.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                        {cardTitle}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLeadInterest(lead);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition-all active:scale-95 ${
                          isInterested
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/40"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        }`}
                        data-testid={`lead-interest-btn-${lead.id}`}
                        title={isInterested ? "Click to remove interest" : "Click to express interest"}
                      >
                        <Sparkles size={11} className={isInterested ? "fill-white text-white" : "text-amber-500"} />
                        {isInterested ? "Interested ✓" : "I'm Interested"}
                      </button>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                        isSoldOut
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : isUnlocked
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {isSoldOut ? "SOLD OUT" : isUnlocked ? "Unlocked" : "Locked"}
                      </span>

                      {user?.role === "admin" && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          data-testid={`admin-delete-lead-${lead.id}`}
                          title="Delete Lead (Admin Only)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {metaChips.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid={`lead-meta-chips-${lead.id}`}>
                      {metaChips.map((chip, idx) => (
                        <span
                          key={`${chip.label}-${idx}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${chip.cls}`}
                        >
                          <span className="opacity-70 text-[10px] uppercase tracking-wider">{chip.label}:</span>
                          <span className="font-bold">{chip.value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3.5 space-y-2 border-b border-slate-100 pb-3.5 text-xs text-slate-600">
                    {isPartnerLead && (
                      <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-1">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Deal Value</div>
                          <div className="text-xs font-extrabold text-slate-900 mt-0.5">{formatINR(dealValue)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Lead Price (2%)</div>
                          <div className="text-xs font-extrabold text-indigo-800 mt-0.5">{formatINR(leadPrice)} + 18% GST</div>
                        </div>
                      </div>
                    )}
                    {lead.quantity && leadType === "product" && (
                      <div className="flex items-center gap-2">
                        <span className="w-14 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Qty</span>
                        <span className="font-bold text-slate-900">{lead.quantity}</span>
                      </div>
                    )}
                    {lead.budget && (
                      <div className="flex items-center gap-2">
                        <span className="w-14 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Budget</span>
                        <span className="font-bold text-emerald-700">{lead.budget}</span>
                      </div>
                    )}
                    {lead.required_by && (
                      <div className="flex items-center gap-2">
                        <span className="w-14 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Timeframe</span>
                        <span className="font-semibold text-slate-800">{lead.required_by}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span>
                        {lead.industrial_area
                          ? `${lead.industrial_area}, ${lead.city || lead.location}`
                          : lead.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {lead.requirement}
                  </p>

                  {/* Media attachments — visible before and after unlock */}
                  <LeadMediaStrip urls={lead.media_urls} />

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">{lead.name || lead.client_name}</div>
                      <div className={`text-slate-500 inline-flex items-center gap-1 ${isUnlocked ? "" : "blur-[3px] select-none"}`}>
                        <Phone size={11} /> {lead.mobile || lead.client_mobile}
                      </div>
                    </div>

                    {isPartnerLead ? (
                      isSoldOut ? (
                        <button
                          type="button"
                          disabled
                          data-testid={`lead-sold-out-btn-${lead.id}`}
                          className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <Lock size={12} /> Sold Out
                        </button>
                      ) : !isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => setBuyPartnerLead(lead)}
                          data-testid={`buy-partner-lead-btn-${lead.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          <Lock size={12} /> Buy Lead ({formatINR(leadPrice)})
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center flex-wrap">
                          <a
                            href={`tel:${lead.mobile || lead.client_mobile}`}
                            className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-blue-100"
                          >
                            <Phone size={12} /> Call
                          </a>
                          <a
                            href={
                              isMobileUnmasked
                                ? directWhatsappLink(
                                    directMobile,
                                    `Hi ${lead.name || lead.client_name}, regarding your requirement: ${(lead.requirement || "").slice(0, 60)}`
                                  )
                                : "#"
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              if (!isMobileUnmasked) e.preventDefault();
                            }}
                            className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-[#20bd5a]"
                          >
                            <MessageSquare size={12} /> WhatsApp
                          </a>
                        </div>
                      )
                    ) : !isUnlocked ? (
                      <button
                        onClick={() => handleUnlockClick(lead.id)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <Lock size={12} /> Unlock Contact
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center flex-wrap">
                        <a
                          href={`tel:${lead.mobile}`}
                          className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-blue-100"
                        >
                          <Phone size={12} /> Call
                        </a>
                        <a
                          href={
                            isMobileUnmasked
                              ? directWhatsappLink(
                                  directMobile,
                                  `Hi ${lead.name}, regarding your requirement: ${(lead.requirement || "").slice(0, 60)}`
                                )
                              : "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!isMobileUnmasked) e.preventDefault();
                          }}
                          className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-[#20bd5a]"
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  {isPartnerLead && isUnlocked && (
                    <SalesPartnerDealPanel
                      lead={lead}
                      approvingDealId={approvingDealId}
                      onApproveBill={handleApprovePartnerBill}
                      onOpenFakeReport={(targetLead, deal) =>
                        setFakeReportTarget({
                          leadTitle: getLeadTitle(targetLead),
                          deal,
                        })
                      }
                      onViewBill={(deal) =>
                        setBillPreview({
                          url: deal.bill_image_url,
                          notes: deal.bill_notes,
                          uploadedAt: deal.bill_uploaded_at,
                        })
                      }
                    />
                  )}
                </article>
              );
            })}
          </div>

          {/* Floating Selected Leads Bar */}
          {count > 0 && !isWidgetDismissed && (
            <div className="fixed bottom-24 inset-x-4 md:max-w-lg md:mx-auto z-30 animate-in slide-in-from-bottom-4 duration-200">
              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Sparkles size={13} className="fill-amber-400" />
                      Interests: {count}/5
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((slot) => (
                        <span
                          key={slot}
                          className={`w-2 h-2 rounded-full transition-all ${
                            slot < count ? "bg-blue-400 scale-110" : "bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    {count === 5
                      ? "5 leads selected! Click to confirm personalization."
                      : `Select ${5 - count} more lead${5 - count === 1 ? "" : "s"} for tailored feed`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
                      count === 5
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white animate-pulse"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    data-testid="confirm-leads-bar-btn"
                  >
                    <Sparkles size={13} className="fill-white" />
                    {count === 5 ? "Confirm 5 Leads" : "View Selected"}
                  </button>
                  <button
                    type="button"
                    onClick={dismissInterestWidget}
                    title="Hide bar (recommendations remain active)"
                    aria-label="Hide bar (recommendations remain active)"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Upgrade Banner — hidden for buyer role or when browsing partner leads */}
          {user.role !== "buyer" && statusFilter !== "partner_leads" && statusFilter !== "partner_purchased" && (
            <div className="fixed bottom-[72px] right-4 z-20 md:left-4 md:right-4 md:max-w-lg md:mx-auto">
              {/* Mobile Compact Floating Button */}
              <button
                onClick={() => {
                  toast.info("Opening subscription plans...");
                  navigate("/pricing");
                }}
                className="md:hidden px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-xl border border-orange-400/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Zap size={14} className="text-yellow-200 fill-yellow-200" /> Upgrade Plan
              </button>

              {/* Desktop Banner Card */}
              <div className="hidden md:flex bg-gradient-to-r from-blue-950 to-blue-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 items-center justify-between gap-4">
                <div>
                  <h4 className="font-display font-black text-sm">Unlock Unlimited Leads</h4>
                  <p className="text-[10px] text-white/70 mt-0.5">Upgrade to premium and unlock all buyer contact details instantly.</p>
                </div>
                <button
                  onClick={() => {
                    toast.info("Opening subscription plans...");
                    navigate("/pricing");
                  }}
                  className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* OTP Unlock Modal */}
      {modalLeadId && (
        <UnlockModal
          stats={unlockStats}
          enqId={modalLeadId}
          initialToken={pendingUnlock?.token}
          initialEmailHint={pendingUnlock?.emailHint}
          onClose={() => { setModalLeadId(null); setPendingUnlock(null); }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Sales Partner Lead Purchase Modal */}
      {buyPartnerLead && (
        <SalesPartnerBuyModal
          lead={buyPartnerLead}
          user={user}
          onClose={() => setBuyPartnerLead(null)}
          onSuccess={handlePartnerPurchaseSuccess}
        />
      )}

      {/* Report Fake Lead Modal */}
      {fakeReportTarget && (
        <FakeReportModal
          target={fakeReportTarget}
          onClose={() => setFakeReportTarget(null)}
          onSubmit={handleSubmitFakeReport}
          submitting={reportingFake}
        />
      )}

      {/* Uploaded Transaction Bill Preview Modal */}
      {billPreview && (
        <BillPreviewModal
          bill={billPreview}
          onClose={() => setBillPreview(null)}
        />
      )}
    </div>
  );
}
