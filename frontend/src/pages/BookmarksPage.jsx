import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { BackButton } from "../components/BackButton";
import {
  Bookmark, Package, FileText, Video, Target, MapPin, CheckCircle,
  ShoppingCart, MessageSquare, ExternalLink, Trash2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState("posts"); // 'posts' | 'products' | 'feed' | 'requirements'
  const [data, setData] = useState({
    posts: [],
    products: [],
    reels: [],
    requirements: [],
  });
  const [fetching, setFetching] = useState(true);

  const loadBookmarks = async () => {
    setFetching(true);
    try {
      const res = await api.get("/me/bookmarks");
      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        setData({
          posts: res.data.posts || [],
          products: res.data.products || [],
          reels: res.data.reels || [],
          requirements: res.data.requirements || [],
        });
      } else if (Array.isArray(res.data)) {
        // Fallback for legacy array response
        setData((prev) => ({ ...prev, posts: res.data }));
      }
    } catch (err) {
      console.error("Error loading bookmarks:", err);
      toast.error("Failed to load saved bookmarks.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400 font-semibold">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const removeProductBookmark = async (productId) => {
    try {
      await api.post(`/products/${productId}/save`);
      setData((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
      toast.info("Removed product from bookmarks", { duration: 3000 });
    } catch {
      toast.error("Failed to remove bookmark", { duration: 3000 });
    }
  };

  const removeReelBookmark = async (reelId) => {
    try {
      await api.post(`/reels/${reelId}/save`);
      setData((prev) => ({
        ...prev,
        reels: prev.reels.filter((r) => r.id !== reelId),
      }));
      toast.info("Removed video from saved feed", { duration: 3000 });
    } catch {
      toast.error("Failed to remove bookmark", { duration: 3000 });
    }
  };

  const removeReqBookmark = async (reqId) => {
    try {
      await api.post(`/requirements/${reqId}/save`);
      setData((prev) => ({
        ...prev,
        requirements: prev.requirements.filter((r) => r.id !== reqId),
      }));
      toast.info("Removed requirement from bookmarks", { duration: 3000 });
    } catch {
      toast.error("Failed to remove bookmark", { duration: 3000 });
    }
  };

  const tabs = [
    { id: "posts", label: "Posts", count: data.posts.length, icon: FileText },
    { id: "products", label: "Products", count: data.products.length, icon: Package },
    { id: "feed", label: "Feed", count: data.reels.length, icon: Video },
    { id: "requirements", label: "Requirements", count: data.requirements.length, icon: Target },
  ];

  return (
    <div className="pb-28 px-4 pt-4 max-w-5xl mx-auto" data-testid="bookmarks-page">
      <BackButton className="mb-3" />

      {/* Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-br from-[#0F294A] to-[#0A1D36] rounded-3xl p-5 sm:p-6 text-white shadow-lg mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-300">
            <Bookmark size={16} /> Saved Items
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-black mt-1">
            My Bookmarks
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Access your saved posts, products, video feed reels, and lead requirements in one place.
          </p>
        </div>
      </div>

      {/* 4 Section Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm mb-6 flex overflow-x-auto no-scrollbar gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              data-testid={`bookmarks-tab-${t.id}`}
              className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 ${
                isActive
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      {fetching ? (
        <div className="py-12 text-center text-slate-400 font-semibold text-sm">
          Loading saved items...
        </div>
      ) : (
        <div>
          {/* 1. POSTS TAB */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {data.posts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                  <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                  <h3 className="font-bold text-slate-800 text-base">No Saved Posts</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Tap the bookmark icon on any post in your feed to save it here.</p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-full hover:bg-blue-950 transition-colors"
                  >
                    Browse Feed
                  </button>
                </div>
              ) : (
                data.posts.map((p) => <PostCard key={p.id} post={p} onUpdate={loadBookmarks} />)
              )}
            </div>
          )}

          {/* 2. PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              {data.products.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                  <Package className="mx-auto text-slate-300 mb-2" size={40} />
                  <h3 className="font-bold text-slate-800 text-base">No Saved Products</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Bookmark industrial products from suppliers to compare or purchase later.</p>
                  <button
                    onClick={() => navigate("/products")}
                    className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-full hover:bg-blue-950 transition-colors"
                  >
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.products.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                    >
                      <button
                        onClick={() => removeProductBookmark(p.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors z-10"
                        title="Remove Bookmark"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 mb-3">
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {p.category}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mt-0.5 group-hover:text-blue-900">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                          {p.company_name}
                        </p>
                        <div className="font-display font-black text-blue-900 text-sm mt-2">
                          {p.price || "On Request"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => { addToCart(p); toast.success(`${p.name} added to cart!`, { duration: 3000 }); }}
                          className="py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                        >
                          <ShoppingCart size={12} /> Add to Cart
                        </button>
                        <button
                          onClick={() => { addToCart(p); navigate("/cart"); }}
                          className="py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. FEED (REELS) TAB */}
          {activeTab === "feed" && (
            <div>
              {data.reels.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                  <Video className="mx-auto text-slate-300 mb-2" size={40} />
                  <h3 className="font-bold text-slate-800 text-base">No Saved Video Reels</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Bookmark short video reels to rewatch industrial machinery and product demos.</p>
                  <button
                    onClick={() => navigate("/reels")}
                    className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-full hover:bg-blue-950 transition-colors"
                  >
                    Watch Reels
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.reels.map((r) => (
                    <div key={r.id} className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-md flex flex-col justify-between relative">
                      <button
                        onClick={() => removeReelBookmark(r.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-rose-400 transition-colors z-10"
                        title="Remove Bookmark"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      <div className="relative aspect-[9/16] bg-slate-950 cursor-pointer" onClick={() => navigate("/reels")}>
                        {r.video_url ? (
                          <video src={r.video_url} className="w-full h-full object-cover" muted loop playsInline />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">Video preview unavailable</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{r.company_name}</span>
                          <div>
                            <p className="text-xs font-semibold line-clamp-2 text-slate-200">{r.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. REQUIREMENTS TAB */}
          {activeTab === "requirements" && (
            <div className="space-y-3">
              {data.requirements.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                  <Target className="mx-auto text-slate-300 mb-2" size={40} />
                  <h3 className="font-bold text-slate-800 text-base">No Saved Requirements</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Bookmark buyer lead requirements to respond with quotations.</p>
                  <button
                    onClick={() => navigate("/leads")}
                    className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-full hover:bg-blue-950 transition-colors"
                  >
                    View Lead Requirements
                  </button>
                </div>
              ) : (
                data.requirements.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider">
                          {req.category || "Requirement"}
                        </span>
                        {req.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <MapPin size={11} className="text-slate-400" /> {req.location}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-2">{req.requirement}</h3>
                      {req.product_name && (
                        <p className="text-xs text-slate-600 mt-1">Product: <span className="font-semibold text-slate-800">{req.product_name}</span></p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate("/leads")}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                      >
                        Contact Buyer <ArrowRight size={13} />
                      </button>
                      <button
                        onClick={() => removeReqBookmark(req.id)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        title="Remove Bookmark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
