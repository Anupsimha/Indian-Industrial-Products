import React, { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

const defaultSlides = [
  {
    title: "India's Engineering Platform",
    subtitle: "Discover 1,500+ verified manufacturers",
    image:
      "https://images.unsplash.com/photo-1577894947058-cfdae4276bef?w=1600",
    cta: "Post Your Requirement",
    accent: "from-blue-900/85 via-blue-800/60 to-transparent",
  },
  {
    title: "From Steel to Software",
    subtitle: "Source machinery, polymers, electricals & more",
    image:
      "https://images.unsplash.com/photo-1564865878688-9a244444042a?w=1600",
    cta: "Explore Reels",
    accent: "from-orange-900/80 via-orange-800/50 to-transparent",
  },
  {
    title: "Generate Quality Leads",
    subtitle: "Direct enquiries land on WhatsApp instantly",
    image:
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1600",
    cta: "Start Selling",
    accent: "from-slate-900/85 via-slate-800/55 to-transparent",
  },
];

export const HeroSlider = ({ onCta }) => {
  const [slides, setSlides] = useState(defaultSlides);
  const [i, setI] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    api.get("/slides")
      .then((r) => {
        if (r.data && r.data.length > 0) {
          setSlides(r.data);
        }
      })
      .catch(() => {});
  }, []);

  const prev = () => setI((p) => (p === 0 ? slides.length - 1 : p - 1));
  const next = () => setI((p) => (p + 1) % slides.length);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const t = setInterval(() => next(), 4500);
    return () => clearInterval(t);
  }, [slides, isHovered]);

  const handleTouchStart = (e) => {
    if (slides.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (slides.length <= 1) return;
    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) next();
      else prev();
    }
  };

  if (slides.length === 0) return null;
  const s = slides[i];

  return (
    <div
      className="relative h-56 sm:h-64 lg:h-80 xl:h-[340px] overflow-hidden rounded-2xl bg-slate-900 mx-4 lg:mx-0 mt-3 shadow-md group select-none"
      data-testid="hero-slider"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      {slides.map((sl, idx) => (
        <img
          key={sl.id || idx}
          src={sl.image}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className={`absolute inset-0 bg-gradient-to-tr ${s.accent}`} />
      <div className="absolute inset-0 p-5 lg:p-8 xl:p-10 flex flex-col justify-end">
        <div className="text-[10px] lg:text-xs font-bold tracking-[0.25em] uppercase text-orange-300 mb-1">
          Featured
        </div>
        <h2 className="font-display text-white font-bold text-2xl lg:text-3xl xl:text-4xl leading-tight">
          {s.title}
        </h2>
        <p className="text-white/80 text-sm lg:text-base mt-1 mb-3 lg:mb-4">{s.subtitle}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCta}
            data-testid="hero-cta-btn"
            className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors"
          >
            {s.cta}
          </button>
          <div className="flex gap-1 ml-2 lg:ml-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setI(idx)}
                className={`h-1.5 lg:h-2 rounded-full transition-all ${
                  idx === i ? "w-6 lg:w-8 bg-white" : "w-1.5 lg:w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
