export type UserRole = "master" | "player";
export type SenderType = "master" | "player" | "npc" | "system";
export type CampaignStatus = "active" | "completed" | "archived";
export type MessageChannel = "gdr" | "off";
export type SpotlightVisibility = "off" | "public" | "private";
export type SceneMediaType = "image" | "video";
export type SceneVisibility = "public" | "private";
export type MediaAssetType = "image" | "video" | "audio" | "sound" | "portrait" | "object" | "map";
export type MediaAssetVisibility = "private" | "room" | "shared" | "global";
export type MediaAssetApprovalStatus = "none" | "pending" | "approved" | "rejected";
export type ChatFilter = "all" | "master" | "npc" | "player" | "off" | "dice" | "pinned";
export type MapLevelType = "world" | "region" | "city" | "district" | "building" | "floor" | "room" | "custom";
export type MapMarkerType = "mission" | "place" | "object" | "danger" | "event" | "portal" | "clue" | "custom";
export type MapHotspotType = "map" | "scene" | "image" | "text" | "npc" | "object" | "event" | "audio" | "reveal";

export type Profile = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_superadmin?: boolean;
};

export type Campaign = {
  id: string;
  master_id: string;
  title: string;
  description: string;
  genre: string;
  cover_image_url: string;
  status: CampaignStatus;
  created_at: string;
};

export type Room = {
  id: string;
  campaign_id: string;
  name: string;
  invite_code: string;
  max_players?: number;
  current_scene_id: string;
  current_audio_id: string;
  current_sound_effect_id?: string | null;
  sound_effect_started_at?: string | null;
  chat_enabled?: boolean;
  muted_user_ids?: string[];
  spotlight_npc_id?: string | null;
  spotlight_visibility?: SpotlightVisibility;
  spotlight_user_ids?: string[];
  turn_enabled?: boolean;
  turn_order?: string[];
  current_turn_index?: number;
  audio_status?: string;
  audio_volume?: number;
};

export type Scene = {
  id: string;
  room_id: string;
  title: string;
  description: string;
  image_url: string;
  media_type?: SceneMediaType;
  video_url?: string | null;
  loop_video?: boolean;
  visibility?: SceneVisibility;
  visible_user_ids?: string[];
  linked_audio_id?: string | null;
  created_by: string;
  created_at: string;
};

export type Character = {
  id: string;
  room_id: string;
  user_id: string;
  character_name: string;
  character_surname: string;
  portrait_url: string;
  color: string;
  hp: number;
  mental_state: string;
  public_background: string;
  visible_status: string;
  conditions?: string[];
  is_setup_complete?: boolean;
};

export type Npc = {
  id: string;
  room_id: string;
  name: string;
  portrait_url?: string;
  color: string;
  description: string;
};

export type Message = {
  id: string;
  room_id: string;
  sender_user_id: string | null;
  sender_type: SenderType;
  sender_display_name: string;
  sender_color: string;
  npc_id?: string | null;
  content: string;
  is_private: boolean;
  channel?: MessageChannel;
  recipient_user_id?: string | null;
  is_pinned?: boolean;
  edited_at?: string | null;
  created_at: string;
};

export type AudioTrack = {
  id: string;
  room_id: string;
  title: string;
  audio_url: string;
  loop: boolean;
};

export type SoundEffect = {
  id: string;
  room_id: string;
  title: string;
  audio_url: string;
  loop: boolean;
  created_at?: string;
};

export type InventoryItem = {
  id: string;
  character_id: string;
  name: string;
  description: string;
  quantity: number;
  image_url?: string | null;
  is_public: boolean;
  master_notes?: string | null;
  player_notes?: string | null;
};

export type PlayerNote = {
  id: string;
  character_id: string;
  title: string;
  content: string;
  updated_at: string;
};

export type DiceRequest = {
  id: string;
  room_id: string;
  requested_by: string;
  target_user_id?: string | null;
  dice_count?: number;
  dice_sides: number;
  reason: string;
  visibility: "public" | "private";
  status: "pending" | "rolled";
  result?: number | null;
  created_at: string;
  rolled_at?: string | null;
};

export type RoomPresence = {
  room_id: string;
  user_id: string;
  display_name: string;
  role: UserRole;
  last_seen_at: string;
};

export type RoomTyping = {
  room_id: string;
  user_id: string;
  display_name: string;
  channel: MessageChannel | "private";
  recipient_user_id?: string | null;
  updated_at: string;
};

export type MediaAsset = {
  id: string;
  room_id: string;
  title: string;
  asset_type: MediaAssetType;
  url: string;
  tags?: string[];
  created_by?: string | null;
  owner_id?: string | null;
  visibility?: MediaAssetVisibility;
  approval_status?: MediaAssetApprovalStatus;
  file_size?: number;
  mime_type?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  description?: string;
  created_at: string;
};

export type NarrativeMap = {
  id: string;
  campaign_id?: string | null;
  room_id: string;
  parent_map_id?: string | null;
  title: string;
  description: string;
  image_url: string;
  level_type: MapLevelType;
  is_active: boolean;
  is_visible_to_players: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type MapHotspot = {
  id: string;
  map_id: string;
  title: string;
  description: string;
  type: MapHotspotType;
  icon: string;
  color: string;
  x: number;
  y: number;
  target_map_id?: string | null;
  target_scene_id?: string | null;
  target_audio_id?: string | null;
  target_event_id?: string | null;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type MapCharacterPosition = {
  id: string;
  map_id: string;
  character_id: string;
  x: number;
  y: number;
  narrative_location: string;
  is_visible_to_players: boolean;
  is_locked: boolean;
  updated_at: string;
};

export type MapNpcMarker = {
  id: string;
  map_id: string;
  npc_id: string;
  x: number;
  y: number;
  is_visible_to_players: boolean;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

export type MapCustomMarker = {
  id: string;
  map_id: string;
  title: string;
  description: string;
  type: MapMarkerType;
  icon: string;
  color: string;
  x: number;
  y: number;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type MapFogArea = {
  id: string;
  map_id: string;
  shape_type: "rect" | "circle" | "polygon";
  shape_data: Record<string, unknown>;
  is_revealed: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type MapEvent = {
  id: string;
  map_id: string;
  title: string;
  description: string;
  type: string;
  trigger_type: "manual" | "hotspot" | "zone";
  target_scene_id?: string | null;
  target_audio_id?: string | null;
  payload?: Record<string, unknown>;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type ActionLogEntry = {
  id: string;
  label: string;
  detail?: string;
  created_at: string;
};

export type RoomState = {
  profile: Profile;
  campaigns: Campaign[];
  room: Room;
  scene: Scene;
  scenes: Scene[];
  characters: Character[];
  npcs: Npc[];
  messages: Message[];
  privateMessages: Message[];
  offMessages: Message[];
  diceRequests: DiceRequest[];
  audioTracks: AudioTrack[];
  soundEffects: SoundEffect[];
  mediaAssets: MediaAsset[];
  presence: RoomPresence[];
  typing: RoomTyping[];
  inventory: InventoryItem[];
  notes: PlayerNote[];
  maps: NarrativeMap[];
  mapHotspots: MapHotspot[];
  mapCharacterPositions: MapCharacterPosition[];
  mapNpcMarkers: MapNpcMarker[];
  mapCustomMarkers: MapCustomMarker[];
  mapFogAreas: MapFogArea[];
  mapEvents: MapEvent[];
  hasOlderMessages?: boolean;
};
