import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { whatsappLink } from "../lib/api";
import { BackButton } from "../components/BackButton";
import { PostCard } from "../components/PostCard";
import { PostDialog, ReelDialog } from "../components/CreateDialogs";
import { ProductDialog } from "../components/ProductDialog";
import { PlanBadge } from "../components/PlanBadge";
import {
  MapPin, Users, Building2, Newspaper, Package, Briefcase, Film, Calendar,
  Info, CheckCircle2, ShieldCheck, Plus, Lock, Phone, Tag, Clock, Boxes,
  Share2, ArrowRight, Loader2, MessageSquare, UserCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function IndustrialGroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState("Feed");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [openPostDialog, setOpenPostDialog] = useState(false);
  const [openReelDialog, setOpenReelDialog] = useState(false);
  const [openProductDialog, setOpenProductDialog] = useState(false);

  // Tab Data states
  const [feedPosts, setFeedPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reels, setReels] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      const { data } = await api.get(`/industrial-groups/${id}`);
      setGroup(data);
    } catch (err) {
      console.error("Error fetching group details", err);
      toast.error("Group not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTabData = async () => {
    if (!group) return;
    setLoadingTab(true);
    try {
      if (activeTab === "Feed") {
        const { data } = await api.get(`/industrial-groups/${group.id}/feed`);
        setFeedPosts(data);
      } else if (activeTab === "Companies") {
        const { data } = await api.get(`/industrial-groups/${group.id}/companies`);
        setCompanies(data);
      } else if (activeTab === "Products") {
        const { data } = await api.get(`/industrial-groups/${group.id}/products`);
        setProducts(data);
      } else if (activeTab === "Leads") {
        const { data } = await api.get(`/industrial-groups/${group.id}/leads`);
        setLeads(data);
      } else if (activeTab === "Jobs") {
        const { data } = await api.get(`/industrial-groups/${group.id}/jobs`);
        setJobs(data);
      } else if (activeTab === "Reels") {
        const { data } = await api.get(`/industrial-groups/${group.id}/reels`);
        setReels(data);
      } else if (activeTab === "Events") {
        const { data } = await api.get(`/industrial-groups/${group.id}/events`);
        setEvents(data);
      } else if (activeTab === "Members") {
        const { data } = await api.get(`/industrial-groups/${group.id}/members`);
        setMembers(data);
      }
    } catch (err) {
      console.error(`Error loading ${activeTab}`, err);
    } finally {
      setLoadingTab(false);
    }
  };

  useEffect(() => {
    fetchTabData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, activeTab]);

  const handleJoinExit = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setJoining(true);
    try {
      if (group.is_joined) {
        await api.post(`/industrial-groups/${group.id}/exit`);
        toast.info(`Exited ${group.name}`);
      } else {
        await api.post(`/industrial-groups/${group.id}/join`);
        toast.success(`Joined ${group.name}! 🎉`);
      }
      fetchGroupDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setJoining(false);
    }
  };

  const formatCount = (num) => {
    if (!num) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-800" size={32} />
        <p className="text-xs text-slate-500 mt-2">Loading group hub...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-600">Group not found</p>
        <BackButton />
      </div>
    );
  }

  const isBuyer = user?.role === "buyer";
  const isMember = group?.is_joined && !!user;
  const isMemberBusiness = group?.is_joined && (user?.role === "manufacturer" || user?.role === "supplier" || !!user?.company_id);

  const tabs = [
    { name: "Feed", icon: Newspaper },
    { name: "Companies", icon: Building2 },
    { name: "Products", icon: Package },
    { name: "Leads", icon: Boxes },
    { name: "Jobs", icon: Briefcase },
    { name: "Reels", icon: Film },
    { name: "Events", icon: Calendar },
    { name: "Members", icon: Users },
    { name: "About", icon: Info },
  ];

  return (
    <div className="pb-28 max-w-5xl mx-auto" data-testid="group-detail-page">
      {/* Top Navigation */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate max-w-[200px] sm:max-w-md">
            {group.name}
          </h1>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Group link copied!");
          }}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          title="Share Group"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Cover Banner & Group Details */}
      <div className="relative bg-white border-b border-slate-200">
        <div className="h-40 sm:h-56 w-full overflow-hidden bg-slate-900">
          <img
            src={group.cover_url || group.image_url}
            alt={group.name}
            className="w-full h-full object-cover opacity-80"
          />
        </div>

        <div className="px-4 sm:px-6 pb-6 pt-3 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16">
            <div className="flex items-end gap-3">
              <img
                src={group.image_url}
                alt={group.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
              />
              <div className="mb-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">{group.name}</h2>
                  {group.is_joined && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <UserCheck size={12} /> Joined
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <MapPin size={13} className="text-blue-700 shrink-0" />
                  {group.location}
                </p>
              </div>
            </div>

            {/* Main Action Button */}
            {!isBuyer ? (
              <button
                onClick={handleJoinExit}
                disabled={joining}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  group.is_joined
                    ? "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    : "bg-blue-800 text-white hover:bg-blue-900 active:scale-95"
                }`}
              >
                {joining ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : group.is_joined ? (
                  "Exit Group"
                ) : (
                  <>
                    <Plus size={16} /> Join Group
                  </>
                )}
              </button>
            ) : (
              <span className="w-full sm:w-auto text-center px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                Viewing as Buyer
              </span>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div>
              <div className="font-display font-bold text-base sm:text-lg text-slate-900">
                {formatCount(group.members_count)}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">Members</div>
            </div>
            <div>
              <div className="font-display font-bold text-base sm:text-lg text-slate-900">
                {formatCount(group.companies_count)}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">Companies</div>
            </div>
            <div>
              <div className="font-display font-bold text-base sm:text-lg text-slate-900">
                {formatCount(group.posts_count || 0)}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">Posts & Updates</div>
            </div>
          </div>

          {/* Value Bullets (shown if not joined yet) */}
          {!group.is_joined && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Benefits of Joining</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-700 shrink-0" />
                  <span>Connect directly with local regional businesses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-700 shrink-0" />
                  <span>Get area-wise leads, enquiries & factory vacancies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-700 shrink-0" />
                  <span>Share products & machine demo videos locally</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-700 shrink-0" />
                  <span>Grow your local industrial network & sales</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 9 HUB TABS HEADER */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar border-t border-slate-200 px-3 bg-white sticky top-[53px] z-10">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.name;
            return (
              <button
                key={t.name}
                onClick={() => setActiveTab(t.name)}
                className={`py-3 px-3 text-xs font-bold transition-all whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
                  isSel
                    ? "border-blue-800 text-blue-800 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* TABS CONTENT AREA */}
      <div className="p-4">
        {loadingTab ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-blue-800" size={24} />
            <p className="text-xs text-slate-400 mt-2">Loading {activeTab}...</p>
          </div>
        ) : (
          <>
            {/* 1. FEED TAB */}
            {activeTab === "Feed" && (
              <div className="space-y-4">
                {group.is_joined && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src={user?.avatar_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200"}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">
                        Post an update for {group.name}...
                      </span>
                    </div>
                    <button
                      onClick={() => setOpenPostDialog(true)}
                      className="px-4 py-2 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
                    >
                      Post in Group
                    </button>
                  </div>
                )}

                {feedPosts.map((p) => (
                  <PostCard key={p.id} post={p} onUpdate={fetchTabData} />
                ))}

                {feedPosts.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-3">
                    <p className="font-semibold text-sm">No posts yet in {group.name}.</p>
                    {group.is_joined ? (
                      <button
                        onClick={() => setOpenPostDialog(true)}
                        className="px-4 py-2 rounded-xl bg-blue-800 text-white text-xs font-bold"
                      >
                        Be the first to post!
                      </button>
                    ) : (
                      <p className="text-xs text-slate-400">Join the group to post updates, offers, and news.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. COMPANIES TAB */}
            {activeTab === "Companies" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/company/${c.id}`)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5"
                  >
                    <img src={c.logo_url} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-sm text-slate-900 truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.category} • {c.location}</div>
                      <div className="text-[11px] text-blue-700 font-semibold mt-0.5">View Profile →</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PRODUCTS TAB */}
            {activeTab === "Products" && (
              <div className="space-y-3">
                {isMemberBusiness && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold text-xs text-slate-900">List Products in {group.name}</div>
                      <p className="text-[11px] text-slate-500">Showcase products directly to group members</p>
                    </div>
                    <button
                      onClick={() => setOpenProductDialog(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 transition-all shadow-sm flex items-center gap-1 shrink-0"
                      data-testid="group-add-product-btn"
                    >
                      <Plus size={14} /> Add Product
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="bg-white border border-slate-200 rounded-2xl p-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-2"
                    >
                      <img src={p.image_url} alt="" className="w-full h-32 rounded-xl object-cover" />
                      <div>
                        <div className="font-semibold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{p.company_name}</div>
                        {p.price && <div className="text-xs font-bold text-emerald-700 mt-1">{p.price}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. LEADS TAB */}
            {activeTab === "Leads" && (
              <div className="space-y-3">
                {isMember && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold text-xs text-slate-900">Post Requirement for {group.name}</div>
                      <p className="text-[11px] text-slate-500">Broadcast buying needs to verified local suppliers</p>
                    </div>
                    <button
                      onClick={() => navigate("/post-enquiry")}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-all shadow-sm flex items-center gap-1 shrink-0"
                      data-testid="group-add-lead-btn"
                    >
                      <Plus size={14} /> Post Requirement
                    </button>
                  </div>
                )}
                {leads.map((it) => (
                  <article key={it.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between gap-2">
                      <div className="font-display font-bold text-sm text-slate-900">{it.product_name || it.requirement.slice(0, 60)}</div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">{it.category}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{it.requirement}</p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">{it.name} • {it.location}</span>
                        <PlanBadge plan={it.plan_name} size="xs" />
                      </div>
                      <span className="text-slate-400 text-[10px]">{new Date(it.created_at).toLocaleDateString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* 5. JOBS TAB */}
            {activeTab === "Jobs" && (
              <div className="space-y-3">
                {isMemberBusiness && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold text-xs text-slate-900">Post Factory Vacancy in {group.name}</div>
                      <p className="text-[11px] text-slate-500 font-medium">Recruit local skilled workers and engineers</p>
                    </div>
                    <button
                      onClick={() => navigate("/manage-vacancies")}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 transition-all shadow-sm flex items-center gap-1 shrink-0"
                      data-testid="group-add-job-btn"
                    >
                      <Plus size={14} /> Post Vacancy
                    </button>
                  </div>
                )}
                {jobs.map((j) => (
                  <div key={j.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-900">{j.title}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-slate-500">{j.company_name} • {j.location}</p>
                          <PlanBadge plan={j.plan_name} size="xs" />
                        </div>
                      </div>
                      {j.salary && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{j.salary}</span>}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{j.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 6. REELS TAB */}
            {activeTab === "Reels" && (
              <div className="space-y-3">
                {isMemberBusiness && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold text-xs text-slate-900">Upload Video Reel to {group.name}</div>
                      <p className="text-[11px] text-slate-500 font-medium">Share machine demo videos with local buyers</p>
                    </div>
                    <button
                      onClick={() => setOpenReelDialog(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-all shadow-sm flex items-center gap-1 shrink-0"
                      data-testid="group-add-reel-btn"
                    >
                      <Plus size={14} /> Upload Reel
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reels.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => navigate("/reels")}
                      className="relative rounded-2xl overflow-hidden bg-slate-900 h-64 cursor-pointer group"
                    >
                      <video src={r.video_url} className="w-full h-full object-cover opacity-90" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full w-fit">
                          {r.company_name}
                        </span>
                        <p className="text-xs text-white line-clamp-2 font-medium">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. EVENTS TAB */}
            {activeTab === "Events" && (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row">
                    <img src={ev.banner} alt="" className="w-full sm:w-48 h-36 object-cover" />
                    <div className="p-4 flex-1 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{ev.type}</span>
                      <h4 className="font-display font-bold text-base text-slate-900">{ev.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{ev.date} • {ev.location}</p>
                      <p className="text-xs text-slate-600">{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 8. MEMBERS TAB */}
            {activeTab === "Members" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                    <img src={m.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{m.company_name || m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 9. ABOUT TAB */}
            {activeTab === "About" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-display font-bold text-base text-slate-900">About {group.name}</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{group.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-900 font-semibold">Location:</strong> {group.location}
                  </div>
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-900 font-semibold">Community Admin:</strong> IIP Area Admin
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs with group preselected */}
      {openPostDialog && (
        <PostDialog open={openPostDialog} onClose={() => setOpenPostDialog(false)} onSaved={fetchTabData} />
      )}
      {openReelDialog && (
        <ReelDialog open={openReelDialog} onClose={() => setOpenReelDialog(false)} onSaved={fetchTabData} />
      )}
      {openProductDialog && (
        <ProductDialog open={openProductDialog} onClose={() => setOpenProductDialog(false)} onSaved={fetchTabData} />
      )}
    </div>
  );
}
