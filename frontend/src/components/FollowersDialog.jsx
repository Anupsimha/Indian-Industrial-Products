import React, { useEffect, useState } from "react";
import { X, Users, UserPlus, Building2, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";

export const FollowersDialog = ({ open, onClose, companyId, initialTab = "followers" }) => {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    const endpoint =
      tab === "followers"
        ? companyId
          ? `/companies/${companyId}/followers`
          : "/users/me/followers"
        : companyId
        ? `/companies/${companyId}/following`
        : "/users/me/following";

    api
      .get(endpoint)
      .then((res) => setList(res.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open, tab, companyId]);

  if (!open) return null;

  const filtered = list.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.company_name && item.company_name.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-display font-extrabold text-slate-900 text-base">
            <Users size={18} className="text-blue-900" />
            <span>Connections</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-2 gap-1 bg-slate-100 border-b border-slate-200">
          <button
            onClick={() => setTab("followers")}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "followers" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Followers ({tab === "followers" ? list.length : "..."})
          </button>
          <button
            onClick={() => setTab("following")}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "following" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Following ({tab === "following" ? list.length : "..."})
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-800"
            />
          </div>
        </div>

        {/* Body List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin text-blue-800" size={24} />
              <span className="text-xs mt-2">Loading connections...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No {tab} found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-slate-50/50 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.avatar_url || item.logo_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200"}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <Link
                      to={item.logo_url ? `/company/${item.id}` : "#"}
                      onClick={onClose}
                      className="font-bold text-xs text-slate-900 hover:text-blue-900 truncate block"
                    >
                      {item.name}
                    </Link>
                    <span className="text-[10px] text-slate-500 truncate block font-medium">
                      {item.company_name || item.category || item.location || "Industrial Member"}
                    </span>
                  </div>
                </div>

                {item.logo_url && (
                  <Link
                    to={`/company/${item.id}`}
                    onClick={onClose}
                    className="px-3 py-1 text-[10px] font-extrabold rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors shrink-0"
                  >
                    View
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
