"use client";
// Force Vercel rebuild: map layout details header on top

import { Compass, Copy, Crosshair, DoorOpen, Expand, Eye, EyeOff, Flag, ImageUp, Map, MapPinned, Minus, Move, Plus, RotateCcw, Ruler, Search, Trash2, UsersRound } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character, MapCharacterPosition, MapCustomMarker, MapHotspot, MapNpcMarker, MapFogArea, NarrativeMap, Npc, RoomState } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type MapToolPanelProps = {
  state: RoomState;
  isMaster: boolean;
  onCreateMap?: (values: { title: string; description: string; imageUrl: string; imageFile?: File; parentMapId?: string | null; levelType: NarrativeMap["level_type"]; isVisibleToPlayers: boolean }) => void | Promise<void>;
  onSetActiveMap?: (map: NarrativeMap) => void | Promise<void>;
  onDeleteMap?: (map: NarrativeMap) => void | Promise<void>;
  onDuplicateMap?: (map: NarrativeMap) => void | Promise<void>;
  onUpdateCharacterPosition?: (position: MapCharacterPosition, values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }) => void | Promise<void>;
  onCreateMapFogArea?: (values: { mapId: string; shapeType: "rect" | "circle" | "polygon"; shapeData: Record<string, any>; isRevealed: boolean }) => void | Promise<void>;
  onUpdateMapFogArea?: (id: string, values: { shapeData: Record<string, any>; isRevealed: boolean }) => void | Promise<void>;
  onDeleteMapFogArea?: (id: string) => void | Promise<void>;
};

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

const levelOptions: { value: NarrativeMap["level_type"]; label: string }[] = [
  { value: "world", label: "Mondo" },
  { value: "region", label: "Regione" },
  { value: "city", label: "Citta" },
  { value: "district", label: "Quartiere" },
  { value: "building", label: "Edificio" },
  { value: "floor", label: "Piano" },
  { value: "room", label: "Stanza" },
  { value: "custom", label: "Custom" }
];

