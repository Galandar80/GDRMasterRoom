"use client";

import { Activity, ArrowLeft, AudioLines, Bell, Check, ChevronDown, ChevronUp, Eye, EyeOff, Film, ImageUp, Library, ListOrdered, MapPinned, MessageSquareText, Pause, Pencil, Play, Plus, Radio, Save, ScrollText, Send, Shield, Sparkles, Square, Trash2, UsersRound, Volume2, VolumeX, X, SlidersHorizontal } from "lucide-react";
import type React from "react";
import { useMemo, useState, useEffect } from "react";
import type { AudioTrack, InventoryItem, MapCharacterPosition, MediaAsset, Message, NarrativeMap, Npc, RoomState, Scene, SceneMediaType, SceneVisibility, SoundEffect } from "@/lib/types";
import { AudioPlayer } from "@/components/room/audio-player";
import { ChatPanel } from "@/components/room/chat-panel";
import { SceneStage } from "@/components/room/scene-stage";
import { SoundEffectPlayer } from "@/components/room/sound-effect-player";
import { ExportChatButton, OffChatPanel, PrivateThreadsPanel } from "@/components/room/social-panels";
import { DiceRequestPanel, SpotlightManager, SpotlightPanel } from "@/components/room/dice-and-spotlight";
import { MapToolPanel } from "@/components/room/map-tool-panel";
import type { CardDeckType } from "@/lib/game-random";
import { shortTime } from "@/lib/utils";
import { parseCharacterMetadata, stringifyCharacterMetadata } from "@/lib/character-metadata";
import { playUiClick, playUiHover } from "@/lib/sound-generator";
import { buildMasterNotifications, notificationBadgeCount, notificationReadKey, notificationToneClass, readSeenNotificationKeys, writeSeenNotificationKeys, type SmartNotification } from "@/lib/notifications";
import { buildMasterEngagement } from "@/lib/engagement";


type MasterControlRoomProps = {
  state: RoomState;
  identityId: string;
  currentAudio: AudioTrack;
  onBack: () => void;
  onOpenPlayerView: () => void;
  onIdentityChange: (id: string) => void;
  onPublicMessage: (content: string) => void;
  onOffMessage: (content: string) => void;
  onPrivateMessage: (content: string, userId: string) => void;
  onTyping: (channel: "gdr" | "off" | "private", recipientUserId?: string | null) => void;
  onDeleteMessage: (message: Message) => void;
  onEditMessage: (message: Message, content: string) => void;
  onToggleMessagePin: (message: Message) => void;
  onSceneChange: (scene: Scene) => void;
  onAudioChange: (track: AudioTrack) => void;
  onCreateScene: (values: {
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
  }) => void | Promise<void>;
  onUpdateScene: (
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
  ) => void | Promise<void>;
  onDeleteScene: (scene: Scene) => void | Promise<void>;
  onCreateAudio: (values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) => void | Promise<void>;
  onDeleteAudio: (track: AudioTrack) => void | Promise<void>;
  onCreateSoundEffect: (values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) => void | Promise<void>;
  onDeleteSoundEffect: (effect: SoundEffect) => void | Promise<void>;
  onTriggerSoundEffect: (effect: SoundEffect) => void | Promise<void>;
  onStopSoundEffect: () => void | Promise<void>;
  onCreateNpc: (values: { name: string; color: string; description: string; portraitUrl: string; portraitFile?: File }) => void | Promise<void>;
  onDeleteNpc: (npc: Npc) => void | Promise<void>;
  onCreateInventoryItem: (characterId: string, values: { name: string; description: string; quantity: number; imageUrl: string; isPublic: boolean; masterNotes: string }) => void | Promise<void>;
  onDeleteInventoryItem: (item: InventoryItem) => void | Promise<void>;
  onUpdateChatPermissions: (values: { chatEnabled: boolean; mutedUserIds: string[] }) => void | Promise<void>;
  onSaveRoomTurnState: (values: { turnEnabled: boolean; turnOrder: string[]; currentTurnIndex: number }) => void | Promise<void>;
  onSaveRoomAudioState: (values: { audioStatus: string; audioVolume: number }) => void | Promise<void>;
  onCreateDiceRequest: (values: { diceCount?: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }) => void | Promise<void>;
  onDrawCard: (values: { deck: CardDeckType; targetUserId?: string | null; visibility: "public" | "private"; reason: string }) => void | Promise<void>;
  onUpdateSpotlight: (values: { npcId: string | null; visibility: "off" | "public" | "private"; userIds: string[] }) => void | Promise<void>;
  onUpdateCharacter: (
    characterId: string,
    values: { characterName: string; characterSurname: string; portraitUrl: string; portraitFile?: File; color: string; hp: number; mentalState: string; visibleStatus: string; publicBackground: string; conditions: string }
  ) => void | Promise<void>;
  onDeleteCharacter: (characterId: string) => void | Promise<void>;
  reusableMediaAssets?: MediaAsset[];
  onCreateMediaAsset: (values: { title: string; assetType: MediaAsset["asset_type"]; url: string; tags: string[]; file?: File; visibility?: MediaAsset["visibility"] }) => void | Promise<void>;
  onUpdateMediaAssetVisibility: (asset: MediaAsset, visibility: MediaAsset["visibility"]) => void | Promise<void>;
  onDeleteMediaAsset: (asset: MediaAsset) => void | Promise<void>;
  onCreateMap: (values: { title: string; description: string; imageUrl: string; imageFile?: File; parentMapId?: string | null; levelType: NarrativeMap["level_type"]; isVisibleToPlayers: boolean }) => void | Promise<void>;
  onSetActiveMap: (map: NarrativeMap) => void | Promise<void>;
  onDeleteMap: (map: NarrativeMap) => void | Promise<void>;
  onDuplicateMap: (map: NarrativeMap) => void | Promise<void>;
  onUpdateMapCharacterPosition: (position: MapCharacterPosition, values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }) => void | Promise<void>;
  onCreateMapFogArea: (values: { mapId: string; shapeType: "rect" | "circle" | "polygon"; shapeData: Record<string, any>; isRevealed: boolean }) => void | Promise<void>;
  onUpdateMapFogArea: (id: string, values: { shapeData: Record<string, any>; isRevealed: boolean }) => void | Promise<void>;
  onDeleteMapFogArea: (id: string) => void | Promise<void>;
  onLoadOlderMessages: () => void;
  onExportMessages: () => Promise<Message[]>;
  onQuickCue: (cueId: string, tone: string, message: string) => void | Promise<void>;
  actionLog: { id: string; label: string; detail?: string; created_at: string }[];
  onSaveRoom: () => void;
  onDeleteRoom: () => void;
};

type ControlTool = "preview" | "scenes" | "map" | "chat" | "players" | "audio" | "media" | "inventory";

