"use client";

import { Dice5, Eye, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Character, DiceRequest, Npc, Room } from "@/lib/types";
import { getDiceCount, stripDiceCountMarker } from "@/lib/game-random";

export function DiceRequestPanel({
  characters,
  onCreate
}: {
  characters: Character[];
  onCreate: (values: { diceCount: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }) => void;
}) {
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [reason, setReason] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  return (
    <section className="ui-panel-window relative p-5 shadow-lg rounded-xl border border-brass/25 bg-ink-950/90 overflow-hidden">
      {/* Decorative Corners */}
      <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 border-l border-t border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 border-r border-t border-brass/40 pointer-events-none" />
      <div className="absolute left-1.5 bottom-1.5 h-1.5 w-1.5 border-l border-b border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 border-r border-b border-brass/40 pointer-events-none" />

      <h2 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-[0.24em] text-brass">
        <Dice5 size={14} className="filter drop-shadow-[0_0_5px_rgba(200,163,93,0.3)]" /> Richiedi tiro
      </h2>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ diceCount, diceSides, reason: reason.trim(), targetUserId: targetUserId || null, visibility });
          setReason("");
        }}
      >
        <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr_1fr_1fr]">
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Dadi
            <input
              className="field px-3 py-2 text-xs mt-1"
              aria-label="Numero dadi"
              type="number"
              min="1"
              max="20"
              value={diceCount}
              onChange={(event) => setDiceCount(Math.max(1, Number(event.target.value)))}
            />
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Tipo
            <select className="field px-3 py-2 text-xs mt-1" value={diceSides} onChange={(event) => setDiceSides(Number(event.target.value))}>
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <option key={sides} value={sides} className="bg-ink-950 text-stone-200">d{sides}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Destinatario
            <select className="field px-3 py-2 text-xs mt-1" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
              <option value="" className="bg-ink-950 text-stone-200">Tutti</option>
              {characters.map((character) => (
                <option key={character.id} value={character.user_id} className="bg-ink-950 text-stone-200">
                  {character.character_name} {character.character_surname}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Visibilità
            <select className="field px-3 py-2 text-xs mt-1" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")}>
              <option value="public" className="bg-ink-950 text-stone-200">Pubblico</option>
              <option value="private" className="bg-ink-950 text-stone-200">Privato</option>
            </select>
          </label>
        </div>
        <div className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Motivazione
          <input className="field px-3 py-2 text-xs mt-1" placeholder="Es. Percezione o Storia..." value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <button className="ui-btn-fantasy w-full mt-1.5 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-xs font-bold uppercase tracking-wider text-stone-900 transition">
          <Send size={13} /> Invia richiesta
        </button>
      </form>
    </section>
  );
}

export function PlayerDicePanel({ requests, onRoll }: { requests: DiceRequest[]; onRoll: (request: DiceRequest) => void }) {
  const pending = requests.filter((request) => request.status === "pending");
  if (!pending.length) return null;

  return (
    <section className="ui-panel-window relative p-5 shadow-lg rounded-xl border border-brass/25 bg-ink-950/90 overflow-hidden">
      {/* Decorative Corners */}
      <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 border-l border-t border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 border-r border-t border-brass/40 pointer-events-none" />
      <div className="absolute left-1.5 bottom-1.5 h-1.5 w-1.5 border-l border-b border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 border-r border-b border-brass/40 pointer-events-none" />

      <h2 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-[0.24em] text-brass">
        <Dice5 size={14} className="filter drop-shadow-[0_0_5px_rgba(200,163,93,0.3)]" /> Tiri richiesti
      </h2>
      <div className="mt-4 grid gap-2">
        {pending.map((request) => (
          <article key={request.id} className="flex items-center justify-between gap-3 rounded-lg border border-brass/15 bg-white/[0.02] p-3.5">
            <div>
              <p className="font-serif text-sm font-bold tracking-wide text-stone-100">Tira {getDiceCount(request)}d{request.dice_sides}</p>
              <p className="text-xs text-stone-400 mt-0.5">{stripDiceCountMarker(request.reason) || "Tiro richiesto dal Master"}</p>
            </div>
            <button
              type="button"
              onMouseEnter={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiHover());
              }}
              onClick={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiDiceRoll());
                onRoll(request);
              }}
              className="ui-btn-fantasy flex items-center justify-center rounded px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider text-stone-900 transition"
            >
              Tira
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SpotlightPanel({ room, npcs, currentUserId }: { room: Room; npcs: Npc[]; currentUserId: string }) {
  const npc = useMemo(() => npcs.find((item) => item.id === room.spotlight_npc_id), [npcs, room.spotlight_npc_id]);
  const visible =
    npc &&
    room.spotlight_visibility !== "off" &&
    (room.spotlight_visibility === "public" || room.spotlight_user_ids?.includes(currentUserId));

  // Sound trigger on NPC entry
  useEffect(() => {
    if (visible) {
      // Lazy load sound to avoid server-side window undefined
      import("@/lib/sound-generator").then((mod) => {
        mod.playUiModalOpen();
      });
    }
  }, [visible, room.spotlight_npc_id]);

  if (!visible) return null;

  return (
    <section className="animate-slide-up relative overflow-hidden rounded-xl border-2 border-double border-brass/40 bg-ink-950/90 p-5 shadow-[0_0_20px_rgba(200,163,93,0.18)] backdrop-blur-md">
      {/* Decorative corners */}
      <div className="absolute left-1 top-1 h-2 w-2 border-l border-t border-brass/50" />
      <div className="absolute right-1 top-1 h-2 w-2 border-r border-t border-brass/50" />
      <div className="absolute left-1 bottom-1 h-2 w-2 border-l border-b border-brass/50" />
      <div className="absolute right-1 bottom-1 h-2 w-2 border-r border-b border-brass/50" />

      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-brass">
        <UserRound size={14} /> In conversazione attiva
      </h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {npc.portrait_url ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-brass/35 bg-black/40 shadow-md sm:h-28 sm:w-28">
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: `url(${npc.portrait_url})` }}
            />
            {/* Spotlight overlay effect */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-1 right-1 h-2 w-2 animate-ping rounded-full bg-brass" />
          </div>
        ) : null}
        <div className="flex-1">
          <p className="font-serif text-lg font-bold tracking-wide" style={{ color: npc.color }}>
            {npc.name}
          </p>
          <div className="mt-2 text-sm leading-relaxed text-slate-200 bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg font-light italic">
            &ldquo;{npc.description}&rdquo;
          </div>
        </div>
      </div>
    </section>
  );
}

