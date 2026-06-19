"use client";

import {
  Activity,
  BookOpen,
  Clock,
  Crown,
  DoorOpen,
  Dices,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Wand2
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { playUiClick, playUiHover, isUiSoundsEnabled, toggleUiSounds } from "@/lib/sound-generator";

type StartMenuProps = {
  onCreate: () => void;
  onJoin: () => void;
  onSignOut?: () => void;
  isSuperAdmin?: boolean;
  onSuperAdmin?: () => void;
  onSessions?: () => void;
  currentSession?: ActiveSessionSummary;
  onResumeMaster?: () => void;
  onResumePlayer?: () => void;
};

export function StartMenu({
  onCreate,
  onJoin,
  onSignOut,
  isSuperAdmin = false,
  onSuperAdmin,
  onSessions,
  currentSession,
  onResumeMaster,
  onResumePlayer
}: StartMenuProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);
  const [ambienceVolume, setAmbienceVolume] = useState(34);
  const [moonMode, setMoonMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("fantasy");
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const theme = localStorage.getItem("gdr_visual_theme") || "fantasy";
      setSelectedTheme(theme);
      document.documentElement.className = `theme-${theme}`;
      setUiSoundsEnabled(isUiSoundsEnabled());
    }
  }, []);

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_visual_theme", theme);
      document.documentElement.className = `theme-${theme}`;
    }
  };

  const handleUiSoundsChange = (enabled: boolean) => {
    setUiSoundsEnabled(enabled);
    toggleUiSounds(enabled);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = ambienceEnabled ? ambienceVolume / 100 : 0;
    audio.muted = !ambienceEnabled;
    if (!ambienceEnabled) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      // Browser autoplay may wait for the first user interaction.
    });
  }, [ambienceEnabled, ambienceVolume]);

  useEffect(() => {
    const unlockAudio = () => {
      const audio = audioRef.current;
      if (!audio || !ambienceEnabled) return;
      audio.play().catch(() => {});
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, [ambienceEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const THEME_VIDEOS: Record<string, { local: string; fallback: string }> = {
    fantasy: {
      local: "/assets/menu/theme-master-room-hero.mp4",
      fallback: "https://assets.mixkit.co/videos/preview/mixkit-fire-burning-in-a-forest-close-up-42826-large.mp4"
    },
    cyberpunk: {
      local: "/assets/menu/theme-cyberpunk.mp4",
      fallback: "https://assets.mixkit.co/videos/preview/mixkit-retro-futuristic-grid-background-with-glowing-lines-48906-large.mp4"
    },
    lovecraft: {
      local: "/assets/menu/theme-lovecraft.mp4",
      fallback: "https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-43301-large.mp4"
    },
    scifi: {
      local: "/assets/menu/theme-scifi.mp4",
      fallback: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-and-milky-way-4447-large.mp4"
    }
  };

  useEffect(() => {
    // Reset video states on theme change
    setVideoLoaded(false);
    setVideoError(false);
  }, [selectedTheme]);

  return (
    <section className={`premium-start-menu relative -m-4 min-h-screen overflow-hidden px-5 py-6 text-white sm:-m-6 sm:px-10 lg:px-16 ${moonMode ? "premium-start-menu--moon" : ""}`}>
      <audio ref={audioRef} src="/assets/audio/master-room-ambience-2.mp3" loop preload="auto" />
      
      {/* Static Image Background (Always behind as loading / error fallback) */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out" 
        style={{ backgroundImage: `url('/assets/menu/theme-${selectedTheme}.png')` }}
      />

      {/* Looping Atmospheric Video Background */}
      {!videoError && (
        <video
          key={selectedTheme}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          onPlay={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
        >
          <source src={THEME_VIDEOS[selectedTheme].local} type="video/mp4" />
          <source src={THEME_VIDEOS[selectedTheme].fallback} type="video/mp4" />
        </video>
      )}

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(111,46,175,0.2),transparent_35rem),linear-gradient(90deg,rgba(2,3,7,0.68)_0%,rgba(2,3,7,0.2)_48%,rgba(2,3,7,0.78)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.88)_100%)]" />

      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] flex-col">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="premium-logo-mark">
              <Dices size={33} strokeWidth={1.35} />
            </div>
            <div>
              <p className="font-serif text-2xl uppercase tracking-[0.28em] text-brass sm:text-3xl">GDR</p>
              <p className="font-serif text-sm uppercase tracking-[0.36em] text-brass/90 sm:text-base">Master Room</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onMouseEnter={playUiHover}
              onClick={() => {
                playUiClick();
                setSettingsOpen((value) => !value);
              }}
              className="premium-icon-button"
              aria-label="Impostazioni"
              aria-expanded={settingsOpen}
            >
              <Settings size={20} />
            </button>
            <button
              type="button"
              onMouseEnter={playUiHover}
              onClick={() => {
                playUiClick();
                setMoonMode((value) => !value);
              }}
              className="premium-icon-button"
              aria-label="Tema lunare"
              aria-pressed={moonMode}
            >
              <Moon size={20} />
            </button>
            {onSignOut ? (
              <button
                type="button"
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  onSignOut();
                }}
                className="premium-icon-button"
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            ) : null}
          </div>
        </header>

        {settingsOpen ? (
          <div className="premium-settings-popover space-y-4 p-4">
            <h2 className="font-serif text-sm font-semibold text-brass">Impostazioni Master Room</h2>
            
            <div className="space-y-3">
              <label className="premium-setting-row">
                <span>{ambienceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} Musica menu</span>
                <input type="checkbox" checked={ambienceEnabled} onChange={(event) => setAmbienceEnabled(event.target.checked)} />
              </label>
              
              <label className="grid gap-1.5 text-xs text-stone-300">
                <span>Volume tema musicale</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ambienceVolume}
                  onChange={(event) => setAmbienceVolume(Number(event.target.value))}
                  disabled={!ambienceEnabled}
                  className="accent-brass"
                />
              </label>

              <label className="premium-setting-row">
                <span>Effetti sonori UI</span>
                <input type="checkbox" checked={uiSoundsEnabled} onChange={(event) => handleUiSoundsChange(event.target.checked)} />
              </label>

              <label className="grid gap-1.5 text-xs text-stone-300">
                <span>Tema Visivo (Genere)</span>
                <select
                  value={selectedTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="field px-2.5 py-1.5 text-xs bg-ink-950 border border-brass/30 text-slate-200 rounded-md focus:border-brass outline-none"
                >
                  <option value="fantasy">Classic Fantasy (Default)</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="lovecraft">Eldritch Terror (Cosmic)</option>
                  <option value="scifi">Space Odyssey (Sci-Fi)</option>
                </select>
              </label>

              <label className="premium-setting-row">
                <span>Modalità lunare (Filtro scuro)</span>
                <input type="checkbox" checked={moonMode} onChange={(event) => setMoonMode(event.target.checked)} />
              </label>
            </div>
            <span className="mysterium-corners-br" />
          </div>
        ) : null}

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,32rem)] lg:gap-14">
          <div className="max-w-3xl">
            <div className="premium-rule mb-8 hidden sm:block" />
            <p className="mb-4 text-xs uppercase tracking-[0.34em] text-brass/80 sm:hidden">GDR Master Room</p>
            <h1 className="font-serif text-[clamp(3rem,6.4vw,5.9rem)] leading-[0.98] text-stone-100 drop-shadow-[0_8px_28px_rgba(0,0,0,0.72)]">
              Prepara la sessione,
              <br />
              apri la stanza,
              <br />
              lascia entrare la <span className="text-ember-400">storia.</span>
            </h1>
            <div className="premium-rule my-7 max-w-xl" />
            <p className="max-w-xl text-lg leading-8 text-stone-200/88">
              Un ingresso chiaro per Master e giocatori: crea una partita, genera un codice stanza
              o raggiungi una sessione gia avviata.
            </p>

            <div className="premium-feature-strip mt-12 hidden max-w-3xl grid-cols-3 divide-x divide-brass/10 lg:grid">
              <Feature icon={<Shield size={26} />} title="Narra" text="Crea mondi indimenticabili" />
              <Feature icon={<Dices size={26} />} title="Condividi" text="Vivi la storia insieme ai tuoi giocatori" />
              <Feature icon={<BookOpen size={26} />} title="Ricorda" text="Ogni sessione lascia il segno" />
            </div>
          </div>

          <article className="premium-menu-panel">
            <div className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-full border border-brass/40 bg-black/28 shadow-[0_0_60px_rgba(147,51,234,0.24)]">
              <div className="relative grid h-20 w-20 place-items-center rounded-full border border-brass/60 bg-black/35 text-brass">
                <Crown className="mb-8 absolute" size={28} strokeWidth={1.3} />
                <Dices size={45} strokeWidth={1.15} />
              </div>
            </div>

            <div className="text-center">
              <h2 className="font-serif text-2xl uppercase tracking-[0.32em] text-brass">Menu partita</h2>
              <div className="premium-divider mx-auto my-5" />
              <p className="mx-auto max-w-sm text-sm leading-7 text-stone-200/82">
                Parti come Master per creare campagna e stanza, oppure entra come giocatore usando il codice invito.
              </p>
            </div>



            <div className="mt-8 grid gap-4">
              <button
                type="button"
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  onCreate();
                }}
                className="premium-action premium-action-ember"
                data-atlas-action="create"
              >
                <span className="premium-action-icon">
                  <span className="atlas-icon atlas-icon--regia" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-serif text-xl uppercase tracking-[0.14em] text-stone-100">Crea partita</span>
                  <span className="mt-1 block text-sm text-stone-200/70">Nuova campagna / nuova stanza</span>
                </span>
              </button>

              {onSessions ? (
                <button
                  type="button"
                  onMouseEnter={playUiHover}
                  onClick={() => {
                    playUiClick();
                    onSessions();
                  }}
                  className="premium-action premium-action-violet"
                  data-atlas-action="sessions"
                >
                  <span className="premium-action-icon">
                    <span className="atlas-icon atlas-icon--media" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-serif text-xl uppercase tracking-[0.14em] text-stone-100">Le tue sessioni</span>
                    <span className="mt-1 block text-sm text-stone-200/70">Scegli tra regie e personaggi attivi</span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  onJoin();
                }}
                className="premium-action premium-action-violet"
                data-atlas-action="join"
              >
                <span className="premium-action-icon">
                  <span className="atlas-icon atlas-icon--mappa" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-serif text-xl uppercase tracking-[0.14em] text-stone-100">Entra con codice stanza</span>
                  <span className="mt-1 block text-sm text-stone-200/70">Unisciti a una sessione esistente</span>
                </span>
              </button>

              {isSuperAdmin && onSuperAdmin ? (
                <button
                  type="button"
                  onMouseEnter={playUiHover}
                  onClick={() => {
                    playUiClick();
                    onSuperAdmin();
                  }}
                  className="premium-action premium-action-emerald"
                  data-atlas-action="superadmin"
                >
                  <span className="premium-action-icon">
                    <span className="atlas-icon atlas-icon--superadmin" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-serif text-xl uppercase tracking-[0.14em] text-stone-100">Superadmin</span>
                    <span className="mt-1 block text-sm text-stone-200/70">Controlla stanze, giocatori e sessioni</span>
                  </span>
                </button>
              ) : null}
            </div>

            <div className="mt-8">
              <div className="premium-divider mx-auto mb-4">
                <span>Opzioni rapide</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickOption icon={<Users size={25} />} title="Accesso giocatore" text="Entra rapidamente" onClick={onJoin} />
                <QuickOption icon={<Wand2 size={25} />} title="Cabina Master" text="Prepara la scena" onClick={onCreate} />
              </div>
            </div>
            <span className="mysterium-corners-br" />
          </article>
        </div>

        <footer className="hidden items-center gap-6 pb-2 text-xs uppercase tracking-[0.5em] text-brass/80 sm:flex">
          <span className="text-stone-500">v1.0.0</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
          <span className="font-serif">Ogni storia inizia con una scelta.</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
          <span className="font-serif tracking-[0.28em] text-stone-400">Dario Germanà</span>
        </footer>
      </div>
    </section>
  );
}

