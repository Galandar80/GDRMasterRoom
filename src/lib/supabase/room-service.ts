"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { demoRoomState } from "@/lib/demo-data";
import { encodeDiceReason } from "@/lib/game-random";
import { APP_LIMITS, validateMessageContent, validateUploadFile } from "@/lib/app-limits";
import type {
  AudioTrack,
  Campaign,
  Character,
  DiceRequest,
  InventoryItem,
  MapCharacterPosition,
  MapCustomMarker,
  MapEvent,
  MapFogArea,
  MapHotspot,
  MapNpcMarker,
  MediaAsset,
  Message,
  NarrativeMap,
  Npc,
  PlayerNote,
  Profile,
  Room,
  RoomState,
  Scene,
  SoundEffect
} from "@/lib/types";
import { hasSuperadminClaim, isConfiguredSuperadmin } from "@/lib/superadmin";

type DatabaseClient = SupabaseClient;
const ROOM_MESSAGE_PAGE_SIZE = 150;
const SUPERADMIN_MEDIA_QUERY_LIMIT = 500;

export type AdminRoomOverview = {
  id: string;
  name: string;
  invite_code: string;
  max_players: number;
  created_at: string;
  campaign_id: string;
  campaign_title?: string;
  master_id?: string;
  player_count?: number;
};

export type AdminMediaOverview = {
  id: string;
  source: "scene" | "audio" | "sound" | "media_asset";
  room_id: string;
  room_name?: string;
  campaign_title?: string;
  title: string;
  asset_type: "image" | "video" | "audio" | "sound" | "portrait" | "object";
  url: string;
  created_at?: string;
  visibility?: MediaAsset["visibility"];
  approval_status?: MediaAsset["approval_status"];
  file_size?: number;
  owner_id?: string | null;
};

export type UserSessionSummary = {
  id: string;
  roomId: string;
  campaignId: string;
  campaignTitle: string;
  campaignStatus?: Campaign["status"];
  roomName: string;
  inviteCode: string;
  role: "master" | "player";
  playerCount: number;
  maxPlayers: number;
  characterId?: string;
  characterName?: string;
  isSetupComplete?: boolean;
  createdAt: string;
  lastActivityAt: string;
};

type RoomMessagePage = {
  messages: Message[];
  privateMessages: Message[];
  offMessages: Message[];
  hasOlderMessages: boolean;
};

type InviteRoomLookup = Room & {
  campaign_master_id: string;
  player_count: number;
};

