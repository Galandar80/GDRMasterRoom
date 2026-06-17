"use client";

import { Activity, AlertCircle, ArrowLeft, ArrowUpRight, CheckCircle2, Clipboard, Clock3, Crown, DoorOpen, Flame, Gauge, Loader2, RefreshCw, Search, Shield, UserRound, UsersRound } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { UserSessionSummary } from "@/lib/supabase/room-service";
import { playUiClick, playUiHover } from "@/lib/sound-generator";

type SessionSwitcherProps = {
  sessions: UserSessionSummary[];
  isLoading?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenSession: (session: UserSessionSummary) => void;
};

type SessionTab = "all" | "master" | "player";
type SessionFilter = "all" | "active" | "setup";
type SessionSort = "priority" | "activity" | "created" | "players" | "name";

export function SessionSwitcher({ sessions, isLoading = false, onBack, onRefresh, onOpenSession }: SessionSwitcherProps) {
  const [tab, setTab] = useState<SessionTab>("all");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [sort, setSort] = useState<SessionSort>("priority");
  const [query, setQuery] = useState("");
  const masterSessions = useMemo(() => sessions.filter((session) => session.role === "master"), [sessions]);
  const playerSessions = useMemo(() => sessions.filter((session) => session.role === "player"), [sessions]);
  const incompleteSessions = useMemo(() => sessions.filter((session) => session.role === "player" && !session.isSetupComplete), [sessions]);
  const activeCampaigns = useMemo(() => sessions.filter((session) => (session.campaignStatus ?? "active") === "active"), [sessions]);
  const recommendedSession = useMemo(() => sessions.toSorted((a, b) => getSessionScore(b) - getSessionScore(a) || compareSessions(a, b, "activity"))[0], [sessions]);
  const needsAttention = useMemo(() => sessions.filter((session) => getSessionFlags(session).some((flag) => flag.tone !== "calm")), [sessions]);
  const visibleSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sessions
      .filter((session) => tab === "all" || session.role === tab)
      .filter((session) => {
        if (filter === "active") return (session.campaignStatus ?? "active") === "active";
        if (filter === "setup") return session.role === "player" && !session.isSetupComplete;
        return true;
      })
      .filter((session) => {
        if (!normalizedQuery) return true;
        return [session.campaignTitle, session.roomName, session.inviteCode, session.characterName]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => compareSessions(a, b, sort));
  }, [filter, query, sessions, sort, tab]);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl content-center gap-5 p-4 text-white">
      <header className="ui-panel-window rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onBack();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-brass/25 bg-black/32 px-3.5 py-2 text-xs uppercase tracking-wider text-stone-300 transition hover:border-brass/55 hover:bg-brass/10 hover:text-white font-serif"
          >
            <ArrowLeft size={14} /> Menu
          </button>

          <div className="text-center">
            <p className="font-serif text-xs uppercase tracking-[0.3em] text-brass/80">Continuita di gioco</p>
            <h1 className="mt-1 font-serif text-2xl font-bold uppercase tracking-[0.18em] text-brass">Le tue sessioni</h1>
          </div>

          <button
            type="button"
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onRefresh();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-brass/35 bg-black/45 px-3.5 py-2 text-xs uppercase tracking-wider text-brass transition hover:border-brass/55 hover:bg-brass/10 font-serif"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
            Aggiorna
          </button>
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-stone-300/78">
          Scegli una stanza senza affidarti al rientro automatico: regia per le campagne che hai creato, tavolo per i personaggi con cui partecipi.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <SessionMetric icon={<Crown size={15} />} label="Regie" value={masterSessions.length} />
          <SessionMetric icon={<UserRound size={15} />} label="Tavoli" value={playerSessions.length} />
          <SessionMetric icon={<AlertCircle size={15} />} label="Da completare" value={incompleteSessions.length} tone={incompleteSessions.length ? "warn" : "calm"} />
        </div>
      </header>

      <main className="ui-panel-window rounded-xl p-5 shadow-2xl">
        {recommendedSession ? (
          <RecommendedSession
            session={recommendedSession}
            attentionCount={needsAttention.length}
            onOpen={() => onOpenSession(recommendedSession)}
          />
        ) : null}

        <div className="grid gap-2 rounded-lg border border-white/5 bg-black/45 p-1 sm:grid-cols-3" role="tablist" aria-label="Filtra sessioni per ruolo">
          <TabButton
            active={tab === "all"}
            icon={<Clock3 size={16} />}
            label="Tutte"
            count={sessions.length}
            onClick={() => setTab("all")}
          />
          <TabButton
            active={tab === "master"}
            icon={<Crown size={16} />}
            label="Come Master"
            count={masterSessions.length}
            onClick={() => setTab("master")}
          />
          <TabButton
            active={tab === "player"}
            icon={<UserRound size={16} />}
            label="Come Giocatore"
            count={playerSessions.length}
            onClick={() => setTab("player")}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-stone-300 focus-within:border-brass/55 focus-within:bg-black/45">
            <Search size={15} className="text-brass" />
            <span className="sr-only">Cerca sessione</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca campagna, stanza, codice o personaggio"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500"
            />
          </label>

          <select
            aria-label="Filtro sessioni"
            value={filter}
            onChange={(event) => setFilter(event.target.value as SessionFilter)}
            className="field min-h-11 min-w-[12rem] px-3 py-2 text-sm"
          >
            <option value="all">Tutte le sessioni</option>
            <option value="active">Solo campagne attive</option>
            <option value="setup">Eroi da completare</option>
          </select>

          <select
            aria-label="Ordina sessioni"
            value={sort}
            onChange={(event) => setSort(event.target.value as SessionSort)}
            className="field min-h-11 min-w-[12rem] px-3 py-2 text-sm"
          >
            <option value="priority">Priorita consigliata</option>
            <option value="activity">Ultima attivita</option>
            <option value="created">Creazione recente</option>
            <option value="players">Piu giocatori</option>
            <option value="name">Nome campagna</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
          <span>
            Mostro <strong className="text-brass">{visibleSessions.length}</strong> di {sessions.length} sessioni
          </span>
          {activeCampaigns.length ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
              <CheckCircle2 size={13} /> {activeCampaigns.length} attive
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid min-h-72 place-items-center text-center text-stone-300">
            <div>
              <Loader2 className="mx-auto mb-3 animate-spin text-brass" size={26} />
              <p className="font-serif text-sm uppercase tracking-[0.2em] text-brass">Caricamento sessioni</p>
            </div>
          </div>
        ) : visibleSessions.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleSessions.map((session) => (
              <SessionCard key={session.id} session={session} onOpen={() => onOpenSession(session)} />
            ))}
          </div>
        ) : (
          <EmptySessionsState role={tab} hasFilters={Boolean(query.trim()) || filter !== "all"} />
        )}
      </main>
    </section>
  );
}

