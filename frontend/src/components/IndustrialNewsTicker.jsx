import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, ArrowRight, ExternalLink } from "lucide-react";
import api from "../lib/api";

export const IndustrialNewsTicker = () => {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/news/headlines")
      .then((res) => {
        if (mounted) {
          setHeadlines(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md my-4 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Newspaper size={16} className="text-blue-400" /> Industrial News Updates
        </div>
        <div className="h-4 w-48 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!headlines || headlines.length === 0) return null;

  return (
    <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-3.5 sm:p-4 border border-slate-800 shadow-xl overflow-hidden my-6" data-testid="industrial-news-ticker">
      {/* Header bar with View All link */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          <span className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
            <Newspaper size={16} /> B2B Industry News Feed
          </span>
        </div>
        
        <Link
          to="/news"
          className="group flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-950/60 hover:bg-blue-900/60 px-3 py-1.5 rounded-full border border-blue-800/50 shadow-sm"
          data-testid="ticker-view-more-btn"
        >
          View More News
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Marquee ticker container */}
      <div className="relative w-full overflow-hidden">
        <div className="flex items-center gap-6 animate-ticker hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] whitespace-nowrap">
          {/* Double array for seamless loop */}
          {[...headlines, ...headlines].map((item, idx) => {
            const fallbackSrc = `/api/news/card?source=${encodeURIComponent(item.source)}&category=${encodeURIComponent(item.category)}`;
            return (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try { api.post(`/news/${item.id}/click`); } catch {}
                }}
                className="inline-flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-2 pr-4 transition-all duration-200 shrink-0 max-w-md shadow-sm group"
              >
                <img
                  src={item.image_url || fallbackSrc}
                  alt={item.title}
                  onError={(e) => { e.currentTarget.src = fallbackSrc; }}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700/60"
                  loading="lazy"
                />
                <div className="overflow-hidden text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/50">
                      {item.source}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate max-w-xs transition-colors">
                    {item.title}
                  </h4>
                </div>
                <ExternalLink size={13} className="text-slate-500 group-hover:text-blue-400 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};
