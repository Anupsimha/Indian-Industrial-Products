import React, { useState, useEffect } from "react";
import { X, User, Phone, Save, Camera } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { SingleImageUploader } from "./MediaUploader";

export const UserEditDialog = ({ open, onClose, user, onSaved }) => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState("manufacturer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setMobile(user.mobile || "");
      setAvatarUrl(user.avatar_url || "");
      setRole(user.role || "manufacturer");
    }
  }, [user]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch("/auth/me", {
        name,
        mobile,
        avatar_url: avatarUrl,
        role
      });
      toast.success("Profile updated successfully!");
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" data-testid="user-edit-dialog">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="text-blue-800" size={20} />
            <h3 className="font-display font-bold text-slate-900 text-base">Edit User Profile</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <SingleImageUploader
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              label="Avatar"
              folder="iip/avatars"
              testid="edit-user-avatar-uploader"
              className="w-20 h-20 rounded-full border-2 border-slate-200 ring-2 ring-blue-50 bg-slate-100"
            />
            <span className="text-[10px] text-slate-400 font-medium">Click camera icon to change photo</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="edit-user-name-input"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mobile Number</label>
            <input
              type="text"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              data-testid="edit-user-mobile-input"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              data-testid="edit-user-role-select"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="manufacturer">Manufacturer</option>
              <option value="supplier">Supplier</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="edit-user-save-btn"
              className="px-5 py-2 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