export function MasterControlRoom({
  state,
  identityId,
  currentAudio,
  onBack,
  onOpenPlayerView,
  onIdentityChange,
  onPublicMessage,
  onOffMessage,
  onPrivateMessage,
  onTyping,
  onDeleteMessage,
  onEditMessage,
  onToggleMessagePin,
  onSceneChange,
  onAudioChange,
  onCreateScene,
  onUpdateScene,
  onDeleteScene,
  onCreateAudio,
  onDeleteAudio,
  onCreateSoundEffect,
  onDeleteSoundEffect,
  onTriggerSoundEffect,
  onStopSoundEffect,
  onCreateNpc,
  onDeleteNpc,
  onCreateInventoryItem,
  onDeleteInventoryItem,
  onUpdateChatPermissions,
  onSaveRoomTurnState,
  onSaveRoomAudioState,
  onCreateDiceRequest,
  onDrawCard,
  onUpdateSpotlight,
  onUpdateCharacter,
  onDeleteCharacter,
  reusableMediaAssets = [],
  onCreateMediaAsset,
  onUpdateMediaAssetVisibility,
  onDeleteMediaAsset,
  onCreateMap,
  onSetActiveMap,
  onDeleteMap,
  onDuplicateMap,
  onUpdateMapCharacterPosition,
  onCreateMapFogArea,
  onUpdateMapFogArea,
  onDeleteMapFogArea,
  onLoadOlderMessages,
  onExportMessages,
  onQuickCue,
  actionLog,
  onSaveRoom,
  onDeleteRoom
}: MasterControlRoomProps) {
  const [activeTool, setActiveTool] = useState<ControlTool>("preview");
  const [masterChatText, setMasterChatText] = useState("");
  const [offText, setOffText] = useState("");
  const [isSoundbarOpen, setIsSoundbarOpen] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number>(55);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [showNextSteps, setShowNextSteps] = useState(true);
  const [isMobileRightRailOpen, setIsMobileRightRailOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVol = localStorage.getItem("gdr_master_local_volume");
      const savedMuted = localStorage.getItem("gdr_master_local_muted");
      if (savedVol !== null) setAudioVolume(Number(savedVol));
      if (savedMuted !== null) setAudioMuted(savedMuted === "true");
    }
  }, []);

  const handleLocalVolumeChange = (vol: number) => {
    setAudioVolume(vol);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_master_local_volume", String(vol));
    }
  };

  const handleLocalMutedChange = (muted: boolean) => {
    setAudioMuted(muted);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_master_local_muted", String(muted));
    }
  };

  const sessionMediaAssets = useMemo(() => buildSessionMediaAssets(state), [state]);
  const libraryMediaAssets = useMemo(() => mergeMediaAssets(sessionMediaAssets, reusableMediaAssets), [sessionMediaAssets, reusableMediaAssets]);
  const sendMasterChat = (text?: string) => {
    const msg = text || masterChatText;
    if (!msg.trim()) return;
    onPublicMessage(msg.trim());
    setMasterChatText("");
  };
  const launchQuickCue = (cue: DirectorCue) => {
    onQuickCue(cue.id, cue.tone, cue.message);
  };

  return (
    <section className={`director-control-room relative -m-4 grid min-h-screen gap-4 overflow-hidden px-4 py-4 sm:-m-6 sm:px-5 sm:py-5 ${immersiveMode ? "is-immersive" : ""}`}>
      <div className="pointer-events-none absolute inset-0 app-theme-bg bg-cover bg-center opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_20%,rgba(147,51,234,0.18),transparent_32rem),linear-gradient(90deg,rgba(2,3,7,0.82),rgba(3,4,9,0.62)_48%,rgba(2,3,7,0.88)),linear-gradient(180deg,rgba(0,0,0,0.25),rgba(0,0,0,0.78))]" />
      <header className="director-card relative z-10 rounded-xl p-4 glass-panel">
        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {/* Left panel: Info & Scene */}
          <div className="flex gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="director-icon-button h-10 w-10 shrink-0 self-start mt-1"
              title="Torna al menu"
              aria-label="Torna al menu"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="director-kicker">
                    <Radio size={13} /> Cabina di regia
                  </span>
                  <span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    Sessione Live
                  </span>
                </div>
                <h1 className="mt-1.5 truncate font-serif text-2xl text-stone-100">{state.campaigns[0].title}</h1>
                <p className="mt-0.5 text-xs text-stone-300">
                  {state.room.name} · codice <span className="font-mono text-ember-100">{state.room.invite_code}</span>
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-2 border-t border-white/5 pt-2">
                <span className="text-[10px] uppercase font-bold text-brass tracking-wider">Scena Attiva:</span>
                <span className="truncate text-xs font-medium text-stone-200">{state.scene.title}</span>
              </div>
            </div>
          </div>

          {/* Middle panel: Audio */}
          <div className="border-t border-white/10 pt-3 md:border-t-0 md:border-l md:border-white/10 md:pt-0 md:pl-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-brass tracking-wider flex items-center gap-1">
                <AudioLines size={12} /> Audio Attuale
              </span>
              <button
                type="button"
                onClick={() => setActiveTool("audio")}
                className="text-[10px] uppercase font-bold text-ember-200 hover:text-ember-100"
              >
                Gestisci
              </button>
            </div>
            <div className="my-1.5 flex items-center gap-2.5 rounded-lg bg-black/30 p-2 min-h-[3rem]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-100">
                <AudioLines size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-xs text-stone-100">{currentAudio.title}</strong>
                <small className="text-[10px] text-emerald-300">
                  {state.room.audio_status === "playing" ? "In riproduzione" : state.room.audio_status === "paused" ? "In pausa" : "Fermato"}
                </small>
              </div>
            </div>

            {/* Pulsanti Controllo Master e Volume */}
            <div className="flex items-center justify-between gap-3 my-1 border-t border-b border-white/5 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Play globale"
                  onClick={() => onSaveRoomAudioState({ audioStatus: "playing", audioVolume: state.room.audio_volume ?? 55 })}
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/10 hover:bg-white/10 transition ${state.room.audio_status === "playing" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/35" : "bg-white/[0.02] text-stone-400"}`}
                >
                  <Play size={10} fill={state.room.audio_status === "playing" ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  title="Pausa globale"
                  onClick={() => onSaveRoomAudioState({ audioStatus: "paused", audioVolume: state.room.audio_volume ?? 55 })}
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/10 hover:bg-white/10 transition ${state.room.audio_status === "paused" ? "bg-amber-500/20 text-amber-300 border-amber-500/35" : "bg-white/[0.02] text-stone-400"}`}
                >
                  <Pause size={10} />
                </button>
                <button
                  type="button"
                  title="Stop globale"
                  onClick={() => onSaveRoomAudioState({ audioStatus: "stopped", audioVolume: state.room.audio_volume ?? 55 })}
                  className={`flex h-6 w-6 items-center justify-center rounded border border-white/10 hover:bg-white/10 transition ${state.room.audio_status === "stopped" ? "bg-rose-500/20 text-rose-300 border-rose-500/35" : "bg-white/[0.02] text-stone-400"}`}
                >
                  <Square size={10} fill={state.room.audio_status === "stopped" ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-1 max-w-[110px]">
                <Volume2 size={11} className="text-stone-400" />
                <input
                  aria-label="Volume Master"
                  type="range"
                  min="0"
                  max="100"
                  value={state.room.audio_volume ?? 55}
                  onChange={(e) => {
                    onSaveRoomAudioState({
                      audioStatus: state.room.audio_status ?? "playing",
                      audioVolume: Number(e.target.value)
                    });
                  }}
                  className="w-full h-1 accent-brass bg-stone-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {state.audioTracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onAudioChange(track)}
                  className={`min-w-[70px] max-w-[150px] truncate rounded bg-white/[0.04] border border-white/5 px-2 py-1 text-center text-[10px] text-stone-300 hover:border-ember-400/35 hover:bg-ember-500/10 transition ${track.id === currentAudio.id ? "border-ember-400/30 text-ember-100 bg-ember-500/5" : ""}`}
                >
                  {track.title}
                </button>
              ))}
            </div>
          </div>


          {/* Right panel: Timeline sessione */}
          <div className="border-t border-white/10 pt-3 md:border-t-0 md:border-l md:border-white/10 md:pt-0 md:pl-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-brass tracking-wider flex items-center gap-1">
                <ScrollText size={12} /> Timeline sessione
              </span>
            </div>
            <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[4.5rem] pr-1 scrollbar-soft">
              {(() => {
                const recentMessages = [...state.messages, ...state.offMessages, ...state.privateMessages]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 3);
                const timelineItems = [
                  { id: `scene-${state.scene.id}`, label: "Scena attiva", detail: state.scene.title, created_at: state.scene.created_at },
                  ...actionLog.slice(0, 3),
                  ...recentMessages.map((message) => ({
                    id: message.id,
                    label: message.is_private ? "Sussurro" : message.channel === "off" ? "OFF GDR" : message.sender_display_name,
                    detail: message.content,
                    created_at: message.created_at
                  }))
                ]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 3);

                return timelineItems.map((item) => (
                  <div key={item.id} className="flex gap-2 text-[10px] leading-relaxed text-stone-400">
                    <time className="text-stone-500 shrink-0 font-mono">{shortTime(item.created_at)}</time>
                    <span className="truncate flex-1">
                      <strong className="text-stone-300 font-medium">{item.label}</strong>: {item.detail}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
        <span className="mysterium-corners-br" />
      </header>
      <div className="relative z-10">
        <DirectorStatusBar state={state} currentAudio={currentAudio} actionLog={actionLog} />
      </div>

      <div className={`director-workbench relative z-10 grid gap-4 ${immersiveMode ? "grid-cols-1" : "2xl:grid-cols-[16rem_minmax(0,1fr)_25rem]"}`}>
        {!immersiveMode && (
          <nav className="director-sidebar hidden 2xl:block rounded-xl p-3 glass-panel" aria-label="Strumenti Master">
            <p className="px-3 pb-3 font-serif text-xs uppercase tracking-[0.28em] text-brass/80">Strumenti</p>
            <ControlLink icon={<Eye size={16} />} label="Panoramica" active={activeTool === "preview"} onClick={() => setActiveTool("preview")} />
            <ControlLink icon={<ImageUp size={16} />} label="Scene" active={activeTool === "scenes"} onClick={() => setActiveTool("scenes")} />
            <ControlLink icon={<MapPinned size={16} />} label="Mappa" active={activeTool === "map"} onClick={() => setActiveTool("map")} />
            <ControlLink icon={<MessageSquareText size={16} />} label="Chat e NPC" active={activeTool === "chat"} onClick={() => setActiveTool("chat")} />
            <ControlLink icon={<UsersRound size={16} />} label="Giocatori" active={activeTool === "players"} onClick={() => setActiveTool("players")} />
            <ControlLink icon={<AudioLines size={16} />} label="Audio" active={activeTool === "audio"} onClick={() => setActiveTool("audio")} />
            <ControlLink icon={<Volume2 size={16} />} label="Soundbar" active={isSoundbarOpen} onClick={() => setIsSoundbarOpen(true)} />
            <ControlLink icon={<Library size={16} />} label="Libreria media" active={activeTool === "media"} onClick={() => setActiveTool("media")} />
            <ControlLink icon={<Shield size={16} />} label="Inventari" active={activeTool === "inventory"} onClick={() => setActiveTool("inventory")} />
            <span className="mysterium-corners-br" />
          </nav>
        )}

        <div className="grid min-w-0 gap-4">
          {activeTool === "preview" ? (
            <div className="director-overview grid gap-4">
              {showNextSteps ? (
                <DirectorNextStepsPanel
                  state={state}
                  currentAudio={currentAudio}
                  onOpenTool={setActiveTool}
                  onOpenPlayerView={onOpenPlayerView}
                  onHide={() => setShowNextSteps(false)}
                />
              ) : (
                <button
                  type="button"
                  onMouseEnter={playUiHover}
                  onClick={() => {
                    playUiClick();
                    setShowNextSteps(true);
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brass/25 bg-brass/10 px-4 py-3 font-serif text-xs font-bold uppercase tracking-[0.16em] text-brass transition hover:bg-brass/15"
                >
                  <Sparkles size={15} /> Mostra prossime mosse
                </button>
              )}

              <ChatPanel
                messages={state.messages}
                value={masterChatText}
                onChange={setMasterChatText}
                onSend={sendMasterChat}
                onTyping={() => onTyping("gdr")}
                onDeleteMessage={onDeleteMessage}
                onEditMessage={onEditMessage}
                onTogglePin={onToggleMessagePin}
                onLoadOlder={onLoadOlderMessages}
                hasOlderMessages={state.hasOlderMessages}
                currentUserId={state.profile.id}
                isMaster
                characters={state.characters}
                npcs={state.npcs}
                showAvatars
                typing={state.typing}
                diceRequests={state.diceRequests}
                identityId={identityId}
                onIdentityChange={onIdentityChange}
              />
              
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid gap-4">
                  <SpotlightPanel room={state.room} npcs={state.npcs} currentUserId={state.profile.id} />
                  <CharactersPanel state={state} />
                </div>
                <div className="grid gap-4">
                  <SoundEffectPlayer room={state.room} soundEffects={state.soundEffects} />
                  <AudioPanel currentAudio={currentAudio} audioTracks={state.audioTracks} onAudioChange={onAudioChange} />
                </div>
              </div>

              <SceneStage
                scene={state.scene}
                compact
                audioVolume={audioVolume}
                audioMuted={audioMuted}
                audioTitle={currentAudio.title}
                onAudioVolumeChange={handleLocalVolumeChange}
                onAudioMutedChange={handleLocalMutedChange}
              />
            </div>
          ) : null}

          {activeTool === "scenes" ? (
            <SceneManager
              state={state}
              onSceneChange={onSceneChange}
              onCreateScene={onCreateScene}
              onUpdateScene={onUpdateScene}
              onDeleteScene={onDeleteScene}
            />
          ) : null}

          {activeTool === "map" ? (
            <MapToolPanel
              state={state}
              isMaster={true}
              onCreateMap={onCreateMap}
              onSetActiveMap={onSetActiveMap}
              onDeleteMap={onDeleteMap}
              onDuplicateMap={onDuplicateMap}
              onUpdateCharacterPosition={onUpdateMapCharacterPosition}
              onCreateMapFogArea={onCreateMapFogArea}
              onUpdateMapFogArea={onUpdateMapFogArea}
              onDeleteMapFogArea={onDeleteMapFogArea}
            />
          ) : null}

          {activeTool === "chat" ? (
            <div className="grid gap-4">
              <ChatPanel
                messages={state.messages}
                value={masterChatText}
                onChange={setMasterChatText}
                onSend={sendMasterChat}
                onTyping={() => onTyping("gdr")}
                onDeleteMessage={onDeleteMessage}
                onEditMessage={onEditMessage}
                onTogglePin={onToggleMessagePin}
                onLoadOlder={onLoadOlderMessages}
                hasOlderMessages={state.hasOlderMessages}
                currentUserId={state.profile.id}
                isMaster
                characters={state.characters}
                npcs={state.npcs}
                showAvatars
                typing={state.typing}
                diceRequests={state.diceRequests}
                identityId={identityId}
                onIdentityChange={onIdentityChange}
              />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
                <div className="grid gap-4">
                  <ChatPermissionsPanel state={state} onUpdateChatPermissions={onUpdateChatPermissions} />
                  <DiceRequestPanel characters={state.characters} onCreate={onCreateDiceRequest} />
                  <ExportChatButton messages={[...state.messages, ...state.offMessages, ...state.privateMessages]} onLoadAll={onExportMessages} />
                  <OffChatPanel
                    messages={state.offMessages}
                    value={offText}
                    onChange={(value) => {
                      setOffText(value);
                      if (value.trim()) onTyping("off");
                    }}
                    onSend={() => {
                      if (!offText.trim()) return;
                      onOffMessage(offText.trim());
                      setOffText("");
                    }}
                    onDeleteMessage={onDeleteMessage}
                  />
                </div>
                <div className="grid gap-4">
                  <PrivateThreadsPanel
                    profile={state.profile}
                    characters={state.characters}
                    messages={state.privateMessages}
                    masterId={state.campaigns[0].master_id}
                    isMaster
                    onSend={onPrivateMessage}
                    onDeleteMessage={onDeleteMessage}
                  />
                  <SpotlightManager room={state.room} npcs={state.npcs} characters={state.characters} onSave={onUpdateSpotlight} />
                  <NpcPanel state={state} onCreateNpc={onCreateNpc} onDeleteNpc={onDeleteNpc} />
                </div>
              </div>
            </div>
          ) : null}

          {activeTool === "players" ? (
            <PlayersManager
              state={state}
              onUpdateCharacter={onUpdateCharacter}
              onDeleteCharacter={onDeleteCharacter}
            />
          ) : null}

          {activeTool === "audio" ? (
            <AudioManager
              currentAudio={currentAudio}
              audioTracks={state.audioTracks}
              onAudioChange={onAudioChange}
              onCreateAudio={onCreateAudio}
              onDeleteAudio={onDeleteAudio}
            />
          ) : null}

          {activeTool === "media" ? (
            <MediaLibraryPanel
              assets={libraryMediaAssets}
              profileId={state.profile.id}
              onCreate={onCreateMediaAsset}
              onUpdateVisibility={onUpdateMediaAssetVisibility}
              onDelete={onDeleteMediaAsset}
            />
          ) : null}

          {activeTool === "inventory" ? (
            <InventoryPanel state={state} onCreateInventoryItem={onCreateInventoryItem} onDeleteInventoryItem={onDeleteInventoryItem} />
          ) : null}
        </div>

        {!immersiveMode && (
          <div className="hidden 2xl:block">
            <DirectorRightRail
              state={state}
              identityId={identityId}
              currentAudio={currentAudio}
              onIdentityChange={onIdentityChange}
              onSceneChange={onSceneChange}
              onAudioChange={onAudioChange}
              onSetActiveMap={onSetActiveMap}
              onUpdateMapCharacterPosition={onUpdateMapCharacterPosition}
              onSaveRoom={onSaveRoom}
              onDeleteRoom={onDeleteRoom}
              onOpenTool={setActiveTool}
              onQuickCue={launchQuickCue}
              onDirectorEvent={(event) => {
                if (event.recipientUserId) {
                  onPrivateMessage(event.message, event.recipientUserId);
                } else {
                  onPublicMessage(event.message);
                }
              }}
              onCreateDiceRequest={onCreateDiceRequest}
              onDrawCard={onDrawCard}
              actionLog={actionLog}
              onSaveRoomTurnState={onSaveRoomTurnState}
            />
          </div>
        )}
      </div>
      <div className="relative z-20">
        <AudioPlayer
          track={currentAudio}
          status={state.room.audio_status}
          onStatusChange={(status) => onSaveRoomAudioState({ audioStatus: status, audioVolume: state.room.audio_volume ?? 55 })}
          externalVolume={audioVolume}
          onVolumeChange={handleLocalVolumeChange}
          externalMuted={audioMuted}
          onMutedChange={handleLocalMutedChange}
        />
      </div>
      {isSoundbarOpen ? (
        <SoundbarModal
          soundEffects={state.soundEffects}
          currentSoundEffectId={state.room.current_sound_effect_id ?? null}
          onClose={() => setIsSoundbarOpen(false)}
          onCreateSoundEffect={onCreateSoundEffect}
          onDeleteSoundEffect={onDeleteSoundEffect}
          onTriggerSoundEffect={onTriggerSoundEffect}
          onStopSoundEffect={onStopSoundEffect}
        />
      ) : null}
      
      {/* Mobile Right Rail Drawer */}
      {!immersiveMode && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 2xl:hidden ${
              isMobileRightRailOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsMobileRightRailOpen(false)}
          />
          {/* Slide-out Panel */}
          <div
            className={`fixed right-0 top-0 bottom-0 z-50 w-[24rem] max-w-[90vw] bg-ink-950/98 border-l border-brass/35 p-4 shadow-2xl transition-transform duration-300 ease-out 2xl:hidden flex flex-col ${
              isMobileRightRailOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-brass/10 pb-3 mb-4 shrink-0">
              <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-brass">Info Sessione</h3>
              <button
                type="button"
                onClick={() => setIsMobileRightRailOpen(false)}
                className="text-stone-400 hover:text-stone-100 text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Chiudi
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 mobile-drawer-scroll">
              <DirectorRightRail
                state={state}
                identityId={identityId}
                currentAudio={currentAudio}
                onIdentityChange={onIdentityChange}
                onSceneChange={onSceneChange}
                onAudioChange={onAudioChange}
                onSetActiveMap={onSetActiveMap}
                onUpdateMapCharacterPosition={onUpdateMapCharacterPosition}
                onSaveRoom={onSaveRoom}
                onDeleteRoom={onDeleteRoom}
                onOpenTool={setActiveTool}
                onQuickCue={launchQuickCue}
                onDirectorEvent={(event) => {
                  if (event.recipientUserId) {
                    onPrivateMessage(event.message, event.recipientUserId);
                  } else {
                    onPublicMessage(event.message);
                  }
                }}
                onCreateDiceRequest={onCreateDiceRequest}
                onDrawCard={onDrawCard}
                actionLog={actionLog}
                onSaveRoomTurnState={onSaveRoomTurnState}
              />
            </div>
          </div>
        </>
      )}

      <MasterActionHotbar
        state={state}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        isSoundbarOpen={isSoundbarOpen}
        setIsSoundbarOpen={setIsSoundbarOpen}
        immersiveMode={immersiveMode}
        onToggleImmersive={() => setImmersiveMode((value) => !value)}
        localVolume={audioVolume}
        localMuted={audioMuted}
        onVolumeChange={handleLocalVolumeChange}
        onMutedChange={handleLocalMutedChange}
        isMobileRightRailOpen={isMobileRightRailOpen}
        onToggleMobileRightRail={() => setIsMobileRightRailOpen((value) => !value)}
      />
    </section>
  );
}

