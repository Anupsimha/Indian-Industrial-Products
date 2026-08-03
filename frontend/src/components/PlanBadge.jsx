import React from "react";
import { Crown, Sparkles, ShieldCheck, Zap } from "lucide-react";

export const PlanBadge = ({ plan = "Free", size = "xs", showFree = true }) => {
  if (!plan) return null;
  const rawPlan = String(plan).trim();
  const low = rawPlan.toLowerCase();

  if ((low === "free" || low === "") && !showFree) return null;

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-0.5 rounded-full",
    sm: "text-[10px] px-2 py-0.5 gap-1 rounded-full",
    md: "text-xs px-2.5 py-1 gap-1.5 rounded-full"
  }[size] || "text-[9px] px-1.5 py-0.5 gap-0.5 rounded-full";

  const iconSizes = {
    xs: 9,
    sm: 11,
    md: 13
  }[size] || 9;

  // Free Tier
  if (low === "free" || low === "") {
    return (
      <span
        className={`inline-flex items-center font-bold tracking-tight bg-slate-100 text-slate-600 border border-slate-200/80 uppercase ${sizeClasses}`}
        title="Free Plan"
      >
        <span>FREE</span>
      </span>
    );
  }

  // SEO Boost / Search Boost
  if (low.includes("seo") || low.includes("boost")) {
    return (
      <span
        className={`inline-flex items-center font-black tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white border border-cyan-300 shadow-2xs uppercase ${sizeClasses}`}
        title={`${rawPlan} Plan`}
      >
        <Sparkles size={iconSizes} className="fill-white text-white shrink-0" />
        <span>{rawPlan.toUpperCase()}</span>
      </span>
    );
  }

  // Business Development / Enterprise
  if (low.includes("business") || low.includes("dev") || low.includes("enterprise")) {
    return (
      <span
        className={`inline-flex items-center font-black tracking-wider bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white border border-purple-300 shadow-2xs uppercase ${sizeClasses}`}
        title={`${rawPlan} Plan`}
      >
        <Crown size={iconSizes} className="fill-white text-white shrink-0" />
        <span>{rawPlan.toUpperCase()}</span>
      </span>
    );
  }

  // Gold / Premium
  if (low.includes("gold") || low.includes("premium")) {
    return (
      <span
        className={`inline-flex items-center font-black tracking-wider bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white border border-amber-300 shadow-2xs uppercase ${sizeClasses}`}
        title={`${rawPlan} Plan`}
      >
        <Crown size={iconSizes} className="fill-white text-white shrink-0" />
        <span>{rawPlan.toUpperCase()}</span>
      </span>
    );
  }

  // Platinum
  if (low.includes("platinum")) {
    return (
      <span
        className={`inline-flex items-center font-black tracking-wider bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white border border-cyan-300 shadow-2xs uppercase ${sizeClasses}`}
        title={`${rawPlan} Plan`}
      >
        <Sparkles size={iconSizes} className="fill-white text-white shrink-0" />
        <span>{rawPlan.toUpperCase()}</span>
      </span>
    );
  }

  // Silver / Basic / Starter
  if (low.includes("silver") || low.includes("basic") || low.includes("starter")) {
    return (
      <span
        className={`inline-flex items-center font-extrabold tracking-wider bg-gradient-to-r from-slate-200 via-zinc-100 to-slate-300 text-slate-800 border border-slate-300/80 shadow-2xs uppercase ${sizeClasses}`}
        title={`${rawPlan} Plan`}
      >
        <ShieldCheck size={iconSizes} className="text-slate-700 shrink-0" />
        <span>{rawPlan.toUpperCase()}</span>
      </span>
    );
  }

  // Generic Paid Plan Fallback
  return (
    <span
      className={`inline-flex items-center font-extrabold tracking-wider bg-gradient-to-r from-blue-700 to-indigo-800 text-white border border-blue-400 shadow-2xs uppercase ${sizeClasses}`}
      title={`${rawPlan} Plan`}
    >
      <Zap size={iconSizes} className="fill-white text-white shrink-0" />
      <span>{rawPlan.toUpperCase()}</span>
    </span>
  );
};
