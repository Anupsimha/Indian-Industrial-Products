import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import {
  Search,
  Wrench,
  Briefcase,
  MapPin,
  Clock,
  Globe,
  CheckCircle,
  Edit3,
  Plus,
  Package,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { ServiceDialog } from "../components/ServiceDialog";
import { EnquiryDialog } from "../components/EnquiryDialog";

const SERVICE_MODES = ["All", "On-site", "Remote", "Both"];

export default function ServicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [serviceMode, setServiceMode] = useState("All");

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [quoteTarget, setQuoteTarget] = useState(null);

  const canAddService =
    user &&
    (user.role === "manufacturer" || user.role === "supplier") &&
    Boolean(user.company_id);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (debouncedQ) params.q = debouncedQ;
      if (activeCat) params.category = activeCat;
      if (serviceMode !== "All") params.service_mode = serviceMode;
      const { data } = await api.get("/services", { params });
      setServices(Array.isArray(data) ? data : []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, activeCat, serviceMode]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenQuote = (svc) => {
    setQuoteTarget(svc);
  };

  return (
    <div
      className="pb-28 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto"
      data-testid="services-page"
    >
      {/* Header + Catalog Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Products &amp; Services</h1>
          <p className="text-xs text-slate-500">
            Browse industrial products &amp; verified service providers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Switcher: Products | Services */}
          <div
            className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 text-xs font-semibold"
            data-testid="catalog-switcher"
          >
            <Link
              to="/products"
              data-testid="switch-to-products"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Package size={13} />
              <span>Products</span>
            </Link>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-900 text-white shadow-sm">
              <Wrench size={13} />
              <span>Services</span>
            </span>
          </div>

          {canAddService && (
            <button
              onClick={() => {
                setEditingService(null);
                setServiceDialogOpen(true);
              }}
              data-testid="add-service-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Add Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Admin Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
        <div className="relative flex-grow">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services, capabilities, areas or providers..."
            data-testid="services-search"
            className="w-full pl-9 pr-3 py-2.5 rounded-full bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <select
          value={activeCat}
          onChange={(e) => setActiveCat(e.target.value)}
          data-testid="services-category-filter"
          className="sm:w-56 px-3.5 py-2.5 rounded-full bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">
            {categoriesLoading ? "Loading categories..." : "All Categories"}
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Service Mode Filter Pills */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {SERVICE_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setServiceMode(mode)}
            data-testid={`service-mode-pill-${mode}`}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              serviceMode === mode
                ? "bg-blue-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {mode === "All" ? "All Modes" : mode}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 size={28} className="animate-spin text-blue-900 mb-2" />
          <span className="text-xs font-semibold">Loading services...</span>
        </div>
      ) : services.length === 0 ? (
        <div
          className="mt-6 text-center py-12 px-4 bg-white border border-slate-100 rounded-2xl shadow-sm"
          data-testid="services-empty"
        >
          <Briefcase className="mx-auto text-slate-300 mb-2" size={36} />
          <p className="text-sm font-semibold text-slate-700">No services found.</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query, category, or service mode filter.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Horizontal Cards List (sm:hidden) */}
          <div className="flex flex-col gap-3 sm:hidden mt-4">
            {services.map((s) => {
              const isOwn = user && user.company_id === s.company_id;
              return (
                <div
                  key={s.id}
                  className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-all relative"
                  data-testid={`service-mobile-${s.id}`}
                >
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingService(s);
                        setServiceDialogOpen(true);
                      }}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors z-10"
                      title="Edit Service"
                      data-testid={`service-mobile-edit-${s.id}`}
                    >
                      <Edit3 size={13} />
                    </button>
                  )}

                  {/* Image / Placeholder */}
                  <div
                    onClick={() => navigate(`/service/${s.id}`)}
                    className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 cursor-pointer flex items-center justify-center border border-slate-100"
                  >
                    {s.image_url ? (
                      <img
                        src={optimizedUrl(s.image_url, { w: 400 })}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Wrench size={28} className="text-blue-800/60" />
                    )}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[8px] font-bold">
                      {s.service_mode}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div
                        onClick={() => navigate(`/service/${s.id}`)}
                        className="font-bold text-xs text-slate-900 line-clamp-1 leading-snug hover:text-blue-900 cursor-pointer pr-7"
                      >
                        {s.name}
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-semibold truncate max-w-full">
                        {s.category}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <Link
                          to={`/company/${s.company_id}`}
                          className="text-[10px] font-semibold text-slate-700 hover:text-blue-900 truncate"
                        >
                          {s.company_name || "Verified Provider"}
                        </Link>
                        <CheckCircle size={10} className="text-blue-600 fill-blue-50 shrink-0" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-500 mt-1">
                        {s.service_area && (
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <Globe size={9} /> {s.service_area}
                          </span>
                        )}
                        {s.turnaround_time && (
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <Clock size={9} /> {s.turnaround_time}
                          </span>
                        )}
                      </div>
                      <div className="font-display font-extrabold text-blue-900 text-xs mt-1">
                        {s.price_range || s.pricing_model || "Custom Quote"}
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => navigate(`/service/${s.id}`)}
                        className="flex-1 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded-lg text-center transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleOpenQuote(s)}
                        data-testid={`service-mobile-quote-${s.id}`}
                        className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-extrabold rounded-lg text-center transition-colors shadow-sm"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Services Grid (hidden sm:grid) */}
          <div className="hidden sm:grid mt-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {services.map((s) => {
              const isOwn = user && user.company_id === s.company_id;
              return (
                <div
                  key={s.id}
                  className="group flex flex-col h-full bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 shadow-sm"
                  data-testid={`service-${s.id}`}
                >
                  {/* Image or Placeholder */}
                  <div
                    onClick={() => navigate(`/service/${s.id}`)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 cursor-pointer flex items-center justify-center"
                  >
                    {s.image_url ? (
                      <img
                        src={optimizedUrl(s.image_url, { w: 500 })}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-blue-800/50">
                        <Wrench size={36} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          Industrial Service
                        </span>
                      </div>
                    )}

                    {/* Service Mode Badge */}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-bold">
                      {s.service_mode}
                    </span>

                    {isOwn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingService(s);
                          setServiceDialogOpen(true);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/95 backdrop-blur-sm text-blue-700 hover:bg-white shadow-sm transition-all hover:scale-105"
                        title="Edit Service"
                        data-testid={`service-edit-${s.id}`}
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold mb-1.5">
                        {s.category}
                      </span>

                      <div
                        onClick={() => navigate(`/service/${s.id}`)}
                        className="font-semibold text-sm text-slate-900 hover:text-blue-900 cursor-pointer line-clamp-2 leading-snug"
                      >
                        {s.name}
                      </div>

                      <Link
                        to={`/company/${s.company_id}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-900 font-semibold mt-1 truncate max-w-full"
                      >
                        <span className="truncate">{s.company_name || "Verified Provider"}</span>
                        <CheckCircle size={11} className="text-blue-600 shrink-0" />
                      </Link>

                      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                        {s.service_area && (
                          <div className="flex items-center gap-1 truncate">
                            <Globe size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{s.service_area}</span>
                          </div>
                        )}
                        {s.turnaround_time && (
                          <div className="flex items-center gap-1 truncate">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">SLA: {s.turnaround_time}</span>
                          </div>
                        )}
                        {s.location && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{s.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing + Request Quote */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {s.pricing_model}
                        </div>
                        <div className="font-display font-extrabold text-blue-900 text-xs truncate">
                          {s.price_range || s.pricing_model || "Custom Quote"}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenQuote(s)}
                        data-testid={`service-quote-${s.id}`}
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold transition-colors shadow-sm"
                      >
                        <MessageSquare size={12} />
                        <span>Request Quote</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Service Dialog */}
      <ServiceDialog
        open={serviceDialogOpen}
        onClose={() => {
          setServiceDialogOpen(false);
          setEditingService(null);
        }}
        initial={editingService}
        onSaved={fetchServices}
      />

      {/* Request Quote Enquiry Dialog */}
      <EnquiryDialog
        open={Boolean(quoteTarget)}
        onClose={() => setQuoteTarget(null)}
        companyId={quoteTarget?.company_id}
        companyName={quoteTarget?.company_name}
        defaultCategory={quoteTarget?.category}
        defaultLeadType="service"
      />
    </div>
  );
}
