import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Bookmark, MessageCircle, MapPin, MoreHorizontal, UserPlus, UserCheck, Send, Share2, Trash2 } from "lucide-react";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import { useAuth } from "../context/AuthContext";
import { EnquiryDialog } from "./EnquiryDialog";

export const PostCard = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const isOwnPost = user && user.company_id === post.company_id;
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [views, setViews] = useState(post.views_count || 0);
  const [saved, setSaved] = useState(post.is_saved);
  const [following, setFollowing] = useState(post.is_following);
  const [popping, setPopping] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const requireAuth = () => {
    if (!user) { window.location.href = "/login"; return false; }
    return true;
  };

  useEffect(() => {
    if (showComments) {
      api.get(`/posts/${post.id}/comments`).then((r) => setComments(r.data)).catch(() => {});
    }
  }, [showComments, post.id]);

  useEffect(() => {
    if (post?.id) {
      const sessionKey = `viewed_post_${post.id}`;
      const alreadyViewedInSession = sessionStorage.getItem(sessionKey);
      if (alreadyViewedInSession) return;

      sessionStorage.setItem(sessionKey, "1");
      api
        .post(`/posts/${post.id}/view`)
        .then((res) => {
          if (res.data && res.data.views_count !== undefined) {
            setViews(res.data.views_count);
          }
        })
        .catch(() => {});
    }
  }, [post?.id]);

  const toggleLike = async () => {
    if (!requireAuth()) return;
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    try { await api.post(`/posts/${post.id}/like`); } catch {}
    onUpdate?.();
  };

  const toggleSave = async () => {
    if (!requireAuth()) return;
    setSaved((v) => !v);
    try { await api.post(`/posts/${post.id}/save`); } catch {}
  };

  const toggleFollow = async () => {
    if (!requireAuth()) return;
    setFollowing((v) => !v);
    try { await api.post(`/companies/${post.company_id}/follow`); } catch {}
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!requireAuth() || !commentText.trim()) return;
    try {
      const { data } = await api.post(`/posts/${post.id}/comments`, { text: commentText.trim() });
      setComments((arr) => [data, ...arr]);
      setCommentText("");
    } catch {}
  };

  return (
    <article
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-up hover:shadow-md hover:border-slate-300 transition-all"
      data-testid={`post-card-${post.id}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4">
        <Link to={`/company/${post.company_id}`} className="shrink-0">
          <img
            src={post.company_logo}
            alt={post.company_name}
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover ring-2 ring-blue-50 transition-all"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/company/${post.company_id}`}
            className="font-display font-semibold text-[15px] lg:text-base text-slate-900 hover:text-blue-800 truncate block"
            data-testid={`post-company-${post.id}`}
          >
            {post.company_name}
          </Link>
          <div className="flex items-center gap-1 text-xs lg:text-sm text-slate-500">
            <MapPin size={12} className="lg:scale-110" />
            <span className="truncate">{post.location}</span>
            {post.category && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] lg:text-xs font-semibold">
                {post.category}
              </span>
            )}
          </div>
        </div>
        {isOwnPost ? (
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete this post?")) {
                try {
                  await api.delete(`/posts/${post.id}`);
                  toast.success("Post deleted successfully");
                  onUpdate?.();
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to delete post");
                }
              }
            }}
            className="text-xs lg:text-sm font-semibold rounded-full px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} className="lg:scale-110" />
            <span>Delete</span>
          </button>
        ) : (
          <button
            onClick={toggleFollow}
            data-testid={`post-follow-${post.id}`}
            className={`text-xs lg:text-sm font-semibold rounded-full px-3 py-1.5 lg:px-4 lg:py-2 inline-flex items-center gap-1 transition-colors ${
              following
                ? "bg-slate-100 text-slate-700"
                : "bg-blue-800 text-white hover:bg-blue-900"
            }`}
          >
            {following ? <UserCheck size={14} className="lg:scale-110" /> : <UserPlus size={14} className="lg:scale-110" />}
            {following ? "Following" : "Follow"}
          </button>
        )}
        <button className="p-1 text-slate-400 hover:text-slate-700" aria-label="More">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Content */}
      <p className="px-4 pb-3 lg:px-5 lg:pb-4 text-sm lg:text-base text-slate-800 leading-relaxed">
        {post.content}
      </p>

      {post.media_url && post.media_type === "image" && (
        <button
          onDoubleClick={toggleLike}
          className="block w-full"
          aria-label="Open media"
        >
          <img
            src={optimizedUrl(post.media_url, { w: 800 })}
            alt=""
            className="w-full max-h-[420px] lg:max-h-[500px] object-cover bg-slate-100 transition-all"
          />
        </button>
      )}
      {post.media_url && post.media_type === "video" && (
        <video
          src={post.media_url}
          controls
          className="w-full max-h-[480px] lg:max-h-[540px] bg-black transition-all"
          data-testid={`post-video-${post.id}`}
        />
      )}

      {/* Dual Row Action Bar */}
      <div className="border-t border-slate-100 bg-white">
        {/* Row 1: Stats & Save */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 text-[11px] sm:text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span>👁️</span> {views}
            </span>
            <span className="flex items-center gap-1">
              <span>❤️</span> {likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <span>💬</span> {comments.length || post.comments_count || 0}
            </span>
          </div>
          <button
            onClick={toggleSave}
            data-testid={`post-save-${post.id}`}
            className="text-slate-400 hover:text-blue-800 transition-colors"
            aria-label="Save"
          >
            <Bookmark size={16} className={saved ? "fill-blue-800 text-blue-800" : ""} />
          </button>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Like */}
            <button
              onClick={toggleLike}
              data-testid={`post-like-${post.id}`}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                liked ? "text-rose-600 bg-rose-50" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Heart
                size={15}
                className={`${liked ? "fill-rose-600 text-rose-600" : ""} ${popping ? "heart-pop" : ""}`}
              />
              <span>Like</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => setShowComments((v) => !v)}
              data-testid={`post-comment-${post.id}`}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <MessageCircle size={15} />
              <span>Comment</span>
            </button>

            {/* Share */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.company_name,
                    text: post.content,
                    url: window.location.href,
                  }).then(() => {}).catch(() => {});
                } else {
                  navigator.clipboard.writeText(`${window.location.origin}/company/${post.company_id}`);
                  toast.success("Link copied to clipboard!");
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>
            {/* WhatsApp */}
            {!isOwnPost && (
              <a
                href={whatsappLink(post.whatsapp, `Hi! I am interested in your post: "${post.content.slice(0, 80)}"`)}
                target="_blank"
                rel="noreferrer"
                data-testid={`post-whatsapp-${post.id}`}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[#25D366] hover:bg-green-50/50 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91a9.84 9.84 0 0 0-2.91-7zM12.05 20.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.39.11-.51.12-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14 0-.31-.02-.47-.02s-.43.06-.66.31c-.23.35-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.16 1.76 2.69 4.27 3.77.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.18-.48-.3z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          {!isOwnPost && (
            <button
              onClick={() => setEnquiryOpen(true)}
              data-testid={`post-enquiry-${post.id}`}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-sm transition-colors"
            >
              Enquiry
            </button>
          )}
        </div>
      </div>

      <EnquiryDialog
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        companyId={post.company_id}
        postId={post.id}
        defaultCategory={post.category}
        companyName={post.company_name}
      />

      {showComments && (
        <div className="border-t border-slate-100 px-3 py-3 lg:px-5 lg:py-4 bg-slate-50/60" data-testid={`post-comments-${post.id}`}>
          <form onSubmit={submitComment} className="flex items-center gap-2">
            <input
              value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              data-testid={`post-comment-input-${post.id}`}
              className="flex-1 rounded-full bg-white border border-slate-300 px-3 py-1.5 lg:px-4 lg:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button type="submit" data-testid={`post-comment-submit-${post.id}`} className="p-2 rounded-full bg-blue-800 text-white hover:bg-blue-900 transition-colors"><Send size={14} /></button>
          </form>
          <ul className="mt-3 space-y-2">
            {comments.map((cm) => (
              <li key={cm.id} className="flex items-start gap-2">
                <img src={cm.user_avatar || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80"} alt="" className="w-6 h-6 rounded-full object-cover" />
                <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm">
                  <div className="font-semibold text-slate-900">{cm.user_name}</div>
                  <div className="text-slate-700">{cm.text}</div>
                </div>
              </li>
            ))}
            {comments.length === 0 && <li className="text-xs lg:text-sm text-slate-400">No comments yet. Be the first!</li>}
          </ul>
        </div>
      )}
    </article>
  );
};
