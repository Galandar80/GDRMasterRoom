export const MAP_REALTIME_EVENTS = ["ping", "drag", "drag-stop", "map-state", "request-map-state"] as const;
export type MapRealtimeEvent = (typeof MAP_REALTIME_EVENTS)[number];

const WEATHER_VALUES = new Set(["none", "rain", "snow", "fog", "sparkles"]);
const ATMOSPHERE_VALUES = new Set(["none", "night", "vintage", "cinematic", "crimson"]);

export function isMapRealtimeEvent(value: unknown): value is MapRealtimeEvent {
  return typeof value === "string" && MAP_REALTIME_EVENTS.includes(value as MapRealtimeEvent);
}

export function isValidMapRealtimePayload(event: MapRealtimeEvent, payload: unknown) {
  if (!isRecord(payload)) return false;

  switch (event) {
    case "ping":
      return isPercentage(payload.x) && isPercentage(payload.y) && isShortString(payload.color, 32);
    case "drag":
      return isShortString(payload.id, 128) && isPercentage(payload.x) && isPercentage(payload.y);
    case "drag-stop":
      return isShortString(payload.id, 128);
    case "map-state":
      return typeof payload.weather === "string"
        && WEATHER_VALUES.has(payload.weather)
        && typeof payload.atmosphere === "string"
        && ATMOSPHERE_VALUES.has(payload.atmosphere);
    case "request-map-state":
      return Object.keys(payload).length === 0;
  }
}

export function isValidDirectorCuePayload(payload: unknown): payload is { cueId: string; tone: string; message: string } {
  return isRecord(payload)
    && isShortString(payload.cueId, 128)
    && isShortString(payload.tone, 64)
    && isShortString(payload.message, 1_000);
}

export function isValidInventorySyncPayload(payload: unknown): payload is { action?: "upsert" | "delete"; item: { id: string } } {
  if (!isRecord(payload) || !isRecord(payload.item) || !isShortString(payload.item.id, 128)) return false;
  return payload.action === undefined || payload.action === "upsert" || payload.action === "delete";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isShortString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isPercentage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
