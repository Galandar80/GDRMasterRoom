"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, LogOut, MessageSquareText, Sparkles, X } from "lucide-react";
import { CharacterSetupForm, type CharacterSetupValues } from "@/components/lobby/character-setup-form";
import { CreateGameForm, type CreateGameValues } from "@/components/lobby/create-game-form";
import { JoinRoomForm, type JoinMode } from "@/components/lobby/join-room-form";
import { SessionSwitcher } from "@/components/lobby/session-switcher";
import { StartMenu } from "@/components/lobby/start-menu";
import { demoRoomState } from "@/lib/demo-data";
import { cardDeckLabel, drawCard, encodeDiceReason, getDiceCount, rollDice as rollDiceValues, stripDiceCountMarker, type CardDeckType } from "@/lib/game-random";
import { clearSupabaseAuthStorage, createClient, demoMode } from "@/lib/supabase/client";
import { isConfiguredSuperadmin } from "@/lib/superadmin";
import { playUiCinematicDanger, playUiCinematicReveal, playUiCinematicVision, playUiCinematicChapter, playUiCinematicEarthquake } from "@/lib/sound-generator";
import {
  createGameInSupabase,
  createAudioTrack,
  createDiceRequest,
  createInventoryItem,
  createMediaAsset,
  createNarrativeMap,
  createPlayerNote,
  createOrUpdateCharacter,
  createNpc,
  createScene,
  createSoundEffect,
  deleteAudioTrack,
  deleteInventoryItem,
  deleteMediaAsset,
  deleteMessage,
  deleteNarrativeMap,
  deleteNpc,
  deleteScene,
  deleteRoom,
  deleteRoomBySuperAdmin,
  deleteMediaBySuperAdmin,
  deleteSoundEffect,
  enterMasterRoomByCode,
  ensureProfile,
  insertMessage,
  joinRoomByCode,
  listAllRoomsForSuperAdmin,
  listAllMediaForSuperAdmin,
  listUserSessions,
  exportRoomMessages,
  duplicateNarrativeMap,
  loadInitialRoomState,
  loadOlderRoomMessages,
  loadRoomState,
  profileFromUser,
  rollDiceRequest,
  setActiveNarrativeMap,
  triggerRoomSoundEffect,
  updateCurrentAudio,
  updateCurrentScene,
  updateCharacterByMaster,
  updateScene,
  deletePlayerCharacter,
  updateRoomChatPermissions,
  updateRoomSpotlight,
  updateRoomTurnState,
  updateRoomAudioState,
  updateMessageContent,
  updateMessagePinned,
  upsertMapCharacterPosition,
  updateRoomBySuperAdmin,
  updateMediaAssetVisibility,
  uploadPublicFile,
  createMapFogArea,
  updateMapFogArea,
  deleteMapFogArea
} from "@/lib/supabase/room-service";
import type { AdminMediaOverview, AdminRoomOverview, UserSessionSummary } from "@/lib/supabase/room-service";
import type { AudioTrack, DiceRequest, InventoryItem, MapCharacterPosition, MapFogArea, MediaAsset, Message, NarrativeMap, Npc, Room, RoomState, Scene, SceneMediaType, SceneVisibility, SoundEffect } from "@/lib/types";

const MasterControlRoom = dynamic(
  () => import("@/components/master-control-room").then((module) => module.MasterControlRoom),
  { loading: () => <AppLoading status="Caricamento cabina di regia..." /> }
);
const PlayerRoom = dynamic(
  () => import("@/components/player-room").then((module) => module.PlayerRoom),
  { loading: () => <AppLoading status="Caricamento stanza giocatore..." /> }
);
const SuperAdminRooms = dynamic(
  () => import("@/components/superadmin-rooms").then((module) => module.SuperAdminRooms),
  { loading: () => <AppLoading status="Caricamento pannello superadmin..." /> }
);

import { DiceRollAnimationOverlay } from "@/components/room/dice-roll-overlay";
import { DiceTray } from "@/components/room/dice-tray";

type View = "menu" | "create" | "join" | "sessions" | "character" | "player" | "master" | "superadmin";
type CinematicEvent =
  | { id: string; kind: "scene"; title: string; detail: string; imageUrl?: string; mediaType?: SceneMediaType }
  | { id: string; kind: "npc"; title: string; detail: string; imageUrl?: string }
  | { id: string; kind: "sound"; title: string; detail: string }
  | { id: string; kind: "whisper"; title: string; detail: string };
type CinematicEventPayload =
  | { kind: "scene"; title: string; detail: string; imageUrl?: string; mediaType?: SceneMediaType }
  | { kind: "npc"; title: string; detail: string; imageUrl?: string }
  | { kind: "sound"; title: string; detail: string }
  | { kind: "whisper"; title: string; detail: string };
type MapSyncPayload = {
  kind: "map-sync";
  roomId: string;
  revision: string;
  maps: NarrativeMap[];
  mapCharacterPositions: MapCharacterPosition[];
  mapFogAreas?: MapFogArea[];
};

const MAP_SYNC_PREFIX = "__gdr_map_sync__:";

