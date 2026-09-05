import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Bell, UserPlus, Heart, MessageSquare, Package, FileText, CheckCheck, Crown, ShoppingBag, Users, Headphones, Building2, ArrowRight } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { toast } from "sonner";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);

  const loadNotifications = async () => {
    try {
      const r = await api.get("/notifications");
      setItems(r.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }

    let targetRoute = n.link_url;

    if (!targetRoute) {
      const type = (n.type || "").toLowerCase();
      const title = (n.title || "").toLowerCase();
      const body = (n.body || "").toLowerCase();

      if (type.includes("plan") || title.includes("plan")) {
        targetRoute = "/settings";
      } else if (type.includes("order") || title.includes("order")) {
        targetRoute = "/orders";
      } else if (type === "follower" || title.includes("follower") || body.includes("following")) {
        targetRoute = n.target_id ? `/company/${n.target_id}` : "/profile";
      } else if (type === "like" || title.includes("like")) {
        targetRoute = n.target_id ? `/?post_id=${n.target_id}` : "/";
      } else if (type === "comment" || title.includes("comment")) {
        targetRoute = n.target_id ? `/?post_id=${n.target_id}&comments=true` : "/";
      } else if (type === "chat_message" || title.includes("message")) {
        targetRoute = "/chat";
      } else if (type === "group_joined" || title.includes("group")) {
        targetRoute = n.target_id ? `/industrial-groups/${n.target_id}` : "/industrial-groups";
      } else if (type === "lead_enquiry" || title.includes("lead") || title.includes("enquiry") || body.includes("enquiry")) {
        targetRoute = "/leads";
      } else {
        targetRoute = "/";
      }
    }

    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const getNotifIcon = (n) => {
    const type = (n.type || "").toLowerCase();
    const title = (n.title || "").toLowerCase();

    if (type.includes("plan") || title.includes("plan")) {
      return <Crown size={18} className="text-amber-500" />;
    }
    if (type.includes("order") || title.includes("order")) {
      return <ShoppingBag size={18} className="text-emerald-600" />;
    }
    if (type === "follower" || title.includes("follower")) {
      return <UserPlus size={18} className="text-purple-600" />;
    }
    if (type === "like" || title.includes("like")) {
      return <Heart size={18} className="text-rose-500 fill-rose-500/20" />;
    }
    if (type === "comment" || title.includes("comment")) {
      return <MessageSquare size={18} className="text-blue-600" />;
    }
    if (type === "chat_message" || title.includes("message")) {
      return <MessageSquare size={18} className="text-blue-600" />;
    }
    if (type === "group_joined" || title.includes("group")) {
      return <Users size={18} className="text-indigo-600" />;
    }
    if (type === "support_received" || title.includes("support") || title.includes("inquiry")) {
      return <Headphones size={18} className="text-cyan-600" />;
    }
    if (type === "company_status" || title.includes("company")) {
      return <Building2 size={18} className="text-orange-600" />;
    }
    if (type === "product_enquiry" || title.includes("product")) {
      return <Package size={18} className="text-emerald-600" />;
    }
    if (type === "lead_enquiry" || title.includes("lead") || title.includes("enquiry")) {
      return <FileText size={18} className="text-orange-600" />;
    }
    return <Bell size={18} className="text-blue-800" />;
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="pb-28 px-4 pt-4 max-w-2xl mx-auto" data-testid="notifications-page">
      <BackButton className="mb-2" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-800 text-white text-xs font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500">Stay updated with inquiries, likes, and platform activity.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            data-testid="mark-all-read-btn"
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {fetching ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-500">
            <Bell size={32} className="mx-auto text-slate-300 mb-2" />
            You're all caught up. No new notifications.
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              data-testid={`notif-${n.id}`}
              className={`border rounded-2xl p-4 flex items-start gap-3.5 cursor-pointer transition-all hover:shadow-md ${
                !n.read ? "bg-blue-50/40 border-blue-200" : "bg-white border-slate-200"
              }`}
            >
              <div className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 ${!n.read ? "bg-blue-100/70" : "bg-slate-100"}`}>
                {getNotifIcon(n)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm text-slate-900 truncate">{n.title}</div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-800 shrink-0" />}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center justify-between">
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  <span className="text-blue-800 font-bold text-[11px] flex items-center gap-0.5 hover:underline">
                    View <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
