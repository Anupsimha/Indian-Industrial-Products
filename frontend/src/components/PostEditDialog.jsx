import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { MediaUploader } from "./MediaUploader";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { CATEGORIES } from "../lib/constants";

export const PostEditDialog = ({ open, onClose, post, onUpdated }) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState([]);
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && post) {
      setContent(post.content || "");
      setCategory(post.category || "");
      setGroupId(post.group_id || "");

      const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
        ? post.media_urls
        : (post.media_url ? [post.media_url] : []);

      const formattedMedia = urls.map((u) => {
        const clean = u.toLowerCase();
        const isVideo =
          clean.endsWith(".mp4") ||
          clean.endsWith(".webm") ||
          clean.endsWith(".mov") ||
          clean.includes("/video/upload/") ||
          post.media_type === "video";
        return {
          url: u,
          resource_type: isVideo ? "video" : "image",
          thumbnail_url: u,
        };
      });

      setMedia(formattedMedia);

      api.get("/industrial-groups")
        .then((r) => setGroups(r.data))
        .catch(() => {});
    }
  }, [open, post]);

  if (!open || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrls = media.map((m) => m.url).filter(Boolean);
      const hasVideo = media.some((m) => m.resource_type === "video");
      const firstMedia = mediaUrls[0] || null;

      const payload = {
        content: content.trim(),
        media_url: firstMedia,
        media_urls: mediaUrls,
        media_type: mediaUrls.length > 0 ? (hasVideo ? "video" : "image") : "text",
        category: category || null,
        group_id: groupId || null,
      };

      const res = await api.patch(`/posts/${post.id}`, payload);
      toast.success("Post updated successfully");
      onUpdated?.(res.data);
      onClose?.();
    } catch (err) {
      console.error("Failed to update post:", err);
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to update post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      data-testid="post-edit-dialog"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Edit Post</h3>
            <p className="text-xs text-slate-500">Update your post text, category, or media</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            data-testid="post-edit-dialog-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Share with
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              data-testid="post-edit-group-select"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            >
              <option value="">Everyone (Public Feed)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Post Content
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to update?"
              data-testid="post-edit-content-input"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="post-edit-category-input"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            >
              <option value="">Select Category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Attached Media
              </label>
              <span className="text-[11px] font-medium text-blue-800">
                Manage photos or add new ones (up to 10)
              </span>
            </div>
            <MediaUploader
              value={media}
              onChange={setMedia}
              accept="image/*,video/*"
              folder="iip/posts"
              multiple={true}
              maxItems={10}
              testid="post-edit-media"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="post-edit-save-btn"
              className="px-6 py-2.5 rounded-full bg-blue-900 text-white text-sm font-bold hover:bg-blue-950 disabled:opacity-60 inline-flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
