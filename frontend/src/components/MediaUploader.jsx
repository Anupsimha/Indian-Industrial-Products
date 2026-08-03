import React, { useRef, useState } from "react";
import { uploadToCloudinary } from "../lib/cloudinary";
import { Upload, X, Loader2, ImagePlus, Film } from "lucide-react";
import { toast } from "sonner";

export const MediaUploader = ({
  value = [],          // array of {url, resource_type, thumbnail_url}
  onChange,            // (newArray) => void
  multiple = true,
  accept = "image/*,video/*",
  folder = "iip/uploads",
  maxItems = 8,
  label = "Upload media",
  testid = "media-uploader",
}) => {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      const arr = Array.from(files).slice(0, maxItems - value.length);
      const uploaded = [];
      for (const f of arr) {
        try {
          const result = await uploadToCloudinary(f, folder, (pct) => setProgress(pct));
          uploaded.push(result);
        } catch (e) {
          toast.error(e.message || `Failed: ${f.name}`);
        }
      }
      onChange?.([...value, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} file(s) uploaded`);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx) => onChange?.(value.filter((_, i) => i !== idx));

  return (
    <div data-testid={testid}>
      <div className="grid grid-cols-3 gap-2">
        {value.map((m, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100" data-testid={`${testid}-item-${i}`}>
            {m.resource_type === "video" ? (
              <div className="w-full h-full grid place-items-center bg-slate-900">
                {m.thumbnail_url ? (
                  <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover opacity-80" />
                ) : null}
                <Film size={24} className="absolute text-white" />
              </div>
            ) : (
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              data-testid={`${testid}-remove-${i}`}
              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < maxItems && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            data-testid={`${testid}-add-btn`}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 grid place-items-center text-slate-500 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1 p-2">
                <Loader2 size={20} className="animate-spin text-orange-600" />
                <span className="text-[10px] font-bold text-orange-600">{progress}%</span>
              </div>
            ) : (
              <>
                <ImagePlus size={20} />
                <span className="text-[10px] font-semibold mt-1">{label}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="mt-2.5 space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
            <span>Uploading media...</span>
            <span className="text-orange-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef} type="file" accept={accept} multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        data-testid={`${testid}-input`}
      />
    </div>
  );
};

export const SingleImageUploader = ({ url, onChange, label = "Upload", folder = "iip/uploads", testid = "single-uploader", className = "" }) => {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handle = async (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const r = await uploadToCloudinary(file, folder, (pct) => setProgress(pct));
      onChange?.(r.url);
      toast.success("Uploaded successfully");
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <button
      type="button"
      data-testid={testid}
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className={`relative inline-flex items-center justify-center text-xs font-semibold overflow-hidden border border-slate-200 rounded-lg ${className}`}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      <span className={`absolute inset-0 grid place-items-center bg-black/40 text-white transition-opacity ${url ? "opacity-0 hover:opacity-100" : "opacity-100"}`}>
        {uploading ? (
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Loader2 className="animate-spin" size={16} />
            <span>{progress}%</span>
          </div>
        ) : (
          <><Upload size={14} className="mr-1 inline" /> {label}</>
        )}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </button>
  );
};
