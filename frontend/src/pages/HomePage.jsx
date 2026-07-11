import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { PostCard } from "../components/PostCard";
import { HeroSlider } from "../components/HeroSlider";
import { JobsSection } from "../components/JobsSection";
import { Loader2, Verified } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [categories, setCategories] = useState(["All", "Steel", "Machinery", "Polymers", "Electricals", "Tools", "Pipes", "Drives"]);
  const [posts, setPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState("All");
  const sentinelRef = useRef();
  const navigate = useNavigate();

  const fetchPosts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const s = reset ? 0 : skip;
      const { data } = await api.get(`/posts?skip=${s}&limit=10`);
      setPosts((p) => (reset ? data : [...p, ...data]));
      setSkip(s + data.length);
      if (data.length < 10) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, skip]);

  useEffect(() => {
    fetchPosts(true);
    api.get("/companies?limit=8").then((r) => setCompanies(r.data)).catch(() => {});
    api.get("/categories")
      .then((r) => {
        if (r.data && r.data.length > 0) {
          setCategories(["All", ...r.data.map((c) => c.name)]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchPosts();
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [fetchPosts, hasMore, loading]);

  const filtered = activeCat === "All"
    ? posts
    : posts.filter((p) => (p.category || "").toLowerCase() === activeCat.toLowerCase());

  return (
    <div className="pb-24 lg:pb-12 lg:px-8 xl:px-10" data-testid="home-page">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start lg:mt-6">
        
        {/* Main/Left Column - 8 cols on desktop */}
        <div className="lg:col-span-8 space-y-6">
          <HeroSlider onCta={() => navigate("/post-enquiry")} />

          {/* Featured companies strip */}
          <section className="mt-5 lg:mt-0">
            <div className="px-4 lg:px-0 flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-600">Featured Companies</h3>
              <button onClick={() => navigate("/companies")} className="text-xs font-semibold text-blue-800" data-testid="see-all-companies-btn">See all</button>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible lg:px-0">
              {companies.map((c, idx) => (
                <button
                  key={`${c.id}-${idx}`}
                  onClick={() => navigate(`/company/${c.id}`)}
                  data-testid={`featured-company-${c.id}`}
                  className="shrink-0 w-32 md:w-auto bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-center gap-1">
                    <img src={c.logo_url} alt="" className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover" />
                    <Verified size={14} className="text-blue-700" />
                  </div>
                  <div className="mt-2 text-xs lg:text-sm font-semibold text-slate-900 line-clamp-2 leading-tight">{c.name}</div>
                  <div className="text-[10px] lg:text-xs text-slate-500 mt-0.5 truncate">{c.location}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Category chips */}
          <div className="flex gap-2 px-4 lg:px-0 mt-2 lg:mt-4 overflow-x-auto lg:flex-wrap no-scrollbar pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                data-testid={`cat-chip-${cat}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeCat === cat
                    ? "bg-blue-800 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Live Buyer Feed CTA (Mobile only) */}
          <div className="lg:hidden">
            <Link to="/requirements" data-testid="home-requirements-cta" className="block mx-4 mt-3 p-4 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80">Live Buyer Feed</div>
                  <div className="font-display text-lg font-bold mt-0.5">Browse Requirements →</div>
                  <div className="text-xs text-white/90 mt-0.5">Verified leads from buyers across India</div>
                </div>
              </div>
            </Link>
          </div>

          {/* JobsSection (Mobile only) */}
          <div className="lg:hidden">
            <JobsSection />
          </div>

          {/* Feed */}
          <section className="mt-3 lg:mt-4 px-4 lg:px-0 space-y-4 lg:space-y-6">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} onUpdate={() => fetchPosts(true)} />
            ))}
            {filtered.length === 0 && !loading && (
              <div className="text-center text-sm text-slate-500 py-10">
                No posts yet for this category.
              </div>
            )}
            <div ref={sentinelRef} className="h-8" />
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-800" size={22} />
              </div>
            )}
          </section>
        </div>

        {/* Sidebar/Right Column - 4 cols on desktop, hidden on mobile/tablet */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <Link to="/requirements" data-testid="home-requirements-cta" className="block p-5 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80">Live Buyer Feed</div>
                <div className="font-display text-xl font-bold mt-1">Browse Requirements →</div>
                <div className="text-xs text-white/90 mt-1.5">Verified leads from buyers across India</div>
              </div>
            </div>
          </Link>

          <JobsSection isSidebar={true} />
        </div>

      </div>
    </div>
  );
}