export function MapToolPanel({
  state,
  isMaster,
  onCreateMap,
  onSetActiveMap,
  onDeleteMap,
  onDuplicateMap,
  onUpdateCharacterPosition,
  onCreateMapFogArea,
  onUpdateMapFogArea,
  onDeleteMapFogArea
}: MapToolPanelProps) {
  const visibleMaps = useMemo(
    () => (isMaster ? state.maps : state.maps.filter((map) => map.is_visible_to_players)),
    [isMaster, state.maps]
  );
  const activeMap = visibleMaps.find((map) => map.is_active) ?? visibleMaps[0];
  const [selectedMapId, setSelectedMapId] = useState(activeMap?.id ?? "");
  const currentMap = isMaster
    ? (visibleMaps.find((map) => map.id === selectedMapId) ?? activeMap)
    : activeMap;
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [levelType, setLevelType] = useState<NarrativeMap["level_type"]>("custom");
  const [isVisibleToPlayers, setIsVisibleToPlayers] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const filteredMaps = visibleMaps.filter((map) => `${map.title} ${map.description}`.toLowerCase().includes(query.toLowerCase()));
  const childMaps = currentMap ? visibleMaps.filter((map) => map.parent_map_id === currentMap.id) : [];
  const breadcrumb = currentMap ? buildMapBreadcrumb(visibleMaps, currentMap) : [];
  const characterPositions = useMemo(
    () => (currentMap ? buildMapCharacterPositions(currentMap, state.characters, state.mapCharacterPositions) : []),
    [currentMap, state.characters, state.mapCharacterPositions]
  );

  useEffect(() => {
    if (!activeMap) return;
    setSelectedMapId((current) => (visibleMaps.some((map) => map.id === current) ? current : activeMap.id));
  }, [activeMap, visibleMaps]);

  function updateIndicator(position: MapCharacterPosition, values: Partial<{ x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }>) {
    if (!currentMap || !onUpdateCharacterPosition) return;
    onUpdateCharacterPosition(position, {
      x: clamp(values.x ?? position.x, 2, 98),
      y: clamp(values.y ?? position.y, 2, 98),
      narrativeLocation: values.narrativeLocation ?? position.narrative_location ?? currentMap.title,
      isVisibleToPlayers: values.isVisibleToPlayers ?? position.is_visible_to_players,
      isLocked: values.isLocked ?? position.is_locked
    });
  }

  return (
    <section className="map-tool-panel director-tool-panel glass-panel rounded-lg p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="director-tool-eyebrow flex items-center gap-2">
            <MapPinned size={17} /> Atlante narrativo
          </p>
          <h2 className="font-serif text-3xl text-white">Mappa</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
            {isMaster
              ? "Gestisci mappe, livelli, marker e posizioni senza update continui: i marker salvano solo quando li rilasci."
              : "Visualizza la mappa attiva, i punti di interesse della scena e sposta il tuo personaggio."}
          </p>
        </div>
        {isMaster && (
          <div className="map-tool-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca mappa..." />
          </div>
        )}
      </div>

      <div className={`mt-5 grid gap-4 ${isMaster ? "map-grid-master 2xl:grid-cols-[17rem_minmax(0,1fr)]" : "map-grid-player grid-cols-1"}`}>
        {isMaster && (
          <MapLibrary
            maps={filteredMaps}
            activeMap={currentMap}
            onSelect={(map) => setSelectedMapId(map.id)}
            onSetActive={onSetActiveMap}
            onDelete={onDeleteMap}
            onDuplicate={onDuplicateMap}
            isMaster={isMaster}
          />
        )}

        <div className="map-content-col grid min-w-0 gap-3">
          {/* Dettagli della mappa sopra (Layout Orizzontale) */}
          {currentMap && (
            <div className="map-tool-details-header glass-panel rounded-lg p-3.5 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-2xl text-white leading-none">{currentMap.title}</h3>
                  <span className="map-chip text-[10px] py-0.5 px-2 bg-brass/10 border border-brass/25 text-stone-200 rounded-full">
                    {levelOptions.find((item) => item.value === currentMap.level_type)?.label ?? "Mappa"}
                  </span>
                  <span className={`map-chip text-[10px] py-0.5 px-2 rounded-full ${currentMap.is_visible_to_players ? "is-public border-emerald-500/30 text-emerald-300 bg-emerald-500/5" : "is-private border-violet-500/30 text-violet-300 bg-violet-500/5"}`}>
                    {currentMap.is_visible_to_players ? "Pubblica" : "Privata"}
                  </span>
                  {currentMap.is_active && <span className="map-chip is-active text-[10px] py-0.5 px-2 border-emerald-500/35 text-emerald-300 bg-emerald-500/5 rounded-full">Attiva</span>}
                </div>
                {currentMap.description && (
                  <p className="text-xs text-stone-300 mt-2 leading-relaxed max-w-4xl">{currentMap.description}</p>
                )}
              </div>
              
              {/* Sottomappe per il Master */}
              {isMaster && childMaps.length > 0 && (
                <div className="flex flex-col gap-1.5 shrink-0 min-w-[12rem]">
                  <span className="text-[10px] uppercase tracking-wider text-brass/80 font-bold">Sottomappe</span>
                  <div className="flex flex-wrap gap-1.5">
                    {childMaps.map((map) => (
                      <button key={map.id} type="button" className="map-submap-button text-xs py-1 px-2.5 w-auto flex items-center gap-1.5" onClick={() => setSelectedMapId(map.id)}>
                        <DoorOpen size={13} /> {map.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <span className="mysterium-corners-br" />
            </div>
          )}

          <MapBreadcrumb maps={breadcrumb} onSelect={isMaster ? (map) => setSelectedMapId(map.id) : undefined} />
          {currentMap ? (
            <MapViewer
              map={currentMap}
              maps={visibleMaps}
              characters={state.characters}
              npcs={state.npcs}
              hotspots={state.mapHotspots.filter((hotspot) => hotspot.map_id === currentMap.id)}
              characterPositions={characterPositions}
              npcMarkers={state.mapNpcMarkers.filter((marker) => marker.map_id === currentMap.id)}
              customMarkers={state.mapCustomMarkers.filter((marker) => marker.map_id === currentMap.id)}
              fogAreas={state.mapFogAreas.filter((area) => area.map_id === currentMap.id)}
              isMaster={isMaster}
              currentUserId={state.profile.id}
              onOpenMap={(mapId) => setSelectedMapId(mapId)}
              onUpdateCharacterPosition={onUpdateCharacterPosition}
              onCreateMapFogArea={onCreateMapFogArea}
              onUpdateMapFogArea={onUpdateMapFogArea}
              onDeleteMapFogArea={onDeleteMapFogArea}
            />
          ) : (
            <MapEmptyState title="Nessuna mappa disponibile" text={isMaster ? "Crea una mappa per iniziare a muovere la scena." : "Il Master non ha ancora condiviso una mappa."} />
          )}

          {isMaster && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
              {currentMap ? (
                <section className="map-tool-card">
                  <h3>
                    <UsersRound size={16} /> Indicatori giocatori
                  </h3>
                  <div className="mt-3 grid gap-2">
                    {characterPositions.map((position) => {
                      const character = state.characters.find((item) => item.id === position.character_id);
                      if (!character) return null;
                      return (
                        <article key={position.id} className="map-indicator-control">
                          <div>
                            <span className="map-indicator-avatar" style={{ backgroundImage: `url(${character.portrait_url})`, borderColor: character.color }} />
                            <span className="min-w-0">
                              <strong className="truncate" style={{ color: character.color }}>
                                {character.character_name}
                              </strong>
                              <small>
                                X {Math.round(position.x)} · Y {Math.round(position.y)}
                              </small>
                            </span>
                          </div>
                          <div className="map-indicator-actions">
                            <button type="button" onClick={() => updateIndicator(position, { y: position.y - 4 })} aria-label={`Sposta ${character.character_name} in alto`}>↑</button>
                            <button type="button" onClick={() => updateIndicator(position, { x: position.x - 4 })} aria-label={`Sposta ${character.character_name} a sinistra`}>←</button>
                            <button type="button" onClick={() => updateIndicator(position, { x: position.x + 4 })} aria-label={`Sposta ${character.character_name} a destra`}>→</button>
                            <button type="button" onClick={() => updateIndicator(position, { y: position.y + 4 })} aria-label={`Sposta ${character.character_name} in basso`}>↓</button>
                            <button type="button" onClick={() => updateIndicator(position, { x: 50, y: 50 })} aria-label={`Porta ${character.character_name} al centro`}>
                              <Crosshair size={13} />
                            </button>
                          </div>
                          <div className="map-indicator-toggles">
                            <button type="button" className={position.is_visible_to_players ? "is-on" : ""} onClick={() => updateIndicator(position, { isVisibleToPlayers: !position.is_visible_to_players })}>
                              {position.is_visible_to_players ? <Eye size={13} /> : <EyeOff size={13} />}
                              {position.is_visible_to_players ? "Visibile" : "Nascosto"}
                            </button>
                            <button type="button" className={position.is_locked ? "is-on" : ""} onClick={() => updateIndicator(position, { isLocked: !position.is_locked })}>
                              {position.is_locked ? "Bloccato" : "Mobile"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <form
                className="map-tool-card grid gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!title.trim() || (!imageUrl.trim() && !imageFile) || isCreating) return;
                  setIsCreating(true);
                  try {
                    await onCreateMap?.({
                      title: title.trim(),
                      description: description.trim(),
                      imageUrl: imageUrl.trim(),
                      imageFile,
                      parentMapId: currentMap ? currentMap.id : null,
                      levelType,
                      isVisibleToPlayers
                    });
                    setTitle("");
                    setDescription("");
                    setImageUrl("");
                    setImageFile(undefined);
                  } finally {
                    setIsCreating(false);
                  }
                }}
              >
                <h3>
                  <ImageUp size={16} /> Nuova mappa
                </h3>
                <input className="input-grimoire field px-3 py-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome mappa" />
                <textarea className="input-grimoire field min-h-20 resize-none px-3 py-2 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrizione breve" />
                <input className="input-grimoire field px-3 py-2 text-sm" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Link immagine mappa" />
                <label className="director-upload-target">
                  Carica immagine mappa
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} />
                </label>
                {imageFile ? <p className="text-xs text-brass">File selezionato: {imageFile.name}</p> : null}
                <select className="input-grimoire field px-3 py-2 text-sm" value={levelType} onChange={(event) => setLevelType(event.target.value as NarrativeMap["level_type"])}>
                  {levelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input type="checkbox" checked={isVisibleToPlayers} onChange={(event) => setIsVisibleToPlayers(event.target.checked)} />
                  Visibile ai giocatori
                </label>
                <button className="director-primary-action" disabled={isCreating || !title.trim() || (!imageUrl.trim() && !imageFile)}>
                  <Plus size={16} /> {isCreating ? "Creo mappa..." : "Crea mappa"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <span className="mysterium-corners-br" />
    </section>
  );
}

function MapLibrary({
  maps,
  activeMap,
  isMaster,
  onSelect,
  onSetActive,
  onDelete,
  onDuplicate
}: {
  maps: NarrativeMap[];
  activeMap?: NarrativeMap;
  isMaster: boolean;
  onSelect: (map: NarrativeMap) => void;
  onSetActive?: (map: NarrativeMap) => void | Promise<void>;
  onDelete?: (map: NarrativeMap) => void | Promise<void>;
  onDuplicate?: (map: NarrativeMap) => void | Promise<void>;
}) {
  return (
    <aside className="map-library">
      <p className="px-2 pb-2 text-xs uppercase tracking-[0.22em] text-brass/80">Libreria mappe</p>
      <div className="grid gap-2">
        {maps.map((map) => (
          <article key={map.id} className={`map-library-card ${activeMap?.id === map.id ? "is-selected" : ""}`}>
            <button type="button" onClick={() => onSelect(map)} className="min-w-0 flex-1 text-left">
              <span className="map-library-thumb" style={{ backgroundImage: `url(${map.image_url})` }} />
              <span className="block truncate font-serif text-base text-white">{map.title}</span>
              <span className="mt-1 block truncate text-xs text-stone-400">{map.description || "Nessuna descrizione."}</span>
            </button>
            {isMaster ? (
              <div className="mt-2 flex gap-1">
                <button type="button" title="Mostra ai giocatori" onClick={() => onSetActive?.(map)}>
                  <Flag size={14} />
                </button>
                <button type="button" title="Duplica mappa" onClick={() => onDuplicate?.(map)}>
                  <Copy size={14} />
                </button>
                <button type="button" title="Elimina mappa" onClick={() => onDelete?.(map)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

function MapBreadcrumb({ maps, onSelect }: { maps: NarrativeMap[]; onSelect?: (map: NarrativeMap) => void }) {
  if (!maps.length) return null;

  return (
    <nav className="map-breadcrumb" aria-label="Percorso mappa">
      {maps.map((map, index) => (
        <span key={map.id} className="inline-flex items-center gap-2">
          {index > 0 ? <span className="text-stone-600">/</span> : null}
          {onSelect ? (
            <button type="button" onClick={() => onSelect(map)} className={index === maps.length - 1 ? "is-current" : ""}>
              {map.title}
            </button>
          ) : (
            <span className={index === maps.length - 1 ? "text-amber-500 font-bold" : "text-stone-300"}>
              {map.title}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

function MapViewer({
  map,
  maps,
  characters,
  npcs,
  hotspots,
  characterPositions,
  npcMarkers,
  customMarkers,
  fogAreas,
  isMaster,
  currentUserId,
  onOpenMap,
  onUpdateCharacterPosition,
  onCreateMapFogArea,
  onUpdateMapFogArea,
  onDeleteMapFogArea
}: {
  map: NarrativeMap;
  maps: NarrativeMap[];
  characters: Character[];
  npcs: Npc[];
  hotspots: MapHotspot[];
  characterPositions: MapCharacterPosition[];
  npcMarkers: MapNpcMarker[];
  customMarkers: MapCustomMarker[];
  fogAreas: MapFogArea[];
  isMaster: boolean;
  currentUserId: string;
  onOpenMap: (mapId: string) => void;
  onUpdateCharacterPosition?: MapToolPanelProps["onUpdateCharacterPosition"];
  onCreateMapFogArea?: MapToolPanelProps["onCreateMapFogArea"];
  onUpdateMapFogArea?: MapToolPanelProps["onUpdateMapFogArea"];
  onDeleteMapFogArea?: MapToolPanelProps["onDeleteMapFogArea"];
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panStart, setPanStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ position: MapCharacterPosition; pointerId: number } | null>(null);
  const [weather, setWeather] = useState<"none" | "rain" | "snow" | "fog" | "sparkles">("none");
  const [atmosphere, setAtmosphere] = useState<"none" | "night" | "vintage" | "cinematic" | "crimson">("none");
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number; y: number } | null>(null);

  const [isFowModeActive, setIsFowModeActive] = useState(false);
  const [localFogAreas, setLocalFogAreas] = useState<MapFogArea[]>([]);
  const [draggingFogId, setDraggingFogId] = useState<string | null>(null);
  const [draggingFogOffset, setDraggingFogOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizingFogId, setResizingFogId] = useState<string | null>(null);
  const [resizingFogStartData, setResizingFogStartData] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [resizingPointerStart, setResizingPointerStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!draggingFogId && !resizingFogId) {
      setLocalFogAreas(fogAreas);
    }
  }, [fogAreas, draggingFogId, resizingFogId]);

  function calculateRulerDistance(start: { x: number; y: number }, end: { x: number; y: number }) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const pct = Math.sqrt(dx * dx + dy * dy);
    return (pct * 0.3).toFixed(1);
  }

  const visibleHotspots = isMaster ? hotspots : hotspots.filter((hotspot) => hotspot.is_visible_to_players);
  const visiblePositions = isMaster ? characterPositions : characterPositions.filter((position) => position.is_visible_to_players);
  const visibleNpcMarkers = isMaster ? npcMarkers : npcMarkers.filter((marker) => marker.is_visible_to_players);
  const visibleCustomMarkers = isMaster ? customMarkers : customMarkers.filter((marker) => marker.is_visible_to_players);

  const supabase = useMemo(() => createClient(), []);
  const [pings, setPings] = useState<{ id: string; x: number; y: number; color: string }[]>([]);
  const [remoteDrags, setRemoteDrags] = useState<Record<string, { x: number; y: number }>>({});
  const mapChannelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [radialMenu, setRadialMenu] = useState<{ positionId: string; x: number; y: number } | null>(null);

  // Riferimenti per evitare stale closures nei canali realtime
  const weatherRef = useRef(weather);
  const atmosphereRef = useRef(atmosphere);
  useEffect(() => {
    weatherRef.current = weather;
    atmosphereRef.current = atmosphere;
  }, [weather, atmosphere]);

  // Chiudi il menu radiale contestuale al click
  useEffect(() => {
    const closeMenu = () => setRadialMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Rilascia un ping visuale sulla mappa
  const triggerPing = useCallback((payload: { x: number; y: number; color: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setPings((current) => [...current, { id, ...payload }]);
    setTimeout(() => {
      setPings((current) => current.filter((p) => p.id !== id));
    }, 3000);
  }, []);

  // Broadcast degli eventi a impatto DB ZERO
  const broadcastEvent = useCallback((event: string, payload: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("local-map-broadcast", {
        detail: { event, payload }
      }));
    }
    if (supabase && mapChannelRef.current) {
      mapChannelRef.current.send({
        type: "broadcast",
        event,
        payload
      });
    }
  }, [supabase]);

  // Se giocatore, richiedi lo stato della mappa corrente all'ingresso
  useEffect(() => {
    if (!isMaster) {
      const timer = setTimeout(() => {
        broadcastEvent("request-map-state", {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [broadcastEvent, isMaster, map.id]);

  // Iscrizione ai canali di rete
  useEffect(() => {
    const handleLocalBroadcast = (e: Event) => {
      const { event, payload } = (e as CustomEvent).detail;
      if (event === "ping") {
        triggerPing(payload);
      } else if (event === "drag") {
        setRemoteDrags((current) => ({
          ...current,
          [payload.id]: { x: payload.x, y: payload.y }
        }));
      } else if (event === "drag-stop") {
        setRemoteDrags((current) => {
          const next = { ...current };
          delete next[payload.id];
          return next;
        });
      } else if (event === "map-state") {
        setWeather(payload.weather);
        setAtmosphere(payload.atmosphere);
      } else if (event === "request-map-state" && isMaster) {
        broadcastEvent("map-state", {
          weather: weatherRef.current,
          atmosphere: atmosphereRef.current
        });
      }
    };
    window.addEventListener("local-map-broadcast", handleLocalBroadcast);

    if (supabase && map.room_id) {
      const channel = supabase.channel(`room:${map.room_id}:map`);
      mapChannelRef.current = channel;

      channel
        .on("broadcast", { event: "ping" }, ({ payload }) => {
          triggerPing(payload);
        })
        .on("broadcast", { event: "drag" }, ({ payload }) => {
          setRemoteDrags((current) => ({
            ...current,
            [payload.id]: { x: payload.x, y: payload.y }
          }));
        })
        .on("broadcast", { event: "drag-stop" }, ({ payload }) => {
          setRemoteDrags((current) => {
            const next = { ...current };
            delete next[payload.id];
            return next;
          });
        })
        .on("broadcast", { event: "map-state" }, ({ payload }) => {
          setWeather(payload.weather);
          setAtmosphere(payload.atmosphere);
        })
        .on("broadcast", { event: "request-map-state" }, () => {
          if (isMaster) {
            broadcastEvent("map-state", {
              weather: weatherRef.current,
              atmosphere: atmosphereRef.current
            });
          }
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener("local-map-broadcast", handleLocalBroadcast);
      if (supabase && mapChannelRef.current) {
        supabase.removeChannel(mapChannelRef.current);
      }
    };
  }, [broadcastEvent, isMaster, map.room_id, supabase, triggerPing]);

  // Rilevamento automatico del meteo (Solo per il Master, che poi lo trasmette)
  useEffect(() => {
    if (!isMaster) return;
    const text = ((map.title || "") + " " + (map.description || "")).toLowerCase();
    let detectedWeather: typeof weather = "none";
    if (text.includes("pioggia") || text.includes("temporale") || text.includes("storm") || text.includes("rain")) {
      detectedWeather = "rain";
    } else if (text.includes("neve") || text.includes("ghiaccio") || text.includes("snow") || text.includes("ice")) {
      detectedWeather = "snow";
    } else if (text.includes("nebbia") || text.includes("fumo") || text.includes("mist") || text.includes("fog") || text.includes("smoke")) {
      detectedWeather = "fog";
    } else if (text.includes("scintille") || text.includes("magia") || text.includes("magic") || text.includes("sparkles")) {
      detectedWeather = "sparkles";
    }
    setWeather(detectedWeather);
    broadcastEvent("map-state", { weather: detectedWeather, atmosphere: atmosphereRef.current });
  }, [broadcastEvent, isMaster, map.id, map.title, map.description]);

  // Motore particellare meteo sul Canvas
  useEffect(() => {
    const canvas = weatherCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      speed: number;
      size: number;
      opacity: number;
      extra?: number;
    }

    let particles: Particle[] = [];
    const maxParticles = weather === "fog" ? 12 : weather === "rain" ? 80 : weather === "snow" ? 60 : 40;

    function createParticle(randomY = false): Particle {
      const pY = randomY ? Math.random() * height : -10;
      if (weather === "rain") {
        return {
          x: Math.random() * width,
          y: pY,
          speed: 6 + Math.random() * 4,
          size: 1 + Math.random() * 1.5,
          opacity: 0.15 + Math.random() * 0.25,
        };
      } else if (weather === "snow") {
        return {
          x: Math.random() * width,
          y: pY,
          speed: 0.8 + Math.random() * 1.2,
          size: 1.5 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.5,
          extra: Math.random() * Math.PI * 2,
        };
      } else if (weather === "fog") {
        return {
          x: Math.random() * (width + 300) - 150,
          y: Math.random() * height,
          speed: 0.1 + Math.random() * 0.2,
          size: 80 + Math.random() * 100,
          opacity: 0.05 + Math.random() * 0.08,
        };
      } else { // sparkles
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : height + 10,
          speed: 0.4 + Math.random() * 0.6,
          size: 1 + Math.random() * 2,
          opacity: 0.2 + Math.random() * 0.5,
          extra: Math.random() * Math.PI * 2,
        };
      }
    }

    // Inizializza particelle
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(true));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      if (weather === "none") return;

      particles.forEach((p, index) => {
        if (weather === "rain") {
          p.y += p.speed;
          p.x += p.speed * 0.05; // inclinazione vento
          if (p.y > height) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180, 200, 220, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speed * 0.05, p.y + p.speed * 1.5);
          ctx.stroke();
        } else if (weather === "snow") {
          p.y += p.speed;
          p.extra = (p.extra || 0) + 0.01;
          p.x += Math.sin(p.extra) * 0.3;
          if (p.y > height || p.x < -10 || p.x > width + 10) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === "fog") {
          p.x += p.speed;
          if (p.x > width + p.size) {
            p.x = -p.size;
          }
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(220, 220, 230, ${p.opacity})`);
          grad.addColorStop(0.5, `rgba(220, 220, 230, ${p.opacity * 0.4})`);
          grad.addColorStop(1, "rgba(220, 220, 230, 0)");
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === "sparkles") {
          p.y -= p.speed;
          p.extra = (p.extra || 0) + 0.02;
          p.x += Math.sin(p.extra) * 0.2;
          const currentOpacity = Math.max(0.01, Math.min(1, p.opacity * Math.abs(Math.sin(p.extra))));
          if (p.y < -10) {
            particles[index] = createParticle();
          }
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grad.addColorStop(0, `rgba(200, 163, 93, ${currentOpacity})`);
          grad.addColorStop(0.3, `rgba(200, 163, 93, ${currentOpacity * 0.5})`);
          grad.addColorStop(1, "rgba(200, 163, 93, 0)");
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [weather]);

  function zoom(delta: number) {
    setTransform((current) => ({ ...current, scale: clamp(current.scale + delta, 0.6, 3) }));
  }

  function reset() {
    setTransform({ scale: 1, x: 0, y: 0 });
  }

  function toggleFullscreen() {
    const node = shellRef.current;
    if (!node) return;

    if (!document.fullscreenElement) {
      node.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  function pointerToMap(event: React.PointerEvent) {
    const node = canvasRef.current;
    const rect = node?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    const localX = (event.clientX - rect.left - transform.x) / transform.scale;
    const localY = (event.clientY - rect.top - transform.y) / transform.scale;
    return {
      x: clamp((localX / rect.width) * 100, 0, 100),
      y: clamp((localY / rect.height) * 100, 0, 100)
    };
  }

  return (
    <section className={`map-viewer ${isFullscreen ? "is-fullscreen" : ""}`} ref={shellRef}>
      <div className="map-viewer-toolbar">
        <span>
          <Map size={15} /> {map.title}
        </span>
        <div className="flex items-center gap-2">
          {/* Selettori Meteo ed Atmosfera (Solo Master) */}
          {isMaster ? (
            <>
              <select
                value={weather}
                onChange={(e) => {
                  const nextWeather = e.target.value as any;
                  setWeather(nextWeather);
                  broadcastEvent("map-state", { weather: nextWeather, atmosphere: atmosphereRef.current });
                }}
                className="px-2 py-1 text-xs bg-stone-900 border border-stone-700 text-stone-300 rounded focus:outline-none focus:border-amber-500"
                title="Seleziona Meteo"
              >
                <option value="none">☀️ Sereno</option>
                <option value="rain">🌧️ Pioggia</option>
                <option value="snow">❄️ Neve</option>
                <option value="fog">🌫️ Nebbia</option>
                <option value="sparkles">✨ Magia</option>
              </select>

              <select
                value={atmosphere}
                onChange={(e) => {
                  const nextAtmosphere = e.target.value as any;
                  setAtmosphere(nextAtmosphere);
                  broadcastEvent("map-state", { weather: weatherRef.current, atmosphere: nextAtmosphere });
                }}
                className="px-2 py-1 text-xs bg-stone-900 border border-stone-700 text-stone-300 rounded focus:outline-none focus:border-amber-500"
                title="Filtro Atmosfera"
              >
                <option value="none">🎨 Originale</option>
                <option value="night">🌙 Notte</option>
                <option value="vintage">📜 Vintage</option>
                <option value="cinematic">🎥 Cinema</option>
                <option value="crimson">🩸 Sangue</option>
              </select>
            </>
          ) : (
            /* Badge di stato per i giocatori */
            (weather !== "none" || atmosphere !== "none") && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 border border-stone-800 text-[10px] text-stone-400 rounded select-none">
                <span>Meteo: {weather === "none" ? "☀️ Sereno" : weather === "rain" ? "🌧️ Pioggia" : weather === "snow" ? "❄️ Neve" : weather === "fog" ? "🌫️ Nebbia" : "✨ Magia"}</span>
                <span>•</span>
                <span>Atmosfera: {atmosphere === "none" ? "🎨 Originale" : atmosphere === "night" ? "🌙 Notte" : atmosphere === "vintage" ? "📜 Vintage" : atmosphere === "cinematic" ? "🎥 Cinema" : "🩸 Sangue"}</span>
              </div>
            )
          )}

          {/* Attivazione Nebbia di Guerra (Solo Master) */}
          {isMaster && (
            <>
              <button
                type="button"
                onClick={() => setIsFowModeActive((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 text-xs border rounded focus:outline-none ${isFowModeActive ? 'bg-violet-600/30 border-violet-500 text-violet-100 font-bold' : 'bg-stone-900 border-stone-700 text-stone-300'}`}
                title={isFowModeActive ? "Disattiva Modalità Nebbia" : "Attiva Modalità Nebbia (Fog of War)"}
              >
                <EyeOff size={13} /> {isFowModeActive ? "Nebbia ON" : "Nebbia"}
              </button>
              {isFowModeActive && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateMapFogArea?.({
                      mapId: map.id,
                      shapeType: "rect",
                      shapeData: { x: 25, y: 25, w: 20, h: 20 },
                      isRevealed: false
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs border rounded bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-850"
                  title="Aggiungi area nebbia coprente"
                >
                  <Plus size={13} /> Area Nebbia
                </button>
              )}
            </>
          )}

          {/* Attivazione Righello */}
          <button
            type="button"
            onClick={() => setIsRulerActive((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded focus:outline-none ${isRulerActive ? 'bg-amber-600/30 border-amber-500 text-amber-100 font-bold' : 'bg-stone-900 border-stone-700 text-stone-300'}`}
            title={isRulerActive ? "Disattiva Righello" : "Attiva Righello (Misura Distanze)"}
          >
            <Ruler size={13} /> {isRulerActive ? "Righello ON" : "Righello"}
          </button>

          <button type="button" onClick={() => zoom(-0.15)} title="Riduci zoom">
            <Minus size={15} />
          </button>
          <button type="button" onClick={reset} title="Reset vista">
            <RotateCcw size={15} />
          </button>
          <button type="button" onClick={() => zoom(0.15)} title="Aumenta zoom">
            <Plus size={15} />
          </button>
          <button type="button" onClick={toggleFullscreen} title="Fullscreen">
            <Expand size={15} />
          </button>
        </div>
      </div>
      <div
        className="map-canvas"
        ref={canvasRef}
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY > 0 ? -0.1 : 0.1);
        }}
        onPointerDown={(event) => {
          clickStartRef.current = { x: event.clientX, y: event.clientY, time: Date.now() };
          if (isRulerActive) {
            const coords = pointerToMap(event);
            setRulerStart(coords);
            setRulerEnd(coords);
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          if ((event.target as HTMLElement).closest("[data-map-marker]")) return;
          setPanStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: transform.x, originY: transform.y });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (isRulerActive && rulerStart) {
            const coords = pointerToMap(event);
            setRulerEnd(coords);
            return;
          }
          if (!panStart || panStart.pointerId !== event.pointerId) return;
          setTransform((current) => ({
            ...current,
            x: panStart.originX + event.clientX - panStart.x,
            y: panStart.originY + event.clientY - panStart.y
          }));
        }}
        onPointerUp={(event) => {
          if (isRulerActive) {
            setRulerStart(null);
            setRulerEnd(null);
            return;
          }
          if (panStart?.pointerId === event.pointerId) setPanStart(null);

          // Rilevamento click/tocco per PING (Ctrl+Click o click lungo statico)
          if (clickStartRef.current) {
            const dx = event.clientX - clickStartRef.current.x;
            const dy = event.clientY - clickStartRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const duration = Date.now() - clickStartRef.current.time;

            if (dist < 6) {
              const isTargetMarker = (event.target as HTMLElement).closest("[data-map-marker]");
              if (!isTargetMarker && (event.ctrlKey || duration > 400)) {
                const coords = pointerToMap(event);
                const userColor = characters.find((c) => c.user_id === currentUserId)?.color || "#c8a35d";
                const newPing = { x: coords.x, y: coords.y, color: userColor };
                triggerPing(newPing);
                broadcastEvent("ping", newPing);
              }
            }
            clickStartRef.current = null;
          }
        }}
      >
        <div
          className={`map-canvas-layer map-filter-${atmosphere}`}
          style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`, backgroundImage: `url(${map.image_url})` }}
        >
          {visibleHotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              data-map-marker
              className="map-hotspot-marker"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, color: hotspot.color }}
              title={`${hotspot.title} - ${hotspot.description}`}
              onClick={() => {
                if (hotspot.target_map_id && maps.some((item) => item.id === hotspot.target_map_id)) onOpenMap(hotspot.target_map_id);
              }}
            >
              <Crosshair size={18} />
            </button>
          ))}

          {visiblePositions.map((position) => {
            const character = characters.find((item) => item.id === position.character_id);
            if (!character) return null;
            
            // Usa remoteDrags se un altro giocatore sta trascinando il token
            const local = draggingPosition?.id === position.id
              ? draggingPosition
              : (remoteDrags[position.id] ? { id: position.id, ...remoteDrags[position.id] } : position);

            return (
              <button
                key={position.id}
                type="button"
                data-map-marker
                className={`map-character-marker ${position.is_locked ? "is-locked" : ""}`}
                style={{ left: `${local.x}%`, top: `${local.y}%`, color: character.color }}
                title={`${character.character_name} ${character.character_surname} - ${position.narrative_location || map.title}`}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setRadialMenu({
                    positionId: position.id,
                    x: event.clientX,
                    y: event.clientY
                  });
                }}
                onPointerDown={(event) => {
                  if (!isMaster || position.is_locked) return;
                  event.preventDefault();
                  setDragStart({ position, pointerId: event.pointerId });
                  setDraggingPosition({ id: position.id, x: position.x, y: position.y });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!dragStart || dragStart.pointerId !== event.pointerId || dragStart.position.id !== position.id) return;
                  const next = pointerToMap(event);
                  setDraggingPosition({ id: position.id, ...next });

                  // Trasmissione drag a intervalli regolari
                  const now = Date.now();
                  if (now - lastBroadcastRef.current > 60) {
                    broadcastEvent("drag", { id: position.id, x: next.x, y: next.y });
                    lastBroadcastRef.current = now;
                  }
                }}
                onPointerUp={(event) => {
                  if (!dragStart || dragStart.pointerId !== event.pointerId || dragStart.position.id !== position.id) return;
                  const finalPosition = draggingPosition ?? position;
                  setDragStart(null);
                  setDraggingPosition(null);

                  // Notifica fine drag
                  broadcastEvent("drag-stop", { id: position.id });

                  onUpdateCharacterPosition?.(position, {
                    x: finalPosition.x,
                    y: finalPosition.y,
                    narrativeLocation: position.narrative_location || map.title,
                    isVisibleToPlayers: position.is_visible_to_players,
                    isLocked: position.is_locked
                  });
                }}
              >
                <span className="relative flex-shrink-0" style={{ backgroundImage: `url(${character.portrait_url})` }}>
                  {(character.conditions || []).filter(Boolean).length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-stone-950 border border-amber-500/60 text-[9px] px-1 py-0.5 leading-none z-10 select-none shadow-md">
                      {(character.conditions || []).filter(Boolean).slice(0, 2).map((c) => conditionIcon(c)).join("")}
                    </span>
                  )}
                </span>
                <strong>{character.character_name}</strong>
              </button>
            );
          })}

          {visibleNpcMarkers.map((marker) => {
            const npc = npcs.find((item) => item.id === marker.npc_id);
            if (!npc) return null;
            return (
              <span key={marker.id} data-map-marker className="map-npc-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%`, color: npc.color }} title={`${npc.name} - ${marker.status}`}>
                {npc.portrait_url ? <span style={{ backgroundImage: `url(${npc.portrait_url})` }} /> : <UsersRound size={15} />}
              </span>
            );
          })}

          {visibleCustomMarkers.map((marker) => (
            <span key={marker.id} data-map-marker className="map-custom-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%`, color: marker.color }} title={`${marker.title} - ${marker.description}`}>
              <MapPinned size={17} />
            </span>
          ))}

          {/* Fog of War Layers */}
          {(!isMaster ? localFogAreas.filter((area) => !area.is_revealed) : localFogAreas).map((area) => {
            const shape = area.shape_data as { x: number; y: number; w: number; h: number };
            if (!shape || typeof shape.x !== "number") return null;

            if (!isMaster) {
              // Player view: solid black covers
              return (
                <div
                  key={area.id}
                  style={{
                    position: "absolute",
                    left: `${shape.x}%`,
                    top: `${shape.y}%`,
                    width: `${shape.w}%`,
                    height: `${shape.h}%`,
                    zIndex: 29
                  }}
                  className="bg-black select-none pointer-events-auto rounded-[2px] shadow-lg flex items-center justify-center border border-black"
                  title="Zona d'Ombra (Nebbia di Guerra)"
                >
                  <EyeOff size={18} className="text-stone-800 opacity-20" />
                </div>
              );
            }

            // Master view
            const isRevealed = area.is_revealed;
            return (
              <div
                key={area.id}
                style={{
                  position: "absolute",
                  left: `${shape.x}%`,
                  top: `${shape.y}%`,
                  width: `${shape.w}%`,
                  height: `${shape.h}%`,
                  zIndex: 29,
                  cursor: isFowModeActive ? "move" : "default"
                }}
                className={`relative select-none pointer-events-auto rounded-[2px] flex items-center justify-center transition-colors duration-200 ${
                  isFowModeActive
                    ? isRevealed
                      ? "border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20"
                      : "border border-dashed border-violet-500/60 bg-black/60 hover:bg-black/70"
                    : isRevealed
                      ? "hidden" // Master hides completely if revealed and edit mode is OFF
                      : "border border-dashed border-red-500/30 bg-black/40" // Simple overlay when FOW mode is OFF
                }`}
                onPointerDown={(event) => {
                  if (!isFowModeActive) return;
                  event.stopPropagation();
                  const coords = pointerToMap(event);
                  setDraggingFogId(area.id);
                  setDraggingFogOffset({ x: coords.x - shape.x, y: coords.y - shape.y });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (draggingFogId !== area.id || !draggingFogOffset) return;
                  event.stopPropagation();
                  const coords = pointerToMap(event);
                  const nextX = clamp(coords.x - draggingFogOffset.x, 0, 100 - shape.w);
                  const nextY = clamp(coords.y - draggingFogOffset.y, 0, 100 - shape.h);
                  
                  setLocalFogAreas((current) =>
                    current.map((item) =>
                      item.id === area.id
                        ? { ...item, shape_data: { ...shape, x: nextX, y: nextY } }
                        : item
                    )
                  );
                }}
                onPointerUp={(event) => {
                  if (draggingFogId !== area.id) return;
                  event.stopPropagation();
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  
                  const currentShape = localFogAreas.find((item) => item.id === area.id)?.shape_data as { x: number; y: number; w: number; h: number };
                  if (currentShape) {
                    onUpdateMapFogArea?.(area.id, {
                      shapeData: currentShape,
                      isRevealed: area.is_revealed
                    });
                  }
                  
                  setDraggingFogId(null);
                  setDraggingFogOffset(null);
                }}
              >
                {/* HUD controls for Master when FOW Mode is active */}
                {isFowModeActive && (
                  <div 
                    className="absolute top-1 left-1 flex items-center gap-1 bg-stone-950/90 border border-stone-800 rounded px-1 py-0.5 pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateMapFogArea?.(area.id, {
                          shapeData: shape,
                          isRevealed: !isRevealed
                        });
                      }}
                      className={`p-1 rounded transition hover:bg-stone-800 ${
                        isRevealed ? "text-emerald-400" : "text-stone-400"
                      }`}
                      title={isRevealed ? "Copri con la nebbia" : "Rivela zona ai giocatori"}
                    >
                      {isRevealed ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Eliminare questa area di nebbia?")) {
                          onDeleteMapFogArea?.(area.id);
                        }
                      }}
                      className="p-1 rounded text-red-400 hover:bg-stone-800"
                      title="Elimina area"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                {/* Resize Handle when FOW Mode is active */}
                {isFowModeActive && (
                  <div
                    style={{ cursor: "se-resize" }}
                    className="absolute bottom-0 right-0 w-3 h-3 bg-violet-500 border-l border-t border-stone-900 rounded-tl pointer-events-auto font-bold flex items-center justify-center text-[8px]"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const coords = pointerToMap(event);
                      setResizingFogId(area.id);
                      setResizingFogStartData(shape);
                      setResizingPointerStart({ x: coords.x, y: coords.y });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (resizingFogId !== area.id || !resizingFogStartData || !resizingPointerStart) return;
                      event.stopPropagation();
                      const coords = pointerToMap(event);
                      const dx = coords.x - resizingPointerStart.x;
                      const dy = coords.y - resizingPointerStart.y;
                      const nextW = clamp(resizingFogStartData.w + dx, 2, 100 - resizingFogStartData.x);
                      const nextH = clamp(resizingFogStartData.h + dy, 2, 100 - resizingFogStartData.y);
                      
                      setLocalFogAreas((current) =>
                        current.map((item) =>
                          item.id === area.id
                            ? { ...item, shape_data: { ...resizingFogStartData, w: nextW, h: nextH } }
                            : item
                        )
                      );
                    }}
                    onPointerUp={(event) => {
                      if (resizingFogId !== area.id) return;
                      event.stopPropagation();
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      
                      const currentShape = localFogAreas.find((item) => item.id === area.id)?.shape_data as { x: number; y: number; w: number; h: number };
                      if (currentShape) {
                        onUpdateMapFogArea?.(area.id, {
                          shapeData: currentShape,
                          isRevealed: area.is_revealed
                        });
                      }
                      
                      setResizingFogId(null);
                      setResizingFogStartData(null);
                      setResizingPointerStart(null);
                    }}
                  />
                )}

                {/* Status Indicator text overlay */}
                <span className="text-[10px] text-stone-400 font-bold select-none pointer-events-none opacity-40">
                  {isRevealed ? "Rivelato" : "Nebbia"}
                </span>
              </div>
            );
          })}


          {/* Overlay di Ping in tempo reale */}
          {pings.map((p) => (
            <span
              key={p.id}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                zIndex: 50,
                color: p.color
              }}
            >
              <span className="map-ping-effect" style={{ boxShadow: `0 0 15px currentColor` }} />
            </span>
          ))}

          {/* Overlay Grafico del Righello */}
          {rulerStart && rulerEnd && (
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-40" style={{ width: '100%', height: '100%' }}>
              <line
                x1={`${rulerStart.x}%`}
                y1={`${rulerStart.y}%`}
                x2={`${rulerEnd.x}%`}
                y2={`${rulerEnd.y}%`}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <circle cx={`${rulerStart.x}%`} cy={`${rulerStart.y}%`} r="5" fill="#fbbf24" stroke="#000" strokeWidth="1" />
              <circle cx={`${rulerEnd.x}%`} cy={`${rulerEnd.y}%`} r="5" fill="#fbbf24" stroke="#000" strokeWidth="1" />
              <g transform={`translate(${(rulerStart.x + rulerEnd.x) / 2}%, ${(rulerStart.y + rulerEnd.y) / 2}%)`}>
                <rect
                  x="-30"
                  y="-10"
                  width="60"
                  height="20"
                  rx="3"
                  fill="rgba(0,0,0,0.85)"
                  stroke="#c8a35d"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="4"
                  fill="#ffedd5"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {calculateRulerDistance(rulerStart, rulerEnd)} m
                </text>
              </g>
            </svg>
          )}
        </div>
        <canvas ref={weatherCanvasRef} className="absolute inset-0 z-10 pointer-events-none w-full h-full" />
      </div>
      <p className="map-viewer-hint">
        <Move size={14} /> Pan e zoom liberi. {isMaster ? "Trascina i personaggi: il database si aggiorna solo al rilascio. Tasto destro per altre azioni." : "Vedi solo marker e hotspot condivisi dal Master. Tasto destro sui personaggi per opzioni."}
      </p>

      {/* Menu Radiale / Contestuale dei Token */}
      {radialMenu && (
        <div
          className="fixed z-50 bg-stone-950/95 border border-amber-500/30 text-stone-100 rounded-lg shadow-2xl p-1.5 flex flex-col min-w-44 text-xs select-none glass-panel"
          style={{ left: `${radialMenu.x}px`, top: `${radialMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-brass font-bold border-b border-white/10 mb-1">
            Azioni Token
          </div>
          {isMaster && (
            <>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 hover:bg-amber-500/20 hover:text-white rounded flex items-center gap-2 text-stone-300"
                onClick={() => {
                  const pos = characterPositions.find(p => p.id === radialMenu.positionId);
                  if (pos) {
                    onUpdateCharacterPosition?.(pos, {
                      x: pos.x,
                      y: pos.y,
                      isLocked: !pos.is_locked,
                      isVisibleToPlayers: pos.is_visible_to_players,
                      narrativeLocation: pos.narrative_location || map.title
                    });
                  }
                  setRadialMenu(null);
                }}
              >
                {characterPositions.find(p => p.id === radialMenu.positionId)?.is_locked ? "🔓 Sblocca Token" : "🔒 Blocca Token"}
              </button>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 hover:bg-amber-500/20 hover:text-white rounded flex items-center gap-2 text-stone-300"
                onClick={() => {
                  const pos = characterPositions.find(p => p.id === radialMenu.positionId);
                  if (pos) {
                    onUpdateCharacterPosition?.(pos, {
                      x: pos.x,
                      y: pos.y,
                      isLocked: pos.is_locked,
                      isVisibleToPlayers: !pos.is_visible_to_players,
                      narrativeLocation: pos.narrative_location || map.title
                    });
                  }
                  setRadialMenu(null);
                }}
              >
                {characterPositions.find(p => p.id === radialMenu.positionId)?.is_visible_to_players ? "👁️‍🗨️ Nascondi ai Giocatori" : "👁️ Mostra ai Giocatori"}
              </button>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 hover:bg-amber-500/20 hover:text-white rounded flex items-center gap-2 text-stone-300"
                onClick={() => {
                  const pos = characterPositions.find(p => p.id === radialMenu.positionId);
                  if (pos) {
                    const character = characters.find(c => c.id === pos.character_id);
                    const color = character?.color || "#c8a35d";
                    const newPing = { x: pos.x, y: pos.y, color };
                    triggerPing(newPing);
                    broadcastEvent("ping", newPing);

                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTransform({
                        scale: 1.3,
                        x: rect.width / 2 - (pos.x / 100) * rect.width * 1.3,
                        y: rect.height / 2 - (pos.y / 100) * rect.height * 1.3
                      });
                    }
                  }
                  setRadialMenu(null);
                }}
              >
                🎯 Centra e Segnala (Ping)
              </button>
            </>
          )}
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 hover:bg-amber-500/20 hover:text-white rounded flex items-center gap-2 text-stone-300"
            onClick={() => {
              const pos = characterPositions.find(p => p.id === radialMenu.positionId);
              if (pos) {
                setIsRulerActive(true);
                setRulerStart({ x: pos.x, y: pos.y });
                setRulerEnd({ x: pos.x, y: pos.y });
              }
              setRadialMenu(null);
            }}
          >
            📏 Misura da questo token
          </button>
        </div>
      )}
      <span className="mysterium-corners-br" />
    </section>
  );
}

function MapEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="map-empty-state">
      <MapPinned size={22} />
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

function buildMapBreadcrumb(maps: NarrativeMap[], map: NarrativeMap) {
  const stack: NarrativeMap[] = [map];
  let parentId = map.parent_map_id;
  let guard = 0;

  while (parentId && guard < 12) {
    const parent = maps.find((item) => item.id === parentId);
    if (!parent) break;
    stack.unshift(parent);
    parentId = parent.parent_map_id;
    guard += 1;
  }

  return stack;
}

function buildMapCharacterPositions(map: NarrativeMap, characters: Character[], positions: MapCharacterPosition[]) {
  const existingForMap = positions.filter((position) => position.map_id === map.id);
  const positionedCharacters = new Set(existingForMap.map((position) => position.character_id));
  const virtualPositions = characters
    .filter((character) => !positionedCharacters.has(character.id))
    .map((character, index) => ({
      id: `virtual-position:${map.id}:${character.id}`,
      map_id: map.id,
      character_id: character.id,
      x: clamp(18 + (index % 4) * 18, 8, 92),
      y: clamp(22 + Math.floor(index / 4) * 16, 8, 92),
      narrative_location: map.title,
      is_visible_to_players: true,
      is_locked: false,
      updated_at: new Date(0).toISOString()
    }));

  return [...existingForMap, ...virtualPositions];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function conditionIcon(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes("ferit") || normalized.includes("sanguin")) return "🩸";
  if (normalized.includes("paur") || normalized.includes("spavent")) return "😱";
  if (normalized.includes("shock") || normalized.includes("mente")) return "🧠";
  if (normalized.includes("velen")) return "🤢";
  if (normalized.includes("stord") || normalized.includes("sonno") || normalized.includes("ko")) return "💤";
  if (normalized.includes("confus")) return "🌀";
  if (normalized.includes("esaust") || normalized.includes("stanc")) return "😫";
  if (normalized.includes("morte") || normalized.includes("deced")) return "💀";
  return "⚠️";
}
