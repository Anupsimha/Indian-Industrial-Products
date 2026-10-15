import React, { useState, useEffect } from "react";
import {
  X, Globe, Check, AlertCircle, Loader2, Sparkles, ExternalLink,
  Layers, CheckCircle2, ArrowRight, Eye, ShieldCheck, Building2
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

export default function WebsiteSetupModal({ isOpen, onClose, onComplete, initialCompany = {} }) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Subdomain, 2: Template, 3: Deploying, 4: Done

  // Step 1: Subdomain
  const [subdomain, setSubdomain] = useState("");
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState(null); // { available: bool, reason: string, full_domain: string }

  // Step 2: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("industrial_modern");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);

  // Step 3: Deployment Progress Bar
  const [deployStepIndex, setDeployStepIndex] = useState(0);
  const [deployProgress, setDeployProgress] = useState(15);
  const [deployedWebsite, setDeployedWebsite] = useState(null);

  // Default suggested subdomain from company name
  useEffect(() => {
    if (!isOpen) return;
    if (initialCompany.name && !subdomain) {
      const suggested = initialCompany.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setSubdomain(suggested);
    }
  }, [isOpen, initialCompany, subdomain]);

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
                {currentStep === 1 && "Step 1 of 2: Claim your unique company domain"}
                {currentStep === 2 && "Step 2 of 2: Choose your modular website template"}
                {currentStep === 3 && "Deploying & Provisioning Infrastructure..."}
                {currentStep === 4 && "Deployment Complete!"}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
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

        </div>

      </div>

      {/* Interactive Sample Data Preview Modal */}
      <TemplatePreviewModal
        templateId={previewTemplateId}
        isOpen={!!previewTemplateId}
        onClose={() => setPreviewTemplateId(null)}
        onSelectTemplate={(tid) => setSelectedTemplateId(tid)}
      />
    </div>
  );
}
