import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  IndianRupee,
  Layers,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import { SellerWalletTab } from "../components/SellerWalletTab";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const resolveMediaUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return `${BACKEND_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
};

const isPdfUrl = (url) => String(url || "").toLowerCase().split("?")[0].endsWith(".pdf");

const formatINR = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

const DISPUTE_REASON_LABELS = {
  deal_not_done: "Deal Not Done",
  price_too_high: "Price Too High",
  fake_lead: "Fake Lead",
  wrong_phone: "Wrong Phone",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "unlocked", label: "Purchased (Upload Bill)" },
  { key: "invoice_uploaded", label: "Bill Uploaded" },
  { key: "approved", label: "Approved" },
  { key: "relisted", label: "Re-listed" },
  { key: "disputed", label: "Disputed / Refunded" },
];

const LEAD_TYPE_FILTERS = [
  { key: "all", label: "All Types", icon: Layers },
  { key: "product", label: "Product", icon: Package },
  { key: "service", label: "Service", icon: Wrench },
  { key: "real_estate", label: "Real Estate", icon: Building2 },
];

const LEAD_TYPE_META = {
  product: { label: "Product", icon: Package, badgeCls: "bg-blue-50 text-blue-700 border-blue-200" },
  service: { label: "Service", icon: Wrench, badgeCls: "bg-teal-50 text-teal-700 border-teal-200" },
  real_estate: { label: "Real Estate", icon: Building2, badgeCls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const getLeadTitle = (lead) => {
  if (lead?.product_name) return lead.product_name;
  const meta = lead?.lead_metadata && typeof lead.lead_metadata === "object" ? lead.lead_metadata : {};
  if ((lead?.lead_type || "product") === "service" && meta.service_name) {
    return meta.service_name;
  }
  if ((lead?.lead_type || "product") === "real_estate") {
    const title = [meta.transaction_type, meta.property_type].filter(Boolean).join(" - ");
    if (title) return title;
  }
  return "Industrial Lead";
};

const getLeadMetadataChips = (lead) => {
  const leadType = lead?.lead_type || "product";
  const meta = lead?.lead_metadata && typeof lead.lead_metadata === "object" ? lead.lead_metadata : {};
  const chips = [];

  if (leadType === "service") {
    if (meta.service_mode) {
      chips.push({ label: "Mode", value: meta.service_mode, cls: "bg-teal-50 text-teal-800 border-teal-200" });
    }
    const durationVal = meta.project_duration || (!meta.project_duration && lead?.quantity ? lead.quantity : "");
    if (durationVal) {
      chips.push({ label: "Duration", value: durationVal, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.frequency) {
      chips.push({ label: "Frequency", value: meta.frequency, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.scope_details) {
      chips.push({ label: "Scope", value: meta.scope_details, cls: "bg-emerald-50 text-emerald-800 border-emerald-200" });
    }
  } else if (leadType === "real_estate") {
    if (meta.transaction_type) {
      chips.push({ label: "Deal", value: meta.transaction_type, cls: "bg-amber-50 text-amber-800 border-amber-200" });
    }
    if (meta.property_type) {
      chips.push({ label: "Property", value: meta.property_type, cls: "bg-purple-50 text-purple-800 border-purple-200" });
    }
    if (meta.area_size) {
      chips.push({
        label: "Area",
        value: [meta.area_size, meta.area_unit].filter(Boolean).join(" "),
        cls: "bg-slate-100 text-slate-800 border-slate-200",
      });
    } else if (meta.area_sqft) {
      chips.push({
        label: "Area",
        value: `${Number(meta.area_sqft).toLocaleString("en-IN")} sq.ft`,
        cls: "bg-slate-100 text-slate-800 border-slate-200",
      });
    } else if (lead?.quantity) {
      chips.push({ label: "Area", value: lead.quantity, cls: "bg-slate-100 text-slate-800 border-slate-200" });
    }
    if (meta.possession_timeline) {
      chips.push({ label: "Possession", value: meta.possession_timeline, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
    if (meta.power_load_kva) {
      chips.push({ label: "Power", value: `${meta.power_load_kva} kVA`, cls: "bg-slate-100 text-slate-700 border-slate-200" });
    }
  }

  return chips;
};

const getLeadStatusMeta = (lead) => {
  const dealStatus = lead?.deal?.status;
  const disputeCode = lead?.deal?.dispute_reason_code;
  const disputeLabel = disputeCode ? DISPUTE_REASON_LABELS[disputeCode] || disputeCode : null;

  if (dealStatus === "UNLOCKED") {
    return {
      label: "Purchased • Upload Bill",
      badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
      filterKey: "unlocked",
    };
  }
  if (dealStatus === "INVOICE_UPLOADED" || dealStatus === "BILL_UPLOADED") {
    return {
      label: "Bill Uploaded • Awaiting Approval",
      badgeCls: "bg-blue-50 text-blue-800 border-blue-200",
      filterKey: "invoice_uploaded",
    };
  }
  if (dealStatus === "APPROVED") {
    return {
      label: "Approved • Credited",
      badgeCls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      filterKey: "approved",
    };
  }
  if (dealStatus === "RELISTED") {
    return {
      label: disputeLabel
        ? `Re-listed for New Buyers (${disputeLabel})`
        : "Re-listed for New Buyers (Deal Not Done / Price Too High)",
      badgeCls: "bg-sky-50 text-sky-800 border-sky-200",
      filterKey: "relisted",
    };
  }
  if (dealStatus === "FAKE_REPORTED") {
    return {
      label: disputeLabel ? `Disputed • ${disputeLabel}` : "Disputed • Under Review",
      badgeCls: "bg-rose-50 text-rose-800 border-rose-200",
      filterKey: "disputed",
    };
  }
  if (dealStatus === "REFUNDED" || dealStatus === "FAKE_REFUNDED") {
    return {
      label: "Disputed — Fake / Refunded",
      badgeCls: "bg-slate-100 text-slate-700 border-slate-300",
      filterKey: "disputed",
    };
  }
  if (lead?.is_sold_out) {
    return {
      label: "Sold Out",
      badgeCls: "bg-slate-100 text-slate-700 border-slate-200",
      filterKey: "sold",
    };
  }
  return {
    label: "Available",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    filterKey: "available",
  };
};

export default function SalesPartnerPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "wallet" ? "wallet" : "leads";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [summary, setSummary] = useState({
    total_leads: 0,
    sold_leads: 0,
    approved_deals: 0,
    pending_commission: 0,
    earned_commission: 0,
  });
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");

  // Inline Bill Upload state
  const [activeUploadDealId, setActiveUploadDealId] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [billNotes, setBillNotes] = useState("");
  const [uploadingDealId, setUploadingDealId] = useState(null);

  // Image Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const canAccess = user && (user.role === "sales_partner" || user.role === "admin");

  const loadMyLeads = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/sales-partner/my-leads");
      setSummary(
        data?.summary || {
          total_leads: 0,
          sold_leads: 0,
          approved_deals: 0,
          pending_commission: 0,
          earned_commission: 0,
        }
      );
      setLeads(Array.isArray(data?.leads) ? data.leads : []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to load Sales Partner leads");
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (!authLoading && canAccess) {
      loadMyLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, canAccess, loadMyLeads]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === "wallet") {
      setSearchParams({ tab: "wallet" });
    } else {
      setSearchParams({});
    }
  };

  const openBillUpload = (deal) => {
    setActiveUploadDealId(deal.id);
    setBillFile(null);
    setBillNotes(deal.bill_notes || "");
  };

  const closeBillUpload = () => {
    setActiveUploadDealId(null);
    setBillFile(null);
    setBillNotes("");
  };

  const handleUploadBill = async (e, dealId) => {
    e.preventDefault();
    if (!billFile) {
      toast.error("Please select an invoice / bill image or PDF file.");
      return;
    }

    setUploadingDealId(dealId);
    try {
      const fd = new FormData();
      fd.append("bill", billFile);
      if (billNotes.trim()) {
        fd.append("notes", billNotes.trim());
      }

      const { data } = await api.post(`/sales-partner/deals/${dealId}/upload-bill`, fd);
      if (data?.deal) {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.deal?.id === dealId ? { ...lead, deal: { ...lead.deal, ...data.deal } } : lead
          )
        );
      }
      toast.success("Transaction bill uploaded! Buyer has been notified for approval.");
      closeBillUpload();
      loadMyLeads();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to upload transaction bill");
    } finally {
      setUploadingDealId(null);
    }
  };

  const leadTypeCounts = useMemo(() => {
    const counts = { all: leads.length, product: 0, service: 0, real_estate: 0 };
    leads.forEach((lead) => {
      const lt = lead?.lead_type || "product";
      if (counts[lt] !== undefined) counts[lt] += 1;
    });
    return counts;
  }, [leads]);

  const filterCounts = useMemo(() => {
    const counts = {
      all: 0,
      available: 0,
      unlocked: 0,
      invoice_uploaded: 0,
      approved: 0,
      relisted: 0,
      disputed: 0,
    };
    leads.forEach((lead) => {
      const lt = lead?.lead_type || "product";
      if (leadTypeFilter !== "all" && lt !== leadTypeFilter) return;
      counts.all += 1;
      const meta = getLeadStatusMeta(lead);
      if (counts[meta.filterKey] !== undefined) {
        counts[meta.filterKey] += 1;
      }
    });
    return counts;
  }, [leads, leadTypeFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const lt = lead?.lead_type || "product";
      if (leadTypeFilter !== "all" && lt !== leadTypeFilter) return false;
      if (statusFilter !== "all" && getLeadStatusMeta(lead).filterKey !== statusFilter) return false;
      return true;
    });
  }, [leads, statusFilter, leadTypeFilter]);

  if (authLoading) {
    return (
      <div className="p-10 text-center text-slate-400 font-semibold" data-testid="sales-partner-loading">
        Loading Sales Partner Hub...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess) {
    return (
      <div className="pb-28 px-4 pt-6 max-w-2xl mx-auto" data-testid="sales-partner-access-denied">
        <BackButton className="mb-3" />
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-slate-900">Sales Partner Access Only</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              This hub is exclusively available for <strong>Sales Partner</strong> accounts to post verified deals,
              upload transaction bills, and track 50% escrow payouts.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/profile"
              className="px-5 py-2.5 rounded-full bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4 max-w-5xl mx-auto" data-testid="sales-partner-page">
      <BackButton className="mb-2" />

      {/* Header & KPI Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F294A] to-[#0A1D36] text-white shadow-xl p-5 sm:p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid place-items-center w-11 h-11 rounded-xl bg-white/10 text-emerald-400 shrink-0 border border-white/10">
              <Briefcase size={22} />
            </span>
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-emerald-300">
                Sales Partner Hub
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-black mt-0.5">
                Partner Leads &amp; Escrow Earnings
              </h1>
              <p className="text-white/75 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                Post verified industrial leads, coordinate with unlocking buyers, upload the transaction bill, and earn
                50% of the lead unlock value directly in your wallet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadMyLeads}
              disabled={loading}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors disabled:opacity-50"
              title="Refresh Leads & Earnings"
              data-testid="sp-refresh-btn"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              to="/post-enquiry"
              data-testid="sp-post-new-lead-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
            >
              <Plus size={15} />
              <span>+ Post New Lead</span>
            </Link>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="sp-summary-kpis">
          <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Leads</div>
            <div className="font-display text-2xl font-black text-white mt-1" data-testid="sp-kpi-total-leads">
              {summary.total_leads ?? 0}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">Posted on marketplace</div>
          </div>

          <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Sold Leads</div>
            <div className="font-display text-2xl font-black text-amber-300 mt-1" data-testid="sp-kpi-sold-leads">
              {summary.sold_leads ?? 0}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              {summary.approved_deals ?? 0} approved deal{(summary.approved_deals ?? 0) === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pending 50% Escrow</div>
            <div className="font-display text-2xl font-black text-orange-300 mt-1" data-testid="sp-kpi-pending">
              {formatINR(summary.pending_commission)}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">Awaiting bill &amp; approval</div>
          </div>

          <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Earned in Wallet</div>
            <div className="font-display text-2xl font-black text-emerald-300 mt-1" data-testid="sp-kpi-earned">
              {formatINR(summary.earned_commission)}
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-0.5">Credited &amp; redeemable</div>
          </div>
        </div>
      </div>

      {/* Main Hub Tabs */}
      <div className="mt-5 flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabSwitch("leads")}
          data-testid="sp-tab-leads"
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "leads"
              ? "border-blue-900 text-blue-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={16} />
          <span>My Posted Leads &amp; Deals</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {leads.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("wallet")}
          data-testid="sp-tab-wallet"
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "wallet"
              ? "border-blue-900 text-blue-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Wallet size={16} />
          <span>Wallet &amp; Redeem</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "wallet" ? (
        <div className="mt-5">
          <SellerWalletTab />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Lead Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" data-testid="sp-lead-type-filters">
            {LEAD_TYPE_FILTERS.map((lt) => {
              const Icon = lt.icon;
              const active = leadTypeFilter === lt.key;
              return (
                <button
                  key={lt.key}
                  type="button"
                  onClick={() => setLeadTypeFilter(lt.key)}
                  data-testid={`sp-lead-type-${lt.key}`}
                  aria-pressed={active}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    active
                      ? lt.key === "service"
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : lt.key === "real_estate"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Icon size={12} />
                  <span>{lt.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {leadTypeCounts[lt.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" data-testid="sp-status-filters">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  data-testid={`sp-filter-${f.key}`}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-900"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {filterCounts[f.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-800" />
              <p className="text-sm font-medium">Loading your posted leads &amp; deals...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3" data-testid="sp-empty-leads">
              <Package size={36} className="mx-auto text-slate-300" />
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {leads.length === 0 ? "No Partner Leads Posted Yet" : "No Leads Match This Filter"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {leads.length === 0
                    ? "Start posting verified industrial leads with a total deal value to earn 50% commission when buyers unlock and approve the transaction bill."
                    : "Try selecting another lead type or status filter above to view your other leads and deals."}
                </p>
              </div>
              {leads.length === 0 && (
                <Link
                  to="/post-enquiry"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-colors"
                >
                  <Plus size={14} /> Post Your First Lead
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => {
                const statusMeta = getLeadStatusMeta(lead);
                const deal = lead.deal;
                const partnerShare =
                  deal?.partner_share_amount ?? Number(lead.lead_value || 0) * 0.5;
                const isBillUploaded =
                  deal?.status === "INVOICE_UPLOADED" || deal?.status === "BILL_UPLOADED";
                const isRefunded =
                  deal?.status === "REFUNDED" || deal?.status === "FAKE_REFUNDED";
                const canUploadBill =
                  deal && (deal.status === "UNLOCKED" || isBillUploaded);
                const isUploadFormOpen = deal && activeUploadDealId === deal.id;
                const billUrl = deal?.bill_image_url ? resolveMediaUrl(deal.bill_image_url) : "";
                const locationText =
                  lead.location ||
                  [lead.industrial_area, lead.city, lead.state].filter(Boolean).join(", ");
                const leadType = lead.lead_type || "product";
                const typeBadge = LEAD_TYPE_META[leadType] || LEAD_TYPE_META.product;
                const TypeBadgeIcon = typeBadge.icon;
                const metaChips = getLeadMetadataChips(lead);
                const cardTitle = getLeadTitle(lead);

                return (
                  <div
                    key={lead.id}
                    data-testid={`sp-lead-card-${lead.id}`}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
                  >
                    {/* Card Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 border-b border-slate-100 pb-3.5">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${typeBadge.badgeCls}`}
                            data-testid={`sp-lead-type-badge-${lead.id}`}
                          >
                            <TypeBadgeIcon size={10} />
                            {typeBadge.label}
                          </span>
                          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                            {cardTitle}
                          </h3>
                          {lead.category && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                              {lead.category}
                            </span>
                          )}
                        </div>
                        {metaChips.length > 0 && (
                          <div className="flex flex-wrap gap-1.5" data-testid={`sp-meta-chips-${lead.id}`}>
                            {metaChips.map((chip, idx) => (
                              <span
                                key={`${chip.label}-${idx}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${chip.cls}`}
                              >
                                <span className="opacity-70 text-[10px] uppercase tracking-wider">{chip.label}:</span>
                                <span className="font-bold">{chip.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {locationText && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              {locationText}
                            </span>
                          )}
                          {lead.quantity && leadType === "product" && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <Package size={12} className="text-slate-400 shrink-0" />
                              Qty: {lead.quantity}
                            </span>
                          )}
                          {lead.required_by && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} className="text-slate-400 shrink-0" />
                              By: {lead.required_by}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.badgeCls}`}
                          data-testid={`sp-lead-status-${lead.id}`}
                        >
                          {deal?.status === "APPROVED" ? (
                            <BadgeCheck size={13} />
                          ) : deal?.status === "RELISTED" ? (
                            <RefreshCw size={13} />
                          ) : deal?.status === "FAKE_REPORTED" || deal?.status === "REFUNDED" || deal?.status === "FAKE_REFUNDED" ? (
                            <AlertTriangle size={13} />
                          ) : (
                            <Clock size={13} />
                          )}
                          {statusMeta.label}
                        </span>
                        {lead.created_at && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Posted {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lead Contact & Requirement */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-semibold text-slate-800">
                          <User size={13} className="text-blue-700" />
                          Lead Contact: {lead.name}
                        </span>
                        {lead.mobile && (
                          <a
                            href={`tel:${lead.mobile}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Phone size={13} />
                            {lead.mobile}
                          </a>
                        )}
                      </div>
                      {lead.requirement && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                          {lead.requirement}
                        </p>
                      )}
                      {Array.isArray(lead.media_urls) && lead.media_urls.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {lead.media_urls.map((u, idx) => {
                            const fullUrl = resolveMediaUrl(u);
                            return isPdfUrl(u) ? (
                              <a
                                key={idx}
                                href={fullUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                <FileText size={13} className="text-rose-500" />
                                Attachment PDF {idx + 1}
                              </a>
                            ) : (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setLightboxUrl(fullUrl)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                              >
                                <img src={fullUrl} alt={`Lead attachment ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Total Deal Value
                        </div>
                        <div className="font-display font-extrabold text-slate-900 text-base mt-0.5 flex items-center gap-1">
                          <IndianRupee size={14} className="text-slate-500" />
                          <span>{Number(lead.total_deal_value || 0).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-50/60 border border-blue-200/70 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                          Lead Price (2%)
                        </div>
                        <div className="font-display font-extrabold text-blue-900 text-base mt-0.5">
                          {formatINR(lead.lead_value)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Partner 50% Commission
                        </div>
                        <div className="font-display font-extrabold text-emerald-800 text-base mt-0.5">
                          {formatINR(partnerShare)}
                        </div>
                      </div>
                    </div>

                    {/* Deal / Buyer Coordination Box */}
                    {deal && (
                      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                            <ShieldCheck size={15} className="text-indigo-600" />
                            Unlocking Buyer Details
                          </div>
                          {deal.created_at && (
                            <span className="text-[11px] text-indigo-700/80 font-medium">
                              Unlocked {new Date(deal.created_at).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                            <User size={13} className="text-indigo-600" />
                            <span>{deal.buyer_name || "Buyer"}</span>
                          </div>
                          {deal.buyer_mobile && (
                            <a
                              href={`tel:${deal.buyer_mobile}`}
                              className="inline-flex items-center gap-1.5 font-bold text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-blue-50 transition-colors"
                              data-testid={`sp-buyer-mobile-${deal.id}`}
                            >
                              <Phone size={13} />
                              <span>{deal.buyer_mobile}</span>
                            </a>
                          )}
                          {deal.buyer_email && (
                            <span className="text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                              {deal.buyer_email}
                            </span>
                          )}
                        </div>

                        {/* Uploaded Bill Preview */}
                        {billUrl && (
                          <div
                            className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            data-testid={`sp-bill-preview-${deal.id}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {isPdfUrl(billUrl) ? (
                                <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                                  <FileText size={22} />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(billUrl)}
                                  className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 shrink-0 transition-colors"
                                  title="Click to enlarge bill"
                                >
                                  <img src={billUrl} alt="Uploaded transaction bill" className="w-full h-full object-cover" />
                                </button>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                  <span>Uploaded Transaction Bill</span>
                                </div>
                                {deal.bill_notes && (
                                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{deal.bill_notes}</p>
                                )}
                                {deal.bill_uploaded_at && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Uploaded {new Date(deal.bill_uploaded_at).toLocaleString("en-IN")}
                                  </div>
                                )}
                              </div>
                            </div>

                            <a
                              href={billUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold shrink-0 transition-colors"
                            >
                              <span>Open Bill</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {/* Lead Dispute / Relisted / Refunded Box */}
                        {(deal.fake_report_reason ||
                          deal.dispute_reason_code ||
                          deal.status === "FAKE_REPORTED" ||
                          deal.status === "RELISTED" ||
                          isRefunded) && (
                          <div
                            className={`rounded-xl border p-3 space-y-1.5 ${
                              deal.status === "RELISTED"
                                ? "border-sky-200 bg-sky-50"
                                : "border-rose-200 bg-rose-50"
                            }`}
                            data-testid={`sp-dispute-box-${deal.id}`}
                          >
                            <div
                              className={`flex items-center justify-between gap-2 flex-wrap text-xs font-extrabold ${
                                deal.status === "RELISTED" ? "text-sky-900" : "text-rose-800"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {deal.status === "RELISTED" ? (
                                  <RefreshCw size={14} className="shrink-0 text-sky-700" />
                                ) : (
                                  <AlertTriangle size={14} className="shrink-0" />
                                )}
                                <span>
                                  {deal.status === "RELISTED"
                                    ? "Re-listed for New Buyers (Deal Not Done / Price Too High)"
                                    : isRefunded
                                    ? "Disputed — Fake / Refunded"
                                    : "Buyer Reported Lead Dispute"}
                                </span>
                              </span>
                              {deal.dispute_reason_code && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full bg-white border text-[11px] font-bold ${
                                    deal.status === "RELISTED"
                                      ? "border-sky-200 text-sky-800"
                                      : "border-rose-200 text-rose-800"
                                  }`}
                                  data-testid={`sp-dispute-reason-${deal.id}`}
                                >
                                  {DISPUTE_REASON_LABELS[deal.dispute_reason_code] || deal.dispute_reason_code}
                                </span>
                              )}
                            </div>
                            {deal.status === "RELISTED" && deal.relisted_at && (
                              <p className="text-[11px] text-sky-800 font-medium">
                                Re-listed on {new Date(deal.relisted_at).toLocaleString("en-IN")} • Lead is open again for new buyers.
                              </p>
                            )}
                            {deal.fake_report_reason && (
                              <p
                                className={`text-xs leading-relaxed ${
                                  deal.status === "RELISTED" ? "text-sky-900" : "text-rose-700"
                                }`}
                              >
                                <strong>Buyer Notes:</strong> {deal.fake_report_reason}
                              </p>
                            )}
                            {deal.admin_decision_notes && (
                              <p
                                className={`text-xs leading-relaxed ${
                                  deal.status === "RELISTED" ? "text-sky-900" : "text-rose-800/90"
                                }`}
                              >
                                <strong>Admin Notes:</strong> {deal.admin_decision_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Bill Upload CTA / Form */}
                        {canUploadBill && (
                          <div className="pt-1">
                            {!isUploadFormOpen ? (
                              <button
                                type="button"
                                onClick={() => openBillUpload(deal)}
                                data-testid={`sp-upload-bill-btn-${deal.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-xs transition-colors"
                              >
                                <Upload size={14} />
                                <span>
                                  {isBillUploaded
                                    ? "Re-upload Bill"
                                    : "Upload Transaction Bill"}
                                </span>
                              </button>
                            ) : (
                              <form
                                onSubmit={(e) => handleUploadBill(e, deal.id)}
                                className="bg-white border border-blue-200 rounded-xl p-4 space-y-3 shadow-xs"
                                data-testid={`sp-upload-bill-form-${deal.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                                    {isBillUploaded
                                      ? "Re-upload Transaction Bill / Invoice"
                                      : "Upload Transaction Bill / Invoice"}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={closeBillUpload}
                                    className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Bill / Invoice File (JPG, PNG, WEBP, GIF, PDF) *
                                  </label>
                                  <input
                                    type="file"
                                    required
                                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                    onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                                    data-testid={`sp-bill-file-input-${deal.id}`}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-800 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                                  />
                                  {billFile && (
                                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                      Selected: {billFile.name} ({(billFile.size / 1024).toFixed(0)} KB)
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Invoice / Transaction Notes (Optional)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={billNotes}
                                    onChange={(e) => setBillNotes(e.target.value)}
                                    data-testid={`sp-bill-notes-input-${deal.id}`}
                                    placeholder="e.g. Invoice #INV-2045, GST bill attached for full order value"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="submit"
                                    disabled={uploadingDealId === deal.id || !billFile}
                                    data-testid={`sp-bill-submit-btn-${deal.id}`}
                                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                                  >
                                    <Upload size={13} />
                                    <span>
                                      {uploadingDealId === deal.id ? "Uploading..." : "Submit Bill"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={closeBillUpload}
                                    disabled={uploadingDealId === deal.id}
                                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            alt="Bill preview"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
