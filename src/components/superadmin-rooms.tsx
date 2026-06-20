"use client";

import { AlertTriangle, ArrowLeft, AudioLines, BarChart3, CalendarClock, Film, ImageIcon, RefreshCw, Save, Search, Shield, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { AdminMediaOverview, AdminRoomOverview } from "@/lib/supabase/room-service";

type SuperAdminRoomsProps = {
  rooms: AdminRoomOverview[];
  media: AdminMediaOverview[];
  onBack: () => void;
  onRefresh: () => void;
  onUpdate: (roomId: string, values: { name: string; inviteCode: string; maxPlayers: number }) => void;
  onDelete: (room: AdminRoomOverview) => void;
  onDeleteMedia: (media: AdminMediaOverview) => void;
};

type AdminMediaGroup = {
  key: string;
  title: string;
  asset_type: AdminMediaOverview["asset_type"];
  url: string;
  created_at?: string;
  sources: AdminMediaOverview["source"][];
  room_names: string[];
  campaign_titles: string[];
  references: AdminMediaOverview[];
};

export function SuperAdminRooms({ rooms, media, onBack, onRefresh, onUpdate, onDelete, onDeleteMedia }: SuperAdminRoomsProps) {
  const [view, setView] = useState<"rooms" | "media">("rooms");
  const [roomQuery, setRoomQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | "empty" | "full" | "inactive" | "recent">("all");
  const [roomSort, setRoomSort] = useState<"created" | "players" | "name" | "risk">("risk");
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | AdminMediaOverview["asset_type"]>("all");
  const [mediaSort, setMediaSort] = useState<"created" | "title" | "type" | "room">("created");
  const [showMediaReferences, setShowMediaReferences] = useState(false);

  const roomInsights = useMemo(() => buildRoomInsights(rooms, media), [rooms, media]);
  const mediaGroups = useMemo(() => groupMediaByUrl(media), [media]);
  const mediaInsights = useMemo(() => buildMediaInsights(mediaGroups), [mediaGroups]);
  const visibleRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase();
    return rooms
      .filter((room) => {
        const haystack = `${room.name} ${room.invite_code} ${room.campaign_title ?? ""} ${room.id}`.toLowerCase();
        if (query && !haystack.includes(query)) return false;
        if (roomFilter === "empty") return (room.player_count ?? 0) === 0;
        if (roomFilter === "full") return (room.player_count ?? 0) >= (room.max_players ?? 4);
        if (roomFilter === "inactive") return getRoomRisk(room, media).level !== "good";
        if (roomFilter === "recent") return ageInDays(room.created_at) <= 7;
        return true;
      })
      .sort((a, b) => compareRooms(a, b, roomSort, media));
  }, [rooms, roomQuery, roomFilter, roomSort, media]);
  const visibleMediaReferences = useMemo(() => {
    const query = mediaQuery.trim().toLowerCase();
    return media
      .filter((item) => {
        const haystack = `${item.title} ${item.asset_type} ${item.room_name ?? ""} ${item.campaign_title ?? ""} ${item.source}`.toLowerCase();
        if (query && !haystack.includes(query)) return false;
        if (mediaFilter !== "all" && item.asset_type !== mediaFilter) return false;
        return true;
      })
      .sort((a, b) => compareMedia(a, b, mediaSort));
  }, [media, mediaQuery, mediaFilter, mediaSort]);
  const visibleMediaGroups = useMemo(() => {
    const query = mediaQuery.trim().toLowerCase();
    return mediaGroups
      .filter((group) => {
        const haystack = `${group.title} ${group.asset_type} ${group.room_names.join(" ")} ${group.campaign_titles.join(" ")} ${group.sources.join(" ")} ${group.url}`.toLowerCase();
        if (query && !haystack.includes(query)) return false;
        if (mediaFilter !== "all" && group.asset_type !== mediaFilter) return false;
        return true;
      })
      .sort((a, b) => compareMediaGroups(a, b, mediaSort));
  }, [mediaGroups, mediaQuery, mediaFilter, mediaSort]);
  const visibleMediaCount = showMediaReferences ? visibleMediaReferences.length : visibleMediaGroups.length;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="superadmin-atlas-header glass-panel rounded-lg p-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna al menu principale"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brass/25 bg-black/32 px-3.5 py-2 text-xs uppercase tracking-wider text-stone-300 hover:border-brass/55 hover:bg-brass/10 hover:text-white transition font-serif"
        >
          <ArrowLeft size={14} /> Menu
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brass">
              <Shield size={15} /> Superadmin
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Centro controllo superadmin</h1>
            <p className="mt-2 text-sm text-slate-300">Metriche, filtri operativi, cleanup e manutenzione delle stanze.</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-brass/35 bg-black/45 px-3.5 py-2 text-xs uppercase tracking-wider text-brass transition hover:border-brass/55 hover:bg-brass/10 font-serif"
          >
            <RefreshCw size={14} /> Aggiorna
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric icon={<BarChart3 size={17} />} label="Stanze" value={rooms.length} detail={`${roomInsights.activeRooms} operative`} atlasArea="regia" />
          <AdminMetric icon={<Users size={17} />} label="Giocatori" value={roomInsights.totalPlayers} detail={`${roomInsights.fullRooms} stanze piene`} atlasArea="eroi" />
          <AdminMetric icon={<ImageIcon size={17} />} label="Media unici" value={mediaGroups.length} detail={`${media.length} riferimenti totali`} atlasArea="media" />
          <AdminMetric icon={<AlertTriangle size={17} />} label="Attenzione" value={roomInsights.riskyRooms} detail="stanze da controllare" tone={roomInsights.riskyRooms ? "warn" : "good"} atlasArea="superadmin" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Sezioni superadmin">
          <button
            type="button"
            onClick={() => setView("rooms")}
            role="tab"
            aria-selected={view === "rooms"}
            className={`ui-tab-button ${view === "rooms" ? "is-active" : ""}`}
          >
            Stanze ({rooms.length})
          </button>
          <button
            type="button"
            onClick={() => setView("media")}
            role="tab"
            aria-selected={view === "media"}
            className={`ui-tab-button ${view === "media" ? "is-active" : ""}`}
          >
            Media caricati ({mediaGroups.length})
          </button>
        </div>
      </header>

      {view === "rooms" ? (
        <section className="grid gap-4">
          <div className="glass-panel rounded-lg p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
              <label className="relative block">
                <span className="sr-only">Cerca stanze</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input className="input-grimoire field w-full py-2 pl-9 pr-3 text-sm" placeholder="Cerca nome, codice, campagna..." value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} />
              </label>
              <label className="grid gap-1 text-xs text-slate-400">
                Filtro
                <select className="input-grimoire field px-3 py-2 text-sm" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value as typeof roomFilter)}>
                  <option value="all">Tutte</option>
                  <option value="empty">Vuote</option>
                  <option value="full">Piene</option>
                  <option value="inactive">Da controllare</option>
                  <option value="recent">Recenti</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-slate-400">
                Ordina
                <select className="input-grimoire field px-3 py-2 text-sm" value={roomSort} onChange={(event) => setRoomSort(event.target.value as typeof roomSort)}>
                  <option value="risk">Priorita</option>
                  <option value="created">Creazione</option>
                  <option value="players">Giocatori</option>
                  <option value="name">Nome</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">Mostro {visibleRooms.length} di {rooms.length} stanze.</p>
          </div>

          {visibleRooms.map((room) => (
            <AdminRoomCard key={room.id} room={room} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
          {!visibleRooms.length ? <p className="glass-panel rounded-lg p-5 text-sm text-slate-300">Nessuna stanza corrisponde ai filtri.</p> : null}
        </section>
      ) : (
        <section className="glass-panel rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Contenuti multimediali caricati</h2>
              <p className="mt-1 text-sm text-slate-400">
                File unici raggruppati per URL. I riferimenti duplicati restano visibili solo in modalita debug.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(14rem,1fr)_10rem_10rem]">
              <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Cerca media..." value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} />
              <select className="input-grimoire field px-3 py-2 text-sm" value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value as typeof mediaFilter)} aria-label="Filtra media per tipo">
                <option value="all">Tutti</option>
                <option value="image">Immagini</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="sound">Sound</option>
                <option value="portrait">Portrait</option>
                <option value="object">Oggetti</option>
              </select>
              <select className="input-grimoire field px-3 py-2 text-sm" value={mediaSort} onChange={(event) => setMediaSort(event.target.value as typeof mediaSort)} aria-label="Ordina media">
                <option value="created">Recenti</option>
                <option value="title">Titolo</option>
                <option value="type">Tipo</option>
                <option value="room">Stanza</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs leading-5 text-slate-400">
              Mostro <strong className="text-brass">{visibleMediaCount}</strong> {showMediaReferences ? "riferimenti" : "file unici"}.
              {" "}Totale: {mediaGroups.length} file unici, {media.length} riferimenti.
            </p>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showMediaReferences}
                onChange={(event) => setShowMediaReferences(event.target.checked)}
                className="accent-brass"
              />
              Mostra riferimenti duplicati
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AdminMetric icon={<ImageIcon size={16} />} label="Visuali" value={mediaInsights.visualAssets} detail="scene, portrait, oggetti" atlasArea="scene" />
            <AdminMetric icon={<AudioLines size={16} />} label="Audio" value={mediaInsights.audioAssets} detail="tracce e sound effect" atlasArea="audio" />
            <AdminMetric icon={<CalendarClock size={16} />} label="Duplicati" value={mediaInsights.duplicateReferences} detail="riferimenti raggruppati" tone={mediaInsights.duplicateReferences ? "warn" : "good"} atlasArea="media" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {showMediaReferences
              ? visibleMediaReferences.map((item) => (
                  <AdminMediaCard key={`${item.source}-${item.id}`} item={item} onDelete={onDeleteMedia} />
                ))
              : visibleMediaGroups.map((group) => (
                  <AdminMediaGroupCard key={group.key} group={group} onDelete={onDeleteMedia} />
                ))}
          </div>
          {!visibleMediaCount ? <p className="social-empty-state mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-center text-sm text-slate-300">Nessun media trovato.</p> : null}
        </section>
      )}
    </section>
  );
}

