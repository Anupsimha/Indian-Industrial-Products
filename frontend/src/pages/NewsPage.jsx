import React, { useEffect, useState } from "react";
import { Newspaper, Search, ArrowUpDown, ExternalLink, Eye, ShieldAlert, CheckCircle, XCircle, RefreshCw, Layers } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";

export default function NewsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Sources & Categories
  useEffect(() => {
    api.get("/news/sources")
      .then((res) => {
        if (res.data?.sources) setSources(res.data.sources);
        if (res.data?.categories) setCategories(res.data.categories);
      })
      .catch(() => {});
  }, []);

  // Fetch News Feed
  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 18,
        sort: sortOption,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (selectedSource !== "All") params.source = selectedSource;

      const res = await api.get("/news", { params });
      setItems(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
    } catch {
      toast.error("Failed to load industrial news feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSource, sortOption, page]);

  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.post("/news/admin/fetch-now");
      toast.success("News feeds synced successfully!");
      fetchNews();
    } catch {
      toast.error("Failed to sync news feeds. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNews();
  };

  const handleArticleClick = (item) => {
    try {
      api.post(`/news/${item.id}/click`);
    } catch {}
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const handleAdminToggleActive = async (itemId) => {
    try {
      const res = await api.patch(`/news/${itemId}/toggle-active`);
      if (res.data?.item) {
        toast.success(res.data.item.is_active ? "Item restored to public feed" : "Item hidden from news feed");
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data.item : i)));
      }
    } catch {
      toast.error("Failed to update item moderation status");
    }
  };

  const featuredStory = items.length > 0 ? items[0] : null;
  const gridStories = items.length > 1 ? items.slice(1) : [];

  return (
    <div className="pb-28 px-4 pt-4 max-w-7xl mx-auto space-y-6" data-testid="news-page">
      <BackButton className="mb-2" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 text-xs font-bold border border-blue-700/50 mb-2">
              <Newspaper size={14} /> Live B2B Industry Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Industrial News & Market Feed
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Real-time headlines covering Indian manufacturing, steel, chemicals, machinery, electricals, and policy updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing || loading}
              className="px-4 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin text-white" : "text-white"} />
              {syncing ? "Syncing..." : "Sync Feeds Now"}
            </button>
            <button
              onClick={fetchNews}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all shadow-sm shrink-0"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : "text-blue-400"} />
              Refresh
            </button>
          </div>
        </div>

        {/* Top News Publisher Source Chips */}
        <div className="pt-4 border-t border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers size={13} className="text-blue-400" /> Featured News Sources:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedSource("All"); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedSource === "All"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              All Outlets
            </button>
            {sources.map((s) => (
              <button
                key={s.key}
                onClick={() => { setSelectedSource(s.display_name); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedSource === s.display_name
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search news titles or keywords (e.g. Steel, PLI Scheme, CNC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <ArrowUpDown size={14} className="text-blue-800" /> Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="latest">Latest News</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Sector Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
              <div className="h-40 bg-slate-200 rounded-xl"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Newspaper size={24} />
          </div>
          <h3 className="font-bold text-base text-slate-800">No News Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any articles matching your active search query or sector filters.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Feeds Now"}
            </button>
            <button
              onClick={() => { setSelectedCategory("All"); setSelectedSource("All"); setSearchQuery(""); setPage(1); }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Featured Breaking Hero Story */}
      {!loading && featuredStory && page === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow grid grid-cols-1 md:grid-cols-12 group">
          <div className="md:col-span-7 relative h-64 md:h-full bg-slate-900 overflow-hidden">
            <img
              src={featuredStory.image_url || `/api/news/card?source=${encodeURIComponent(featuredStory.source)}&category=${encodeURIComponent(featuredStory.category)}`}
              alt={featuredStory.title}
              onError={(e) => { e.currentTarget.src = `/api/news/card?source=${encodeURIComponent(featuredStory.source)}&category=${encodeURIComponent(featuredStory.category)}`; }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 left-4 bg-blue-900/90 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-xs border border-blue-700/50">
              Breaking Story
            </div>
          </div>
          
          <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                  {featuredStory.source}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {featuredStory.category}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 leading-tight group-hover:text-blue-800 transition-colors">
                {featuredStory.title}
              </h2>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {featuredStory.snippet}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Eye size={13} /> {featuredStory.view_count || 0} views
              </span>
              <button
                onClick={() => handleArticleClick(featuredStory)}
                className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                Read Full Article <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Articles */}
      {!loading && (page > 1 ? items : gridStories).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(page > 1 ? items : gridStories).map((item) => {
            const fallbackSrc = `/api/news/card?source=${encodeURIComponent(item.source)}&category=${encodeURIComponent(item.category)}`;
            return (
              <div
                key={item.id}
                className={`bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                  !item.is_active ? "opacity-60 border-amber-300 bg-amber-50/20" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={item.image_url || fallbackSrc}
                      alt={item.title}
                      onError={(e) => { e.currentTarget.src = fallbackSrc; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-800">
                      {item.source}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="text-blue-800 font-bold">{item.category}</span>
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString() : ""}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-800 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Eye size={12} /> {item.view_count || 0} clicks
                    </span>
                    
                    <button
                      onClick={() => handleArticleClick(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                    >
                      Read Story <ExternalLink size={12} />
                    </button>
                  </div>

                  {/* Admin Moderation Controls */}
                  {isAdmin && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <ShieldAlert size={12} className="text-amber-600" /> Admin Control
                      </span>
                      <button
                        onClick={() => handleAdminToggleActive(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                          item.is_active
                            ? "bg-rose-100 hover:bg-rose-200 text-rose-800"
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        }`}
                      >
                        {item.is_active ? (
                          <> <XCircle size={11} /> Hide Item </>
                        ) : (
                          <> <CheckCircle size={11} /> Restore Item </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-slate-700 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
