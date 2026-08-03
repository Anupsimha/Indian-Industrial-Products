import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Building2, MapPin, Phone, Camera, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { SingleImageUploader } from "../components/MediaUploader";

export default function CompleteProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  const isSeller = user && (user.role === "manufacturer" || user.role === "supplier");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.patch("/auth/me", {
        name,
        mobile,
        avatar_url: avatarUrl
      });

      if (res.data) {
        updateUser(res.data);
      }
      toast.success("Profile setup complete! Welcome to IIP Platform.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save profile settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" data-testid="complete-profile-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={14} /> Account Email Verified
            </div>
            <h2 className="font-display text-2xl font-black text-slate-900">Complete Your Profile</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add your photo and details so buyers and industrial partners can connect with you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <SingleImageUploader
                value={avatarUrl}
                onChange={(url) => setAvatarUrl(url)}
                label="Photo"
                folder="iip/avatars"
                testid="complete-profile-avatar"
                className="w-24 h-24 rounded-full border-4 border-slate-100 ring-4 ring-blue-50 bg-slate-100 shadow-md"
              />
              <span className="text-[11px] text-slate-400 font-medium">Click camera icon to upload photo</span>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="complete-profile-name-input"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. Rajesh Sharma"
              />
            </div>

            {/* Mobile Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                data-testid="complete-profile-mobile-input"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. +91 9876543210"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              data-testid="complete-profile-submit-btn"
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-800 text-white font-bold text-sm hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span>Saving Setup...</span>
              ) : (
                <>
                  <span>Finish &amp; Explore Marketplace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