function DirectorTurnManager({
  state,
  onSaveRoomTurnState
}: {
  state: RoomState;
  onSaveRoomTurnState: (values: { turnEnabled: boolean; turnOrder: string[]; currentTurnIndex: number }) => void | Promise<void>;
}) {
  const turnOrder = state.room.turn_order || [];
  const turnEnabled = state.room.turn_enabled || false;
  const currentIndex = state.room.current_turn_index ?? 0;

  const handleToggleTurns = () => {
    const nextEnabled = !turnEnabled;
    let nextOrder = [...turnOrder];
    if (nextEnabled && nextOrder.length === 0) {
      nextOrder = state.characters.map((c) => c.user_id).filter(Boolean);
    }
    onSaveRoomTurnState({
      turnEnabled: nextEnabled,
      turnOrder: nextOrder,
      currentTurnIndex: currentIndex
    });
  };

  const handleResetOrder = () => {
    const defaultOrder = state.characters.map((c) => c.user_id).filter(Boolean);
    onSaveRoomTurnState({
      turnEnabled,
      turnOrder: defaultOrder,
      currentTurnIndex: 0
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newOrder = [...turnOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      onSaveRoomTurnState({
        turnEnabled,
        turnOrder: newOrder,
        currentTurnIndex: currentIndex
      });
    }
  };

  const handleRemove = (userId: string) => {
    const newOrder = turnOrder.filter((uid) => uid !== userId);
    let nextIdx = currentIndex;
    if (nextIdx >= newOrder.length && newOrder.length > 0) {
      nextIdx = newOrder.length - 1;
    }
    onSaveRoomTurnState({
      turnEnabled,
      turnOrder: newOrder,
      currentTurnIndex: nextIdx
    });
  };

  const handleAdd = (userId: string) => {
    const newOrder = [...turnOrder, userId];
    onSaveRoomTurnState({
      turnEnabled,
      turnOrder: newOrder,
      currentTurnIndex: currentIndex
    });
  };

  const handleStep = (step: number) => {
    const len = turnOrder.length;
    if (len === 0) return;
    const nextIdx = (currentIndex + step + len) % len;
    onSaveRoomTurnState({
      turnEnabled,
      turnOrder,
      currentTurnIndex: nextIdx
    });
  };

  return (
    <section className="director-rail-section director-turn-manager">
      <h3 className="director-mini-title flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ListOrdered size={15} /> Turni di gioco
        </span>
      </h3>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-semibold text-stone-300">Turni attivi</span>
        <button
          type="button"
          onClick={handleToggleTurns}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            turnEnabled ? "bg-ember-500" : "bg-stone-700"
          }`}
          aria-label="Attiva turni di gioco"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              turnEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Ordine Turni</span>
          {state.characters.length > 0 && (
            <button
              type="button"
              onClick={handleResetOrder}
              className="text-[10px] text-brass hover:underline uppercase font-bold"
            >
              Reset Ordine
            </button>
          )}
        </div>

        {turnOrder.length === 0 ? (
          <p className="text-xs italic text-stone-500">{"Nessun giocatore nell'ordine. Attiva i turni o premi Reset."}</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-soft">
            {turnOrder.map((userId, idx) => {
              const char = state.characters.find((c) => c.user_id === userId);
              const name = char ? `${char.character_name} ${char.character_surname}`.trim() : "Giocatore";
              const isCurrent = turnEnabled && currentIndex === idx;

              return (
                <div
                  key={userId}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition ${
                    isCurrent
                      ? "border-ember-500/50 bg-ember-500/10 text-white font-medium"
                      : "border-white/5 bg-white/[0.02] text-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-stone-500 w-4">{idx + 1}.</span>
                    <span className="truncate text-xs">{name}</span>
                    {isCurrent && (
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ember-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-0.5 text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Sposta su"
                      aria-label="Sposta su"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === turnOrder.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-0.5 text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Sposta giù"
                      aria-label="Sposta giù"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(userId)}
                      className="p-0.5 text-rose-400 hover:text-rose-300 ml-1"
                      title="Rimuovi"
                      aria-label="Rimuovi"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {turnEnabled && turnOrder.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="flex-1 rounded border border-white/10 bg-white/[0.04] py-1 text-center text-xs text-stone-300 hover:bg-white/[0.08]"
            >
              Precedente
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="flex-1 rounded bg-ember-500 py-1 text-center text-xs font-semibold text-ink-900 hover:bg-ember-400"
            >
              Prossimo Turno
            </button>
          </div>
        )}

        {(() => {
          const currentOrderSet = new Set(turnOrder);
          const missingChars = state.characters.filter((c) => c.user_id && !currentOrderSet.has(c.user_id));
          if (missingChars.length === 0) return null;
          return (
            <div className="mt-3 border-t border-white/5 pt-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">{"Aggiungi all'ordine"}</label>
              <div className="flex flex-wrap gap-1.5">
                {missingChars.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleAdd(char.user_id)}
                    className="rounded-md border border-brass/20 bg-brass/5 px-2 py-0.5 text-[10px] text-brass hover:bg-brass/10 transition"
                  >
                    + {char.character_name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}

function DirectorRightRail({
  state,
  identityId,
  currentAudio,
  onIdentityChange,
  onSceneChange,
  onAudioChange,
  onSetActiveMap,
  onUpdateMapCharacterPosition,
  onSaveRoom,
  onDeleteRoom,
  onOpenTool,
  onQuickCue,
  onDirectorEvent,
  onCreateDiceRequest,
  onDrawCard,
  actionLog,
  onSaveRoomTurnState
}: {
  state: RoomState;
  identityId: string;
  currentAudio: AudioTrack;
  onIdentityChange: (id: string) => void;
  onSceneChange: (scene: Scene) => void;
  onAudioChange: (track: AudioTrack) => void;
  onSetActiveMap: (map: NarrativeMap) => void | Promise<void>;
  onUpdateMapCharacterPosition: (position: MapCharacterPosition, values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }) => void | Promise<void>;
  onSaveRoom: () => void;
  onDeleteRoom: () => void;
  onOpenTool: (tool: ControlTool) => void;
  onQuickCue: (cue: DirectorCue) => void;
  onDirectorEvent: (event: { message: string; recipientUserId?: string | null }) => void;
  onCreateDiceRequest: (values: { diceCount?: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }) => void | Promise<void>;
  onDrawCard: (values: { deck: CardDeckType; targetUserId?: string | null; visibility: "public" | "private"; reason: string }) => void | Promise<void>;
  actionLog: { id: string; label: string; detail?: string; created_at: string }[];
  onSaveRoomTurnState: (values: { turnEnabled: boolean; turnOrder: string[]; currentTurnIndex: number }) => void | Promise<void>;
}) {
  const activeIdentity = identityId === "master" ? "Master / Narratore" : state.npcs.find((npc) => npc.id === identityId)?.name ?? "Master / Narratore";
  const masterAvatar = state.profile.username.slice(0, 1).toUpperCase();

  return (
    <aside className="director-right-rail grid content-start gap-4 rounded-xl p-3 glass-panel">
      {/* 1. Pannello Master */}
      <section className="director-rail-section">
        <h2 className="director-section-title">
          <Sparkles size={15} /> Pannello Master
        </h2>
        <label className="mt-3 block text-xs uppercase tracking-[0.18em] text-stone-500">Scrivi come</label>
        <select className="field mt-2 w-full px-3 py-2 text-sm" value={identityId} onChange={(event) => onIdentityChange(event.target.value)}>
          <option value="master">Master / Narratore</option>
          {state.npcs.map((npc) => (
            <option key={npc.id} value={npc.id}>
              {npc.name}
            </option>
          ))}
        </select>
        <div className="mt-4 flex flex-wrap items-start gap-3 pb-1">
          <button type="button" onClick={() => onIdentityChange("master")} className={`director-identity-token ${identityId === "master" ? "is-active" : ""}`}>
            <span>{masterAvatar}</span>
            <small>Master</small>
          </button>
          {state.npcs.slice(0, 12).map((npc) => (
            <button key={npc.id} type="button" onClick={() => onIdentityChange(npc.id)} className={`director-identity-token ${identityId === npc.id ? "is-active" : ""}`}>
              <span
                className={npc.portrait_url ? "" : "atlas-placeholder atlas-placeholder--npc"}
                style={npc.portrait_url ? { backgroundImage: `url(${npc.portrait_url})` } : undefined}
              />
              <small>{npc.name}</small>
            </button>
          ))}
          <button type="button" onClick={() => onOpenTool("chat")} className="director-identity-token">
            <span>+</span>
            <small>NPC</small>
          </button>
        </div>
        <p className="mt-3 text-xs text-stone-400">Identita attiva: <span className="text-stone-100">{activeIdentity}</span></p>
      </section>

      {/* 2. Mission control */}
      <section className="director-rail-section">
        <h3 className="director-mini-title">Mission control</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <RailAction label="Scene" icon={<ImageUp size={17} />} onClick={() => onOpenTool("scenes")} />
          <RailAction label="Privati" icon={<MessageSquareText size={17} />} onClick={() => onOpenTool("chat")} />
          <RailAction label="Audio" icon={<AudioLines size={17} />} onClick={() => onOpenTool("audio")} />
          <RailAction label="Giocatori" icon={<UsersRound size={17} />} onClick={() => onOpenTool("players")} />
        </div>
      </section>

      {/* 3. Turni di gioco */}
      <DirectorTurnManager state={state} onSaveRoomTurnState={onSaveRoomTurnState} />

      {/* 4. Dadi e carte */}
      <DirectorRandomPanel state={state} onCreateDiceRequest={onCreateDiceRequest} onDrawCard={onDrawCard} />

      {/* 5. Scena */}
      <section className="director-rail-section">
        <h3 className="director-mini-title">Scena</h3>
        <button type="button" onClick={() => onOpenTool("scenes")} className="director-current-card mt-3">
          <span className="h-16 w-20 shrink-0 rounded-md codex-scene-preview" style={{ backgroundImage: `url(${state.scene.image_url})` }} />
          <span className="min-w-0 text-left">
            <strong className="block truncate text-sm text-stone-100">{state.scene.title}</strong>
            <small className="line-clamp-2 text-xs leading-5 text-stone-400">{state.scene.description}</small>
          </span>
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSceneChange(state.scene)} className="director-small-button">Rimostra</button>
          <button type="button" onClick={() => onOpenTool("scenes")} className="director-small-button is-warm">Cambia</button>
        </div>
      </section>

      {/* 6. Mappa rapida */}
      <DirectorQuickMapPanel state={state} onOpenTool={onOpenTool} onSetActiveMap={onSetActiveMap} onUpdateMapCharacterPosition={onUpdateMapCharacterPosition} />

      {/* 7. Event builder */}
      <DirectorEventBuilder state={state} onLaunch={onDirectorEvent} />

      {/* 8. Cue di regia */}
      <DirectorCuePanel onLaunch={onQuickCue} />

      {/* 9. Recap finale */}
      <DirectorRecapPanel state={state} currentAudio={currentAudio} actionLog={actionLog} />

      {/* 10. Appunti rapidi */}
      <section className="director-rail-section">
        <h3 className="director-mini-title">Appunti rapidi</h3>
        <div className="mt-3 flex gap-2">
          <input className="field min-w-0 flex-1 px-3 py-2 text-sm" placeholder="Scrivi un appunto per te..." />
          <button type="button" className="director-icon-button h-10 w-10" title="Fissa appunto" aria-label="Fissa appunto">
            <Bell size={15} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onSaveRoom} className="director-session-button is-save">
          <Save size={15} /> Salva
        </button>
        <button type="button" onClick={onDeleteRoom} className="director-session-button is-danger">
          <Trash2 size={15} /> Chiudi
        </button>
      </div>
      <span className="mysterium-corners-br" />
    </aside>
  );
}

function DirectorTimelinePanel({ state, actionLog }: { state: RoomState; actionLog: { id: string; label: string; detail?: string; created_at: string }[] }) {
  const recentMessages = [...state.messages, ...state.offMessages, ...state.privateMessages]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  const items = [
    { id: `scene-${state.scene.id}`, label: "Scena attiva", detail: state.scene.title, created_at: state.scene.created_at },
    ...actionLog.slice(0, 3),
    ...recentMessages.map((message) => ({
      id: message.id,
      label: message.is_private ? "Sussurro" : message.channel === "off" ? "OFF GDR" : message.sender_display_name,
      detail: message.content,
      created_at: message.created_at
    }))
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  return (
    <section className="director-rail-section director-timeline-panel">
      <h3 className="director-mini-title">Timeline sessione</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <article key={item.id} className="director-timeline-item">
            <time>{shortTime(item.created_at)}</time>
            <div>
              <p>{item.label}</p>
              {item.detail ? <span>{item.detail}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DirectorRecapPanel({
  state,
  currentAudio,
  actionLog
}: {
  state: RoomState;
  currentAudio: AudioTrack;
  actionLog: { id: string; label: string; detail?: string; created_at: string }[];
}) {
  const pinnedMessages = [...state.messages, ...state.offMessages, ...state.privateMessages]
    .filter((message) => message.is_pinned)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const recentMessages = state.messages
    .slice(-12)
    .map((message) => `[${shortTime(message.created_at)}] ${message.sender_display_name}: ${message.content}`);
  const recentActions = actionLog
    .slice(0, 10)
    .map((entry) => `[${shortTime(entry.created_at)}] ${entry.label}${entry.detail ? ` - ${entry.detail}` : ""}`);
  const campaignTitle = state.campaigns.find((campaign) => campaign.id === state.room.campaign_id)?.title ?? state.campaigns[0]?.title ?? "Campagna";
  const players = state.characters
    .map((character) => {
      const name = `${character.character_name} ${character.character_surname}`.trim();
      return `- ${name || "Personaggio"} | PF ${character.hp}/10 | Mente ${character.mental_state || "n/d"} | Stato ${character.visible_status || "n/d"}`;
    })
    .join("\n");

  const downloadRecap = () => {
    const lines = [
      "GDR MASTER ROOM - RECAP SESSIONE",
      "================================",
      "",
      `Campagna: ${campaignTitle}`,
      `Stanza: ${state.room.name}`,
      `Codice invito: ${state.room.invite_code}`,
      `Scena finale: ${state.scene.title}`,
      `Descrizione scena: ${state.scene.description || "Nessuna descrizione."}`,
      `Audio finale: ${currentAudio.title}`,
      `Generato: ${new Date().toLocaleString("it-IT")}`,
      "",
      "GIOCATORI",
      "---------",
      players || "Nessun personaggio registrato.",
      "",
      "MESSAGGI PINNATI",
      "----------------",
      pinnedMessages.length
        ? pinnedMessages.map((message) => `[${shortTime(message.created_at)}] ${message.sender_display_name}: ${message.content}`).join("\n")
        : "Nessun messaggio pinnato.",
      "",
      "TIMELINE REGIA",
      "--------------",
      recentActions.length ? recentActions.join("\n") : "Nessuna azione di regia registrata.",
      "",
      "ULTIMI MESSAGGI IN CHAT",
      "----------------------",
      recentMessages.length ? recentMessages.join("\n") : "Nessun messaggio recente.",
      ""
    ];
    downloadTextFile(`recap-${state.room.invite_code.toLowerCase()}.txt`, lines.join("\n"));
  };

  return (
    <section className="director-rail-section director-recap-panel">
      <h3 className="director-mini-title">Recap finale</h3>
      <p className="mt-2 text-xs leading-5 text-stone-400">
        Genera una chiusura leggibile della sessione con scena, giocatori, pin e ultime azioni.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <span className="director-recap-stat">
          <strong>{state.characters.length}</strong>
          <small>PG</small>
        </span>
        <span className="director-recap-stat">
          <strong>{pinnedMessages.length}</strong>
          <small>Pin</small>
        </span>
        <span className="director-recap-stat">
          <strong>{state.messages.length}</strong>
          <small>Chat</small>
        </span>
      </div>
      <button type="button" onClick={downloadRecap} className="director-cinematic-button mt-3 w-full">
        <ScrollText size={16} />
        Scarica recap
      </button>
    </section>
  );
}

function DirectorQuickMapPanel({
  state,
  onOpenTool,
  onSetActiveMap,
  onUpdateMapCharacterPosition
}: {
  state: RoomState;
  onOpenTool: (tool: ControlTool) => void;
  onSetActiveMap: (map: NarrativeMap) => void | Promise<void>;
  onUpdateMapCharacterPosition: (position: MapCharacterPosition, values: { x: number; y: number; narrativeLocation: string; isVisibleToPlayers: boolean; isLocked: boolean }) => void | Promise<void>;
}) {
  const activeMap = state.maps.find((map) => map.is_active) ?? state.maps[0];
  const positions = activeMap ? buildQuickMapPositions(activeMap, state.characters, state.mapCharacterPositions) : [];

  function nudge(position: MapCharacterPosition, deltaX: number, deltaY: number) {
    if (!activeMap || position.is_locked) return;
    onUpdateMapCharacterPosition(position, {
      x: clampPercent(position.x + deltaX),
      y: clampPercent(position.y + deltaY),
      narrativeLocation: position.narrative_location || activeMap.title,
      isVisibleToPlayers: position.is_visible_to_players,
      isLocked: position.is_locked
    });
  }

  return (
    <section className="director-rail-section">
      <h3 className="director-mini-title">
        <MapPinned size={15} /> Mappa rapida
      </h3>
      {activeMap ? (
        <>
          <button type="button" onClick={() => onOpenTool("map")} className="director-current-card mt-3">
            <span className="h-14 w-16 shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${activeMap.image_url})` }} />
            <span className="min-w-0 text-left">
              <strong className="block truncate text-sm text-stone-100">{activeMap.title}</strong>
              <small className="line-clamp-2 text-xs leading-5 text-stone-400">{activeMap.description || "Mappa sessione"}</small>
            </span>
          </button>
          <div className="mt-3 grid gap-2">
            {state.maps.slice(0, 4).map((map) => (
              <button key={map.id} type="button" onClick={() => onSetActiveMap(map)} className={`director-small-button text-left ${map.id === activeMap.id ? "is-warm" : ""}`}>
                {map.is_active ? "In scena: " : "Mostra: "} {map.title}
              </button>
            ))}
          </div>
          {positions.length ? (
            <div className="mt-3 grid gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Indicatori giocatori</p>
              {positions.map((position) => {
                const character = state.characters.find((item) => item.id === position.character_id);
                if (!character) return null;
                return (
                  <div key={position.id} className="director-map-nudge-row">
                    <span className="min-w-0 truncate" style={{ color: character.color }}>
                      {character.character_name}
                    </span>
                    <div>
                      <button type="button" onClick={() => nudge(position, 0, -5)} aria-label={`Sposta ${character.character_name} in alto`}>↑</button>
                      <button type="button" onClick={() => nudge(position, -5, 0)} aria-label={`Sposta ${character.character_name} a sinistra`}>←</button>
                      <button type="button" onClick={() => nudge(position, 5, 0)} aria-label={`Sposta ${character.character_name} a destra`}>→</button>
                      <button type="button" onClick={() => nudge(position, 0, 5)} aria-label={`Sposta ${character.character_name} in basso`}>↓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-brass/25 p-3 text-sm text-stone-400">
          Nessuna mappa caricata. Apri lo strumento Mappa per crearne una.
        </div>
      )}
      <button type="button" onClick={() => onOpenTool("map")} className="director-small-button mt-3 w-full">
        Apri gestione mappe
      </button>
    </section>
  );
}

function DirectorRandomPanel({
  state,
  onCreateDiceRequest,
  onDrawCard
}: {
  state: RoomState;
  onCreateDiceRequest: (values: { diceCount?: number; diceSides: number; reason: string; targetUserId?: string | null; visibility: "public" | "private" }) => void | Promise<void>;
  onDrawCard: (values: { deck: CardDeckType; targetUserId?: string | null; visibility: "public" | "private"; reason: string }) => void | Promise<void>;
}) {
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [diceTarget, setDiceTarget] = useState("");
  const [diceReason, setDiceReason] = useState("");
  const [cardDeck, setCardDeck] = useState<CardDeckType>("poker");
  const [cardTarget, setCardTarget] = useState("");
  const [cardReason, setCardReason] = useState("");

  return (
    <section className="director-rail-section director-random-panel">
      <h3 className="director-mini-title">Dadi e carte</h3>
      <div className="mt-3 grid gap-3">
        <form
          className="director-random-box"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateDiceRequest({
              diceCount,
              diceSides,
              reason: diceReason.trim(),
              targetUserId: diceTarget || null,
              visibility: diceTarget ? "private" : "public"
            });
            setDiceReason("");
          }}
        >
          <p>Richiesta tiro rapida</p>
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <input className="field px-2 py-2 text-sm" type="number" min="1" max="20" value={diceCount} onChange={(event) => setDiceCount(Math.max(1, Number(event.target.value)))} aria-label="Numero dadi rapido" />
            <select className="field px-2 py-2 text-sm" value={diceSides} onChange={(event) => setDiceSides(Number(event.target.value))}>
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => <option key={sides} value={sides}>d{sides}</option>)}
            </select>
          </div>
          <select className="field px-2 py-2 text-sm" value={diceTarget} onChange={(event) => setDiceTarget(event.target.value)}>
            <option value="">Tutti</option>
            {state.characters.map((character) => (
              <option key={character.id} value={character.user_id}>{character.character_name} {character.character_surname}</option>
            ))}
          </select>
          <input className="field px-2 py-2 text-sm" placeholder="Motivo" value={diceReason} onChange={(event) => setDiceReason(event.target.value)} />
          <button className="director-small-button is-warm" type="submit">Richiedi tiro</button>
        </form>

        <form
          className="director-random-box"
          onSubmit={(event) => {
            event.preventDefault();
            onDrawCard({
              deck: cardDeck,
              targetUserId: cardTarget || null,
              visibility: cardTarget ? "private" : "public",
              reason: cardReason.trim()
            });
            setCardReason("");
          }}
        >
          <p>Estrazione carte</p>
          <select className="field px-2 py-2 text-sm" value={cardDeck} onChange={(event) => setCardDeck(event.target.value as CardDeckType)}>
            <option value="poker">Mazzo poker</option>
            <option value="regional">Mazzo regionale italiano</option>
          </select>
          <select className="field px-2 py-2 text-sm" value={cardTarget} onChange={(event) => setCardTarget(event.target.value)}>
            <option value="">Pubblica</option>
            {state.characters.map((character) => (
              <option key={character.id} value={character.user_id}>Privata: {character.character_name}</option>
            ))}
          </select>
          <input className="field px-2 py-2 text-sm" placeholder="Motivo estrazione" value={cardReason} onChange={(event) => setCardReason(event.target.value)} />
          <button className="director-small-button is-warm" type="submit">Estrai carta</button>
        </form>
      </div>
    </section>
  );
}

