import React, { useState } from "react";
import { X, Search, Settings, Zap, Layers, Cpu, Wrench, Shield, Truck, Package, Boxes, Grid, Check } from "lucide-react";

const SteelIBeam = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
    <path d="M6 4h12M6 20h12M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DEFAULT_CATEGORIES = [
  { name: "Machinery", icon: Settings, color: "text-blue-600 bg-blue-50" },
  { name: "Electricals", icon: Zap, color: "text-amber-500 bg-amber-50" },
  { name: "Raw Materials", icon: Layers, color: "text-emerald-600 bg-emerald-50" },
  { name: "Components", icon: Boxes, color: "text-indigo-600 bg-indigo-50" },
  { name: "Automation", icon: Cpu, color: "text-orange-600 bg-orange-50" },
  { name: "Steel", icon: SteelIBeam, color: "text-slate-600 bg-slate-100" },
  { name: "Polymers", icon: Package, color: "text-purple-600 bg-purple-50" },
  { name: "Tools", icon: Wrench, color: "text-red-600 bg-red-50" },
  { name: "Logistics", icon: Truck, color: "text-cyan-600 bg-cyan-50" },
  { name: "Safety Equipment", icon: Shield, color: "text-teal-600 bg-teal-50" },
  { name: "Fabrication", icon: Grid, color: "text-rose-600 bg-rose-50" },
];

export const CategoryDrawer = ({ open, onClose, selectedCategory, onSelectCategory, categoriesList = [] }) => {
  const [search, setSearch] = useState("");

  if (!open) return null;

  // Combine fetched categories with icon list
  const allCats = categoriesList.length > 0
    ? categoriesList.map(c => {
        const found = DEFAULT_CATEGORIES.find(d => d.name.toLowerCase() === (typeof c === 'string' ? c : c.name).toLowerCase());
        return {
          name: typeof c === 'string' ? c : c.name,
          icon: found?.icon || Package,
          color: found?.color || "text-blue-600 bg-blue-50"
        };
      })
    : DEFAULT_CATEGORIES;

  const filtered = allCats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity flex justify-end"
      onClick={onClose}
      data-testid="category-drawer-backdrop"
    >
      <div
        className="h-full bg-white shadow-2xl flex flex-col w-[60vw] md:w-[25vw] lg:w-[25vw] max-w-full animate-in slide-in-from-right duration-300 transform transition-transform"
        onClick={(e) => e.stopPropagation()}
        data-testid="category-drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg">All Categories</h2>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider font-medium">Browse by segment</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            data-testid="close-category-drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
          <button
            onClick={() => {
              onSelectCategory("All");
              onClose();
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
              selectedCategory === "All"
                ? "bg-blue-50 border-blue-500 font-bold text-blue-900"
                : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                All
              </div>
              <span className="text-xs sm:text-sm font-semibold">All Categories</span>
            </div>
            {selectedCategory === "All" && <Check size={16} className="text-blue-700" />}
          </button>

          {filtered.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => {
                  onSelectCategory(cat.name);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-blue-50 border-blue-600 font-bold text-blue-900 shadow-sm"
                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold truncate">{cat.name}</span>
                </div>
                {isSelected && <Check size={16} className="text-blue-700 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">No categories found</div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-500 font-medium">Select a category to filter feed</p>
        </div>
      </div>
    </div>
  );
};
