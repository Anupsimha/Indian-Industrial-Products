import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Building2, Newspaper, Inbox, Globe,
  ExternalLink, ArrowLeft, Plus, Edit, Trash2, Search, Filter,
  CheckCircle2, Clock, AlertCircle, RefreshCw, Sparkles, Shield,
  MapPin, Mail, Phone, FileText, ChevronRight, Save, Image as ImageIcon,
  Check, Eye, Copy, ArrowUpRight, CheckCheck, X, Wrench, Layers
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ProductDialog } from "../components/ProductDialog";
import { PostDialog } from "../components/CreateDialogs";
import WebsiteSetupModal from "../components/WebsiteSetupModal";
import CustomSectionManager from "../components/CustomSectionManager";
import { getTemplate } from "../website_templates/registry";

export default function CompanyAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Active CMS Section Tab
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'products', 'company', 'posts', 'enquiries', 'domain', or custom section keys

  // Core Data
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [website, setWebsite] = useState(null);
  const [customRequest, setCustomRequest] = useState(null);
  const [sections, setSections] = useState([]);

  // Dialog Controls
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [websiteModalOpen, setWebsiteModalOpen] = useState(false);

  // Search & Filters
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState("all");

  // Company Edit Form State
  const [companyForm, setCompanyForm] = useState({
    name: "",
    category: "",
    description: "",
    mobile: "",
    whatsapp: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst: "",
    pan: "",
    business_type: "",
    year_established: ""
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Fetch all company management data
  const loadCmsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const compId = user.company_id;
      if (!compId) {
        setLoading(false);
        return;
      }

      // Parallel API queries
      const [compRes, prodRes, postRes, enqRes, webRes, custRes, secRes] = await Promise.allSettled([
        api.get(`/companies/${compId}`),
        api.get(`/companies/${compId}/products`),
        api.get(`/companies/${compId}/posts`),
        api.get("/enquiries"),
        api.get("/websites/my-website"),
        api.get("/websites/my-custom-request"),
        api.get("/websites/sections")
      ]);

      if (compRes.status === "fulfilled" && compRes.value.data) {
        const c = compRes.value.data;
        setCompany(c);
        setCompanyForm({
          name: c.name || "",
          category: c.category || "",
          description: c.description || "",
          mobile: c.mobile || "",
          whatsapp: c.whatsapp || "",
          email: c.email || "",
          website: c.website || "",
          address: c.address || "",
          city: c.city || "",
          state: c.state || "",
          pincode: c.pincode || "",
          gst: c.gst || "",
          pan: c.pan || "",
          business_type: c.business_type || "",
          year_established: c.year_established ? String(c.year_established) : ""
        });
      }

      if (prodRes.status === "fulfilled" && prodRes.value.data) {
        setProducts(prodRes.value.data);
      }

      if (postRes.status === "fulfilled" && postRes.value.data) {
        setPosts(postRes.value.data);
      }

      if (enqRes.status === "fulfilled" && enqRes.value.data) {
        setEnquiries(enqRes.value.data);
      }

      if (webRes.status === "fulfilled" && webRes.value.data) {
        setWebsite(webRes.value.data.website);
      }

      if (custRes.status === "fulfilled" && custRes.value.data?.has_request) {
        setCustomRequest(custRes.value.data.request);
      }

      if (secRes.status === "fulfilled" && secRes.value.data) {
        setSections(secRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load CMS data:", err);
      toast.error("Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      loadCmsData();
    }
  }, [user, authLoading]);

  // Handle Company Profile Save
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!company?.id) return;
    setSavingCompany(true);
    try {
      const payload = {
        name: companyForm.name.trim(),
        category: companyForm.category.trim(),
        description: companyForm.description.trim(),
        mobile: companyForm.mobile.trim(),
        whatsapp: companyForm.whatsapp.trim(),
        email: companyForm.email.trim(),
        website: companyForm.website.trim(),
        address: companyForm.address.trim(),
        city: companyForm.city.trim(),
        state: companyForm.state.trim(),
        pincode: companyForm.pincode.trim(),
        gst: companyForm.gst.trim(),
        pan: companyForm.pan.trim(),
        business_type: companyForm.business_type.trim(),
        year_established: companyForm.year_established ? parseInt(companyForm.year_established, 10) : null
      };

      const res = await api.patch(`/companies/${company.id}`, payload);
      setCompany(res.data);
      toast.success("Company profile & CMS details updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update company details");
    } finally {
      setSavingCompany(false);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete product "${product.title}"?`)) {
      return;
    }
    try {
      await api.delete(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product removed from catalog");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete product");
    }
  };

  // Handle Delete Post
  const handleDeletePost = async (post) => {
    if (!window.confirm("Are you sure you want to delete this update?")) {
      return;
    }
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Update deleted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete update");
    }
  };

  // Handle Enquiry Status Update
  const handleUpdateEnquiryStatus = async (enquiryId, newStatus) => {
    try {
      await api.patch(`/enquiries/${enquiryId}/status`, { status: newStatus });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, status: newStatus } : e))
      );
      toast.success(`Inquiry marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update inquiry status");
    }
  };

  // Live URL computation
  const liveUrl = useMemo(() => {
    if (website?.custom_domain) {
      return `https://${website.custom_domain}`;
    }
    if (customRequest?.status === "DEPLOYED" && customRequest.assigned_domain) {
      return `https://${customRequest.assigned_domain}`;
    }
    if (website?.subdomain) {
      return `https://${website.subdomain}.indianindustrialplatform.com`;
    }
    return null;
  }, [website, customRequest]);

  // Product categories list
  const productCategories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !productSearch.trim() ||
        p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat =
        productCategoryFilter === "all" || p.category === productCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, productCategoryFilter]);

  // Filtered enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      if (enquiryStatusFilter === "all") return true;
      return (e.status || "pending").toLowerCase() === enquiryStatusFilter.toLowerCase();
    });
  }, [enquiries, enquiryStatusFilter]);

  // Active Website Template & Extensible Custom Section Modules (OOP Plugin Architecture)
  const templateId = website?.template_id || customRequest?.custom_template_id || "apex_precision";
  const currentTemplate = useMemo(() => getTemplate(templateId), [templateId]);
  const customModules = useMemo(() => currentTemplate?.customModules || [], [currentTemplate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 animate-pulse">
          <LayoutDashboard size={24} />
        </div>
        <p className="text-sm font-semibold text-slate-300">Loading CMS Admin Panel...</p>
      </div>
    );
  }

  if (!user?.company_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-bold">No Registered Company Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Company CMS Admin Panel is reserved for verified manufacturers, suppliers, and business accounts on Indian Industrial Platform.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/profile"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              Return to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased" data-testid="company-admin-cms-page">
      {/* 1. Left CMS Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800/80 shrink-0 flex flex-col md:min-h-screen">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0 overflow-hidden">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">{company?.name || "My Company"}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                <Sparkles size={10} /> CMS Admin Panel
              </span>
            </div>
          </div>
        </div>

        {/* Live Website Status Widget */}
        <div className="p-3 mx-3 my-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Website Status
            </span>
            <span className="text-[10px] font-black uppercase text-emerald-400">Live</span>
          </div>
          {liveUrl ? (
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <span className="text-[11px] font-mono text-cyan-300 truncate max-w-[140px]">
                {liveUrl.replace("https://", "")}
              </span>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Open Website"
              >
                <ArrowUpRight size={13} />
              </a>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">No active website attached</p>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1">
          {[
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "products", label: "Products Catalog", icon: Package, badge: products.length },
            ...customModules.map((mod) => ({
              id: mod.key,
              label: mod.label,
              icon: mod.icon === "Wrench" ? Wrench : Layers,
              badge: sections.filter((s) => s.section_key === mod.key).length,
              isCustom: true
            })),
            { id: "company", label: "Company Details", icon: Building2 },
            { id: "posts", label: "News & Updates", icon: Newspaper, badge: posts.length },
            { id: "enquiries", label: "Inquiries & RFQs", icon: Inbox, badge: enquiries.length },
            { id: "domain", label: "Domain & Hosting", icon: Globe }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
                data-testid={`cms-nav-${item.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? "text-amber-400" : "text-slate-400"} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Link back to IIP Profile */}
        <div className="p-3 border-t border-slate-800/80">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Profile</span>
          </Link>
        </div>
      </aside>

      {/* 2. Main CMS Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Workspace Top Bar */}
        <header className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-white capitalize flex items-center gap-2">
              {activeTab === "overview" && "CMS Dashboard & Overview"}
              {activeTab === "products" && "Product Catalog Management"}
              {customModules.map((m) => activeTab === m.key && m.label)}
              {activeTab === "company" && "Company Profile & CMS Content"}
              {activeTab === "posts" && "Posts & Industrial Updates"}
              {activeTab === "enquiries" && "Customer RFQs & Inquiries"}
              {activeTab === "domain" && "Domain & Infrastructure Settings"}
            </h1>
            <p className="text-[11px] text-slate-400">
              Content and catalog edits reflect instantly on your company website.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                data-testid="cms-topbar-visit-website-btn"
              >
                <span>Live Website</span>
                <ExternalLink size={12} />
              </a>
            )}

            <button
              onClick={() => setWebsiteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              data-testid="cms-topbar-reconfigure-site-btn"
            >
              Website Setup
            </button>
          </div>
        </header>

        {/* Tab Content Panes */}
        <div className="p-6 space-y-6 max-w-6xl">
          {/* TAB 1: OVERVIEW / DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-6" data-testid="cms-section-overview">
              {/* Quick KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Package size={22} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Active Products</span>
                    <h3 className="text-xl font-extrabold text-white">{products.length}</h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Inbox size={22} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Total RFQs & Inquiries</span>
                    <h3 className="text-xl font-extrabold text-white">{enquiries.length}</h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Newspaper size={22} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Published Updates</span>
                    <h3 className="text-xl font-extrabold text-white">{posts.length}</h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Globe size={22} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Custom Domain</span>
                    <h3 className="text-xs font-bold text-white truncate max-w-[130px]">
                      {website?.custom_domain || website?.subdomain || "Configured"}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Quick CMS Actions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perform common modifications to your company website content.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                    data-testid="cms-quick-add-product-btn"
                  >
                    <Plus size={14} /> Add Product
                  </button>
                  <button
                    onClick={() => setPostModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-700 transition-all"
                    data-testid="cms-quick-add-post-btn"
                  >
                    <Newspaper size={14} /> Publish Update
                  </button>
                  <button
                    onClick={() => setActiveTab("company")}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <Edit size={14} /> Edit Profile
                  </button>
                </div>
              </div>

              {/* Two Column Grid: Recent Products & Inquiries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Products */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Products</h3>
                    <button
                      onClick={() => setActiveTab("products")}
                      className="text-xs text-blue-400 hover:underline font-semibold"
                    >
                      View All ({products.length})
                    </button>
                  </div>
                  {products.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No products in catalog yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {products.slice(0, 4).map((p) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                              {p.images?.[0]?.url || p.images?.[0] ? (
                                <img src={p.images[0]?.url || p.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package size={18} className="m-auto text-slate-500 mt-2.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                              <p className="text-[11px] text-slate-400">₹{p.price || 0} / {p.unit || "unit"}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            Live
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Inquiries */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Incoming Buyer RFQs</h3>
                    <button
                      onClick={() => setActiveTab("enquiries")}
                      className="text-xs text-blue-400 hover:underline font-semibold"
                    >
                      View All ({enquiries.length})
                    </button>
                  </div>
                  {enquiries.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No inquiries received yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {enquiries.slice(0, 4).map((e) => (
                        <div key={e.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{e.buyer_name || e.name || "Anonymous Buyer"}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{e.message || e.requirement || "Product inquiry"}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 capitalize">
                            {e.status || "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS CATALOG (FULL CRUD) */}
          {activeTab === "products" && (
            <div className="space-y-4" data-testid="cms-section-products">
              {/* Header Controls */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 capitalize"
                  >
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  data-testid="cms-add-product-btn"
                >
                  <Plus size={14} />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                {filteredProducts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <Package size={36} className="mx-auto text-slate-600" />
                    <p className="text-xs font-semibold">No products found matching criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Price / Unit</th>
                          <th className="py-3 px-4">MOQ</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-850/60 transition-colors">
                            <td className="py-3 px-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700/60">
                                {p.images?.[0]?.url || p.images?.[0] ? (
                                  <img src={p.images[0]?.url || p.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={16} className="m-auto text-slate-500 mt-3" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate max-w-xs">{p.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 capitalize text-slate-400">{p.category || "General"}</td>
                            <td className="py-3 px-4 font-bold text-slate-200">
                              ₹{p.price?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 font-normal">/ {p.unit || "unit"}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{p.moq || 1}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Live
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProductModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                  title="Edit Product"
                                  data-testid={`cms-edit-product-${p.id}`}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                  title="Delete Product"
                                  data-testid={`cms-delete-product-${p.id}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXTENSIBLE CUSTOM WEBSITE MODULES (Engineering Services, Machinery, etc.) */}
          {customModules.map((mod) => (
            activeTab === mod.key && (
              <CustomSectionManager
                key={mod.key}
                moduleConfig={mod}
                sections={sections.filter((s) => s.section_key === mod.key)}
                onRefresh={loadCmsData}
              />
            )
          ))}

          {/* TAB 3: COMPANY DETAILS & CMS CONTENT FORM */}
          {activeTab === "company" && (
            <div className="space-y-6" data-testid="cms-section-company">
              <form onSubmit={handleSaveCompany} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Company Identity & Information</h3>
                    <p className="text-xs text-slate-400">Updates sync in real-time to your public company website.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    data-testid="cms-save-company-btn"
                  >
                    <Save size={14} />
                    <span>{savingCompany ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Company Name</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Industry Category</label>
                    <input
                      type="text"
                      value={companyForm.category}
                      onChange={(e) => setCompanyForm({ ...companyForm, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-300">Company Bio / Description</label>
                    <textarea
                      rows={3}
                      value={companyForm.description}
                      onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Contact Mobile</label>
                    <input
                      type="text"
                      value={companyForm.mobile}
                      onChange={(e) => setCompanyForm({ ...companyForm, mobile: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">WhatsApp Inquiry Number</label>
                    <input
                      type="text"
                      value={companyForm.whatsapp}
                      onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Official Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">GSTIN</label>
                    <input
                      type="text"
                      value={companyForm.gst}
                      onChange={(e) => setCompanyForm({ ...companyForm, gst: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">City</label>
                    <input
                      type="text"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">State</label>
                    <input
                      type="text"
                      value={companyForm.state}
                      onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-300">Factory / Office Address</label>
                    <textarea
                      rows={2}
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Save size={14} />
                    <span>{savingCompany ? "Saving Changes..." : "Save All Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: POSTS & NEWS UPDATES */}
          {activeTab === "posts" && (
            <div className="space-y-4" data-testid="cms-section-posts">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Company Posts & Announcements</h3>
                  <p className="text-xs text-slate-400">Broadcast news, product launches, and machining updates.</p>
                </div>
                <button
                  onClick={() => setPostModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                  data-testid="cms-add-post-btn"
                >
                  <Plus size={14} /> Create Post
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                  <Newspaper size={36} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No updates published yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        {post.media_url && (
                          <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800">
                            {post.media_type === "video" ? (
                              <video src={post.media_url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <p className="text-xs text-slate-200 line-clamp-3">{post.content}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {post.views_count || 0} views
                        </span>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INBOUND BUYER RFQS & INQUIRIES */}
          {activeTab === "enquiries" && (
            <div className="space-y-4" data-testid="cms-section-enquiries">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Inbound RFQs &amp; Inquiries</h3>
                  <p className="text-xs text-slate-400">Direct quote requests and inquiries from your custom website visitors.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter:</span>
                  <select
                    value={enquiryStatusFilter}
                    onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs capitalize"
                  >
                    <option value="all">All Inquiries</option>
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {filteredEnquiries.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                  <Inbox size={36} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No inquiries found matching selected filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEnquiries.map((enq) => (
                    <div key={enq.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white">{enq.buyer_name || enq.name || "Anonymous Buyer"}</h4>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            {enq.mobile && <span className="flex items-center gap-1"><Phone size={11} /> {enq.mobile}</span>}
                            {enq.email && <span className="flex items-center gap-1"><Mail size={11} /> {enq.email}</span>}
                            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                              <Clock size={10} /> {new Date(enq.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={(enq.status || "pending").toLowerCase()}
                            onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value)}
                            className="text-xs py-1 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 capitalize font-semibold"
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        {enq.message || enq.requirement || "Product quote request submitted."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DOMAIN & INFRASTRUCTURE */}
          {activeTab === "domain" && (
            <div className="space-y-5" data-testid="cms-section-domain">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Active Website &amp; DNS Infrastructure</h3>
                      <p className="text-xs text-slate-400">Configured with automated Hostinger DNS &amp; Wildcard SSL.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWebsiteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-sm"
                  >
                    Manage / Upgrade
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live URL</span>
                  <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-xs text-cyan-300">
                    <span>{liveUrl || "No live URL active"}</span>
                    {liveUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(liveUrl);
                            setCopiedDomain(true);
                            toast.success("Domain copied!");
                            setTimeout(() => setCopiedDomain(false), 2000);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Copy Link"
                        >
                          {copiedDomain ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          Visit <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Infrastructure Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Hostinger A-Record IP</span>
                    <span className="font-mono font-bold text-slate-200">200.141.14.101</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">SSL Encryption</span>
                    <span className="font-bold text-emerald-400">Let's Encrypt Wildcard</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Server Web Engine</span>
                    <span className="font-bold text-amber-300">High-Speed Nginx VHost</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Shared Dialogs for CRUD Operations */}
      <ProductDialog
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        initial={editingProduct}
        onSaved={loadCmsData}
      />

      <PostDialog
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        onSaved={loadCmsData}
      />

      {company && (
        <WebsiteSetupModal
          isOpen={websiteModalOpen}
          onClose={() => setWebsiteModalOpen(false)}
          initialCompany={company}
          products={products}
          posts={posts}
          onComplete={() => loadCmsData()}
        />
      )}
    </div>
  );
}