type ActiveSessionSummary = {
  campaignTitle: string;
  campaignStatus?: string;
  roomName: string;
  inviteCode: string;
  sceneTitle: string;
  role: "master" | "player";
  playerCount: number;
  maxPlayers?: number;
  characterName?: string;
  isSetupComplete?: boolean;
  lastActivityAt?: string;
};

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 px-7 py-5">
      <span className="mt-1 text-brass">{icon}</span>
      <span>
        <span className="block font-serif text-sm uppercase tracking-[0.24em] text-brass">{title}</span>
        <span className="mt-2 block text-sm leading-5 text-stone-300/72">{text}</span>
      </span>
    </div>
  );
}

function ActiveSessionPanel({
  session,
  onResumeMaster,
  onResumePlayer,
  onSessions
}: {
  session: ActiveSessionSummary;
  onResumeMaster?: () => void;
  onResumePlayer?: () => void;
  onSessions?: () => void;
}) {
  const canResumeMaster = session.role === "master" && onResumeMaster;
  const playerCapacity = `${session.playerCount}/${session.maxPlayers ?? 4}`;
  const roleLabel = session.role === "master" ? "Master" : "Giocatore";
  const setupLabel = session.role === "master" ? "Regia pronta" : session.isSetupComplete ? "Personaggio pronto" : "Scheda da completare";
  const statusLabel = campaignStatusLabel(session.campaignStatus);
  const activityLabel = formatActivity(session.lastActivityAt);

  return (
    <section
      className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-left shadow-[0_0_34px_rgba(16,185,129,0.1)] glass-panel"
      aria-label="Sessione attiva"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-300/30 bg-black/30 text-emerald-200">
          <Sparkles size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-xs uppercase tracking-[0.22em] text-emerald-200/90">Sessione attiva</p>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              {roleLabel}
            </span>
          </div>
          <h3 className="mt-1 truncate font-serif text-lg uppercase tracking-[0.12em] text-stone-100">{session.campaignTitle}</h3>
          <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-300/78">
            <span className="truncate">Stanza: {session.roomName}</span>
            <span className="truncate">Scena: {session.sceneTitle}</span>
            <span>
              Codice {session.inviteCode} · {playerCapacity} posti · {statusLabel}
            </span>
            {session.characterName ? <span className="truncate">Personaggio: {session.characterName}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SessionSignal icon={<Activity size={14} />} label={setupLabel} tone={session.isSetupComplete === false ? "warn" : "good"} />
        <SessionSignal icon={<Clock size={14} />} label={activityLabel} tone="calm" />
      </div>

      <div className={`mt-4 grid gap-2 ${canResumeMaster && onResumePlayer ? "sm:grid-cols-2" : ""}`}>
        {canResumeMaster ? (
          <ResumeButton
            icon={<Crown size={20} />}
            title="Rientra in regia"
            text="Gestisci scene, audio e giocatori"
            onClick={onResumeMaster}
          />
        ) : null}
        {onResumePlayer ? (
          <ResumeButton
            icon={<DoorOpen size={20} />}
            title={session.role === "master" ? "Vista giocatore" : "Rientra nella stanza"}
            text={session.role === "master" ? "Controlla cosa vede il tavolo" : "Riprendi la sessione"}
            onClick={onResumePlayer}
          />
        ) : null}
        {onSessions ? (
          <ResumeButton
            icon={<BookOpen size={20} />}
            title="Gestisci sessioni"
            text="Apri elenco, filtri e rientro rapido"
            onClick={onSessions}
          />
        ) : null}
      </div>
      <span className="mysterium-corners-br" />
    </section>
  );
}

function SessionSignal({ icon, label, tone }: { icon: ReactNode; label: string; tone: "good" | "warn" | "calm" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : tone === "warn"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
        : "border-brass/20 bg-black/22 text-stone-200/78";

  return (
    <span className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs leading-4 ${toneClass}`}>
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function campaignStatusLabel(status?: string) {
  if (status === "archived") return "Archiviata";
  if (status === "paused") return "In pausa";
  return "Attiva";
}

function formatActivity(value?: string) {
  if (!value) return "Attivita non disponibile";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Attivita non disponibile";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Attiva ora";
  if (diffMinutes < 60) return `${diffMinutes} min fa`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "ora" : "ore"} fa`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "giorno" : "giorni"} fa`;

  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function ResumeButton({
  icon,
  title,
  text,
  onClick
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={playUiHover}
      onClick={() => {
        playUiClick();
        onClick();
      }}
      className="rounded-lg border border-brass/25 bg-black/32 px-3 py-3 text-left transition duration-200 hover:border-brass/55 hover:bg-brass/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
    >
      <span className="flex items-start gap-2">
        <span className="mt-0.5 text-brass">{icon}</span>
        <span className="min-w-0">
          <span className="block font-serif text-sm uppercase tracking-[0.13em] text-stone-100">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-stone-300/72">{text}</span>
        </span>
      </span>
    </button>
  );
}

function QuickOption({
  icon,
  title,
  text,
  onClick
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={playUiHover}
      onClick={() => {
        playUiClick();
        onClick();
      }}
      className="premium-quick-option"
    >
      <span className="text-brass">{icon}</span>
      <span className="font-serif text-sm uppercase tracking-[0.18em] text-brass">{title}</span>
      <span className="text-sm leading-5 text-stone-300/70">{text}</span>
    </button>
  );
}
