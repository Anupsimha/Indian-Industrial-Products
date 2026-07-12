import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import {
  LogOut, Briefcase, Inbox, Bookmark, Bell, Star, ChevronRight,
  Building2, Verified, MapPin, Globe, Camera, FileText, Users,
  UserPlus, Package, BarChart3, Edit, Plus, Trash2, Calendar,
  ShieldCheck, Phone, Mail
} from "lucide-react";
import { PostCard } from "../components/PostCard";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const [company, setCompany] = useState(null);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [reels, setReels] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const navigate = useNavigate();
  const isBusiness = user?.role === "manufacturer" || user?.role === "supplier";

  const loadCompanyData = async () => {
    if (user?.company_id) {
      try {
        const [compRes, postsRes, prodsRes, reelsRes] = await Promise.all([
          api.get(`/companies/${user.company_id}`),
          api.get(`/companies/${user.company_id}/posts`),
          api.get(`/companies/${user.company_id}/products`),
          api.get(`/companies/${user.company_id}/reels`),
        ]);
        setCompany(compRes.data);
        setPosts(postsRes.data);
        setProducts(prodsRes.data);
        setReels(reelsRes.data);
      } catch (err) {
        console.error("Error loading company data", err);
      }
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400 font-semibold" data-testid="profile-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="profile-page">
      {/* 1. Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F294A] to-[#0A1D36] text-white shadow-xl p-5 border border-slate-800">
        <div className="flex items-start sm:items-center gap-4">
          {/* Avatar Container with Camera Overlay */}
          <div className="relative shrink-0">
            <img
              src={user.avatar_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200"}
              alt={user.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white/10 ring-4 ring-blue-900/30 bg-slate-800"
            />
            <button
              onClick={() => toast.info("Profile photo upload coming soon!")}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* User & Company Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight truncate">{user.name}</h2>
              <Verified size={18} className="text-blue-400 fill-blue-400 shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-semibold text-slate-200 truncate">
                {company?.name || "Precision Parts India"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/90 text-white text-[9px] font-bold uppercase tracking-wider">
                <Star size={8} className="fill-white" /> {user.plan_name || "Free"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{company?.location || "Bengaluru - Peenya Industrial Area"}</span>
            </div>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-xl">
              {company?.description || "Manufacturer of precision machined components for industrial and engineering applications."}
            </p>

            <div className="flex items-center gap-1 text-xs text-blue-400 mt-2 hover:underline">
              <Globe size={12} className="shrink-0" />
              <a href={company?.website ? `http://${company.website}` : "https://www.precisionpartsindia.com"} target="_blank" rel="noreferrer" className="truncate">
                {company?.website || "www.precisionpartsindia.com"}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Business Stats Section */}
      <div className="mt-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center divide-x divide-slate-100">
          <div className="flex flex-col items-center justify-center">
            <FileText size={16} className="text-slate-400 mb-1" />
            <span className="font-display font-extrabold text-slate-900 text-lg">{posts.length || 245}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posts</span>
          </div>
          <div className="flex flex-col items-center justify-center pl-1">
            <Users size={16} className="text-slate-400 mb-1" />
            <span className="font-display font-extrabold text-slate-900 text-lg">{company?.followers_count || "12.5K"}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Followers</span>
          </div>
          <div className="flex flex-col items-center justify-center pl-1">
            <UserPlus size={16} className="text-slate-400 mb-1" />
            <span className="font-display font-extrabold text-slate-900 text-lg">1.2K</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Following</span>
          </div>
          <div className="flex flex-col items-center justify-center pl-1">
            <Inbox size={16} className="text-slate-400 mb-1" />
            <span className="font-display font-extrabold text-slate-900 text-lg">85</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enquiries</span>
          </div>
        </div>
      </div>



      {/* 4. Content Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
          {["posts", "products", "reels", "about"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-3 flex-1 text-center transition-all border-b-2 ${
                activeTab === t
                  ? "border-blue-900 text-blue-900 font-extrabold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Tab Content Area */}
      <div className="mt-4">
        {/* POSTS TAB */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8 bg-white rounded-2xl border border-slate-100">
                No posts created yet.
              </div>
            ) : (
              posts.map((p) => (
                <PostCard key={p.id} post={p} onUpdate={loadCompanyData} />
              ))
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div>
            {products.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8 bg-white rounded-2xl border border-slate-100">
                No products uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative aspect-square w-full bg-slate-50">
                      <img
                        src={optimizedUrl(p.image_url, { w: 400 })}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="font-semibold text-sm text-slate-900 line-clamp-1">{p.name}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">{p.category}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-display font-extrabold text-blue-900 text-sm">{p.price || "On request"}</div>
                        {p.moq && <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">MOQ: {p.moq}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REELS TAB */}
        {activeTab === "reels" && (
          <div>
            {reels.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-4 bg-white rounded-xl border border-slate-100">
                No reels uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {reels.map((r) => (
                  <div
                    key={r.id}
                    className="relative aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden shadow-sm cursor-pointer group"
                    onClick={() => navigate("/reels")}
                  >
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <video src={r.video_url} className="w-full h-full object-cover" muted />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-white text-[9px] font-semibold line-clamp-2 leading-tight">
                      {r.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === "about" && company && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <h3 className="font-display font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-blue-700" /> Company Details
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Business Type</span>
                  <span className="text-slate-800 font-bold">{company.business_type || "Manufacturer"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Industry Category</span>
                  <span className="text-slate-800 font-bold">{company.category || "Steel & Metal"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Owner</span>
                  <span className="text-slate-800 font-bold">{company.owner_name || user.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Employees</span>
                  <span className="text-slate-800 font-bold">{company.employees || "50-100"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Year Established</span>
                  <span className="text-slate-800 font-bold">{company.year_established || "2015"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <h3 className="font-display font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-700" /> Compliance
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">GST Number</span>
                  <span className="font-mono text-slate-800 font-bold">{company.gst || "29AAAAA1111A1Z1"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">PAN Number</span>
                  <span className="font-mono text-slate-800 font-bold">{company.pan || "ABCDE1234F"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <h3 className="font-display font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-700" /> Contact Info
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Mobile</span>
                  <a href={`tel:${company.mobile || "+919876543210"}`} className="text-blue-600 font-bold hover:underline">
                    {company.mobile || "+91 98765 43210"}
                  </a>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Email</span>
                  <a href={`mailto:${company.email || "contact@precisionparts.com"}`} className="text-blue-600 font-bold hover:underline">
                    {company.email || "info@precisionpartsindia.com"}
                  </a>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Address</span>
                  <span className="text-slate-800 font-bold text-right max-w-[60%] line-clamp-2">
                    {company.address || "Peenya Industrial Area, Bengaluru, Karnataka, 560058"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
