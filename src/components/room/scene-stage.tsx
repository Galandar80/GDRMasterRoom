"use client";

import { CalendarDays, Eye, ImageIcon, LockKeyhole, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Scene } from "@/lib/types";
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
};

function detectWeather(scene: Scene) {
  const text = ((scene.title || "") + " " + (scene.description || "")).toLowerCase();
  if (text.includes("pioggia") || text.includes("temporale") || text.includes("diluvio") || text.includes("storm") || text.includes("rain")) return "rain";
  if (text.includes("neve") || text.includes("ghiaccio") || text.includes("tormenta") || text.includes("snow") || text.includes("ice")) return "snow";
  if (text.includes("nebbia") || text.includes("fumo") || text.includes("mist") || text.includes("fog") || text.includes("smoke") || text.includes("glitch")) return "fog";
  if (text.includes("scintille") || text.includes("magia") || text.includes("polvere") || text.includes("stelle") || text.includes("magic") || text.includes("sparkles") || text.includes("luce")) return "sparkles";
  return "none";
}

export function SceneStage({ scene, compact = false, audioVolume = 55, audioMuted = false, audioTitle, onAudioVolumeChange, onAudioMutedChange }: SceneStageProps) {
  const [displayScene, setDisplayScene] = useState(scene);
  const [prevScene, setPrevScene] = useState<Scene | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [weather, setWeather] = useState<"none" | "rain" | "snow" | "fog" | "sparkles">("none");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);


  // Detect weather automatically on scene change
  useEffect(() => {
    const detected = detectWeather(displayScene);
    setWeather(detected);
  }, [displayScene]);

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

  // Particle Engine Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      speed: number;
      size: number;
      opacity: number;
      extra?: number;
    }

    let particles: Particle[] = [];
    const maxParticles = weather === "fog" ? 12 : weather === "rain" ? 80 : weather === "snow" ? 60 : 40;

    function createParticle(randomY = false): Particle {
      const pY = randomY ? Math.random() * height : -10;
      if (weather === "rain") {
        return {
          x: Math.random() * width,
          y: pY,
          speed: 6 + Math.random() * 4,
          size: 1 + Math.random() * 1.5,
          opacity: 0.15 + Math.random() * 0.25,
        };
      } else if (weather === "snow") {
        return {
          x: Math.random() * width,
          y: pY,
          speed: 0.8 + Math.random() * 1.2,
          size: 1.5 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.5,
          extra: Math.random() * Math.PI * 2,
        };
      } else if (weather === "fog") {
        return {
          x: Math.random() * (width + 300) - 150,
          y: Math.random() * height,
          speed: 0.1 + Math.random() * 0.2,
          size: 80 + Math.random() * 100,
          opacity: 0.05 + Math.random() * 0.08,
        };
      } else { // sparkles
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : height + 10,
          speed: 0.4 + Math.random() * 0.6,
          size: 1 + Math.random() * 2,
          opacity: 0.2 + Math.random() * 0.5,
          extra: Math.random() * Math.PI * 2,
        };
      }
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(true));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (weather === "none") return;

      particles.forEach((p, index) => {
        if (weather === "rain") {
          p.y += p.speed;
          p.x += p.speed * 0.05; // wind slant
          if (p.y > height) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180, 200, 220, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speed * 0.05, p.y + p.speed * 1.5);
          ctx.stroke();
        } else if (weather === "snow") {
          p.y += p.speed;
          p.extra = (p.extra || 0) + 0.01;
          p.x += Math.sin(p.extra) * 0.3;
          if (p.y > height || p.x < -10 || p.x > width + 10) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === "fog") {
          p.x += p.speed;
          if (p.x > width + p.size) {
            p.x = -p.size;
          }
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(220, 220, 230, ${p.opacity})`);
          grad.addColorStop(0.5, `rgba(220, 220, 230, ${p.opacity * 0.4})`);
          grad.addColorStop(1, "rgba(220, 220, 230, 0)");
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === "sparkles") {
          p.y -= p.speed;
          p.extra = (p.extra || 0) + 0.02;
          p.x += Math.sin(p.extra) * 0.2;
          const currentOpacity = Math.max(0.01, Math.min(1, p.opacity * Math.abs(Math.sin(p.extra))));
          if (p.y < -10) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grad.addColorStop(0, `rgba(200, 163, 93, ${currentOpacity})`);
          grad.addColorStop(0.3, `rgba(200, 163, 93, ${currentOpacity * 0.5})`);
          grad.addColorStop(1, "rgba(200, 163, 93, 0)");
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [weather]);

  const isVideo = displayScene.media_type === "video";
  const mediaUrl = isVideo ? displayScene.video_url || displayScene.image_url : displayScene.image_url;
  const mediaClassName = compact
    ? "scene-stage-media aspect-video max-h-[22rem] w-full"
    : "scene-stage-media aspect-video w-full";

  const prevIsVideo = prevScene?.media_type === "video";
  const prevMediaUrl = prevScene ? (prevIsVideo ? prevScene.video_url || prevScene.image_url : prevScene.image_url) : null;

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

      <div className="relative w-full overflow-hidden bg-ink-950">
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
          <div className="absolute inset-0 z-0 pointer-events-none">
            {prevIsVideo ? (
              <video
                className={`${mediaClassName} bg-black object-cover`}
                src={prevMediaUrl}
                autoPlay
                muted
                loop={prevScene.loop_video !== false}
                playsInline
              />
            ) : (
              <div
                className={`${mediaClassName} bg-cover bg-center`}
                style={{ backgroundImage: `url(${prevMediaUrl})` }}
              />
            )}
          </div>
        )}

        {/* Layer della scena attiva */}
        <div className={`scene-stage-active-wrap relative z-10 transition-opacity duration-700 ease-in-out ${isFading ? "opacity-0" : "opacity-100"}`}>
          {isVideo ? (
            <video
              className={`${mediaClassName} bg-black object-cover`}
              src={mediaUrl}
              aria-label={displayScene.title}
              autoPlay
              muted
              loop={displayScene.loop_video !== false}
              playsInline
              controls
            />
          ) : (
            <div
              className={`${mediaClassName} bg-cover bg-center`}
              style={{ backgroundImage: `url(${mediaUrl})` }}
              aria-label={displayScene.title}
            />
          )}
        </div>

        {/* Layer meteo ad alte prestazioni */}
        <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none w-full h-full" />
      </div>

      <div className="scene-stage-caption border-t border-white/10 bg-ink-900/75 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
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
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{displayScene.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{displayScene.description}</p>
      </div>
      <span className="mysterium-corners-br" />
    </section>
  );
}
