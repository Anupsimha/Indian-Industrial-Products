import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Check, Crown, Zap, Sparkles, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";

const ICONS = {
  slate: Building2,
  blue: Zap,
  orange: Crown,
  indigo: Sparkles,
  emerald: Sparkles,
  rose: Crown,
};

const COLOR_MAP = {
  slate: { ring: "border-slate-200", btn: "bg-slate-100 text-slate-700", badge: "bg-slate-700 text-white", icon: "text-slate-700" },
  blue: { ring: "border-blue-300 ring-2 ring-blue-100", btn: "bg-blue-800 text-white hover:bg-blue-900", badge: "bg-blue-800 text-white", icon: "text-blue-700" },
  orange: { ring: "border-orange-300 ring-2 ring-orange-100", btn: "bg-orange-600 text-white hover:bg-orange-700", badge: "bg-orange-600 text-white", icon: "text-orange-600" },
  indigo: { ring: "border-indigo-200", btn: "bg-indigo-700 text-white hover:bg-indigo-800", badge: "bg-indigo-700 text-white", icon: "text-indigo-700" },
  emerald: { ring: "border-emerald-200", btn: "bg-emerald-700 text-white hover:bg-emerald-800", badge: "bg-emerald-700 text-white", icon: "text-emerald-700" },
  rose: { ring: "border-rose-200", btn: "bg-rose-700 text-white hover:bg-rose-800", badge: "bg-rose-700 text-white", icon: "text-rose-700" },
};

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState("monthly");

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  const loadRazorpayScript = () => {
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
  };

  const choose = async (p) => {
    if (!user) { toast.error("Please sign in to subscribe"); return; }
    if (p.monthly_price === 0 && p.name === "Enterprise") { toast.message("Talk to sales: sales@iip.com"); return; }
    
    const price = billing === "yearly" ? p.yearly_price : p.monthly_price;
    if (price === 0) {
      try {
        const verifyRes = await api.post("/payments/verify", {
          razorpay_payment_id: "free_payment",
          razorpay_order_id: "free_plan",
          razorpay_signature: "free_signature",
          plan_id: p.id,
          billing_cycle: billing
        });
        if (verifyRes.data.ok) {
          toast.success("Subscribed to Free plan successfully!");
          window.location.reload();
        }
      } catch (e) {
        toast.error("Failed to switch plan.");
      }
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load Razorpay payment gateway.");
      return;
    }

    try {
      const orderRes = await api.post("/payments/create-order", {
        plan_id: p.id,
        billing_cycle: billing
      });
      const orderData = orderRes.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Indian Industrial Products",
        description: `Subscription: ${p.name}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post("/payments/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: p.id,
              billing_cycle: billing
            });
            if (verifyRes.data.ok) {
              toast.success(`Successfully subscribed to ${p.name}!`);
              window.location.reload();
            }
          } catch (e) {
            toast.error("Payment verification failed.");
          }
        },
        prefill: {
          name: user?.name || "Subscriber",
          email: user?.email || "",
          contact: user?.mobile || process.env.REACT_APP_SUPPORT_PHONE || "",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
          },
        },
        theme: {
          color: "#1e3a8a"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        const reason = response.error?.description || "Transaction declined";
        toast.error(`Payment Failed: ${reason}`);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to initiate payment");
    }
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="pricing-page">
      <BackButton className="mb-2" />
      <div className="text-center max-w-md mx-auto">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Pricing</div>
        <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">Grow your business with IIP</h1>
        <p className="text-sm text-slate-600 mt-2">Pick a plan that fits your scale. Upgrade anytime.</p>

        <div className="mt-4 inline-flex bg-slate-100 rounded-full p-1 text-xs font-semibold" data-testid="billing-toggle">
          {["monthly", "yearly"].map((b) => (
            <button key={b} onClick={() => setBilling(b)} data-testid={`billing-${b}`}
              className={`px-4 py-1.5 rounded-full transition-colors ${billing === b ? "bg-white text-blue-800 shadow-sm" : "text-slate-600"}`}>
              {b === "yearly" ? "Yearly · save 17%" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {plans.map((p) => {
          const c = COLOR_MAP[p.color] || COLOR_MAP.blue;
          const Icon = ICONS[p.color] || Zap;
          const price = billing === "yearly" ? p.yearly_price : p.monthly_price;
          const cad = billing === "yearly" ? "/year" : "/month";
          return (
            <div key={p.id} className={`relative bg-white rounded-2xl p-5 border ${c.ring} shadow-sm hover:shadow-md transition-all`} data-testid={`plan-${p.name.toLowerCase().replace(/\s+/g, "-")}`}>
              {p.badge && (
                <span className={`absolute -top-2 right-4 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${c.badge}`}>
                  {p.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Icon className={c.icon} />
                <div className="font-display text-2xl font-bold text-slate-900">{p.name}</div>
              </div>
              {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-slate-900">
                  {price > 0 ? `₹${price.toLocaleString("en-IN")}` : (p.name === "Enterprise" ? "Custom" : "₹0")}
                </span>
                {price > 0 && <span className="text-xs text-slate-500">{cad}</span>}
              </div>
              <ul className="mt-3 space-y-1.5">
                {(p.features || []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => choose(p)} data-testid={`plan-cta-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                className={`mt-4 w-full py-3 rounded-full font-semibold transition-colors ${c.btn}`}>
                {p.monthly_price === 0 && p.name !== "Enterprise" ? "Current Plan" : (p.name === "Enterprise" ? "Talk to sales" : "Choose plan")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
