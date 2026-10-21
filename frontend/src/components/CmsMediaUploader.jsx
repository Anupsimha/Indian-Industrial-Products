import React, { useRef, useState } from "react";
import { UploadCloud, Image, X, Loader2, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

/**
 * CmsMediaUploader
 * Dedicated photo uploader for CMS Admin Panel:
 * - Direct drag & drop or file browse to upload photos directly to server storage (/api/upload).
 * - Saves server path (/api/uploads/{filename}) in the database.
 * - Displays instant preview, upload progress, replace & remove actions.
 * - Optional collapsible link input for external image URLs.
 */
export default function CmsMediaUploader({
  value = "",
  onChange,
  label = "Upload Photo",
  required = false,
  folder = "iip/uploads",
  className = ""
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate image MIME type
    if (!file.type || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WEBP, GIF, SVG).");
      return;
    }

    // Check size limit (max 20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Image exceeds 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("resource_type", "image");

    try {
      const res = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(pct);
          }
        }
      });

      const serverUrl = res.data?.url || res.data?.secure_url;
      if (serverUrl) {
        onChange?.(serverUrl);
        toast.success("Photo uploaded to server successfully!");
      } else {
        throw new Error("No URL returned from server.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Failed to upload photo to server.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className={`space-y-2 ${className}`} data-testid="cms-media-uploader">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Main Upload / Preview State */}
      {value ? (
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-3 flex items-center gap-3.5 group overflow-hidden">
          {/* Thumbnail Preview */}
          <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative">
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <CheckCircle2 size={13} />
              <span>Photo Attached</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs" title={value}>
              {value}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                Change Photo
              </button>
              <button
                type="button"
                onClick={() => onChange?.("")}
                disabled={uploading}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
              >
                <X size={12} />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center gap-2.5 ${
            dragOver
              ? "border-amber-400 bg-amber-400/5 shadow-inner"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950"
          }`}
        >
          {uploading ? (
            <div className="py-2 space-y-2 flex flex-col items-center">
              <Loader2 className="animate-spin text-amber-400" size={28} />
              <div className="space-y-0.5 text-center">
                <p className="text-xs font-bold text-white">Uploading photo to server...</p>
                <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5 mx-auto">
                  <div
                    className="h-full bg-amber-400 transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{progress}%</span>
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Click to upload photo or drag &amp; drop
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPEG, PNG, WEBP, SVG up to 20MB (stored securely on server)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alternative External Link Toggle */}
      <div className="pt-0.5 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-slate-400 hover:text-amber-400 font-medium inline-flex items-center gap-1 transition-colors"
        >
          <Link2 size={12} />
          <span>{showUrlInput ? "Hide external link option" : "Or enter external image URL"}</span>
        </button>
        {required && !value && (
          <span className="text-[10px] text-rose-400 font-semibold">* Photo required</span>
        )}
      </div>

      {showUrlInput && (
        <div className="pt-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="https://example.com/photo.jpg or /api/uploads/photo.jpg"
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      )}
    </div>
  );
}
