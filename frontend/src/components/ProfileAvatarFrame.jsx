import React from "react";
import { Crown, Star, Sparkles, ShieldCheck, Camera } from "lucide-react";

export function ProfileAvatarFrame({
  src,
  alt = "Profile Avatar",
  planName = "Free",
  size = "md",
  showBadge = true,
  editable = false,
  onEdit,
  className = "",
}) {
  const normPlan = (planName || "Free").toLowerCase().trim();

  // Dimension Mappings
  const sizeMap = {
    sm: { box: "w-10 h-10", border: "p-0.5", avatar: "w-9 h-9", badge: "w-4 h-4 -bottom-1 -right-1", icon: 10 },
    md: { box: "w-14 h-14", border: "p-1", avatar: "w-12 h-12", badge: "w-5 h-5 -bottom-1 -right-1", icon: 12 },
    lg: { box: "w-20 h-20", border: "p-1.5", avatar: "w-17 h-17", badge: "w-6 h-6 bottom-0 right-0", icon: 14 },
    xl: { box: "w-24 h-24 sm:w-28 sm:h-28", border: "p-1.5 sm:p-2", avatar: "w-[84px] h-[84px] sm:w-24 sm:h-24", badge: "w-7 h-7 sm:w-8 sm:h-8 bottom-0 right-0", icon: 16 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Tier Visual Configuration
  const getTierConfig = () => {
    if (normPlan.includes("gold")) {
      return {
        wrapper: "bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_18px_rgba(245,158,11,0.45)] animate-pulse-subtle",
        innerRing: "ring-2 ring-amber-300/60",
        badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border border-amber-200 shadow-md",
        BadgeIcon: Crown,
        tierLabel: "Gold Tier",
      };
    }
    if (normPlan.includes("platinum") || normPlan.includes("pro")) {
      return {
        wrapper: "bg-gradient-to-tr from-cyan-400 via-blue-400 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]",
        innerRing: "ring-2 ring-cyan-200/80",
        badgeBg: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-200 shadow-md",
        BadgeIcon: Sparkles,
        tierLabel: "Platinum Tier",
      };
    }
    if (normPlan.includes("vip") || normPlan.includes("enterprise")) {
      return {
        wrapper: "bg-gradient-to-tr from-amber-300 via-emerald-400 to-yellow-500 shadow-[0_0_22px_rgba(16,185,129,0.55)]",
        innerRing: "ring-2 ring-emerald-300/80",
        badgeBg: "bg-gradient-to-r from-emerald-600 to-teal-500 text-amber-300 border border-amber-300 shadow-md",
        BadgeIcon: Crown,
        tierLabel: "VIP Enterprise",
      };
    }
    if (normPlan.includes("silver")) {
      return {
        wrapper: "bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-500 shadow-[0_0_12px_rgba(148,163,184,0.4)]",
        innerRing: "ring-2 ring-slate-200",
        badgeBg: "bg-gradient-to-r from-slate-600 to-slate-400 text-slate-100 border border-slate-300 shadow-sm",
        BadgeIcon: Star,
        tierLabel: "Silver Tier",
      };
    }
    // Free / Standard Tier
    return {
      wrapper: "bg-gradient-to-tr from-slate-300 to-blue-900/40 shadow-sm",
      innerRing: "ring-1 ring-white/30",
      badgeBg: "bg-slate-700 text-slate-200 border border-slate-500 shadow-sm",
      BadgeIcon: ShieldCheck,
      tierLabel: "Free Plan",
    };
  };

  const config = getTierConfig();
  const BadgeIcon = config.BadgeIcon;

  return (
    <div className={`relative inline-block shrink-0 ${className}`} data-testid={`profile-frame-${normPlan}`}>
      {/* Outer Glow & Gradient Frame Ring */}
      <div className={`rounded-full ${currentSize.border} ${config.wrapper} transition-all duration-300`}>
        {/* Inner Avatar Container */}
        <div className={`relative rounded-full overflow-hidden ${currentSize.avatar} ${config.innerRing} bg-slate-800`}>
          <img
            src={src || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200"}
            alt={alt}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Subscription Tier Badge Overlay */}
      {showBadge && (
        <div
          title={config.tierLabel}
          className={`absolute ${currentSize.badge} rounded-full flex items-center justify-center ${config.badgeBg} transition-transform hover:scale-110 cursor-help z-10`}
        >
          <BadgeIcon size={currentSize.icon} />
        </div>
      )}

      {/* Editable Camera Overlay Button */}
      {editable && (
        <button
          onClick={onEdit}
          title="Change Profile Photo"
          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors z-20"
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  );
}