export function AppShell() {
  const [view, setView] = useState<View>("menu");
  const [activeCue, setActiveCue] = useState<{ cueId: string; tone: string; message: string } | null>(null);
  const [activeDiceOverlay, setActiveDiceOverlay] = useState<{ type: "critical" | "fumble"; rollerName: string; reason: string } | null>(null);
  const [activeDiceTray, setActiveDiceTray] = useState<{
    request: DiceRequest;
    diceCount: number;
    diceSides: number;
    results: number[];
    reason: string;
    rollerName: string;
  } | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const activeShakeClassRef = useRef<string | null>(null);
  const cueTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const theme = localStorage.getItem("gdr_visual_theme") || "fantasy";
      document.documentElement.className = `theme-${theme}`;
    }
  }, []);

  const [roomState, setRoomState] = useState<RoomState>(demoRoomState);
  const [identityId, setIdentityId] = useState("master");
  const [status, setStatus] = useState("Caricamento dati...");
  const [isLoading, setIsLoading] = useState(!demoMode);
  const [error, setError] = useState("");
  const [pendingPlayerRoom, setPendingPlayerRoom] = useState<RoomState | null>(null);
  const [actionLog, setActionLog] = useState<{ id: string; label: string; detail?: string; created_at: string }[]>([]);
  const [adminRooms, setAdminRooms] = useState<AdminRoomOverview[]>([]);
  const [adminMedia, setAdminMedia] = useState<AdminMediaOverview[]>([]);
  const [userSessions, setUserSessions] = useState<UserSessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [cinematicEvent, setCinematicEvent] = useState<CinematicEvent | null>(null);
  const sceneEventRef = useRef(roomState.scene.id);
  const spotlightEventRef = useRef(roomState.room.spotlight_npc_id ?? "");
  const soundEffectEventRef = useRef(roomState.room.current_sound_effect_id ?? "");
  const privateEventIdsRef = useRef(new Set(roomState.privateMessages.map((message) => message.id)));
  const mapSyncRevisionRef = useRef("");
  const mapSchemaUnavailableRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const supabase = createClient();
  const currentAudio = useMemo(
    () => roomState.audioTracks.find((track) => track.id === roomState.room.current_audio_id) ?? roomState.audioTracks[0],
    [roomState.audioTracks, roomState.room.current_audio_id]
  );
  const currentCharacter =
    roomState.characters.find((character) => character.user_id === roomState.profile.id) ?? roomState.characters[0];
  const isCurrentMaster = roomState.profile.role === "master";
  const isCurrentPlayer = roomState.profile.role === "player";
  const hasCurrentSession = demoMode || roomState.room.id !== demoRoomState.room.id;
  const isSuperAdmin = isConfiguredSuperadmin(roomState.profile);

  function logAction(label: string, detail?: string) {
    setActionLog((items) => [{ id: crypto.randomUUID(), label, detail, created_at: new Date().toISOString() }, ...items].slice(0, 12));
  }

  function showCinematicEvent(event: CinematicEventPayload) {
    setCinematicEvent({ ...event, id: crypto.randomUUID() });
    window.setTimeout(() => {
      setCinematicEvent((current) => (current?.title === event.title && current.kind === event.kind ? null : current));
    }, event.kind === "scene" ? 4800 : 4200);
  }

  function triggerDirectorCueLocally(cueId: string, tone: string, message: string) {
    if (tone === "danger") {
      playUiCinematicDanger();
    } else if (tone === "reveal") {
      playUiCinematicReveal();
    } else if (tone === "vision") {
      playUiCinematicVision();
    } else if (tone === "chapter") {
      playUiCinematicChapter();
    } else if (tone === "earthquake") {
      playUiCinematicEarthquake();
    }

    if (shakeTimeoutRef.current !== null) {
      window.clearTimeout(shakeTimeoutRef.current);
      if (activeShakeClassRef.current) {
        document.documentElement.classList.remove(activeShakeClassRef.current);
      }
    }

    const shakeClass = tone === "earthquake" ? "cue-shake-heavy-active" : "cue-shake-active";
    const shakeDuration = tone === "earthquake" ? 1500 : 800;

    activeShakeClassRef.current = shakeClass;
    document.documentElement.classList.add(shakeClass);
    shakeTimeoutRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove(shakeClass);
      shakeTimeoutRef.current = null;
      activeShakeClassRef.current = null;
    }, shakeDuration);

    if (cueTimeoutRef.current !== null) {
      window.clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = null;
    }

    setActiveCue({ cueId, tone, message });

    if (tone !== "chapter") {
      cueTimeoutRef.current = window.setTimeout(() => {
        setActiveCue(null);
        cueTimeoutRef.current = null;
      }, 4500);
    }
  }

  async function broadcastDirectorCue(cueId: string, tone: string, messageText: string) {
    triggerDirectorCueLocally(cueId, tone, messageText);

    if (realtimeChannelRef.current && !demoMode) {
      realtimeChannelRef.current.send({
        type: "broadcast",
        event: "director-cue",
        payload: { cueId, tone, message: messageText }
      });
    }

    let cueLabel = "Evento";
    if (tone === "reveal") cueLabel = "Rivelazione";
    else if (tone === "danger") cueLabel = "Pericolo";
    else if (tone === "vision") cueLabel = "Visione";
    else if (tone === "chapter") cueLabel = "Fine Capitolo";
    else if (tone === "earthquake") cueLabel = "Terremoto";

    await publishMessage(`[EVENTO] Cue di Regia: ${cueLabel} - "${messageText}"`, false, undefined, "master");
  }

  async function broadcastMapSync(nextState: RoomState) {
    const payload = buildMapSyncPayload(nextState);
    mapSyncRevisionRef.current = payload.revision;

    if (!supabase || demoMode) return;

    const channel = realtimeChannelRef.current;
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "map-sync",
        payload
      });
    }
  }

  async function broadcastInventorySync(action: "upsert" | "delete", item: InventoryItem) {
    if (!supabase || demoMode) return;

    const channel = realtimeChannelRef.current;
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "inventory-sync",
        payload: { action, item }
      });
    }
  }

  useEffect(() => {
    if (!supabase || demoMode) {
      setIsLoading(false);
      setStatus("Modalita demo locale");
      return;
    }

    let active = true;

    async function load() {
      try {
        setError("");
        const { data, error: authError } = await withClientTimeout(
          supabase!.auth.getUser(),
          6000,
          "Supabase non ha risposto in tempo durante il controllo sessione. Puoi comunque usare il menu e riprovare."
        );
        if (authError) {
          if (readError(authError).toLowerCase().includes("invalid refresh token")) {
            clearSupabaseAuthStorage();
            setStatus("Sessione scaduta: accedi di nuovo");
            setIsLoading(false);
            return;
          }
          throw authError;
        }
        if (!data.user) {
          setIsLoading(false);
          return;
        }

        let profile = profileFromUser(data.user);

        try {
          profile = await ensureProfile(supabase!, data.user);
        } catch (profileError) {
          setError(
            `Login riuscito, ma il profilo pubblico non e stato creato. Esegui lo schema SQL aggiornato in Supabase. Dettaglio: ${readError(profileError)}`
          );
        }

        const initialState = await withClientTimeout(
          loadInitialRoomState(supabase!, profile),
          8000,
          "Supabase non ha risposto in tempo durante il caricamento stanza. Puoi creare o entrare in una stanza dal menu."
        );

        if (!active) return;

        setRoomState(initialState ?? { ...demoRoomState, profile, campaigns: [demoRoomState.campaigns[0]] });
        setStatus(initialState ? "Connesso a Supabase" : "Connesso: crea una partita o entra con codice");
      } catch (loadError) {
        setError(readError(loadError));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || demoMode || !hasCurrentSession || !roomState.room.id) return;

    let channel = supabase
      .channel(`room-${roomState.room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          const message = payload.new as Message;
          const mapSync = parseMapSyncMessage(message);
          if (mapSync) {
            setRoomState((state) => applyMapSyncState(state, mapSync));
            return;
          }
          setRoomState((state) => {
            const target = message.is_private ? state.privateMessages : message.channel === "off" ? state.offMessages : state.messages;
            if (target.some((item) => item.id === message.id)) return state;

            if (message.is_private) return { ...state, privateMessages: [...state.privateMessages, message] };
            if (message.channel === "off") return { ...state, offMessages: [...state.offMessages, message] };
            return { ...state, messages: [...state.messages, message] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          const deleted = payload.old as Message;
          setRoomState((state) => ({
            ...state,
            messages: state.messages.filter((item) => item.id !== deleted.id),
            offMessages: state.offMessages.filter((item) => item.id !== deleted.id),
            privateMessages: state.privateMessages.filter((item) => item.id !== deleted.id)
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          const updated = payload.new as Message;
          setRoomState((state) => updateMessageInState(state, updated));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomState.room.id}` },
        (payload) => {
          const room = payload.new as Room;
          setRoomState((state) => ({
            ...state,
            room,
            scene: state.scenes.find((scene) => scene.id === room.current_scene_id) ?? state.scene
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dice_requests", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const incoming = payload.new as DiceRequest;
            if (incoming.status === "rolled" && incoming.dice_sides === 20 && (incoming.dice_count === 1 || !incoming.dice_count) && incoming.result) {
              if (incoming.result === 20 || incoming.result === 1) {
                setRoomState((state) => {
                  const prev = state.diceRequests.find((item) => item.id === incoming.id);
                  if (prev && prev.status === "pending") {
                    const char = state.characters.find((c) => c.user_id === incoming.target_user_id);
                    const rollerName = char ? `${char.character_name} ${char.character_surname}` : "Un Eroe";
                    setTimeout(() => {
                      setActiveDiceOverlay({
                        type: incoming.result === 20 ? "critical" : "fumble",
                        rollerName,
                        reason: stripDiceCountMarker(incoming.reason)
                      });
                    }, 100);
                  }
                  return updateCollectionEvent(state, "diceRequests", payload, "created_at", false);
                });
                return;
              }
            }
          }
          setRoomState((state) => updateCollectionEvent(state, "diceRequests", payload, "created_at", false));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_assets", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          setRoomState((state) => updateCollectionEvent(state, "mediaAssets", payload, "created_at", false));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scenes", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          setRoomState((state) => {
            const next = updateCollectionEvent(state, "scenes", payload, "created_at", false);
            return { ...next, scene: next.scenes.find((scene) => scene.id === next.room.current_scene_id) ?? next.scene };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audio_tracks", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          setRoomState((state) => updateCollectionEvent(state, "audioTracks", payload, "title", true));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sound_effects", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          setRoomState((state) => updateCollectionEvent(state, "soundEffects", payload, "title", true));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_characters", filter: `room_id=eq.${roomState.room.id}` },
        (payload) => {
          setRoomState((state) => updateCollectionEvent(state, "characters", payload, "created_at", true));
        }
      )

      .on(
        "broadcast",
        { event: "map-sync" },
        (response) => {
          const payload = response.payload as MapSyncPayload;
          if (payload && payload.revision !== mapSyncRevisionRef.current) {
            mapSyncRevisionRef.current = payload.revision;
            setRoomState((state) => applyMapSyncState(state, payload));
          }
        }
      )
      .on(
        "broadcast",
        { event: "director-cue" },
        (response) => {
          const payload = response.payload as { cueId: string; tone: string; message: string };
          if (payload) {
            triggerDirectorCueLocally(payload.cueId, payload.tone, payload.message);
          }
        }
      )
      .on(
        "broadcast",
        { event: "inventory-sync" },
        (response) => {
          const payload = response.payload as { action?: "upsert" | "delete"; item?: InventoryItem };
          if (payload?.item) {
            setRoomState((state) => applyInventorySync(state, payload.action ?? "upsert", payload.item!));
          }
        }
      );

    realtimeChannelRef.current = channel;
    channel.subscribe();

    return () => {
      realtimeChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [supabase, hasCurrentSession, roomState.room.id, roomState.profile]);

  useEffect(() => {
    const latestSync = [...roomState.messages, ...roomState.offMessages, ...roomState.privateMessages]
      .map(parseMapSyncMessage)
      .filter((payload): payload is MapSyncPayload => Boolean(payload))
      .sort((a, b) => b.revision.localeCompare(a.revision))[0];

    if (!latestSync || latestSync.revision === mapSyncRevisionRef.current) return;
    mapSyncRevisionRef.current = latestSync.revision;
    setRoomState((state) => applyMapSyncState(state, latestSync));
  }, [roomState.messages, roomState.offMessages, roomState.privateMessages]);



  useEffect(() => {
    if (view !== "player" && view !== "master") {
      sceneEventRef.current = roomState.scene.id;
      return;
    }
    if (!hasCurrentSession || !roomState.scene.id) return;
    if (sceneEventRef.current === roomState.scene.id) return;

    sceneEventRef.current = roomState.scene.id;
    showCinematicEvent({
      kind: "scene",
      title: roomState.scene.title,
      detail: roomState.scene.description || "La scena cambia. Tutti gli occhi si spostano sul nuovo momento.",
      imageUrl: roomState.scene.image_url,
      mediaType: roomState.scene.media_type
    });
  }, [hasCurrentSession, roomState.scene.id, roomState.scene.title, roomState.scene.description, roomState.scene.image_url, roomState.scene.media_type, view]);

  useEffect(() => {
    if (view !== "player" || !hasCurrentSession) {
      privateEventIdsRef.current = new Set(roomState.privateMessages.map((message) => message.id));
      return;
    }

    const seen = privateEventIdsRef.current;
    const newest = [...roomState.privateMessages]
      .filter((message) => !seen.has(message.id))
      .filter((message) => message.recipient_user_id === roomState.profile.id || message.sender_user_id === roomState.profile.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    privateEventIdsRef.current = new Set(roomState.privateMessages.map((message) => message.id));

    if (newest) {
      showCinematicEvent({
        kind: "whisper",
        title: newest.sender_user_id === roomState.profile.id ? "Sussurro inviato" : "Sussurro del Master",
        detail: newest.content
      });
    }
  }, [hasCurrentSession, roomState.privateMessages, roomState.profile.id, view]);

  useEffect(() => {
    if (!hasCurrentSession || view !== "player") return;
    const nextSpotlightId = roomState.room.spotlight_npc_id ?? "";
    if (spotlightEventRef.current === nextSpotlightId) return;

    spotlightEventRef.current = nextSpotlightId;
    const npc = roomState.npcs.find((item) => item.id === nextSpotlightId);
    const canSeePrivate =
      roomState.room.spotlight_visibility !== "private" || Boolean(roomState.room.spotlight_user_ids?.includes(roomState.profile.id));

    if (npc && roomState.room.spotlight_visibility !== "off" && canSeePrivate) {
      showCinematicEvent({
        kind: "npc",
        title: npc.name,
        detail: npc.description || "Una nuova presenza entra nella scena.",
        imageUrl: npc.portrait_url
      });
    }
  }, [hasCurrentSession, roomState.npcs, roomState.profile.id, roomState.room.spotlight_npc_id, roomState.room.spotlight_user_ids, roomState.room.spotlight_visibility, view]);

  useEffect(() => {
    if (!hasCurrentSession || view !== "player") return;
    const nextSoundId = roomState.room.current_sound_effect_id ?? "";
    if (soundEffectEventRef.current === nextSoundId) return;

    soundEffectEventRef.current = nextSoundId;
    const effect = roomState.soundEffects.find((item) => item.id === nextSoundId);
    if (effect) {
      showCinematicEvent({
        kind: "sound",
        title: effect.title,
        detail: "Un effetto sonoro attraversa la scena."
      });
    }
  }, [hasCurrentSession, roomState.room.current_sound_effect_id, roomState.soundEffects, view]);

  async function createGame(values: CreateGameValues) {
    const inviteCode = values.inviteCode.trim().toUpperCase() || generateInviteCode(values.campaignTitle);

    if (supabase && !demoMode) {
      try {
        setError("");
        let coverImageUrl = values.coverImageUrl;
        let sceneImageUrl = values.sceneImageUrl;

        if (values.coverImageFile) {
          coverImageUrl = await uploadPublicFile(supabase, "scene-images", values.coverImageFile, `campaign-covers/${roomState.profile.id}`);
        }

        if (values.sceneImageFile) {
          sceneImageUrl = await uploadPublicFile(supabase, "scene-images", values.sceneImageFile, `initial-scenes/${roomState.profile.id}`);
        }

        const nextState = await createGameInSupabase(supabase, roomState.profile, { ...values, inviteCode, coverImageUrl, sceneImageUrl });
        setRoomState(nextState);
        setStatus("Partita creata su Supabase");
        setView("master");
      } catch (createError) {
        setError(readError(createError));
      }
      return;
    }

    const nextScene: Scene = {
      ...roomState.scene,
      id: crypto.randomUUID(),
      room_id: roomState.room.id,
      title: values.sceneTitle,
      description: values.sceneDescription,
      image_url: values.sceneImageUrl || roomState.scene.image_url,
      media_type: "image",
      video_url: null,
      loop_video: true,
      linked_audio_id: null,
      created_at: new Date().toISOString()
    };

    setRoomState((state) => ({
      ...state,
      profile: { ...state.profile, role: "master" },
      campaigns: [
        {
          ...state.campaigns[0],
          title: values.campaignTitle,
          genre: values.genre,
          description: values.description,
          cover_image_url: values.coverImageUrl || state.campaigns[0].cover_image_url,
          created_at: new Date().toISOString()
        }
      ],
      room: {
        ...state.room,
        name: values.roomName,
        invite_code: inviteCode,
        max_players: values.maxPlayers,
        current_scene_id: nextScene.id
      },
      scene: nextScene,
      scenes: [nextScene, ...state.scenes]
    }));
    setView("master");
  }

  async function openSuperAdminPanel() {
    if (!isSuperAdmin || !supabase || demoMode) {
      setError("Pannello superadmin disponibile solo per gli account configurati in NEXT_PUBLIC_SUPERADMIN_EMAILS con Supabase attivo.");
      return;
    }

    try {
      setError("");
      const rooms = await listAllRoomsForSuperAdmin(supabase, roomState.profile);
      const media = await listAllMediaForSuperAdmin(supabase, roomState.profile);
      setAdminRooms(rooms);
      setAdminMedia(media);
      setView("superadmin");
    } catch (adminError) {
      setError(readError(adminError));
    }
  }

  async function refreshAdminRooms() {
    if (!isSuperAdmin || !supabase || demoMode) return;

    try {
      setError("");
      const [rooms, media] = await Promise.all([listAllRoomsForSuperAdmin(supabase, roomState.profile), listAllMediaForSuperAdmin(supabase, roomState.profile)]);
      setAdminRooms(rooms);
      setAdminMedia(media);
    } catch (adminError) {
      setError(readError(adminError));
    }
  }

  function currentSessionSummary(): UserSessionSummary | null {
    if (!hasCurrentSession) return null;

    return {
      id: `${isCurrentMaster ? "master" : "player"}:${roomState.room.id}`,
      roomId: roomState.room.id,
      campaignId: roomState.room.campaign_id,
      campaignTitle: roomState.campaigns[0]?.title ?? "Campagna",
      campaignStatus: roomState.campaigns[0]?.status,
      roomName: roomState.room.name,
      inviteCode: roomState.room.invite_code,
      role: isCurrentMaster ? "master" : "player",
      playerCount: roomState.characters.length,
      maxPlayers: roomState.room.max_players ?? 4,
      characterName: currentCharacter
        ? `${currentCharacter.character_name} ${currentCharacter.character_surname}`.trim()
        : undefined,
      isSetupComplete: currentCharacter?.is_setup_complete,
      createdAt: roomState.campaigns[0]?.created_at ?? new Date().toISOString(),
      lastActivityAt: roomState.messages.at(-1)?.created_at ?? roomState.scene.created_at ?? new Date().toISOString()
    };
  }

  async function refreshUserSessions() {
    if (!supabase || demoMode) {
      const current = currentSessionSummary();
      setUserSessions(current ? [current] : []);
      return;
    }

    try {
      setError("");
      setIsLoadingSessions(true);
      const sessions = await listUserSessions(supabase, roomState.profile);
      setUserSessions(sessions);
    } catch (sessionsError) {
      setError(readError(sessionsError));
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function openSessionsPanel() {
    setView("sessions");
    await refreshUserSessions();
  }

  async function openUserSession(session: UserSessionSummary) {
    if (!supabase || demoMode) {
      setRoomState((state) => ({ ...state, profile: { ...state.profile, role: session.role } }));
      setView(session.role === "master" ? "master" : "player");
      return;
    }

    try {
      setError("");
      const selectedState = await loadRoomState(supabase, session.roomId, { ...roomState.profile, role: session.role });

      if (session.role === "master") {
        setRoomState({ ...selectedState, profile: { ...selectedState.profile, role: "master" } });
        setStatus("Sessione Master aperta");
        setView("master");
        return;
      }

      const playerState = { ...selectedState, profile: { ...selectedState.profile, role: "player" as const } };
      const existingCharacter = playerState.characters.find((character) => character.user_id === playerState.profile.id);
      setRoomState(playerState);

      if (existingCharacter?.is_setup_complete) {
        setPendingPlayerRoom(null);
        setStatus("Sessione giocatore aperta");
        setView("player");
      } else {
        setPendingPlayerRoom(playerState);
        setStatus("Completa il personaggio per questa sessione");
        setView("character");
      }
    } catch (sessionsError) {
      setError(readError(sessionsError));
    }
  }

  async function updateAdminRoom(roomId: string, values: { name: string; inviteCode: string; maxPlayers: number }) {
    if (!isSuperAdmin || !supabase || demoMode) return;

    try {
      setError("");
      await updateRoomBySuperAdmin(supabase, roomState.profile, roomId, values);
      await refreshAdminRooms();
      setStatus("Stanza aggiornata dal superadmin");
    } catch (adminError) {
      setError(readError(adminError));
    }
  }

  async function deleteAdminRoom(room: AdminRoomOverview) {
    if (!isSuperAdmin || !supabase || demoMode) return;
    const confirmed = window.confirm(`Vuoi eliminare definitivamente la stanza "${room.name}"?`);
    if (!confirmed) return;

    try {
      setError("");
      await deleteRoomBySuperAdmin(supabase, roomState.profile, room.id);
      await refreshAdminRooms();
      setStatus("Stanza eliminata dal superadmin");
    } catch (adminError) {
      setError(readError(adminError));
    }
  }

  async function deleteAdminMedia(media: AdminMediaOverview) {
    if (!isSuperAdmin || !supabase || demoMode) return;
    const confirmed = window.confirm(`Vuoi eliminare definitivamente "${media.title}"?`);
    if (!confirmed) return;

    try {
      setError("");
      await deleteMediaBySuperAdmin(supabase, roomState.profile, media);
      await refreshAdminRooms();
      setStatus("Contenuto multimediale eliminato dal superadmin");
    } catch (adminError) {
      setError(readError(adminError));
    }
  }

  async function publishMessage(content: string, isPrivate = false, recipientUserId?: string, explicitIdentityId = identityId, channel: "gdr" | "off" = "gdr") {
    const wantsMasterIdentity = explicitIdentityId !== "player";

    // Intercept and parse dice roll commands (/roll or /r)
    let rawContent = content;
    let replyPrefix = "";
    const replyMatch = content.match(/^(\[reply-to:[^:]+:[^\]]+\]\s*)(.*)$/i);
    if (replyMatch) {
      replyPrefix = replyMatch[1];
      rawContent = replyMatch[2];
    }

    const rollMatch = rawContent.match(/^\/(roll|r)\s+(\d+)?d(\d+)([\+\-]\d+)?(?:\s+(.*))?$/i);
    if (rollMatch && channel === "gdr") {
      const count = rollMatch[2] ? parseInt(rollMatch[2], 10) : 1;
      const sides = parseInt(rollMatch[3], 10);
      const modStr = rollMatch[4];
      const modifier = modStr ? parseInt(modStr, 10) : 0;
      const reason = rollMatch[5] ? rollMatch[5].trim() : "";

      if (sides > 0 && count > 0 && count <= 50) {
        const roll = rollDiceValues(count, sides);
        const totalWithMod = roll.total + modifier;
        const modifierText = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : "";
        
        let rollDetail = "";
        if (count > 1) {
          rollDetail = `[${roll.results.join(", ")}]${modifierText} totale ${totalWithMod}`;
        } else {
          rollDetail = modifier !== 0 ? `${roll.total}${modifierText} = ${totalWithMod}` : `${roll.total}`;
        }

        const npc = roomState.npcs.find((item) => item.id === explicitIdentityId);
        const charName = currentCharacter
          ? `${currentCharacter.character_name} ${currentCharacter.character_surname}`
          : roomState.profile.username;
        const senderName = npc
          ? npc.name
          : explicitIdentityId === "player"
            ? charName
            : "Master";

        content = `${replyPrefix}${senderName} tira ${count}d${sides}${modifierText}: ${rollDetail}${reason ? ` (${reason})` : ""}`;
      }
    }

    const isPlayerTurn = !roomState.room.turn_enabled ||
      (roomState.room.turn_order && roomState.room.turn_order[roomState.room.current_turn_index ?? 0] === roomState.profile.id);

    if (channel === "gdr" && explicitIdentityId === "player" && (roomState.room.chat_enabled === false || roomState.room.muted_user_ids?.includes(roomState.profile.id) || !isPlayerTurn)) {
      if (roomState.room.chat_enabled === false) {
        setError("La chat comune è disattivata dal Master.");
      } else if (roomState.room.muted_user_ids?.includes(roomState.profile.id)) {
        setError("Il Master ha disattivato la tua chat.");
      } else {
        const activeUserId = roomState.room.turn_order && roomState.room.turn_order[roomState.room.current_turn_index ?? 0];
        const activeCharacter = roomState.characters.find((c) => c.user_id === activeUserId);
        const activeName = activeCharacter ? `${activeCharacter.character_name}` : "un altro giocatore";
        setError(`Non è il tuo turno. Attendi che parli: ${activeName}`);
      }
      return;
    }

    if (wantsMasterIdentity && !isCurrentMaster) {
      setError("Solo chi ha creato la partita puo usare identita Master o NPC.");
      return;
    }

    const npc = roomState.npcs.find((item) => item.id === explicitIdentityId);
    const message: Omit<Message, "id" | "created_at"> = {
      room_id: roomState.room.id,
      sender_user_id: roomState.profile.id,
      sender_type: npc ? "npc" : explicitIdentityId === "player" ? "player" : "master",
      sender_display_name: npc
        ? npc.name
        : explicitIdentityId === "player"
          ? `${currentCharacter.character_name} ${currentCharacter.character_surname}`
          : "Master",
      sender_color: npc ? npc.color : explicitIdentityId === "player" ? currentCharacter.color : "#c8a35d",
      npc_id: npc?.id,
      content,
      is_private: isPrivate,
      channel,
      recipient_user_id: recipientUserId
    };

    if (supabase && !demoMode) {
      try {
        setError("");
        const saved = await insertMessage(supabase, message);
        setRoomState((state) => addMessageToState(state, saved));
        logAction(channel === "off" ? "Messaggio OFF GDR" : isPrivate ? "Sussurro inviato" : "Messaggio in chat", content.slice(0, 80));
      } catch (messageError) {
        setError(readError(messageError));
      }
      return;
    }

    const localMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    setRoomState((state) => addMessageToState(state, localMessage));
    logAction(channel === "off" ? "Messaggio OFF GDR" : isPrivate ? "Sussurro inviato" : "Messaggio in chat", content.slice(0, 80));
  }

  async function markTyping() {
    // Typing realtime intentionally disabled to keep Supabase Realtime usage low.
  }

  async function changeScene(scene: Scene) {
    if (!isCurrentMaster) {
      setError("Solo il Master puo cambiare scena.");
      return;
    }

    const linkedAudioId = scene.linked_audio_id ?? null;

    if (supabase && !demoMode) {
      try {
        setError("");
        await updateCurrentScene(supabase, roomState.room.id, scene.id, linkedAudioId);
      } catch (sceneError) {
        setError(readError(sceneError));
      }
    }

    setRoomState((state) => ({
      ...state,
      scene,
      room: { ...state.room, current_scene_id: scene.id, current_audio_id: linkedAudioId || state.room.current_audio_id }
    }));

    if (linkedAudioId) {
      const linkedTrack = roomState.audioTracks.find((track) => track.id === linkedAudioId);
      logAction("Scena e audio sincronizzati", linkedTrack ? `${scene.title} · ${linkedTrack.title}` : scene.title);
    }
  }

  async function changeAudio(track: AudioTrack) {
    if (!isCurrentMaster) {
      setError("Solo il Master puo cambiare audio.");
      return;
    }

    if (supabase && !demoMode) {
      try {
        setError("");
        await updateCurrentAudio(supabase, roomState.room.id, track.id);
      } catch (audioError) {
        setError(readError(audioError));
      }
    }

    setRoomState((state) => ({
      ...state,
      room: { ...state.room, current_audio_id: track.id }
    }));
  }

  async function joinRoom(code: string, mode: JoinMode) {
    if (supabase && !demoMode) {
      try {
        setError("");
        if (mode === "master") {
          const masterState = await enterMasterRoomByCode(supabase, code, roomState.profile);
          if (!masterState) return false;

          setRoomState(masterState);
          setStatus("Rientro Master completato");
          setView("master");
          return true;
        }

        const joinedState = await joinRoomByCode(supabase, code, roomState.profile);
        if (!joinedState) return false;

        const playerState = { ...joinedState, profile: { ...joinedState.profile, role: "player" as const } };
        setRoomState(playerState);
        const existingCharacter = playerState.characters.find((character) => character.user_id === playerState.profile.id);
        if (existingCharacter?.is_setup_complete) {
          setPendingPlayerRoom(null);
          setStatus("Rientro giocatore completato");
          setView("player");
        } else {
          setPendingPlayerRoom(playerState);
          setStatus("Stanza trovata: crea il tuo personaggio");
          setView("character");
        }
        return true;
      } catch (joinError) {
        setError(readError(joinError));
        return false;
      }
    }

    if (code.trim().toUpperCase() === roomState.room.invite_code.toUpperCase()) {
      if (mode === "master") {
        if (roomState.campaigns[0]?.master_id !== roomState.profile.id) {
          setError("Questo codice stanza appartiene a un altro Master.");
          return false;
        }

        setRoomState((state) => ({ ...state, profile: { ...state.profile, role: "master" } }));
        setView("master");
        return true;
      }

      setRoomState((state) => ({ ...state, profile: { ...state.profile, role: "player" } }));
      setView("character");
      return true;
    }

    return false;
  }

  async function createCharacter(values: CharacterSetupValues) {
    const targetState = pendingPlayerRoom ?? roomState;
    let portraitUrl = values.portraitUrl;

    try {
      setError("");
      if (supabase && !demoMode) {
        if (values.portraitFile) {
          portraitUrl = await uploadPublicFile(supabase, "portraits", values.portraitFile, `rooms/${targetState.room.id}/portraits`);
        }

        await createOrUpdateCharacter(supabase, targetState.room.id, targetState.profile, {
          characterName: values.characterName,
          characterSurname: values.characterSurname,
          color: values.color,
          portraitUrl: portraitUrl || demoRoomState.characters[0].portrait_url,
          hp: values.hp,
          mentalState: values.mentalState,
          visibleStatus: values.visibleStatus,
          publicBackground: values.publicBackground
        });

        const refreshed = await loadRoomState(supabase, targetState.room.id, { ...targetState.profile, role: "player" });
        setRoomState({ ...refreshed, profile: { ...refreshed.profile, role: "player" } });
      }

      setPendingPlayerRoom(null);
      setStatus("Personaggio creato");
      setView("player");
    } catch (characterError) {
      setError(readError(characterError));
    }
  }

  async function createMasterScene(values: {
    title: string;
    description: string;
    imageUrl: string;
    imageFile?: File;
    mediaType?: SceneMediaType;
    videoUrl?: string;
    videoFile?: File;
    loopVideo?: boolean;
    visibility?: SceneVisibility;
    visibleUserIds?: string[];
    linkedAudioId?: string | null;
  }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let imageUrl = values.imageUrl;
      let videoUrl = values.videoUrl ?? "";
      if (supabase && !demoMode) {
        if (values.imageFile) {
          imageUrl = await uploadPublicFile(supabase, "scene-images", values.imageFile, `rooms/${roomState.room.id}/scenes`);
        }
        if (values.videoFile) {
          videoUrl = await uploadPublicFile(supabase, "scene-images", values.videoFile, `rooms/${roomState.room.id}/scene-videos`);
        }
        if (values.mediaType === "video" && !imageUrl) {
          imageUrl = videoUrl;
        }
        const scene = await createScene(supabase, roomState.room.id, { ...roomState.profile, role: "master" }, { ...values, imageUrl, videoUrl });
        const sceneAssetUrl = scene.media_type === "video" ? scene.video_url || scene.image_url : scene.image_url;
        if (sceneAssetUrl) {
          const asset = await createMediaAsset(supabase, roomState.room.id, roomState.profile, {
            title: scene.title,
            assetType: scene.media_type === "video" ? "video" : "image",
            url: sceneAssetUrl,
            tags: ["scena"]
          });
          setRoomState((state) => ({ ...state, mediaAssets: [asset, ...state.mediaAssets.filter((item) => item.id !== asset.id)] }));
        }
        await updateCurrentScene(supabase, roomState.room.id, scene.id, scene.linked_audio_id ?? null);
        setRoomState((state) => ({
          ...state,
          scene,
          scenes: [scene, ...state.scenes.filter((item) => item.id !== scene.id)],
          room: { ...state.room, current_scene_id: scene.id, current_audio_id: scene.linked_audio_id || state.room.current_audio_id }
        }));
      }
      setStatus("Scena salvata");
    } catch (sceneError) {
      setError(readError(sceneError));
    }
  }

  async function updateMasterScene(
    sceneId: string,
    values: {
      title: string;
      description: string;
      imageUrl: string;
      imageFile?: File;
      mediaType?: SceneMediaType;
      videoUrl?: string;
      videoFile?: File;
      loopVideo?: boolean;
      visibility?: SceneVisibility;
      visibleUserIds?: string[];
      linkedAudioId?: string | null;
    }
  ) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let imageUrl = values.imageUrl;
      let videoUrl = values.videoUrl ?? "";
      if (supabase && !demoMode) {
        if (values.imageFile) {
          imageUrl = await uploadPublicFile(supabase, "scene-images", values.imageFile, `rooms/${roomState.room.id}/scenes`);
        }
        if (values.videoFile) {
          videoUrl = await uploadPublicFile(supabase, "scene-images", values.videoFile, `rooms/${roomState.room.id}/scene-videos`);
        }
        if (values.mediaType === "video" && !imageUrl) {
          imageUrl = videoUrl;
        }
        const updatedScene = await updateScene(supabase, sceneId, { ...values, imageUrl, videoUrl });

        // Update scene state immediately so the UI reflects changes even if asset creation fails
        const isActiveScene = roomState.room.current_scene_id === sceneId;
        setRoomState((state) => {
          const updatedScenes = state.scenes.map((s) => (s.id === sceneId ? updatedScene : s));
          return {
            ...state,
            scene: state.scene.id === sceneId ? updatedScene : state.scene,
            scenes: updatedScenes,
            room: isActiveScene
              ? {
                  ...state.room,
                  current_audio_id: updatedScene.linked_audio_id || state.room.current_audio_id
                }
              : state.room
          };
        });

        // Optional: sync audio if the active scene's linked audio changed
        if (isActiveScene && updatedScene.linked_audio_id && updatedScene.linked_audio_id !== roomState.room.current_audio_id) {
          await updateCurrentScene(supabase, roomState.room.id, updatedScene.id, updatedScene.linked_audio_id).catch(() => {});
        }

        // Optional: register asset in the media library (non-blocking – failures don't break scene update)
        const sceneAssetUrl = updatedScene.media_type === "video" ? updatedScene.video_url || updatedScene.image_url : updatedScene.image_url;
        if (sceneAssetUrl) {
          try {
            const asset = await createMediaAsset(supabase, roomState.room.id, roomState.profile, {
              title: updatedScene.title,
              assetType: updatedScene.media_type === "video" ? "video" : "image",
              url: sceneAssetUrl,
              tags: ["scena"]
            });
            setRoomState((state) => ({ ...state, mediaAssets: [asset, ...state.mediaAssets.filter((item) => item.id !== asset.id)] }));
          } catch {
            // Media-library sync is best effort; the scene itself has already been saved.
          }
        }
      } else {
        setRoomState((state) => {
          const mockScene: Scene = {
            id: sceneId,
            room_id: state.room.id,
            title: values.title,
            description: values.description,
            image_url: imageUrl,
            media_type: values.mediaType ?? "image",
            video_url: videoUrl || null,
            loop_video: values.loopVideo ?? true,
            visibility: values.visibility ?? "public",
            visible_user_ids: values.visibleUserIds ?? [],
            linked_audio_id: values.linkedAudioId || null,
            created_at: state.scenes.find((s) => s.id === sceneId)?.created_at ?? new Date().toISOString(),
            created_by: state.profile.id
          };
          return {
            ...state,
            scene: state.scene.id === sceneId ? mockScene : state.scene,
            scenes: state.scenes.map((s) => (s.id === sceneId ? mockScene : s))
          };
        });
      }
      setStatus("Scena modificata");
    } catch (sceneError) {
      setError(readError(sceneError));
    }
  }

  async function removeMasterScene(scene: Scene) {
    if (!isCurrentMaster) return;

    if (roomState.scenes.length <= 1) {
      setError("Non puoi eliminare l'unica scena della stanza. Creane prima un'altra.");
      return;
    }

    const confirmed = window.confirm(`Vuoi eliminare definitivamente la scena "${scene.title}"? Immagine e descrizione verranno rimosse.`);
    if (!confirmed) return;

    try {
      setError("");
      const fallbackScene = roomState.scenes.find((item) => item.id !== scene.id);

      if (supabase && !demoMode) {
        if (roomState.room.current_scene_id === scene.id && fallbackScene) {
          await updateCurrentScene(supabase, roomState.room.id, fallbackScene.id);
        }

        await deleteScene(supabase, scene);
      }

      if (fallbackScene) {
        setRoomState((state) => ({
          ...state,
          scene: state.scene.id === scene.id ? fallbackScene : state.scene,
          scenes: state.scenes.filter((item) => item.id !== scene.id),
          room: { ...state.room, current_scene_id: state.room.current_scene_id === scene.id ? fallbackScene.id : state.room.current_scene_id }
        }));
      }

      setStatus("Scena eliminata");
    } catch (sceneError) {
      setError(readError(sceneError));
    }
  }

  async function createMasterAudio(values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let audioUrl = values.audioUrl;
      if (supabase && !demoMode) {
        if (values.audioFile) {
          audioUrl = await uploadPublicFile(supabase, "audio-tracks", values.audioFile, `rooms/${roomState.room.id}/audio`);
        }
        const track = await createAudioTrack(supabase, roomState.room.id, { ...values, audioUrl });
        if (audioUrl) {
          const asset = await createMediaAsset(supabase, roomState.room.id, roomState.profile, {
            title: track.title,
            assetType: "audio",
            url: audioUrl,
            tags: ["audio", "traccia"]
          });
          setRoomState((state) => ({ ...state, mediaAssets: [asset, ...state.mediaAssets.filter((item) => item.id !== asset.id)] }));
        }
        await updateCurrentAudio(supabase, roomState.room.id, track.id);
        setRoomState((state) => ({
          ...state,
          audioTracks: [...state.audioTracks.filter((item) => item.id !== track.id), track].sort((a, b) => a.title.localeCompare(b.title)),
          room: { ...state.room, current_audio_id: track.id }
        }));
      }
      setStatus("Traccia audio salvata");
    } catch (audioError) {
      setError(readError(audioError));
    }
  }

  async function removeMasterAudio(track: AudioTrack) {
    if (!isCurrentMaster) return;

    if (roomState.audioTracks.length <= 1) {
      setError("Non puoi eliminare l'unica traccia audio. Creane prima un'altra.");
      return;
    }

    const confirmed = window.confirm(`Vuoi eliminare definitivamente la traccia "${track.title}"?`);
    if (!confirmed) return;

    try {
      setError("");
      const fallbackTrack = roomState.audioTracks.find((item) => item.id !== track.id);

      if (supabase && !demoMode) {
        if (roomState.room.current_audio_id === track.id && fallbackTrack) {
          await updateCurrentAudio(supabase, roomState.room.id, fallbackTrack.id);
        }

        await deleteAudioTrack(supabase, track);
      }

      if (fallbackTrack) {
        setRoomState((state) => ({
          ...state,
          audioTracks: state.audioTracks.filter((item) => item.id !== track.id),
          room: { ...state.room, current_audio_id: state.room.current_audio_id === track.id ? fallbackTrack.id : state.room.current_audio_id }
        }));
      }
      setStatus("Traccia audio eliminata");
    } catch (audioError) {
      setError(readError(audioError));
    }
  }

  async function createMasterSoundEffect(values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let audioUrl = values.audioUrl;
      if (supabase && !demoMode) {
        if (values.audioFile) {
          audioUrl = await uploadPublicFile(supabase, "audio-tracks", values.audioFile, `rooms/${roomState.room.id}/soundbar`);
        }
        const effect = await createSoundEffect(supabase, roomState.room.id, { ...values, audioUrl });
        if (audioUrl) {
          const asset = await createMediaAsset(supabase, roomState.room.id, roomState.profile, {
            title: effect.title,
            assetType: "sound",
            url: audioUrl,
            tags: ["soundbar", "rumore"]
          });
          setRoomState((state) => ({ ...state, mediaAssets: [asset, ...state.mediaAssets.filter((item) => item.id !== asset.id)] }));
        }
        setRoomState((state) => ({
          ...state,
          soundEffects: [...state.soundEffects.filter((item) => item.id !== effect.id), effect].sort((a, b) => a.title.localeCompare(b.title))
        }));
      } else {
        setRoomState((state) => ({
          ...state,
          soundEffects: [
            ...state.soundEffects,
            {
              id: crypto.randomUUID(),
              room_id: state.room.id,
              title: values.title,
              audio_url: audioUrl,
              loop: values.loop,
              created_at: new Date().toISOString()
            }
          ]
        }));
      }
      setStatus("Rumore aggiunto alla soundbar");
    } catch (soundError) {
      setError(readError(soundError));
    }
  }

  async function removeMasterSoundEffect(effect: SoundEffect) {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm(`Vuoi eliminare il rumore "${effect.title}"?`);
    if (!confirmed) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        if (roomState.room.current_sound_effect_id === effect.id) {
          await triggerRoomSoundEffect(supabase, roomState.room.id, null);
        }
        await deleteSoundEffect(supabase, effect);
      }
      setRoomState((state) => ({
        ...state,
        room: {
          ...state.room,
          current_sound_effect_id: state.room.current_sound_effect_id === effect.id ? null : state.room.current_sound_effect_id,
          sound_effect_started_at: new Date().toISOString()
        },
        soundEffects: state.soundEffects.filter((item) => item.id !== effect.id)
      }));
      setStatus("Rumore eliminato");
    } catch (soundError) {
      setError(readError(soundError));
    }
  }

  async function triggerSoundEffect(effect: SoundEffect) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await triggerRoomSoundEffect(supabase, roomState.room.id, effect.id);
      }
      setRoomState((state) => ({
        ...state,
        room: { ...state.room, current_sound_effect_id: effect.id, sound_effect_started_at: new Date().toISOString() }
      }));
      setStatus(`Rumore avviato: ${effect.title}`);
    } catch (soundError) {
      setError(readError(soundError));
    }
  }

  async function stopSoundEffect() {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await triggerRoomSoundEffect(supabase, roomState.room.id, null);
      }
      setRoomState((state) => ({
        ...state,
        room: { ...state.room, current_sound_effect_id: null, sound_effect_started_at: new Date().toISOString() }
      }));
      setStatus("Rumore fermato");
    } catch (soundError) {
      setError(readError(soundError));
    }
  }

  async function createMasterNpc(values: { name: string; color: string; description: string; portraitUrl: string; portraitFile?: File }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let portraitUrl = values.portraitUrl;
      if (supabase && !demoMode) {
        if (values.portraitFile) {
          portraitUrl = await uploadPublicFile(supabase, "portraits", values.portraitFile, `rooms/${roomState.room.id}/portraits`);
        }
        const npc = await createNpc(supabase, roomState.room.id, { ...values, portraitUrl });
        setRoomState((state) => ({ ...state, npcs: [...state.npcs, npc] }));
      } else {
        setRoomState((state) => ({
          ...state,
          npcs: [
            ...state.npcs,
            {
              id: crypto.randomUUID(),
              room_id: state.room.id,
              name: values.name,
              color: values.color,
              description: values.description,
              portrait_url: portraitUrl
            }
          ]
        }));
      }
      setStatus("NPC creato");
    } catch (npcError) {
      setError(readError(npcError));
    }
  }

  async function removeMasterNpc(npc: Npc) {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm(`Vuoi eliminare definitivamente l'NPC "${npc.name}"?`);
    if (!confirmed) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await deleteNpc(supabase, npc);
      }
      setRoomState((state) => ({
        ...state,
        npcs: state.npcs.filter((item) => item.id !== npc.id),
        messages: state.messages.map((message) => (message.npc_id === npc.id ? { ...message, npc_id: null } : message))
      }));
      if (identityId === npc.id) setIdentityId("master");
      setStatus("NPC eliminato");
    } catch (npcError) {
      setError(readError(npcError));
    }
  }

  async function addInventoryItem(characterId: string, values: { name: string; description: string; quantity: number; imageUrl: string; isPublic: boolean; masterNotes: string }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const item = await createInventoryItem(supabase, characterId, values);
        setRoomState((state) => ({ ...state, inventory: [...state.inventory, item] }));
        await broadcastInventorySync("upsert", item);
      } else {
        setRoomState((state) => ({
          ...state,
          inventory: [
            ...state.inventory,
            {
              id: crypto.randomUUID(),
              character_id: characterId,
              name: values.name,
              description: values.description,
              quantity: values.quantity,
              image_url: values.imageUrl || null,
              is_public: values.isPublic,
              master_notes: values.masterNotes,
              player_notes: null
            }
          ]
        }));
      }
      setStatus("Oggetto aggiunto all'inventario");
    } catch (inventoryError) {
      setError(readError(inventoryError));
    }
  }

  async function removeInventoryItem(item: InventoryItem) {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm(`Vuoi rimuovere "${item.name}" dall'inventario?`);
    if (!confirmed) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await deleteInventoryItem(supabase, item);
        await broadcastInventorySync("delete", item);
      }
      setRoomState((state) => ({ ...state, inventory: state.inventory.filter((inventoryItem) => inventoryItem.id !== item.id) }));
      setStatus("Oggetto rimosso dall'inventario");
    } catch (inventoryError) {
      setError(readError(inventoryError));
    }
  }

  async function saveChatPermissions(values: { chatEnabled: boolean; mutedUserIds: string[] }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await updateRoomChatPermissions(supabase, roomState.room.id, values);
        setRoomState((state) => ({ ...state, room: { ...state.room, chat_enabled: values.chatEnabled, muted_user_ids: values.mutedUserIds } }));
      } else {
        setRoomState((state) => ({ ...state, room: { ...state.room, chat_enabled: values.chatEnabled, muted_user_ids: values.mutedUserIds } }));
      }
      setStatus("Permessi chat aggiornati");
    } catch (chatError) {
      setError(readError(chatError));
    }
  }

  async function saveRoomTurnState(values: { turnEnabled: boolean; turnOrder: string[]; currentTurnIndex: number }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await updateRoomTurnState(supabase, roomState.room.id, values);
        setRoomState((state) => ({
          ...state,
          room: {
            ...state.room,
            turn_enabled: values.turnEnabled,
            turn_order: values.turnOrder,
            current_turn_index: values.currentTurnIndex
          }
        }));
      } else {
        setRoomState((state) => ({
          ...state,
          room: {
            ...state.room,
            turn_enabled: values.turnEnabled,
            turn_order: values.turnOrder,
            current_turn_index: values.currentTurnIndex
          }
        }));
      }
      setStatus("Stato turni aggiornato");
    } catch (turnError) {
      setError(readError(turnError));
    }
  }

  async function saveRoomAudioState(values: { audioStatus: string; audioVolume: number }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await updateRoomAudioState(supabase, roomState.room.id, values);
        setRoomState((state) => ({
          ...state,
          room: {
            ...state.room,
            audio_status: values.audioStatus,
            audio_volume: values.audioVolume
          }
        }));
      } else {
        setRoomState((state) => ({
          ...state,
          room: {
            ...state.room,
            audio_status: values.audioStatus,
            audio_volume: values.audioVolume
          }
        }));
      }
    } catch (audioError) {
      setError(readError(audioError));
    }
  }

  async function saveCharacterByMaster(

    characterId: string,
    values: { characterName: string; characterSurname: string; portraitUrl: string; portraitFile?: File; color: string; hp: number; mentalState: string; visibleStatus: string; publicBackground: string; conditions: string }
  ) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let portraitUrl = values.portraitUrl;
      if (supabase && !demoMode) {
        if (values.portraitFile) {
          portraitUrl = await uploadPublicFile(supabase, "portraits", values.portraitFile, `rooms/${roomState.room.id}/portraits`);
        }
        const updatedCharacter = await updateCharacterByMaster(supabase, characterId, {
          ...values,
          portraitUrl,
          conditions: values.conditions.split(",").map((condition) => condition.trim()).filter(Boolean)
        });
        setRoomState((state) => ({
          ...state,
          characters: state.characters.map((character) => (character.id === characterId ? updatedCharacter : character))
        }));
      } else {
        setRoomState((state) => ({
          ...state,
          characters: state.characters.map((character) =>
            character.id === characterId
              ? {
                  ...character,
                  character_name: values.characterName,
                  character_surname: values.characterSurname,
                  portrait_url: portraitUrl,
                  color: values.color,
                  hp: values.hp,
                  mental_state: values.mentalState,
                  visible_status: values.visibleStatus,
                  public_background: values.publicBackground,
                  conditions: values.conditions.split(",").map((condition) => condition.trim()).filter(Boolean)
                }
              : character
          )
        }));
      }
      setStatus("Dati giocatore aggiornati");
    } catch (characterError) {
      setError(readError(characterError));
    }
  }

  async function kickPlayerCharacter(characterId: string) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await deletePlayerCharacter(supabase, characterId);
      }
      setRoomState((state) => ({
        ...state,
        characters: state.characters.filter((c) => c.id !== characterId)
      }));
      setStatus("Giocatore rimosso dalla sessione");
    } catch (err) {
      setError(readError(err));
    }
  }

  async function requestDice(values: { diceCount?: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const request = await createDiceRequest(supabase, roomState.room.id, roomState.profile, values);
        setRoomState((state) => ({ ...state, diceRequests: [request, ...state.diceRequests.filter((item) => item.id !== request.id)] }));
      } else {
        setRoomState((state) => ({
          ...state,
          diceRequests: [
            {
              id: crypto.randomUUID(),
              room_id: state.room.id,
              requested_by: state.profile.id,
              target_user_id: values.targetUserId,
              dice_count: values.diceCount ?? 1,
              dice_sides: values.diceSides,
              reason: encodeDiceReason(values.reason, values.diceCount ?? 1),
              visibility: values.visibility,
              status: "pending",
              created_at: new Date().toISOString()
            },
            ...state.diceRequests
          ]
        }));
      }
      setStatus(`Richiesta tiro ${values.diceCount ?? 1}d${values.diceSides} inviata`);
    } catch (diceError) {
      setError(readError(diceError));
    }
  }

  async function rollDice(request: DiceRequest) {
    const diceCount = getDiceCount(request);
    const roll = rollDiceValues(diceCount, request.dice_sides);
    const characterName = currentCharacter ? `${currentCharacter.character_name} ${currentCharacter.character_surname}` : roomState.profile.username;
    const reason = stripDiceCountMarker(request.reason);

    setActiveDiceTray({
      request,
      diceCount,
      diceSides: request.dice_sides,
      results: roll.results,
      reason,
      rollerName: characterName
    });
  }

  async function completeDiceRoll() {
    if (!activeDiceTray) return;
    const { request, diceCount, diceSides, results, reason, rollerName } = activeDiceTray;
    const result = results.reduce((a, b) => a + b, 0);
    const rollDetail = diceCount > 1 ? `[${results.join(", ")}] totale ${result}` : `${result}`;
    const text = `${rollerName} tira ${diceCount}d${diceSides}: ${rollDetail}${reason ? ` (${reason})` : ""}`;

    try {
      setError("");
      if (supabase && !demoMode) {
        await rollDiceRequest(supabase, request, result);
      }

      await publishMessage(text, request.visibility === "private", request.visibility === "private" ? roomState.campaigns[0].master_id : undefined, "player");
      setRoomState((state) => ({
        ...state,
        diceRequests: state.diceRequests.map((item) =>
          item.id === request.id ? { ...item, status: "rolled", result, rolled_at: new Date().toISOString() } : item
        )
      }));

      if (demoMode) {
        if (diceSides === 20 && diceCount === 1 && (result === 20 || result === 1)) {
          setActiveDiceOverlay({
            type: result === 20 ? "critical" : "fumble",
            rollerName,
            reason
          });
        }
      }
    } catch (diceError) {
      setError(readError(diceError));
    } finally {
      setActiveDiceTray(null);
    }
  }

  function drawNarrativeCard(values: { deck: CardDeckType; targetUserId?: string | null; visibility: "public" | "private"; reason: string }) {
    if (!isCurrentMaster) return;
    const card = drawCard(values.deck);
    const reason = values.reason.trim();
    const text = `[evento] Estrazione da ${cardDeckLabel(values.deck)}: ${card}${reason ? ` (${reason})` : ""}`;
    publishMessage(text, values.visibility === "private", values.targetUserId || undefined);
    setStatus("Carta estratta");
  }

  async function saveSpotlight(values: { npcId: string | null; visibility: "off" | "public" | "private"; userIds: string[] }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await updateRoomSpotlight(supabase, roomState.room.id, values);
        setRoomState((state) => ({
          ...state,
          room: { ...state.room, spotlight_npc_id: values.npcId, spotlight_visibility: values.visibility, spotlight_user_ids: values.userIds }
        }));
      } else {
        setRoomState((state) => ({
          ...state,
          room: { ...state.room, spotlight_npc_id: values.npcId, spotlight_visibility: values.visibility, spotlight_user_ids: values.userIds }
        }));
      }
      setStatus("Focus personaggio aggiornato");
    } catch (spotlightError) {
      setError(readError(spotlightError));
    }
  }

  async function createMap(values: { title: string; description: string; imageUrl: string; imageFile?: File; parentMapId?: string | null; levelType: NarrativeMap["level_type"]; isVisibleToPlayers: boolean }) {
    if (!isCurrentMaster) return;

    const localPreviewUrl = values.imageFile ? URL.createObjectURL(values.imageFile) : values.imageUrl;
    let mapImageUrl = localPreviewUrl;

    try {
      setError("");
      if (supabase && !demoMode) {
        if (values.imageFile) {
          mapImageUrl = await uploadPublicFile(supabase, "scene-images", values.imageFile, `rooms/${roomState.room.id}/maps`);
        }
      }

      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        const map = await createNarrativeMap(supabase, roomState.room, roomState.profile, { ...values, imageUrl: mapImageUrl });
        const nextState = { ...roomState, maps: [map, ...roomState.maps.filter((item) => item.id !== map.id)] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      } else {
        const map = createLocalNarrativeMap(roomState.room, roomState.profile.id, values, mapImageUrl);
        const nextState = { ...roomState, maps: [map, ...roomState.maps] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      }
      setStatus("Mappa creata");
      logAction("Mappa creata", values.title);
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        const map = createLocalNarrativeMap(roomState.room, roomState.profile.id, values, mapImageUrl);
        const nextState = { ...roomState, maps: [map, ...roomState.maps.filter((item) => item.id !== map.id)] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
        setStatus("Mappa sincronizzata tramite chat tecnica");
        setError("");
        logAction("Mappa sincronizzata", values.title);
        return;
      }
      setError(readError(mapError));
    }
  }

  async function setActiveMap(map: NarrativeMap) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        const updated = await setActiveNarrativeMap(supabase, roomState.room.id, map.id);
        const nextState = {
          ...roomState,
          maps: roomState.maps.map((item) => ({ ...item, is_active: item.id === updated.id, is_visible_to_players: item.id === updated.id ? true : item.is_visible_to_players }))
        };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      } else {
        const nextState = {
          ...roomState,
          maps: roomState.maps.map((item) => ({ ...item, is_active: item.id === map.id, is_visible_to_players: item.id === map.id ? true : item.is_visible_to_players }))
        };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      }
      setStatus("Mappa attiva aggiornata");
      logAction("Mappa mostrata ai giocatori", map.title);
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        const nextState = {
          ...roomState,
          maps: roomState.maps.map((item) => ({ ...item, is_active: item.id === map.id, is_visible_to_players: item.id === map.id ? true : item.is_visible_to_players }))
        };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
        setStatus("Mappa mostrata ai giocatori tramite chat tecnica");
        setError("");
        return;
      }
      setError(readError(mapError));
    }
  }

  async function duplicateMap(map: NarrativeMap) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        const copy = await duplicateNarrativeMap(supabase, map, roomState.profile);
        const nextState = { ...roomState, maps: [copy, ...roomState.maps.filter((item) => item.id !== copy.id)] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      } else {
        const copy: NarrativeMap = {
          ...map,
          id: crypto.randomUUID(),
          title: `${map.title} copia`,
          is_active: false,
          is_visible_to_players: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const nextState = { ...roomState, maps: [copy, ...roomState.maps] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      }
      setStatus("Mappa duplicata");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        const copy: NarrativeMap = {
          ...map,
          id: crypto.randomUUID(),
          title: `${map.title} copia`,
          is_active: false,
          is_visible_to_players: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const nextState = { ...roomState, maps: [copy, ...roomState.maps] };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
        setStatus("Mappa duplicata tramite chat tecnica");
        return;
      }
      setError(readError(mapError));
    }
  }

  async function deleteMap(map: NarrativeMap) {
    if (!isCurrentMaster) return;
    if (roomState.maps.length <= 1) {
      setError("Non puoi eliminare l'unica mappa della stanza.");
      return;
    }
    if (!window.confirm(`Vuoi eliminare la mappa "${map.title}" e i marker collegati?`)) return;

    try {
      setError("");
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        await deleteNarrativeMap(supabase, map);
      }
      const nextMaps = roomState.maps.filter((item) => item.id !== map.id);
      const fallbackActiveMap = nextMaps.find((item) => item.is_active) ?? nextMaps[0];
      const nextState = {
        ...roomState,
        maps: nextMaps.map((item) => ({ ...item, is_active: fallbackActiveMap ? item.id === fallbackActiveMap.id : false })),
        mapHotspots: roomState.mapHotspots.filter((item) => item.map_id !== map.id),
        mapCharacterPositions: roomState.mapCharacterPositions.filter((item) => item.map_id !== map.id),
        mapNpcMarkers: roomState.mapNpcMarkers.filter((item) => item.map_id !== map.id),
        mapCustomMarkers: roomState.mapCustomMarkers.filter((item) => item.map_id !== map.id)
      };
      setRoomState(nextState);
      await broadcastMapSync(nextState);
      setStatus("Mappa eliminata");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        const nextMaps = roomState.maps.filter((item) => item.id !== map.id);
        const fallbackActiveMap = nextMaps.find((item) => item.is_active) ?? nextMaps[0];
        const nextState = {
          ...roomState,
          maps: nextMaps.map((item) => ({ ...item, is_active: fallbackActiveMap ? item.id === fallbackActiveMap.id : false })),
          mapHotspots: roomState.mapHotspots.filter((item) => item.map_id !== map.id),
          mapCharacterPositions: roomState.mapCharacterPositions.filter((item) => item.map_id !== map.id),
          mapNpcMarkers: roomState.mapNpcMarkers.filter((item) => item.map_id !== map.id),
          mapCustomMarkers: roomState.mapCustomMarkers.filter((item) => item.map_id !== map.id)
        };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
        setStatus("Mappa eliminata tramite chat tecnica");
        return;
      }
      setError(readError(mapError));
    }
  }

  async function updateMapCharacterPosition(position: MapCharacterPosition, values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }) {
    if (!isCurrentMaster) return;

    const optimistic: MapCharacterPosition = {
      ...position,
      x: values.x,
      y: values.y,
      narrative_location: values.narrativeLocation,
      is_visible_to_players: values.isVisibleToPlayers,
      is_locked: values.isLocked,
      updated_at: new Date().toISOString()
    };

    const optimisticState = { ...roomState, mapCharacterPositions: upsertLocalMapPosition(roomState.mapCharacterPositions, optimistic) };
    setRoomState(optimisticState);

    try {
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        const updated = await upsertMapCharacterPosition(supabase, position, values);
        const nextState = {
          ...optimisticState,
          mapCharacterPositions: [updated, ...optimisticState.mapCharacterPositions.filter((item) => item.id !== position.id && item.id !== updated.id)]
        };
        setRoomState(nextState);
        await broadcastMapSync(nextState);
      } else {
        await broadcastMapSync(optimisticState);
      }
      setStatus("Posizione personaggio aggiornata");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        await broadcastMapSync(optimisticState);
        setStatus("Indicatore sincronizzato tramite chat tecnica");
        setError("");
        return;
      }
      setError(readError(mapError));
      setRoomState((state) => ({ ...state, mapCharacterPositions: upsertLocalMapPosition(state.mapCharacterPositions, position) }));
    }
  }

  async function createFogArea(values: { mapId: string; shapeType: "rect" | "circle" | "polygon"; shapeData: Record<string, any>; isRevealed: boolean }) {
    if (!isCurrentMaster) return;

    const tempId = `temp-fog-${crypto.randomUUID()}`;
    const tempArea: MapFogArea = {
      id: tempId,
      map_id: values.mapId,
      shape_type: values.shapeType,
      shape_data: values.shapeData,
      is_revealed: values.isRevealed,
      created_at: new Date().toISOString()
    };

    const nextState = { ...roomState, mapFogAreas: [...roomState.mapFogAreas, tempArea] };
    setRoomState(nextState);

    try {
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current) {
        const created = await createMapFogArea(supabase, values.mapId, values);
        const updatedState = {
          ...roomState,
          mapFogAreas: [...roomState.mapFogAreas.filter((item) => item.id !== tempId), created]
        };
        setRoomState(updatedState);
        await broadcastMapSync(updatedState);
      } else {
        await broadcastMapSync(nextState);
      }
      setStatus("Area nebbia creata");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        await broadcastMapSync(nextState);
        setStatus("Area nebbia sincronizzata tramite chat tecnica");
        setError("");
        return;
      }
      setError(readError(mapError));
      setRoomState((state) => ({ ...state, mapFogAreas: state.mapFogAreas.filter((item) => item.id !== tempId) }));
    }
  }

  async function updateFogArea(id: string, values: { shapeData: Record<string, any>; isRevealed: boolean }) {
    if (!isCurrentMaster) return;

    const originalArea = roomState.mapFogAreas.find((item) => item.id === id);
    if (!originalArea) return;

    const updatedArea: MapFogArea = {
      ...originalArea,
      shape_data: values.shapeData,
      is_revealed: values.isRevealed,
      updated_at: new Date().toISOString()
    };

    const nextState = {
      ...roomState,
      mapFogAreas: roomState.mapFogAreas.map((item) => (item.id === id ? updatedArea : item))
    };
    setRoomState(nextState);

    try {
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current && !id.startsWith("temp-fog-")) {
        const updated = await updateMapFogArea(supabase, id, values);
        const updatedState = {
          ...roomState,
          mapFogAreas: roomState.mapFogAreas.map((item) => (item.id === id ? updated : item))
        };
        setRoomState(updatedState);
        await broadcastMapSync(updatedState);
      } else {
        await broadcastMapSync(nextState);
      }
      setStatus("Area nebbia aggiornata");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        await broadcastMapSync(nextState);
        setStatus("Area nebbia sincronizzata tramite chat tecnica");
        setError("");
        return;
      }
      setError(readError(mapError));
      setRoomState((state) => ({
        ...state,
        mapFogAreas: state.mapFogAreas.map((item) => (item.id === id ? originalArea : item))
      }));
    }
  }

  async function deleteFogArea(id: string) {
    if (!isCurrentMaster) return;

    const originalArea = roomState.mapFogAreas.find((item) => item.id === id);
    if (!originalArea) return;

    const nextState = {
      ...roomState,
      mapFogAreas: roomState.mapFogAreas.filter((item) => item.id !== id)
    };
    setRoomState(nextState);

    try {
      if (supabase && !demoMode && !mapSchemaUnavailableRef.current && !id.startsWith("temp-fog-")) {
        await deleteMapFogArea(supabase, id);
      }
      await broadcastMapSync(nextState);
      setStatus("Area nebbia rimossa");
    } catch (mapError) {
      if (isMapSchemaError(mapError)) {
        mapSchemaUnavailableRef.current = true;
        await broadcastMapSync(nextState);
        setStatus("Area nebbia rimossa tramite chat tecnica");
        setError("");
        return;
      }
      setError(readError(mapError));
      setRoomState((state) => ({ ...state, mapFogAreas: [...state.mapFogAreas, originalArea] }));
    }
  }


  async function saveRoom() {
    setError("");
    setStatus("Stanza salvata sul database");
  }

  async function loadOlderMessages() {
    const loadedMessages = [...roomState.messages, ...roomState.offMessages, ...roomState.privateMessages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const oldestMessage = loadedMessages[0];
    if (!oldestMessage || !roomState.hasOlderMessages) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const older = await loadOlderRoomMessages(supabase, roomState.room.id, oldestMessage.created_at);
        setRoomState((state) => ({
          ...state,
          messages: mergeMessagePages(older.messages, state.messages),
          offMessages: mergeMessagePages(older.offMessages, state.offMessages),
          privateMessages: mergeMessagePages(older.privateMessages, state.privateMessages),
          hasOlderMessages: older.hasOlderMessages
        }));
      } else {
        setRoomState((state) => ({ ...state, hasOlderMessages: false }));
      }
      setStatus("Cronologia precedente caricata");
    } catch (messageError) {
      setError(readError(messageError));
    }
  }

  async function loadFullChatForExport() {
    if (supabase && !demoMode) {
      return exportRoomMessages(supabase, roomState.room.id);
    }

    return [...roomState.messages, ...roomState.offMessages, ...roomState.privateMessages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async function removeMessage(message: Message) {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm("Vuoi eliminare questo messaggio?");
    if (!confirmed) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        await deleteMessage(supabase, message.id);
      }
      setRoomState((state) => ({
        ...state,
        messages: state.messages.filter((item) => item.id !== message.id),
        offMessages: state.offMessages.filter((item) => item.id !== message.id),
        privateMessages: state.privateMessages.filter((item) => item.id !== message.id)
      }));
      setStatus("Messaggio eliminato");
    } catch (messageError) {
      setError(readError(messageError));
    }
  }

  async function editOwnMessage(message: Message, content: string) {
    if (!isCurrentMaster || !content.trim()) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const updated = await updateMessageContent(supabase, message.id, content.trim());
        setRoomState((state) => updateMessageInState(state, updated));
      } else {
        const updated = { ...message, content: content.trim(), edited_at: new Date().toISOString() };
        setRoomState((state) => updateMessageInState(state, updated));
      }
      setStatus("Messaggio modificato");
    } catch (messageError) {
      setError(readError(messageError));
    }
  }

  async function toggleMessagePin(message: Message) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const updated = await updateMessagePinned(supabase, message.id, !message.is_pinned);
        setRoomState((state) => updateMessageInState(state, updated));
      } else {
        setRoomState((state) => updateMessageInState(state, { ...message, is_pinned: !message.is_pinned }));
      }
      setStatus(message.is_pinned ? "Messaggio rimosso dai pin" : "Messaggio fissato");
    } catch (messageError) {
      setError(readError(messageError));
    }
  }

  async function addMediaAsset(values: { title: string; assetType: MediaAsset["asset_type"]; url: string; tags: string[]; file?: File }) {
    if (!isCurrentMaster) return;

    try {
      setError("");
      let url = values.url;
      if (supabase && !demoMode) {
        if (values.file) {
          const bucket = values.assetType === "audio" || values.assetType === "sound" ? "audio-tracks" : values.assetType === "portrait" ? "portraits" : "scene-images";
          url = await uploadPublicFile(supabase, bucket, values.file, `rooms/${roomState.room.id}/media`);
        }
        const asset = await createMediaAsset(supabase, roomState.room.id, roomState.profile, { ...values, url });
        setRoomState((state) => ({ ...state, mediaAssets: [asset, ...state.mediaAssets.filter((item) => item.id !== asset.id)] }));
      } else {
        setRoomState((state) => ({
          ...state,
          mediaAssets: [
            {
              id: crypto.randomUUID(),
              room_id: state.room.id,
              title: values.title,
              asset_type: values.assetType,
              url,
              tags: values.tags,
              created_by: state.profile.id,
              created_at: new Date().toISOString()
            },
            ...state.mediaAssets
          ]
        }));
      }
      setStatus("Asset salvato in libreria");
      logAction("Asset media salvato", values.title);
    } catch (mediaError) {
      setError(readError(mediaError));
    }
  }

  async function removeMediaAsset(asset: MediaAsset) {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm(`Vuoi eliminare "${asset.title}" dalla libreria media?`);
    if (!confirmed) return;

    try {
      setError("");
      const [syntheticSource, syntheticId] = asset.id.split(":");
      if (syntheticSource === "scene") {
        const scene = roomState.scenes.find((item) => item.id === syntheticId);
        if (scene) {
          await removeMasterScene(scene);
          return;
        }
      }
      if (syntheticSource === "audio") {
        const track = roomState.audioTracks.find((item) => item.id === syntheticId);
        if (track) {
          await removeMasterAudio(track);
          return;
        }
      }
      if (syntheticSource === "sound") {
        const effect = roomState.soundEffects.find((item) => item.id === syntheticId);
        if (effect) {
          await removeMasterSoundEffect(effect);
          return;
        }
      }
      if (syntheticSource === "map") {
        const map = roomState.maps.find((item) => item.id === syntheticId);
        if (map) {
          await deleteMap(map);
          return;
        }
      }
      if (syntheticSource === "map-fallback") {
        setError("Questa e una mappa provvisoria generata dalla scena: elimina o modifica la scena collegata.");
        return;
      }

      if (supabase && !demoMode) {
        await deleteMediaAsset(supabase, asset);
      }
      setRoomState((state) => ({ ...state, mediaAssets: state.mediaAssets.filter((item) => item.id !== asset.id) }));
      setStatus("Asset eliminato");
    } catch (mediaError) {
      setError(readError(mediaError));
    }
  }

  async function updateMediaVisibility(asset: MediaAsset, visibility: MediaAsset["visibility"]) {
    if (!isCurrentMaster) return;
    try {
      setError("");
      if (supabase && !demoMode) {
        await updateMediaAssetVisibility(supabase, roomState.profile, asset.id, visibility);
      }
      setRoomState((state) => ({
        ...state,
        mediaAssets: state.mediaAssets.map((item) =>
          item.id === asset.id ? { ...item, visibility } : item
        ),
      }));
      setStatus("Visibilità asset aggiornata");
      logAction("Visibilità asset modificata", `${asset.title} -> ${visibility}`);
    } catch (mediaError) {
      setError(readError(mediaError));
    }
  }

  async function addPersonalNote(values: { title: string; content: string }) {
    if (!currentCharacter) return;

    try {
      setError("");
      if (supabase && !demoMode) {
        const note = await createPlayerNote(supabase, currentCharacter.id, values);
        setRoomState((state) => ({ ...state, notes: [note, ...state.notes.filter((item) => item.id !== note.id)] }));
      } else {
        setRoomState((state) => ({
          ...state,
          notes: [
            {
              id: crypto.randomUUID(),
              character_id: currentCharacter.id,
              title: values.title,
              content: values.content,
              updated_at: new Date().toISOString()
            },
            ...state.notes
          ]
        }));
      }
      setStatus("Nota salvata");
    } catch (noteError) {
      setError(readError(noteError));
    }
  }

  async function closeAndDeleteRoom() {
    if (!isCurrentMaster) return;
    const confirmed = window.confirm("Vuoi eliminare definitivamente questa stanza? L'operazione non e reversibile.");
    if (!confirmed) return;

    try {
      if (supabase && !demoMode) {
        await deleteRoom(supabase, roomState.room.id);
      }
      setRoomState({ ...demoRoomState, profile: roomState.profile });
      setStatus("Stanza eliminata");
      setView("menu");
    } catch (deleteError) {
      setError(readError(deleteError));
    }
  }

  async function signOut() {
    if (supabase && !demoMode) {
      await supabase.auth.signOut();
    }
    setRoomState(demoRoomState);
    setView("menu");
    setStatus("Logout eseguito");
  }

  if (isLoading) {
    return <AppLoading status={status} />;
  }

  return (
    <div className={view === "master" ? "flex min-h-screen flex-col" : "mx-auto flex max-w-[1800px] flex-col gap-4"}>
      <div className="vignette-overlay-cinematic" />
      {(view !== "menu" && view !== "master") || error ? <StatusBar status={status} error={error} onSignOut={signOut} /> : null}
      {view === "menu" ? (
        <StartMenu
          onCreate={() => setView("create")}
          onJoin={() => setView("join")}
          onSignOut={signOut}
          isSuperAdmin={isSuperAdmin}
          onSuperAdmin={openSuperAdminPanel}
          onSessions={openSessionsPanel}
          currentSession={
            hasCurrentSession
              ? {
                  campaignTitle: roomState.campaigns[0]?.title ?? "Campagna",
                  roomName: roomState.room.name,
                  inviteCode: roomState.room.invite_code,
                  sceneTitle: roomState.scene.title,
                  role: isCurrentMaster ? "master" : "player",
                  playerCount: roomState.characters.length
                }
              : undefined
          }
          onResumeMaster={isCurrentMaster && hasCurrentSession ? () => setView("master") : undefined}
          onResumePlayer={hasCurrentSession ? () => setView("player") : undefined}
        />
      ) : null}

      {view === "sessions" ? (
        <SessionSwitcher
          sessions={userSessions}
          isLoading={isLoadingSessions}
          onBack={() => setView("menu")}
          onRefresh={refreshUserSessions}
          onOpenSession={openUserSession}
        />
      ) : null}

      {view === "superadmin" && isSuperAdmin ? (
        <SuperAdminRooms
          rooms={adminRooms}
          media={adminMedia}
          onBack={() => setView("menu")}
          onRefresh={refreshAdminRooms}
          onUpdate={updateAdminRoom}
          onDelete={deleteAdminRoom}
          onDeleteMedia={deleteAdminMedia}
        />
      ) : null}

      {view === "create" ? <CreateGameForm state={roomState} onBack={() => setView("menu")} onCreate={createGame} /> : null}

      {view === "join" ? (
        <JoinRoomForm
          suggestedInviteCode={hasCurrentSession ? roomState.room.invite_code : undefined}
          onBack={() => setView("menu")}
          onJoin={joinRoom}
        />
      ) : null}

      {view === "character" ? (
        <CharacterSetupForm defaultName={roomState.profile.username} onBack={() => setView("join")} onCreate={createCharacter} />
      ) : null}

      {view === "player" ? (
        <PlayerRoom
          state={roomState}
          currentAudio={currentAudio}
          onBack={() => setView("menu")}
          onSend={(content) => publishMessage(content, false, undefined, "player")}
          onPrivateSend={(content, recipientUserId) => publishMessage(content, true, recipientUserId, "player")}
          onOffSend={(content) => publishMessage(content, false, undefined, "player", "off")}
          onTyping={markTyping}
          onRollDice={rollDice}
          onCreateNote={addPersonalNote}
          onLoadOlderMessages={loadOlderMessages}
          onExportMessages={loadFullChatForExport}
        />
      ) : null}

      {view === "master" && isCurrentMaster ? (
        <MasterControlRoom
          state={roomState}
          identityId={identityId}
          currentAudio={currentAudio}
          onBack={() => setView("menu")}
          onOpenPlayerView={() => setView("player")}
          onIdentityChange={setIdentityId}
          onPublicMessage={(content) => publishMessage(content)}
          onOffMessage={(content) => publishMessage(content, false, undefined, "master", "off")}
          onPrivateMessage={(content, userId) => publishMessage(content, true, userId)}
          onTyping={markTyping}
          onDeleteMessage={removeMessage}
          onEditMessage={editOwnMessage}
          onToggleMessagePin={toggleMessagePin}
          onSceneChange={changeScene}
          onAudioChange={changeAudio}
          onCreateScene={createMasterScene}
          onUpdateScene={updateMasterScene}
          onDeleteScene={removeMasterScene}
          onCreateAudio={createMasterAudio}
          onDeleteAudio={removeMasterAudio}
          onCreateSoundEffect={createMasterSoundEffect}
          onDeleteSoundEffect={removeMasterSoundEffect}
          onTriggerSoundEffect={triggerSoundEffect}
          onStopSoundEffect={stopSoundEffect}
          onCreateNpc={createMasterNpc}
          onDeleteNpc={removeMasterNpc}
          onCreateInventoryItem={addInventoryItem}
          onDeleteInventoryItem={removeInventoryItem}
          onUpdateChatPermissions={saveChatPermissions}
          onSaveRoomTurnState={saveRoomTurnState}
          onSaveRoomAudioState={saveRoomAudioState}
          onCreateDiceRequest={requestDice}
          onDrawCard={drawNarrativeCard}
          onUpdateSpotlight={saveSpotlight}
          onUpdateCharacter={saveCharacterByMaster}
          onDeleteCharacter={kickPlayerCharacter}
          onCreateMediaAsset={addMediaAsset}
          onUpdateMediaAssetVisibility={updateMediaVisibility}
          onDeleteMediaAsset={removeMediaAsset}
          onCreateMap={createMap}
          onSetActiveMap={setActiveMap}
          onDeleteMap={deleteMap}
          onDuplicateMap={duplicateMap}
          onUpdateMapCharacterPosition={updateMapCharacterPosition}
          onCreateMapFogArea={createFogArea}
          onUpdateMapFogArea={updateFogArea}
          onDeleteMapFogArea={deleteFogArea}
          onLoadOlderMessages={loadOlderMessages}
          onExportMessages={loadFullChatForExport}
          onQuickCue={broadcastDirectorCue}
          actionLog={actionLog}
          onSaveRoom={saveRoom}
          onDeleteRoom={closeAndDeleteRoom}
        />
      ) : null}
      {cinematicEvent ? <CinematicEventOverlay event={cinematicEvent} onClose={() => setCinematicEvent(null)} /> : null}
      {activeCue ? (
        <ActiveCueOverlay
          cue={activeCue}
          onClose={() => {
            if (cueTimeoutRef.current !== null) {
              window.clearTimeout(cueTimeoutRef.current);
              cueTimeoutRef.current = null;
            }
            setActiveCue(null);
          }}
        />
      ) : null}
      {activeDiceOverlay ? (
        <DiceRollAnimationOverlay
          type={activeDiceOverlay.type}
          rollerName={activeDiceOverlay.rollerName}
          reason={activeDiceOverlay.reason}
          onClose={() => setActiveDiceOverlay(null)}
        />
      ) : null}
      {activeDiceTray ? (
        <DiceTray
          diceCount={activeDiceTray.diceCount}
          diceSides={activeDiceTray.diceSides}
          results={activeDiceTray.results}
          reason={activeDiceTray.reason}
          rollerName={activeDiceTray.rollerName}
          onComplete={completeDiceRoll}
          onClose={() => setActiveDiceTray(null)}
        />
      ) : null}
    </div>
  );
}

