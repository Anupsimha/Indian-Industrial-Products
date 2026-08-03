import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { optimizedUrl } from "../lib/cloudinary";
import {
  MapPin, Globe, Phone, Mail, Verified, UserPlus, UserCheck, Tag,
  Edit, Plus, Trash2, Calendar, Users, FileBadge, Building, ShieldCheck, Briefcase
} from "lucide-react";
import { PostCard } from "../components/PostCard";
import { EnquiryDialog } from "../components/EnquiryDialog";
import { ProductDialog } from "../components/ProductDialog";
import { PostDialog, ReelDialog } from "../components/CreateDialogs";
import { CompanyEditDialog } from "../components/CompanyEditDialog";
import { BackButton } from "../components/BackButton";
import { FollowersDialog } from "../components/FollowersDialog";
import { PlanBadge } from "../components/PlanBadge";
import { toast } from "sonner";

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [reels, setReels] = useState([]);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [tab, setTab] = useState("posts");
  const [enq, setEnq] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [postOpen, setPostOpen] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const { user } = useAuth();

  const hasPaidPlan = user && user.plan_name && user.plan_name.toLowerCase() !== "free" && (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
  const canContact = hasPaidPlan || c?.is_owner || (user && user.role === "admin");

  const handleContactClick = (e) => {
    if (!canContact) {
      e.preventDefault();
      toast.error("Upgrade to a paid subscription plan to contact owners or view contact details.");
      navigate("/pricing");
    }
  };

  const load = async () => {
    try {
      const [a, b, d, e] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/companies/${id}/posts`),
        api.get(`/companies/${id}/products`),
        api.get(`/companies/${id}/reels`),
      ]);
      setC(a.data); setPosts(b.data); setProducts(d.data); setReels(e.data);
    } catch {}
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const toggleFollow = async () => {
    try {
      const { data } = await api.post(`/companies/${id}/follow`);
      setC((p) => ({ ...p, is_following: data.following, followers_count: p.followers_count + (data.following ? 1 : -1) }));
      toast.success(data.following ? "Following" : "Unfollowed");
    } catch {
      toast.error("Please login");
    }
  };

  const deleteProduct = async (pid) => {
    if (!window.confirm("Delete this product?")) return;
    try { await api.delete(`/products/${pid}`); load(); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };
  const deletePost = async (pid) => {
    if (!window.confirm("Delete this post?")) return;
    try { await api.delete(`/posts/${pid}`); load(); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };
  const deleteReel = async (rid) => {
    if (!window.confirm("Delete this reel?")) return;
    try { await api.delete(`/reels/${rid}`); load(); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };

  if (!c) return <div className="p-10 text-center text-slate-400">Loading...</div>;

  return (
    <div className="pb-28" data-testid="company-page">
      {/* Cover */}
      <div className="relative h-44 bg-slate-300 overflow-hidden">
        <div className="absolute top-3 left-3 z-10">
          <BackButton className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full" />
        </div>
        {c.cover_url && <img src={optimizedUrl(c.cover_url, { w: 1200 })} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {c.is_owner && (
          <button
            onClick={() => setEditOpen(true)}
            data-testid="company-edit-btn"
            className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-slate-800 text-xs font-semibold hover:bg-white transition-colors"
          >
            <Edit size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div className="px-4 -mt-10 relative">
        {/* Header */}
        <div className="flex items-end gap-3">
          <img src={optimizedUrl(c.logo_url, { w: 200 })} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white" alt="" />
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-display text-xl font-bold text-slate-900 truncate">{c.name}</h1>
              <Verified size={16} className="text-blue-700" />
              <PlanBadge plan={c.plan_name} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-0.5">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.location}</span>
              <span className="inline-flex items-center gap-1"><Tag size={12} /> {c.category}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <button
                onClick={() => setFollowersOpen(true)}
                className="font-bold text-slate-900 hover:text-blue-800 hover:underline cursor-pointer"
                data-testid="company-followers-count"
              >
                {c.followers_count || 0} followers
              </button>
              {c.business_type && <span className="ml-1">• {c.business_type}</span>}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-700 leading-relaxed">{c.description}</p>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {!c.is_owner && (
            <button onClick={toggleFollow} data-testid="company-follow-btn"
              className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1 transition-all active:scale-95 ${
                c.is_following ? "bg-slate-100 text-slate-700" : "bg-blue-800 text-white hover:bg-blue-900"
              }`}>
              {c.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
              {c.is_following ? "Following" : "Follow"}
            </button>
          )}
          <button onClick={(e) => { if (!canContact) { handleContactClick(e); } else { setEnq(true); } }} data-testid="company-enquiry-btn"
            className={`px-4 py-2 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors active:scale-95 ${!canContact ? 'blur-[1.5px] opacity-70' : ''}`}>
            Send Enquiry
          </button>
          {!c.is_owner && (
            <Link to={`/chat/${c.owner_id}`} onClick={handleContactClick} data-testid="company-chat-btn"
              className={`px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors active:scale-95 flex items-center gap-1.5 ${!canContact ? 'blur-[1.5px] opacity-70' : ''}`}>
              Chat
            </Link>
          )}
          <a href={whatsappLink(c.whatsapp, `Hi ${c.name}, I'd like to connect about your products.`)}
            onClick={handleContactClick}
            target="_blank" rel="noreferrer" data-testid="company-whatsapp-btn"
            className={`px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#128C7E] transition-colors ${!canContact ? 'blur-[1.5px] opacity-70' : ''}`}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91a9.84 9.84 0 0 0-2.91-7z"/></svg>
            WhatsApp
          </a>
          <a href={`tel:${c.mobile}`} onClick={handleContactClick} className={`px-4 py-2 rounded-full bg-blue-50 text-blue-800 text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-100 transition-colors ${!canContact ? 'blur-[1.5px] opacity-70' : ''}`}
            data-testid="company-call-btn">
            <Phone size={14} /> Call
          </a>
        </div>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-4 gap-1 bg-slate-100 rounded-full p-1 text-xs font-semibold">
          {["posts", "products", "reels", "about"].map((t) => (
            <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
              className={`py-2 rounded-full transition-colors ${tab === t ? "bg-white text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* POSTS tab */}
        {tab === "posts" && (
          <div className="mt-4 space-y-3">
            {c.is_owner && (
              <button onClick={() => setPostOpen(true)} data-testid="add-post-btn"
                className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-800 font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                <Plus size={16} /> Create Post
              </button>
            )}
            {posts.length === 0 && <div className="text-center text-sm text-slate-500 py-8">No posts yet.</div>}
            {posts.map((p) => (
              <div key={p.id} className="relative">
                <PostCard post={p} onUpdate={load} />
                {c.is_owner && (
                  <button onClick={() => deletePost(p.id)} data-testid={`delete-post-${p.id}`}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-rose-600 hover:bg-rose-50">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PRODUCTS tab */}
        {tab === "products" && (
          <div className="mt-4">
            {c.is_owner && (
              <button onClick={() => { setEditingProduct(null); setProductOpen(true); }} data-testid="add-product-btn"
                className="w-full mb-3 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-800 font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                <Plus size={16} /> Add Product
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 && <div className="col-span-2 text-center text-sm text-slate-500 py-8">No products yet.</div>}
              {products.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all" data-testid={`company-product-${p.id}`}>
                  <div className="relative">
                    <img src={optimizedUrl(p.image_url, { w: 400 })} alt="" className="w-full aspect-square object-cover" />
                    {c.is_owner && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button onClick={() => { setEditingProduct(p); setProductOpen(true); }} data-testid={`edit-product-${p.id}`}
                          className="p-1.5 rounded-full bg-white shadow-sm text-blue-700 hover:bg-blue-50"><Edit size={12} /></button>
                        <button onClick={() => deleteProduct(p.id)} data-testid={`delete-product-${p.id}`}
                          className="p-1.5 rounded-full bg-white shadow-sm text-rose-600 hover:bg-rose-50"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-semibold text-sm text-slate-900 line-clamp-1">{p.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{p.category}</div>
                    {p.price && <div className="font-display font-bold text-blue-800 mt-1 text-sm">{p.price}</div>}
                    <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-slate-500 font-medium">
                      {p.location && (
                        <div className="flex items-center gap-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          <span>{p.location}</span>
                        </div>
                      )}
                      <div>
                        {p.stock_left !== undefined && p.stock_left !== null ? `Stock: ${p.stock_left}` : "In Stock"}
                      </div>
                      {p.moq && <div>MOQ: {p.moq}</div>}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <button onClick={(e) => { if (!canContact) { handleContactClick(e); } else { setEnq(true); } }}
                        className={`py-1 rounded-full bg-orange-600 text-white text-[10px] font-semibold hover:bg-orange-700 ${!canContact ? 'blur-[1px] opacity-70' : ''}`}
                        data-testid={`product-enquiry-${p.id}`}>Enquiry</button>
                      <a href={whatsappLink(p.whatsapp, `Hi, interested in ${p.name}`)} onClick={handleContactClick} target="_blank" rel="noreferrer"
                        className={`py-1 rounded-full bg-[#25D366] text-white text-[10px] font-semibold text-center hover:bg-[#128C7E] ${!canContact ? 'blur-[1px] opacity-70' : ''}`}
                        data-testid={`product-wa-${p.id}`}>WhatsApp</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REELS tab */}
        {tab === "reels" && (
          <div className="mt-4">
            {c.is_owner && (
              <button onClick={() => setReelOpen(true)} data-testid="add-reel-btn"
                className="w-full mb-3 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-800 font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                <Plus size={16} /> Upload Reel
              </button>
            )}
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              {reels.length === 0 && <div className="col-span-3 text-center text-sm text-slate-500 py-8">No reels yet.</div>}
              {reels.map((r) => (
                <div key={r.id} className="relative aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden group" data-testid={`company-reel-${r.id}`}
                  onClick={() => navigate("/reels")}>
                  {r.thumbnail_url ? (
                    <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <video src={r.video_url} className="w-full h-full object-cover" muted />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] font-semibold line-clamp-2 leading-tight">
                    {r.content}
                  </div>
                  <div className="absolute top-1.5 right-1.5 text-white/90 text-[10px] font-semibold bg-black/40 px-1.5 py-0.5 rounded">
                    ❤ {r.likes_count}
                  </div>
                  {c.is_owner && (
                    <button onClick={(e) => { e.stopPropagation(); deleteReel(r.id); }} data-testid={`delete-reel-${r.id}`}
                      className="absolute top-1.5 left-1.5 p-1 rounded-full bg-white/90 text-rose-600 hover:bg-white">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABOUT tab */}
        {tab === "about" && (
          <div className="mt-4 space-y-3" data-testid="about-tab">
            <Card title="Company Details" icon={Building}>
              <KV k="Company name" v={c.name} />
              <KV k="Owner" v={c.owner_name} />
              <KV k="Business type" v={c.business_type} />
              <KV k="Industry" v={c.category} />
              <KV k="Year established" v={c.year_established} icon={Calendar} />
              <KV k="Employees" v={c.employees} icon={Users} />
            </Card>
            <Card title="Compliance" icon={ShieldCheck}>
              <KV k="GST Number" v={c.gst} mono />
              <KV k="PAN Number" v={c.pan} mono />
              {c.certifications && c.certifications.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Certifications</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.certifications.map((cert) => (
                      <span key={cert} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        <FileBadge size={10} /> {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            <Card title="Contact" icon={Briefcase}>
              <KV k="Phone" v={c.mobile} icon={Phone} link={`tel:${c.mobile}`} />
              <KV k="WhatsApp" v={c.whatsapp} link={whatsappLink(c.whatsapp)} />
              <KV k="Email" v={c.email} icon={Mail} link={`mailto:${c.email}`} />
              <KV k="Website" v={c.website} icon={Globe} link={c.website} />
              <KV k="Address" v={c.address} icon={MapPin} />
            </Card>
            {c.address && (
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(c.address)}`}
                target="_blank" rel="noreferrer"
                data-testid="about-map-link"
                className="block rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-40 relative hover:border-blue-300"
              >
                <img alt="Map preview"
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(c.address)}&zoom=14&size=600x300&maptype=roadmap&key=`}
                  className="w-full h-full object-cover opacity-50"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="absolute inset-0 grid place-items-center text-center px-4">
                  <div>
                    <MapPin className="mx-auto text-blue-800 mb-1" />
                    <div className="text-xs font-semibold text-slate-700">View on Google Maps</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2">{c.address}</div>
                  </div>
                </div>
              </a>
            )}
          </div>
        )}
      </div>

      <EnquiryDialog open={enq} onClose={() => setEnq(false)} companyId={c.id} companyName={c.name} defaultCategory={c.category} />
      <CompanyEditDialog open={editOpen} onClose={() => setEditOpen(false)} company={c} onSaved={load} />
      <ProductDialog open={productOpen} onClose={() => setProductOpen(false)} initial={editingProduct} onSaved={load} />
      <PostDialog open={postOpen} onClose={() => setPostOpen(false)} onSaved={load} />
      <ReelDialog open={reelOpen} onClose={() => setReelOpen(false)} onSaved={load} />
      <FollowersDialog open={followersOpen} onClose={() => setFollowersOpen(false)} companyId={c.id} initialTab="followers" />
    </div>
  );
}

const Card = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon size={14} className="text-blue-700" />}
      <h3 className="font-display font-semibold text-sm text-slate-900">{title}</h3>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const KV = ({ k, v, mono, icon: Icon, link }) => {
  if (!v) return null;
  const content = (
    <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
      <div className="text-[11px] font-semibold text-slate-500">{k}</div>
      <div className={`text-xs text-slate-800 text-right max-w-[60%] break-words ${mono ? "font-mono" : ""}`}>
        {Icon && <Icon size={11} className="inline mr-1 text-slate-400" />}
        {v}
      </div>
    </div>
  );
  return link ? <a href={link} target="_blank" rel="noreferrer" className="block hover:bg-slate-50 -mx-1 px-1 rounded">{content}</a> : content;
};
