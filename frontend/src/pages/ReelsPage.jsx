import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, MapPin, ArrowLeft, Volume2, VolumeX, Pause, Play, Bookmark } from "lucide-react";
import api from "../lib/api";
import { whatsappLink } from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import { useAuth } from "../context/AuthContext";
import { EnquiryDialog } from "../components/EnquiryDialog";
import { toast } from "sonner";

const ReelItem = ({ reel, active, muted, onMuteToggle }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(reel.is_liked);
  const [likes, setLikes] = useState(reel.likes_count);
  const [saved, setSaved] = useState(reel.is_saved);
  const [following, setFollowing] = useState(reel.is_following);
  const [showEnq, setShowEnq] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef();

  useEffect(() => {
    if (!videoRef.current) return;
    if (active) {
      videoRef.current.muted = muted;
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
    }
  }, [active, muted]);

  const requireAuth = () => {
    if (!user) { window.location.href = "/login"; return false; }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth()) return;
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    try { await api.post(`/reels/${reel.id}/like`); } catch {}
  };

  const toggleSave = async (e) => {
    if (e) e.stopPropagation();
    if (!requireAuth()) return;
    const next = !saved;
    setSaved(next);
    try {
      const res = await api.post(`/reels/${reel.id}/save`);
      if (res.data.saved) {
        toast.success("Reel saved to bookmarks!", { duration: 3000 });
      } else {
        toast.info("Removed from saved feed", { duration: 3000 });
      }
    } catch {
      setSaved(!next);
      toast.error("Failed to update bookmark", { duration: 3000 });
    }
  };

  const toggleFollow = async () => {
    if (!requireAuth()) return;
    setFollowing((v) => !v);
    try { await api.post(`/companies/${reel.company_id}/follow`); } catch {}
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const onDoubleTap = (e) => {
    e.stopPropagation();
    if (!liked) toggleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 700);
  };

  const share = async () => {
    const url = `${window.location.origin}/company/${reel.company_id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.company_name, url });
      else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  return (
    <div
      className="reel-item relative w-full h-[100dvh] bg-black overflow-hidden"
      data-testid={`reel-item-${reel.id}`}
      onClick={togglePlay}
      onDoubleClick={onDoubleTap}
    >
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url}
        playsInline loop
        preload="auto"
        className="reel-video"
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onTimeUpdate={onTimeUpdate}
      />

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none" data-testid={`reel-buffering-${reel.id}`}>
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}

      {/* Pause overlay */}
      {!playing && !buffering && (
        <div className="absolute inset-0 grid place-items-center bg-black/30 pointer-events-none">
          <Play size={56} className="text-white drop-shadow-lg" />
        </div>
      )}

      {/* Double-tap heart pop */}
      {showHeart && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <Heart size={120} className="text-white fill-rose-500 drop-shadow-2xl heart-pop" />
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-white/15">
        <div className="h-full bg-orange-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* Bottom gradient + content */}
      <div className="absolute inset-x-0 bottom-0 pb-28 pt-20 px-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white pointer-events-none">
        <Link to={`/company/${reel.company_id}`} className="flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <img src={reel.company_logo} className="w-10 h-10 rounded-full ring-2 ring-white/40 object-cover" alt="" />
          <div className="min-w-0">
            <div className="font-display font-semibold text-[15px]">{reel.company_name}</div>
            <div className="text-xs text-white/70 flex items-center gap-1">
              <MapPin size={12} /> {reel.location}
            </div>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(); }}
            className={`ml-2 text-xs font-semibold rounded-full px-3 py-1 inline-flex items-center gap-1 ${
              following ? "bg-white/15 text-white" : "bg-orange-600 text-white"
            }`}
            data-testid={`reel-follow-${reel.id}`}
          >
            {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
            {following ? "Following" : "Follow"}
          </button>
        </Link>
        <p className="text-sm mt-3 leading-snug max-w-[80%]">{reel.content}</p>
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 text-white z-20">
        <button onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} data-testid={`reel-mute-${reel.id}`} className="flex flex-col items-center active:scale-95">
          <span className={`grid place-items-center w-11 h-11 rounded-full ${muted ? "bg-white/15" : "bg-orange-600"} backdrop-blur-sm`}>
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} className="animate-pulse" />}
          </span>
          <span className="text-xs mt-1">{muted ? "Tap for sound" : "Sound on"}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleLike(); }} data-testid={`reel-like-${reel.id}`} className="flex flex-col items-center active:scale-95">
          <Heart size={28} className={liked ? "fill-rose-500 text-rose-500" : ""} />
          <span className="text-xs mt-1">{likes}</span>
        </button>
        <button data-testid={`reel-comment-${reel.id}`} className="flex flex-col items-center active:scale-95" onClick={(e) => { e.stopPropagation(); setShowEnq(true); }}>
          <MessageCircle size={28} />
          <span className="text-xs mt-1">{reel.comments_count}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); share(); }} data-testid={`reel-share-${reel.id}`} className="flex flex-col items-center active:scale-95">
          <Share2 size={28} />
          <span className="text-xs mt-1">Share</span>
        </button>
        <button onClick={toggleSave} data-testid={`reel-save-${reel.id}`} className="flex flex-col items-center active:scale-95">
          <Bookmark size={28} className={saved ? "fill-blue-400 text-blue-400" : ""} />
          <span className="text-xs mt-1">Save</span>
        </button>
        <a
          href={whatsappLink(reel.whatsapp, `Hi! I saw your reel: "${reel.content.slice(0, 80)}"`)}
          target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          data-testid={`reel-whatsapp-${reel.id}`}
          className="flex flex-col items-center text-[#25D366]"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91a9.84 9.84 0 0 0-2.91-7z"/></svg>
          <span className="text-xs mt-1 text-white">Chat</span>
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); setShowEnq(true); }}
          data-testid={`reel-enquiry-${reel.id}`}
          className="flex flex-col items-center active:scale-95"
        >
          <span className="grid place-items-center w-12 h-12 rounded-full bg-orange-600 text-white font-bold text-xs shadow-lg shadow-black/40">
            ENQ
          </span>
          <span className="text-xs mt-1">Enquiry</span>
        </button>
      </div>

      <EnquiryDialog
        open={showEnq}
        onClose={() => setShowEnq(false)}
        companyId={reel.company_id}
        companyName={reel.company_name}
      />
    </div>
  );
};

export default function ReelsPage() {
  const [reels, setReels] = useState([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef();

  useEffect(() => {
    api.get("/reels").then((r) => setReels(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const onScroll = () => {
      const idx = Math.round(containerRef.current.scrollTop / window.innerHeight);
      setActive(idx);
    };
    const el = containerRef.current;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [reels.length]);

  return (
    <div className="fixed inset-0 bg-black z-20" data-testid="reels-page">
      <Link
        to="/"
        className="absolute top-3 left-3 z-30 grid place-items-center w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm text-white"
        data-testid="reels-back-btn"
      >
        <ArrowLeft size={20} />
      </Link>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 text-white font-display font-bold">
        Reels
      </div>
      <div ref={containerRef} className="reels-container h-full overflow-y-scroll">
        {reels.map((r, i) => (
          <ReelItem
            key={r.id}
            reel={r}
            active={i === active}
            muted={muted}
            onMuteToggle={() => setMuted((m) => !m)}
          />
        ))}
        {reels.length === 0 && (
          <div className="h-full grid place-items-center text-white/70 text-sm">No reels yet.</div>
        )}
      </div>
    </div>
  );
}
