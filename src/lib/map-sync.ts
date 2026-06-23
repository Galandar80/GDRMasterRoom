import type { MapCharacterPosition, MapFogArea, Message, NarrativeMap, RoomState } from "@/lib/types";

export type MapSyncPayload = {
  kind: "map-sync";
  roomId: string;
  revision: string;
  maps: NarrativeMap[];
  mapCharacterPositions: MapCharacterPosition[];
  mapFogAreas?: MapFogArea[];
};

export const MAP_SYNC_PREFIX = "__gdr_map_sync__:";

export function buildMapSyncPayload(state: RoomState): MapSyncPayload {
  const visibleMaps = state.maps.filter((map) => map.is_visible_to_players);
  const visibleMapIds = new Set(visibleMaps.map((map) => map.id));
  const syncedPositions = state.mapCharacterPositions.filter(
    (position) => visibleMapIds.has(position.map_id) && position.is_visible_to_players !== false
  );
  const positionKeys = new Set(syncedPositions.map((position) => `${position.map_id}:${position.character_id}`));
  const fallbackPositions = visibleMaps.flatMap((map) =>
    state.characters
      .filter((character) => !positionKeys.has(`${map.id}:${character.id}`))
      .map((character, index) => ({
        id: `sync-position:${map.id}:${character.id}`,
        map_id: map.id,
        character_id: character.id,
        x: Math.min(82, Math.max(18, 22 + (index % 4) * 16)),
        y: Math.min(82, Math.max(18, 24 + Math.floor(index / 4) * 14)),
        narrative_location: map.title,
        is_visible_to_players: true,
        is_locked: false,
        updated_at: new Date(0).toISOString()
      }))
  );

  return {
    kind: "map-sync",
    roomId: state.room.id,
    revision: new Date().toISOString(),
    maps: visibleMaps,
    mapCharacterPositions: [...syncedPositions, ...fallbackPositions],
    mapFogAreas: state.mapFogAreas.filter((area) => visibleMapIds.has(area.map_id))
  };
}

export function parseMapSyncMessage(message: Message): MapSyncPayload | null {
  if (!message.content.startsWith(MAP_SYNC_PREFIX)) return null;

  try {
    const payload = JSON.parse(message.content.slice(MAP_SYNC_PREFIX.length)) as Partial<MapSyncPayload>;
    if (payload.kind !== "map-sync" || !payload.roomId || !payload.revision) return null;
    return {
      kind: "map-sync",
      roomId: payload.roomId,
      revision: payload.revision,
      maps: Array.isArray(payload.maps) ? payload.maps : [],
      mapCharacterPositions: Array.isArray(payload.mapCharacterPositions) ? payload.mapCharacterPositions : [],
      mapFogAreas: Array.isArray(payload.mapFogAreas) ? payload.mapFogAreas : []
    };
  } catch {
    return null;
  }
}

export function isValidMapSyncPayload(payload: unknown, roomId: string): payload is MapSyncPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<MapSyncPayload>;
  return candidate.kind === "map-sync"
    && candidate.roomId === roomId
    && typeof candidate.revision === "string"
    && candidate.revision.length > 0
    && candidate.revision.length <= 64
    && Array.isArray(candidate.maps)
    && candidate.maps.length <= 100
    && Array.isArray(candidate.mapCharacterPositions)
    && candidate.mapCharacterPositions.length <= 1_000
    && (candidate.mapFogAreas === undefined || (Array.isArray(candidate.mapFogAreas) && candidate.mapFogAreas.length <= 1_000));
}

export function applyMapSyncState(state: RoomState, payload: MapSyncPayload): RoomState {
  if (payload.roomId !== state.room.id) return state;

  const syncedMapIds = new Set(payload.maps.map((map) => map.id));
  const privateLocalMaps = state.maps.filter((map) => !map.is_visible_to_players && !syncedMapIds.has(map.id));
  const nextMaps = [...payload.maps, ...privateLocalMaps].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return String(b.updated_at ?? b.created_at).localeCompare(String(a.updated_at ?? a.created_at));
  });

  return {
    ...state,
    maps: nextMaps,
    mapCharacterPositions: [
      ...payload.mapCharacterPositions,
      ...state.mapCharacterPositions.filter((position) => !syncedMapIds.has(position.map_id))
    ],
    mapFogAreas: [
      ...(payload.mapFogAreas ?? []),
      ...state.mapFogAreas.filter((area) => !syncedMapIds.has(area.map_id))
    ]
  };
}
