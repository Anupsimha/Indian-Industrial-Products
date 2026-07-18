import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  MapPin, Tag, Clock, Package, Boxes, Trash2, CheckCircle2,
  AlertCircle, Loader2, Plus, ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";

export default function RequirementsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All"); // All, pending, completed

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get("/requirements/my");
      setItems(data);
    } catch (err) {
      console.error("Error loading my requirements:", err);
      toast.error("Failed to load your requirements.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    load();
  }, [user, authLoading, load, navigate]);

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "closed" ? "new" : "closed";
    try {
      await api.patch(`/enquiries/${id}/status?new_status=${nextStatus}`);
      toast.success(`Requirement status updated!`);
      // Update local state directly
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: nextStatus } : it))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Could not update status. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this requirement?")) return;
    try {
      await api.delete(`/enquiries/${id}`);
      toast.success("Requirement deleted successfully");
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      console.error("Failed to delete requirement:", err);
      toast.error("Could not delete requirement.");
    }
  };

  // Filter items based on active status tabs
  const filteredItems = items.filter((it) => {
    if (statusFilter === "pending") return it.status !== "closed";
    if (statusFilter === "completed") return it.status === "closed";
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-10" data-testid="requirements-loading">
        <Loader2 className="animate-spin text-blue-900 mb-2" size={32} />
        <span className="text-slate-500 font-semibold text-sm">Loading your requirements...</span>
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4" data-testid="requirements-page">
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <button
          onClick={() => navigate("/post-enquiry")}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-bold text-xs shadow-md transition-all active:scale-95"
          data-testid="req-add-new-btn"
        >
          <Plus size={14} /> Post Requirement
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-slate-900">My Requirements</h1>
            <p className="text-xs text-slate-500">Manage your active buyer posts, change status or delete them.</p>
          </div>
        </div>
      </div>

      {/* Status Segmented Control */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-full text-xs font-bold shadow-sm mb-4">
        {[
          { id: "All", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "completed", label: "Completed" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex-1 py-2 text-center rounded-full transition-all ${
              statusFilter === tab.id
                ? "bg-blue-900 text-white shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm" data-testid="req-empty">
            <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="font-medium text-slate-700">No requirements found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {statusFilter === "All"
                ? "You haven't posted any requirements yet."
                : `You don't have any ${statusFilter} requirements.`}
            </p>
            {statusFilter === "All" && (
              <button
                onClick={() => navigate("/post-enquiry")}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-xs font-bold shadow-sm transition-all"
              >
                Post Your First Requirement
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((it) => {
            const isCompleted = it.status === "closed";
            return (
              <article
                key={it.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all text-left"
                data-testid={`req-card-${it.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                      {it.product_name || it.requirement.slice(0, 60)}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 inline-flex items-center gap-1.5">
                      <Tag size={11} className="text-slate-400" /> {it.category}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    isCompleted
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-amber-50 text-amber-700 border border-amber-100"
                  }`}>
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>

                <div className="mt-3.5 space-y-2 border-b border-slate-100 pb-3.5 text-xs text-slate-600">
                  {it.quantity && (
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Qty</span>
                      <span className="font-bold text-slate-900">{it.quantity}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span>
                      {it.industrial_area
                        ? `${it.industrial_area}, ${it.city || it.location}`
                        : it.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span>Posted on {new Date(it.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {it.requirement}
                </p>

                {/* Bottom Actions Panel */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(it.id, it.status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 flex items-center gap-1 ${
                      isCompleted
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                    }`}
                  >
                    {isCompleted ? (
                      <>Reopen Requirement</>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Mark as Completed
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(it.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-all active:scale-95"
                    title="Delete Requirement"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
