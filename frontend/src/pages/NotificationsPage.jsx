import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { BackButton } from "../components/BackButton";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get("/notifications").then((r) => setItems(r.data)).catch(() => {});
    api.post("/notifications/read-all").catch(() => {});
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="pb-28 px-4 pt-4" data-testid="notifications-page">
      <BackButton className="mb-2" />
      <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
      <div className="mt-3 space-y-2">
        {items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            You're all caught up.
          </div>
        )}
        {items.map((n) => (
          <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3" data-testid={`notif-${n.id}`}>
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-orange-50 text-orange-600 shrink-0">
              <Bell size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900">{n.title}</div>
              <div className="text-xs text-slate-600">{n.body}</div>
              <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