function CinematicEventOverlay({ event, onClose }: { event: CinematicEvent; onClose: () => void }) {
  return (
    <div className={`cinematic-event-overlay cinematic-event-overlay--${event.kind}`} role="status" aria-live="polite">
      <section className="cinematic-event-card">
        <button type="button" onClick={onClose} aria-label="Chiudi evento cinematografico">
          <X size={16} />
        </button>
        {(event.kind === "scene" || event.kind === "npc") && event.imageUrl ? (
          <div className="cinematic-event-media" style={{ backgroundImage: event.kind === "scene" && event.mediaType === "video" ? undefined : `url(${event.imageUrl})` }}>
            {event.kind === "scene" && event.mediaType === "video" ? <MessageSquareText size={34} /> : null}
          </div>
        ) : (
          <div className="cinematic-event-symbol">
            <MessageSquareText size={28} />
          </div>
        )}
        <p className="cinematic-event-kicker">
          {event.kind === "scene" ? "Cambio scena" : event.kind === "npc" ? "Entra in scena" : event.kind === "sound" ? "Segnale sonoro" : "Messaggio segreto"}
        </p>
        <h2>{event.title}</h2>
        <p>{event.detail}</p>
      </section>
    </div>
  );
}

function AppLoading({ status }: { status: string }) {
  return (
    <main className="app-loading-shell">
      <div className="app-loading-card">
        <div className="app-loading-orb" aria-hidden="true">
          <Loader2 size={28} />
        </div>
        <p className="app-loading-kicker">GDR Master Room</p>
        <h1>Preparazione della stanza</h1>
        <p>{status}</p>
        <div className="app-loading-line" aria-hidden="true" />
      </div>
    </main>
  );
}

