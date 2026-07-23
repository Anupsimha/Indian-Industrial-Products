import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Users, Building2, Newspaper, Film, Package, Inbox, Briefcase, Heart, Trash2, Star, BarChart3, Crown, Edit, Plus, X, Check, ToggleLeft, ToggleRight, Tag, MapPin, Image } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "../components/BackButton";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planEdit, setPlanEdit] = useState(null);

  const reload = async () => {
    try {
      if (tab === "overview") {
        const [s, a] = await Promise.all([api.get("/admin/stats"), api.get("/admin/analytics")]);
        setStats(s.data); setAnalytics(a.data);
      } else if (tab === "companies") {
        const r = await api.get("/admin/companies"); setCompanies(r.data);
      } else if (tab === "users") {
        const r = await api.get("/admin/users"); setUsers(r.data);
      } else if (tab === "plans") {
        const r = await api.get("/admin/plans"); setPlans(r.data);
      }
    } catch {}
  };
  useEffect(() => { if (user?.role === "admin") reload(); /* eslint-disable-next-line */ }, [user, tab]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <div className="p-10 text-center text-sm text-slate-500" data-testid="admin-forbidden">Admin only.</div>;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "industrial-groups", label: "Industrial Groups", icon: Building2 },
    { id: "plans", label: "Plans", icon: Crown },
    { id: "slides", label: "Slides", icon: Image },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "areas", label: "Areas", icon: MapPin },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
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
      {tab === "industrial-groups" && <IndustrialGroupsTab />}
      {tab === "plans" && <PlansTab plans={plans} reload={reload} setPlanEdit={setPlanEdit} planEdit={planEdit} />}
      {tab === "slides" && <SlidesTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "areas" && <AreasTab />}
      {tab === "companies" && <CompaniesTab companies={companies} reload={reload} />}
      {tab === "users" && <UsersTab users={users} plans={plans} reload={reload} />}
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

const UsersTab = ({ users, plans, reload }) => {
  const assign = async (uid, planId) => {
    try { await api.post(`/admin/users/${uid}/plan/${planId}`); toast.success("Plan assigned"); reload(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="mt-2 space-y-2">
      {users.map((u) => (
        <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3" data-testid={`admin-user-${u.id}`}>
          <img src={u.avatar_url || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80"} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">{u.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{u.email} • {u.role}</div>
          </div>
          <select onChange={(e) => assign(u.id, e.target.value)} defaultValue="" data-testid={`admin-user-plan-${u.id}`}
            className="text-xs rounded-full border border-slate-300 px-2 py-1.5 bg-white">
            <option value="" disabled>Assign plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
};

const PlansTab = ({ plans, reload, setPlanEdit, planEdit }) => {
  const blank = {
    name: "", description: "", monthly_price: 0, yearly_price: 0,
    duration_days: 30, features: [], color: "blue", is_featured: false, is_active: true, sort_order: plans.length,
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (planEdit) { setForm({ ...planEdit, features: planEdit.features || [] }); setOpen(true); setPlanEdit(null); }
  }, [planEdit, setPlanEdit]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      monthly_price: Number(form.monthly_price),
      yearly_price: Number(form.yearly_price),
      duration_days: Number(form.duration_days),
      sort_order: Number(form.sort_order || 0),
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
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-slate-900">{p.name}</span>
                {p.badge && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{p.badge}</span>}
                {!p.is_active && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Disabled</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">₹{p.monthly_price}/mo • ₹{p.yearly_price}/yr • {p.duration_days}d</div>
              <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{(p.features || []).join(" · ")}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(p)} data-testid={`admin-plan-toggle-${p.id}`} className="p-1.5 text-slate-600 hover:text-blue-700">
                {p.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button onClick={() => { setForm({ ...p, features: (p.features || []).join("\n") }); setOpen(true); }}
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Image URL</label>
            <input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="e.g. https://images.unsplash.com/..." data-testid="admin-slide-image"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">Image URL</label>
            <input required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://images.unsplash.com/..." data-testid="admin-group-image" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Cover Banner URL</label>
            <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
              placeholder="https://images.unsplash.com/..." data-testid="admin-group-cover" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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