type DirectorEventPreset = {
  id: string;
  label: string;
  detail: string;
  template: string;
  tone: "reveal" | "danger" | "vision" | "chapter";
};

const directorEventPresets: DirectorEventPreset[] = [
  {
    id: "npc-entry",
    label: "Entrata NPC",
    detail: "Presenta un volto importante",
    tone: "reveal",
    template: "[evento] Una presenza entra nella scena. Ogni conversazione si interrompe mentre tutti ne percepiscono il peso."
  },
  {
    id: "secret",
    label: "Segreto",
    detail: "Indizio per pochi occhi",
    tone: "vision",
    template: "[sussurro] Noti un dettaglio che gli altri non sembrano cogliere."
  },
  {
    id: "threat",
    label: "Minaccia",
    detail: "Alza la tensione",
    tone: "danger",
    template: "[evento] Qualcosa cambia nell'aria. La stanza sembra trattenere il respiro."
  },
  {
    id: "chapter-note",
    label: "Beat di capitolo",
    detail: "Segna un passaggio chiave",
    tone: "chapter",
    template: "[capitolo] Questo momento resta inciso nella memoria della sessione."
  }
];

function DirectorEventBuilder({
  state,
  onLaunch
}: {
  state: RoomState;
  onLaunch: (event: { message: string; recipientUserId?: string | null }) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState(directorEventPresets[0]);
  const [target, setTarget] = useState("public");
  const [message, setMessage] = useState(selectedPreset.template);

  function selectPreset(preset: DirectorEventPreset) {
    setSelectedPreset(preset);
    setMessage(preset.template);
  }

  return (
    <section className="director-rail-section director-event-builder">
      <h3 className="director-mini-title">Event builder</h3>
      <p className="mt-2 text-xs leading-5 text-stone-400">Costruisci un beat narrativo rapido senza aprire altri pannelli.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {directorEventPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => selectPreset(preset)}
            className={`director-event-preset director-event-preset--${preset.tone} ${selectedPreset.id === preset.id ? "is-active" : ""}`}
          >
            <span>{preset.label}</span>
            <small>{preset.detail}</small>
          </button>
        ))}
      </div>
      <select className="field mt-3 w-full px-3 py-2 text-sm" value={target} onChange={(event) => setTarget(event.target.value)}>
        <option value="public">Pubblico: tutta la stanza</option>
        {state.characters.map((character) => (
          <option key={character.id} value={character.user_id}>
            Privato: {character.character_name} {character.character_surname}
          </option>
        ))}
      </select>
      <textarea
        className="field mt-2 min-h-24 resize-none px-3 py-2 text-sm"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Scrivi evento narrativo..."
      />
      <button
        type="button"
        className="director-cinematic-button mt-3 w-full"
        onClick={() => {
          if (!message.trim()) return;
          onLaunch({ message: message.trim(), recipientUserId: target === "public" ? null : target });
        }}
      >
        <Send size={16} /> Lancia evento
      </button>
    </section>
  );
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type DirectorCue = {
  id: string;
  label: string;
  tone: "reveal" | "danger" | "vision" | "chapter" | "earthquake";
  message: string;
};

const directorCues: DirectorCue[] = [
  {
    id: "reveal",
    label: "Rivelazione",
    tone: "reveal",
    message: "La verita emerge all'improvviso: un dettaglio impossibile cambia il senso di tutto cio che avete visto finora."
  },
  {
    id: "danger",
    label: "Pericolo",
    tone: "danger",
    message: "Qualcosa si muove nell'ombra. L'aria si tende, il silenzio si spezza, e ogni scelta ora puo avere un prezzo."
  },
  {
    id: "vision",
    label: "Visione",
    tone: "vision",
    message: "Per un istante la realta si piega: immagini, suoni e ricordi non vostri attraversano la stanza come un presagio."
  },
  {
    id: "chapter",
    label: "Fine capitolo",
    tone: "chapter",
    message: "La scena si chiude su questa immagine. Qualcosa e cambiato, e la storia non potra piu tornare al punto di prima."
  },
  {
    id: "earthquake",
    label: "Terremoto",
    tone: "earthquake",
    message: "Un tremito improvviso scuote le fondamenta del mondo. Mura che tremano, polvere che cade: la terra stessa si ribella."
  }
];