function StatusBar({ status, error, onSignOut }: { status: string; error: string; onSignOut: () => void }) {
  return (
    <div className={`app-status-bar ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
      <div className="app-status-content">
        <span className="app-status-icon" aria-hidden="true">
          {error ? <AlertTriangle size={16} /> : status.toLowerCase().includes("caric") ? <Sparkles size={16} /> : <CheckCircle2 size={16} />}
        </span>
        <span>{error || status}</span>
      </div>
      <button type="button" onClick={onSignOut} className="app-status-logout">
        <LogOut size={14} aria-hidden="true" />
        Logout
      </button>
    </div>
  );
}

function addMessageToState(state: RoomState, message: Message) {
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

function updateMessageInState(state: RoomState, message: Message) {
  const update = (items: Message[]) => items.map((item) => (item.id === message.id ? message : item));

  return {
    ...state,
    messages: update(state.messages),
    offMessages: update(state.offMessages),
    privateMessages: update(state.privateMessages)
  };
}

function mergeMessagePages(olderMessages: Message[], currentMessages: Message[]) {
  const seen = new Set<string>();
  return [...olderMessages, ...currentMessages]
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

type CollectionKey =
  | "diceRequests"
  | "mediaAssets"
  | "scenes"
  | "audioTracks"
  | "soundEffects"
  | "characters"
  | "inventory";

function updateCollectionEvent(
  state: RoomState,
  key: CollectionKey,
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
  sortKey: string,
  ascending: boolean
) {
  const items = state[key] as unknown as Array<{ id: string } & Record<string, unknown>>;

  if (payload.eventType === "DELETE") {
    return { ...state, [key]: items.filter((item) => item.id !== payload.old.id) };
  }

  const incoming = payload.new as { id: string } & Record<string, unknown>;
  const merged = items.some((item) => item.id === incoming.id) ? items.map((item) => (item.id === incoming.id ? incoming : item)) : [...items, incoming];
  const sorted = merged.sort((a, b) => {
    const left = String((a as Record<string, unknown>)[sortKey] ?? "");
    const right = String((b as Record<string, unknown>)[sortKey] ?? "");
    return ascending ? left.localeCompare(right) : right.localeCompare(left);
  });

  return { ...state, [key]: sorted };
}

function updateInventoryEvent(
  state: RoomState,
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
) {
  if (payload.eventType === "DELETE") {
    return applyInventorySync(state, "delete", payload.old as InventoryItem);
  }

  return applyInventorySync(state, "upsert", payload.new as InventoryItem);
}

function applyInventorySync(state: RoomState, action: "upsert" | "delete", incoming: InventoryItem) {
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

function buildMapSyncPayload(state: RoomState): MapSyncPayload {
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

  const syncedFogAreas = state.mapFogAreas.filter((area) => visibleMapIds.has(area.map_id));

  return {
    kind: "map-sync",
    roomId: state.room.id,
    revision: new Date().toISOString(),
    maps: visibleMaps,
    mapCharacterPositions: [...syncedPositions, ...fallbackPositions],
    mapFogAreas: syncedFogAreas
  };
}

function parseMapSyncMessage(message: Message): MapSyncPayload | null {
  if (!message.content.startsWith(MAP_SYNC_PREFIX)) return null;

  try {
    const payload = JSON.parse(message.content.slice(MAP_SYNC_PREFIX.length)) as Partial<MapSyncPayload>;
    if (payload.kind !== "map-sync" || !payload.roomId || !payload.revision) return null;
    return {
      kind: "map-sync",
      roomId: payload.roomId,
      revision: payload.revision,
      maps: Array.isArray(payload.maps) ? (payload.maps as NarrativeMap[]) : [],
      mapCharacterPositions: Array.isArray(payload.mapCharacterPositions) ? (payload.mapCharacterPositions as MapCharacterPosition[]) : [],
      mapFogAreas: Array.isArray(payload.mapFogAreas) ? (payload.mapFogAreas as MapFogArea[]) : []
    };
  } catch {
    return null;
  }
}

function applyMapSyncState(state: RoomState, payload: MapSyncPayload): RoomState {
  if (payload.roomId !== state.room.id) return state;

  const syncedMapIds = new Set(payload.maps.map((map) => map.id));
  const activeSyncedMap = payload.maps.find((map) => map.is_active);
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
    ],
    room: activeSyncedMap ? { ...state.room } : state.room
  };
}


function generateInviteCode(title: string) {
  const prefix = title
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "G");
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

function readError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";

  if (isMapSchemaError(error)) {
    return "Schema mappe Supabase non applicato. Esegui supabase/schema.sql o le migration mappe nel SQL Editor di Supabase.";
  }

  if (message.includes("public.users") || message.includes("schema cache") || message.includes("PGRST205")) {
    return "Login riuscito, ma manca lo schema database. Esegui supabase/schema.sql nel SQL Editor di Supabase.";
  }

  if (message) return message;
  return "Operazione non riuscita. Controlla schema Supabase e permessi RLS.";
}

function isMapSchemaError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  const normalized = message.toLowerCase();
  return (
    normalized.includes("maps") ||
    normalized.includes("map_") ||
    normalized.includes("map character") ||
    normalized.includes("schema cache") && normalized.includes("map")
  );
}

function createLocalNarrativeMap(
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

function upsertLocalMapPosition(positions: MapCharacterPosition[], position: MapCharacterPosition) {
  return positions.some((item) => item.id === position.id)
    ? positions.map((item) => (item.id === position.id ? position : item))
    : [position, ...positions];
}

function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

function ActiveCueOverlay({
  cue,
  onClose
}: {
  cue: { cueId: string; tone: string; message: string };
  onClose: () => void;
}) {
  const isChapter = cue.tone === "chapter";

  if (isChapter) {
    return (
      <div
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/95 px-6 text-center select-none"
        style={{ pointerEvents: "auto" }}
      >
        <div className="max-w-2xl space-y-8 animate-[premium-rise_0.6s_ease_both]">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500/80 animate-[cinematic-glow_3s_infinite_ease-in-out]">
            Capitolo Concluso
          </p>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto animate-[cinematic-line_1.2s_ease_both]" />
          <h2 className="font-serif text-4xl md:text-5xl text-stone-100 leading-snug">
            {cue.message}
          </h2>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto animate-[cinematic-line_1.2s_ease_both]" />
          <div className="pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 active:scale-95 font-serif text-lg tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
            >
              Continua
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-blocking overlay
  return (
    <div
      className={`cue-overlay cue-overlay--${cue.tone}`}
      style={{ pointerEvents: "none" }}
    />
  );
}
