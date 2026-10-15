import React, { useState } from "react";
import { X, Smartphone, Monitor, Sparkles, Check, ExternalLink } from "lucide-react";
import { getTemplate, getSampleDataForTemplate } from "../registry";

export default function TemplatePreviewModal({ templateId, isOpen = true, onClose, onSelectTemplate }) {
  const [viewMode, setViewMode] = useState("desktop"); // desktop | mobile

  if (!isOpen || !templateId) return null;

  const templateConfig = getTemplate(templateId);
  const sampleData = getSampleDataForTemplate(templateId);
  const TemplateComponent = templateConfig.component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-7xl h-[95vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Toolbar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Live Interactive Preview
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">{templateConfig.name}</h3>
              <p className="text-[11px] text-slate-400">Populated with sample industrial machinery & catalog data</p>
            </div>
          </div>

          {/* Viewport Switcher & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
              <button
                onClick={() => setViewMode("desktop")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "desktop" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Monitor size={14} /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "mobile" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone size={14} /> Mobile
              </button>
            </div>

            <a
              href={`/site?preview=true&template=${encodeURIComponent(templateId)}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
              title="Open full preview in a new tab"
            >
              <ExternalLink size={13} />
              <span>Open in New Tab</span>
            </a>

            {onSelectTemplate && (
              <button
                onClick={() => {
                  onSelectTemplate(templateId);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Check size={14} /> Select Template
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-slate-950 overflow-y-auto flex items-start justify-center p-2 sm:p-4">
          <div
            className={`w-full transition-all duration-300 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${
              viewMode === "mobile" ? "max-w-sm my-4 border-2 border-slate-700" : "max-w-full"
            }`}
          >
            <TemplateComponent
              company={sampleData.company}
              products={sampleData.products}
              posts={sampleData.posts}
              reels={sampleData.reels}
              stats={sampleData.stats}
              theme={{ primary_color: "#1e3a8a", accent_color: "#ea580c" }}
              seo={{ title: `${sampleData.company.name} | Preview` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
