import React, { useState, useEffect } from "react";
import {
  X, Globe, Check, AlertCircle, Loader2, Sparkles, ExternalLink,
  Layers, CheckCircle2, ArrowRight, Eye, ShieldCheck, Building2,
  Clock, Send, LayoutDashboard, Shield, Wrench
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import TemplatePreviewModal from "../website_templates/components/TemplatePreviewModal";

const PROVISIONING_STEPS = [
  { step: 1, title: "Reserving Subdomain", desc: "Validating uniqueness & securing namespace" },
  { step: 2, title: "Provisioning Hostinger DNS", desc: "Binding A-record to server IP 200.141.14.101" },
  { step: 3, title: "Securing SSL & Routing", desc: "Attaching wildcard SSL & Nginx virtual host" },
  { step: 4, title: "Syncing Catalog & Media", desc: "Binding live company products & industrial updates" },
  { step: 5, title: "Publishing Live", desc: "Broadcasting to search index & activating website" },
];

export default function WebsiteSetupModal({
  isOpen,
  onClose,
  onComplete,
  initialCompany = {},
  products = [],
  posts = [],
  reels = []
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Subdomain, 2: Template, 3: Deploying, 4: Done
  const [companyProducts, setCompanyProducts] = useState(products);

  useEffect(() => {
    if (products && products.length > 0) {
      setCompanyProducts(products);
    } else if (initialCompany?.id) {
      api.get(`/companies/${initialCompany.id}/products`)
        .then((r) => setCompanyProducts(r.data || []))
        .catch(() => {});
    }
  }, [initialCompany?.id, products]);

  // Step 1: Subdomain
  const [subdomain, setSubdomain] = useState("");
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState(null); // { available: bool, reason: string, full_domain: string }

  // Step 2: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("industrial_modern");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);

  // Entitlement checking
  const [entitlement, setEntitlement] = useState({ loading: true, can_create: true, message: null, website: null });

  // Mode tabs: 'subdomain' (standard template flow) vs 'custom_domain' (bespoke site)
  const [activeTab, setActiveTab] = useState("subdomain");
  const [customConfig, setCustomConfig] = useState({
    benefits_list: [
      "Custom Branded Domain (e.g. saisamtools.com) bought & configured on Hostinger",
      "Bespoke High-Conversion UI/UX built with modern responsive design",
      "Dedicated CMS Admin Panel to manage products, enquiries & company news",
      "6 Months Free Platform Maintenance & Priority Technical Support",
      "Zero Server/DevOps Hassle - Automatic Nginx routing & Let's Encrypt SSL"
    ],
    maintenance_months: 6,
    additional_benefits: "All custom websites are fully synchronized with your IIP marketplace profile and public inquiry system."
  });
  const [customRequest, setCustomRequest] = useState(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [requestedDomainInput, setRequestedDomainInput] = useState("");
  const [requestedNotesInput, setRequestedNotesInput] = useState("");
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // Step 3: Deployment Progress Bar
  const [deployStepIndex, setDeployStepIndex] = useState(0);
  const [deployProgress, setDeployProgress] = useState(15);
  const [deployedWebsite, setDeployedWebsite] = useState(null);
  const hasAutoPopulatedRef = React.useRef(false);

  // Check plan entitlement and custom website state on modal open
  useEffect(() => {
    if (!isOpen) return;
    setEntitlement((prev) => ({ ...prev, loading: true }));
    api.get("/websites/my-website")
      .then((res) => {
        setEntitlement({
          loading: false,
          can_create: res.data?.can_create !== false,
          message: res.data?.message,
          website: res.data?.website
        });
      })
      .catch(() => {
        setEntitlement({ loading: false, can_create: true, message: null, website: null });
      });

    // Fetch custom website benefits config
    api.get("/websites/custom-config")
      .then((res) => {
        if (res.data) setCustomConfig(res.data);
      })
      .catch(() => {});

    // Fetch user's custom website request status
    setLoadingCustom(true);
    api.get("/websites/my-custom-request")
      .then((res) => {
        setCustomRequest(res.data?.request || null);
        if (res.data?.has_request && res.data?.request?.status !== "REJECTED") {
          // If user already has an active bespoke request, switch tab to custom domain tab
          setActiveTab("custom_domain");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCustom(false));
  }, [isOpen]);

  // Default suggested subdomain from company name (only once upon modal opening)
  useEffect(() => {
    if (!isOpen) {
      hasAutoPopulatedRef.current = false;
      return;
    }
    if (initialCompany.name && !subdomain && !hasAutoPopulatedRef.current) {
      const suggested = initialCompany.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setSubdomain(suggested);
      hasAutoPopulatedRef.current = true;
    }
  }, [isOpen, initialCompany.name]);

  // Real-time debounced subdomain checking
  useEffect(() => {
    if (!isOpen) return;
    if (!subdomain.trim() || subdomain.length < 3) {
      setDomainStatus(null);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingDomain(true);
      api
        .get(`/websites/check-subdomain?name=${encodeURIComponent(subdomain)}`)
        .then((res) => {
          setDomainStatus(res.data);
        })
        .catch(() => {
          setDomainStatus({
            available: false,
            reason: "Could not verify subdomain. Please try again.",
          });
        })
        .finally(() => {
          setCheckingDomain(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, subdomain]);

  // Load available templates
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep === 2 && templates.length === 0) {
      setLoadingTemplates(true);
      api
        .get("/websites/templates")
        .then((res) => {
          setTemplates(res.data);
          if (res.data.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(res.data[0].id);
          }
        })
        .catch(() => {
          toast.error("Failed to load templates.");
        })
        .finally(() => {
          setLoadingTemplates(false);
        });
    }
  }, [isOpen, currentStep, templates.length, selectedTemplateId]);

  // Handle Deployment Flow & Realistic Animated Progress
  const handleStartDeployment = async () => {
    if (!domainStatus || !domainStatus.available) {
      toast.error("Please enter a valid, available subdomain.");
      return;
    }

    setCurrentStep(3); // Enter deployment mode
    setDeployStepIndex(0);
    setDeployProgress(20);

    // Progressive step animations
    const stepInterval = setInterval(() => {
      setDeployStepIndex((prev) => {
        if (prev < PROVISIONING_STEPS.length - 1) {
          const next = prev + 1;
          setDeployProgress(Math.min(95, (next + 1) * 20));
          return next;
        }
        return prev;
      });
    }, 1200);

    try {
      const res = await api.post("/websites/setup", {
        subdomain: domainStatus.subdomain,
        template_id: selectedTemplateId,
        theme_config: {
          primary_color: "#1e3a8a",
          accent_color: "#ea580c"
        }
      });

      clearInterval(stepInterval);
      setDeployProgress(100);
      setDeployStepIndex(PROVISIONING_STEPS.length - 1);
      setDeployedWebsite(res.data.website);

      setTimeout(() => {
        setCurrentStep(4); // Finished
        toast.success("Website successfully deployed & live!");
        if (onComplete) onComplete(res.data.website);
      }, 800);
    } catch (err) {
      clearInterval(stepInterval);
      const detail = err.response?.data?.detail || "Website setup failed. Please try again.";
      toast.error(detail);
      setCurrentStep(2); // Fallback to template selection
    }
  };

  const handleRequestCustomWebsite = async (e) => {
    e.preventDefault();
    if (!requestedDomainInput.trim()) {
      toast.error("Please enter your preferred domain name (e.g. saisamtools.com)");
      return;
    }

    setSubmittingCustom(true);
    try {
      const res = await api.post("/websites/custom-requests", {
        requested_domain: requestedDomainInput.trim().toLowerCase(),
        notes: requestedNotesInput.trim()
      });
      setCustomRequest(res.data.request);
      toast.success("Bespoke website request submitted successfully! Our engineering team will review it.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit custom website request.");
    } finally {
      setSubmittingCustom(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Custom Website Management
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Premium Feature
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === "custom_domain"
                  ? "Bespoke AI Frontend & Dedicated Hostinger Domain"
                  : currentStep === 1
                  ? "Step 1 of 2: Claim your unique company domain"
                  : currentStep === 2
                  ? "Step 2 of 2: Choose your modular website template"
                  : currentStep === 3
                  ? "Deploying & Provisioning Infrastructure..."
                  : "Deployment Complete!"}
              </p>
            </div>
          </div>

          {currentStep !== 3 && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tab Switcher: Standard Subdomain vs Bespoke Custom Website */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("subdomain")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "subdomain"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Globe size={13} />
            <span>Standard Subdomain</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("custom_domain")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "custom_domain"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles size={13} className={activeTab === "custom_domain" ? "fill-slate-950" : "text-amber-400"} />
            <span>Bespoke Custom Website</span>
            {customRequest && customRequest.status !== "REJECTED" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "custom_domain" ? (
            <div className="space-y-6" data-testid="bespoke-custom-website-section">
              {loadingCustom ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin text-amber-400" size={24} />
                  <span className="text-xs">Loading custom website status...</span>
                </div>
              ) : customRequest && customRequest.status !== "REJECTED" ? (
                /* Active Request Status Tracking View */
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Globe size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base">Bespoke Custom Domain</h3>
                            {customRequest.status === "PENDING_REVIEW" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                                <Clock size={11} /> Under Review
                              </span>
                            )}
                            {customRequest.status === "DOMAIN_PURCHASED" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                                <Check size={11} /> Domain Configured
                              </span>
                            )}
                            {customRequest.status === "IN_DEVELOPMENT" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                                <Wrench size={11} /> In Production
                              </span>
                            )}
                            {customRequest.status === "DEPLOYED" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live &amp; SSL Secured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 font-mono">
                            https://{customRequest.assigned_domain || customRequest.requested_domain}
                          </p>
                        </div>
                      </div>

                      {customRequest.status === "DEPLOYED" ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://${customRequest.assigned_domain || customRequest.requested_domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <span>Visit Live</span>
                            <ExternalLink size={13} />
                          </a>
                          <a
                            href="/company-admin"
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <LayoutDashboard size={13} />
                            <span>Admin Panel</span>
                          </a>
                        </div>
                      ) : (
                        <a
                          href="/company-admin"
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all inline-flex items-center gap-1.5 border border-slate-700"
                        >
                          <LayoutDashboard size={13} />
                          <span>Admin Panel</span>
                        </a>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Hostinger Server IP</span>
                        <span className="font-mono font-bold text-slate-200">200.141.14.101</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Maintenance Guarantee</span>
                        <span className="font-bold text-emerald-400">{customRequest.maintenance_period_months || 6} Months Free Included</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Synchronized Backend</span>
                        <span className="font-bold text-amber-300">IIP Realtime API</span>
                      </div>
                    </div>

                    {customRequest.notes && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
                        <strong className="text-slate-300">Your Design Notes:</strong> {customRequest.notes}
                      </div>
                    )}
                  </div>

                  {/* Information Callout */}
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/50 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                      <ShieldCheck size={16} />
                      <span>Dedicated CMS Admin Panel Included</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      You can modify your products, company bio, certifications, reels, and news updates at any time from your 
                      <strong className="text-slate-200"> Company Admin Panel</strong>. All edits reflect immediately on your custom domain with zero code redeployments.
                    </p>
                  </div>
                </div>
              ) : (
                /* Request Submission Form */
                <form onSubmit={handleRequestCustomWebsite} className="space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Sparkles size={16} />
                      <span>Exclusive Bespoke Custom Website</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Upgrade beyond our standard subdomains! Get a tailor-made frontend with a dedicated domain 
                      bought on Hostinger, high-conversion design generated via AI or custom engineering, and an intuitive CMS Admin Panel.
                    </p>
                  </div>

                  {/* Configured Benefits */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Included With Custom Website
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(customConfig?.benefits_list || [
                        "Custom Branded Domain (Hostinger Managed)",
                        "Bespoke High-Conversion UI/UX Design",
                        "Dedicated CMS Admin Panel for Instant Updates",
                        "6 Months Free Technical Maintenance",
                        "Automatic Let's Encrypt Wildcard SSL",
                        "Instant Live Product Catalog & RFQ Sync"
                      ]).map((b, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 text-xs text-slate-200">
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Domain Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Preferred Custom Domain Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs text-slate-500 font-mono select-none">
                        https://www.
                      </span>
                      <input
                        type="text"
                        value={requestedDomainInput}
                        onChange={(e) => setRequestedDomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
                        placeholder="e.g. saisamtools.com or precisionmachining.in"
                        className="w-full pl-28 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                        required
                        data-testid="requested-custom-domain-input"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      We will check availability and purchase/configure this domain on Hostinger pointing to <code className="text-amber-300">200.141.14.101</code>.
                    </p>
                  </div>

                  {/* Notes / Design Requirement Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Design Notes &amp; Brand Requirements <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={requestedNotesInput}
                      onChange={(e) => setRequestedNotesInput(e.target.value)}
                      placeholder="e.g. We want an industrial dark theme with high-precision aerospace machinery showcases, quick quote calculator, and WhatsApp CTA button..."
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      data-testid="requested-custom-notes-input"
                    />
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCustom || !requestedDomainInput.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      data-testid="submit-custom-website-request-btn"
                    >
                      {submittingCustom ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Request Bespoke Website</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Subdomain Flow */
            <>
              {/* Entitlement Locked Guard */}
              {!entitlement.loading && !entitlement.can_create && !entitlement.website ? (
                <div className="py-8 text-center space-y-6 max-w-lg mx-auto" data-testid="website-modal-locked-state">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                    <AlertCircle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Company Website Feature Not Included</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {entitlement.message || "Your plan does not include the company website feature. Please buy a plan with the website feature to avail this."}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-750 text-xs text-slate-400 text-left space-y-2">
                    <p className="font-semibold text-slate-200">With the company website feature you get:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Your own custom branded subdomain (e.g. yourbrand.indianindustrialplatform.com)</li>
                      <li>Instant catalog &amp; product synchronization</li>
                      <li>Automated Hostinger DNS provisioning &amp; SSL encryption</li>
                    </ul>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <a
                      href="/pricing"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center gap-2"
                    >
                      <Sparkles size={14} className="fill-slate-950" />
                      <span>View Membership Plans</span>
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* STEP 1: Domain Selection */}
                  {currentStep === 1 && (
                <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Choose Your Company Subdomain
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-slate-500 font-mono select-none">
                    https://
                  </span>
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="your-company-name"
                    className="w-full pl-20 pr-40 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <span className="absolute right-3.5 text-xs text-slate-400 font-mono select-none hidden sm:inline">
                    .indianindustrialplatform.com
                  </span>
                </div>

                {/* Subdomain Verification Feedback Pill */}
                <div className="mt-3 min-h-[24px]">
                  {checkingDomain && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 size={13} className="animate-spin text-blue-400" />
                      <span>Checking availability across Hostinger & platform...</span>
                    </div>
                  )}

                  {!checkingDomain && domainStatus && (
                    <div>
                      {domainStatus.available ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={14} />
                          <span><strong>{domainStatus.full_domain}</strong> is available & ready to provision!</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle size={14} />
                          <span>{domainStatus.reason || "This subdomain is unavailable."}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Informational features card */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-750 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-white">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  What is included with your custom website?
                </div>
                <ul className="space-y-1.5 pl-6 list-disc text-slate-400">
                  <li>Instant Hostinger DNS provisioning with Wildcard fallback.</li>
                  <li>Live synchronization with your company products, reels, and catalog.</li>
                  <li>Automated Google Schema.org & dynamic SEO sitemap generation.</li>
                  <li>Direct B2B customer quotation drawer & WhatsApp routing.</li>
                </ul>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!domainStatus || !domainStatus.available}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                >
                  Continue to Templates <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Select a Website Template</h3>
                  <p className="text-xs text-slate-400">Choose a design layout tailored to your industry.</p>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  &larr; Change Subdomain
                </button>
              </div>

              {loadingTemplates ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all bg-slate-950 ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xl"
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="relative h-32 bg-slate-900 overflow-hidden">
                            <img
                              src={tmpl.thumbnail_url}
                              alt={tmpl.name}
                              className="w-full h-full object-cover"
                            />
                            {tmpl.badge && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/90 backdrop-blur-md text-amber-300 border border-slate-700">
                                {tmpl.badge}
                              </span>
                            )}
                            {tmpl.is_custom && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white">
                                Exclusive Bespoke
                              </span>
                            )}
                          </div>

                          <div className="p-4 space-y-1.5">
                            <h4 className="text-xs font-bold text-white flex items-center justify-between">
                              {tmpl.name}
                              {isSelected && <Check size={14} className="text-blue-400" />}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                              {tmpl.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 pt-0 grid grid-cols-2 gap-2 border-t border-slate-900 mt-2">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplateId(tmpl.id)}
                            className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Eye size={12} /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2 Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStartDeployment}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Sparkles size={14} /> Launch & Deploy Website
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Automated Deployment & Multi-Stage Progress Bar */}
          {currentStep === 3 && (
            <div className="py-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Provisioning Your Website</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Linking <strong>{domainStatus?.full_domain}</strong> to Hostinger DNS and generating your industrial catalog frontend.
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Deploying Infrastructure</span>
                  <span className="font-bold text-blue-400">{deployProgress}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${deployProgress}%` }}
                  />
                </div>
              </div>

              {/* Step Tracker */}
              <div className="max-w-md mx-auto space-y-3">
                {PROVISIONING_STEPS.map((st, i) => {
                  const isDone = i < deployStepIndex;
                  const isCurrent = i === deployStepIndex;
                  return (
                    <div
                      key={st.step}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        isCurrent
                          ? "bg-slate-800/80 border-blue-500/50 shadow-md"
                          : isDone
                          ? "bg-slate-900/60 border-emerald-500/30 opacity-80"
                          : "bg-slate-950/40 border-slate-850 opacity-40"
                      }`}
                    >
                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 size={18} className="animate-spin text-blue-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${isCurrent ? "text-white" : isDone ? "text-emerald-300" : "text-slate-400"}`}>
                          {st.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Deployment Celebration & Live Links */}
          {currentStep === 4 && deployedWebsite && (
            <div className="py-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Your Website is Live!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                  Congratulations! Your company website has been successfully published and linked to Hostinger DNS.
                </p>
              </div>

              {/* Live URL Pill */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto space-y-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Your Live Address</span>
                <div className="flex items-center justify-center gap-2">
                  <a
                    href={deployedWebsite.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-blue-400 hover:text-blue-300 underline font-mono flex items-center gap-1.5"
                  >
                    {deployedWebsite.live_url}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href={deployedWebsite.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
                >
                  <ExternalLink size={15} /> Visit Live Website
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition-colors"
                >
                  Close & Manage
                </button>
              </div>
            </div>
          )}
          </>
        )}
        </>
      )}
        </div>

      </div>

      {/* Interactive Live / Sample Data Preview Modal */}
      <TemplatePreviewModal
        templateId={previewTemplateId}
        isOpen={!!previewTemplateId}
        onClose={() => setPreviewTemplateId(null)}
        onSelectTemplate={(tid) => setSelectedTemplateId(tid)}
        userCompany={initialCompany}
        userProducts={companyProducts}
        userPosts={posts}
        userReels={reels}
      />
    </div>
  );
}