function RecommendedSession({
  session,
  attentionCount,
  onOpen
}: {
  session: UserSessionSummary;
  attentionCount: number;
  onOpen: () => void;
}) {
  const insight = getSessionInsight(session);
  const health = getSessionHealth(session);

  return (
    <section className="session-command-card mb-5" aria-label="Sessione consigliata">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.22em] text-brass/85">
          <Flame size={15} /> Rientro consigliato
        </p>
        <h2 className="mt-2 truncate font-serif text-2xl uppercase tracking-[0.12em] text-stone-100">{session.campaignTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-300/80">{insight}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={`session-signal-pill ${health.className}`}>
            <Gauge size={13} /> {health.label}
          </span>
          <span className="session-signal-pill border-white/10 bg-white/[0.04] text-stone-300">
            <Clock3 size={13} /> {formatRelativeDate(session.lastActivityAt)}
          </span>
          <span className="session-signal-pill border-white/10 bg-white/[0.04] text-stone-300">
            <UsersRound size={13} /> {session.playerCount}/{session.maxPlayers}
          </span>
          {attentionCount ? (
            <span className="session-signal-pill border-amber-300/25 bg-amber-500/10 text-amber-100">
              <AlertCircle size={13} /> {attentionCount} da rivedere
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onMouseEnter={playUiHover}
        onClick={() => {
          playUiClick();
          onOpen();
        }}
        className="session-command-button"
      >
        <ArrowUpRight size={17} />
        {session.role === "master" ? "Apri regia" : session.isSetupComplete ? "Rientra ora" : "Completa eroe"}
      </button>
    </section>
  );
}

function SessionMetric({
  icon,
  label,
  value,
  tone = "calm"
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "calm" | "warn";
}) {
  return (
    <div className={`admin-metric-card rounded-lg border p-3 ${tone === "warn" ? "border-amber-300/25 bg-amber-500/10 text-amber-100" : "border-brass/15 bg-black/24 text-stone-200"}`}>
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-brass/80">{icon} {label}</span>
      <strong className="mt-1 block font-serif text-xl text-stone-100">{value}</strong>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  count,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
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
      role="tab"
      aria-selected={active}
      className={`ui-tab-button flex-1 justify-center py-3 ${active ? "is-active" : ""}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider">
          {icon} {label}
        </span>
        <span className="rounded-full border border-current/25 px-2 py-0.5 text-[10px]">{count}</span>
      </span>
    </button>
  );
}

function SessionCard({ session, onOpen }: { session: UserSessionSummary; onOpen: () => void }) {
  const [copied, setCopied] = useState(false);
  const isPlayerSetupMissing = session.role === "player" && !session.isSetupComplete;
  const statusLabel = campaignStatusLabel(session.campaignStatus);
  const flags = getSessionFlags(session);
  const health = getSessionHealth(session);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(session.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`rounded-xl border bg-black/40 p-4 shadow-[0_0_28px_rgba(0,0,0,0.18)] ${isPlayerSetupMissing ? "border-amber-300/30" : "border-brass/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.22em] text-brass/80">
            {session.role === "master" ? <Crown size={14} /> : <UserRound size={14} />}
            {session.role === "master" ? "Regia Master" : "Tavolo Giocatore"}
          </p>
          <h2 className="mt-2 truncate font-serif text-xl uppercase tracking-[0.1em] text-stone-100">{session.campaignTitle}</h2>
          <p className="mt-1 truncate text-sm text-stone-300/75">{session.roomName}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${statusLabel.className}`}>
          {statusLabel.label}
        </span>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-stone-300/80 sm:grid-cols-2">
        <span>
          Codice <strong className="font-mono text-brass">{session.inviteCode}</strong>
        </span>
        <span>
          Giocatori {session.playerCount}/{session.maxPlayers}
        </span>
        <span className="sm:col-span-2">
          {session.role === "player"
            ? `Personaggio: ${session.characterName || "Da completare"}`
            : `Creata il ${formatDate(session.createdAt)}`}
        </span>
        <span className="sm:col-span-2">
          Ultima attivita <strong className="text-stone-100">{formatRelativeDate(session.lastActivityAt)}</strong>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Segnali sessione">
        <span className={`session-signal-pill ${health.className}`}>
          <Activity size={13} /> {health.label}
        </span>
        {flags.map((flag) => (
          <span key={flag.label} className={`session-signal-pill ${flag.className}`}>
            {flag.icon} {flag.label}
          </span>
        ))}
      </div>

      {isPlayerSetupMissing ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
          <AlertCircle className="mt-0.5 shrink-0" size={15} />
          Completa la scheda prima di entrare al tavolo: nome, ritratto e stato iniziale renderanno la sessione più leggibile per tutti.
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onMouseEnter={playUiHover}
          onClick={() => {
            playUiClick();
            onOpen();
          }}
          className="inline-flex items-center justify-center gap-2 ui-btn-fantasy px-4 py-2.5 font-serif text-sm uppercase tracking-[0.14em]"
        >
          {session.role === "master" ? <Shield size={16} /> : <DoorOpen size={16} />}
          {session.role === "master" ? "Apri regia" : session.isSetupComplete ? "Rientra" : "Completa eroe"}
        </button>
        <button
          type="button"
          onMouseEnter={playUiHover}
          onClick={() => {
            playUiClick();
            copyCode();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brass/25 bg-black/32 px-4 py-2.5 text-sm text-stone-300 transition hover:border-brass/55 hover:bg-brass/10 hover:text-white"
        >
          <Clipboard size={15} />
          {copied ? "Copiato" : "Copia codice"}
        </button>
      </div>
    </article>
  );
}

function EmptySessionsState({ role, hasFilters }: { role: SessionTab; hasFilters: boolean }) {
  return (
    <div className={`session-empty-state mt-5 grid min-h-72 place-items-center rounded-xl border border-dashed border-brass/20 bg-black/24 p-8 text-center ${hasFilters ? "session-empty-state--search" : role === "master" ? "session-empty-state--master" : role === "player" ? "session-empty-state--player" : "session-empty-state--all"}`}>
      <div className="max-w-md">
        <h2 className="font-serif text-lg uppercase tracking-[0.18em] text-brass">
          {hasFilters ? "Nessun risultato" : role === "master" ? "Nessuna regia attiva" : role === "player" ? "Nessun tavolo giocatore" : "Nessuna sessione attiva"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          {hasFilters
            ? "Modifica ricerca o filtri per ritrovare la sessione."
            : role === "master"
            ? "Crea una partita dal menu per vederla qui e rientrare senza codice."
            : role === "player"
              ? "Entra con un codice stanza: il tuo personaggio comparira qui ai prossimi accessi."
              : "Crea una partita o entra con un codice stanza per popolare questo centro sessioni."}
        </p>
      </div>
    </div>
  );
}

function compareSessions(a: UserSessionSummary, b: UserSessionSummary, sort: SessionSort) {
  if (sort === "priority") return getSessionScore(b) - getSessionScore(a) || b.lastActivityAt.localeCompare(a.lastActivityAt);
  if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
  if (sort === "players") return b.playerCount - a.playerCount || b.lastActivityAt.localeCompare(a.lastActivityAt);
  if (sort === "name") return a.campaignTitle.localeCompare(b.campaignTitle, "it");
  return b.lastActivityAt.localeCompare(a.lastActivityAt);
}

function getSessionScore(session: UserSessionSummary) {
  let score = 0;
  const ageDays = getActivityAgeDays(session.lastActivityAt);
  if ((session.campaignStatus ?? "active") === "active") score += 20;
  if (session.role === "master") score += 12;
  if (session.role === "player" && !session.isSetupComplete) score += 32;
  if (ageDays <= 1) score += 26;
  else if (ageDays <= 7) score += 16;
  else if (ageDays <= 21) score += 6;
  if (session.playerCount >= Math.max(1, Math.ceil(session.maxPlayers * 0.75))) score += 10;
  return score;
}

function getSessionHealth(session: UserSessionSummary) {
  const ageDays = getActivityAgeDays(session.lastActivityAt);
  if (session.role === "player" && !session.isSetupComplete) {
    return { label: "setup richiesto", className: "border-amber-300/25 bg-amber-500/10 text-amber-100" };
  }
  if ((session.campaignStatus ?? "active") !== "active") {
    return { label: campaignStatusLabel(session.campaignStatus).label, className: "border-stone-300/20 bg-stone-500/10 text-stone-300" };
  }
  if (ageDays <= 1) {
    return { label: "calda", className: "border-emerald-300/25 bg-emerald-500/10 text-emerald-200" };
  }
  if (ageDays <= 14) {
    return { label: "attiva", className: "border-sky-300/25 bg-sky-500/10 text-sky-200" };
  }
  return { label: "ferma", className: "border-amber-300/25 bg-amber-500/10 text-amber-100" };
}

function getSessionFlags(session: UserSessionSummary) {
  const flags: { label: string; tone: "calm" | "warn"; className: string; icon: React.ReactNode }[] = [];
  const ageDays = getActivityAgeDays(session.lastActivityAt);
  const isFull = session.playerCount >= session.maxPlayers;
  const isAlmostFull = !isFull && session.playerCount >= Math.max(1, session.maxPlayers - 1);

  if (session.role === "player" && !session.isSetupComplete) {
    flags.push({
      label: "eroe incompleto",
      tone: "warn",
      className: "border-amber-300/25 bg-amber-500/10 text-amber-100",
      icon: <AlertCircle size={13} />
    });
  }

  if (isFull || isAlmostFull) {
    flags.push({
      label: isFull ? "tavolo pieno" : "ultimo posto",
      tone: isFull ? "warn" : "calm",
      className: isFull ? "border-rose-300/25 bg-rose-500/10 text-rose-100" : "border-brass/25 bg-brass/10 text-brass",
      icon: <UsersRound size={13} />
    });
  }

  if (ageDays > 21) {
    flags.push({
      label: "da riattivare",
      tone: "warn",
      className: "border-amber-300/25 bg-amber-500/10 text-amber-100",
      icon: <Clock3 size={13} />
    });
  }

  return flags;
}

function getSessionInsight(session: UserSessionSummary) {
  if (session.role === "player" && !session.isSetupComplete) {
    return "Questa e la prossima cosa utile: completa il personaggio e rendi il tavolo subito leggibile.";
  }
  if (session.role === "master") {
    return session.playerCount
      ? `Hai ${session.playerCount} ${session.playerCount === 1 ? "giocatore" : "giocatori"} pronti: rientra in regia e riprendi il controllo della stanza.`
      : "La regia e pronta, ma il tavolo non ha ancora giocatori: aprila per preparare scena, inviti e materiali.";
  }
  return "Sessione pronta per il rientro: torna al tavolo senza reinserire il codice stanza.";
}

function getActivityAgeDays(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function campaignStatusLabel(status?: UserSessionSummary["campaignStatus"]) {
  if (status === "completed") {
    return { label: "completata", className: "border-sky-300/25 bg-sky-500/10 text-sky-200" };
  }
  if (status === "archived") {
    return { label: "archiviata", className: "border-stone-300/20 bg-stone-500/10 text-stone-300" };
  }
  return { label: "attiva", className: "border-emerald-300/25 bg-emerald-500/10 text-emerald-200" };
}

function formatDate(value: string) {
  if (!value) return "n/d";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatRelativeDate(value: string) {
  if (!value) return "n/d";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absoluteMinutes = Math.abs(diffMinutes);

  if (absoluteMinutes < 60) return new Intl.RelativeTimeFormat("it", { numeric: "auto" }).format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return new Intl.RelativeTimeFormat("it", { numeric: "auto" }).format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 8) return new Intl.RelativeTimeFormat("it", { numeric: "auto" }).format(diffDays, "day");

  return formatDate(value);
}
