import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";

export const FeedVideoPlayer = ({ src, poster, className = "", testId }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showOverlayIcon, setShowOverlayIcon] = useState(false);
  const [overlayType, setOverlayType] = useState("play"); // 'play' | 'pause'

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // IntersectionObserver to auto-play when >=60% in view and pause when scrolled away
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Pause all other video elements in the document so only 1 plays at a time
            document.querySelectorAll("video").forEach((v) => {
              if (v !== video) {
                v.pause();
              }
            });

            // Attempt autoplay
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {
                  // Fallback: browser required user gesture or muted state
                  video.muted = true;
                  setIsMuted(true);
                  video.play().then(() => setIsPlaying(true)).catch(() => {});
                });
            }
          } else {
            // Scrolled out of view -> pause video
            if (!video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        threshold: [0.1, 0.5, 0.8],
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const togglePlayPause = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // Pause other videos first
      document.querySelectorAll("video").forEach((v) => {
        if (v !== video) v.pause();
      });
      video.play().then(() => {
        setIsPlaying(true);
        setOverlayType("play");
        triggerOverlayIcon();
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      setOverlayType("pause");
      triggerOverlayIcon();
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const triggerOverlayIcon = () => {
    setShowOverlayIcon(true);
    setTimeout(() => {
      setShowOverlayIcon(false);
    }, 600);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group select-none overflow-hidden ${className}`}
      onClick={togglePlayPause}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        playsInline
        muted={isMuted}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain mx-auto max-h-[480px] lg:max-h-[540px] cursor-pointer"
        data-testid={testId}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none z-10">
          <Loader2 className="w-9 h-9 text-white animate-spin" />
        </div>
      )}

      {/* Quick Play/Pause Center Flash Animation */}
      {showOverlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in fade-in zoom-in-75 duration-150">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl">
            {overlayType === "play" ? (
              <Play size={32} className="fill-white translate-x-0.5" />
            ) : (
              <Pause size={32} className="fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div
        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex flex-col gap-2 opacity-90 group-hover:opacity-100 transition-opacity z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div
          className="w-full h-1.5 bg-white/30 hover:h-2.5 rounded-full cursor-pointer transition-all overflow-hidden relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs pt-0.5">
          <button
            type="button"
            onClick={togglePlayPause}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all active:scale-95"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause size={16} className="fill-white" />
            ) : (
              <Play size={16} className="fill-white translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all active:scale-95 flex items-center gap-1 text-[11px] font-semibold"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? (
              <>
                <VolumeX size={16} className="text-rose-400" />
                <span className="text-[10px] text-slate-200">Muted</span>
              </>
            ) : (
              <>
                <Volume2 size={16} className="text-emerald-400" />
                <span className="text-[10px] text-slate-200">Sound On</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
