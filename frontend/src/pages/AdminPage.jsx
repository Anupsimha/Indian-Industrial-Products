import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSupportContact } from "../context/SupportContactContext";
import { Navigate, Link } from "react-router-dom";

import { Users, Building2, Newspaper, Film, Package, Inbox, Briefcase, Heart, Trash2, Star, BarChart3, Crown, Edit, Plus, X, Check, ToggleLeft, ToggleRight, Tag, MapPin, Image, Mail, Phone, Settings as SettingsIcon, Landmark, Globe, Eye, Sparkles, Layers, Upload, Terminal, FileCode, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink, HelpCircle, FileText, Server, Clock, Loader2, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";
import { SingleImageUploader } from "../components/MediaUploader";
import TemplatePreviewModal from "../website_templates/components/TemplatePreviewModal";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planEdit, setPlanEdit] = useState(null);
  const [settlements, setSettlements] = useState([]);

  const reload = async () => {
    try {
      if (tab === "overview") {
        const [s, a] = await Promise.all([api.get("/admin/stats"), api.get("/admin/analytics")]);
        setStats(s.data); setAnalytics(a.data);
      } else if (tab === "companies") {
        const r = await api.get("/admin/companies"); setCompanies(r.data);
      } else if (tab === "users") {
        const [uRes, pRes] = await Promise.all([api.get("/admin/users"), api.get("/admin/plans")]);
        setUsers(uRes.data); setPlans(pRes.data);
      } else if (tab === "plans") {
        const r = await api.get("/admin/plans"); setPlans(r.data);
      } else if (tab === "settlements") {
        const r = await api.get("/admin/settlements"); setSettlements(r.data || []);
      }
    } catch {}
  };
  useEffect(() => {
    if (user?.role === "admin") reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <div className="p-10 text-center text-sm text-slate-500" data-testid="admin-forbidden">Admin only.</div>;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "leads", label: "Buyer Leads", icon: Inbox },
    { id: "templates", label: "Website Templates", icon: Globe },
    { id: "custom-websites", label: "Custom Websites", icon: Layers },
    { id: "settlements", label: "Payout Settlements", icon: Landmark },
    { id: "contact-enquiries", label: "Contact Inquiries", icon: Mail },
    { id: "industrial-groups", label: "Industrial Groups", icon: Building2 },
    { id: "plans", label: "Plans", icon: Crown },
    { id: "topup-plans", label: "Top-Up Plans", icon: Sparkles },
    { id: "slides", label: "Slides", icon: Image },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "areas", label: "Areas", icon: MapPin },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="pb-28 px-4 pt-4" data-testid="admin-page">
      <BackButton className="mb-2" />
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-600">Admin</div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
              tab === t.id ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300"
            }`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && analytics && <Overview stats={stats} analytics={analytics} />}
      {tab === "leads" && <BuyerLeadsTab />}
      {tab === "templates" && <WebsiteTemplatesTab />}
      {tab === "custom-websites" && <CustomWebsitesAdminTab />}
      {tab === "contact-enquiries" && <ContactEnquiriesTab />}
      {tab === "industrial-groups" && <IndustrialGroupsTab />}
      {tab === "plans" && <PlansTab plans={plans} reload={reload} setPlanEdit={setPlanEdit} planEdit={planEdit} />}
      {tab === "topup-plans" && <TopupPlansTab />}
      {tab === "settlements" && <AdminSettlementsTab settlements={settlements} reload={reload} />}
      {tab === "slides" && <SlidesTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "areas" && <AreasTab />}
      {tab === "companies" && <CompaniesTab companies={companies} reload={reload} />}
      {tab === "users" && <UsersTab users={users} plans={plans} reload={reload} />}
      {tab === "settings" && <AdminSettingsTab />}
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700", orange: "bg-orange-50 text-orange-700",
    rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700",
    pink: "bg-pink-50 text-pink-700", slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={`inline-grid place-items-center w-8 h-8 rounded-lg ${colors[color]}`}><Icon size={16} /></div>
      <div className="font-display font-bold text-2xl text-slate-900 mt-2">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
};

const Overview = ({ stats, analytics }) => (
  <div className="mt-2 space-y-4">
    <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-600">Platform</h2>
    <div className="grid grid-cols-2 gap-2">
      <Stat icon={Users} label="Users" value={stats.users} color="blue" />
      <Stat icon={Crown} label="Premium Users" value={analytics.premium_users} color="orange" />
      <Stat icon={Building2} label="Companies" value={stats.companies} color="indigo" />
      <Stat icon={Newspaper} label="Posts" value={stats.posts} color="blue" />
      <Stat icon={Film} label="Reels" value={stats.reels} color="rose" />
      <Stat icon={Package} label="Products" value={stats.products} color="emerald" />
      <Stat icon={Briefcase} label="Jobs" value={stats.jobs} color="indigo" />
      <Stat icon={Heart} label="Follows" value={stats.follows} color="pink" />
    </div>

    <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-600 mt-3">Lead Funnel</h2>
    <div className="grid grid-cols-2 gap-2">
      <Stat icon={Inbox} label="Total Leads" value={analytics.enquiries} color="orange" />
      <Stat icon={BarChart3} label="Conversion %" value={`${analytics.conversion_rate}%`} color="emerald" />
      <Stat icon={Inbox} label="New" value={analytics.new_leads} color="amber" />
      <Stat icon={Inbox} label="In Progress" value={analytics.in_progress_leads} color="blue" />
      <Stat icon={Inbox} label="Closed" value={analytics.closed_leads} color="slate" />
      <Stat icon={Heart} label="Engagement" value={analytics.post_engagement + analytics.reel_engagement} color="rose" />
    </div>
  </div>
);

const CompaniesTab = ({ companies, reload }) => {
  const toggleFeatured = async (id, current) => {
    try { await api.patch(`/admin/companies/${id}/featured?featured=${!current}`); toast.success("Updated"); reload(); }
    catch { toast.error("Failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete company and all content?")) return;
    try { await api.delete(`/admin/companies/${id}`); toast.success("Deleted"); reload(); } catch { toast.error("Failed"); }
  };
  return (
    <div className="mt-2 space-y-2">
      {companies.map((c) => (
        <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3" data-testid={`admin-company-${c.id}`}>
          <img src={c.logo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <Link to={`/company/${c.id}`} className="font-semibold text-sm text-slate-900 hover:text-blue-800 truncate block">{c.name}</Link>
            <div className="text-[11px] text-slate-500 truncate">{c.location} • {c.followers_count} followers</div>
          </div>
          <button onClick={() => toggleFeatured(c.id, c.is_featured)} data-testid={`admin-featured-${c.id}`}
            className={`p-2 rounded-full ${c.is_featured ? "bg-orange-100 text-orange-700" : "text-slate-400 hover:text-orange-600"}`}
            title={c.is_featured ? "Featured" : "Make featured"}>
            <Star size={16} className={c.is_featured ? "fill-current" : ""} />
          </button>
          <button onClick={() => remove(c.id)} className="p-2 text-rose-600 hover:text-rose-800" data-testid={`admin-delete-${c.id}`}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
};

const AssignPlanModal = ({ targetUser, newPlan, currentPlan, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPrice = currentPlan ? (currentPlan.monthly_price ?? 0) : 0;
  const newPrice = newPlan ? (newPlan.monthly_price ?? 0) : 0;
  const priceDiff = newPrice - currentPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onConfirm(reason);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-base text-slate-900">Assign Plan Confirmation</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
          <img src={targetUser.avatar_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80"} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-slate-900 truncate">{targetUser.name}</div>
            <div className="text-xs text-slate-500 truncate">{targetUser.email} • <span className="capitalize">{targetUser.role}</span></div>
          </div>
        </div>

        {/* Current Plan vs New Plan Comparison Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Plan */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Plan</div>
            <div className="font-bold text-sm text-slate-800">{currentPlan?.name || targetUser.plan_name || "Free Tier"}</div>
            <div className="text-xs font-semibold text-slate-600">₹{currentPrice.toLocaleString()}<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
            {targetUser.plan_expires_at && (
              <div className="text-[10px] text-slate-400 truncate">Exp: {new Date(targetUser.plan_expires_at).toLocaleDateString()}</div>
            )}
          </div>

          {/* New Plan */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">New Plan</div>
            <div className="font-bold text-sm text-blue-950">{newPlan.name}</div>
            <div className="text-xs font-semibold text-blue-800">₹{newPrice.toLocaleString()}<span className="text-[10px] text-blue-600/70 font-normal">/mo</span></div>
            <div className="text-[10px] text-blue-600/80">Valid: {newPlan.duration_days || 30} days</div>
          </div>
        </div>

        {/* Price Difference Indicator */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
          priceDiff > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          priceDiff < 0 ? "bg-amber-50 text-amber-800 border-amber-200" :
          "bg-slate-50 text-slate-700 border-slate-200"
        }`}>
          <span>Price Difference:</span>
          <span className="font-bold font-mono">
            {priceDiff > 0 ? `+₹${priceDiff.toLocaleString()}/mo (Upgrade)` :
             priceDiff < 0 ? `-₹${Math.abs(priceDiff).toLocaleString()}/mo (Downgrade)` :
             `₹0 / mo (Same tier)`}
          </span>
        </div>

        {/* Reason Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Assignment</label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., VIP customer request, promotional override, support resolution..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              {submitting ? "Assigning..." : "Confirm & Assign Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersTab = ({ users, plans, reload }) => {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const handleSelectPlan = (user, planId) => {
    if (!planId) return;
    const targetPlan = plans.find((p) => p.id === planId);
    if (!targetPlan) return;
    const currentPlan = plans.find((p) => p.id === user.plan_id || p.name === user.plan_name);
    setSelectedAssignment({ user, targetPlan, currentPlan });
  };

  const confirmAssign = async (reason) => {
    if (!selectedAssignment) return;
    const { user, targetPlan } = selectedAssignment;
    try {
      await api.post(`/admin/users/${user.id}/plan/${targetPlan.id}`, { reason });
      toast.success(`Assigned ${targetPlan.name} to ${user.name}`);
      setSelectedAssignment(null);
      reload();
    } catch {
      toast.error("Failed to assign plan");
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {users.map((u) => (
        <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3" data-testid={`admin-user-${u.id}`}>
          <img src={u.avatar_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80"} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">{u.name}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {u.email} • {u.role} {u.plan_name ? `• Plan: ${u.plan_name}` : ""}
            </div>
          </div>
          <select
            onChange={(e) => handleSelectPlan(u, e.target.value)}
            value={u.plan_id || ""}
            data-testid={`admin-user-plan-${u.id}`}
            className="text-xs rounded-full border border-slate-300 px-2 py-1.5 bg-white font-medium text-slate-700 hover:border-blue-400 transition-colors"
          >
            <option value="" disabled>Assign plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ))}

      {selectedAssignment && (
        <AssignPlanModal
          targetUser={selectedAssignment.user}
          newPlan={selectedAssignment.targetPlan}
          currentPlan={selectedAssignment.currentPlan}
          onClose={() => setSelectedAssignment(null)}
          onConfirm={confirmAssign}
        />
      )}
    </div>
  );
};

const PlansTab = ({ plans, reload, setPlanEdit, planEdit }) => {
  const blank = {
    name: "", description: "", monthly_price: 0, yearly_price: 0,
    duration_days: 30, features: [], color: "blue", is_featured: false, is_active: true, sort_order: plans.length,
    unlocks_per_month: 30, is_unlimited_unlocks: false, has_website: false,
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (planEdit) {
      setForm({
        ...planEdit,
        features: planEdit.features || [],
        is_unlimited_unlocks: planEdit.unlocks_per_month === null || planEdit.unlocks_per_month === undefined,
        unlocks_per_month: planEdit.unlocks_per_month ?? 50,
        has_website: Boolean(planEdit.has_website),
      });
      setOpen(true);
      setPlanEdit(null);
    }
  }, [planEdit, setPlanEdit]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      monthly_price: Number(form.monthly_price),
      yearly_price: Number(form.yearly_price),
      duration_days: Number(form.duration_days),
      sort_order: Number(form.sort_order || 0),
      unlocks_per_month: form.is_unlimited_unlocks ? null : Number(form.unlocks_per_month || 0),
      has_website: Boolean(form.has_website),
      features: typeof form.features === "string" ? form.features.split("\n").map((s) => s.trim()).filter(Boolean) : form.features,
    };
    try {
      if (form.id) await api.patch(`/admin/plans/${form.id}`, payload);
      else await api.post("/admin/plans", payload);
      toast.success("Saved");
      setOpen(false); setForm(blank); reload();
    } catch (e) { toast.error("Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete plan?")) return;
    try { await api.delete(`/admin/plans/${id}`); toast.success("Deleted"); reload(); } catch { toast.error("Failed"); }
  };

  const toggleActive = async (p) => {
    try { await api.patch(`/admin/plans/${p.id}`, { ...p, is_active: !p.is_active }); reload(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="mt-2 space-y-2">
      <button onClick={() => { setForm(blank); setOpen(true); }} data-testid="admin-add-plan-btn"
        className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-800 font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-50">
        <Plus size={16} /> New Plan
      </button>
      {plans.map((p) => (
        <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`admin-plan-${p.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-base text-slate-900">{p.name}</span>
                {p.badge && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{p.badge}</span>}
                {p.has_website ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Website Included
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    No Website
                  </span>
                )}
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {p.unlocks_per_month === null || p.unlocks_per_month === undefined ? "Unlimited Unlocks" : `${p.unlocks_per_month} Unlocks/mo`}
                </span>
                {!p.is_active && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Disabled</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">₹{p.monthly_price}/mo • ₹{p.yearly_price}/yr • {p.duration_days}d</div>
              <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{(p.features || []).join(" · ")}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(p)} data-testid={`admin-plan-toggle-${p.id}`} className="p-1.5 text-slate-600 hover:text-blue-700">
                {p.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button onClick={() => {
                setForm({
                  ...p,
                  features: (p.features || []).join("\n"),
                  is_unlimited_unlocks: p.unlocks_per_month === null || p.unlocks_per_month === undefined,
                  unlocks_per_month: p.unlocks_per_month ?? 50,
                  has_website: Boolean(p.has_website),
                });
                setOpen(true);
              }}
                data-testid={`admin-plan-edit-${p.id}`} className="p-1.5 text-blue-700 hover:text-blue-900"><Edit size={16} /></button>
              <button onClick={() => del(p.id)} data-testid={`admin-plan-delete-${p.id}`} className="p-1.5 text-rose-600 hover:text-rose-800"><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" data-testid="admin-plan-dialog" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="font-display font-bold text-lg text-slate-900">{form.id ? "Edit Plan" : "New Plan"}</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-3">
              <Input label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="plan-name" />
              <Input label="Description" textarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} testid="plan-desc" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Monthly ₹" type="number" value={form.monthly_price} onChange={(v) => setForm({ ...form, monthly_price: v })} testid="plan-monthly" />
                <Input label="Yearly ₹" type="number" value={form.yearly_price} onChange={(v) => setForm({ ...form, yearly_price: v })} testid="plan-yearly" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Duration (days)" type="number" value={form.duration_days} onChange={(v) => setForm({ ...form, duration_days: v })} testid="plan-days" />
                <Input label="Sort order" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} testid="plan-order" />
              </div>

              {/* Lead Unlock Quota Configuration */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Lead Unlocks Quota</label>
                  <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer font-semibold text-blue-900">
                    <input
                      type="checkbox"
                      checked={form.is_unlimited_unlocks}
                      onChange={(e) => setForm({ ...form, is_unlimited_unlocks: e.target.checked })}
                      data-testid="plan-unlimited-unlocks"
                    />
                    Unlimited Leads
                  </label>
                </div>
                {!form.is_unlimited_unlocks && (
                  <Input
                    label="Leads unlocked per month"
                    type="number"
                    value={form.unlocks_per_month}
                    onChange={(v) => setForm({ ...form, unlocks_per_month: v })}
                    testid="plan-unlocks-count"
                    placeholder="e.g. 30"
                  />
                )}
                <p className="text-[10px] text-slate-500">
                  {form.is_unlimited_unlocks
                    ? "Subscribers can unlock unlimited buyer leads every month."
                    : `Subscribers can unlock ${form.unlocks_per_month || 0} leads per month. Once exhausted, they can buy individual lead top-ups.`}
                </p>
              </div>

              {/* Company Website Included Feature Checkbox */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                <label className="text-xs inline-flex items-start gap-2 cursor-pointer font-bold text-blue-950">
                  <input
                    type="checkbox"
                    checked={form.has_website}
                    onChange={(e) => setForm({ ...form, has_website: e.target.checked })}
                    data-testid="plan-has-website"
                    className="mt-0.5 rounded border-blue-300 text-blue-800"
                  />
                  <div>
                    <span>Company Website Included</span>
                    <p className="text-[10px] font-normal text-slate-600 mt-0.5">
                      Enable subscribers of this plan to launch and manage a custom company landing website on their subdomain.
                    </p>
                  </div>
                </label>
              </div>

              <Input label="Badge (optional)" value={form.badge || ""} onChange={(v) => setForm({ ...form, badge: v })} testid="plan-badge" placeholder="Recommended / Best Value" />
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Color</label>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {["slate", "blue", "orange", "indigo", "emerald", "rose"].map((cl) => (
                    <button key={cl} type="button" onClick={() => setForm({ ...form, color: cl })}
                      data-testid={`plan-color-${cl}`}
                      className={`h-8 rounded-lg border-2 ${form.color === cl ? "border-slate-900" : "border-slate-200"} bg-${cl}-500`}
                      style={{ backgroundColor: { slate: "#64748b", blue: "#1d4ed8", orange: "#ea580c", indigo: "#4338ca", emerald: "#047857", rose: "#be123c" }[cl] }}
                    />
                  ))}
                </div>
              </div>
              <Input label="Features (one per line)" textarea value={form.features} onChange={(v) => setForm({ ...form, features: v })} testid="plan-features" />
              <div className="flex items-center gap-4">
                <label className="text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} data-testid="plan-active" /> Active</label>
                <label className="text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} data-testid="plan-featured" /> Featured</label>
              </div>
              <button type="submit" data-testid="plan-save-btn" className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700">
                <Check size={14} className="inline mr-1" /> Save Plan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TopupPlansTab = () => {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  const RANGES = [
    { label: "₹0 - ₹10,000", min: 0, max: 10000, default_price: 300 },
    { label: "₹10,000 - ₹50,000", min: 10000, max: 50000, default_price: 500 },
    { label: "₹50,000 - ₹1,00,000", min: 50000, max: 100000, default_price: 1000 },
    { label: "₹1,00,000 - ₹5,00,000", min: 100000, max: 500000, default_price: 2000 },
    { label: "₹5,00,000+", min: 500000, max: null, default_price: 3500 },
  ];

  const blank = {
    valuation_range: RANGES[0].label,
    min_valuation: RANGES[0].min,
    max_valuation: RANGES[0].max,
    price_inr: RANGES[0].default_price,
    is_active: true,
    sort_order: 0,
  };

  const [form, setForm] = useState(blank);

  const fetchTopups = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/topup-plans");
      setTopups(res.data || []);
    } catch (err) {
      toast.error("Failed to load topup plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopups();
  }, []);

  const handleRangeChange = (label) => {
    const matched = RANGES.find((r) => r.label === label);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        valuation_range: matched.label,
        min_valuation: matched.min,
        max_valuation: matched.max,
        price_inr: prev.price_inr || matched.default_price,
      }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        min_valuation: Number(form.min_valuation),
        max_valuation: form.max_valuation !== null && form.max_valuation !== undefined ? Number(form.max_valuation) : null,
        price_inr: parseInt(form.price_inr, 10),
        sort_order: Number(form.sort_order || 0),
        is_active: Boolean(form.is_active),
      };
      if (form.id) {
        await api.patch(`/admin/topup-plans/${form.id}`, payload);
        toast.success("Top-up pricing updated");
      } else {
        await api.post("/admin/topup-plans", payload);
        toast.success("New top-up pricing created");
      }
      setOpen(false);
      setForm(blank);
      fetchTopups();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save top-up plan");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this top-up plan?")) return;
    try {
      await api.delete(`/admin/topup-plans/${id}`);
      toast.success("Top-up plan deleted");
      fetchTopups();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (t) => {
    try {
      await api.patch(`/admin/topup-plans/${t.id}`, { ...t, is_active: !t.is_active });
      fetchTopups();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900">Lead Top-Up Pricing by Lead Valuation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rates in ₹ charged when a subscriber exhausts their plan unlock balance and purchases an individual lead.
          </p>
        </div>
        <button
          onClick={() => { setForm(blank); setOpen(true); }}
          data-testid="admin-add-topup-btn"
          className="px-4 py-2 bg-blue-850 hover:bg-blue-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus size={14} /> Add Top-Up Rate
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading top-up plans...</div>
      ) : topups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
          No top-up pricing configured yet. Click above to add lead valuation ranges.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topups.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between" data-testid={`admin-topup-${t.id}`}>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                    Valuation Range
                  </span>
                  {!t.is_active && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="font-display font-black text-lg text-slate-900 mt-2">
                  {t.valuation_range}
                </h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-2xl text-blue-900">
                    ₹{Number(t.price_inr).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">+ 18% GST</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Min Valuation: ₹{t.min_valuation?.toLocaleString("en-IN") || 0}
                  {t.max_valuation ? ` — Max: ₹${t.max_valuation?.toLocaleString("en-IN")}` : " (Unbounded)"}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => toggleActive(t)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  {t.is_active ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-slate-400" />}
                  <span>{t.is_active ? "Active" : "Disabled"}</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setForm(t); setOpen(true); }}
                    className="p-1.5 text-blue-700 hover:text-blue-900 rounded-lg hover:bg-blue-50"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => del(t.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {form.id ? "Edit Top-Up Pricing" : "New Lead Top-Up Pricing"}
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Lead Valuation Range
                </label>
                <select
                  value={form.valuation_range}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
                >
                  {RANGES.map((r) => (
                    <option key={r.label} value={r.label}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Select a standardized buyer lead requirement valuation bracket.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Top-Up Unlock Price (in ₹ Rupees)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={form.price_inr}
                  onChange={(e) => setForm({ ...form, price_inr: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Integer rate in INR. 18% GST will be automatically calculated on top for tax invoice generation.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active & Available for Users
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <Check size={16} className="inline mr-1" /> Save Top-Up Rate
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, value, onChange, textarea, required, type = "text", placeholder, testid }) => (
  <div>
    <label className="text-[11px] font-semibold text-slate-600">{label}</label>
    {textarea ? (
      <textarea rows={3} value={value || ""} required={required} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} data-testid={testid}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
    ) : (
      <input value={value ?? ""} required={required} type={type} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} data-testid={testid}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
    )}
  </div>
);

const CategoriesTab = () => {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/categories").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/categories/${editing.id}`, { name, sort_order: editing.sort_order || 0 });
        toast.success("Updated");
      } else {
        await api.post("/admin/categories", { name, sort_order: list.length });
        toast.success("Added");
      }
      setName(""); setEditing(null); load();
    } catch { toast.error("Failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete category?")) return;
    try { await api.delete(`/admin/categories/${id}`); load(); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };

  return (
    <div className="mt-2 space-y-2" data-testid="admin-categories-tab">
      <form onSubmit={save} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required
          placeholder={editing ? "Edit category name" : "New category name"}
          data-testid="admin-cat-input"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button type="submit" data-testid="admin-cat-save-btn" className="px-4 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700">
          {editing ? "Save" : "Add"}
        </button>
        {editing && (
          <button type="button" onClick={() => { setEditing(null); setName(""); }} className="px-3 rounded-lg bg-slate-100 text-slate-700 text-sm">Cancel</button>
        )}
      </form>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {list.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2" data-testid={`admin-cat-${c.id}`}>
            <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditing(c); setName(c.name); }} data-testid={`admin-cat-edit-${c.id}`} className="p-1 text-blue-700 hover:text-blue-900"><Edit size={14} /></button>
              <button onClick={() => remove(c.id)} data-testid={`admin-cat-delete-${c.id}`} className="p-1 text-rose-600 hover:text-rose-800"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AreasTab = () => {
  const [tree, setTree] = useState({});
  const [form, setForm] = useState({ state: "", city: "", name: "" });

  const load = () => api.get("/areas/tree").then((r) => setTree(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/areas", { state: form.state, city: form.city, name: form.name, sort_order: 0 });
      toast.success("Area added");
      setForm({ state: "", city: "", name: "" });
      load();
    } catch { toast.error("Failed"); }
  };

  const removeArea = async (state, city, areaName) => {
    if (!window.confirm(`Delete ${areaName}?`)) return;
    const all = await api.get("/areas").then((r) => r.data).catch(() => []);
    const match = all.find((a) => a.state === state && a.city === city && a.name === areaName);
    if (match) {
      try { await api.delete(`/admin/areas/${match.id}`); load(); toast.success("Deleted"); } catch { toast.error("Failed"); }
    }
  };

  return (
    <div className="mt-2 space-y-3" data-testid="admin-areas-tab">
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2">
        <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" data-testid="admin-area-state" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" data-testid="admin-area-city" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Industrial Area" data-testid="admin-area-name" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        <button type="submit" data-testid="admin-area-add-btn" className="col-span-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700">
          <Plus size={14} className="inline mr-1" /> Add Area
        </button>
      </form>
      <div className="space-y-3">
        {Object.entries(tree).map(([state, cities]) => (
          <div key={state} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`admin-area-state-${state}`}>
            <div className="font-display font-semibold text-sm text-slate-900">{state}</div>
            {Object.entries(cities).map(([city, areas]) => (
              <div key={city} className="mt-2 pl-2 border-l-2 border-blue-200">
                <div className="text-xs font-semibold text-slate-700">{city}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {areas.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]" data-testid={`admin-area-${state}-${city}-${a}`}>
                      {a}
                      <button onClick={() => removeArea(state, city, a)} className="text-rose-500 hover:text-rose-700"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const SlidesTab = () => {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    cta: "",
    accent: "from-blue-900/85 via-blue-800/60 to-transparent",
    sort_order: 0,
  });

  const load = () => api.get("/slides").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/slides/${editing.id}`, form);
        toast.success("Slide updated");
      } else {
        await api.post("/admin/slides", form);
        toast.success("Slide added");
      }
      setForm({
        title: "",
        subtitle: "",
        image: "",
        cta: "",
        accent: "from-blue-900/85 via-blue-800/60 to-transparent",
        sort_order: list.length + 1,
      });
      setEditing(null);
      load();
    } catch {
      toast.error("Failed to save slide");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this slide?")) return;
    try {
      await api.delete(`/admin/slides/${id}`);
      load();
      toast.success("Deleted slide");
    } catch {
      toast.error("Failed to delete slide");
    }
  };

  const edit = (slide) => {
    setEditing(slide);
    setForm({
      title: slide.title,
      subtitle: slide.subtitle,
      image: slide.image,
      cta: slide.cta,
      accent: slide.accent,
      sort_order: slide.sort_order,
    });
  };

  return (
    <div className="mt-2 space-y-4" data-testid="admin-slides-tab">
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h4 className="font-display font-semibold text-sm text-slate-800">
          {editing ? "Edit Slide" : "Add New Slide"}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. India's Engineering Marketplace" data-testid="admin-slide-title"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subtitle</label>
            <input required value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Discover 1,500+ verified manufacturers" data-testid="admin-slide-subtitle"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Slide Image Photo</label>
            <div className="mt-1">
              <SingleImageUploader
                url={form.image}
                onChange={(newUrl) => setForm({ ...form, image: newUrl })}
                label="Upload Slide Image"
                folder="iip/slides"
                testid="admin-slide-image-upload"
                className="w-full h-32 rounded-lg border border-slate-300 bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CTA Button Text</label>
            <input required value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })}
              placeholder="e.g. Post Your Requirement" data-testid="admin-slide-cta"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gradient Accent (CSS Class)</label>
            <input value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })}
              placeholder="from-blue-900/85 via-blue-800/60 to-transparent" data-testid="admin-slide-accent"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sort Order</label>
            <input type="number" required value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="0" data-testid="admin-slide-sort-order"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          {editing && (
            <button type="button" onClick={() => {
              setEditing(null);
              setForm({ title: "", subtitle: "", image: "", cta: "", accent: "from-blue-900/85 via-blue-800/60 to-transparent", sort_order: list.length });
            }} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200">
              Cancel
            </button>
          )}
          <button type="submit" data-testid="admin-slide-save-btn" className="px-5 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700">
            {editing ? "Save Slide" : "Add Slide"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex shadow-sm" data-testid={`admin-slide-${s.id}`}>
            <div className="w-24 shrink-0 bg-slate-100 relative">
              <img src={s.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono">#{s.sort_order}</span>
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h5 className="font-semibold text-xs text-slate-800 truncate">{s.title}</h5>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{s.subtitle}</p>
                <div className="text-[9px] font-mono text-slate-400 mt-1 truncate">CTA: {s.cta}</div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => edit(s)} data-testid={`admin-slide-edit-${s.id}`} className="p-1 text-blue-700 hover:text-blue-900 inline-flex items-center gap-0.5 text-xs font-semibold">
                  <Edit size={12} /> Edit
                </button>
                <button onClick={() => remove(s.id)} data-testid={`admin-slide-delete-${s.id}`} className="p-1 text-rose-600 hover:text-rose-800 inline-flex items-center gap-0.5 text-xs font-semibold">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const IndustrialGroupsTab = () => {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", location: "", description: "", image_url: "", cover_url: "", members_count: 500, companies_count: 100
  });

  const load = () => {
    api.get("/industrial-groups").then((r) => setList(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/industrial-groups/${editing.id}`, form);
        toast.success("Industrial group updated");
      } else {
        await api.post("/industrial-groups", form);
        toast.success("Industrial group created");
      }
      setEditing(null);
      setForm({ name: "", location: "", description: "", image_url: "", cover_url: "", members_count: 500, companies_count: 100 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save group");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this industrial group?")) return;
    try {
      await api.delete(`/industrial-groups/${id}`);
      toast.success("Industrial group deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const edit = (g) => {
    setEditing(g);
    setForm({
      name: g.name, location: g.location, description: g.description,
      image_url: g.image_url, cover_url: g.cover_url || "",
      members_count: g.members_count, companies_count: g.companies_count
    });
  };

  return (
    <div className="mt-4 space-y-6">
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm" data-testid="admin-group-form">
        <h4 className="font-display font-bold text-sm text-slate-800">
          {editing ? "Edit Industrial Area Group" : "Create New Industrial Area Group"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Group Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Peenya Industrial Area" data-testid="admin-group-name" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
            <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Bengaluru, Karnataka" data-testid="admin-group-location" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
            <textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description of the industrial area..." data-testid="admin-group-desc" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Group Photo</label>
            <div className="mt-1">
              <SingleImageUploader
                url={form.image_url}
                onChange={(newUrl) => setForm({ ...form, image_url: newUrl })}
                label="Upload Group Photo"
                folder="iip/groups"
                testid="admin-group-image-upload"
                className="w-full h-32 rounded-lg border border-slate-300 bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Cover Banner Photo</label>
            <div className="mt-1">
              <SingleImageUploader
                url={form.cover_url}
                onChange={(newUrl) => setForm({ ...form, cover_url: newUrl })}
                label="Upload Banner Photo"
                folder="iip/groups"
                testid="admin-group-cover-upload"
                className="w-full h-32 rounded-lg border border-slate-300 bg-slate-50"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm({ name: "", location: "", description: "", image_url: "", cover_url: "", members_count: 500, companies_count: 100 }); }} className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold">
              Cancel
            </button>
          )}
          <button type="submit" data-testid="admin-group-save-btn" className="px-5 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold">
            {editing ? "Save Changes" : "Create Group"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {list.map((g) => (
          <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm" data-testid={`admin-group-item-${g.id}`}>
            <div className="flex items-center gap-3">
              <img src={g.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <h5 className="font-bold text-sm text-slate-900">{g.name}</h5>
                <p className="text-xs text-slate-500">{g.location} • {g.members_count} Members • {g.companies_count} Companies</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => edit(g)} data-testid={`admin-group-edit-${g.id}`} className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg">Edit</button>
              <button onClick={() => remove(g.id)} data-testid={`admin-group-delete-${g.id}`} className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactEnquiriesTab = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/contact-enquiries");
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setList([]);
      } else {
        const detail = err.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : "Failed to load contact inquiries";
        if (err.response?.status !== 401 && err.response?.status !== 403) {
          toast.error(msg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "resolved" ? "pending" : "resolved";
    try {
      await api.patch(`/admin/contact-enquiries/${id}/status?status_val=${nextStatus}`);
      toast.success(`Marked as ${nextStatus}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this inquiry?")) return;
    try {
      await api.delete(`/admin/contact-enquiries/${id}`);
      toast.success("Deleted inquiry");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Loading contact submissions...</div>;

  if (list.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2 mt-2" data-testid="admin-contact-empty">
        <Inbox className="mx-auto text-slate-300" size={36} />
        <h4 className="font-bold text-slate-700 text-sm">No Contact Submissions Yet</h4>
        <p className="text-xs text-slate-400">Inquiries submitted via the Contact Us page will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3" data-testid="admin-contact-tab">
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>Total Received: {list.length}</span>
        <span>Showing latest contact form queries</span>
      </div>

      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3" data-testid={`admin-contact-item-${c.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    c.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                  <a href={`mailto:${c.email}`} className="text-blue-700 font-medium hover:underline flex items-center gap-1">
                    <Mail size={12} /> {c.email}
                  </a>
                  {c.mobile && (
                    <a href={`tel:${c.mobile.replace(/\D/g, "")}`} className="text-slate-600 font-medium hover:underline flex items-center gap-1">
                      <Phone size={12} /> {c.mobile}
                    </a>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    {new Date(c.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleStatus(c.id, c.status)}
                  data-testid={`admin-contact-toggle-${c.id}`}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    c.status === "resolved" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {c.status === "resolved" ? "Mark Pending" : "Mark Resolved"}
                </button>
                <button
                  onClick={() => remove(c.id)}
                  data-testid={`admin-contact-delete-${c.id}`}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
              {c.subject && <div className="text-xs font-bold text-slate-800">Subject: {c.subject}</div>}
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{c.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BuyerLeadsTab = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/requirements");
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load buyer leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleDeleteLead = async (id, reqTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete lead: "${reqTitle || id}"?`)) {
      return;
    }
    try {
      await api.delete(`/requirements/${id}`);
      toast.success("Lead requirement deleted successfully");
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete lead");
    }
  };

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.product_name || "").toLowerCase().includes(q) ||
      (l.requirement || "").toLowerCase().includes(q) ||
      (l.category || "").toLowerCase().includes(q) ||
      (l.name || "").toLowerCase().includes(q) ||
      (l.mobile || "").includes(q)
    );
  });

  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Loading buyer leads...</div>;

  return (
    <div className="mt-2 space-y-4" data-testid="admin-leads-tab">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-sm">Buyer Requirements / Leads</h3>
          <p className="text-xs text-slate-500">Manage and delete buyer leads across all categories</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>Total Leads: {filtered.length} (of {leads.length})</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
          <Inbox className="mx-auto text-slate-300" size={36} />
          <h4 className="font-bold text-slate-700 text-sm">No Leads Found</h4>
          <p className="text-xs text-slate-400">No buyer requirements matched your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3"
              data-testid={`admin-lead-item-${l.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{l.product_name || "Buyer Requirement"}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {l.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      l.status === "closed" ? "bg-slate-100 text-slate-600" : l.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {l.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {l.requirement}
                  </p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                    <span className="font-semibold text-slate-700">Buyer: {l.name}</span>
                    <span>Phone: {l.mobile}</span>
                    <span>Location: {l.location}</span>
                    {l.quantity && <span>Qty: {l.quantity}</span>}
                    {l.budget && <span>Budget: {l.budget}</span>}
                    <span className="text-slate-400">
                      {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDeleteLead(l.id, l.product_name || l.requirement)}
                    data-testid={`admin-delete-lead-btn-${l.id}`}
                    className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-xl transition-all inline-flex items-center gap-1 text-xs font-bold"
                    title="Delete Lead"
                  >
                    <Trash2 size={15} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminSettingsTab = () => {
  const { refreshSupportContact } = useSupportContact();
  const [graceDays, setGraceDays] = useState(30);
  const [supportPhone, setSupportPhone] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportAddress, setSupportAddress] = useState("");

  const [savingGrace, setSavingGrace] = useState(false);
  const [savingSupport, setSavingSupport] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeModal, setPurgeModal] = useState({ open: false, users: [], count: 0 });

  useEffect(() => {
    api.get("/admin/settings").then((r) => {
      if (r.data?.account_deletion_grace_days) {
        setGraceDays(r.data.account_deletion_grace_days);
      }
      if (r.data?.support_phone) setSupportPhone(r.data.support_phone);
      if (r.data?.support_whatsapp) setSupportWhatsapp(r.data.support_whatsapp);
      if (r.data?.support_email) setSupportEmail(r.data.support_email);
      if (r.data?.support_address) setSupportAddress(r.data.support_address);
    }).catch(() => {});
  }, []);

  const handleSaveGraceDays = async (e) => {
    e.preventDefault();
    setSavingGrace(true);
    try {
      await api.patch("/admin/settings", { account_deletion_grace_days: Number(graceDays) });
      toast.success("Account deletion policy updated!");
    } catch {
      toast.error("Failed to update grace period");
    } finally {
      setSavingGrace(false);
    }
  };

  const handleSaveSupportContact = async (e) => {
    e.preventDefault();
    setSavingSupport(true);
    try {
      await api.patch("/admin/settings", {
        support_phone: supportPhone,
        support_whatsapp: supportWhatsapp,
        support_email: supportEmail,
        support_address: supportAddress,
      });
      await refreshSupportContact();
      toast.success("Support contact details updated successfully!");
    } catch {
      toast.error("Failed to update support contact details");
    } finally {
      setSavingSupport(false);
    }
  };

  const handleOpenPurgeModal = async () => {
    setLoadingPreview(true);
    try {
      const res = await api.get("/admin/expired-users");
      setPurgeModal({
        open: true,
        users: res.data?.users || [],
        count: res.data?.count || 0
      });
    } catch {
      toast.error("Failed to fetch expired accounts preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmPurge = async () => {
    setPurging(true);
    try {
      const r = await api.post("/admin/purge-deleted-users");
      toast.success(`Purge completed! Removed ${r.data.purged_count} expired accounts.`);
      setPurgeModal({ open: false, users: [], count: 0 });
    } catch {
      toast.error("Failed to run purge worker");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="mt-4 space-y-6 max-w-xl" data-testid="admin-settings-tab">
      {/* Support Contact Details Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-800" /> Support Contact Details Settings
        </h3>
        <p className="text-xs text-slate-500">
          Update the platform support phone number, WhatsApp, email, and physical address displayed across the website and mobile views.
        </p>

        <form onSubmit={handleSaveSupportContact} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Support Phone Number
            </label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+91 9380036328"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              data-testid="admin-support-phone-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Support WhatsApp Number
            </label>
            <input
              type="text"
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              placeholder="9380036328"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              data-testid="admin-support-whatsapp-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Support Email Address
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@indianindustrialplatform.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              data-testid="admin-support-email-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Support Physical Address
            </label>
            <textarea
              rows={2}
              value={supportAddress}
              onChange={(e) => setSupportAddress(e.target.value)}
              placeholder="No. 35 Suvarna Nagar Doddabidrekallu Nagasandra - 560073"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              data-testid="admin-support-address-input"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={savingSupport}
              className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs transition-all shadow-sm"
              data-testid="admin-save-support-contact-btn"
            >
              {savingSupport ? "Saving..." : "Save Support Contact Details"}
            </button>
          </div>
        </form>
      </div>

      {/* Account Deletion Policy Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-800" /> Account Deletion Policy Settings
        </h3>
        <p className="text-xs text-slate-500">
          Configure the soft deletion grace period. When a user requests deletion, their account is soft-deleted for this duration before permanent hard purge.
        </p>

        <form onSubmit={handleSaveGraceDays} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Soft Deletion Grace Period (Days)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                data-testid="admin-grace-days-input"
              />
              <button
                type="submit"
                disabled={savingGrace}
                className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs transition-all shadow-sm"
                data-testid="admin-save-grace-days-btn"
              >
                {savingGrace ? "Saving..." : "Save Policy"}
              </button>
            </div>
          </div>
        </form>
      </div>


      <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-rose-950 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" /> Expired Account Purge Worker
        </h3>
        <p className="text-xs text-rose-800 leading-relaxed">
          Manually trigger the database hard-delete worker to permanently purge soft-deleted users whose grace period has expired. Clicking will open a preview modal listing all accounts ready for deletion.
        </p>
        <button
          onClick={handleOpenPurgeModal}
          disabled={loadingPreview}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
          data-testid="admin-run-purge-btn"
        >
          {loadingPreview ? "Checking Accounts..." : "Preview & Run Expired Accounts Purge"}
        </button>
      </div>

      {purgeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" data-testid="purge-modal-overlay">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-600" /> Confirm Expired Accounts Purge
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Review accounts whose soft deletion grace period has passed before initiating permanent hard purge.
                </p>
              </div>
              <button
                onClick={() => setPurgeModal({ open: false, users: [], count: 0 })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                data-testid="close-purge-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {purgeModal.count === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No Expired Accounts Found</p>
                <p className="text-xs text-slate-500">
                  There are currently no soft-deleted user accounts whose grace period has expired.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">!</div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    <span className="font-bold text-rose-950">Warning:</span> You are about to permanently hard-delete <strong className="underline">{purgeModal.count} account(s)</strong>. This action will cascade delete all associated company listings, products, reels, posts, likes, bookmarks, and comments from the database. <strong>This action cannot be undone.</strong>
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {purgeModal.users.map((u) => (
                    <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{u.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{u.role}</span>
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] text-slate-400">Scheduled Purge Date:</p>
                        <p className="text-xs font-semibold text-rose-600">
                          {u.scheduled_deletion_at ? new Date(u.scheduled_deletion_at).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPurgeModal({ open: false, users: [], count: 0 })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                data-testid="cancel-purge-btn"
              >
                {purgeModal.count === 0 ? "Close" : "Cancel"}
              </button>
              {purgeModal.count > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmPurge}
                  disabled={purging}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
                  data-testid="confirm-purge-btn"
                >
                  {purging ? "Purging..." : `Confirm & Hard Delete (${purgeModal.count})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const AdminSettlementsTab = ({ settlements = [], reload }) => {
  const [modal, setModal] = useState(null);
  const [utr, setUtr] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const processSettlement = async (status) => {
    if (!modal) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/settlements/${modal.id}/process`, {
        status,
        utr_reference_number: utr.trim(),
        rejection_reason: rejectReason.trim(),
      });
      toast.success(status === "SETTLED" ? "Settlement processed & marked as SETTLED!" : "Settlement request rejected.");
      setModal(null);
      setUtr("");
      setRejectReason("");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to process settlement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4" data-testid="admin-settlements-tab">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Payout Settlements Ledger</h2>
          <p className="text-xs text-slate-500">Approve seller payout requests and record Bank UTR reference numbers.</p>
        </div>
        <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200">
          Refresh List
        </button>
      </div>

      {settlements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
          No settlement requests submitted yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Seller Company</th>
                  <th className="p-3">Policy</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Bank Account</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">UTR / Ref No</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{s.company_name}</td>
                    <td className="p-3 font-semibold uppercase text-slate-600">{s.settlement_policy}</td>
                    <td className="p-3 font-extrabold text-slate-900 text-sm">₹{s.amount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-slate-600">
                      {s.bank_account ? (
                        <div>
                          <div className="font-semibold text-slate-800">{s.bank_account.bank_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{s.bank_account.masked_account_number}</div>
                        </div>
                      ) : (
                        <span className="text-rose-500 font-semibold">Missing Bank</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === "SETTLED" ? "bg-emerald-100 text-emerald-800" :
                        s.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800 animate-pulse"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{s.utr_reference_number || "—"}</td>
                    <td className="p-3 text-right">
                      {s.status === "PENDING" ? (
                        <button
                          onClick={() => { setModal(s); setUtr(""); setRejectReason(""); }}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-xs"
                        >
                          Process Payout
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Payout Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Landmark size={20} className="text-orange-600" /> Process Bank Settlement
              </h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-slate-900">Payout Amount: ₹{modal.amount.toLocaleString("en-IN")}</div>
              <div className="text-slate-600">Company: <span className="font-semibold">{modal.company_name}</span></div>
            </div>

            {/* Decrypted Bank Transfer Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500 mb-1">
                Decrypted Transfer Beneficiary (Bank Details)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Bank Name:</span> <strong className="block text-slate-900">{modal.bank_account?.bank_name || "N/A"}</strong></div>
                <div><span className="text-slate-500">Holder Name:</span> <strong className="block text-slate-900">{modal.bank_account?.account_holder_name || "N/A"}</strong></div>
                <div><span className="text-slate-500">Account Number:</span> <strong className="block text-slate-900 font-mono">{modal.decrypted_account_number || modal.bank_account?.masked_account_number}</strong></div>
                <div><span className="text-slate-500">IFSC Code:</span> <strong className="block text-slate-900 font-mono">{modal.decrypted_ifsc_code || "N/A"}</strong></div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Bank UTR / Transaction Reference Number *</label>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. UTR123456789098"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-orange-300 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => processSettlement("REJECTED")}
                className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100"
              >
                Reject Payout
              </button>
              <button
                disabled={submitting || !utr.trim()}
                onClick={() => processSettlement("SETTLED")}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
              >
                {submitting ? "Confirming..." : "Confirm & Mark SETTLED"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WebsiteTemplatesTab = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    category: "industrial",
    features: "Responsive Hero, Live Product Catalog, SEO Discovery Engine, Direct WhatsApp RFQ",
    preview_image: "",
    accent_color: "#0F294A",
    is_custom: false,
    assigned_company_id: "",
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get("/websites/templates");
      setTemplates(res.data);
    } catch {
      toast.error("Failed to load website templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.description.trim()) {
      toast.error("Please fill in template ID, name, and description");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: form.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "industrial",
        features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
        preview_image: form.preview_image.trim() || null,
        accent_color: form.accent_color.trim() || "#0F294A",
        is_custom: Boolean(form.is_custom),
        assigned_company_id: form.assigned_company_id ? parseInt(form.assigned_company_id, 10) : null,
      };

      await api.post("/websites/admin/templates", payload);
      toast.success(`Template "${payload.name}" created successfully!`);
      setCreateModalOpen(false);
      setForm({
        id: "",
        name: "",
        description: "",
        category: "industrial",
        features: "Responsive Hero, Live Product Catalog, SEO Discovery Engine, Direct WhatsApp RFQ",
        preview_image: "",
        accent_color: "#0F294A",
        is_custom: false,
        assigned_company_id: "",
      });
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Are you sure you want to delete template "${tmpl.name}" (${tmpl.id})?`)) {
      return;
    }

    try {
      await api.delete(`/websites/admin/templates/${tmpl.id}`);
      toast.success(`Template "${tmpl.name}" deleted.`);
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete template");
    }
  };

  return (
    <div className="mt-4 space-y-4" data-testid="admin-website-templates-tab">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-slate-900">Custom Website Templates</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
              {templates.length} Templates
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage public catalog templates and bespoke private templates assigned to specific client companies.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all shrink-0"
          data-testid="admin-create-template-btn"
        >
          <Plus size={15} />
          <span>Add New Template</span>
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-semibold">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-semibold">
          No templates found. Click "Add New Template" to register one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              data-testid={`admin-template-card-${t.id}`}
            >
              <div>
                {/* Thumbnail Image & Badges */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                  {t.preview_image ? (
                    <img src={t.preview_image} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-900/5">
                      <Layers size={32} />
                      <span className="text-[10px] font-bold uppercase mt-1 tracking-wider">Industrial Template</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                      {t.category || "General"}
                    </span>
                    {t.is_default && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600/90 backdrop-blur-md text-white">
                        Default
                      </span>
                    )}
                    {t.is_custom && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600/90 backdrop-blur-md text-white">
                        Bespoke {t.assigned_company_id ? `(Co #${t.assigned_company_id})` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-900">{t.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t.id}
                      </span>
                    </div>
                    {t.accent_color && (
                      <div
                        className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: t.accent_color }}
                        title={`Accent: ${t.accent_color}`}
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  {/* Feature Tags */}
                  {Array.isArray(t.features) && t.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {t.features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplateId(t.id)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  data-testid={`admin-preview-template-${t.id}`}
                >
                  <Eye size={13} className="text-blue-600" />
                  <span>Preview with Sample</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Template"
                  data-testid={`admin-delete-template-${t.id}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-800">
                  <Globe size={18} />
                </span>
                <h3 className="font-display font-bold text-base text-slate-900">Add New Website Template</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Template ID (Unique Identifier) *
                </label>
                <input
                  required
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g. precision_aerospace_dark"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Template Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Precision Aerospace & Defense"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="High-contrast precision layout tailored for defense and precision aerospace manufacturers."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                  >
                    <option value="industrial">Industrial</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="catalog">Catalog</option>
                    <option value="modern">Modern Minimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                    <input
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      className="flex-1 rounded-xl border border-slate-300 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preview Image URL (Thumbnail)
                </label>
                <input
                  value={form.preview_image}
                  onChange={(e) => setForm({ ...form, preview_image: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Features (Comma separated)
                </label>
                <input
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="Hero Section, RFQ Engine, SEO Indexing"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>

              {/* Bespoke / Custom Assignment */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_custom}
                    onChange={(e) => setForm({ ...form, is_custom: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Private / Bespoke Template (Exclusive to Lead/Company)</span>
                </label>

                {form.is_custom && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Company ID (Optional - Leave blank for platform-private)
                    </label>
                    <input
                      type="number"
                      value={form.assigned_company_id}
                      onChange={(e) => setForm({ ...form, assigned_company_id: e.target.value })}
                      placeholder="e.g. 42"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                  data-testid="admin-submit-template-btn"
                >
                  {submitting ? "Saving..." : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplateId && (
        <TemplatePreviewModal
          templateId={previewTemplateId}
          onClose={() => setPreviewTemplateId(null)}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------
// Custom Websites Admin Tab & Multi-Stage Deployment Wizard
// ----------------------------------------------------
const CustomWebsitesAdminTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    benefits_list: [],
    maintenance_months: 6,
    additional_benefits: ""
  });
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    benefits: "",
    maintenance_months: 6,
    additional_benefits: ""
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Active request for deployment wizard
  const [activeReq, setActiveReq] = useState(null);
  const [wizardStage, setWizardStage] = useState(1);
  const [stageDomain, setStageDomain] = useState("");
  const [syncHostinger, setSyncHostinger] = useState(true);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainCheckResult, setDomainCheckResult] = useState(null);

  // Stage 2: Zip upload & AI guide
  const [zipFile, setZipFile] = useState(null);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [zipUploadResult, setZipUploadResult] = useState(null);
  const [showAiGuide, setShowAiGuide] = useState(false);

  // Stage 3: Live deploy
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, cfgRes] = await Promise.all([
        api.get("/admin/websites/custom-requests"),
        api.get("/websites/custom-config")
      ]);
      setRequests(reqRes.data || []);
      if (cfgRes.data) {
        setConfig(cfgRes.data);
        setConfigForm({
          benefits: (cfgRes.data.benefits_list || []).join("\n"),
          maintenance_months: cfgRes.data.maintenance_months || 6,
          additional_benefits: cfgRes.data.additional_benefits || ""
        });
      }
    } catch (err) {
      toast.error("Failed to load custom website data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const benefitsList = configForm.benefits
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);

      const res = await api.patch("/admin/websites/custom-config", {
        benefits_list: benefitsList,
        maintenance_months: parseInt(configForm.maintenance_months, 10) || 6,
        additional_benefits: configForm.additional_benefits.trim()
      });
      setConfig(res.data);
      setEditingConfig(false);
      toast.success("Custom website benefits & maintenance configuration updated!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update config");
    } finally {
      setSavingConfig(false);
    }
  };

  const openWizard = async (req) => {
    setActiveReq(req);
    setWizardStage(
      req.status === "DEPLOYED" ? 3 :
      req.status === "IN_DEVELOPMENT" ? 2 :
      req.status === "DOMAIN_PURCHASED" ? 2 : 1
    );
    setStageDomain(req.assigned_domain || req.requested_domain || "");
    setDomainCheckResult(null);
    setZipFile(null);
    setZipUploadResult(null);
    setDeployResult(null);

    loadLogs(req.id);
  };

  const loadLogs = async (reqId) => {
    setLoadingLogs(true);
    try {
      const res = await api.get(`/admin/websites/custom-requests/${reqId}/logs`);
      setAuditLogs(res.data || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Stage 1: Domain check
  const handleStageDomain = async (e) => {
    e.preventDefault();
    if (!stageDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }
    setCheckingDomain(true);
    try {
      const res = await api.post(`/admin/websites/custom-requests/${activeReq.id}/stage-domain`, {
        domain: stageDomain.trim().toLowerCase(),
        sync_hostinger: syncHostinger
      });
      setDomainCheckResult(res.data);
      if (res.data.ok) {
        toast.success(`Domain sanity check passed! Resolved to target IP ${res.data.target_ip}`);
        loadData();
        loadLogs(activeReq.id);
      } else {
        toast.warning(res.data.message || "DNS did not resolve to 200.141.14.101 yet.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Stage 1 domain check failed");
    } finally {
      setCheckingDomain(false);
    }
  };

  // Stage 2: Upload zip
  const handleStageUploadZip = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      toast.error("Please choose a frontend .zip file");
      return;
    }
    setUploadingZip(true);
    try {
      const form = new FormData();
      form.append("file", zipFile);
      const res = await api.post(`/admin/websites/custom-requests/${activeReq.id}/stage-upload-zip`, form);
      setZipUploadResult(res.data);
      toast.success(res.data.message || "Frontend zip extracted & verified successfully!");
      loadData();
      loadLogs(activeReq.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Zip sandbox upload failed");
    } finally {
      setUploadingZip(false);
    }
  };

  // Stage 3: Deploy & SSL
  const handleStageDeploy = async () => {
    setDeploying(true);
    try {
      const res = await api.post(`/admin/websites/custom-requests/${activeReq.id}/stage-deploy`);
      setDeployResult(res.data);
      toast.success("Custom website deployed and marked LIVE!");
      loadData();
      loadLogs(activeReq.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Stage 3 deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="mt-4 space-y-5" data-testid="admin-custom-websites-tab">
      {/* 1. Header & Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-900">Bespoke Custom Websites</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                {requests.length} Requests
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-stage custom website deployment with Hostinger DNS sanity validation, AI frontend upload, Nginx vhost setup, and audit logging.
            </p>
          </div>

          <button
            onClick={() => setEditingConfig(!editingConfig)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
            data-testid="admin-edit-custom-config-btn"
          >
            <Edit size={14} />
            <span>{editingConfig ? "Close Settings" : "Configure Benefits & Terms"}</span>
          </button>
        </div>

        {/* Benefits Config Editor (Collapsible) */}
        {editingConfig ? (
          <form onSubmit={handleSaveConfig} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configure Custom Website Package</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Benefits List (One per line)</label>
                <textarea
                  rows={4}
                  value={configForm.benefits}
                  onChange={(e) => setConfigForm({ ...configForm, benefits: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-sans text-xs focus:ring-2 focus:ring-blue-300 outline-none resize-none"
                  placeholder="Custom Domain Name&#10;Bespoke UI Design&#10;6 Months Maintenance"
                />
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Included Free Maintenance Period (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={configForm.maintenance_months}
                    onChange={(e) => setConfigForm({ ...configForm, maintenance_months: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Additional Terms &amp; Guarantees</label>
                  <input
                    type="text"
                    value={configForm.additional_benefits}
                    onChange={(e) => setConfigForm({ ...configForm, additional_benefits: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                    placeholder="e.g. Integrated with IIP marketplace & realtime RFQs."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingConfig(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {savingConfig ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Hostinger Target Server IP</span>
              <span className="font-mono font-bold text-slate-800">200.141.14.101</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Standard Maintenance</span>
              <span className="font-bold text-emerald-700">{config.maintenance_months || 6} Months Free Included</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">CMS Admin Panel</span>
              <span className="font-bold text-blue-700">Synchronized on /company-admin</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Custom Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-semibold">Loading custom website requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-semibold">
            No bespoke custom website requests received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Requested Domain</th>
                  <th className="py-3 px-4">Assigned / Live Domain</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{r.company_name || r.company_id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {r.id.slice(0, 8)}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {r.requested_domain}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.assigned_domain ? (
                        <a
                          href={`https://${r.assigned_domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          {r.assigned_domain} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not deployed yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          r.status === "DEPLOYED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          r.status === "IN_DEVELOPMENT" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          r.status === "DOMAIN_PURCHASED" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                          r.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openWizard(r)}
                        className="px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                        data-testid={`admin-open-wizard-${r.id}`}
                      >
                        <Layers size={13} />
                        <span>Deploy Wizard</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Multi-Stage Deployment Wizard Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">
                    Deployment Pipeline: {activeReq.company_name || activeReq.company_id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Requested Domain: <strong className="font-mono text-blue-700">{activeReq.requested_domain}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveReq(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector Pills */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto">
              {[
                { s: 1, title: "1. Domain & DNS Sanity" },
                { s: 2, title: "2. AI Prompt & Zip Upload" },
                { s: 3, title: "3. Live Vhost Deploy" },
                { s: 4, title: "Audit Logs" }
              ].map((step) => (
                <button
                  key={step.s}
                  onClick={() => setWizardStage(step.s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    wizardStage === step.s
                      ? "bg-blue-800 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {step.title}
                </button>
              ))}
            </div>

            {/* Wizard Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* STAGE 1: DOMAIN & DNS SANITY */}
              {wizardStage === 1 && (
                <form onSubmit={handleStageDomain} className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-xs">
                      <Server size={14} /> Stage 1: Hostinger Domain &amp; DNS Resolution Verification
                    </h4>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Verify that the domain bought on Hostinger points its A-record to our production server at <code className="font-mono font-bold">200.141.14.101</code>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Target Custom Domain
                    </label>
                    <input
                      type="text"
                      value={stageDomain}
                      onChange={(e) => setStageDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
                      placeholder="e.g. saisamtools.com"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-300 outline-none"
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncHostinger}
                      onChange={(e) => setSyncHostinger(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Automatically configure A-record via Hostinger DNS API (if domain managed in account)</span>
                  </label>

                  {domainCheckResult && (
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        domainCheckResult.ok
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {domainCheckResult.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                        <span>{domainCheckResult.message}</span>
                      </div>
                      <div className="font-mono text-[11px] space-y-0.5">
                        <div>Target Server IP: {domainCheckResult.target_ip}</div>
                        <div>Resolved IP(s): {JSON.stringify(domainCheckResult.resolved_ips)}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setWizardStage(2)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                    >
                      Skip to Stage 2 &rarr;
                    </button>
                    <button
                      type="submit"
                      disabled={checkingDomain}
                      className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      data-testid="admin-verify-dns-sanity-btn"
                    >
                      {checkingDomain ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      <span>Verify DNS Sanity Resolution</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STAGE 2: AI GUIDE & ZIP SANDBOX UPLOAD */}
              {wizardStage === 2 && (
                <div className="space-y-4">
                  {/* AI Generation Guidelines Accordion */}
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAiGuide(!showAiGuide)}
                      className="w-full p-3 flex items-center justify-between text-purple-950 font-bold text-xs hover:bg-purple-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-purple-600" />
                        <span>AI Code Prompting &amp; Export Instructions (Emergent / Claude)</span>
                      </div>
                      <span className="text-[11px] text-purple-700">{showAiGuide ? "Hide Guide ▲" : "Show Guide ▼"}</span>
                    </button>
                    {showAiGuide && (
                      <div className="p-4 pt-1 border-t border-purple-200/60 text-[11px] text-purple-900 space-y-2 leading-relaxed">
                        <p>
                          <strong>Single Source of Truth Architecture:</strong> You do <em>not</em> need to configure or pay for MongoDB/Atlas/external DBs for custom sites.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>
                            Prompt the AI to generate a pure static Vite/React/HTML single-page application.
                          </li>
                          <li>
                            The frontend must query our backend API at:
                            <code className="block mt-1 font-mono bg-purple-100 p-1.5 rounded text-purple-950">
                              GET https://indianindustrialplatform.com/api/public/site/{activeReq.assigned_domain || activeReq.requested_domain}
                            </code>
                            This endpoint returns full company profile, categories, live products, posts, and reels.
                          </li>
                          <li>
                            RFQ and quote submission buttons must call:
                            <code className="block mt-1 font-mono bg-purple-100 p-1.5 rounded text-purple-950">
                              POST https://indianindustrialplatform.com/api/enquiries
                            </code>
                          </li>
                          <li>
                            Run <code className="font-mono bg-purple-100 px-1 py-0.5 rounded">npm run build</code> and zip the contents of the output folder (must contain <code className="font-mono">index.html</code> at root).
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Sandbox Zip Upload Form */}
                  <form onSubmit={handleStageUploadZip} className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <label className="font-bold text-slate-800 block">Upload Frontend Bundle (.zip)</label>
                      <p className="text-[11px] text-slate-500">
                        The backend scans for path traversal vulnerabilities, rejects executables, and extracts static assets into sandboxed vhost directory.
                      </p>
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                        className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs"
                        required
                        data-testid="admin-upload-zip-input"
                      />
                    </div>

                    {zipUploadResult && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={15} />
                          <span>Zip Sandbox Scanned &amp; Validated</span>
                        </div>
                        <p className="font-mono text-[10px] text-emerald-800">
                          {zipUploadResult.files_count} files extracted to {zipUploadResult.destination_path}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setWizardStage(1)}
                        className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                      >
                        &larr; Back to Stage 1
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingZip || !zipFile}
                        className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                        data-testid="admin-submit-zip-btn"
                      >
                        {uploadingZip ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>Upload &amp; Sandbox Validate</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STAGE 3: LIVE VHOST DEPLOY & SSL */}
              {wizardStage === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-xs">
                      <ShieldCheck size={15} /> Stage 3: Automated Nginx VHost &amp; SSL Activation
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Generates server virtual host configuration, provisions Let's Encrypt SSL certificate, links domain in database, and notifies the company owner.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1 text-slate-700">
                    <div><strong>Target Domain:</strong> {activeReq.assigned_domain || activeReq.requested_domain}</div>
                    <div><strong>Server IP:</strong> 200.141.14.101</div>
                    <div><strong>Webroot:</strong> /var/www/custom-sites/{activeReq.assigned_domain || activeReq.requested_domain}/dist</div>
                    <div><strong>SSL Engine:</strong> certbot --nginx -d {activeReq.assigned_domain || activeReq.requested_domain}</div>
                  </div>

                  {deployResult && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 size={16} />
                        <span>Website Successfully Deployed Live!</span>
                      </div>
                      <a
                        href={deployResult.live_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-blue-700 underline text-xs inline-flex items-center gap-1"
                      >
                        {deployResult.live_url} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setWizardStage(2)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                    >
                      &larr; Back to Stage 2
                    </button>
                    <button
                      type="button"
                      onClick={handleStageDeploy}
                      disabled={deploying}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      data-testid="admin-execute-deploy-btn"
                    >
                      {deploying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      <span>Deploy Live &amp; Provision SSL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* AUDIT LOGS VIEWER */}
              {wizardStage === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      Deployment Audit Logs
                    </h4>
                    <button
                      onClick={() => loadLogs(activeReq.id)}
                      className="text-[11px] text-blue-700 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Refresh
                    </button>
                  </div>

                  {loadingLogs ? (
                    <div className="p-8 text-center text-slate-400">Loading audit log entries...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">No deployment audit records yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2.5 rounded-xl border text-[11px] font-mono space-y-0.5 ${
                            log.level === "ERROR" ? "bg-rose-50 border-rose-200 text-rose-900" :
                            log.level === "WARNING" ? "bg-amber-50 border-amber-200 text-amber-900" :
                            "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[10px]">
                            <span>[{log.stage}] {log.level}</span>
                            <span className="text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <div>{log.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



