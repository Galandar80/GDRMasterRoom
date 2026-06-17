import type { RoomState } from "@/lib/types";

export type SmartNotificationPriority = "critical" | "high" | "normal" | "info";
export type SmartNotificationKind = "dice" | "spotlight" | "private" | "inventory" | "scene" | "audio" | "system";

export type SmartNotification = {
  id: string;
  kind: SmartNotificationKind;
  priority: SmartNotificationPriority;
  title: string;
  detail: string;
  count?: number;
  actionLabel?: string;
  actionTarget?: "chat" | "players" | "audio" | "inventory" | "private" | "scene" | "map";
};

export function buildMasterNotifications(state: RoomState): SmartNotification[] {
  const pendingDice = state.diceRequests.filter((request) => request.status === "pending");
  const activeSpotlightNpc = state.room.spotlight_npc_id ? state.npcs.find((npc) => npc.id === state.room.spotlight_npc_id) : null;
  const privateMessages = state.privateMessages.filter((message) => message.sender_user_id !== state.profile.id).slice(-3);
  const mutedPlayers = state.room.muted_user_ids?.length ?? 0;
  const audioStopped = state.room.audio_status === "stopped" || !state.room.current_audio_id;

  const items: SmartNotification[] = [];

  if (pendingDice.length) {
    items.push({
      id: "master-dice",
      kind: "dice",
      priority: "critical",
      title: `${pendingDice.length} tiro${pendingDice.length === 1 ? "" : "i"} in attesa`,
      detail: "Ci sono richieste dado non risolte durante la sessione.",
      count: pendingDice.length,
      actionLabel: "Apri chat",
      actionTarget: "chat"
    });
  }

  if (activeSpotlightNpc) {
    items.push({
      id: "master-spotlight",
      kind: "spotlight",
      priority: "high",
      title: "Spotlight attivo",
      detail: `${activeSpotlightNpc.name} e in evidenza scenica.`,
      count: 1,
      actionLabel: "Gestisci NPC",
      actionTarget: "chat"
    });
  }

  if (privateMessages.length) {
    items.push({
      id: "master-private",
      kind: "private",
      priority: "normal",
      title: "Sussurri recenti",
      detail: `${privateMessages.length} messaggi privati recenti da controllare.`,
      count: privateMessages.length,
      actionLabel: "Apri chat",
      actionTarget: "chat"
    });
  }

  if (mutedPlayers) {
    items.push({
      id: "master-muted",
      kind: "system",
      priority: "info",
      title: "Chat limitata",
      detail: `${mutedPlayers} giocator${mutedPlayers === 1 ? "e" : "i"} con chat disattivata.`,
      count: mutedPlayers,
      actionLabel: "Apri giocatori",
      actionTarget: "players"
    });
  }

  if (audioStopped) {
    items.push({
      id: "master-audio",
      kind: "audio",
      priority: "info",
      title: "Audio non attivo",
      detail: "La scena non ha audio globale in riproduzione.",
      actionLabel: "Apri audio",
      actionTarget: "audio"
    });
  }

  return sortNotifications(items);
}

export function buildPlayerNotifications(state: RoomState, unreadPrivateCount: number, unreadInventoryCount: number): SmartNotification[] {
  const visibleDice = state.diceRequests.filter((request) => (!request.target_user_id || request.target_user_id === state.profile.id) && request.status === "pending");
  const spotlightVisible = state.room.spotlight_visibility !== "off" && Boolean(state.room.spotlight_npc_id);
  const spotlightNpc = spotlightVisible ? state.npcs.find((npc) => npc.id === state.room.spotlight_npc_id) : null;
  const audioChanged = Boolean(state.room.current_sound_effect_id);
  const muted = state.room.chat_enabled === false || Boolean(state.room.muted_user_ids?.includes(state.profile.id));

  const items: SmartNotification[] = [];

  if (visibleDice.length) {
    items.push({
      id: "player-dice",
      kind: "dice",
      priority: "critical",
      title: `${visibleDice.length} tiro${visibleDice.length === 1 ? "" : "i"} richiesto`,
      detail: "Il Master aspetta una risposta dado.",
      count: visibleDice.length,
      actionLabel: "Vai ai dadi",
      actionTarget: "scene"
    });
  }

  if (unreadPrivateCount) {
    items.push({
      id: "player-private",
      kind: "private",
      priority: "high",
      title: "Nuovi sussurri",
      detail: `${unreadPrivateCount} messaggi privati non letti.`,
      count: unreadPrivateCount,
      actionLabel: "Apri sussurri",
      actionTarget: "private"
    });
  }

  if (unreadInventoryCount) {
    items.push({
      id: "player-inventory",
      kind: "inventory",
      priority: "normal",
      title: "Inventario aggiornato",
      detail: `${unreadInventoryCount} nuovi oggetti assegnati.`,
      count: unreadInventoryCount,
      actionLabel: "Apri inventario",
      actionTarget: "inventory"
    });
  }

  if (spotlightNpc) {
    items.push({
      id: "player-spotlight",
      kind: "spotlight",
      priority: "normal",
      title: "Focus narrativo",
      detail: `${spotlightNpc.name} e al centro della scena.`,
      count: 1,
      actionLabel: "Guarda scena",
      actionTarget: "scene"
    });
  }

  if (audioChanged) {
    items.push({
      id: "player-sound",
      kind: "audio",
      priority: "info",
      title: "Effetto sonoro attivo",
      detail: "Un cue audio sta accompagnando la scena.",
      actionLabel: "Guarda scena",
      actionTarget: "scene"
    });
  }

  if (muted) {
    items.push({
      id: "player-muted",
      kind: "system",
      priority: "info",
      title: "Chat limitata",
      detail: state.room.chat_enabled === false ? "La chat comune e disattivata dal Master." : "La tua chat e temporaneamente disattivata.",
      actionLabel: "Leggi stato",
      actionTarget: "chat"
    });
  }

  return sortNotifications(items);
}

export function notificationToneClass(priority: SmartNotificationPriority) {
  if (priority === "critical") return "border-rose-300/25 bg-rose-500/10 text-rose-50";
  if (priority === "high") return "border-amber-300/25 bg-amber-500/10 text-amber-50";
  if (priority === "normal") return "border-brass/20 bg-brass/10 text-stone-100";
  return "border-sky-300/20 bg-sky-500/10 text-sky-50";
}

export function notificationBadgeCount(items: SmartNotification[]) {
  return items
    .filter((item) => item.priority !== "info")
    .reduce((sum, item) => sum + (item.count ?? 1), 0);
}

export function notificationReadKey(item: SmartNotification) {
  return `${item.id}:${item.priority}:${item.count ?? 1}:${item.detail}`;
}

export function readSeenNotificationKeys(storageKey: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

export function writeSeenNotificationKeys(storageKey: string, keys: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keys).slice(-80)));
  } catch {
    // Local storage can be unavailable in private browsing or hardened browser modes.
  }
}

function sortNotifications(items: SmartNotification[]) {
  const order: Record<SmartNotificationPriority, number> = { critical: 4, high: 3, normal: 2, info: 1 };
  return [...items].sort((a, b) => order[b.priority] - order[a.priority] || a.title.localeCompare(b.title));
}
