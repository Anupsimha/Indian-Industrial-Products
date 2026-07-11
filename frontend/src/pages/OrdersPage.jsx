import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, CheckCircle, Clock, Truck, XCircle, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const STATUS_CONFIG = {
  paid: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  processing: { label: "Processing", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  shipped: { label: "Shipped", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: XCircle },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/orders/me")
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <Package size={48} className="text-slate-300 mb-4" />
        <h2 className="font-display text-xl font-black text-slate-900">Sign in to view orders</h2>
        <p className="text-slate-500 text-sm mt-2 mb-6">Your order history is linked to your account.</p>
        <Link
          to="/login"
          className="px-6 py-3 bg-blue-900 text-white font-bold rounded-full hover:bg-blue-950 transition-all"
        >
          Login / Register
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Package size={40} className="text-slate-300" />
        </div>
        <h2 className="font-display text-2xl font-black text-slate-900 mb-2">No Orders Yet</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          Start exploring our industrial catalogue and place your first order.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-bold rounded-full hover:bg-blue-950 transition-all shadow-md"
        >
          <ShoppingCart size={16} /> Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4" data-testid="orders-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
        </div>
        <Link
          to="/products"
          className="text-xs font-bold text-blue-900 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
        >
          + Shop More
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isOpen = expanded === order.id;
          const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
          });

          return (
            <div
              key={order.id}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Order Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="w-full p-4 text-left flex items-start gap-3"
              >
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                  <StatusIcon size={16} className={cfg.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-700">
                      #{order.id.slice(0, 12).toUpperCase()}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400">{orderDate}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400 capitalize">{order.payment_method}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="font-display font-extrabold text-sm text-blue-900">
                      ₹{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className={`text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
              </button>

              {/* Expanded Order Details */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-50 space-y-3 animate-in fade-in duration-150">
                  {/* Items */}
                  <div className="mt-3 space-y-2">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Items</div>
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.company_name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-700">×{item.qty}</div>
                          <div className="text-[10px] text-slate-500">{item.price || "On Request"}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{order.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Delivery</span>
                      <span>{order.delivery_cost === 0 ? "FREE" : `₹${order.delivery_cost}`}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>GST</span>
                      <span>₹{order.gst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-display font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total</span>
                      <span className="text-blue-900">₹{order.total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment ID if available */}
                  {order.payment_id && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-emerald-700">Payment Verified</div>
                        <div className="font-mono text-[9px] text-emerald-600">{order.payment_id}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
