import React, { useState, useMemo } from "react";
import {
  Plus, Edit, Trash2, Search, CheckCircle2, AlertCircle,
  ToggleLeft, ToggleRight, Sparkles, Image as ImageIcon,
  Loader2, X, ChevronRight, Layers, Wrench
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { SingleImageUploader } from "./MediaUploader";

/**
 * Extensible Section Manager Component (OOP Compliant)
 * Dynamically provides full CRUD and state management for custom website sections
 * defined in template configurations (e.g., Engineering Services, Machinery, Certifications).
 */
export default function CustomSectionManager({ moduleConfig, sections = [], onRefresh }) {
  const {
    key: sectionKey,
    label,
    singular = "Item",
    plural = "Items",
    description,
    fields = []
  } = moduleConfig;

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Filtered Items
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title?.toLowerCase().includes(q) ||
        s.subtitle?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    });
  }, [sections, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const initialForm = {};
    fields.forEach((f) => {
      initialForm[f.key] = "";
    });
    setEditingItem(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    const populated = {
      title: item.title || "",
      subtitle: item.subtitle || "",
      description: item.description || "",
      icon_or_image: item.icon_or_image || "",
    };
    const meta = item.metadata_json || {};
    fields.forEach((f) => {
      if (f.isMetadata) {
        populated[f.key] = meta[f.key] || "";
      }
    });
    setEditingItem(item);
    setFormData(populated);
    setModalOpen(true);
  };

  // Toggle Active State
  const handleToggleActive = async (item) => {
    try {
      const nextActive = !item.is_active;
      await api.patch(`/websites/sections/${item.id}`, { is_active: nextActive });
      toast.success(`${singular} marked as ${nextActive ? "Active" : "Inactive"}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
    }
  };

  // Delete Item
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/websites/sections/${item.id}`);
      toast.success(`${singular} deleted successfully`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  // Submit Add / Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error(`${singular} title is required`);
      return;
    }

    setSaving(true);
    try {
      const metadata = {};
      fields.forEach((f) => {
        if (f.isMetadata && formData[f.key] !== undefined) {
          metadata[f.key] = formData[f.key];
        }
      });

      const payload = {
        section_key: sectionKey,
        title: formData.title.trim(),
        subtitle: formData.subtitle?.trim() || null,
        description: formData.description?.trim() || null,
        icon_or_image: formData.icon_or_image?.trim() || null,
        metadata_json: metadata,
        sort_order: editingItem?.sort_order || 0,
        is_active: editingItem?.is_active ?? true
      };

      if (editingItem) {
        await api.patch(`/websites/sections/${editingItem.id}`, payload);
        toast.success(`${singular} updated successfully!`);
      } else {
        await api.post("/websites/sections", payload);
        toast.success(`New ${singular.toLowerCase()} added to website!`);
      }

      setModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to save ${singular.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid={`cms-custom-section-${sectionKey}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white font-display">{label}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {sections.length} {sections.length === 1 ? singular : plural}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            {description || `Manage ${label.toLowerCase()} rendered directly on your company's dedicated website.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          data-testid={`cms-add-section-btn-${sectionKey}`}
        >
          <Plus size={14} />
          <span>Add New {singular}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${plural.toLowerCase()} by name, code, or description...`}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Items Cards Grid */}
      {filteredSections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Layers size={22} />
          </div>
          <h3 className="text-sm font-bold text-white">No {plural} Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No items match "${searchQuery}". Try a different keyword.`
              : `You haven't added any ${plural.toLowerCase()} yet. Click below to add your first one.`}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 mt-2 transition-colors"
            >
              <Plus size={13} />
              <span>Add First {singular}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((item) => {
            const meta = item.metadata_json || {};
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Image Showcase */}
                {item.icon_or_image ? (
                  <div className="h-36 w-full bg-slate-950 overflow-hidden relative">
                    <img
                      src={item.icon_or_image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.subtitle && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur border border-slate-700 text-[10px] font-mono font-bold text-amber-400">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-20 w-full bg-slate-950/60 flex items-center justify-between px-4 border-b border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Wrench size={18} />
                    </div>
                    {item.subtitle && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold text-amber-400">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-2 flex-1">
                  <h4 className="font-bold text-sm text-white line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {item.description || "No detailed description provided."}
                  </p>

                  {/* Metadata Tags */}
                  {Object.keys(meta).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {Object.entries(meta).map(([mKey, mVal]) => {
                        if (!mVal) return null;
                        return (
                          <span
                            key={mKey}
                            className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[10px] text-slate-300 font-medium"
                          >
                            <strong className="text-amber-400/90 capitalize">{mKey.replace(/_/g, " ")}:</strong> {mVal}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                    title="Toggle active display on website"
                  >
                    {item.is_active ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <AlertCircle size={13} /> Hidden
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Section Item Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  <Wrench size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    {editingItem ? `Edit ${singular}` : `Add New ${singular}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fill in details to showcase on your website's {label.toLowerCase()} section.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {fields.map((f) => {
                const val = formData[f.key] || "";
                if (f.type === "textarea") {
                  return (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">
                        {f.label} {f.required && <span className="text-rose-400">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        required={f.required}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  );
                }

                return (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">
                      {f.label} {f.required && <span className="text-rose-400">*</span>}
                    </label>
                    {f.type === "image" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={val}
                            onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                            placeholder={f.placeholder || "Paste image URL or click Browse"}
                            required={f.required}
                            className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          <SingleImageUploader
                            url={val}
                            onChange={(uploadedUrl) => setFormData({ ...formData, [f.key]: uploadedUrl })}
                            label="Browse"
                            className="w-24 h-9 shrink-0 bg-slate-800 border-slate-700 text-slate-200"
                          />
                        </div>
                        {val && (
                          <div className="h-20 w-32 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative">
                            <img src={val} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        required={f.required}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    )}
                  </div>
                );
              })}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                  data-testid="cms-save-custom-section-btn"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>{editingItem ? `Save Changes` : `Create ${singular}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
