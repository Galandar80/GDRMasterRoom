"use client";

import { CalendarDays, Eye, ImageIcon, LockKeyhole, Volume2, VolumeX, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Scene, Npc } from "@/lib/types";
import { shortTime } from "@/lib/utils";
import { playUiClick, playUiHover } from "@/lib/sound-generator";

type SceneStageProps = {
  scene: Scene;
  compact?: boolean;
  /** Volume (0-100) of the room's current audio track — master only */
  audioVolume?: number;
  audioMuted?: boolean;
  audioTitle?: string;
  onAudioVolumeChange?: (vol: number) => void;
  onAudioMutedChange?: (muted: boolean) => void;
  activeSpotlightNpc?: Npc | null;
};

// Weather effects removed

export function SceneStage({ scene, compact = false, audioVolume = 55, audioMuted = false, audioTitle, onAudioVolumeChange, onAudioMutedChange, activeSpotlightNpc }: SceneStageProps) {
  const [displayScene, setDisplayScene] = useState(scene);
  const [prevScene, setPrevScene] = useState<Scene | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCollapsed(window.innerWidth < 1024);
    }
  }, []);

  // Auto-expand scene stage when spotlight NPC is active
  useEffect(() => {
    if (activeSpotlightNpc) {
      setIsCollapsed(false);
    }
  }, [activeSpotlightNpc]);

  useEffect(() => {
    if (scene.id !== displayScene.id) {
      setPrevScene(displayScene);
      setDisplayScene(scene);
      setIsFading(true);
    }
  }, [scene, displayScene]);

  useEffect(() => {
    if (isFading) {
      const timer = setTimeout(() => {
        setIsFading(false);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isFading]);

  useEffect(() => {
    if (prevScene) {
      const timer = setTimeout(() => {
        setPrevScene(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [prevScene]);

  const isVideo = displayScene.media_type === "video";
  const mediaUrl = isVideo ? displayScene.video_url || displayScene.image_url : displayScene.image_url;
  const mediaClassName = compact
    ? "scene-stage-media aspect-video max-h-[22rem] w-full"
    : "scene-stage-media aspect-video w-full";

  const prevIsVideo = prevScene?.media_type === "video";
  const prevMediaUrl = prevScene ? (prevIsVideo ? prevScene.video_url || prevScene.image_url : prevScene.image_url) : null;

  if (isCollapsed) {
    return (
      <section className={`scene-stage glass-panel overflow-hidden rounded-lg ${compact ? "scene-stage--compact" : ""} scene-stage--collapsed`}>
        <div className="flex items-center justify-between px-4 py-3 bg-black/25">
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded bg-brass/10 border border-brass/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brass flex items-center gap-1 shrink-0">
              <Eye size={10} /> Scena
            </span>
            {displayScene.visibility === "private" ? (
              <span className="rounded bg-amber-500/10 border border-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1 shrink-0">
                <LockKeyhole size={10} /> Privata
              </span>
            ) : null}
            <span className="font-serif text-sm font-semibold text-stone-200 truncate">
              {displayScene.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playUiClick();
              setIsCollapsed(false);
            }}
            className="text-[9px] font-serif uppercase tracking-widest text-brass hover:text-white px-2.5 py-1 rounded border border-brass/35 bg-brass/5 hover:bg-brass/15 transition flex items-center gap-1 shrink-0"
          >
            Espandi
          </button>
        </div>
        <span className="mysterium-corners-br" />
      </section>
    );
  }

  return (
    <section className={`scene-stage glass-panel overflow-hidden rounded-lg ${compact ? "scene-stage--compact" : ""}`}>
      <div className="scene-stage-badge">
        <Eye size={13} /> {isVideo ? "Video scena" : "Scena attuale"}
      </div>
      {displayScene.visibility === "private" ? (
        <div className="scene-stage-private-badge">
          <LockKeyhole size={13} /> Privata
        </div>
      ) : null}

      <div className="relative w-full aspect-video overflow-hidden bg-ink-950">
        {/* Floating HUD Controls — only shown when master passes audio props */}
        {onAudioVolumeChange ? (
          <div
            className="absolute top-2 right-2 z-30 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1.5 backdrop-blur-md border border-white/10 transition-all"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={() => { onAudioMutedChange?.(!audioMuted); playUiClick(); }}
              onMouseEnter={playUiHover}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-white/10 hover:text-white ${audioMuted ? "text-ember-400" : "text-slate-300"}`}
              title={audioMuted ? "Riattiva audio scena" : "Silenzia audio scena"}
            >
              {audioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            {showVolumeSlider && (
              <>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioMuted ? 0 : audioVolume}
                  onChange={(e) => {
                    onAudioMutedChange?.(false);
                    onAudioVolumeChange(Number(e.target.value));
                    playUiClick();
                  }}
                  className="w-20 accent-ember-500"
                  aria-label="Volume traccia audio scena"
                />
                <span className="shrink-0 text-xs tabular-nums text-slate-300">{audioMuted ? 0 : audioVolume}%</span>
                {audioTitle && (
                  <span className="max-w-[7rem] truncate text-xs text-slate-400 italic">{audioTitle}</span>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* Layer della scena precedente (sfondo solido su cui sfuma la nuova) */}
        {prevScene && prevMediaUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
            {prevIsVideo ? (
              <video
                className="w-full h-full object-cover bg-black"
                src={prevMediaUrl}
                autoPlay
                muted
                loop={prevScene.loop_video !== false}
                playsInline
              />
            ) : (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${prevMediaUrl})` }}
              />
            )}
          </div>
        )}

        {/* Layer della scena attiva */}
        <div className={`scene-stage-active-wrap absolute inset-0 z-10 transition-opacity duration-700 ease-in-out ${isFading ? "opacity-0" : "opacity-100"} w-full h-full`}>
          {isVideo ? (
            <video
              className="w-full h-full object-cover bg-black"
              src={mediaUrl}
              aria-label={displayScene.title}
              autoPlay
              muted
              loop={displayScene.loop_video !== false}
              playsInline
              controls={displayScene.loop_video === false}
            />
          ) : (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${mediaUrl})` }}
              aria-label={displayScene.title}
            />
          )}
        </div>

        {/* Spotlight NPC Dialogue Box */}
        {activeSpotlightNpc && (
          <div className="absolute bottom-4 left-4 z-30 max-w-[85%] sm:max-w-[24rem] rounded-xl border border-brass/45 bg-black/85 p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-slide-up">
            {activeSpotlightNpc.portrait_url ? (
              <span
                className="h-14 w-14 shrink-0 rounded-lg border border-brass/35 bg-cover bg-center shadow"
                style={{ backgroundImage: `url(${activeSpotlightNpc.portrait_url})` }}
              />
            ) : (
              <span className="h-14 w-14 shrink-0 rounded-lg border border-brass/35 bg-black/50 flex items-center justify-center text-brass/40 bg-brass/5">
                <Sparkles size={20} />
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-brass font-bold">In conversazione</span>
              <strong className="block text-sm font-serif mt-0.5" style={{ color: activeSpotlightNpc.color }}>{activeSpotlightNpc.name}</strong>
              <p className="text-[11px] text-stone-300 italic truncate mt-1">
                &ldquo;{activeSpotlightNpc.description}&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="scene-stage-caption border-t border-white/10 bg-ink-900/75 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="scene-meta-chip inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              <ImageIcon size={13} /> {isVideo ? "Video scena" : "Scena attuale"}
            </span>
            {displayScene.visibility === "private" ? (
              <span className="scene-meta-chip inline-flex items-center gap-1 rounded-md border border-ember-400/20 bg-ember-500/10 px-2 py-1 text-ember-100">
                Privata
              </span>
            ) : null}
            <span className="scene-meta-chip inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              <CalendarDays size={13} /> {shortTime(displayScene.created_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playUiClick();
              setIsCollapsed(true);
            }}
            className="text-[9px] font-serif uppercase tracking-widest text-stone-400 hover:text-white px-2.5 py-1 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition flex items-center gap-1"
          >
            Riduci
          </button>
        </div>
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{displayScene.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{displayScene.description}</p>
      </div>
      <span className="mysterium-corners-br" />
    </section>
  );
}
