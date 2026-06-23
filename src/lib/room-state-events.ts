import type { InventoryItem, RoomState } from "@/lib/types";

type CollectionKey =
  | "diceRequests"
  | "mediaAssets"
  | "scenes"
  | "audioTracks"
  | "soundEffects"
  | "characters"
  | "inventory";

type RealtimeRowPayload = {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export function updateCollectionEvent(
  state: RoomState,
  key: CollectionKey,
  payload: RealtimeRowPayload,
  sortKey: string,
  ascending: boolean
) {
  const items = state[key] as unknown as Array<{ id: string } & Record<string, unknown>>;
  if (payload.eventType === "DELETE") {
    return { ...state, [key]: items.filter((item) => item.id !== payload.old.id) };
  }

  const incoming = payload.new as { id: string } & Record<string, unknown>;
  const merged = items.some((item) => item.id === incoming.id)
    ? items.map((item) => (item.id === incoming.id ? incoming : item))
    : [...items, incoming];
  const sorted = merged.sort((a, b) => {
    const left = String(a[sortKey] ?? "");
    const right = String(b[sortKey] ?? "");
    return ascending ? left.localeCompare(right) : right.localeCompare(left);
  });

  return { ...state, [key]: sorted };
}

export function applyInventorySync(state: RoomState, action: "upsert" | "delete", incoming: InventoryItem) {
  const characterIds = new Set(state.characters.map((character) => character.id));
  const currentCharacter = state.characters.find((character) => character.user_id === state.profile.id);
  const isMaster = state.profile.role === "master" || state.campaigns.some((campaign) => campaign.master_id === state.profile.id);

  if (action === "delete") {
    return { ...state, inventory: state.inventory.filter((item) => item.id !== incoming.id) };
  }
  if (!characterIds.has(incoming.character_id)) return state;
  if (!isMaster && incoming.character_id !== currentCharacter?.id && !incoming.is_public) {
    return { ...state, inventory: state.inventory.filter((item) => item.id !== incoming.id) };
  }

  const merged = state.inventory.some((item) => item.id === incoming.id)
    ? state.inventory.map((item) => (item.id === incoming.id ? incoming : item))
    : [...state.inventory, incoming];
  return { ...state, inventory: merged.sort((a, b) => a.name.localeCompare(b.name)) };
}
