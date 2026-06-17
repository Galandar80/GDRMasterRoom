"use client";

import { useEffect } from "react";
import { playUiCriticalSuccess, playUiCriticalFailure } from "@/lib/sound-generator";

type DiceRollAnimationOverlayProps = {
  type: "critical" | "fumble";
  rollerName: string;
  reason: string;
  onClose: () => void;
};

export function DiceRollAnimationOverlay({
  type,
  rollerName,
  reason,
  onClose
}: DiceRollAnimationOverlayProps) {
  useEffect(() => {
    // Play sound procedurally via Web Audio API
    if (type === "critical") {
      playUiCriticalSuccess();
    } else {
      playUiCriticalFailure();
    }

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [type, onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 cursor-pointer animate-fade-in"
    >
      {/* Fullscreen pulsing vignette border */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
          type === "critical"
            ? "bg-gradient-to-t from-amber-500/10 via-transparent to-amber-500/10 border-[6px] border-amber-500/20 shadow-[inset_0_0_80px_rgba(245,158,11,0.15)]"
            : "bg-gradient-to-t from-red-600/20 via-transparent to-red-600/20 border-[6px] border-red-600/25 shadow-[inset_0_0_80px_rgba(220,38,38,0.2)]"
        }`}
      />

      {/* Floating Glowing Particle Stream */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const delay = Math.random() * 2.5;
          const duration = 2.5 + Math.random() * 2;
          const left = Math.random() * 100;
          const size = 5 + Math.random() * 10;
          const opacity = 0.5 + Math.random() * 0.4;
          return (
            <span
              key={i}
              className={`absolute bottom-[-10%] rounded-full pointer-events-none animate-float-particle`}
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: opacity,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                backgroundImage: type === "critical"
                  ? "radial-gradient(circle, #fef08a 0%, #d97706 100%)"
                  : "radial-gradient(circle, #fca5a5 0%, #b91c1c 100%)",
                boxShadow: type === "critical"
                  ? "0 0 12px #fbbf24, 0 0 20px rgba(245,158,11,0.5)"
                  : "0 0 10px #dc2626, 0 0 18px rgba(220,38,38,0.5)",
              }}
            />
          );
        })}
      </div>

      {/* Main visual panel container */}
      <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-lg select-none pointer-events-none animate-scale-up">
        {/* Large d20 shape decoration */}
        <div
          className={`w-32 h-32 flex items-center justify-center relative rounded-full border-2 border-double mb-6 shadow-2xl ${
            type === "critical"
              ? "border-amber-400 bg-ink-950/95 text-amber-300 ring-4 ring-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.25)]"
              : "border-red-500 bg-ink-950/95 text-red-500 ring-4 ring-red-600/10 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
          }`}
        >
          {/* Runic ring rotator */}
          <div 
            className={`absolute inset-2 rounded-full border border-dashed opacity-30 border-current animate-[spin_25s_linear_infinite]`} 
          />
          <span className="font-serif text-5xl font-extrabold tracking-tight filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {type === "critical" ? "20" : "1"}
          </span>
        </div>

        {/* Gothic Banner Typography */}
        <h2
          className={`font-serif text-4xl sm:text-5xl font-black uppercase tracking-[0.25em] mb-4 filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${
            type === "critical"
              ? "bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 bg-clip-text text-transparent"
              : "bg-gradient-to-b from-red-300 via-red-500 to-rose-950 bg-clip-text text-transparent"
          }`}
        >
          {type === "critical" ? "Successo Critico" : "Fallimento Critico"}
        </h2>

        {/* Roller identity plaque */}
        <div className="bg-black/55 border border-brass/20 rounded-xl px-6 py-3.5 shadow-lg backdrop-blur-md">
          <p className="font-serif text-lg font-bold tracking-wide text-stone-100">
            {rollerName}
          </p>
          <p className="text-stone-400 text-xs mt-1 uppercase tracking-[0.16em]">
            ha lanciato un d20
          </p>
        </div>

        {/* Roll context reason */}
        {reason ? (
          <p className="text-stone-300 text-sm italic mt-4 px-4 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            &ldquo;{reason}&rdquo;
          </p>
        ) : null}

        <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-8 animate-pulse">
          Clicca ovunque per chiudere
        </p>
      </div>
    </div>
  );
}