function AdminMetric({
  icon,
  label,
  value,
  detail,
  atlasArea,
  tone = "neutral"
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  atlasArea: string;
  tone?: "neutral" | "warn" | "good";
}) {
  const toneClass = tone === "warn" ? "border-amber-300/25 bg-amber-500/10 text-amber-100" : tone === "good" ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-slate-100";

  return (
    <article className={`admin-metric-card rounded-lg border p-3 ${toneClass}`} data-atlas-area={atlasArea}>
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] opacity-80">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </article>
  );
}

function AdminMediaCard({ item, onDelete }: { item: AdminMediaOverview; onDelete: (media: AdminMediaOverview) => void }) {
  const isVisual = item.asset_type === "image" || item.asset_type === "portrait" || item.asset_type === "object";

  return (
    <article className={`admin-media-card admin-media-card--${item.asset_type} rounded-lg border border-white/10 bg-black/25 p-3`}>
      <div className="aspect-video overflow-hidden rounded-md bg-black/50">
        {isVisual ? (
          <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.url})` }} />
        ) : item.asset_type === "video" ? (
          <video className="h-full w-full object-cover" src={item.url} muted playsInline loop />
        ) : (
          <div className="flex h-full items-center justify-center text-brass">
            <AudioLines size={30} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{item.title}</p>
          <p className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            {item.asset_type === "video" ? <Film size={13} /> : item.asset_type === "image" ? <ImageIcon size={13} /> : <AudioLines size={13} />}
            {item.asset_type} · {item.source}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/25 text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 transition duration-150 relative overflow-hidden"
          title="Elimina media"
          aria-label="Elimina media"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{item.campaign_title ?? "Campagna"} · {item.room_name ?? item.room_id}</p>
      <p className="mt-1 truncate text-xs text-slate-600">{item.url}</p>
    </article>
  );
}

function AdminMediaGroupCard({ group, onDelete }: { group: AdminMediaGroup; onDelete: (media: AdminMediaOverview) => void }) {
  const primary = group.references[0];
  const isVisual = group.asset_type === "image" || group.asset_type === "portrait" || group.asset_type === "object";
  const hasDuplicates = group.references.length > 1;

  return (
    <article className={`admin-media-card admin-media-card--${group.asset_type} rounded-lg border border-white/10 bg-black/25 p-3`}>
      <div className="aspect-video overflow-hidden rounded-md bg-black/50">
        {isVisual ? (
          <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${group.url})` }} />
        ) : group.asset_type === "video" ? (
          <video className="h-full w-full object-cover" src={group.url} muted playsInline loop />
        ) : (
          <div className="flex h-full items-center justify-center text-brass">
            <AudioLines size={30} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{group.title}</p>
          <p className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            {group.asset_type === "video" ? <Film size={13} /> : group.asset_type === "image" ? <ImageIcon size={13} /> : <AudioLines size={13} />}
            {group.asset_type} · {group.sources.join(" + ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(primary)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/25 text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 transition duration-150 relative overflow-hidden"
          title={hasDuplicates ? "Elimina il riferimento principale. Attiva i riferimenti duplicati per cancellare una fonte specifica." : "Elimina media"}
          aria-label={hasDuplicates ? "Elimina riferimento principale del media raggruppato" : "Elimina media"}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {group.sources.map((source) => (
          <span key={source} className="rounded border border-brass/15 bg-brass/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brass">
            {sourceLabel(source)}
          </span>
        ))}
        {hasDuplicates ? (
          <span className="rounded border border-amber-300/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-100">
            {group.references.length} riferimenti
          </span>
        ) : null}
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{group.campaign_titles[0] ?? "Campagna"} · {group.room_names[0] ?? primary.room_id}</p>
      <p className="mt-1 truncate text-xs text-slate-600">{group.url}</p>
      {hasDuplicates ? (
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          File unico riusato in piu punti. Per eliminare solo “audio”, “soundbar” o “media asset”, attiva “Mostra riferimenti duplicati”.
        </p>
      ) : null}
    </article>
  );
}

function AdminRoomCard({
  room,
  onUpdate,
  onDelete
}: {
  room: AdminRoomOverview;
  onUpdate: (roomId: string, values: { name: string; inviteCode: string; maxPlayers: number }) => void;
  onDelete: (room: AdminRoomOverview) => void;
}) {
  const [name, setName] = useState(room.name);
  const [inviteCode, setInviteCode] = useState(room.invite_code);
  const [maxPlayers, setMaxPlayers] = useState(room.max_players ?? 4);
  const risk = getRoomRisk(room, []);

  return (
    <article className="admin-room-card glass-panel rounded-lg p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${risk.level === "warn" ? "border-amber-300/30 bg-amber-400/10 text-amber-100" : risk.level === "danger" ? "border-rose-300/30 bg-rose-400/10 text-rose-100" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"}`}>
          {risk.label}
        </span>
        <span className="text-xs text-slate-500">Creata {formatDate(room.created_at)}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_9rem_7rem] lg:items-end">
        <label className="grid gap-2 text-sm text-slate-200">
          Nome stanza
          <input className="input-grimoire field px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Codice
          <input className="input-grimoire field px-3 py-2 font-mono" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Posti
          <input className="input-grimoire field px-3 py-2" type="number" min={1} max={12} value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))} />
        </label>
        <div className="text-sm text-slate-300">
          <p className="truncate text-white">{room.campaign_title ?? "Campagna"}</p>
          <p className="text-xs text-slate-500">{room.player_count ?? 0}/{maxPlayers} giocatori</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate(room.id, { name: name.trim(), inviteCode: inviteCode.trim().toUpperCase(), maxPlayers })}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/35 bg-emerald-950/25 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 transition duration-150 relative overflow-hidden"
            title="Salva modifiche"
            aria-label="Salva modifiche"
          >
            <Save size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(room)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/25 text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 transition duration-150 relative overflow-hidden"
            title="Elimina stanza"
            aria-label="Elimina stanza"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">ID stanza: {room.id}</p>
    </article>
  );
}

function buildRoomInsights(rooms: AdminRoomOverview[], media: AdminMediaOverview[]) {
  return rooms.reduce(
    (acc, room) => {
      const players = room.player_count ?? 0;
      const maxPlayers = room.max_players ?? 4;
      const risk = getRoomRisk(room, media);
      acc.totalPlayers += players;
      if (players > 0) acc.activeRooms += 1;
      if (players >= maxPlayers) acc.fullRooms += 1;
      if (risk.level !== "good") acc.riskyRooms += 1;
      return acc;
    },
    { totalPlayers: 0, activeRooms: 0, fullRooms: 0, riskyRooms: 0 }
  );
}

function buildMediaInsights(groups: AdminMediaGroup[]) {
  return groups.reduce(
    (acc, group) => {
      if (group.asset_type === "audio" || group.asset_type === "sound") acc.audioAssets += 1;
      else acc.visualAssets += 1;
      acc.duplicateReferences += Math.max(0, group.references.length - 1);
      return acc;
    },
    { visualAssets: 0, audioAssets: 0, duplicateReferences: 0 }
  );
}

function groupMediaByUrl(media: AdminMediaOverview[]): AdminMediaGroup[] {
  const groups = new Map<string, AdminMediaGroup>();

  media.forEach((item) => {
    const key = normalizeMediaUrl(item.url) || `${item.source}:${item.id}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        title: cleanMediaTitle(item.title),
        asset_type: item.asset_type,
        url: item.url,
        created_at: item.created_at,
        sources: [item.source],
        room_names: item.room_name ? [item.room_name] : [],
        campaign_titles: item.campaign_title ? [item.campaign_title] : [],
        references: [item]
      });
      return;
    }

    existing.references.push(item);
    existing.sources = unique([...existing.sources, item.source]);
    existing.room_names = unique([...existing.room_names, item.room_name].filter(Boolean) as string[]);
    existing.campaign_titles = unique([...existing.campaign_titles, item.campaign_title].filter(Boolean) as string[]);
    existing.created_at = latestDate(existing.created_at, item.created_at);
    existing.title = preferMediaTitle(existing.title, item.title);
    existing.asset_type = preferMediaType(existing.asset_type, item.asset_type);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    references: [...group.references].sort((a, b) => sourceRank(a.source) - sourceRank(b.source) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))),
    sources: [...group.sources].sort((a, b) => sourceRank(a) - sourceRank(b))
  }));
}

