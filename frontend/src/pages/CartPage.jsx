import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShoppingCart, Truck, CreditCard, CheckCircle, ArrowRight, ArrowLeft,
  Minus, Plus, X, MapPin, ShieldCheck, Smartphone, Banknote, Package,
  Star, Clock, Zap, ChevronRight, Loader2, BadgeCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const STEPS = [
  { id: "cart", label: "Cart", icon: ShoppingCart },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "checkout", label: "Summary", icon: CreditCard },
  { id: "payment", label: "Payment", icon: ShieldCheck },
];

export default function CartPage() {
  const { cart, updateQty, removeFromCart, clearCart, cartSubtotal, cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("cart");
  const [selectedDelivery, setSelectedDelivery] = useState("shiprocket_express");
  const [selectedPayment, setSelectedPayment] = useState("razorpay");
  const [upiId, setUpiId] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [rzpLoaded, setRzpLoaded] = useState(false);

  const [pincode, setPincode] = useState("110001");
  const [shiprocketOptions, setShiprocketOptions] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rateError, setRateError] = useState(null);

  const fetchShiprocketRates = useCallback(async (targetPincode) => {
    if (!targetPincode || targetPincode.length < 6) {
      toast.error("Please enter a valid 6-digit Pincode");
      return;
    }
    setLoadingRates(true);
    setRateError(null);
    try {
      const sellerPincode = cart[0]?.seller_pincode || cart[0]?.pincode || cart[0]?.company_pincode;
      const companyId = cart[0]?.company_id || cart[0]?.seller_id;
      const res = await api.post("/shipping/calculate-rate", {
        pincode: targetPincode,
        weight_kg: 1.5,
        pickup_pincode: sellerPincode || undefined,
        company_id: companyId || undefined
      });
      if (res.data?.ok && res.data?.options?.length > 0) {
        setShiprocketOptions(res.data.options);
        setSelectedDelivery(res.data.options[0].id);
        setRateError(null);
        toast.success(`Fetched live Shiprocket rates (From ${res.data.pickup_pincode || "Vendor"} to ${targetPincode})`);
      } else {
        setShiprocketOptions([]);
        const msg = res.data?.detail || res.data?.error || "No serviceable couriers found for this pincode.";
        setRateError(msg);
        toast.error(msg);
      }
    } catch (e) {
      setShiprocketOptions([]);
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || "Failed to calculate live rates from Shiprocket.";
      setRateError(msg);
      toast.error(msg);
    } finally {
      setLoadingRates(false);
    }
  }, [cart]);

  // Auto-fetch Shiprocket rates when entering delivery step
  useEffect(() => {
    if (step === "delivery" && shiprocketOptions.length === 0 && !loadingRates && !rateError) {
      fetchShiprocketRates(pincode);
    }
  }, [step, shiprocketOptions.length, loadingRates, rateError, pincode, fetchShiprocketRates]);


  const getSelectedDeliveryDetails = () => {
    if (cart.length === 0) return { label: "Standard Delivery", cost: 0 };
    if (shiprocketOptions.length > 0) {
      const found = shiprocketOptions.find(o => o.id === selectedDelivery) || shiprocketOptions[0];
      if (found) return { label: found.courier_name, cost: found.rate };
    }
    return { label: "Shipping Rate Pending", cost: 0 };
  };

  const activeDelivery = getSelectedDeliveryDetails();
  const deliveryCost = activeDelivery.cost;

  const taxableTotal = cartSubtotal + deliveryCost;
  const gstCost = Math.round(taxableTotal * 0.18);
  const cartTotal = cartSubtotal + deliveryCost + gstCost;

  // Load Razorpay checkout.js
  useEffect(() => {
    if (document.getElementById("rzp-script")) { setRzpLoaded(true); return; }
    const script = document.createElement("script");
    script.id = "rzp-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRzpLoaded(true);
    script.onerror = () => toast.error("Payment gateway failed to load.");
    document.body.appendChild(script);
  }, []);

  const validatePhoneForShiprocket = () => {
    const raw = user?.mobile || "";
    const cleanDigits = raw.replace(/\D/g, "").replace(/^91/, "");
    const clean10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
    if (!clean10 || clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
      toast.error(`Invalid mobile number '${raw || "missing"}' in your profile. Shiprocket requires a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.`);
      return false;
    }
    return true;
  };

  const placeOrder = async (paymentId = null, method = selectedPayment) => {
    if (!validatePhoneForShiprocket()) return;
    setIsPlacing(true);
    setStep("processing");
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          product_id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price || "On Request",
          image_url: item.image_url,
          company_id: item.company_id || "",
          company_name: item.company_name || "",
        })),
        subtotal: cartSubtotal,
        delivery_cost: deliveryCost,
        gst: gstCost,
        total: cartTotal,
        delivery_option: selectedDelivery,
        payment_method: method,
        payment_id: paymentId,
        address: user ? `${user.name}, India` : "India",
      };

      let orderId = `IIP${Date.now().toString().slice(-8)}`;
      if (user) {
        try {
          const { data } = await api.post("/orders", orderPayload);
          orderId = `IIP${data.id.slice(0, 8).toUpperCase()}`;
          setConfirmedOrder(data);
          if (data.shiprocket_warning) {
            toast.warning(`Order created, but Shiprocket notice: ${data.shiprocket_warning}`, { duration: 7000 });
          } else {
            toast.success("Order created & synced with Shiprocket!");
          }
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to place order.");
          setIsPlacing(false);
          setStep("payment");
          return;
        }
      } else {
        setConfirmedOrder({ id: orderId, total: cartTotal, payment_method: method });
      }

      setTimeout(() => {
        clearCart();
        setStep("confirmed");
        setIsPlacing(false);
      }, 2000);
    } catch {
      toast.error("Failed to place order. Please try again.");
      setStep("payment");
      setIsPlacing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!validatePhoneForShiprocket()) return;
    if (!rzpLoaded || !window.Razorpay) {
      toast.error("Payment gateway is loading, please wait a moment.");
      return;
    }
    
    setIsPlacing(true);
    try {
      const orderRes = await api.post("/payments/create-order-cart", {
        amount: cartTotal
      });
      const orderData = orderRes.data;
      
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "IIP – Indian Industrial Products",
        description: `Payment for ${cartCount} item(s)`,
        order_id: orderData.order_id,
        image: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=100&h=100&fit=crop",
        handler: async (response) => {
          try {
            setStep("processing");
            await api.post("/payments/verify-cart", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful!");
            placeOrder(response.razorpay_payment_id, "razorpay");
          } catch (verifyErr) {
            toast.error("Payment signature verification failed.");
            setStep("payment");
            setIsPlacing(false);
          }
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "",
          contact: user?.mobile || process.env.REACT_APP_SUPPORT_PHONE || "",
        },
        notes: { address: "IIP Industrial Marketplace" },
        theme: { color: "#1e3a5f" },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
            setIsPlacing(false);
          },
        },
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        const reason = response.error?.description || "Transaction declined";
        toast.error(`Payment Failed: ${reason}`);
        setIsPlacing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error("Failed to open payment gateway. Try another method.");
      setIsPlacing(false);
    }
  };

  const handleCodPayment = () => placeOrder(null, "cod");
  const handleUpiPayment = () => {
    if (!upiId || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    placeOrder(upiId, "upi");
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isCheckoutStep = ["cart", "delivery", "checkout", "payment"].includes(step);

  if (cart.length === 0 && step === "cart") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart size={40} className="text-slate-300" />
        </div>
        <h2 className="font-display text-2xl font-black text-slate-900 mb-2">Your Cart is Empty</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          Browse our industrial product catalogue and add items to get started.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-bold rounded-full hover:bg-blue-950 transition-all active:scale-95 shadow-md"
        >
          <Package size={16} /> Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4 max-w-2xl mx-auto" data-testid="cart-page">
      {/* ── Progress Steps ── */}
      {isCheckoutStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute inset-x-0 top-4 h-0.5 bg-slate-200 -z-0" />
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1 z-10">
                  <button
                    onClick={() => done && setStep(s.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all font-bold text-xs
                      ${done ? "bg-emerald-500 text-white cursor-pointer hover:scale-110" :
                        active ? "bg-blue-900 text-white shadow-lg scale-110" :
                        "bg-slate-200 text-slate-400"}`}
                  >
                    {done ? <CheckCircle size={16} /> : <Icon size={14} />}
                  </button>
                  <span className={`text-[10px] font-bold ${active ? "text-blue-900" : done ? "text-emerald-600" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ STEP: CART ══════════════ */}
      {step === "cart" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-black text-slate-900">My Cart</h1>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {cartCount} item{cartCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Cart Items */}
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex gap-3 shadow-sm">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.company_name}</div>
                  <div className="font-display font-extrabold text-blue-900 text-sm mt-1">
                    {item.price || "On Request"}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
                    <button onClick={() => updateQty(item.id, -1)} className="text-slate-600 hover:text-blue-900">
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-900 w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-slate-600 hover:text-blue-900">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal ({cartCount} items)</span>
              <span>₹{cartSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>GST (18%)</span>
              <span>₹{gstCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Delivery</span>
              <span className="text-emerald-600 font-bold">Calculated next</span>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-display font-extrabold text-slate-900 text-sm">
              <span>Estimated Total</span>
              <span>₹{(cartSubtotal + gstCost).toLocaleString()}+</span>
            </div>
          </div>

          <button
            onClick={() => setStep("delivery")}
            className="w-full py-4 bg-blue-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-950 shadow-lg active:scale-95 transition-all"
          >
            Choose Delivery <ArrowRight size={16} />
          </button>
          <Link
            to="/products"
            className="w-full py-3 border border-slate-200 text-slate-600 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
        </div>
      )}

      {/* ══════════════ STEP: DELIVERY ══════════════ */}
      {step === "delivery" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setStep("cart")} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-display text-xl font-black text-slate-900">Delivery & Logistics</h1>
          </div>

          {/* Shiprocket Pincode Serviceability Lookup */}
          <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Truck size={18} className="text-purple-300" />
                <span>Shiprocket Express Delivery</span>
              </div>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-bold">Pan-India</span>
            </div>
            <p className="text-xs text-blue-200">Enter delivery Pincode to get real-time shipping rates and estimated delivery timelines.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit Pincode"
                maxLength={6}
                className="flex-1 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => fetchShiprocketRates(pincode)}
                disabled={loadingRates}
                className="px-4 py-2 bg-white text-blue-900 font-extrabold text-xs rounded-xl hover:bg-blue-50 transition-colors shrink-0 disabled:opacity-50"
              >
                {loadingRates ? "Calculating..." : "Check Rates"}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Available Delivery Options</div>
            
            {loadingRates ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <Loader2 size={24} className="mx-auto text-purple-700 animate-spin" />
                <div className="text-xs font-bold text-slate-700">Fetching Live Shiprocket Courier Rates...</div>
                <p className="text-[11px] text-slate-500">Connecting to Shiprocket API for Pincode {pincode}...</p>
              </div>
            ) : rateError ? (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-rose-900">Shiprocket Serviceability Failed</div>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{rateError}</p>
                  </div>
                </div>
                <button
                  onClick={() => fetchShiprocketRates(pincode)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Retry Fetching Rates
                </button>
              </div>
            ) : shiprocketOptions.length > 0 ? (
              shiprocketOptions.map((opt) => {
                const isActive = selectedDelivery === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDelivery(opt.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left
                      ${isActive ? "border-purple-600 bg-purple-50/70 shadow-sm ring-2 ring-purple-600/20" : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-700"}`}>
                      <Truck size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{opt.courier_name}</span>
                        {opt.badge && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-700">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Est. Delivery: {opt.etd}</div>
                    </div>
                    <div className="font-display font-extrabold text-sm shrink-0 text-purple-900">
                      ₹{opt.rate}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <Truck size={24} className="mx-auto text-slate-400" />
                <div className="text-xs font-bold text-slate-700">Enter Destination Pincode</div>
                <p className="text-[11px] text-slate-500">Please enter your 6-digit Pincode above and click "Check Rates" to load real-time Shiprocket courier options.</p>
              </div>
            )}

          </div>

          <button
            onClick={() => setStep("checkout")}
            disabled={shiprocketOptions.length === 0}
            className="w-full py-4 bg-blue-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-950 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            Proceed to Checkout <ArrowRight size={16} />
          </button>
          {shiprocketOptions.length === 0 && (
            <p className="text-[11px] text-center text-amber-700 font-semibold mt-1">
              * Valid Shiprocket shipping rate selection required before checkout.
            </p>
          )}
        </div>
      )}

      {/* ══════════════ STEP: CHECKOUT SUMMARY ══════════════ */}
      {step === "checkout" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setStep("delivery")} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-display text-xl font-black text-slate-900">Order Summary</h1>
          </div>

          {/* Deliver To */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Deliver To</span>
              <button className="text-[11px] font-bold text-blue-900 hover:underline">Change</button>
            </div>
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-blue-900" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{user?.name || "Guest User"}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Industrial Area, India
                </div>
              </div>
            </div>
          </div>

          {/* Items quick view */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Items Ordered</div>
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0" />
                <div className="flex-1 text-xs text-slate-700 font-semibold line-clamp-1">{item.name}</div>
                <div className="text-xs font-bold text-slate-500">×{item.qty}</div>
              </div>
            ))}
          </div>

          {/* Price Details */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2.5">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Price Breakdown</div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Items Price</span>
              <span>₹{cartSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Delivery ({activeDelivery.label})</span>
              <span className={deliveryCost === 0 ? "text-emerald-600 font-bold" : ""}>
                {deliveryCost === 0 ? "FREE" : `₹${deliveryCost}`}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>GST (18%)</span>
              <span>₹{gstCost.toLocaleString()}</span>
            </div>
            <div className="pt-2.5 border-t border-dashed border-slate-200 flex justify-between font-display font-black text-slate-900 text-base">
              <span>Total Payable</span>
              <span className="text-blue-900">₹{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Savings tag */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold">
            <BadgeCheck size={14} />
            You're saving ₹{Math.round(cartSubtotal * 0.2).toLocaleString()} on this order (20% off MRP)
          </div>

          <button
            onClick={() => setStep("payment")}
            className="w-full py-4 bg-blue-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-950 shadow-lg active:scale-95 transition-all"
          >
            Proceed to Payment <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════ STEP: PAYMENT ══════════════ */}
      {step === "payment" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setStep("checkout")} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-display text-xl font-black text-slate-900">Payment</h1>
          </div>

          {/* Amount Due banner */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Amount Due</div>
              <div className="font-display text-2xl font-black mt-0.5">₹{cartTotal.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full">
              <ShieldCheck size={12} /> Secure Payment
            </div>
          </div>

          {/* Method selector */}
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Select Payment Method</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "razorpay", label: "Razorpay", sublabel: "Cards/UPI/EMI", icon: CreditCard, color: "text-blue-700" },
              { id: "upi", label: "Manual UPI", sublabel: "Enter UPI ID", icon: Smartphone, color: "text-purple-700" },
              { id: "cod", label: "Cash on\nDelivery", sublabel: "Pay on arrival", icon: Banknote, color: "text-emerald-700" },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = selectedPayment === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedPayment(m.id)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center
                    ${isActive ? "border-blue-900 bg-blue-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-300"}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? "bg-blue-900 text-white" : "bg-slate-100 " + m.color}`}>
                    <Icon size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-900 leading-tight whitespace-pre-line">{m.label}</span>
                  <span className="text-[9px] text-slate-400">{m.sublabel}</span>
                </button>
              );
            })}
          </div>

          {/* Razorpay Method */}
          {selectedPayment === "razorpay" && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Razorpay Secure Checkout</div>
                  <div className="text-[10px] text-slate-500">Cards · UPI · Net Banking · Wallets · EMI</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {["Visa", "MasterCard", "RuPay", "UPI", "GPay", "PhonePe"].map((b) => (
                  <div key={b} className="text-center py-1.5 px-2 bg-white border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500">{b}</div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <ShieldCheck size={12} /> 256-bit SSL encrypted · PCI DSS compliant
              </div>
              <div className="text-[10px] text-blue-700 font-semibold bg-blue-100 rounded-xl px-3 py-2">
                🔑 <strong>Test Mode</strong> — Use card <code className="font-mono">4111 1111 1111 1111</code>, any future date & CVV
              </div>
            </div>
          )}

          {/* UPI Method */}
          {selectedPayment === "upi" && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
              <div className="text-center font-bold text-xs text-slate-800">Scan QR or Enter UPI ID</div>
              <div className="w-28 h-28 mx-auto bg-white border border-slate-200 p-1.5 rounded-xl flex items-center justify-center shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=iip@razorpay&am=${cartTotal}&cu=INR`}
                  alt="UPI QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Enter UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi or yourname@paytm"
                  className="w-full bg-white border border-purple-200 px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
          )}

          {/* COD Method */}
          {selectedPayment === "cod" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Banknote size={16} className="text-emerald-700" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Cash on Delivery</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pay in cash when your order arrives. No prepayment required.
                  </div>
                  <div className="mt-2 text-xs font-bold text-emerald-700">
                    ₹{cartTotal.toLocaleString()} payable on delivery
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={
              selectedPayment === "razorpay"
                ? handleRazorpayPayment
                : selectedPayment === "upi"
                ? handleUpiPayment
                : handleCodPayment
            }
            className={`w-full py-4 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg text-white
              ${selectedPayment === "razorpay" ? "bg-blue-900 hover:bg-blue-950" :
                selectedPayment === "upi" ? "bg-purple-700 hover:bg-purple-800" :
                "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {selectedPayment === "razorpay" && <><CreditCard size={16} /> Pay ₹{cartTotal.toLocaleString()} with Razorpay</>}
            {selectedPayment === "upi" && <><Smartphone size={16} /> Confirm UPI Payment</>}
            {selectedPayment === "cod" && <><Banknote size={16} /> Confirm Order (Pay on Delivery)</>}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold">
            <ShieldCheck size={11} /> Your payment info is always secure and encrypted
          </div>
        </div>
      )}

      {/* ══════════════ STEP: PROCESSING ══════════════ */}
      {step === "processing" && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5 py-12">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-900 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck size={24} className="text-blue-900" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-slate-900">Processing Payment...</h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Verifying with payment gateway and confirming your order. Please wait.
            </p>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] text-slate-500 font-semibold">
            <Loader2 size={12} className="animate-spin" /> Secure connection active
          </div>
        </div>
      )}

      {/* ══════════════ STEP: CONFIRMED ══════════════ */}
      {step === "confirmed" && (
        <div className="py-8 text-center space-y-6">
          {/* Animated check */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100 animate-bounce">
            <CheckCircle size={36} className="text-emerald-500" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-black text-slate-900">Order Confirmed!</h2>
            <p className="text-slate-500 text-sm mt-1">
              Your order has been placed and is being processed.
            </p>
          </div>

          {/* Shiprocket Sync Notice if failed */}
          {confirmedOrder?.shiprocket_warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left text-xs text-amber-900 space-y-1 shadow-sm">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                Shiprocket Shipping Sync Notice
              </div>
              <p className="text-amber-800 leading-relaxed">
                {confirmedOrder.shiprocket_warning}
              </p>
            </div>
          )}

          {/* Order Details card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Order ID</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                #{confirmedOrder?.id?.slice(0, 12)?.toUpperCase() || "IIP" + Date.now().toString().slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Order Date</span>
              <span className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Payment</span>
              <span className="text-xs font-bold text-slate-800 uppercase">
                {confirmedOrder?.payment_method === "razorpay" ? "Razorpay" :
                 confirmedOrder?.payment_method === "upi" ? "UPI Transfer" :
                 confirmedOrder?.payment_method === "cod" ? "Cash on Delivery" : "Paid"}
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-3">
              <span className="text-sm font-bold text-slate-700">Amount Paid</span>
              <span className="font-display font-black text-blue-900 text-base">
                ₹{(confirmedOrder?.total || cartTotal).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Estimated Delivery</span>
              <span className="text-xs font-bold text-slate-800">
                {selectedDelivery === "express" ? "Within 90 Minutes" :
                 selectedDelivery === "oneday" ? "Tomorrow by 9 PM" :
                 selectedDelivery === "porter" ? "Today via Porter" :
                 selectedDelivery === "free" ? "2-3 Business Days" :
                 "3-7 Business Days"}
              </span>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: ShieldCheck, label: "Verified\nSupplier", color: "text-blue-700" },
              { icon: Truck, label: "Tracked\nShipping", color: "text-purple-700" },
              { icon: Star, label: "Quality\nAssured", color: "text-orange-600" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Icon size={18} className={color} />
                <span className="text-[9px] font-bold text-slate-600 text-center whitespace-pre-line leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/orders"
              className="py-3.5 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Package size={14} /> My Orders
            </Link>
            <Link
              to="/products"
              className="py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center hover:bg-slate-50 transition-all"
            >
              Shop More
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