export async function ensureProfile(supabase: DatabaseClient, user: User): Promise<Profile> {
  const fallback = profileFromUser(user);
  const email = fallback.email;
  const username = fallback.username;

  const { data: existing, error: selectError } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return { ...(existing as Profile), is_superadmin: fallback.is_superadmin };
  }

  const { data, error } = await supabase
    .from("users")
    .insert({ id: user.id, email, username, role: "player" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export function profileFromUser(user: User): Profile {
  const email = user.email ?? "";
  const username =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.username ??
    email.split("@")[0] ??
    "Giocatore";

  return {
    id: user.id,
    email,
    username,
    role: "player",
    is_superadmin: hasSuperadminClaim(user)
  };
}

export async function loadInitialRoomState(supabase: DatabaseClient, profile: Profile): Promise<RoomState | null> {
  const { data: masterCampaign } = await supabase
    .from("campaigns")
    .select("*, rooms(*)")
    .eq("master_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const masterRoom = masterCampaign?.rooms?.[0];
  if (masterCampaign && masterRoom) {
    return loadRoomState(supabase, masterRoom.id, profile);
  }

  const { data: character } = await supabase
    .from("player_characters")
    .select("room_id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (character?.room_id) {
    return loadRoomState(supabase, character.room_id, profile);
  }

  return null;
}

export async function listUserSessions(supabase: DatabaseClient, profile: Profile): Promise<UserSessionSummary[]> {
  const [{ data: campaigns, error: campaignError }, { data: characters, error: characterError }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,title,status,created_at,rooms(id,name,invite_code,max_players,created_at,player_characters(id))")
      .eq("master_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("player_characters")
      .select("id,room_id,character_name,character_surname,is_setup_complete,created_at,rooms(id,name,invite_code,max_players,created_at,campaigns(id,title,status),player_characters(id))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
  ]);

  if (campaignError) throw campaignError;
  if (characterError) throw characterError;

  const masterSessions = ((campaigns ?? []) as any[]).flatMap((campaign) =>
    ((campaign.rooms ?? []) as any[]).map((room) => ({
      id: `master:${room.id}`,
      roomId: room.id,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      roomName: room.name,
      inviteCode: room.invite_code,
      role: "master" as const,
      playerCount: Array.isArray(room.player_characters) ? room.player_characters.length : 0,
      maxPlayers: room.max_players ?? 4,
      createdAt: room.created_at ?? campaign.created_at,
      lastActivityAt: room.created_at ?? campaign.created_at
    }))
  );

  const playerSessions = ((characters ?? []) as any[])
    .filter((character) => character.rooms)
    .map((character) => {
      const room = character.rooms;
      const campaign = room.campaigns;
      const characterName = `${character.character_name ?? "Eroe"} ${character.character_surname ?? ""}`.trim();

      return {
        id: `player:${room.id}:${character.id}`,
        roomId: room.id,
        campaignId: campaign?.id ?? room.campaign_id,
        campaignTitle: campaign?.title ?? "Campagna",
        campaignStatus: campaign?.status,
        roomName: room.name,
        inviteCode: room.invite_code,
        role: "player" as const,
        playerCount: Array.isArray(room.player_characters) ? room.player_characters.length : 0,
        maxPlayers: room.max_players ?? 4,
        characterId: character.id,
        characterName,
        isSetupComplete: character.is_setup_complete ?? false,
        createdAt: character.created_at ?? room.created_at,
        lastActivityAt: character.created_at ?? room.created_at
      };
    });

  const unique = new Map<string, UserSessionSummary>();
  [...masterSessions, ...playerSessions].forEach((session) => unique.set(session.id, session));

  const sessions = Array.from(unique.values());
  const roomIds = Array.from(new Set(sessions.map((session) => session.roomId).filter(Boolean)));
  const latestActivityByRoom = new Map<string, string>();

  if (roomIds.length) {
    const { data: latestMessages } = await supabase
      .from("messages")
      .select("room_id,created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(Math.max(50, roomIds.length * 8));

    ((latestMessages ?? []) as any[]).forEach((message) => {
      if (!latestActivityByRoom.has(message.room_id)) {
        latestActivityByRoom.set(message.room_id, message.created_at);
      }
    });
  }

  return sessions
    .map((session) => ({
      ...session,
      lastActivityAt: latestActivityByRoom.get(session.roomId) ?? session.lastActivityAt
    }))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export async function listAllRoomsForSuperAdmin(supabase: DatabaseClient, profile: Profile): Promise<AdminRoomOverview[]> {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,invite_code,max_players,created_at,campaign_id,campaigns(title,master_id),player_characters(id)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((room: any) => ({
    id: room.id,
    name: room.name,
    invite_code: room.invite_code,
    max_players: room.max_players ?? 4,
    created_at: room.created_at,
    campaign_id: room.campaign_id,
    campaign_title: room.campaigns?.title,
    master_id: room.campaigns?.master_id,
    player_count: room.player_characters?.length ?? 0
  }));
}

export async function updateRoomBySuperAdmin(
  supabase: DatabaseClient,
  profile: Profile,
  roomId: string,
  values: { name: string; inviteCode: string; maxPlayers: number }
) {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  const { error } = await supabase
    .from("rooms")
    .update({ name: values.name, invite_code: values.inviteCode, max_players: values.maxPlayers })
    .eq("id", roomId);

  if (error) throw error;
}

export async function deleteRoomBySuperAdmin(supabase: DatabaseClient, profile: Profile, roomId: string) {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function listAllMediaForSuperAdmin(supabase: DatabaseClient, profile: Profile): Promise<AdminMediaOverview[]> {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  const [{ data: scenes, error: scenesError }, { data: audioTracks, error: audioError }, { data: soundEffects, error: soundError }, { data: mediaAssets, error: mediaError }] =
    await Promise.all([
      supabase
        .from("scenes")
        .select("id,room_id,title,image_url,video_url,created_at,rooms!scenes_room_id_fkey(name,campaigns(title))")
        .order("created_at", { ascending: false })
        .limit(SUPERADMIN_MEDIA_QUERY_LIMIT),
      supabase
        .from("audio_tracks")
        .select("id,room_id,title,audio_url,created_at,rooms!audio_tracks_room_id_fkey(name,campaigns(title))")
        .neq("audio_url", "")
        .order("created_at", { ascending: false })
        .limit(SUPERADMIN_MEDIA_QUERY_LIMIT),
      supabase
        .from("sound_effects")
        .select("id,room_id,title,audio_url,created_at,rooms!sound_effects_room_id_fkey(name,campaigns(title))")
        .neq("audio_url", "")
        .order("created_at", { ascending: false })
        .limit(SUPERADMIN_MEDIA_QUERY_LIMIT),
      supabase
        .from("media_assets")
        .select("id,room_id,title,asset_type,url,created_at,visibility,approval_status,file_size,owner_id,created_by,rooms(name,campaigns(title))")
        .order("created_at", { ascending: false })
        .limit(SUPERADMIN_MEDIA_QUERY_LIMIT)
    ]);

  if (scenesError) throw scenesError;
  if (audioError) throw audioError;
  if (soundError) throw soundError;
  if (mediaError) throw mediaError;

  const sceneMedia = ((scenes ?? []) as any[]).flatMap((scene) => {
    const roomName = scene.rooms?.name;
    const campaignTitle = scene.rooms?.campaigns?.title;
    const entries: AdminMediaOverview[] = [];
    if (scene.image_url) {
      entries.push({
        id: `${scene.id}:image`,
        source: "scene",
        room_id: scene.room_id,
        room_name: roomName,
        campaign_title: campaignTitle,
        title: `${scene.title} - immagine`,
        asset_type: "image",
        url: scene.image_url,
        created_at: scene.created_at
      });
    }
    if (scene.video_url) {
      entries.push({
        id: `${scene.id}:video`,
        source: "scene",
        room_id: scene.room_id,
        room_name: roomName,
        campaign_title: campaignTitle,
        title: `${scene.title} - video`,
        asset_type: "video",
        url: scene.video_url,
        created_at: scene.created_at
      });
    }
    return entries;
  });

  const audioMedia = ((audioTracks ?? []) as any[]).map((track) => ({
    id: track.id,
    source: "audio" as const,
    room_id: track.room_id,
    room_name: track.rooms?.name,
    campaign_title: track.rooms?.campaigns?.title,
    title: track.title,
    asset_type: "audio" as const,
    url: track.audio_url,
    created_at: track.created_at
  }));

  const soundMedia = ((soundEffects ?? []) as any[]).map((effect) => ({
    id: effect.id,
    source: "sound" as const,
    room_id: effect.room_id,
    room_name: effect.rooms?.name,
    campaign_title: effect.rooms?.campaigns?.title,
    title: effect.title,
    asset_type: "sound" as const,
    url: effect.audio_url,
    created_at: effect.created_at
  }));

  const assetMedia = ((mediaAssets ?? []) as any[]).map((asset) => ({
    id: asset.id,
    source: "media_asset" as const,
    room_id: asset.room_id,
    room_name: asset.rooms?.name,
    campaign_title: asset.rooms?.campaigns?.title,
    title: asset.title,
    asset_type: asset.asset_type,
    url: asset.url,
    created_at: asset.created_at,
    visibility: asset.visibility ?? "room",
    approval_status: asset.approval_status ?? "none",
    file_size: Number(asset.file_size ?? 0),
    owner_id: asset.owner_id ?? asset.created_by ?? null
  }));

  return [...sceneMedia, ...audioMedia, ...soundMedia, ...assetMedia].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

export async function deleteMediaBySuperAdmin(supabase: DatabaseClient, profile: Profile, media: AdminMediaOverview) {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  if (media.source === "scene") {
    const sceneId = media.id.split(":")[0];
    const { data: scene, error } = await supabase.from("scenes").select("*").eq("id", sceneId).single();
    if (error) throw error;
    await deleteScene(supabase, scene as Scene);
    return;
  }

  if (media.source === "audio") {
    const { data: track, error } = await supabase.from("audio_tracks").select("*").eq("id", media.id).single();
    if (error) throw error;
    await deleteAudioTrack(supabase, track as AudioTrack);
    return;
  }

  if (media.source === "sound") {
    const { data: effect, error } = await supabase.from("sound_effects").select("*").eq("id", media.id).single();
    if (error) throw error;
    await deleteSoundEffect(supabase, effect as SoundEffect);
    return;
  }

  const { data: asset, error } = await supabase.from("media_assets").select("*").eq("id", media.id).single();
  if (error) throw error;
  await deleteMediaAsset(supabase, asset as MediaAsset);
}

export function isSuperAdmin(profile: Profile) {
  return isConfiguredSuperadmin(profile);
}

export async function isInviteCodeTaken(supabase: DatabaseClient, code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return false;

  const { data, error } = await supabase
    .rpc("lookup_room_by_invite_code", { lookup_code: normalizedCode })
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function createGameInSupabase(
  supabase: DatabaseClient,
  profile: Profile,
  values: {
    campaignTitle: string;
    genre: string;
    description: string;
    coverImageUrl: string;
    roomName: string;
    inviteCode: string;
    maxPlayers: number;
    sceneTitle: string;
    sceneDescription: string;
    sceneImageUrl: string;
  }
) {
  await supabase.from("users").update({ role: "master" }).eq("id", profile.id);

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      master_id: profile.id,
      title: values.campaignTitle,
      genre: values.genre,
      description: values.description,
      cover_image_url: values.coverImageUrl,
      status: "active"
    })
    .select("*")
    .single();

  if (campaignError) throw campaignError;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      campaign_id: campaign.id,
      name: values.roomName,
      invite_code: values.inviteCode,
      max_players: values.maxPlayers
    })
    .select("*")
    .single();

  if (roomError) throw roomError;

  const { data: scene, error: sceneError } = await supabase
    .from("scenes")
    .insert({
      room_id: room.id,
      title: values.sceneTitle,
      description: values.sceneDescription,
      image_url: values.sceneImageUrl,
      media_type: "image",
      created_by: profile.id
    })
    .select("*")
    .single();

  if (sceneError) throw sceneError;

  if (values.sceneImageUrl) {
    await createMediaAsset(supabase, room.id, profile, {
      title: `${values.sceneTitle} - scena iniziale`,
      assetType: "image",
      url: values.sceneImageUrl,
      tags: ["scena", "iniziale"]
    });
  }

  try {
    await supabase
      .from("maps")
      .insert({
        campaign_id: campaign.id,
        room_id: room.id,
        title: `${values.roomName} - mappa iniziale`,
        description: "Prima mappa narrativa della stanza.",
        image_url: values.sceneImageUrl || values.coverImageUrl,
        level_type: "custom",
        is_active: true,
        is_visible_to_players: true,
        created_by: profile.id
      })
      .throwOnError();
  } catch {
    // Older Supabase schemas can still create the core room; the map migration can be applied afterwards.
  }

  const { data: audio, error: audioError } = await supabase
    .from("audio_tracks")
    .insert({
      room_id: room.id,
      title: "Silenzio di scena",
      audio_url: "",
      loop: true
    })
    .select("*")
    .single();

  if (audioError) throw audioError;

  const { error: updateError } = await supabase
    .from("rooms")
    .update({ current_scene_id: scene.id, current_audio_id: audio.id })
    .eq("id", room.id);

  if (updateError) throw updateError;

  await supabase.from("npcs").insert([
    {
      room_id: room.id,
      name: "Narratore Ombra",
      color: "#84cc16",
      description: "NPC temporaneo pronto per la prima sessione."
    }
  ]);

  // Insert default ambient sound effects
  await supabase.from("sound_effects").insert([
    { room_id: room.id, title: "Pioggia", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/rain.mp3", loop: true },
    { room_id: room.id, title: "Vento", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/wind.mp3", loop: true },
    { room_id: room.id, title: "Fuoco", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/fireplace.mp3", loop: true },
    { room_id: room.id, title: "Taverna", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/coffee-shop.mp3", loop: true },
    { room_id: room.id, title: "Oceano", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/ocean.mp3", loop: true },
    { room_id: room.id, title: "Temporale", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/thunder.mp3", loop: true },
    { room_id: room.id, title: "Foresta", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/forest.mp3", loop: true },
    { room_id: room.id, title: "Notte Stellata", audio_url: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/night.mp3", loop: true },
    { room_id: room.id, title: "Passi", audio_url: "/assets/audio/distant_footsteps_on_wood.mp3", loop: false },
    { room_id: room.id, title: "Porta", audio_url: "/assets/audio/creaking_wooden_door.mp3", loop: false }
  ]);

  return loadRoomState(supabase, room.id, profile);
}

export async function enterMasterRoomByCode(supabase: DatabaseClient, code: string, profile: Profile) {
  const { data: room, error } = await supabase
    .rpc("lookup_room_by_invite_code", { lookup_code: code.trim().toUpperCase() })
    .maybeSingle();

  if (error) throw error;
  if (!room) return null;
  const lookup = room as InviteRoomLookup;
  if (lookup.campaign_master_id !== profile.id) {
    throw new Error("Questo codice esiste, ma la stanza appartiene a un altro Master.");
  }

  return loadRoomState(supabase, lookup.id, { ...profile, role: "master" });
}

export async function joinRoomByCode(supabase: DatabaseClient, code: string, profile: Profile) {
  const { data: claimedRoomId, error } = await supabase.rpc("claim_room_by_invite_code", {
    lookup_code: code.trim().toUpperCase()
  });

  if (error) throw error;
  if (!claimedRoomId) return null;

  return loadRoomState(supabase, claimedRoomId as string, profile);
}

export async function createOrUpdateCharacter(
  supabase: DatabaseClient,
  roomId: string,
  profile: Profile,
  values: {
    characterName: string;
    characterSurname: string;
    color: string;
    portraitUrl: string;
    hp: number;
    mentalState: string;
    visibleStatus: string;
    publicBackground: string;
    conditions?: string[];
  }
) {
  const { data, error } = await supabase
    .from("player_characters")
    .update({
      character_name: values.characterName,
      character_surname: values.characterSurname,
      portrait_url: values.portraitUrl,
      color: values.color,
      hp: values.hp,
      mental_state: values.mentalState,
      visible_status: values.visibleStatus,
      public_background: values.publicBackground,
      conditions: values.conditions ?? [],
      is_setup_complete: true
    })
    .eq("room_id", roomId)
    .eq("user_id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Character;
}



export async function loadRoomState(supabase: DatabaseClient, roomId: string, profile: Profile): Promise<RoomState> {
  const { data: room, error: roomError } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (roomError) throw roomError;

  const [
    { data: campaign },
    { data: scenes },
    { data: characters },
    { data: npcs },
    { data: audioTracks },
    { data: soundEffects },
    { data: mediaAssets },
    messagePage,
    { data: diceRequests }
  ] =
    await Promise.all([
      supabase.from("campaigns").select("*").eq("id", room.campaign_id).single(),
      supabase.from("scenes").select("*").eq("room_id", room.id).order("created_at", { ascending: false }),
      supabase.from("player_characters").select("*").eq("room_id", room.id).order("created_at", { ascending: true }),
      supabase.from("npcs").select("*").eq("room_id", room.id).order("created_at", { ascending: true }),
      supabase.from("audio_tracks").select("*").eq("room_id", room.id).order("created_at", { ascending: true }),
      supabase.from("sound_effects").select("*").eq("room_id", room.id).order("created_at", { ascending: true }),
      supabase.from("media_assets").select("*").eq("room_id", room.id).order("created_at", { ascending: false }),
      fetchRoomMessagePage(supabase, room.id, undefined, ROOM_MESSAGE_PAGE_SIZE),
      supabase.from("dice_requests").select("*").eq("room_id", room.id).order("created_at", { ascending: false })
    ]);

  const campaignRecord = campaign as Campaign;
  const isMaster = campaignRecord.master_id === profile.id;
  const sceneListAll = (scenes ?? []) as Scene[];
  const sceneList = isMaster
    ? sceneListAll
    : sceneListAll.filter((scene) => (scene.visibility ?? "public") === "public" || (scene.visible_user_ids ?? []).includes(profile.id));
  const audioList = (audioTracks ?? []) as AudioTrack[];
  const characterList = (characters ?? []) as Character[];
  const currentScene =
    sceneList.find((scene) => scene.id === room.current_scene_id) ??
    sceneList.find((scene) => (scene.visibility ?? "public") === "public") ??
    sceneList[0] ??
    demoRoomState.scene;
  const currentCharacter = characterList.find((character) => character.user_id === profile.id) ?? characterList[0];
  const characterIds = characterList.map((character) => character.id);

  const [{ data: rawInventory }, { data: notes }] = currentCharacter
    ? await Promise.all([
        characterIds.length
          ? supabase.from("inventory_items").select("*").in("character_id", characterIds).order("created_at", { ascending: true })
          : supabase.from("inventory_items").select("*").eq("character_id", currentCharacter.id).order("created_at", { ascending: true }),
        supabase.from("player_notes").select("*").eq("character_id", currentCharacter.id).order("updated_at", { ascending: false })
      ])
    : [{ data: [] }, { data: [] }];
  const inventory = ((rawInventory ?? []) as InventoryItem[]).filter((item) => isMaster || item.character_id === currentCharacter?.id || item.is_public);
  const mapState = await fetchRoomMapState(supabase, room.id, isMaster);

  const sessionProfile: Profile = {
    ...profile,
    role: isMaster ? "master" : "player"
  };

  return {
    profile: sessionProfile,
    campaigns: [campaignRecord],
    room: room as Room,
    scene: currentScene,
    scenes: sceneList,
    characters: characterList,
    npcs: (npcs ?? []) as Npc[],
    messages: messagePage.messages,
    privateMessages: messagePage.privateMessages,
    offMessages: messagePage.offMessages,
    diceRequests: (diceRequests ?? []) as DiceRequest[],
    audioTracks: audioList.length ? audioList : demoRoomState.audioTracks,
    soundEffects: (soundEffects ?? []) as SoundEffect[],
    mediaAssets: (mediaAssets ?? []) as MediaAsset[],
    presence: [],
    typing: [],
    inventory: (inventory ?? []) as InventoryItem[],
    notes: (notes ?? []) as PlayerNote[],
    maps: mapState.maps,
    mapHotspots: mapState.mapHotspots,
    mapCharacterPositions: mapState.mapCharacterPositions,
    mapNpcMarkers: mapState.mapNpcMarkers,
    mapCustomMarkers: mapState.mapCustomMarkers,
    mapFogAreas: mapState.mapFogAreas,
    mapEvents: mapState.mapEvents,
    hasOlderMessages: messagePage.hasOlderMessages
  };
}

async function fetchRoomMapState(supabase: DatabaseClient, roomId: string, isMaster: boolean) {
  try {
    const { data: maps, error: mapsError } = await supabase
      .from("maps")
      .select("*")
      .eq("room_id", roomId)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });

    if (mapsError) throw mapsError;

    const roomMaps = ((maps ?? []) as NarrativeMap[]).filter((map) => isMaster || map.is_visible_to_players);
    const mapIds = roomMaps.map((map) => map.id);
    if (!mapIds.length) {
      return {
        maps: [],
        mapHotspots: [],
        mapCharacterPositions: [],
        mapNpcMarkers: [],
        mapCustomMarkers: [],
        mapFogAreas: [],
        mapEvents: []
      };
    }

    const [
      { data: hotspots },
      { data: characterPositions },
      { data: npcMarkers },
      { data: customMarkers },
      { data: fogAreas },
      { data: events }
    ] = await Promise.all([
      supabase.from("map_hotspots").select("*").in("map_id", mapIds).order("created_at", { ascending: true }),
      supabase.from("map_character_positions").select("*").in("map_id", mapIds).order("updated_at", { ascending: false }),
      supabase.from("map_npc_markers").select("*").in("map_id", mapIds).order("updated_at", { ascending: false }),
      supabase.from("map_custom_markers").select("*").in("map_id", mapIds).order("created_at", { ascending: true }),
      supabase.from("map_fog_areas").select("*").in("map_id", mapIds).order("created_at", { ascending: true }),
      supabase.from("map_events").select("*").in("map_id", mapIds).order("created_at", { ascending: true })
    ]);

    const allowedMapIds = new Set(mapIds);
    const filterVisibility = <T extends { map_id: string; is_visible_to_players?: boolean }>(items: T[] = []) =>
      items.filter((item) => allowedMapIds.has(item.map_id) && (isMaster || item.is_visible_to_players !== false));

    return {
      maps: roomMaps,
      mapHotspots: filterVisibility((hotspots ?? []) as MapHotspot[]),
      mapCharacterPositions: filterVisibility((characterPositions ?? []) as MapCharacterPosition[]),
      mapNpcMarkers: filterVisibility((npcMarkers ?? []) as MapNpcMarker[]),
      mapCustomMarkers: filterVisibility((customMarkers ?? []) as MapCustomMarker[]),
      mapFogAreas: filterVisibility((fogAreas ?? []) as MapFogArea[]),
      mapEvents: filterVisibility((events ?? []) as MapEvent[])
    };
  } catch {
    return {
      maps: [],
      mapHotspots: [],
      mapCharacterPositions: [],
      mapNpcMarkers: [],
      mapCustomMarkers: [],
      mapFogAreas: [],
      mapEvents: []
    };
  }
}

async function fetchRoomMessagePage(supabase: DatabaseClient, roomId: string, beforeCreatedAt?: string, limit = ROOM_MESSAGE_PAGE_SIZE): Promise<RoomMessagePage> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(limit + 1);

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt);
  }

  const { data, error } = await query;
  if (error) throw error;

  const ordered = ((data ?? []) as Message[]).slice(0, limit).reverse();
  return splitMessagePage(ordered, (data?.length ?? 0) > limit);
}

function splitMessagePage(allMessages: Message[], hasOlderMessages: boolean): RoomMessagePage {
  return {
    messages: allMessages.filter((message) => !message.is_private && (message.channel ?? "gdr") === "gdr"),
    privateMessages: allMessages.filter((message) => message.is_private),
    offMessages: allMessages.filter((message) => !message.is_private && message.channel === "off"),
    hasOlderMessages
  };
}

export async function loadOlderRoomMessages(supabase: DatabaseClient, roomId: string, beforeCreatedAt: string, limit = ROOM_MESSAGE_PAGE_SIZE) {
  return fetchRoomMessagePage(supabase, roomId, beforeCreatedAt, limit);
}

export async function exportRoomMessages(supabase: DatabaseClient, roomId: string) {
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (countError) throw countError;
  if ((count ?? 0) > APP_LIMITS.messageExportMaxRows) {
    throw new Error(`L'esportazione supera il limite operativo di ${APP_LIMITS.messageExportMaxRows.toLocaleString("it-IT")} messaggi.`);
  }

  const messages: Message[] = [];
  for (let offset = 0; offset < (count ?? 0); offset += APP_LIMITS.messageExportPageSize) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .range(offset, offset + APP_LIMITS.messageExportPageSize - 1);
    if (error) throw error;
    messages.push(...((data ?? []) as Message[]));
  }
  return messages;
}

export async function createScene(
  supabase: DatabaseClient,
  roomId: string,
  profile: Profile,
  values: {
    title: string;
    description: string;
    imageUrl: string;
    mediaType?: "image" | "video";
    videoUrl?: string;
    loopVideo?: boolean;
    visibility?: "public" | "private";
    visibleUserIds?: string[];
    linkedAudioId?: string | null;
  }
) {
  const insertPayload: Record<string, unknown> = {
    room_id: roomId,
    title: values.title,
    description: values.description,
    image_url: values.imageUrl,
    media_type: values.mediaType ?? "image",
    video_url: values.videoUrl || null,
    loop_video: values.loopVideo ?? true,
    visibility: values.visibility ?? "public",
    visible_user_ids: values.visibleUserIds ?? [],
    created_by: profile.id
  };

  if (values.linkedAudioId) {
    insertPayload.linked_audio_id = values.linkedAudioId;
  }

  const { data, error } = await supabase
    .from("scenes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data as Scene;
}

export async function updateScene(
  supabase: DatabaseClient,
  sceneId: string,
  values: {
    title: string;
    description: string;
    imageUrl: string;
    mediaType?: "image" | "video";
    videoUrl?: string;
    loopVideo?: boolean;
    visibility?: "public" | "private";
    visibleUserIds?: string[];
    linkedAudioId?: string | null;
  }
) {
  // Base payload: fields that are guaranteed to be in PostgREST schema cache
  // (linked_audio_id is excluded here because it was added via migration and
  //  may not be in the PostgREST schema cache yet, causing PGRST204 errors)
  const basePayload: Record<string, unknown> = {
    title: values.title,
    description: values.description,
    image_url: values.imageUrl,
    media_type: values.mediaType ?? "image",
    video_url: values.videoUrl || null,
    loop_video: values.loopVideo ?? true,
    visibility: values.visibility ?? "public",
    visible_user_ids: values.visibleUserIds ?? []
  };

  const { data, error } = await supabase
    .from("scenes")
    .update(basePayload)
    .eq("id", sceneId)
    .select("*")
    .single();

  if (error) throw error;
  const updatedScene = data as Scene;

  // Separately update linked_audio_id (best-effort: PGRST204 if not in cache is silently ignored)
  if (values.linkedAudioId !== undefined) {
    const { error: audioLinkError } = await supabase
      .from("scenes")
      .update({ linked_audio_id: values.linkedAudioId || null })
      .eq("id", sceneId);

    if (!audioLinkError) {
      // Patch the returned scene object with the audio link so state is consistent
      (updatedScene as Record<string, unknown>).linked_audio_id = values.linkedAudioId || null;
    }
  }

  return updatedScene;
}


export async function createNarrativeMap(
  supabase: DatabaseClient,
  room: Room,
  profile: Profile,
  values: {
    title: string;
    description: string;
    imageUrl: string;
    parentMapId?: string | null;
    levelType: NarrativeMap["level_type"];
    isVisibleToPlayers: boolean;
  }
) {
  const { data, error } = await supabase
    .from("maps")
    .insert({
      campaign_id: room.campaign_id,
      room_id: room.id,
      parent_map_id: values.parentMapId || null,
      title: values.title,
      description: values.description,
      image_url: values.imageUrl,
      level_type: values.levelType,
      is_active: false,
      is_visible_to_players: values.isVisibleToPlayers,
      created_by: profile.id
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as NarrativeMap;
}

export async function setActiveNarrativeMap(supabase: DatabaseClient, roomId: string, mapId: string) {
  const { error: clearError } = await supabase.from("maps").update({ is_active: false }).eq("room_id", roomId);
  if (clearError) throw clearError;

  const { data, error } = await supabase
    .from("maps")
    .update({ is_active: true, is_visible_to_players: true, updated_at: new Date().toISOString() })
    .eq("id", mapId)
    .select("*")
    .single();

  if (error) throw error;
  return data as NarrativeMap;
}

export async function duplicateNarrativeMap(supabase: DatabaseClient, map: NarrativeMap, profile: Profile) {
  const { data, error } = await supabase
    .from("maps")
    .insert({
      campaign_id: map.campaign_id,
      room_id: map.room_id,
      parent_map_id: map.parent_map_id,
      title: `${map.title} copia`,
      description: map.description,
      image_url: map.image_url,
      level_type: map.level_type,
      is_active: false,
      is_visible_to_players: false,
      created_by: profile.id
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as NarrativeMap;
}

export async function deleteNarrativeMap(supabase: DatabaseClient, map: NarrativeMap) {
  const { error } = await supabase.from("maps").delete().eq("id", map.id);
  if (error) throw error;
}

export async function upsertMapCharacterPosition(
  supabase: DatabaseClient,
  position: MapCharacterPosition,
  values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }
) {
  const payload = {
    map_id: position.map_id,
    character_id: position.character_id,
    x: values.x,
    y: values.y,
    narrative_location: values.narrativeLocation,
    is_visible_to_players: values.isVisibleToPlayers,
    is_locked: values.isLocked,
    updated_at: new Date().toISOString()
  };

  const query = position.id.startsWith("virtual-position:") || position.id.startsWith("sync-position:")
    ? supabase.from("map_character_positions").upsert(payload, { onConflict: "map_id,character_id" })
    : supabase.from("map_character_positions").update(payload).eq("id", position.id);

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return data as MapCharacterPosition;
}

export async function createMapFogArea(
  supabase: DatabaseClient,
  mapId: string,
  values: { shapeType: "rect" | "circle" | "polygon"; shapeData: Record<string, any>; isRevealed: boolean }
) {
  const { data, error } = await supabase
    .from("map_fog_areas")
    .insert({
      map_id: mapId,
      shape_type: values.shapeType,
      shape_data: values.shapeData,
      is_revealed: values.isRevealed
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as MapFogArea;
}

export async function updateMapFogArea(
  supabase: DatabaseClient,
  id: string,
  values: { shapeData: Record<string, any>; isRevealed: boolean }
) {
  const { data, error } = await supabase
    .from("map_fog_areas")
    .update({
      shape_data: values.shapeData,
      is_revealed: values.isRevealed,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as MapFogArea;
}

export async function deleteMapFogArea(supabase: DatabaseClient, id: string) {
  const { error } = await supabase.from("map_fog_areas").delete().eq("id", id);
  if (error) throw error;
}


export async function createSoundEffect(
  supabase: DatabaseClient,
  roomId: string,
  values: { title: string; audioUrl: string; loop: boolean }
) {
  const { data, error } = await supabase
    .from("sound_effects")
    .insert({
      room_id: roomId,
      title: values.title,
      audio_url: values.audioUrl,
      loop: values.loop
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SoundEffect;
}

export async function createAudioTrack(
  supabase: DatabaseClient,
  roomId: string,
  values: { title: string; audioUrl: string; loop: boolean }
) {
  const { data, error } = await supabase
    .from("audio_tracks")
    .insert({
      room_id: roomId,
      title: values.title,
      audio_url: values.audioUrl,
      loop: values.loop
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AudioTrack;
}

export async function createNpc(
  supabase: DatabaseClient,
  roomId: string,
  values: { name: string; color: string; description: string; portraitUrl?: string }
) {
  const { data, error } = await supabase
    .from("npcs")
    .insert({
      room_id: roomId,
      name: values.name,
      color: values.color,
      description: values.description,
      portrait_url: values.portraitUrl || null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Npc;
}

export async function deleteNpc(supabase: DatabaseClient, npc: Npc) {
  await removePublicFileFromUrl(supabase, "portraits", npc.portrait_url ?? "");

  const { error } = await supabase.from("npcs").delete().eq("id", npc.id);
  if (error) throw error;
}

export async function createInventoryItem(
  supabase: DatabaseClient,
  characterId: string,
  values: { name: string; description: string; quantity: number; imageUrl?: string; isPublic: boolean; masterNotes?: string }
) {
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      character_id: characterId,
      name: values.name,
      description: values.description,
      quantity: values.quantity,
      image_url: values.imageUrl || null,
      is_public: values.isPublic,
      master_notes: values.masterNotes || null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

export async function deleteInventoryItem(supabase: DatabaseClient, item: InventoryItem) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
  if (error) throw error;
}

export async function deleteAudioTrack(supabase: DatabaseClient, track: AudioTrack) {
  await removePublicFileFromUrl(supabase, "audio-tracks", track.audio_url);

  const { error } = await supabase.from("audio_tracks").delete().eq("id", track.id);
  if (error) throw error;
}

export async function deleteSoundEffect(supabase: DatabaseClient, effect: SoundEffect) {
  await removePublicFileFromUrl(supabase, "audio-tracks", effect.audio_url);

  const { error } = await supabase.from("sound_effects").delete().eq("id", effect.id);
  if (error) throw error;
}

export async function uploadPublicFile(supabase: DatabaseClient, bucket: string, file: File, folder: string) {
  validateUploadFile(bucket, file);
  const extension = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteScene(supabase: DatabaseClient, scene: Scene) {
  await removePublicFileFromUrl(supabase, "scene-images", scene.image_url);
  await removePublicFileFromUrl(supabase, "scene-images", scene.video_url ?? "");

  const { error } = await supabase.from("scenes").delete().eq("id", scene.id);
  if (error) throw error;
}

export async function deleteRoom(supabase: DatabaseClient, roomId: string) {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function insertMessage(supabase: DatabaseClient, message: Omit<Message, "id" | "created_at">) {
  validateMessageContent(message.content);
  const { data, error } = await supabase.from("messages").insert(message).select("*").single();
  if (error) throw error;
  return data as Message;
}

export async function deleteMessage(supabase: DatabaseClient, messageId: string) {
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function updateMessageContent(supabase: DatabaseClient, messageId: string, content: string) {
  validateMessageContent(content);
  const { data, error } = await supabase
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Message;
}

export async function updateMessagePinned(supabase: DatabaseClient, messageId: string, isPinned: boolean) {
  const { data, error } = await supabase
    .from("messages")
    .update({ is_pinned: isPinned })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Message;
}

export async function createMediaAsset(
  supabase: DatabaseClient,
  roomId: string,
  profile: Profile,
  values: {
    title: string;
    assetType: MediaAsset["asset_type"];
    url: string;
    tags: string[];
    visibility?: MediaAsset["visibility"];
    approvalStatus?: MediaAsset["approval_status"];
    fileSize?: number;
    mimeType?: string | null;
    storageBucket?: string | null;
    storagePath?: string | null;
    description?: string;
  }
) {
  const visibility = values.visibility ?? "room";
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      room_id: roomId,
      title: values.title,
      asset_type: values.assetType,
      url: values.url,
      tags: values.tags,
      created_by: profile.id,
      owner_id: profile.id,
      visibility,
      approval_status: values.approvalStatus ?? (visibility === "global" ? "pending" : "none"),
      file_size: values.fileSize ?? 0,
      mime_type: values.mimeType ?? null,
      storage_bucket: values.storageBucket ?? null,
      storage_path: values.storagePath ?? extractPublicStoragePath(values.url, values.storageBucket ?? undefined),
      description: values.description ?? ""
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function listReusableMediaAssets(supabase: DatabaseClient, profile: Profile, roomId?: string): Promise<MediaAsset[]> {
  const queries = [
    supabase.from("media_assets").select("*").eq("owner_id", profile.id).order("created_at", { ascending: false }).limit(APP_LIMITS.reusableMediaPerScope),
    supabase.from("media_assets").select("*").eq("visibility", "shared").order("created_at", { ascending: false }).limit(APP_LIMITS.reusableMediaPerScope),
    supabase.from("media_assets").select("*").eq("visibility", "global").eq("approval_status", "approved").order("created_at", { ascending: false }).limit(APP_LIMITS.reusableMediaPerScope)
  ];

  if (roomId) {
    queries.push(supabase.from("media_assets").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(APP_LIMITS.reusableMediaPerScope));
  }

  const results = await Promise.all(queries);
  const merged = new Map<string, MediaAsset>();
  for (const result of results) {
    if (result.error) throw result.error;
    for (const asset of (result.data ?? []) as MediaAsset[]) {
      merged.set(asset.id, asset);
    }
  }

  return [...merged.values()].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

export async function updateMediaAssetVisibility(
  supabase: DatabaseClient,
  profile: Profile,
  assetId: string,
  visibility: MediaAsset["visibility"]
) {
  const { data, error } = await supabase
    .from("media_assets")
    .update({
      visibility,
      approval_status: visibility === "global" ? "pending" : "none"
    })
    .eq("id", assetId)
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function updateMediaAssetApproval(
  supabase: DatabaseClient,
  profile: Profile,
  assetId: string,
  approvalStatus: Exclude<MediaAsset["approval_status"], undefined>
) {
  if (!isSuperAdmin(profile)) {
    throw new Error("Accesso superadmin non autorizzato.");
  }

  const { data, error } = await supabase
    .from("media_assets")
    .update({ approval_status: approvalStatus })
    .eq("id", assetId)
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMediaAsset(supabase: DatabaseClient, asset: MediaAsset) {
  await removePublicFileFromUrl(supabase, "scene-images", asset.url);
  await removePublicFileFromUrl(supabase, "audio-tracks", asset.url);
  await removePublicFileFromUrl(supabase, "portraits", asset.url);

  const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
  if (error) throw error;
}

function extractPublicStoragePath(url: string, bucket?: string) {
  if (!url || !bucket) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}

export async function createPlayerNote(supabase: DatabaseClient, characterId: string, values: { title: string; content: string }) {
  const { data, error } = await supabase
    .from("player_notes")
    .insert({ character_id: characterId, title: values.title, content: values.content })
    .select("*")
    .single();

  if (error) throw error;
  return data as PlayerNote;
}

export async function createDiceRequest(
  supabase: DatabaseClient,
  roomId: string,
  profile: Profile,
  values: { diceCount?: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }
) {
  const { data, error } = await supabase
    .from("dice_requests")
    .insert({
      room_id: roomId,
      requested_by: profile.id,
      dice_sides: values.diceSides,
      reason: encodeDiceReason(values.reason, values.diceCount ?? 1),
      target_user_id: values.targetUserId || null,
      visibility: values.visibility
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DiceRequest;
}

export async function rollDiceRequest(supabase: DatabaseClient, request: DiceRequest, result: number) {
  const { data, error } = await supabase
    .from("dice_requests")
    .update({ status: "rolled", result, rolled_at: new Date().toISOString() })
    .eq("id", request.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DiceRequest;
}

export async function updateCurrentScene(supabase: DatabaseClient, roomId: string, sceneId: string, linkedAudioId?: string | null) {
  const update: Partial<Room> = { current_scene_id: sceneId };
  if (linkedAudioId) {
    update.current_audio_id = linkedAudioId;
  }

  const { error } = await supabase.from("rooms").update(update).eq("id", roomId);
  if (error) throw error;
}

export async function updateCurrentAudio(supabase: DatabaseClient, roomId: string, audioId: string) {
  const { error } = await supabase.from("rooms").update({ current_audio_id: audioId }).eq("id", roomId);
  if (error) throw error;
}

export async function updateRoomAudioState(supabase: DatabaseClient, roomId: string, values: { audioStatus: string; audioVolume: number }) {
  const { error } = await supabase
    .from("rooms")
    .update({ 
      audio_status: values.audioStatus, 
      audio_volume: values.audioVolume 
    })
    .eq("id", roomId);

  if (error) throw error;
}



export async function triggerRoomSoundEffect(supabase: DatabaseClient, roomId: string, effectId: string | null) {
  const { error } = await supabase
    .from("rooms")
    .update({ current_sound_effect_id: effectId, sound_effect_started_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) throw error;
}

export async function updateRoomChatPermissions(supabase: DatabaseClient, roomId: string, values: { chatEnabled: boolean; mutedUserIds: string[] }) {
  const { error } = await supabase
    .from("rooms")
    .update({ chat_enabled: values.chatEnabled, muted_user_ids: values.mutedUserIds })
    .eq("id", roomId);

  if (error) throw error;
}

export async function updateRoomSpotlight(
  supabase: DatabaseClient,
  roomId: string,
  values: { npcId: string | null; visibility: "off" | "public" | "private"; userIds: string[] }
) {
  const { error } = await supabase
    .from("rooms")
    .update({ spotlight_npc_id: values.npcId, spotlight_visibility: values.visibility, spotlight_user_ids: values.userIds })
    .eq("id", roomId);

  if (error) throw error;
}

export async function updateRoomTurnState(
  supabase: DatabaseClient,
  roomId: string,
  values: { turnEnabled: boolean; turnOrder: string[]; currentTurnIndex: number }
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      turn_enabled: values.turnEnabled,
      turn_order: values.turnOrder,
      current_turn_index: values.currentTurnIndex
    })
    .eq("id", roomId);

  if (error) throw error;
}

export async function updateCharacterByMaster(
  supabase: DatabaseClient,
  characterId: string,
  values: {
    characterName: string;
    characterSurname: string;
    portraitUrl: string;
    color: string;
    hp: number;
    mentalState: string;
    visibleStatus: string;
    publicBackground: string;
    conditions?: string[];
  }
) {
  const { data, error } = await supabase
    .from("player_characters")
    .update({
      character_name: values.characterName,
      character_surname: values.characterSurname,
      portrait_url: values.portraitUrl,
      color: values.color,
      hp: values.hp,
      mental_state: values.mentalState,
      visible_status: values.visibleStatus,
      public_background: values.publicBackground,
      conditions: values.conditions ?? []
    })
    .eq("id", characterId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Character;
}

export async function deletePlayerCharacter(supabase: DatabaseClient, characterId: string) {
  const { error } = await supabase.from("player_characters").delete().eq("id", characterId);
  if (error) throw error;
}

async function removePublicFileFromUrl(supabase: DatabaseClient, bucket: string, publicUrl: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) return;

  const path = decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split("?")[0] ?? "");
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
