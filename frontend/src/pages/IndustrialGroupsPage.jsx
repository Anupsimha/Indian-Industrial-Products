import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { BackButton } from "../components/BackButton";
import { Search, MapPin, Users, Building2, ChevronRight, Loader2, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function IndustrialGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const navigate = useNavigate();

  const fetchGroups = async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/industrial-groups?search=${encodeURIComponent(query)}` : "/industrial-groups";
      const { data } = await api.get(url);
      setGroups(data);
    } catch (err) {
      console.error("Failed to load industrial groups", err);
      toast.error("Failed to load industrial groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGroups(search);
  };

  const handleJoinExit = async (e, group) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    setJoiningId(group.id);
    try {
      if (group.is_joined) {
        await api.post(`/industrial-groups/${group.id}/exit`);
        toast.info(`Exited ${group.name}`);
      } else {
        await api.post(`/industrial-groups/${group.id}/join`);
        toast.success(`Joined ${group.name}! 🎉`);
      }
      fetchGroups(search);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setJoiningId(null);
    }
  };

  const formatCount = (num) => {
    if (!num) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num;
  };

  return (
    <div className="pb-28 px-4 pt-4 max-w-5xl mx-auto space-y-5" data-testid="industrial-groups-page">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-600 flex items-center gap-1">
              <Sparkles size={12} /> Local Communities
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Industrial Area Groups</h1>
          </div>
        </div>

        {user?.role === "admin" && (
          <Link
            to="/admin"
            className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-slate-800"
          >
            <Plus size={14} /> Add Group
          </Link>
        )}
      </div>

      {/* Hero Banner / Info */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-orange-500/30">
            Connect Locally • Grow Faster
          </span>
          <h2 className="font-display text-lg sm:text-xl font-bold">Join Your Regional Industrial Community</h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Connect directly with verified manufacturers, buyers, suppliers, and factory owners in your industrial area. Share leads, products, jobs, and local updates.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search industrial area by name or location (e.g. Peenya, Bommasandra)..."
          className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-blue-800 text-white text-xs font-semibold hover:bg-blue-900"
        >
          Search
        </button>
      </form>

      {/* Groups List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <Loader2 className="animate-spin text-blue-800" size={28} />
          <p className="text-xs text-slate-500">Loading industrial groups...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isBuyer = user?.role === "buyer";
            return (
              <div
                key={group.id}
                onClick={() => navigate(`/industrial-groups/${group.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                data-testid={`group-card-${group.id}`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={group.image_url}
                    alt={group.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-100 shrink-0 group-hover:scale-[1.02] transition-transform"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-800 transition-colors">
                        {group.name}
                      </h3>
                      {group.is_joined && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Joined
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{group.location}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-600 font-semibold">
                      <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        <Users size={12} className="text-blue-700" />
                        {formatCount(group.members_count)} Members
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        <Building2 size={12} className="text-orange-600" />
                        {formatCount(group.companies_count)} Companies
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                  {!isBuyer ? (
                    <button
                      onClick={(e) => handleJoinExit(e, group)}
                      disabled={joiningId === group.id}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        group.is_joined
                          ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200"
                          : "bg-blue-800 text-white hover:bg-blue-900 shadow-sm active:scale-95"
                      }`}
                    >
                      {joiningId === group.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : group.is_joined ? (
                        "Leave Group"
                      ) : (
                        "Join Group"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/industrial-groups/${group.id}`)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      View Group
                    </button>
                  )}

                  <div className="p-2 rounded-full text-slate-400 group-hover:text-blue-800 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-2">
              <p className="font-semibold text-sm">No industrial groups found.</p>
              <p className="text-xs text-slate-400">Try searching for a different area or location.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
