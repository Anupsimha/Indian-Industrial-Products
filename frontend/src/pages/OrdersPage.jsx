import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, CheckCircle, Clock, Truck, XCircle, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const STATUS_CONFIG = {
  paid: { label: "Paid (Pending)", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  processing: { label: "Processing (Pending)", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  shipped: { label: "Shipped (Pending)", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Truck },
  delivered: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  cancelled: { label: "Rejected", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: XCircle },
  rejected: { label: "Rejected", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: XCircle },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleOpenTrackModal = async (orderId) => {
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const { data } = await api.get(`/orders/${orderId}/track`);
      setTrackingData(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load tracking status");
      setTrackingModalOpen(false);
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("AWB Number copied to clipboard!");
  };

  const handleRejectOrder = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/reject`);
      toast.success("Order rejected successfully");
      const { data } = await api.get("/orders/me");
      setOrders(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject order");
    }
  };

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

          const orderCreationTime = new Date(order.created_at);
          const estDeliveryTime = new Date(orderCreationTime.getTime() + 7 * 24 * 60 * 60 * 1000);
          const cutoffTime = new Date(estDeliveryTime.getTime() - 72 * 60 * 60 * 1000);
          const canReject = new Date() < cutoffTime &&
            order.status !== "cancelled" &&
            order.status !== "rejected" &&
            order.status !== "completed" &&
            order.status !== "delivered";

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

              {/* Action Buttons */}
              <div className="px-4 pb-3 flex items-center gap-2">
                <button
                  onClick={() => handleOpenTrackModal(order.id)}
                  className="flex-1 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Truck size={14} /> Track Package
                </button>
              </div>

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

                  {/* Reject Order Button */}
                  {canReject && (
                    <button
                      onClick={() => handleRejectOrder(order.id)}
                      data-testid={`reject-order-${order.id}`}
                      className="w-full mt-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold transition-all border border-rose-100 flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} /> Reject Order
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Amazon-Style Track Order Modal */}
      {trackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="text-blue-400" size={20} />
                <h3 className="font-display font-bold text-base">Shipment Tracking</h3>
              </div>
              <button
                onClick={() => setTrackingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {trackingLoading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">Fetching live status from iThink Logistics...</p>
              </div>
            ) : trackingData ? (
              <div className="p-5 max-h-[80vh] overflow-y-auto space-y-5">
                {/* Expected Delivery Banner */}
                <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-md">
                  <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">Estimated Delivery</div>
                  <div className="text-xl font-black mt-0.5">{trackingData.expected_delivery_date || "3-5 Business Days"}</div>
                  <div className="text-xs text-blue-100 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Status: <span className="font-bold">{trackingData.current_status}</span>
                  </div>
                </div>

                {/* Carrier & AWB Details */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Logistics Partner</div>
                    <div className="text-sm font-bold text-slate-900">{trackingData.courier_name}</div>
                    {trackingData.awb_number && (
                      <div className="text-xs font-mono text-slate-500 mt-0.5">AWB: {trackingData.awb_number}</div>
                    )}
                  </div>
                  {trackingData.awb_number && (
                    <button
                      onClick={() => copyToClipboard(trackingData.awb_number)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm transition-all"
                    >
                      Copy AWB
                    </button>
                  )}
                </div>

                {/* Amazon-Style 5-Milestone Step Progress Bar */}
                <div className="py-2">
                  <div className="text-xs font-bold text-slate-900 mb-3">Order Progress</div>
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Line */}
                    <div className="absolute left-4 right-4 top-4 h-1 bg-slate-200 -z-0" />
                    
                    {(trackingData.milestones || []).map((ms, idx) => {
                      const isDone = ms.completed;
                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center text-center w-16">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                              isDone ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "bg-white border-2 border-slate-300 text-slate-400"
                            }`}
                          >
                            {isDone ? "✓" : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold mt-2 leading-tight ${isDone ? "text-emerald-700" : "text-slate-400"}`}>
                            {ms.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scan Timeline */}
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-3">Activity & Scan History</div>
                  {trackingData.scan_timeline && trackingData.scan_timeline.length > 0 ? (
                    <div className="relative pl-4 space-y-4 border-l-2 border-blue-100 ml-2">
                      {trackingData.scan_timeline.map((scan, i) => (
                        <div key={i} className="relative group">
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                          <div className="text-xs font-bold text-slate-900">{scan.status || scan.remark}</div>
                          <div className="text-[10px] text-slate-500">{scan.location} • {scan.date_time}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
                      Package is being prepared for pickup by courier partner. Live scan updates will appear here automatically.
                    </div>
                  )}
                </div>

                {/* Official iThink Link if Available */}
                {trackingData.tracking_url && (
                  <a
                    href={trackingData.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-blue-50 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    Open Official Courier Tracking Page ↗
                  </a>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No tracking details found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
