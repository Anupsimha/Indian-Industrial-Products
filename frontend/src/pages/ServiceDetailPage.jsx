import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { whatsappLink } from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import {
  Wrench,
  MapPin,
  Clock,
  Globe,
  Award,
  CheckCircle,
  MessageSquare,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  ShieldCheck,
  Sparkles,
  FileBadge,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import { EnquiryDialog } from "../components/EnquiryDialog";
import { ServiceDialog } from "../components/ServiceDialog";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const allImages = useMemo(() => {
    if (!service) return [];
    return [service.image_url, ...(service.images || [])]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [service]);

  const fetchServiceDetails = useCallback(async () => {
    try {
      const { data } = await api.get(`/services/${id}`);
      setService(data);
      setActiveImgIdx(0);

      if (data?.category) {
        try {
          const res = await api.get("/services", {
            params: { category: data.category, limit: 8 },
          });
          if (Array.isArray(res.data)) {
            setRelated(res.data.filter((s) => s.id !== data.id).slice(0, 4));
          }
        } catch {
          // ignore secondary recommendations failure
        }
      }
    } catch (err) {
      console.error("Error fetching service detail:", err);
      toast.error("Failed to load service details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchServiceDetails();
  }, [fetchServiceDetails]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] py-10"
        data-testid="service-detail-loading"
      >
        <Loader2 className="animate-spin text-blue-900 mb-2" size={32} />
        <span className="text-slate-500 font-semibold text-sm">
          Loading service details...
        </span>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-20 px-4" data-testid="service-detail-error">
        <Wrench className="mx-auto text-slate-300 mb-3" size={48} />
        <h2 className="font-display font-bold text-lg text-slate-800">
          Service Not Found
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          The service you are looking for might have been removed or does not exist.
        </p>
        <button
          onClick={() => navigate("/services")}
          className="mt-4 px-5 py-2 bg-blue-900 text-white rounded-full font-bold text-xs hover:bg-blue-950 transition-colors"
        >
          Browse Services
        </button>
      </div>
    );
  }

  const isOwnService =
    user && (user.company_id === service.company_id || user.role === "admin");

  return (
    <div
      className="pb-24 px-4 pt-4 bg-slate-50 min-h-screen"
      data-testid="service-detail-page"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm max-w-7xl mx-auto">
        <BackButton fallback="/services" />
        <span className="font-display font-extrabold text-slate-900 text-sm">
          Service Details
        </span>
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          {isOwnService && (
            <button
              onClick={() => setEditOpen(true)}
              data-testid="service-detail-top-edit-btn"
              className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs inline-flex items-center gap-1 transition-colors active:scale-95"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start max-w-7xl mx-auto">
        {/* Left Column: Gallery / Image */}
        <div className="lg:col-span-6 space-y-3">
          <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 border border-slate-200 shadow-md flex items-center justify-center">
            {allImages.length > 0 ? (
              <img
                src={optimizedUrl(allImages[activeImgIdx] || allImages[0], { w: 900 })}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-blue-800/50">
                <Wrench size={56} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Industrial Service
                </span>
              </div>
            )}

            {/* Service Mode Badge */}
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
              {service.service_mode || "On-site"}
            </span>

            {allImages.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImgIdx((prev) =>
                      prev > 0 ? prev - 1 : allImages.length - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md transition-all shadow-lg active:scale-95"
                  data-testid="service-image-prev"
                  title="Previous Image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() =>
                    setActiveImgIdx((prev) =>
                      prev < allImages.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md transition-all shadow-lg active:scale-95"
                  data-testid="service-image-next"
                  title="Next Image"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/70 text-white text-[10px] font-bold backdrop-blur-md">
                  {activeImgIdx + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  data-testid={`service-thumb-${idx}`}
                  className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden transition-all shadow-sm ${
                    activeImgIdx === idx
                      ? "border-2 border-blue-900 ring-2 ring-blue-300 scale-95"
                      : "border border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
                  }`}
                >
                  <img
                    src={optimizedUrl(img, { w: 200 })}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Service Specs & Request Quote */}
        <div className="lg:col-span-6 mt-4 lg:mt-0 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-[10px] font-extrabold uppercase tracking-wide">
                <CheckCircle size={11} className="text-blue-700" /> Verified Service
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                {service.category}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold">
                {service.service_mode}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 leading-snug">
              {service.name}
            </h1>

            {/* Pricing Banner */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {service.pricing_model || "Custom Quote"}
                </span>
                <div className="font-display font-black text-blue-900 text-xl sm:text-2xl mt-0.5">
                  {service.price_range || service.pricing_model || "Custom Quote"}
                </div>
              </div>
              {service.turnaround_time && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Turnaround / SLA
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 mt-0.5">
                    <Clock size={12} className="text-orange-500" />
                    {service.turnaround_time}
                  </span>
                </div>
              )}
            </div>

            {/* Service Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Briefcase size={11} /> Service Mode
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {service.service_mode || "On-site"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Globe size={11} /> Coverage Area
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {service.service_area || "Pan India"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <ShieldCheck size={11} /> Experience
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {service.experience_years !== null &&
                  service.experience_years !== undefined
                    ? `${service.experience_years}+ Years`
                    : "Experienced Team"}
                </div>
              </div>
            </div>

            {service.location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span>Base Location: {service.location}</span>
              </div>
            )}

            {/* Certifications */}
            {Array.isArray(service.certifications) &&
              service.certifications.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Award size={12} /> Certifications &amp; Standards
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {service.certifications.map((cert, idx) => (
                      <span
                        key={`${cert}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold"
                      >
                        <FileBadge size={11} /> {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Actions (Enquiry-only, no Cart) */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
              {isOwnService ? (
                <button
                  onClick={() => setEditOpen(true)}
                  data-testid="service-detail-edit-action-btn"
                  className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 size={16} /> Edit Service Details
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setEnquiryOpen(true)}
                    data-testid="service-request-quote-btn"
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm bg-orange-600 hover:bg-orange-700 text-white active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} /> Request Quote
                  </button>
                  <a
                    href={whatsappLink(
                      service.company_whatsapp,
                      `Hi, I would like a quote for your service: "${service.name}" listed on IIP.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="service-whatsapp-btn"
                    className="py-3.5 px-5 rounded-2xl font-bold text-sm bg-[#25D366] hover:bg-[#128C7E] text-white transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Provider Company Profile Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-display font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-3">
              Service Provider
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                {service.company_logo_url ? (
                  <img
                    src={optimizedUrl(service.company_logo_url, { w: 200 })}
                    alt={service.company_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Briefcase size={20} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/company/${service.company_id}`}
                  data-testid="service-company-link"
                  className="font-bold text-sm text-slate-900 hover:text-blue-900 truncate block"
                >
                  {service.company_name || "Service Provider"}
                </Link>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {service.company_location || service.location || "India"}
                  </span>
                </div>
              </div>
              <Link
                to={`/company/${service.company_id}`}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 transition-colors shrink-0"
              >
                View Company
              </Link>
            </div>
          </div>

          {/* Service Description */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2.5">
            <h3 className="font-display font-extrabold text-xs text-slate-400 uppercase tracking-wider">
              Service Overview &amp; Scope
            </h3>
            {service.description ? (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {service.description}
              </p>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Contact the service provider using Request Quote to discuss technical requirements,
                project timelines, and custom pricing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related Services */}
      {related.length > 0 && (
        <div className="mt-8 max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Sparkles size={18} className="text-orange-500 fill-orange-500" />
            <h2 className="font-display font-black text-base text-slate-900 uppercase tracking-wide">
              Related Services
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {related.map((rec) => (
              <Link
                key={rec.id}
                to={`/service/${rec.id}`}
                className="group flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 shadow-sm"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  {rec.image_url ? (
                    <img
                      src={optimizedUrl(rec.image_url, { w: 400 })}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Wrench size={28} className="text-blue-800/50" />
                  )}
                </div>
                <div className="p-3 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">
                      {rec.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold truncate mt-1">
                      {rec.company_name}
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-50 flex items-center justify-between text-[11px]">
                    <span className="font-display font-extrabold text-blue-900 truncate">
                      {rec.price_range || rec.pricing_model}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {rec.service_mode}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Enquiry Dialog (Service Quote) */}
      <EnquiryDialog
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        companyId={service.company_id}
        companyName={service.company_name}
        defaultCategory={service.category}
        defaultLeadType="service"
      />

      {/* Owner Edit Dialog */}
      {isOwnService && editOpen && (
        <ServiceDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={service}
          onSaved={fetchServiceDetails}
        />
      )}
    </div>
  );
}