function DirectorCuePanel({ onLaunch }: { onLaunch: (cue: DirectorCue) => void }) {
  return (
    <section className="director-rail-section director-cue-panel">
      <h3 className="director-mini-title">Cue di regia</h3>
      <p className="mt-2 text-xs leading-5 text-stone-400">Eventi narrativi rapidi da lanciare in chat quando serve cambiare ritmo.</p>
      <div className="mt-3 grid gap-2">
        {directorCues.map((cue) => (
          <button
            key={cue.id}
            type="button"
            onMouseEnter={() => {
              import("@/lib/sound-generator").then((mod) => mod.playUiHover());
            }}
            onClick={() => {
              onLaunch(cue);
            }}
            className={`director-cue-button director-cue-button--${cue.tone}`}
          >
            <span>{cue.label}</span>
            <small>Lancia evento</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function RailAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseEnter={() => {
        import("@/lib/sound-generator").then((mod) => mod.playUiHover());
      }}
      onClick={() => {
        import("@/lib/sound-generator").then((mod) => {
          mod.playUiClick();
        });
        onClick();
      }}
      className="director-rail-action"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolHeading({ icon, eyebrow, title, detail }: { icon: React.ReactNode; eyebrow: string; title: string; detail: string }) {
  return (
    <header className="director-tool-heading">
      <div className="director-tool-emblem">{icon}</div>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{detail}</span>
      </div>
    </header>
  );
}

function DirectorEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="director-empty-state">
      <Sparkles size={22} />
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

function ControlLink({
  icon,
  label,
  active = false,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => {
        import("@/lib/sound-generator").then((mod) => mod.playUiHover());
      }}
      onClick={() => {
        import("@/lib/sound-generator").then((mod) => {
          mod.playUiClick();
        });
        onClick();
      }}
      className={`director-nav-link ${
        active ? "is-active" : ""
      }`}
      data-atlas-area={atlasAreaFromLabel(label)}
      aria-pressed={active}
      aria-label={`Apri strumento ${label}`}
    >
      {icon}
      {label}
    </button>
  );
}

function atlasAreaFromLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("panoramica")) return "regia";
  if (normalized.includes("scene")) return "scene";
  if (normalized.includes("mappa")) return "mappa";
  if (normalized.includes("chat")) return "chat";
  if (normalized.includes("giocatori")) return "eroi";
  if (normalized.includes("audio")) return "audio";
  if (normalized.includes("soundbar")) return "soundbar";
  if (normalized.includes("media")) return "media";
  if (normalized.includes("inventari")) return "zaini";
  return "regia";
}

function DirectorStatusBar({
  state,
  currentAudio,
  actionLog
}: {
  state: RoomState;
  currentAudio: AudioTrack;
  actionLog: { id: string; label: string; detail?: string; created_at: string }[];
}) {
  const activeTyping = state.typing.filter((entry) => entry.user_id !== state.profile.id && Date.now() - new Date(entry.updated_at).getTime() < 6000);
  const pinnedCount = [...state.messages, ...state.offMessages, ...state.privateMessages].filter((message) => message.is_pinned).length;

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="director-card rounded-xl p-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <StatusPill icon={<Activity size={15} />} label="Sessione" value="Live" />
          <StatusPill icon={<UsersRound size={15} />} label="Eroi" value={`${state.characters.length}`} />
          <StatusPill icon={<AudioLines size={15} />} label="Audio" value={currentAudio.title} />
          <StatusPill icon={<PinIcon />} label="Pin" value={String(pinnedCount)} />
        </div>
        {activeTyping.length ? (
          <p className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            {activeTyping.map((entry) => entry.display_name).join(", ")} sta scrivendo.
          </p>
        ) : null}
      </div>
      <div className="director-card rounded-xl p-3">
        <h2 className="flex items-center gap-2 font-serif text-xs uppercase tracking-[0.22em] text-brass">
          <Bell size={15} /> Log regia
        </h2>
        <div className="mt-2 space-y-2">
          {actionLog.slice(0, 4).map((entry) => (
            <p key={entry.id} className="text-xs leading-5 text-slate-300">
              <span className="text-slate-500">{shortTime(entry.created_at)}</span> <span className="text-white">{entry.label}</span>
              {entry.detail ? <span className="text-slate-400"> · {entry.detail}</span> : null}
            </p>
          ))}
          {!actionLog.length ? <p className="text-xs text-slate-500">Le azioni principali appariranno qui.</p> : null}
        </div>
      </div>
    </section>
  );
}

function StatusPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="director-status-tile px-3 py-2">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-stone-500">
        {icon} {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PinIcon() {
  return <span className="text-sm text-brass">⌖</span>;
}

function DirectorNextStepsPanel({
  state,
  currentAudio,
  onOpenTool,
  onOpenPlayerView,
  onHide
}: {
  state: RoomState;
  currentAudio: AudioTrack;
  onOpenTool: (tool: ControlTool) => void;
  onOpenPlayerView: () => void;
  onHide: () => void;
}) {
  const visibleMaps = state.maps.filter((map) => map.is_visible_to_players);
  const publicMessages = state.messages.filter((message) => !message.content.startsWith("__gdr_map_sync__:"));
  const steps = [
    {
      id: "players",
      done: state.characters.length > 0,
      title: "Invita o controlla gli eroi",
      detail: state.characters.length
        ? `${state.characters.length} personaggi presenti nella stanza`
        : `Condividi il codice ${state.room.invite_code} o apri il pannello giocatori`,
      action: "Eroi",
      tool: "players" as ControlTool
    },
    {
      id: "scene",
      done: state.scenes.length > 1 || Boolean(state.scene.image_url),
      title: "Prepara la scena visibile",
      detail: state.scene.title ? `Scena attiva: ${state.scene.title}` : "Crea titolo, descrizione e immagine per il tavolo",
      action: "Scene",
      tool: "scenes" as ControlTool
    },
    {
      id: "audio",
      done: Boolean(currentAudio.audio_url) || state.audioTracks.length > 1,
      title: "Imposta atmosfera audio",
      detail: currentAudio.audio_url ? currentAudio.title : "Aggiungi musica o effetti prima del momento chiave",
      action: "Audio",
      tool: "audio" as ControlTool
    },
    {
      id: "map",
      done: visibleMaps.length > 0,
      title: "Sincronizza una mappa",
      detail: visibleMaps.length ? `${visibleMaps.length} mappe visibili ai giocatori` : "Rendi visibile una mappa per orientare il gruppo",
      action: "Mappa",
      tool: "map" as ControlTool
    },
    {
      id: "chat",
      done: publicMessages.length > 0,
      title: "Apri il registro narrativo",
      detail: publicMessages.length ? `${publicMessages.length} messaggi in chat GDR` : "Invia un primo messaggio o una cue di regia",
      action: "Chat",
      tool: "chat" as ControlTool
    }
  ];
  const completed = steps.filter((step) => step.done).length;
  const completionPercent = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);
  const engagement = useMemo(() => buildMasterEngagement(state), [state]);

  return (
    <section className="next-steps-panel director-next-steps rounded-xl border border-brass/20 bg-black/35 p-4 shadow-[0_0_28px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="director-kicker">
            <Sparkles size={13} /> Prossime mosse
          </p>
          <h2 className="mt-1 font-serif text-xl text-stone-100">Preparazione sessione</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            <Check size={14} />
            {completed}/{steps.length}
          </div>
          <button
            type="button"
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onHide();
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <EyeOff size={14} /> Nascondi
          </button>
        </div>
      </div>

      <div className="progress-dashboard mt-4" aria-label={`Preparazione sessione completata al ${completionPercent} percento`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="progress-dashboard-label">Qualita preparazione</span>
          <strong>{completionPercent}%</strong>
        </div>
        <div className="progress-meter mt-2" aria-hidden="true">
          <span style={{ width: `${completionPercent}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-400">
          {nextStep ? `Prossima azione consigliata: ${nextStep.title.toLowerCase()}.` : "Setup completo: la stanza e pronta per una sessione pulita."}
        </p>
        <div className="achievement-strip mt-3" aria-label="Traguardi sessione">
          {engagement.milestones.slice(0, 6).map((milestone) => (
            <span key={milestone.id} className={milestone.unlocked ? "is-unlocked" : ""} title={milestone.detail}>
              <Check size={12} /> {milestone.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          Retention Master: {engagement.unlocked}/{engagement.total} traguardi · {engagement.score}%
        </p>
      </div>

      <div className="next-steps-track mt-4 grid gap-2 lg:grid-cols-5">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            aria-label={`${step.done ? "Completato" : "Da completare"}: ${step.action}. ${step.title}. ${step.detail}`}
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onOpenTool(step.tool);
            }}
            className={`next-steps-card rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
              step.done ? "border-emerald-400/25 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-serif text-xs uppercase tracking-[0.16em] text-brass">{step.action}</span>
              <span className={step.done ? "text-emerald-300" : "text-stone-500"}>
                <Check size={13} />
              </span>
            </span>
            <strong className="mt-2 block text-sm text-stone-100">{step.title}</strong>
            <span className="mt-1 block text-xs leading-5 text-stone-400">{step.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-stone-400">
        <span>
          Codice stanza: <strong className="font-mono text-brass">{state.room.invite_code}</strong>
        </span>
        <button
          type="button"
          onMouseEnter={playUiHover}
          onClick={() => {
            playUiClick();
            onOpenPlayerView();
          }}
          className="rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 font-serif uppercase tracking-[0.14em] text-brass transition hover:bg-brass/15"
        >
          Controlla vista giocatore
        </button>
      </div>
    </section>
  );
}

function CharactersPanel({ state, expanded = false }: { state: RoomState; expanded?: boolean }) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
        <UsersRound size={16} /> Giocatori
      </h2>
      <div className={`mt-4 grid gap-3 ${expanded ? "md:grid-cols-2" : ""}`}>
        {state.characters.map((character) => (
          <article key={character.id} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div
              className={`h-14 w-14 shrink-0 rounded-lg bg-cover bg-center ${character.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
              style={character.portrait_url ? { backgroundImage: `url(${character.portrait_url})` } : undefined}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: character.color }}>
                {character.character_name} {character.character_surname}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                PF {character.hp} · {character.mental_state} · {character.visible_status}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(character.conditions?.length ? character.conditions : [character.visible_status]).filter(Boolean).map((condition) => (
                  <span key={condition} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200">
                    {condition}
                  </span>
                ))}
              </div>
              {expanded ? (() => {
                const meta = parseCharacterMetadata(character.public_background);
                return (
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    {meta.archetype && <p><strong className="text-slate-300">Archetipo:</strong> {meta.archetype}</p>}
                    {meta.origin && <p><strong className="text-slate-300">Origine:</strong> {meta.origin}</p>}
                    {meta.bio && <p className="leading-relaxed"><strong className="text-slate-300">Bio:</strong> {meta.bio}</p>}
                  </div>
                );
              })() : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {state.inventory
                  .filter((item) => item.character_id === character.id && item.is_public)
                  .map((item) => (
                    <span key={item.id} className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100">
                      {item.name} x{item.quantity}
                    </span>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}



function buildQuickMapPositions(map: NarrativeMap, characters: RoomState["characters"], positions: MapCharacterPosition[]) {
  const existingForMap = positions.filter((position) => position.map_id === map.id);
  const positionedCharacters = new Set(existingForMap.map((position) => position.character_id));
  const virtualPositions = characters
    .filter((character) => !positionedCharacters.has(character.id))
    .map((character, index) => ({
      id: `virtual-position:${map.id}:${character.id}`,
      map_id: map.id,
      character_id: character.id,
      x: clampPercent(18 + (index % 4) * 18),
      y: clampPercent(22 + Math.floor(index / 4) * 16),
      narrative_location: map.title,
      is_visible_to_players: true,
      is_locked: false,
      updated_at: new Date(0).toISOString()
    }));

  return [...existingForMap, ...virtualPositions];
}

function clampPercent(value: number) {
  return Math.min(96, Math.max(4, value));
}

function buildSessionMediaAssets(state: RoomState): MediaAsset[] {
  const derivedAssets: MediaAsset[] = [];

  for (const scene of state.scenes) {
    if (scene.image_url) {
      derivedAssets.push({
        id: `scene:${scene.id}:image`,
        room_id: scene.room_id,
        title: `${scene.title} - immagine scena`,
        asset_type: "image",
        url: scene.image_url,
        tags: ["scena", scene.visibility === "private" ? "privata" : "pubblica"],
        created_by: scene.created_by,
        created_at: scene.created_at
      });
    }

    if (scene.video_url) {
      derivedAssets.push({
        id: `scene:${scene.id}:video`,
        room_id: scene.room_id,
        title: `${scene.title} - video scena`,
        asset_type: "video",
        url: scene.video_url,
        tags: ["video", "scena", scene.loop_video === false ? "no-loop" : "loop"],
        created_by: scene.created_by,
        created_at: scene.created_at
      });
    }
  }

  const mapAssets = state.maps.map((map) => ({
    id: `map:${map.id}`,
    room_id: map.room_id,
    title: `${map.title} - mappa`,
    asset_type: "map" as const,
    url: map.image_url,
    tags: ["mappa", map.level_type, map.is_visible_to_players ? "pubblica" : "privata"],
    created_by: map.created_by ?? null,
    created_at: map.updated_at ?? map.created_at
  }));
  derivedAssets.push(...mapAssets);

  for (const track of state.audioTracks) {
    if (!track.audio_url) continue;
    derivedAssets.push({
      id: `audio:${track.id}`,
      room_id: track.room_id,
      title: track.title,
      asset_type: "audio",
      url: track.audio_url,
      tags: ["traccia", track.loop ? "loop" : "no-loop"],
      created_by: null,
      created_at: ""
    });
  }

  for (const effect of state.soundEffects) {
    if (!effect.audio_url) continue;
    derivedAssets.push({
      id: `sound:${effect.id}`,
      room_id: effect.room_id,
      title: effect.title,
      asset_type: "sound",
      url: effect.audio_url,
      tags: ["soundbar", effect.loop ? "loop" : "one-shot"],
      created_by: null,
      created_at: effect.created_at ?? ""
    });
  }

  const seen = new Set<string>();
  return [...derivedAssets, ...state.mediaAssets]
    .filter((asset) => {
      const key = `${asset.asset_type}:${asset.url}`;
      if (!asset.url || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

function mergeMediaAssets(primary: MediaAsset[], reusable: MediaAsset[]) {
  const merged = new Map<string, MediaAsset>();
  for (const asset of [...reusable, ...primary]) {
    const key = asset.id.includes(":") ? `${asset.asset_type}:${asset.url}` : asset.id;
    if (!asset.url || merged.has(key)) continue;
    merged.set(key, asset);
  }
  return [...merged.values()].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

function SceneManager({
  state,
  onSceneChange,
  onCreateScene,
  onUpdateScene,
  onDeleteScene
}: {
  state: RoomState;
  onSceneChange: (scene: Scene) => void;
  onCreateScene: (values: {
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
  }) => void | Promise<void>;
  onUpdateScene: (
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
  ) => void | Promise<void>;
  onDeleteScene: (scene: Scene) => void | Promise<void>;
}) {
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<SceneMediaType>("image");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [videoFile, setVideoFile] = useState<File | undefined>();
  const [loopVideo, setLoopVideo] = useState(true);
  const [visibility, setVisibility] = useState<SceneVisibility>("public");
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>([]);
  const [linkedAudioId, setLinkedAudioId] = useState("");
  const [description, setDescription] = useState("");

  function toggleVisibleUser(userId: string) {
    setVisibleUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  function startEditing(scene: Scene) {
    setEditingScene(scene);
    setTitle(scene.title);
    setMediaType(scene.media_type || "image");
    setImageUrl(scene.image_url ?? "");
    setVideoUrl(scene.video_url ?? "");
    setImageFile(undefined);
    setVideoFile(undefined);
    setLoopVideo(scene.loop_video ?? true);
    setVisibility(scene.visibility ?? "public");
    setVisibleUserIds(scene.visible_user_ids ?? []);
    setLinkedAudioId(scene.linked_audio_id ?? "");
    setDescription(scene.description ?? "");
  }

  function cancelEditing() {
    setEditingScene(null);
    setTitle("");
    setMediaType("image");
    setImageUrl("");
    setVideoUrl("");
    setImageFile(undefined);
    setVideoFile(undefined);
    setLoopVideo(true);
    setVisibility("public");
    setVisibleUserIds([]);
    setLinkedAudioId("");
    setDescription("");
  }

  return (
    <section className="director-tool-panel glass-panel rounded-lg p-4">
      <ToolHeading icon={<ImageUp size={17} />} eyebrow="Archivio visivo" title="Scene" detail="Prepara luoghi, indizi, video e rivelazioni private." />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="director-scene-grid">
          {state.scenes.map((scene) => (
            <article key={scene.id} className={`director-scene-card ${scene.id === state.scene.id ? "is-current" : ""}`}>
              {scene.media_type === "video" ? (
                <div className="director-scene-thumb flex items-center justify-center bg-black/50 text-brass">
                  <Film size={18} />
                </div>
              ) : (
                <div className="director-scene-thumb codex-scene-preview" style={{ backgroundImage: `url(${scene.image_url})` }} />
              )}
              <button type="button" onClick={() => onSceneChange(scene)} className="director-scene-select">
                <span className="block truncate font-serif text-base text-white">
                  {scene.title}
                  {scene.visibility === "private" ? <span className="ml-2 text-xs font-normal text-ember-100">Privata</span> : null}
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-stone-400">{scene.description || "Nessuna descrizione."}</span>
                {scene.linked_audio_id ? (
                  <span className="mt-2 block text-xs text-brass">
                    Audio: {state.audioTracks.find((track) => track.id === scene.linked_audio_id)?.title ?? "traccia collegata"}
                  </span>
                ) : null}
                {scene.id === state.scene.id ? <span className="director-live-chip mt-2">In scena ora</span> : null}
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => startEditing(scene)}
                  className="flex h-10 w-10 items-center justify-center border border-brass/35 bg-brass/10 text-brass hover:bg-brass/20 rounded-lg transition-colors"
                  title={`Modifica scena ${scene.title}`}
                  aria-label={`Modifica scena ${scene.title}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingScene?.id === scene.id) {
                      cancelEditing();
                    }
                    onDeleteScene(scene);
                  }}
                  className="director-danger-icon"
                  title={`Elimina scena ${scene.title}`}
                  aria-label={`Elimina scena ${scene.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!state.scenes.length ? <DirectorEmptyState title="Nessuna scena preparata" text="Crea la prima scena per iniziare a costruire il palcoscenico della sessione." /> : null}
        </div>
        <form
          className="director-create-panel grid content-start gap-2 rounded-lg p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            const values = {
              title: title.trim(),
              imageUrl: imageUrl.trim(),
              imageFile,
              description: description.trim(),
              mediaType,
              videoUrl: videoUrl.trim(),
              videoFile,
              loopVideo,
              visibility,
              visibleUserIds: visibility === "private" ? visibleUserIds : [],
              linkedAudioId: linkedAudioId || null
            };
            if (editingScene) {
              onUpdateScene(editingScene.id, values);
            } else {
              onCreateScene(values);
            }
            cancelEditing();
          }}
        >
          <p className="director-form-title">{editingScene ? `Modifica scena` : "Nuova scena"}</p>
          <input className="field px-3 py-2 text-sm" placeholder="Titolo scena" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select className="field px-3 py-2 text-sm" value={mediaType} onChange={(event) => setMediaType(event.target.value as SceneMediaType)}>
            <option value="image">Immagine 16:9</option>
            <option value="video">Video MP4 in scena</option>
          </select>
          <input className="field px-3 py-2 text-sm" placeholder="Link immagine 16:9" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          <label className="director-upload-target">
            {imageFile ? imageFile.name : "Carica immagine 16:9"}
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} />
          </label>
          <input className="field px-3 py-2 text-sm" placeholder="Link video MP4 in loop" value={videoUrl} onChange={(event) => {
            setVideoUrl(event.target.value);
            if (event.target.value.trim()) setMediaType("video");
          }} />
          <label className="director-upload-target border-purple-400/35 bg-purple-500/10 text-purple-100">
            {videoFile ? videoFile.name : "Carica video MP4 in loop"}
            <input
              className="sr-only"
              type="file"
              accept="video/mp4,video/*"
              onChange={(event) => {
                setVideoFile(event.target.files?.[0]);
                if (event.target.files?.[0]) setMediaType("video");
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={loopVideo} onChange={(event) => setLoopVideo(event.target.checked)} />
            Ripeti video in loop
          </label>
          <select className="field px-3 py-2 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as SceneVisibility)}>
            <option value="public">Scena pubblica</option>
            <option value="private">Scena privata</option>
          </select>
          <select className="field px-3 py-2 text-sm" value={linkedAudioId} onChange={(event) => setLinkedAudioId(event.target.value)}>
            <option value="">Nessuna traccia collegata</option>
            {state.audioTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
          {visibility === "private" ? (
            <div className="director-sub-panel grid gap-2 rounded-lg p-2">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Visibile a</p>
              {state.characters.map((character) => (
                <label key={character.id} className="flex items-center justify-between gap-2 text-sm text-slate-200">
                  {character.character_name} {character.character_surname}
                  <input type="checkbox" checked={visibleUserIds.includes(character.user_id)} onChange={() => toggleVisibleUser(character.user_id)} />
                </label>
              ))}
            </div>
          ) : null}
          <textarea className="field min-h-24 resize-none px-3 py-2 text-sm" placeholder="Descrizione" value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid gap-2">
            <button className="director-primary-action w-full">
              {editingScene ? (
                <>
                  <Save size={16} /> Salva modifiche
                </>
              ) : (
                <>
                  <Plus size={16} /> Crea scena
                </>
              )}
            </button>
            {editingScene ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="director-secondary-action w-full"
              >
                Annulla
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

function ChatPermissionsPanel({ state, onUpdateChatPermissions }: { state: RoomState; onUpdateChatPermissions: (values: { chatEnabled: boolean; mutedUserIds: string[] }) => void | Promise<void> }) {
  const [chatEnabled, setChatEnabled] = useState(state.room.chat_enabled !== false);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>(state.room.muted_user_ids ?? []);

  function toggleMuted(userId: string) {
    setMutedUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
        <MessageSquareText size={16} /> Permessi chat
      </h2>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white">
        Chat comune giocatori
        <input type="checkbox" checked={chatEnabled} onChange={(event) => setChatEnabled(event.target.checked)} />
      </label>
      <div className="mt-3 grid gap-2">
        {state.characters.map((character) => (
          <label key={character.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
            {character.character_name} {character.character_surname}
            <input type="checkbox" checked={!mutedUserIds.includes(character.user_id)} onChange={() => toggleMuted(character.user_id)} />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onUpdateChatPermissions({ chatEnabled, mutedUserIds })}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20"
      >
        Salva permessi chat
      </button>
    </section>
  );
}

function NpcPanel({
  state,
  onCreateNpc,
  onDeleteNpc
}: {
  state: RoomState;
  onCreateNpc: (values: { name: string; color: string; description: string; portraitUrl: string; portraitFile?: File }) => void | Promise<void>;
  onDeleteNpc: (npc: Npc) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#84cc16");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [portraitFile, setPortraitFile] = useState<File | undefined>(undefined);
  const [description, setDescription] = useState("");

  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
        <MessageSquareText size={16} /> NPC
      </h2>
      <form
        className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onCreateNpc({ name: name.trim(), color, description: description.trim(), portraitUrl: portraitUrl.trim(), portraitFile });
          setName("");
          setPortraitUrl("");
          setPortraitFile(undefined);
          setDescription("");
        }}
      >
        <input className="field px-3 py-2 text-sm" placeholder="Nome NPC" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <input className="field h-10 px-2 py-1" aria-label="Colore NPC" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          <div className="grid gap-2 grid-cols-2">
            <input
              className="field px-3 py-2 text-sm"
              placeholder="Link portrait NPC"
              value={portraitUrl}
              onChange={(event) => {
                setPortraitUrl(event.target.value);
                if (event.target.value) setPortraitFile(undefined);
              }}
            />
            <label className="flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05] hover:border-white/30 cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setPortraitFile(file);
                    setPortraitUrl("");
                  }
                }}
              />
              <ImageUp size={14} className="mr-1.5 shrink-0 text-brass" />
              {portraitFile ? portraitFile.name : "Carica Foto"}
            </label>
          </div>
        </div>
        <textarea
          className="field min-h-20 resize-none px-3 py-2 text-sm"
          placeholder="Descrizione NPC"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-ember-400/25 bg-ember-500/10 px-3 py-2 text-sm font-medium text-ember-100 hover:bg-ember-500/20">
          <Plus size={16} /> Crea NPC
        </button>
      </form>
      <div className="mt-4 grid gap-3">
        {state.npcs.map((npc) => (
          <article key={npc.id} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: npc.color }}>
                {npc.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{npc.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteNpc(npc)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
              title={`Elimina NPC ${npc.name}`}
              aria-label={`Elimina NPC ${npc.name}`}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AudioPanel({
  currentAudio,
  audioTracks,
  onAudioChange,
  expanded = false
}: {
  currentAudio: AudioTrack;
  audioTracks: AudioTrack[];
  onAudioChange: (track: AudioTrack) => void;
  expanded?: boolean;
}) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
        <AudioLines size={16} /> Audio attuale
      </h2>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
        <p className="text-sm font-semibold text-stone-100">{currentAudio.title}</p>
        <p className="mt-1 text-xs text-stone-400">Il player resta attivo mentre cambi strumenti nella cabina di regia.</p>
      </div>
      {expanded ? (
        <div className="mt-4 grid gap-2">
          {audioTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => onAudioChange(track)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm text-white hover:border-ember-400/35 hover:bg-ember-500/10"
            >
              {track.title}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AudioManager({
  currentAudio,
  audioTracks,
  onAudioChange,
  onCreateAudio,
  onDeleteAudio
}: {
  currentAudio: AudioTrack;
  audioTracks: AudioTrack[];
  onAudioChange: (track: AudioTrack) => void;
  onCreateAudio: (values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) => void | Promise<void>;
  onDeleteAudio: (track: AudioTrack) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | undefined>();
  const [loop, setLoop] = useState(true);

  return (
    <section className="director-tool-panel glass-panel rounded-lg p-4">
      <ToolHeading icon={<AudioLines size={17} />} eyebrow="Atmosfera" title="Audio" detail="Scegli la traccia della scena e prepara nuove musiche ambientali." />
      <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
        <p className="text-sm font-semibold text-stone-100">In riproduzione: {currentAudio.title}</p>
        <p className="mt-1 text-xs text-stone-400">La riproduzione e gestita dal player persistente in fondo alla cabina.</p>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="director-audio-grid">
          {audioTracks.map((track) => (
            <article key={track.id} className={`director-audio-card ${track.id === currentAudio.id ? "is-current" : ""}`}>
              <button type="button" onClick={() => onAudioChange(track)} className="min-w-0 text-left">
                <span className="block truncate font-serif text-base text-white">{track.title}</span>
                <span className="mt-1 block text-xs text-stone-400">{track.loop ? "Loop continuo" : "Riproduzione singola"}</span>
                {track.id === currentAudio.id ? <span className="director-live-chip mt-3">In riproduzione</span> : null}
              </button>
              <button
                type="button"
                onClick={() => onDeleteAudio(track)}
                className="director-danger-icon"
                title={`Elimina traccia ${track.title}`}
                aria-label={`Elimina traccia ${track.title}`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          {!audioTracks.length ? <DirectorEmptyState title="Nessuna traccia audio" text="Aggiungi una musica ambientale per dare ritmo emotivo alla scena." /> : null}
        </div>
        <form
          className="director-create-panel grid content-start gap-2 rounded-lg p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onCreateAudio({ title: title.trim(), audioUrl: audioUrl.trim(), loop, audioFile });
            setTitle("");
            setAudioUrl("");
            setAudioFile(undefined);
            setLoop(true);
          }}
        >
          <p className="director-form-title">Nuova traccia</p>
          <input className="field px-3 py-2 text-sm" placeholder="Titolo traccia" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input className="field px-3 py-2 text-sm" placeholder="Link audio" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} />
          <label className="director-upload-target">
            Carica audio
            <input className="sr-only" type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0])} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
            Ripeti in loop
          </label>
          <button className="director-primary-action">
            <Plus size={16} /> Crea traccia
          </button>
        </form>
      </div>
    </section>
  );
}

function SoundbarModal({
  soundEffects,
  currentSoundEffectId,
  onClose,
  onCreateSoundEffect,
  onDeleteSoundEffect,
  onTriggerSoundEffect,
  onStopSoundEffect
}: {
  soundEffects: SoundEffect[];
  currentSoundEffectId: string | null;
  onClose: () => void;
  onCreateSoundEffect: (values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) => void | Promise<void>;
  onDeleteSoundEffect: (effect: SoundEffect) => void | Promise<void>;
  onTriggerSoundEffect: (effect: SoundEffect) => void | Promise<void>;
  onStopSoundEffect: () => void | Promise<void>;
}) {
  const [soundTitle, setSoundTitle] = useState("");
  const [soundUrl, setSoundUrl] = useState("");
  const [soundFile, setSoundFile] = useState<File | undefined>();
  const [soundLoop, setSoundLoop] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleLoadDefaults = async () => {
    setIsInitializing(true);
    try {
      const defaultSounds = [
        // --- Original 5 ---
        { title: "Pioggia", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/rain.mp3", loop: true },
        { title: "Vento", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/wind.mp3", loop: true },
        { title: "Fuoco", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/fireplace.mp3", loop: true },
        { title: "Passi", audioUrl: "/assets/audio/distant_footsteps_on_wood.mp3", loop: false },
        { title: "Porta", audioUrl: "/assets/audio/creaking_wooden_door.mp3", loop: false },

        // --- 35 Additional High-Quality Default Sounds ---
        // Atmosfere e Meteo
        { title: "Oceano", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/ocean.mp3", loop: true },
        { title: "Foresta", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/forest.mp3", loop: true },
        { title: "Temporale", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/thunder.mp3", loop: true },
        { title: "Taverna", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/coffee-shop.mp3", loop: true },
        { title: "Notte Stellata", audioUrl: "https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/night.mp3", loop: true },
        { title: "Pioggia Tetto", audioUrl: "/assets/audio/rain_on_roof.mp3", loop: true },
        { title: "Pioggia Forte", audioUrl: "/assets/audio/rain_heavy_loud.mp3", loop: true },
        { title: "Vento Tempesta", audioUrl: "/assets/audio/wind_howling.mp3", loop: true },
        
        // Foley & Dungeon SFX
        { title: "Fulmine", audioUrl: "/assets/audio/thunder_crack.mp3", loop: false },
        { title: "Caduta Sassi", audioUrl: "/assets/audio/stone_drop.mp3", loop: false },
        { title: "Bossoli Caduta", audioUrl: "/assets/audio/50_cal_shells_drop.mp3", loop: false },
        { title: "Arma Ricarica", audioUrl: "/assets/audio/50cal_gun_cock_and_dry_fire.mp3", loop: false },

        // Creature e Animali
        { title: "Grilli Notte", audioUrl: "/assets/audio/afternoon_crickets_long.mp3", loop: true },
        { title: "Cicale", audioUrl: "/assets/audio/cicada_chirp.mp3", loop: true },
        { title: "Mosca Volante", audioUrl: "/assets/audio/buzzing_fly.mp3", loop: true },
        { title: "Gatto Fusa", audioUrl: "/assets/audio/cat_purr.mp3", loop: true },
        { title: "Corvo", audioUrl: "/assets/audio/crow_call.mp3", loop: false },
        { title: "Lupo / Ringhio", audioUrl: "/assets/audio/animal_bark_and_growl.mp3", loop: false },

        // Magia e Sci-Fi
        { title: "Sci-Fi Vortex", audioUrl: "/assets/audio/sci_fi_vortex.mp3", loop: true },
        { title: "Canto Alieno", audioUrl: "/assets/audio/alien_song.mp3", loop: true },
        { title: "Respiro Alieno", audioUrl: "/assets/audio/alien_breath.mp3", loop: true },
        { title: "Spazio Vuoto", audioUrl: "/assets/audio/outer_space.mp3", loop: true },
        { title: "Risonanza Cupa", audioUrl: "/assets/audio/forboding_resonance.mp3", loop: true },
        { title: "Ronzio Elettr.", audioUrl: "/assets/audio/electric_ring_long.mp3", loop: true },
        { title: "Codice Robot", audioUrl: "/assets/audio/robot_code.mp3", loop: false },

        // Orrore e Mostri
        { title: "Zombie Ringhio", audioUrl: "/assets/audio/aggressive_zombie_snarls.mp3", loop: false },
        { title: "Strido Mostro", audioUrl: "/assets/audio/alien_squawk_echo.mp3", loop: false },
        { title: "Taglio Carne", audioUrl: "/assets/audio/cutting_flesh.mp3", loop: false },
        { title: "Graffio Umido", audioUrl: "/assets/audio/carving_wet_scrape.mp3", loop: false },

        // Allarmi e UI
        { title: "Sveglia Camp.", audioUrl: "/assets/audio/alarm_clock.mp3", loop: false },
        { title: "Sveglia Digit.", audioUrl: "/assets/audio/digital_watch_alarm_long.mp3", loop: false },
        { title: "Fanfara Tada", audioUrl: "/assets/audio/tada_fanfare_a.mp3", loop: false },
        { title: "Tromba Adunata", audioUrl: "/assets/audio/bugle_tune.mp3", loop: false },
        { title: "Sirena Ambul.", audioUrl: "/assets/audio/ambulance_drive_siren.mp3", loop: false },
        { title: "Beep Emergenza", audioUrl: "/assets/audio/beeper_emergency_call.mp3", loop: false }
      ];
      for (const sound of defaultSounds) {
        await onCreateSoundEffect(sound);
      }
    } catch {
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-xl border border-white/10 bg-ink-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-white/8 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <Volume2 size={15} className="text-brass" />
          <span className="text-sm font-semibold text-white">Soundbar Rumori</span>
          {currentSoundEffectId && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">● LIVE</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
          title="Chiudi soundbar"
          aria-label="Chiudi soundbar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Sound pads */}
      <div className="p-3">
        {!soundEffects.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-slate-400">Nessun rumore salvato.<br />Carica i default per iniziare subito.</p>
            <button
              type="button"
              onClick={handleLoadDefaults}
              disabled={isInitializing}
              className="rounded-md border border-brass/30 bg-brass/15 px-3 py-1.5 text-xs font-medium text-brass transition hover:bg-brass/25 disabled:opacity-60"
            >
              {isInitializing ? "Caricamento..." : "Carica 40 Suoni Default (Atmosfere & Effetti)"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {soundEffects.map((effect) => (
              <div
                key={effect.id}
                className={`soundbar-pad-quick group relative flex items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 transition cursor-pointer ${
                  effect.id === currentSoundEffectId
                    ? "border-brass/40 bg-brass/15 text-brass"
                    : "border-white/8 bg-white/[0.04] text-slate-200 hover:border-white/15 hover:bg-white/[0.08]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTriggerSoundEffect(effect)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title={`Avvia: ${effect.title}`}
                >
                  <Volume2 size={13} className="shrink-0" />
                  <span className="truncate text-xs font-medium">{effect.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSoundEffect(effect)}
                  className="shrink-0 rounded p-0.5 text-slate-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  title={`Elimina ${effect.title}`}
                  aria-label={`Elimina rumore ${effect.title}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stop + Add buttons */}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onStopSoundEffect}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
          >
            <Square size={11} /> Stop rumore
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08]"
            title={showAddForm ? "Nascondi form" : "Aggiungi rumore"}
          >
            {showAddForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showAddForm ? "Nascondi" : "Aggiungi"}
          </button>
        </div>

        {/* Collapsible add form */}
        {showAddForm && (
          <form
            className="mt-3 grid gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!soundTitle.trim()) return;
              onCreateSoundEffect({ title: soundTitle.trim(), audioUrl: soundUrl.trim(), loop: soundLoop, audioFile: soundFile });
              setSoundTitle("");
              setSoundUrl("");
              setSoundFile(undefined);
              setSoundLoop(false);
            }}
          >
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Nuovo rumore</p>
            <input
              className="field px-2.5 py-1.5 text-xs"
              placeholder="Nome rumore"
              value={soundTitle}
              onChange={(event) => setSoundTitle(event.target.value)}
            />
            <input
              className="field px-2.5 py-1.5 text-xs"
              placeholder="Link audio (URL)"
              value={soundUrl}
              onChange={(event) => setSoundUrl(event.target.value)}
            />
            <label className="director-upload-target text-xs">
              Carica file audio
              <input className="sr-only" type="file" accept="audio/*" onChange={(event) => setSoundFile(event.target.files?.[0])} />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={soundLoop} onChange={(event) => setSoundLoop(event.target.checked)} />
              Loop rumore
            </label>
            <button className="director-primary-action text-xs py-1.5">
              <Plus size={13} /> Aggiungi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MediaLibraryPanel({
  assets,
  profileId,
  onCreate,
  onUpdateVisibility,
  onDelete
}: {
  assets: MediaAsset[];
  profileId: string;
  onCreate: (values: { title: string; assetType: MediaAsset["asset_type"]; url: string; tags: string[]; file?: File; visibility?: MediaAsset["visibility"] }) => void | Promise<void>;
  onUpdateVisibility: (asset: MediaAsset, visibility: MediaAsset["visibility"]) => void | Promise<void>;
  onDelete: (asset: MediaAsset) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState<MediaAsset["asset_type"]>("image");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<MediaAsset["visibility"]>("room");
  const [file, setFile] = useState<File | undefined>();
  const [isDragOver, setIsDragOver] = useState(false);
  const [query, setQuery] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Auto-detect type
    let detectedType: MediaAsset["asset_type"] = "image";
    if (selectedFile.type.startsWith("image/")) {
      detectedType = "image";
    } else if (selectedFile.type.startsWith("video/")) {
      detectedType = "video";
    } else if (selectedFile.type.startsWith("audio/")) {
      detectedType = "audio";
    }
    setAssetType(detectedType);

    // Default title from file name
    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
    const capitalizedTitle = baseName
      .replace(/[_\-]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    setTitle(capitalizedTitle);
  };
  const [typeFilter, setTypeFilter] = useState<MediaAsset["asset_type"] | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "room" | "mine" | "shared" | "global" | "portraits">("all");
  const ownedBytes = assets
    .filter((asset) => (asset.owner_id ?? asset.created_by) === profileId)
    .reduce((total, asset) => total + Number(asset.file_size ?? 0), 0);
  const quotaBytes = 2 * 1024 * 1024 * 1024;
  const quotaPercent = Math.min(100, Math.round((ownedBytes / quotaBytes) * 100));
  const visibleAssets = assets.filter((asset) => {
    if (typeFilter !== "all" && asset.asset_type !== typeFilter) return false;
    if (scopeFilter === "mine" && (asset.owner_id ?? asset.created_by) !== profileId) return false;
    if (scopeFilter === "room" && (asset.visibility ?? "room") !== "room") return false;
    if (scopeFilter === "shared" && (asset.visibility ?? "room") !== "shared") return false;
    if (scopeFilter === "global" && (asset.visibility ?? "room") !== "global") return false;
    if (scopeFilter === "portraits" && asset.asset_type !== "portrait") return false;
    return `${asset.title} ${asset.asset_type} ${(asset.tags ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase());
  });
  const mediaTypes: Array<MediaAsset["asset_type"] | "all"> = ["all", "image", "video", "map", "audio", "sound", "portrait", "object"];
  const scopeTabs: Array<{ id: typeof scopeFilter; label: string }> = [
    { id: "all", label: "Tutti" },
    { id: "room", label: "Stanza" },
    { id: "mine", label: "Miei" },
    { id: "shared", label: "Condivisi" },
    { id: "global", label: "Globali" },
    { id: "portraits", label: "Portrait" }
  ];

  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
          <Library size={16} /> Libreria media
        </h2>
        <input className="field max-w-xs px-3 py-2 text-sm" placeholder="Cerca asset..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.14em] text-brass">Spazio libreria personale</span>
          <span>{formatBytes(ownedBytes)} / {formatBytes(quotaBytes)}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`Spazio usato ${quotaPercent}%`}>
          <div className="h-full rounded-full bg-brass" style={{ width: `${quotaPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">La quota conteggia i file caricati con dimensione nota. I link esterni non consumano spazio misurabile.</p>
      </div>
      <div className="director-media-filterbar mt-4">
        {scopeTabs.map((tab) => (
          <button key={tab.id} type="button" className={scopeFilter === tab.id ? "is-active" : ""} onClick={() => setScopeFilter(tab.id)}>
            <span>{tab.label}</span>
            <small>
              {assets.filter((asset) => {
                if (tab.id === "all") return true;
                if (tab.id === "mine") return (asset.owner_id ?? asset.created_by) === profileId;
                if (tab.id === "portraits") return asset.asset_type === "portrait";
                return (asset.visibility ?? "room") === tab.id;
              }).length}
            </small>
          </button>
        ))}
      </div>
      <div className="director-media-filterbar mt-4">
        {mediaTypes.map((type) => {
          const count = type === "all" ? assets.length : assets.filter((asset) => asset.asset_type === type).length;
          return (
            <button key={type} type="button" className={typeFilter === type ? "is-active" : ""} onClick={() => setTypeFilter(type)}>
              <span>{type === "all" ? "Tutti" : type}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="director-media-grid grid content-start gap-3 md:grid-cols-2">
          {visibleAssets.map((asset) => (
            <article key={asset.id} className={`director-media-card director-media-card--${asset.asset_type}`}>
              <div className="aspect-video overflow-hidden rounded-md bg-black/40">
                {asset.asset_type === "image" || asset.asset_type === "portrait" || asset.asset_type === "object" || asset.asset_type === "map" ? (
                  <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${asset.url})` }} />
                ) : asset.asset_type === "video" ? (
                  <video className="h-full w-full object-cover" src={asset.url} muted playsInline />
                ) : (
                  <div className="flex h-full items-center justify-center text-brass">
                    <AudioLines size={28} />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{asset.title}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    {asset.asset_type} · {visibilityLabel(asset)}
                  </p>
                  {asset.file_size ? <p className="text-xs text-slate-500">{formatBytes(asset.file_size)}</p> : null}
                </div>
                <button type="button" onClick={() => onDelete(asset)} className="text-rose-200 hover:text-rose-100" title="Elimina asset" aria-label="Elimina asset">
                  <Trash2 size={16} />
                </button>
              </div>
              {!asset.id.includes(":") ? (
                <select
                  className="field mt-2 w-full px-2 py-1 text-xs"
                  value={asset.visibility ?? "room"}
                  onChange={(event) => onUpdateVisibility(asset, event.target.value as MediaAsset["visibility"])}
                  aria-label={`Visibilita ${asset.title}`}
                >
                  <option value="private">Privato</option>
                  <option value="room">Solo stanza</option>
                  <option value="shared">Condividi con Master</option>
                  <option value="global">Candidatura globale</option>
                </select>
              ) : null}
              {asset.visibility === "global" && asset.approval_status ? (
                <p className="mt-2 text-xs text-slate-400">Stato globale: {asset.approval_status}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {(asset.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-md bg-brass/10 px-2 py-1 text-xs text-brass">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {!visibleAssets.length ? <p className="text-sm text-slate-400">Nessun asset trovato.</p> : null}
        </div>
        <form
          className="grid content-start gap-2 rounded-lg border border-white/10 bg-black/20 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onCreate({
              title: title.trim(),
              assetType,
              url: url.trim(),
              tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
              file,
              visibility
            });
            setTitle("");
            setUrl("");
            setTags("");
            setVisibility("room");
            setFile(undefined);
          }}
        >
          <input className="field px-3 py-2 text-sm" placeholder="Titolo asset" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select className="field px-3 py-2 text-sm" value={assetType} onChange={(event) => setAssetType(event.target.value as MediaAsset["asset_type"])}>
            <option value="image">Immagine scena</option>
            <option value="video">Video scena</option>
            <option value="map">Mappa</option>
            <option value="audio">Musica</option>
            <option value="sound">Rumore</option>
            <option value="portrait">Portrait</option>
            <option value="object">Oggetto</option>
          </select>
          <input className="field px-3 py-2 text-sm" placeholder="Link asset" value={url} onChange={(event) => setUrl(event.target.value)} />
          <input className="field px-3 py-2 text-sm" placeholder="Tag separati da virgola" value={tags} onChange={(event) => setTags(event.target.value)} />
          <select className="field px-3 py-2 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as MediaAsset["visibility"])}>
            <option value="private">Privato, solo nella mia libreria</option>
            <option value="room">Disponibile in questa stanza</option>
            <option value="shared">Condiviso con altri Master</option>
            <option value="global">Proponi alla libreria globale</option>
          </select>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs transition-all duration-200 cursor-pointer ${
              isDragOver
                ? "border-ember-400 bg-ember-500/10 text-ember-300 shadow-[0_0_12px_rgba(249,115,22,0.15)] animate-pulse"
                : file
                ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-300"
                : "border-brass/30 bg-brass/5 text-brass hover:border-brass/50 hover:bg-brass/10"
            }`}
            onClick={() => document.getElementById("media-file-input")?.click()}
          >
            <input
              id="media-file-input"
              className="sr-only"
              type="file"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-1">
                <p className="font-semibold text-emerald-400">{"File pronto per l'upload"}</p>
                <p className="font-mono text-[10px] opacity-75">{file.name}</p>
                <p className="text-[10px] opacity-50">Dimensione: {formatBytes(file.size)}</p>
              </div>
            ) : (
              <div className="space-y-1.5 pointer-events-none">
                <p className="font-serif uppercase tracking-wider text-sm font-semibold">Trascina qui il file</p>
                <p className="opacity-70">oppure clicca per sfogliare</p>
                <p className="opacity-40 text-[10px]">Supporta Immagini, Video, Audio</p>
              </div>
            )}
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-ember-400/25 bg-ember-500/10 px-3 py-2 text-sm font-medium text-ember-100 hover:bg-ember-500/20">
            <Plus size={16} /> Salva asset
          </button>
        </form>
      </div>
    </section>
  );
}

function formatBytes(bytes?: number | null) {
  const value = Number(bytes ?? 0);
  if (!value) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function visibilityLabel(asset: MediaAsset) {
  const visibility = asset.visibility ?? "room";
  if (visibility === "private") return "privato";
  if (visibility === "shared") return "condiviso";
  if (visibility === "global") return asset.approval_status === "approved" ? "globale" : "globale in revisione";
  return "stanza";
}

function PlayersManager({
  state,
  onUpdateCharacter,
  onDeleteCharacter
}: {
  state: RoomState;
  onUpdateCharacter: (
    characterId: string,
    values: { characterName: string; characterSurname: string; portraitUrl: string; portraitFile?: File; color: string; hp: number; mentalState: string; visibleStatus: string; publicBackground: string; conditions: string }
  ) => void | Promise<void>;
  onDeleteCharacter: (characterId: string) => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(state.characters[0]?.id ?? "");
  const selected = state.characters.find((character) => character.id === selectedId) ?? state.characters[0];
  const [draft, setDraft] = useState(() => characterDraft(selected));
  const [portraitFile, setPortraitFile] = useState<File | undefined>();

  function selectCharacter(id: string) {
    const next = state.characters.find((character) => character.id === id);
    setSelectedId(id);
    setDraft(characterDraft(next));
    setPortraitFile(undefined);
  }

  if (!selected) {
    return (
      <section className="glass-panel rounded-lg p-4 text-sm text-slate-300">
        Nessun giocatore nella stanza.
      </section>
    );
  }

  return (
    <section className="director-tool-panel glass-panel rounded-lg p-4">
      <ToolHeading icon={<UsersRound size={17} />} eyebrow="Cast della sessione" title="Giocatori" detail="Aggiorna stati, ferite, condizioni e informazioni pubbliche dei personaggi." />
      <div className="mt-4 grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          {state.characters.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => selectCharacter(character.id)}
              className={`director-character-selector ${character.id === selected.id ? "is-active" : ""}`}
            >
              <span
                className={`h-10 w-10 shrink-0 rounded-lg bg-cover bg-center ${character.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
                style={character.portrait_url ? { backgroundImage: `url(${character.portrait_url})` } : undefined}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" style={{ color: character.color }}>
                  {character.character_name} {character.character_surname}
                </span>
                <span className="text-xs text-slate-400">PF {character.hp} · {character.visible_status}</span>
              </span>
            </button>
          ))}
        </div>
        <form
          className="director-create-panel grid gap-3 rounded-lg p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const metadata = {
              archetype: draft.archetype,
              origin: draft.origin,
              traits: draft.traitsString.split(",").map((t) => t.trim()).filter(Boolean),
              private_secret: draft.privateSecret,
              bio: draft.publicBio,
              appearance: draft.appearance,
              alignment: draft.alignment,
              bond: draft.bond
            };
            onUpdateCharacter(selected.id, {
              characterName: draft.characterName,
              characterSurname: draft.characterSurname,
              portraitUrl: draft.portraitUrl,
              color: draft.color,
              hp: draft.hp,
              mentalState: draft.mentalState,
              visibleStatus: draft.visibleStatus,
              conditions: draft.conditions,
              publicBackground: JSON.stringify(metadata),
              portraitFile
            });
            setPortraitFile(undefined);
          }}
        >
          <div className="director-character-dossier">
            <div className="h-24 w-24 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${draft.portraitUrl})` }} />
            <div className="min-w-0">
              <p className="director-form-title">Dossier personaggio</p>
              <h3 className="truncate font-serif text-2xl text-white" style={{ color: draft.color }}>{draft.characterName || "Nome"} {draft.characterSurname}</h3>
              <p className="mt-1 text-sm text-stone-400">PF {draft.hp} · {draft.mentalState || "Stabile"} · {draft.visibleStatus || "nessuno"}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="field px-3 py-2 text-sm" placeholder="Nome" value={draft.characterName} onChange={(event) => setDraft({ ...draft, characterName: event.target.value })} />
          <input className="field px-3 py-2 text-sm" placeholder="Cognome" value={draft.characterSurname} onChange={(event) => setDraft({ ...draft, characterSurname: event.target.value })} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_7rem]">
          <input className="field h-10 px-2 py-1" aria-label="Colore personaggio" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
          <input className="field px-3 py-2 text-sm" placeholder="Link portrait" value={draft.portraitUrl} onChange={(event) => setDraft({ ...draft, portraitUrl: event.target.value })} />
          <input className="field px-3 py-2 text-sm" type="number" value={draft.hp} onChange={(event) => setDraft({ ...draft, hp: Number(event.target.value) })} />
        </div>
        <button type="button" className="director-secondary-action" onClick={() => setDraft({ ...draft, portraitUrl: "" })}>
          Rimuovi portrait
        </button>
        <label className="director-upload-target">
          Carica nuovo portrait
          <input className="sr-only" type="file" accept="image/*" onChange={(event) => setPortraitFile(event.target.files?.[0])} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="field px-3 py-2 text-sm" placeholder="Stato mentale" value={draft.mentalState} onChange={(event) => setDraft({ ...draft, mentalState: event.target.value })} />
          <input className="field px-3 py-2 text-sm" placeholder="Religione / Credo" value={draft.visibleStatus} onChange={(event) => setDraft({ ...draft, visibleStatus: event.target.value })} />
        </div>
          <input className="field px-3 py-2 text-sm" placeholder="Condizioni con icone, separate da virgola" value={draft.conditions} onChange={(event) => setDraft({ ...draft, conditions: event.target.value })} />
          
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-400">
              Archetipo Narrativo
              <input className="field px-3 py-2 text-sm" placeholder="es. Investigatore, Hacker" value={draft.archetype} onChange={(event) => setDraft({ ...draft, archetype: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-slate-400">
              Origine / Background Narrativo
              <input className="field px-3 py-2 text-sm" placeholder="es. Strada, Nobiltà, Accademia, Eremita..." value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-400">
              Allineamento / Tratto Psicologico
              <select className="field px-3 py-2 text-sm" value={draft.alignment} onChange={(event) => setDraft({ ...draft, alignment: event.target.value })}>
                <option value="Idealista">Idealista</option>
                <option value="Pragmatico">Pragmatico</option>
                <option value="Cinico">Cinico</option>
                <option value="Ribelle">Ribelle</option>
                <option value="Altruista">Altruista</option>
                <option value="Opportunista">Opportunista</option>
                <option value="Neutrale">Neutrale</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-slate-400">
              Tratto Estetico Distintivo / Aspetto
              <input className="field px-3 py-2 text-sm" placeholder="es. Occhio bionico, Cicatrice sul volto" value={draft.appearance} onChange={(event) => setDraft({ ...draft, appearance: event.target.value })} />
            </label>
          </div>

          <label className="grid gap-1 text-xs text-slate-400">
            Tratti Speciali / Abilità (separati da virgola)
            <input className="field px-3 py-2 text-sm" placeholder="es. Forza fisica, Intuizione" value={draft.traitsString} onChange={(event) => setDraft({ ...draft, traitsString: event.target.value })} />
          </label>

          <label className="grid gap-1 text-xs text-slate-400">
            Connessione con il Gruppo / Legame Narrativo
            <input className="field px-3 py-2 text-sm" placeholder="es. Deve la vita al Detective, conosce l'Hacker da anni..." value={draft.bond} onChange={(event) => setDraft({ ...draft, bond: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            Segreto Privato (Visibile solo a Giocatore e Master)
            <textarea className="field min-h-16 resize-none px-3 py-2 text-sm border border-orange-500/25 bg-orange-500/5 shadow-[inset_0_0_8px_rgba(249,115,22,0.02)] text-amber-200" placeholder="Segreto del personaggio..." value={draft.privateSecret} onChange={(event) => setDraft({ ...draft, privateSecret: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            Biografia Pubblica (Biografia visibile a tutti)
            <textarea className="field min-h-20 resize-none px-3 py-2 text-sm" placeholder="Biografia pubblica..." value={draft.publicBio} onChange={(event) => setDraft({ ...draft, publicBio: event.target.value })} />
          </label>

          <div className="flex flex-wrap gap-2 mt-2">
            <button className="director-save-action flex-1">
              Salva giocatore
            </button>
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(`Sei sicuro di voler rimuovere il giocatore "${selected.character_name} ${selected.character_surname}" dalla sessione della stanza? Questa azione è irreversibile e libererà il suo posto.`);
                if (confirmed) {
                  onDeleteCharacter(selected.id);
                }
              }}
              className="director-danger-action font-semibold text-red-100"
            >
              Rimuovi dalla sessione
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function characterDraft(character?: RoomState["characters"][number]) {
  const meta = parseCharacterMetadata(character?.public_background);
  return {
    characterName: character?.character_name ?? "",
    characterSurname: character?.character_surname ?? "",
    portraitUrl: character?.portrait_url ?? "",
    color: character?.color ?? "#f59e0b",
    hp: character?.hp ?? 10,
    mentalState: character?.mental_state ?? "Stabile",
    visibleStatus: character?.visible_status ?? "Nessuno",
    conditions: (character?.conditions ?? []).join(", "),
    archetype: meta.archetype || "",
    origin: meta.origin || "",
    traitsString: meta.traits.join(", "),
    privateSecret: meta.private_secret || "",
    publicBio: meta.bio || "",
    appearance: meta.appearance || "",
    alignment: meta.alignment || "Pragmatico",
    bond: meta.bond || ""
  };
}

function InventoryPanel({
  state,
  onCreateInventoryItem,
  onDeleteInventoryItem
}: {
  state: RoomState;
  onCreateInventoryItem: (characterId: string, values: { name: string; description: string; quantity: number; imageUrl: string; isPublic: boolean; masterNotes: string }) => void | Promise<void>;
  onDeleteInventoryItem: (item: InventoryItem) => void | Promise<void>;
}) {
  const [characterId, setCharacterId] = useState(state.characters[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [masterNotes, setMasterNotes] = useState("");
  const selectedCharacter = state.characters.find((character) => character.id === characterId) ?? state.characters[0];
  const visibleInventory = selectedCharacter ? state.inventory.filter((item) => item.character_id === selectedCharacter.id) : [];

  return (
    <section className="director-tool-panel glass-panel rounded-lg p-4">
      <ToolHeading icon={<Shield size={17} />} eyebrow="Oggetti di scena" title="Inventari" detail="Assegna oggetti, decidi cosa e pubblico e conserva note riservate da Master." />
      <form
        className="director-create-panel mt-4 grid gap-2 rounded-lg p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedCharacter || !name.trim()) return;
          onCreateInventoryItem(selectedCharacter.id, {
            name: name.trim(),
            description: description.trim(),
            quantity,
            imageUrl: imageUrl.trim(),
            isPublic,
            masterNotes: masterNotes.trim()
          });
          setName("");
          setDescription("");
          setImageUrl("");
          setQuantity(1);
          setIsPublic(false);
          setMasterNotes("");
        }}
      >
        <p className="director-form-title">Assegna oggetto</p>
        <select className="field px-3 py-2 text-sm" value={selectedCharacter?.id ?? ""} onChange={(event) => setCharacterId(event.target.value)}>
          {state.characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.character_name} {character.character_surname}
            </option>
          ))}
        </select>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <input className="field px-3 py-2 text-sm" placeholder="Nome oggetto" value={name} onChange={(event) => setName(event.target.value)} />
          <input
            className="field px-3 py-2 text-sm"
            aria-label="Quantita oggetto"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
          />
        </div>
        <textarea
          className="field min-h-20 resize-none px-3 py-2 text-sm"
          placeholder="Descrizione oggetto"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <input className="field px-3 py-2 text-sm" placeholder="Link immagine oggetto" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        <textarea
          className="field min-h-16 resize-none px-3 py-2 text-sm"
          placeholder="Note Master"
          value={masterNotes}
          onChange={(event) => setMasterNotes(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          Visibile pubblicamente
        </label>
        <button className="director-primary-action">
          <Plus size={16} /> Aggiungi oggetto
        </button>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleInventory.map((item) => (
          <article key={item.id} className={`director-inventory-card ${item.is_public ? "is-public" : ""}`}>
            {item.image_url ? <div className="director-inventory-thumb" style={{ backgroundImage: `url(${item.image_url})` }} /> : null}
            <div className="min-w-0">
              <p className="font-serif text-base text-white">
                {item.name} <span className="text-xs text-slate-400">x{item.quantity}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{item.description}</p>
              <p className="mt-2 inline-flex rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">{item.is_public ? "Pubblico" : "Privato"}</p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteInventoryItem(item)}
              className="director-danger-icon"
              title={`Rimuovi ${item.name}`}
              aria-label={`Rimuovi ${item.name}`}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
        {!visibleInventory.length ? <DirectorEmptyState title="Inventario vuoto" text="Questo personaggio non ha ancora oggetti assegnati." /> : null}
      </div>
    </section>
  );
}

type MasterActionHotbarProps = {
  state: RoomState;
  activeTool: ControlTool;
  setActiveTool: (tool: ControlTool) => void;
  isSoundbarOpen: boolean;
  setIsSoundbarOpen: (open: boolean) => void;
  immersiveMode: boolean;
  onToggleImmersive: () => void;
  localVolume: number;
  localMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onMutedChange: (muted: boolean) => void;
  isMobileRightRailOpen?: boolean;
  onToggleMobileRightRail?: () => void;
};

function MasterActionHotbar({
  state,
  activeTool,
  setActiveTool,
  isSoundbarOpen,
  setIsSoundbarOpen,
  immersiveMode,
  onToggleImmersive,
  localVolume,
  localMuted,
  onVolumeChange,
  onMutedChange,
  isMobileRightRailOpen,
  onToggleMobileRightRail
}: MasterActionHotbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationStorageKey = `gdr_seen_notifications:${state.room.id}:${state.profile.id}:master`;
  const [seenNotificationKeys, setSeenNotificationKeys] = useState<Set<string>>(() => readSeenNotificationKeys(notificationStorageKey));
  const notificationPanelId = "master-notification-center";

  const pendingDiceRequests = state.diceRequests.filter((request) => request.status === "pending");
  const activeSpotlightNpc = state.room.spotlight_npc_id ? state.npcs.find((npc) => npc.id === state.room.spotlight_npc_id) : null;
  const smartNotifications = useMemo(() => buildMasterNotifications(state), [state]);
  const unreadSmartNotifications = smartNotifications.filter((item) => !seenNotificationKeys.has(notificationReadKey(item)));
  const totalNotifications = notificationBadgeCount(unreadSmartNotifications);
  const criticalCount = smartNotifications.filter((item) => item.priority === "critical" || item.priority === "high").length;

  const tools: Array<{ id: ControlTool; label: string; icon: React.ReactNode }> = [
    { id: "preview", label: "Regia", icon: <Eye size={14} /> },
    { id: "scenes", label: "Scene", icon: <ImageUp size={14} /> },
    { id: "map", label: "Mappa", icon: <MapPinned size={14} /> },
    { id: "chat", label: "Chat", icon: <MessageSquareText size={14} /> },
    { id: "players", label: "Eroi", icon: <UsersRound size={14} /> },
    { id: "audio", label: "Audio", icon: <AudioLines size={14} /> },
    { id: "media", label: "Media", icon: <Library size={14} /> },
    { id: "inventory", label: "Zaini", icon: <Shield size={14} /> }
  ];

  const handleNotificationAction = (item: SmartNotification) => {
    if (item.actionTarget === "chat") setActiveTool("chat");
    if (item.actionTarget === "players") setActiveTool("players");
    if (item.actionTarget === "audio") setActiveTool("audio");
    if (item.actionTarget === "inventory") setActiveTool("inventory");
    setShowNotifications(false);
    playUiClick();
  };

  useEffect(() => {
    setSeenNotificationKeys(readSeenNotificationKeys(notificationStorageKey));
  }, [notificationStorageKey]);

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 ui-hotbar-panel shadow-2xl transition-all duration-300">
      
      {/* 🔔 Notifications Hub */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const nextVisible = !showNotifications;
            setShowNotifications(nextVisible);
            if (nextVisible) {
              const nextSeen = new Set([...seenNotificationKeys, ...smartNotifications.map(notificationReadKey)]);
              setSeenNotificationKeys(nextSeen);
              writeSeenNotificationKeys(notificationStorageKey, nextSeen);
            }
            playUiClick();
          }}
          onMouseEnter={playUiHover}
          className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${
            showNotifications
              ? "border-brass bg-brass/20 text-brass"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass"
          }`}
          title="Notifiche attive"
          aria-label={`${showNotifications ? "Chiudi" : "Apri"} notifiche Master${totalNotifications > 0 ? `, ${totalNotifications} eventi attivi` : ""}`}
          aria-expanded={showNotifications}
          aria-controls={notificationPanelId}
        >
          <Bell size={14} />
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold text-white animate-pulse">
              {totalNotifications}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            id={notificationPanelId}
            className="absolute bottom-12 left-0 z-50 w-72 rounded-xl border border-white/10 bg-ink-950/95 p-3 shadow-xl backdrop-blur-md space-y-2 text-left"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <h3 className="text-xs font-semibold text-brass uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-white/5">
              <Bell size={12} /> Notifiche Master
            </h3>
            {totalNotifications > 0 ? (
              <div className="grid grid-cols-2 gap-1 text-center text-[10px] text-stone-300">
                <span className="rounded border border-amber-300/20 bg-amber-500/10 px-1.5 py-1">{pendingDiceRequests.length} tiri pendenti</span>
                <span className="rounded border border-brass/20 bg-brass/10 px-1.5 py-1">{activeSpotlightNpc ? 1 : 0} spotlight</span>
              </div>
            ) : null}
            {smartNotifications.length ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {criticalCount ? `${criticalCount} priorita alte` : "Regia stabile"}
                </p>
                <div className="grid gap-1.5">
                  {smartNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNotificationAction(item)}
                      className={`rounded border p-2 text-left text-[11px] transition hover:bg-white/[0.06] ${notificationToneClass(item.priority)}`}
                    >
                      <span className="block font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-slate-300/80">{item.detail}</span>
                      {item.actionLabel ? <span className="mt-1 block text-[10px] uppercase tracking-[0.15em] opacity-75">{item.actionLabel}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-soft">
              {pendingDiceRequests.map((req) => {
                const targetChar = state.characters.find((c) => c.user_id === req.target_user_id);
                const targetName = targetChar ? `${targetChar.character_name}` : "Tutti";
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setActiveTool("chat");
                      setShowNotifications(false);
                      playUiClick();
                    }}
                    className="flex w-full flex-col gap-1 rounded border border-amber-300/20 bg-amber-500/10 p-2 text-left text-[11px] text-amber-50 transition hover:bg-amber-500/15"
                  >
                    <span className="font-semibold text-amber-400 flex items-center gap-1">
                      <Sparkles size={11} /> Tiro pendente · d{req.dice_sides} ({targetName})
                    </span>
                    <span>Motivo: &ldquo;{req.reason}&rdquo;</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">Apri chat e richieste</span>
                  </button>
                );
              })}
              {activeSpotlightNpc && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("chat");
                    setShowNotifications(false);
                    playUiClick();
                  }}
                  className="flex w-full flex-col gap-0.5 rounded border border-brass/20 bg-brass/10 p-2 text-left text-[11px] text-stone-200 transition hover:bg-brass/15"
                >
                  <span className="font-semibold text-brass flex items-center gap-1">
                    <Eye size={11} /> NPC in spotlight
                  </span>
                  <span><strong>{activeSpotlightNpc.name}</strong> è in evidenza scenica.</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-brass/80">Apri strumenti chat/NPC</span>
                </button>
              )}
              {totalNotifications === 0 && (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-slate-500 italic">
                  <Check size={14} className="text-emerald-500" /> Nessun evento attivo.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* 🛠️ GM Tools Navigation */}
      <div className="flex items-center gap-1.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              setActiveTool(tool.id);
              playUiClick();
            }}
            onMouseEnter={playUiHover}
            className={`flex items-center gap-1 px-3 py-1.5 rounded ui-btn-fantasy transition-all duration-200 ${
              activeTool === tool.id ? "brightness-125 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]" : ""
            }`}
            title={tool.label}
            aria-label={`Apri strumento ${tool.label}`}
            aria-pressed={activeTool === tool.id}
          >
            {tool.icon}
            <span className="hidden md:inline text-[11px] font-serif uppercase tracking-wider">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* 🎵 Soundbar Toggle */}
      <button
        type="button"
        onClick={() => {
          setIsSoundbarOpen(!isSoundbarOpen);
          playUiClick();
        }}
        onMouseEnter={playUiHover}
        className={`flex items-center gap-1 px-3 py-1.5 rounded ui-btn-fantasy transition-all duration-200 ${
          isSoundbarOpen ? "brightness-125 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]" : ""
        }`}
        title="Apri Soundbar"
        aria-label="Apri soundbar rumori"
        aria-expanded={isSoundbarOpen}
      >
        <Volume2 size={14} />
        <span className="hidden md:inline text-[11px] font-serif uppercase tracking-wider">Soundbar</span>
      </button>

      <div className="h-4 w-px bg-white/10" />

      {/* 🔊 Local Audio Control (GM Local Volume/Mute) */}
      <div className="relative flex items-center gap-1.5 group">
        <button
          type="button"
          onClick={() => {
            onMutedChange(!localMuted);
            playUiClick();
          }}
          onMouseEnter={playUiHover}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            localMuted ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
          title={localMuted ? "Riattiva audio Master" : "Muta audio Master"}
        >
          {localMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div className="w-0 overflow-hidden group-hover:w-20 transition-all duration-300 ease-in-out flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={localMuted ? 0 : localVolume}
            onChange={(e) => {
              onVolumeChange(Number(e.target.value));
            }}
            className="w-16 h-1 accent-brass bg-stone-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Volume locale Master"
          />
        </div>
      </div>

      <div className="h-4 w-px bg-white/10" />

      {onToggleMobileRightRail ? (
        <>
          <button
            type="button"
            onClick={() => {
              onToggleMobileRightRail();
              playUiClick();
            }}
            onMouseEnter={playUiHover}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition 2xl:hidden ${
              isMobileRightRailOpen ? "bg-brass/20 text-brass border border-brass/40 animate-pulse" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            title="Info Sessione"
            aria-label="Toggle info sessione"
          >
            <SlidersHorizontal size={14} />
          </button>
          <div className="h-4 w-px bg-white/10 2xl:hidden" />
        </>
      ) : null}

      {/* ⚙️ Immersive Mode Toggle */}
      <button
        type="button"
        onClick={() => {
          onToggleImmersive();
          playUiClick();
        }}
        onMouseEnter={playUiHover}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          immersiveMode ? "bg-brass/15 text-brass" : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
        title={immersiveMode ? "Mostra Interfaccia Regia" : "Modalità Immersiva Master"}
        aria-label={immersiveMode ? "Mostra interfaccia regia" : "Attiva modalità immersiva Master"}
        aria-pressed={immersiveMode}
      >
        {immersiveMode ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
