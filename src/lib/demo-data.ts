import type { RoomState } from "@/lib/types";

const now = new Date().toISOString();

export const demoRoomState: RoomState = {
  profile: {
    id: "user-master",
    email: "master@example.com",
    username: "Mastro della Cenere",
    role: "master"
  },
  campaigns: [
    {
      id: "campaign-1",
      master_id: "user-master",
      title: "Le Candele di Veyr",
      description: "Un mistero gotico tra pioggia, rovine e promesse mai mantenute.",
      genre: "Dark fantasy investigativo",
      cover_image_url:
        "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1400&q=80",
      status: "active",
      created_at: now
    }
  ],
  room: {
    id: "room-1",
    campaign_id: "campaign-1",
    name: "Sessione 03 - La Serra Chiusa",
    invite_code: "VEY-R03",
    max_players: 4,
    current_scene_id: "scene-1",
    current_audio_id: "audio-1",
    current_sound_effect_id: null,
    sound_effect_started_at: null
  },
  scene: {
    id: "scene-1",
    room_id: "room-1",
    title: "La Serra Chiusa",
    description: "Vetri appannati, piante nere e una porta sigillata da cera rossa.",
    image_url:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=85",
    media_type: "image",
    video_url: null,
    loop_video: true,
    visibility: "public",
    visible_user_ids: [],
    created_by: "user-master",
    created_at: now
  },
  scenes: [
    {
      id: "scene-1",
      room_id: "room-1",
      title: "La Serra Chiusa",
      description: "Vetri appannati, piante nere e una porta sigillata da cera rossa.",
      image_url:
        "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=85",
      media_type: "image",
      video_url: null,
      loop_video: true,
      visibility: "public",
      visible_user_ids: [],
      created_by: "user-master",
      created_at: now
    },
    {
      id: "scene-2",
      room_id: "room-1",
      title: "Il Corridoio delle Maschere",
      description: "Ogni maschera sembra girarsi un istante dopo il vostro passaggio.",
      image_url:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      media_type: "image",
      video_url: null,
      loop_video: true,
      visibility: "public",
      visible_user_ids: [],
      created_by: "user-master",
      created_at: now
    }
  ],
  characters: [
    {
      id: "char-1",
      room_id: "room-1",
      user_id: "user-alaric",
      character_name: "Alaric",
      character_surname: "Voss",
      portrait_url:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
      color: "#f59e0b",
      hp: 12,
      mental_state: "Teso",
      public_background: "Ex medico militare, conosce bene le ferite che non smettono di parlare.",
      visible_status: "ferito",
      conditions: ["ferito"]
    },
    {
      id: "char-2",
      room_id: "room-1",
      user_id: "user-mira",
      character_name: "Mira",
      character_surname: "Hale",
      portrait_url:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
      color: "#38bdf8",
      hp: 15,
      mental_state: "Lucida",
      public_background: "Archivista del Collegio, memorizza stemmi e menzogne con la stessa cura.",
      visible_status: "stabile",
      conditions: ["stabile"]
    },
    {
      id: "char-3",
      room_id: "room-1",
      user_id: "user-oren",
      character_name: "Oren",
      character_surname: "Vale",
      portrait_url:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
      color: "#a78bfa",
      hp: 9,
      mental_state: "In allerta",
      public_background: "Cacciatore di reliquie, sorride solo quando una serratura cede.",
      visible_status: "esausto",
      conditions: ["esausto"]
    },
    {
      id: "char-4",
      room_id: "room-1",
      user_id: "user-selene",
      character_name: "Selene",
      character_surname: "Mourne",
      portrait_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
      color: "#fb7185",
      hp: 11,
      mental_state: "Scossa",
      public_background: "Medium riluttante, sente le stanze prima ancora di entrarci.",
      visible_status: "sotto shock",
      conditions: ["sotto shock"]
    }
  ],
  npcs: [
    {
      id: "npc-1",
      room_id: "room-1",
      name: "Eldric il Custode",
      color: "#84cc16",
      description: "Custode della villa, pallido e troppo attento alle finestre.",
      portrait_url:
        "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: "npc-2",
      room_id: "room-1",
      name: "Madama Veyr",
      color: "#e879f9",
      description: "Padrona di casa, parla come se ogni frase fosse gia stata incisa.",
      portrait_url:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80"
    }
  ],
  messages: [
    {
      id: "msg-1",
      room_id: "room-1",
      sender_user_id: "user-master",
      sender_type: "master",
      sender_display_name: "Master",
      sender_color: "#c8a35d",
      content: "Il vento spegne improvvisamente tutte le candele nella serra.",
      is_private: false,
      channel: "gdr",
      is_pinned: true,
      edited_at: null,
      created_at: now
    },
    {
      id: "msg-2",
      room_id: "room-1",
      sender_user_id: "user-alaric",
      sender_type: "player",
      sender_display_name: "Alaric Voss",
      sender_color: "#f59e0b",
      content: "Non mi piace questo silenzio...",
      is_private: false,
      channel: "gdr",
      is_pinned: false,
      edited_at: null,
      created_at: now
    },
    {
      id: "msg-3",
      room_id: "room-1",
      sender_user_id: "user-master",
      sender_type: "npc",
      sender_display_name: "Eldric il Custode",
      sender_color: "#84cc16",
      npc_id: "npc-1",
      content: "Avete fatto bene a non aprire quella porta.",
      is_private: false,
      channel: "gdr",
      is_pinned: false,
      edited_at: null,
      created_at: now
    }
  ],
  privateMessages: [
    {
      id: "priv-1",
      room_id: "room-1",
      sender_user_id: "user-master",
      sender_type: "master",
      sender_display_name: "Sussurro del Master",
      sender_color: "#c8a35d",
      content: "Solo tu noti una figura immobile dietro la finestra.",
      is_private: true,
      channel: "gdr",
      recipient_user_id: "user-mira",
      is_pinned: false,
      edited_at: null,
      created_at: now
    }
  ],
  offMessages: [],
  diceRequests: [],
  audioTracks: [
    {
      id: "audio-1",
      room_id: "room-1",
      title: "Pioggia sulla serra",
      audio_url: "",
      loop: true
    },
    {
      id: "audio-2",
      room_id: "room-1",
      title: "Archivi sotto la villa",
      audio_url: "",
      loop: true
    }
  ],
  soundEffects: [
    {
      id: "sound-1",
      room_id: "room-1",
      title: "Porta che scricchiola",
      audio_url: "",
      loop: false,
      created_at: now
    }
  ],
  mediaAssets: [],
  presence: [],
  typing: [],
  inventory: [
    {
      id: "item-1",
      character_id: "char-1",
      name: "Lanterna incrinata",
      description: "La fiamma diventa blu vicino a cera consacrata.",
      quantity: 1,
      is_public: true,
      master_notes: "Reagisce alla stanza sigillata.",
      player_notes: "Da provare accanto alla porta."
    },
    {
      id: "item-2",
      character_id: "char-1",
      name: "Lettera senza firma",
      description: "Carta ruvida, odore di fumo e una macchia scura sul bordo.",
      quantity: 1,
      is_public: false,
      master_notes: "Indizio sul padre di Selene.",
      player_notes: ""
    }
  ],
  notes: [
    {
      id: "note-1",
      character_id: "char-1",
      title: "Sospetti",
      content: "Eldric sa della porta. Madama Veyr evita di guardare la serra.",
      updated_at: now
    }
  ],
  maps: [
    {
      id: "map-1",
      campaign_id: "campaign-1",
      room_id: "room-1",
      parent_map_id: null,
      title: "Tenuta Veyr",
      description: "La serra, la villa e i sentieri sommersi dalla pioggia.",
      image_url: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1800&q=85",
      level_type: "building",
      is_active: true,
      is_visible_to_players: true,
      created_by: "user-master",
      created_at: now,
      updated_at: now
    },
    {
      id: "map-2",
      campaign_id: "campaign-1",
      room_id: "room-1",
      parent_map_id: "map-1",
      title: "Serra Chiusa",
      description: "Vetri appannati, file di piante nere e una porta sigillata.",
      image_url: "https://images.unsplash.com/photo-1563950708942-db5d9dcca7d7?auto=format&fit=crop&w=1800&q=85",
      level_type: "room",
      is_active: false,
      is_visible_to_players: false,
      created_by: "user-master",
      created_at: now,
      updated_at: now
    }
  ],
  mapHotspots: [
    {
      id: "hotspot-1",
      map_id: "map-1",
      title: "Ingresso serra",
      description: "Apre la sottomappa della serra.",
      type: "map",
      icon: "Door",
      color: "#f59e0b",
      x: 62,
      y: 48,
      target_map_id: "map-2",
      target_scene_id: "scene-1",
      target_audio_id: null,
      target_event_id: null,
      is_visible_to_players: true,
      created_at: now,
      updated_at: now
    }
  ],
  mapCharacterPositions: [
    {
      id: "map-pos-1",
      map_id: "map-1",
      character_id: "char-1",
      x: 32,
      y: 56,
      narrative_location: "Tenuta Veyr > Serra",
      is_visible_to_players: true,
      is_locked: false,
      updated_at: now
    },
    {
      id: "map-pos-2",
      map_id: "map-1",
      character_id: "char-2",
      x: 42,
      y: 61,
      narrative_location: "Tenuta Veyr > Serra",
      is_visible_to_players: true,
      is_locked: false,
      updated_at: now
    }
  ],
  mapNpcMarkers: [
    {
      id: "npc-marker-1",
      map_id: "map-1",
      npc_id: "npc-1",
      x: 70,
      y: 42,
      is_visible_to_players: false,
      status: "nascosto",
      created_at: now,
      updated_at: now
    }
  ],
  mapCustomMarkers: [
    {
      id: "marker-1",
      map_id: "map-1",
      title: "Porta sigillata",
      description: "Cera rossa ancora calda.",
      type: "clue",
      icon: "Seal",
      color: "#ef4444",
      x: 79,
      y: 51,
      is_visible_to_players: true,
      created_at: now,
      updated_at: now
    }
  ],
  mapFogAreas: [],
  mapEvents: []
};
