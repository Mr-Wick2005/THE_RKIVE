'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Film } from 'lucide-react';
import { ArchiveReelConfig } from '@/types/cms';

interface HeroVideoLoopProps {
  config?: ArchiveReelConfig;
}

export function HeroVideoLoop({ config }: HeroVideoLoopProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(config?.muted_default ?? true);
  const [isLoaded, setIsLoaded] = useState(false);

  const videoSrc = config?.video_url || '/hero-loop-video.mp4';
  const badgeTitle = config?.badge_title || 'THE RKIVE // ARCHIVE REEL';
  const loopTagText = config?.loop_tag_text || 'CONTINUOUS LOOP';
  const showFullscreen = config?.show_fullscreen_button !== false;

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Autoplay policy prevented playback, keep muted and retry on click
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current || videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-xl lg:max-w-2xl mx-auto"
    >
      {/* Background aesthetic decorative shadow card */}
      <div className="absolute -inset-1.5 bg-[#1B44B8] translate-x-2 translate-y-2 -z-10 hidden sm:block border-2 border-[#1A1A1A]" />

      {/* Main Archival Video Frame */}
      <div
        ref={containerRef}
        className="relative bg-[#FAF7F2] border-2 border-[#1A1A1A] p-2.5 sm:p-4 shadow-[6px_6px_0px_#1A1A1A] transition-all group"
      >
        {/* Top Archival Bar */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b-2 border-[#1A1A1A] text-[#1A1A1A] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C24A26] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C24A26]" />
            </span>
            <span className="font-bold tracking-wider uppercase flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Film className="w-3.5 h-3.5 text-[#1B44B8]" />
              {badgeTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#1A1A1A] text-[#FAF7F2] text-[10px] uppercase font-bold tracking-widest">
              {loopTagText}
            </span>

            {/* Quick Audio Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute video' : 'Mute video'}
              className="p-1 hover:bg-[#1A1A1A] hover:text-[#FAF7F2] border border-[#1A1A1A] transition-colors rounded-none"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#1B44B8]" />
              )}
            </button>

            {/* Fullscreen Button */}
            {showFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Full screen preview"
                className="p-1 hover:bg-[#1A1A1A] hover:text-[#FAF7F2] border border-[#1A1A1A] transition-colors rounded-none hidden xs:block"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Video Canvas Container */}
        <div
          onClick={togglePlay}
          className="relative overflow-hidden border-2 border-[#1A1A1A] bg-[#0A0A0A] aspect-video cursor-pointer group/player"
        >
          <video
            ref={videoRef}
            autoPlay={config?.auto_play ?? true}
            loop={config?.loop ?? true}
            muted={isMuted}
            playsInline
            preload="auto"
            onLoadedData={() => setIsLoaded(true)}
            className="w-full h-full object-cover sm:object-contain bg-black"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>

          {/* Subtle Corner Registration Crosshairs */}
          <div className="absolute top-2 left-2 text-[#FAF7F2]/60 font-mono text-[9px] pointer-events-none select-none">
            +
          </div>
          <div className="absolute top-2 right-2 text-[#FAF7F2]/60 font-mono text-[9px] pointer-events-none select-none">
            +
          </div>
          <div className="absolute bottom-2 left-2 text-[#FAF7F2]/60 font-mono text-[9px] pointer-events-none select-none">
            +
          </div>
          <div className="absolute bottom-2 right-2 text-[#FAF7F2]/60 font-mono text-[9px] pointer-events-none select-none">
            +
          </div>

          {/* Center Play Overlay on Pause */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-all">
              <div className="p-3.5 bg-[#FAF7F2] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <Play className="w-4 h-4 fill-[#1A1A1A]" />
                <span>Resume Reel</span>
              </div>
            </div>
          )}

          {/* Hover Play/Pause Quick Control Hint */}
          <div className="absolute bottom-2 right-2 bg-[#1A1A1A]/80 backdrop-blur-sm text-[#FAF7F2] px-2 py-1 text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover/player:opacity-100 transition-opacity pointer-events-none flex items-center gap-1.5 border border-white/20">
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-white" />
                <span>Click to Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white" />
                <span>Click to Play</span>
              </>
            )}
          </div>
        </div>

        {/* Bottom Archival Metadata Caption */}
        <div className="mt-2.5 pt-2 border-t border-[#1A1A1A]/30 flex flex-wrap items-center justify-between text-[#3E3C38] text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#C24A26]" />
            <span className="font-semibold text-[#1A1A1A]">Curated Periodicals & Digital Editions</span>
          </div>
          <div className="text-[10px] text-[#76736C] uppercase tracking-wider font-semibold">
            CATALOG ID: RK-2026 // LIVE
          </div>
        </div>
      </div>
    </motion.div>
  );
}
