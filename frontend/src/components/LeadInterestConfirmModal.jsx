import React from "react";
import { createPortal } from "react-dom";
import { Sparkles, Check, X, Tag, MapPin, ArrowRight } from "lucide-react";
import { useLeadInterests } from "../context/LeadInterestContext";
import { useNavigate } from "react-router-dom";

export const LeadInterestConfirmModal = () => {
  const {
    selectedLeads,
    count,
    showConfirmModal,
    setShowConfirmModal,
    toggleLeadInterest,
    confirmInterests,
  } = useLeadInterests();
  const navigate = useNavigate();

  if (!showConfirmModal || count === 0) return null;

  const handleConfirmAndNavigate = (targetPath) => {
    confirmInterests();
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles size={22} className="fill-amber-300" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-white leading-tight">
                Personalize Your Feed
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                You have selected {count} of 5 industrial leads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(false)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Prompt */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-950 leading-relaxed flex items-start gap-2.5">
            <Check size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Are you interested in these industrial requirements?</span>
              <p className="text-blue-800 text-[11px] mt-0.5">
                Confirming these interests will tailor-make posts, products, and reels across the platform to your domain.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
              Selected Leads ({count}/5)
            </div>

            {selectedLeads.map((lead, idx) => (
              <div
                key={lead.id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-all text-left group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      <Tag size={10} className="inline mr-1" />
                      {lead.category || "General"}
                    </span>
                    {lead.location && (
                      <span className="text-[10px] text-slate-500 inline-flex items-center gap-0.5">
                        <MapPin size={10} /> {lead.location}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-1 truncate">
                    {lead.product_name || lead.requirement.slice(0, 45)}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                    {lead.requirement}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLeadInterest(lead)}
                  title="Remove from selection"
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setShowConfirmModal(false)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all"
          >
            Keep Browsing Leads
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleConfirmAndNavigate("/")}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Sparkles size={14} className="fill-white" />
              Yes, Personalize My Experience
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
