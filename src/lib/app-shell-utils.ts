import { demoRoomState } from "@/lib/demo-data";
import type { MapCharacterPosition, Message, NarrativeMap, Room, RoomState } from "@/lib/types";

export function addMessageToState(state: RoomState, message: Message) {
  if (message.is_private) {
    return state.privateMessages.some((item) => item.id === message.id)
      ? state
      : { ...state, privateMessages: [...state.privateMessages, message] };
  }
  if (message.channel === "off") {
    return state.offMessages.some((item) => item.id === message.id)
      ? state
      : { ...state, offMessages: [...state.offMessages, message] };
  }
  return state.messages.some((item) => item.id === message.id)
    ? state
    : { ...state, messages: [...state.messages, message] };
}

export function updateMessageInState(state: RoomState, message: Message) {
  const update = (items: Message[]) => items.map((item) => (item.id === message.id ? message : item));
  return {
    ...state,
    messages: update(state.messages),
    offMessages: update(state.offMessages),
    privateMessages: update(state.privateMessages)
  };
}

export function mergeMessagePages(olderMessages: Message[], currentMessages: Message[]) {
  const seen = new Set<string>();
  return [...olderMessages, ...currentMessages]
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function generateInviteCode(title: string) {
  const prefix = title.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "G");
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

export function readError(error: unknown) {
  const message = getErrorMessage(error);
  if (isMapSchemaError(error)) {
    return "Schema mappe Supabase non applicato. Esegui supabase/schema.sql o le migration mappe nel SQL Editor di Supabase.";
  }
  if (message.includes("public.users") || message.includes("schema cache") || message.includes("PGRST205")) {
    return "Login riuscito, ma manca lo schema database. Esegui supabase/schema.sql nel SQL Editor di Supabase.";
  }
  return message || "Operazione non riuscita. Controlla schema Supabase e permessi RLS.";
}

export function isMapSchemaError(error: unknown) {
  const normalized = getErrorMessage(error).toLowerCase();
  return normalized.includes("maps")
    || normalized.includes("map_")
    || normalized.includes("map character")
    || (normalized.includes("schema cache") && normalized.includes("map"));
}

export function createLocalNarrativeMap(
  room: Room,
  profileId: string,
  values: { title: string; description: string; imageUrl: string; parentMapId?: string | null; levelType: NarrativeMap["level_type"]; isVisibleToPlayers: boolean },
  imageUrl: string
): NarrativeMap {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    campaign_id: room.campaign_id,
    room_id: room.id,
    parent_map_id: values.parentMapId ?? null,
    title: values.title,
    description: values.description,
    image_url: imageUrl || values.imageUrl || demoRoomState.scene.image_url,
    level_type: values.levelType,
    is_active: false,
    is_visible_to_players: values.isVisibleToPlayers,
    created_by: profileId,
    created_at: now,
    updated_at: now
  };
}

export function upsertLocalMapPosition(positions: MapCharacterPosition[], position: MapCharacterPosition) {
  return positions.some((item) => item.id === position.id)
    ? positions.map((item) => (item.id === position.id ? position : item))
    : [position, ...positions];
}

export function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
}
