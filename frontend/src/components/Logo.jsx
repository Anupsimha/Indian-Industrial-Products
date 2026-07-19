import React from "react";

export const Logo = ({ size = 36, withText = true }) => {
  return (
    <div className="flex items-center gap-2" data-testid="iip-logo">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src="/logo-inner.png"
          alt="IIP Map"
          className="absolute inset-0 w-full h-full object-contain"
        />
        <img
          src="/logo-outer.png"
          alt="IIP Gear"
          className="absolute inset-0 w-full h-full object-contain gear-spin-slow"
        />
      </div>
      {withText && (
        <div className="leading-none flex flex-col justify-center select-none font-display font-black text-blue-900 tracking-tight uppercase">
          <span className="text-base sm:text-lg leading-none font-black">
            IIP
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-orange-600 tracking-wider leading-none mt-0 whitespace-nowrap">
            ENGINEERING
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-orange-600 tracking-wider leading-none whitespace-nowrap">
            TOMORROW
          </span>
        </div>
      )}
    </div>
  );
};