function compareRooms(a: AdminRoomOverview, b: AdminRoomOverview, sort: "created" | "players" | "name" | "risk", media: AdminMediaOverview[]) {
  if (sort === "players") return (b.player_count ?? 0) - (a.player_count ?? 0);
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "risk") return roomRiskScore(b, media) - roomRiskScore(a, media) || b.created_at.localeCompare(a.created_at);
  return b.created_at.localeCompare(a.created_at);
}

function compareMedia(a: AdminMediaOverview, b: AdminMediaOverview, sort: "created" | "title" | "type" | "room") {
  if (sort === "title") return a.title.localeCompare(b.title);
  if (sort === "type") return a.asset_type.localeCompare(b.asset_type);
  if (sort === "room") return (a.room_name ?? "").localeCompare(b.room_name ?? "");
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

function compareMediaGroups(a: AdminMediaGroup, b: AdminMediaGroup, sort: "created" | "title" | "type" | "room") {
  if (sort === "title") return a.title.localeCompare(b.title);
  if (sort === "type") return a.asset_type.localeCompare(b.asset_type);
  if (sort === "room") return (a.room_names[0] ?? "").localeCompare(b.room_names[0] ?? "");
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

function normalizeMediaUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "").toLowerCase();
  } catch {
    return trimmed.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
  }
}

