import React, { useEffect, useState } from "react";
import { X, Briefcase, MapPin, Banknote, FileText } from "lucide-react";
import { MediaUploader } from "./MediaUploader";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

export const PostDialog = ({ open, onClose, onSaved }) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState([]);
  const [category, setCategory] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setContent(""); setMedia([]); setCategory(""); setGroupId("");
      api.get("/industrial-groups").then((r) => setGroups(r.data)).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const first = media[0];
      const payload = {
        content,
        media_url: first?.url || null,
        media_type: first ? (first.resource_type === "video" ? "video" : "image") : "text",
        category: category || null,
        group_id: groupId || null,
      };
      await api.post("/posts", payload);
      toast.success("Post published");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" data-testid="post-dialog" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg text-slate-900">New Post</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" data-testid="post-dialog-close"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Share with</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              data-testid="post-group-select"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white font-medium"
            >
              <option value="">Everyone (Public Feed)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.location})
                </option>
              ))}
            </select>
          </div>
          <textarea
            required rows={4} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, project, or news..."
            data-testid="post-content-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            data-testid="post-category-input"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Media (optional)</label>
            <div className="mt-2">
              <MediaUploader value={media} onChange={setMedia} accept="image/*,video/*" folder="iip/posts" maxItems={1} testid="post-media" />
            </div>
          </div>
          <button type="submit" disabled={submitting} data-testid="post-save-btn"
            className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60">
            {submitting ? "Publishing..." : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
};


import { Film, Upload, Loader2 } from "lucide-react";

export const ReelDialog = ({ open, onClose, onSaved }) => {
  const [content, setContent] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [useDemo, setUseDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      setContent("");
      setVideoFile(null);
      setUseDemo(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!videoFile && !useDemo) {
      toast.error("Please select a video or use the demo video");
      return;
    }
    
    if (videoFile && videoFile.size > 100 * 1024 * 1024) {
      toast.error("Video size must be less than 100 MB");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      if (videoFile) {
        formData.append("file", videoFile);
      }
      if (useDemo) {
        formData.append("use_demo", "true");
      }

      await api.post("/reels", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Reel uploaded successfully!");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to upload reel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" data-testid="reel-dialog" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg text-slate-900">New Reel</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" data-testid="reel-dialog-close"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <textarea required rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Caption" data-testid="reel-content-input" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Video File</label>
            
            {useDemo ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center shrink-0 text-white">
                    <Film size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">Video Project.mp4 (Demo)</div>
                    <div className="text-[10px] text-blue-600 font-semibold">Loaded from Downloads</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseDemo(false)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : videoFile ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-orange-600">
                    <Film size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{videoFile.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-200 hover:border-orange-500 hover:bg-orange-50/20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-slate-500 group"
                >
                  <Upload size={24} className="text-slate-400 group-hover:text-orange-500" />
                  <span className="text-xs font-bold text-slate-700">Choose Video File</span>
                  <span className="text-[10px] text-slate-400">Max size: 10 MB (MP4, WebM)</span>
                </button>
                
                <div className="relative flex py-1.5 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setUseDemo(true)}
                  className="w-full py-3 bg-blue-50 border border-blue-100 text-blue-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all active:scale-98"
                >
                  ✨ Use Local Demo Video
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 100 * 1024 * 1024) {
                    toast.error("Video size must be less than 100 MB");
                    return;
                  }
                  setVideoFile(file);
                }
              }}
            />
          </div>

          <button type="submit" disabled={submitting} data-testid="reel-save-btn" className="w-full py-3.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-95 shadow-md">
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Publishing Reel...
              </>
            ) : (
              "Publish Reel"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};


export const JobDialog = ({ open, onClose, onSaved, jobToEdit = null }) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Full Time");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (jobToEdit) {
        setTitle(jobToEdit.title || "");
        setLocation(jobToEdit.location || "");
        setSalary(jobToEdit.salary || "");
        setDescription(jobToEdit.description || "");
        setType(jobToEdit.type || "Full Time");
      } else {
        setTitle("");
        setLocation("");
        setSalary("");
        setDescription("");
        setType("Full Time");
      }
    }
  }, [open, jobToEdit]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title,
        location,
        salary: salary || null,
        description,
        type,
      };
      if (jobToEdit) {
        await api.patch(`/jobs/${jobToEdit.id}`, payload);
        toast.success("Vacancy updated successfully!");
      } else {
        await api.post("/jobs", payload);
        toast.success("Vacancy published successfully!");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to save vacancy");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in" 
      onClick={onClose}
      data-testid="job-dialog"
    >
      <div 
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-slate-700" 
            data-testid="job-dialog-close"
          >
            <X size={20} />
          </button>
          <h3 className="font-display font-bold text-lg text-slate-950 absolute left-1/2 -translate-x-1/2">
            {jobToEdit ? "Edit Vacancy" : "Post Vacancy"}
          </h3>
          <div className="w-8 h-8" />
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Job Title */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Briefcase size={18} />
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title (e.g. Mechanical Design Eng)"
              data-testid="job-title-input"
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin size={18} />
            </span>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (City, State)"
              data-testid="job-location-input"
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Salary Range */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Banknote size={18} />
            </span>
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Salary range (optional, e.g. ₹6-9 LPA)"
              data-testid="job-salary-input"
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Job Description */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <FileText size={18} />
            </span>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Job description"
              data-testid="job-description-input"
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Job Type Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Type</label>
            <div className="flex flex-wrap gap-2">
              {["Full Time", "Part Time", "Contract", "Internship"].map((t) => {
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-blue-800 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    data-testid={`job-type-chip-${t.toLowerCase().replace(" ", "-")}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={submitting}
            data-testid="job-save-btn"
            className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60 transition-colors shadow-md mt-4"
          >
            {submitting ? "Publishing..." : jobToEdit ? "Update Vacancy" : "Publish Vacancy"}
          </button>
        </form>
      </div>
    </div>
  );
};
