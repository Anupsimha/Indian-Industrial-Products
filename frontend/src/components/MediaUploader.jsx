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

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, maxItems - value.length);
      const uploaded = [];
      for (const f of arr) {
        try {
          const result = await uploadToCloudinary(f, folder);
          uploaded.push(result);
        } catch (e) {
          toast.error(e.message || `Failed: ${f.name}`);
        }
      }
      onChange?.([...value, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} file(s) uploaded`);
    } finally {
      setUploading(false);
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
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[10px] font-semibold mt-1">{label}</span>
          </button>
        )}
      </div>
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

  const handle = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadToCloudinary(file, folder);
      onChange?.(r.url);
      toast.success("Uploaded successfully");
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
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
        {uploading ? <Loader2 className="animate-spin" size={18} /> : <><Upload size={14} className="mr-1 inline" /> {label}</>}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </button>
  );
};
