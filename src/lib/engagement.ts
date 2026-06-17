import type { RoomState } from "@/lib/types";

export type EngagementMilestone = {
  id: string;
  label: string;
  detail: string;
  unlocked: boolean;
};

export type EngagementSummary = {
  score: number;
  unlocked: number;
  total: number;
  headline: string;
  milestones: EngagementMilestone[];
};

export function buildMasterEngagement(state: RoomState): EngagementSummary {
  const publicMessages = state.messages.filter((message) => !message.content.startsWith("__gdr_map_sync__:"));
  const visibleMaps = state.maps.filter((map) => map.is_visible_to_players);
  const hasAudio = Boolean(state.room.current_audio_id) || state.audioTracks.length > 1;
  const hasSpotlight = Boolean(state.room.spotlight_npc_id);

  const milestones: EngagementMilestone[] = [
    { id: "cast", label: "Cast pronto", detail: "Almeno un giocatore e entrato nella stanza.", unlocked: state.characters.length > 0 },
    { id: "scene", label: "Scena viva", detail: "La scena iniziale ha titolo, immagine o descrizione.", unlocked: Boolean(state.scene.title && (state.scene.image_url || state.scene.description)) },
    { id: "archive", label: "Registro vivo", detail: "La chat GDR contiene almeno tre messaggi narrativi.", unlocked: publicMessages.length >= 3 },
    { id: "audio", label: "Atmosfera", detail: "Audio o soundbar pronti per accompagnare il tavolo.", unlocked: hasAudio || state.soundEffects.length > 0 },
    { id: "map", label: "Orientamento", detail: "Almeno una mappa visibile ai giocatori.", unlocked: visibleMaps.length > 0 },
    { id: "spotlight", label: "Regia scenica", detail: "Un PNG o focus narrativo e stato messo in spotlight.", unlocked: hasSpotlight }
  ];

  return summarize(milestones, "Retention Master");
}

export function buildPlayerEngagement(state: RoomState, currentCharacterId?: string, inventoryCount = 0, privateCount = 0): EngagementSummary {
  const character = currentCharacterId ? state.characters.find((item) => item.id === currentCharacterId) : undefined;
  const playerMessages = state.messages.filter((message) => message.sender_user_id === state.profile.id);
  const visibleMaps = state.maps.filter((map) => map.is_visible_to_players);
  const rolledDice = state.diceRequests.some((request) => request.target_user_id === state.profile.id && request.status === "rolled");

  const milestones: EngagementMilestone[] = [
    { id: "identity", label: "Identita pronta", detail: "Scheda personaggio completata.", unlocked: Boolean(character?.is_setup_complete) },
    { id: "voice", label: "Voce in scena", detail: "Hai scritto almeno un messaggio GDR.", unlocked: playerMessages.length > 0 },
    { id: "dialogue", label: "Dialogo", detail: "Hai partecipato con almeno tre interventi.", unlocked: playerMessages.length >= 3 },
    { id: "map", label: "Mappa consultabile", detail: "La sessione ha una mappa visibile.", unlocked: visibleMaps.length > 0 },
    { id: "gear", label: "Equipaggiamento", detail: "Hai almeno un oggetto nello zaino.", unlocked: inventoryCount > 0 },
    { id: "secret", label: "Segreto attivo", detail: "Hai ricevuto o inviato sussurri privati.", unlocked: privateCount > 0 },
    { id: "dice", label: "Destino tirato", detail: "Hai risolto almeno una richiesta dado.", unlocked: rolledDice }
  ];

  return summarize(milestones, "Retention Giocatore");
}

function summarize(milestones: EngagementMilestone[], headline: string): EngagementSummary {
  const unlocked = milestones.filter((item) => item.unlocked).length;
  const score = Math.round((unlocked / milestones.length) * 100);
  return { score, unlocked, total: milestones.length, headline, milestones };
}