function cleanMediaTitle(title: string) {
  return title.replace(/\s+-\s+(scena iniziale|immagine|video)$/i, "").trim() || title;
}

function preferMediaTitle(current: string, candidate: string) {
  const cleanCandidate = cleanMediaTitle(candidate);
  if (current.length <= cleanCandidate.length) return current;
  return cleanCandidate;
}

function preferMediaType(current: AdminMediaOverview["asset_type"], candidate: AdminMediaOverview["asset_type"]) {
  if (current === candidate) return current;
  if (current === "sound" && candidate === "audio") return "audio";
  if (current === "audio" && candidate === "sound") return "audio";
  if (candidate === "video") return "video";
  if (candidate === "image") return "image";
  return current;
}

function latestDate(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return b.localeCompare(a) > 0 ? b : a;
}

function sourceRank(source: AdminMediaOverview["source"]) {
  if (source === "media_asset") return 0;
  if (source === "audio") return 1;
  if (source === "sound") return 2;
  return 3;
}

function sourceLabel(source: AdminMediaOverview["source"]) {
  if (source === "media_asset") return "Libreria";
  if (source === "audio") return "Traccia";
  if (source === "sound") return "Soundbar";
  return "Scena";
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function roomRiskScore(room: AdminRoomOverview, media: AdminMediaOverview[]) {
  const players = room.player_count ?? 0;
  const maxPlayers = room.max_players ?? 4;
  const mediaCount = media.filter((item) => item.room_id === room.id).length;
  let score = 0;
  if (players === 0) score += 3;
  if (players >= maxPlayers) score += 1;
  if (ageInDays(room.created_at) > 45 && players === 0) score += 2;
  if (mediaCount > 30) score += 2;
  return score;
}

function getRoomRisk(room: AdminRoomOverview, media: AdminMediaOverview[]) {
  const players = room.player_count ?? 0;
  const maxPlayers = room.max_players ?? 4;
  const mediaCount = media.filter((item) => item.room_id === room.id).length;

  if (players === 0 && ageInDays(room.created_at) > 45) return { level: "danger" as const, label: "Vuota da verificare" };
  if (mediaCount > 30) return { level: "warn" as const, label: "Molti media" };
  if (players === 0) return { level: "warn" as const, label: "Nessun giocatore" };
  if (players >= maxPlayers) return { level: "warn" as const, label: "Stanza piena" };
  return { level: "good" as const, label: "Operativa" };
}

function ageInDays(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.floor((Date.now() - time) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return "data non disponibile";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data non disponibile";
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