export function SpotlightManager({
  room,
  npcs,
  characters,
  onSave
}: {
  room: Room;
  npcs: Npc[];
  characters: Character[];
  onSave: (values: { npcId: string | null; visibility: "off" | "public" | "private"; userIds: string[] }) => void;
}) {
  const [npcId, setNpcId] = useState(room.spotlight_npc_id ?? "");
  const [visibility, setVisibility] = useState<"off" | "public" | "private">(room.spotlight_visibility ?? "off");
  const [userIds, setUserIds] = useState<string[]>(room.spotlight_user_ids ?? []);

  return (
    <section className="ui-panel-window relative p-5 shadow-lg rounded-xl border border-brass/25 bg-ink-950/90 overflow-hidden">
      {/* Decorative Corners */}
      <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 border-l border-t border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 border-r border-t border-brass/40 pointer-events-none" />
      <div className="absolute left-1.5 bottom-1.5 h-1.5 w-1.5 border-l border-b border-brass/40 pointer-events-none" />
      <div className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 border-r border-b border-brass/40 pointer-events-none" />

      <h2 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-[0.24em] text-brass">
        <Eye size={14} className="filter drop-shadow-[0_0_5px_rgba(200,163,93,0.3)]" /> Personaggio in conversazione
      </h2>
      <div className="mt-4 grid gap-3">
        <div className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Seleziona NPC
          <select className="field px-3 py-2 text-xs mt-1" value={npcId} onChange={(event) => setNpcId(event.target.value)}>
            <option value="" className="bg-ink-950 text-stone-200">Nessuno</option>
            {npcs.map((npc) => <option key={npc.id} value={npc.id} className="bg-ink-950 text-stone-200">{npc.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Visibilità
          <select className="field px-3 py-2 text-xs mt-1" value={visibility} onChange={(event) => setVisibility(event.target.value as "off" | "public" | "private")}>
            <option value="off" className="bg-ink-950 text-stone-200">Nascosto</option>
            <option value="public" className="bg-ink-950 text-stone-200">Pubblico</option>
            <option value="private" className="bg-ink-950 text-stone-200">Solo selezionati</option>
          </select>
        </div>
        {visibility === "private" ? (
          <div className="grid gap-1.5 max-h-40 overflow-y-auto pr-1 mt-1 scrollbar-soft">
            {characters.map((character) => (
              <label key={character.id} className="flex items-center justify-between rounded border border-brass/15 bg-white/[0.01] px-3 py-1.5 text-xs text-stone-300">
                {character.character_name} {character.character_surname}
                <input
                  type="checkbox"
                  className="accent-brass"
                  checked={userIds.includes(character.user_id)}
                  onChange={() => setUserIds((ids) => (ids.includes(character.user_id) ? ids.filter((id) => id !== character.user_id) : [...ids, character.user_id]))}
                />
              </label>
            ))}
          </div>
        ) : null}
        <button type="button" onClick={() => onSave({ npcId: npcId || null, visibility, userIds })} className="ui-btn-fantasy w-full mt-1.5 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-serif text-xs font-bold uppercase tracking-wider text-stone-900 transition">
          Salva focus
        </button>
      </div>
    </section>
  );
}
