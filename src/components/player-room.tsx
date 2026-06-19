"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import type React from "react";
import { ArrowLeft, Backpack, BookOpenText, CircleHelp, Copy, Eye, EyeOff, MapPinned, MessageCircle, Plus, ScrollText, UsersRound, X, UserRound, Lock, BookOpen, Heart, Sparkles, Bell, Check, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import type { AudioTrack, Message, RoomState } from "@/lib/types";
import { splitSides } from "@/lib/utils";
import { AudioPlayer } from "@/components/room/audio-player";
import { ChatPanel } from "@/components/room/chat-panel";
import { CharacterRail } from "@/components/room/character-rail";
import { PlayerDrawer } from "@/components/room/player-drawer";
import { SceneStage } from "@/components/room/scene-stage";
import { SoundEffectPlayer } from "@/components/room/sound-effect-player";
import { ExportChatButton, OffChatPanel, PrivateThreadsPanel } from "@/components/room/social-panels";
import { PlayerDicePanel, SpotlightPanel } from "@/components/room/dice-and-spotlight";
import { MapToolPanel } from "@/components/room/map-tool-panel";
import type { DiceRequest } from "@/lib/types";
import { parseCharacterMetadata } from "@/lib/character-metadata";
import { rollDice as rollDiceValues } from "@/lib/game-random";
import { playUiClick, playUiHover } from "@/lib/sound-generator";
import { buildPlayerNotifications, notificationBadgeCount, notificationReadKey, notificationToneClass, readSeenNotificationKeys, writeSeenNotificationKeys, type SmartNotification } from "@/lib/notifications";
import { buildPlayerEngagement } from "@/lib/engagement";


type PlayerRoomProps = {
  state: RoomState;
  currentAudio: AudioTrack;
  onBack: () => void;
  onSend: (content: string) => void;
  onPrivateSend: (content: string, recipientUserId: string) => void;
  onOffSend: (content: string) => void;
  onTyping: (channel: "gdr" | "off" | "private", recipientUserId?: string | null) => void;
  onRollDice: (request: DiceRequest) => void;
  onCreateNote: (values: { title: string; content: string }) => void;
  onLoadOlderMessages: () => void;
  onExportMessages: () => Promise<Message[]>;
};

type MobileTab = "chat" | "map" | "sheet" | "private" | "off";
type UtilityPanel = "next" | "notes" | "inventory" | "private" | "map" | "sheet" | "help" | null;

export function PlayerRoom({ state, currentAudio, onBack, onSend, onPrivateSend, onOffSend, onTyping, onRollDice, onCreateNote, onLoadOlderMessages, onExportMessages }: PlayerRoomProps) {
  const [playerText, setPlayerText] = useState("");
  const [offText, setOffText] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [utilityPanel, setUtilityPanel] = useState<UtilityPanel>(null);
  const [sheetCharacterId, setSheetCharacterId] = useState<string | null>(null);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [seenPrivateIds, setSeenPrivateIds] = useState<Set<string>>(new Set());
  const [seenInventoryIds, setSeenInventoryIds] = useState<Set<string>>(new Set());
  const prevHpRef = useRef<number | undefined>(undefined);
  const notificationBaselineRef = useRef(false);
  const utilityTriggerRef = useRef<HTMLElement | null>(null);
  
  // Lifted local audio states
  const [localVolume, setLocalVolume] = useState<number>(55);
  const [localMuted, setLocalMuted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVol = localStorage.getItem("gdr_local_volume");
      const savedMuted = localStorage.getItem("gdr_local_muted");
      if (savedVol !== null) setLocalVolume(Number(savedVol));
      if (savedMuted !== null) setLocalMuted(savedMuted === "true");
    }
  }, []);

  const handleLocalVolumeChange = (vol: number) => {
    setLocalVolume(vol);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_local_volume", String(vol));
    }
  };

  const handleLocalMutedChange = (muted: boolean) => {
    setLocalMuted(muted);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_local_muted", String(muted));
    }
  };

  const [leftCharacters, rightCharacters] = useMemo(() => splitSides(state.characters), [state.characters]);
  const currentCharacter = state.characters.find((character) => character.user_id === state.profile.id) ?? state.characters[0];
  const sheetCharacter = state.characters.find((character) => character.id === sheetCharacterId) ?? currentCharacter;
  const modalCharacter = utilityPanel === "sheet" ? sheetCharacter : currentCharacter;
  const currentCharacterHp = currentCharacter?.hp;
  const incomingPrivateMessages = useMemo(
    () => state.privateMessages.filter((message) => message.sender_user_id !== state.profile.id),
    [state.privateMessages, state.profile.id]
  );
  const currentCharacterItems = useMemo(
    () => (currentCharacter ? state.inventory.filter((item) => item.character_id === currentCharacter.id) : []),
    [currentCharacter, state.inventory]
  );
  const unreadPrivateCount = incomingPrivateMessages.filter((message) => !seenPrivateIds.has(message.id)).length;
  const unreadInventoryCount = currentCharacterItems.filter((item) => !seenInventoryIds.has(item.id)).length;

  useEffect(() => {
    if (notificationBaselineRef.current) return;
    notificationBaselineRef.current = true;
    setSeenPrivateIds(new Set(incomingPrivateMessages.map((message) => message.id)));
    setSeenInventoryIds(new Set(currentCharacterItems.map((item) => item.id)));
  }, [incomingPrivateMessages, currentCharacterItems]);

  const markPrivateSeen = useCallback(() => {
    setSeenPrivateIds(new Set(incomingPrivateMessages.map((message) => message.id)));
  }, [incomingPrivateMessages]);

  const markInventorySeen = useCallback(() => {
    setSeenInventoryIds(new Set(currentCharacterItems.map((item) => item.id)));
  }, [currentCharacterItems]);

  const openUtility = (panel: Exclude<UtilityPanel, null>) => {
    utilityTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (panel === "sheet") {
      setSheetCharacterId(currentCharacter?.id ?? null);
    }
    if (panel === "private") markPrivateSeen();
    if (panel === "inventory") markInventorySeen();
    setUtilityPanel(panel);
  };

  const closeUtility = () => {
    setUtilityPanel(null);
    window.requestAnimationFrame(() => utilityTriggerRef.current?.focus());
  };

  const openCharacterSheet = (characterId: string) => {
    setSheetCharacterId(characterId);
    setUtilityPanel("sheet");
  };

  useEffect(() => {
    if (currentCharacterHp !== undefined) {
      if (prevHpRef.current !== undefined && currentCharacterHp < prevHpRef.current) {
        import("@/lib/sound-generator").then((mod) => mod.playUiDamage());
        setDamageFlash(true);
        const timer = setTimeout(() => setDamageFlash(false), 900);
        return () => clearTimeout(timer);
      }
      prevHpRef.current = currentCharacterHp;
    }
  }, [currentCharacterHp]);

  useEffect(() => {
    if (mobileTab === "private") markPrivateSeen();
    if (mobileTab === "sheet") markInventorySeen();
  }, [markInventorySeen, markPrivateSeen, mobileTab]);
  const visibleDiceRequests = state.diceRequests.filter((request) => !request.target_user_id || request.target_user_id === state.profile.id);
  const spotlightVisible = state.room.spotlight_visibility !== "off" && Boolean(state.room.spotlight_npc_id);
  const soundEffectVisible = Boolean(state.room.current_sound_effect_id);
  const isPlayerTurn = !state.room.turn_enabled || 
    (state.room.turn_order && state.room.turn_order[state.room.current_turn_index ?? 0] === state.profile.id);

  const chatDisabledForPlayer = state.room.chat_enabled === false || 
    Boolean(state.room.muted_user_ids?.includes(state.profile.id)) ||
    !isPlayerTurn;

  const disabledReason = state.room.chat_enabled === false 
    ? "Chat comune disattivata dal Master" 
    : state.room.muted_user_ids?.includes(state.profile.id)
      ? "Il Master ha disattivato la tua chat"
      : (() => {
          const activeUserId = state.room.turn_order && state.room.turn_order[state.room.current_turn_index ?? 0];
          const activeCharacter = state.characters.find((c) => c.user_id === activeUserId);
          const activeName = activeCharacter ? `${activeCharacter.character_name} ${activeCharacter.character_surname}`.trim() : "un altro giocatore";
          return `Non è il tuo turno. Attendi che parli: ${activeName}`;
        })();

  return (
    <section className={`player-room-shell relative -m-4 min-h-screen overflow-hidden px-3 py-3 sm:-m-6 sm:px-4 sm:py-4 ${immersiveMode ? "is-immersive" : ""}`}>
      {damageFlash && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes damage-pulse {
              0% { opacity: 0; }
              10% { opacity: 1; }
              100% { opacity: 0; }
            }
            .animate-damage-flash {
              animation: damage-pulse 0.9s ease-out forwards;
            }
          `}} />
          <div className="pointer-events-none fixed inset-0 z-50 animate-damage-flash border-[12px] border-red-600/35 bg-red-600/[0.06] shadow-[inset_0_0_100px_rgba(220,38,38,0.65)]" />
        </>
      )}
      <div className="pointer-events-none absolute inset-0 app-theme-bg bg-cover bg-center opacity-45" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,3,7,0.92),rgba(3,5,9,0.68)_50%,rgba(2,3,7,0.92)),linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.82))]" />
      <div className="relative z-10 grid gap-3">
        <PlayerHeader
          state={state}
          onBack={onBack}
          privateCount={unreadPrivateCount}
          inventoryCount={unreadInventoryCount}
          currentCharacter={currentCharacter}
          onOpenUtility={openUtility}
          immersiveMode={immersiveMode}
          onToggleImmersive={() => setImmersiveMode((value) => !value)}
        />
        <MobileCharacterStrip characters={state.characters} currentUserId={state.profile.id} onOpenCharacter={openCharacterSheet} />
        <div className={`grid gap-3 ${immersiveMode ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[17rem_minmax(0,1fr)_17rem]"}`}>
      {immersiveMode ? null : <CharacterRail side="left" characters={leftCharacters} inventory={state.inventory} onOpenCharacter={openCharacterSheet} />}

      <div className="grid min-w-0 gap-3">
        {spotlightVisible ? <SpotlightPanel room={state.room} npcs={state.npcs} currentUserId={state.profile.id} /> : null}
        {soundEffectVisible ? <SoundEffectPlayer room={state.room} soundEffects={state.soundEffects} /> : null}
        <SceneStage scene={state.scene} compact />
        {visibleDiceRequests.length > 0 ? <PlayerDicePanel requests={visibleDiceRequests} onRoll={onRollDice} /> : null}
        <MobilePlayerTabs active={mobileTab} onChange={setMobileTab} />
        <div className={mobileTab === "chat" ? "block" : "hidden lg:block"}>
          <ChatPanel
            messages={state.messages}
            value={playerText}
            onChange={setPlayerText}
            onSend={(text) => {
              if (chatDisabledForPlayer) return;
              const msg = text || playerText;
              if (!msg.trim()) return;
              onSend(msg.trim());
              setPlayerText("");
            }}
            disabled={chatDisabledForPlayer}
            disabledReason={disabledReason}
            onTyping={() => onTyping("gdr")}
            onLoadOlder={onLoadOlderMessages}
            hasOlderMessages={state.hasOlderMessages}
            currentUserId={state.profile.id}
            characters={state.characters}
            npcs={state.npcs}
            showAvatars
            typing={state.typing}
            diceRequests={state.diceRequests}
            onRollDice={onRollDice}
          />
        </div>
        <div className={mobileTab === "sheet" ? "block" : "hidden lg:block"}>
          <ExportChatButton messages={[...state.messages, ...state.offMessages, ...state.privateMessages]} onLoadAll={onExportMessages} />
          <div className="mt-4">
            <PlayerDrawer
              character={currentCharacter}
              inventory={state.inventory}
              notes={state.notes}
              privateMessages={state.privateMessages}
              onCreateNote={onCreateNote}
            />
          </div>
        </div>
        <div className={mobileTab === "map" ? "block" : "hidden lg:block"}>
          <MapToolPanel state={state} isMaster={false} />
        </div>
        <div className={mobileTab === "private" ? "block" : "hidden lg:block"}>
          <details className="glass-panel rounded-lg p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-white">Privati con il Master</summary>
            <div className="mt-4">
              <PrivateThreadsPanel
                profile={state.profile}
                characters={state.characters}
                messages={state.privateMessages}
                masterId={state.campaigns[0].master_id}
                isMaster={false}
                onSend={onPrivateSend}
              />
            </div>
          </details>
        </div>
        <div className={mobileTab === "off" ? "block" : "hidden lg:block"}>
          <OffChatPanel
            messages={state.offMessages}
            value={offText}
            onChange={(value) => {
              setOffText(value);
              if (value.trim()) onTyping("off");
            }}
            onSend={() => {
              if (!offText.trim()) return;
              onOffSend(offText.trim());
              setOffText("");
            }}
          />
        </div>
        <AudioPlayer 
          track={currentAudio} 
          status={state.room.audio_status}
          externalVolume={localVolume}
          externalMuted={localMuted}
          onVolumeChange={handleLocalVolumeChange}
          onMutedChange={handleLocalMutedChange}
        />
      </div>

      {immersiveMode ? null : <CharacterRail side="right" characters={rightCharacters} inventory={state.inventory} onOpenCharacter={openCharacterSheet} />}
        </div>
      </div>
      {modalCharacter ? (
        <PlayerUtilityModal
          panel={utilityPanel}
          state={state}
          character={modalCharacter}
          onClose={closeUtility}
          onCreateNote={onCreateNote}
          onPrivateSend={onPrivateSend}
          inventoryCount={currentCharacterItems.length}
          privateCount={incomingPrivateMessages.length}
          onOpenUtility={openUtility}
          onOpenTab={(tab) => {
            setMobileTab(tab);
            setUtilityPanel(null);
          }}
        />
      ) : null}

      {/* ACTION HOTBAR (FEATURE 9) */}
      <PlayerActionHotbar
        state={state}
        currentCharacter={currentCharacter}
        profile={state.profile}
        masterId={state.campaigns[0].master_id}
        onSend={onSend}
        onPrivateSend={onPrivateSend}
        inviteCode={state.room.invite_code}
        immersiveMode={immersiveMode}
        onToggleImmersive={() => setImmersiveMode((value) => !value)}
        onOpenUtility={openUtility}
        unreadPrivateCount={unreadPrivateCount}
        unreadInventoryCount={unreadInventoryCount}
        onMarkNotificationsSeen={() => {
          markPrivateSeen();
          markInventorySeen();
        }}
        localVolume={localVolume}
        localMuted={localMuted}
        onVolumeChange={handleLocalVolumeChange}
        onMutedChange={handleLocalMutedChange}
      />
    </section>
  );
}

function PlayerHeader({
  state,
  onBack,
  privateCount,
  inventoryCount,
  currentCharacter,
  onOpenUtility,
  immersiveMode,
  onToggleImmersive
}: {
  state: RoomState;
  onBack: () => void;
  privateCount: number;
  inventoryCount: number;
  currentCharacter?: RoomState["characters"][number];
  onOpenUtility: (panel: Exclude<UtilityPanel, null>) => void;
  immersiveMode: boolean;
  onToggleImmersive: () => void;
}) {
  return (
    <header className="player-room-header rounded-xl p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" onClick={onBack} className="player-logo-mark" title="Torna al menu" aria-label="Torna al menu">
            <span />
          </button>
          <button type="button" onClick={onBack} className="player-menu-button">
            <ArrowLeft size={16} /> Menu
          </button>
          <div className="min-w-0">
            <p className="player-session-kicker">Stanza narrativa</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate font-serif text-2xl text-stone-100 sm:text-3xl">{state.campaigns[0].title}</h1>
              <span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">In corso</span>
            </div>
            <p className="mt-1 text-sm text-stone-300">{state.room.name} · {state.scene.title}</p>
            <p className="mt-1 line-clamp-1 text-sm text-stone-400">{state.campaigns[0].description}</p>
          </div>
        </div>
        <div className="grid gap-2 xl:min-w-[36rem]">
          {currentCharacter ? (
            <div className="player-current-strip">
              <span
                className={`h-12 w-12 shrink-0 rounded-lg bg-cover bg-center ${currentCharacter.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
                style={currentCharacter.portrait_url ? { backgroundImage: `url(${currentCharacter.portrait_url})` } : undefined}
              />
              <span className="min-w-0">
                <small>Stai interpretando</small>
                <strong style={{ color: currentCharacter.color }}>{currentCharacter.character_name} {currentCharacter.character_surname}</strong>
              </span>
              <span className="player-current-stat">PF {currentCharacter.hp}</span>
            </div>
          ) : null}
          <div className="player-header-actions grid gap-2 sm:grid-cols-3 xl:grid-cols-7" aria-label="Strumenti rapidi giocatore">
            <HeaderAction icon={<Sparkles size={16} />} label="Azioni" atlasArea="regia" onClick={() => onOpenUtility("next")} />
            <HeaderAction icon={<ScrollText size={16} />} label="Note" atlasArea="scene" onClick={() => onOpenUtility("notes")} />
            <HeaderAction icon={<Backpack size={16} />} label="Inventario" atlasArea="zaini" badge={inventoryCount} onClick={() => onOpenUtility("inventory")} />
            <HeaderAction icon={<BookOpenText size={16} />} label="Sussurri" atlasArea="chat" badge={privateCount} onClick={() => onOpenUtility("private")} />
            <HeaderAction icon={<MapPinned size={16} />} label="Mappa" atlasArea="mappa" onClick={() => onOpenUtility("map")} />
            <HeaderAction icon={immersiveMode ? <EyeOff size={16} /> : <Eye size={16} />} label={immersiveMode ? "UI" : "Immersione"} atlasArea="media" onClick={onToggleImmersive} />
            <HeaderAction icon={<UserRound size={16} />} label="Scheda" atlasArea="eroi" onClick={() => onOpenUtility("sheet")} />
            <InfoTile label="Stanza" value={state.scene.title} />
            <InfoTile label="Codice invito" value={state.room.invite_code} copy />
          </div>
        </div>
      </div>
      <span className="mysterium-corners-br" />
    </header>
  );
}

function HeaderAction({
  icon,
  label,
  atlasArea,
  badge,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  atlasArea: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="player-header-action"
      data-atlas-area={atlasArea}
      aria-label={`${label}${badge ? `, ${badge} nuove notifiche` : ""}`}
      onMouseEnter={() => {
        import("@/lib/sound-generator").then((mod) => mod.playUiHover());
      }}
      onClick={() => {
        import("@/lib/sound-generator").then((mod) => {
          mod.playUiClick();
          mod.playUiModalOpen();
        });
        onClick();
      }}
    >
      {icon}
      {label ? <span>{label}</span> : null}
      {badge ? <strong>{badge}</strong> : null}
    </button>
  );
}

function MobileCharacterStrip({ characters, currentUserId, onOpenCharacter }: { characters: RoomState["characters"]; currentUserId: string; onOpenCharacter: (characterId: string) => void }) {
  return (
    <section className="mobile-character-strip xl:hidden">
      {characters.map((character) => (
        <button
          key={character.id}
          type="button"
          onClick={() => {
            playUiClick();
            onOpenCharacter(character.id);
          }}
          onMouseEnter={playUiHover}
          className={character.user_id === currentUserId ? "is-current" : ""}
        >
          <span
            className={`h-10 w-10 shrink-0 rounded-lg bg-cover bg-center ${character.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
            style={character.portrait_url ? { backgroundImage: `url(${character.portrait_url})` } : undefined}
          />
          <span className="min-w-0">
            <strong style={{ color: character.color }}>{character.character_name}</strong>
            <small>PF {character.hp} · {character.visible_status}</small>
          </span>
        </button>
      ))}
    </section>
  );
}

function PlayerUtilityModal({
  panel,
  state,
  character,
  onClose,
  onCreateNote,
  onPrivateSend,
  inventoryCount,
  privateCount,
  onOpenUtility,
  onOpenTab
}: {
  panel: UtilityPanel;
  state: RoomState;
  character: NonNullable<RoomState["characters"][number]>;
  onClose: () => void;
  onCreateNote: (values: { title: string; content: string }) => void;
  onPrivateSend: (content: string, recipientUserId: string) => void;
  inventoryCount: number;
  privateCount: number;
  onOpenUtility: (panel: Exclude<UtilityPanel, null>) => void;
  onOpenTab: (tab: MobileTab) => void;
}) {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sheetTab, setSheetTab] = useState<"dossier" | "help">("dossier");
  const modalRef = useRef<HTMLElement | null>(null);
  const modalTitleId = panel ? `player-utility-title-${panel}` : "player-utility-title";

  useEffect(() => {
    if (panel) modalRef.current?.focus();
  }, [panel]);

  if (!panel) return null;

  const characterItems = state.inventory.filter((item) => item.character_id === character.id);
  const characterNotes = state.notes.filter((note) => note.character_id === character.id);
  const titles = {
    next: "Prossime azioni",
    notes: "Note personali",
    inventory: "Inventario",
    private: "Sussurri",
    map: "Mappa",
    sheet: "Scheda Eroe",
    help: "Guida rapida"
  };

  return (
    <div
      className={`player-utility-backdrop ${panel === "map" ? "player-utility-backdrop--fullscreen" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className={`player-utility-modal ${panel === "map" ? "player-utility-modal--fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
            return;
          }

          if (event.key !== "Tab") return;

          const focusable = modalRef.current
            ? Array.from(
                modalRef.current.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
              ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true")
            : [];

          if (!focusable.length) {
            event.preventDefault();
            modalRef.current?.focus();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header>
          <div>
            <p className="player-modal-kicker">Strumento giocatore</p>
            <h2 id={modalTitleId}>{titles[panel]}</h2>
          </div>
          <button
            type="button"
            onMouseEnter={() => {
              import("@/lib/sound-generator").then((mod) => mod.playUiHover());
            }}
            onClick={() => {
              import("@/lib/sound-generator").then((mod) => {
                mod.playUiClick();
                mod.playUiModalClose();
              });
              onClose();
            }}
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </header>

        {panel === "next" ? (
          <PlayerNextStepsPanel
            state={state}
            currentCharacter={character}
            inventoryCount={inventoryCount}
            privateCount={privateCount}
            onOpenUtility={onOpenUtility}
            onOpenTab={onOpenTab}
          />
        ) : null}

        {panel === "notes" ? (
          <div className="grid gap-4">
            <form
              className="player-modal-compose grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteTitle.trim() && !noteContent.trim()) return;
                onCreateNote({ title: noteTitle.trim() || "Nota", content: noteContent.trim() });
                setNoteTitle("");
                setNoteContent("");
              }}
            >
              <input className="field px-3 py-2 text-sm" placeholder="Titolo nota" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
              <textarea className="field min-h-28 resize-none px-3 py-2 text-sm" placeholder="Scrivi una nota privata del tuo personaggio..." value={noteContent} onChange={(event) => setNoteContent(event.target.value)} />
              <button
                className="player-modal-primary"
                onMouseEnter={() => {
                  import("@/lib/sound-generator").then((mod) => mod.playUiHover());
                }}
                onClick={() => {
                  import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                }}
              >
                <Plus size={16} /> Salva nota
              </button>
            </form>
            <div className="player-modal-list grid gap-2">
              {characterNotes.length ? characterNotes.map((note) => (
                <article key={note.id} className="player-note-card">
                  <p>{note.title}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-300">{note.content}</p>
                </article>
              )) : <PlayerModalEmpty title="Nessuna nota salvata" text="Annota sospetti, indizi o obiettivi del tuo personaggio." />}
            </div>
          </div>
        ) : null}

        {panel === "inventory" ? (
          <div className="player-modal-list grid gap-2">
            {characterItems.length ? characterItems.map((item) => (
              <article key={item.id} className="player-item-card">
                <div className="flex items-start gap-3">
                  {item.image_url ? <div className="player-item-thumb" style={{ backgroundImage: `url(${item.image_url})` }} /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p>{item.name} <span>x{item.quantity}</span></p>
                      <span>{item.is_public ? "Pubblico" : "Privato"}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{item.description || "Nessuna descrizione."}</p>
                    {item.player_notes ? <p className="mt-2 rounded-md bg-black/25 p-2 text-xs text-stone-400">{item.player_notes}</p> : null}
                  </div>
                </div>
              </article>
            )) : <PlayerModalEmpty title="Inventario vuoto" text="Gli oggetti assegnati dal Master appariranno qui." />}
          </div>
        ) : null}

        {panel === "private" ? (
          <PrivateThreadsPanel
            profile={state.profile}
            characters={state.characters}
            messages={state.privateMessages}
            masterId={state.campaigns[0].master_id}
            isMaster={false}
            onSend={onPrivateSend}
          />
        ) : null}

        {panel === "map" ? <MapToolPanel state={state} isMaster={false} /> : null}

        {panel === "sheet" ? (() => {
          const meta = parseCharacterMetadata(character.public_background);
          return (
            <div className="player-sheet-atlas grid gap-5">
              {/* Tab Navigation */}
              <div className="player-sheet-tabs flex gap-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                    setSheetTab("dossier");
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold tracking-wider transition ${
                    sheetTab === "dossier"
                      ? "bg-brass/20 text-brass border border-brass/35"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <UserRound size={15} /> Dossier Eroe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                    setSheetTab("help");
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold tracking-wider transition ${
                    sheetTab === "help"
                      ? "bg-brass/20 text-brass border border-brass/35"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CircleHelp size={15} /> Guida di Gioco
                </button>
              </div>

              {sheetTab === "dossier" ? (
                <div className="player-sheet-dossier grid gap-6 md:grid-cols-[14rem_1fr]">
                  {/* Left Column: Portrait & Stats */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="player-sheet-portrait relative h-44 w-44 overflow-hidden rounded-xl border-2 border-brass/40 bg-black/40 shadow-lg">
                      {character.portrait_url ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${character.portrait_url})` }}
                        />
                      ) : (
                        <div className="atlas-placeholder atlas-placeholder--hero h-full w-full" />
                      )}
                    </div>
                    <div className="w-full">
                      <h3 className="font-serif text-xl font-bold leading-tight" style={{ color: character.color }}>
                        {character.character_name}
                      </h3>
                      <p className="text-sm font-serif text-slate-400">{character.character_surname}</p>
                      <span className="mt-1 inline-block rounded border border-brass/20 bg-brass/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brass">
                        {meta.archetype || "Nessun Archetipo"}
                      </span>
                    </div>

                    {/* Vitals Box */}
                    <div className="player-sheet-panel w-full rounded-lg border border-white/5 bg-white/[0.01] p-3 text-left space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><Heart size={12} className="text-red-500" /> Punti Ferita</span>
                          <span className="text-white">{character.hp} / 15</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded bg-black/40 border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, (character.hp / 15) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-2">
                        <div>
                          <span className="block text-[10px] uppercase text-stone-500 font-bold">Mente</span>
                          <strong className="text-white font-medium">{character.mental_state || "n/d"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-stone-500 font-bold">Religione</span>
                          <strong className="text-white font-medium">{character.visible_status || "n/d"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Narrative Details */}
                  <div className="space-y-4">
                    {/* Origin & Alignment */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-3">
                        <span className="block text-[10px] uppercase text-brass font-bold">Origine</span>
                        <p className="mt-1 text-sm text-stone-200">{meta.origin || "n/d"}</p>
                      </div>
                      <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-3">
                        <span className="block text-[10px] uppercase text-brass font-bold">Allineamento / Credo</span>
                        <p className="mt-1 text-sm text-stone-200">{meta.alignment || "Neutrale"}</p>
                      </div>
                    </div>

                    {/* Traits & Appearance */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-3">
                        <span className="block text-[10px] uppercase text-brass font-bold">Tratti Speciali</span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {meta.traits.length > 0 ? (
                            meta.traits.map((trait) => (
                              <span key={trait} className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-stone-300">
                                {trait}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs italic text-stone-500">Nessun tratto speciale registrato</span>
                          )}
                        </div>
                      </div>
                      <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-3">
                        <span className="block text-[10px] uppercase text-brass font-bold">Aspetto Fisico</span>
                        <p className="mt-1 text-sm text-stone-200 italic">{meta.appearance || "Nessun dettaglio descritto."}</p>
                      </div>
                    </div>

                    {/* Group Connection / Bond */}
                    <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <span className="block text-[10px] uppercase text-brass font-bold">Connessione / Legame Narrativo</span>
                      <p className="mt-1 text-sm text-stone-200">{meta.bond || "Nessun legame di gruppo specificato."}</p>
                    </div>

                    {/* Private Secret */}
                    <div className="player-sheet-secret rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 shadow-[inset_0_0_12px_rgba(249,115,22,0.03)]">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <Lock size={12} />
                        <span>Segreto Privato (Solo tu e il Master)</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-amber-200/90 italic">
                        {meta.private_secret || "Nessun segreto registrato."}
                      </p>
                    </div>

                    {/* Public Biography */}
                    <div className="player-sheet-panel rounded-lg border border-white/5 bg-white/[0.01] p-4">
                      <span className="block text-[10px] uppercase text-brass font-bold mb-2">Biografia Pubblica</span>
                      <p className="text-sm leading-relaxed text-stone-300 whitespace-pre-line">
                        {meta.bio || "Nessuna biografia inserita."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="player-help-grid">
                  <article>
                    <strong>Chat comune</strong>
                    <p>Usala per giocare in scena. Invio pubblica, Shift+Invio va a capo.</p>
                  </article>
                  <article>
                    <strong>Sussurri</strong>
                    <p>Restano privati tra te e il Master, perfetti per indizi e visioni.</p>
                  </article>
                  <article>
                    <strong>Audio locale</strong>
                    <p>Volume e mute modificano solo il tuo ascolto, non quello degli altri.</p>
                  </article>
                </div>
              )}
            </div>
          );
        })() : null}

        {panel === "help" ? (
          <div className="player-help-grid">
            <article>
              <strong>Chat comune</strong>
              <p>Usala per giocare in scena. Invio pubblica, Shift+Invio va a capo.</p>
            </article>
            <article>
              <strong>Sussurri</strong>
              <p>Restano privati tra te e il Master, perfetti per indizi e visioni.</p>
            </article>
            <article>
              <strong>Audio locale</strong>
              <p>Volume e mute modificano solo il tuo ascolto, non quello degli altri.</p>
            </article>
          </div>
        ) : null}
        <span className="mysterium-corners-br" />
      </section>
    </div>
  );
}

function PlayerModalEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="player-modal-empty">
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

function InfoTile({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="player-info-tile sm:col-span-2">
      <p>{label}</p>
      <strong>{value}</strong>
      {copy ? <Copy size={14} /> : null}
    </div>
  );
}

function PlayerNextStepsPanel({
  state,
  currentCharacter,
  inventoryCount,
  privateCount,
  onOpenUtility,
  onOpenTab
}: {
  state: RoomState;
  currentCharacter?: RoomState["characters"][number];
  inventoryCount: number;
  privateCount: number;
  onOpenUtility: (panel: Exclude<UtilityPanel, null>) => void;
  onOpenTab: (tab: MobileTab) => void;
}) {
  const visibleMaps = state.maps.filter((map) => map.is_visible_to_players);
  const isTurnActive = !state.room.turn_enabled || state.room.turn_order?.[state.room.current_turn_index ?? 0] === state.profile.id;
  const steps = [
    {
      id: "chat",
      done: state.messages.length > 0,
      title: isTurnActive ? "Partecipa alla scena" : "Attendi il tuo turno",
      detail: isTurnActive ? "La chat GDR e pronta per il tuo intervento." : "Il Master ha attivato l'ordine di turno.",
      action: "Chat",
      onClick: () => onOpenTab("chat")
    },
    {
      id: "sheet",
      done: Boolean(currentCharacter?.is_setup_complete),
      title: "Controlla la scheda",
      detail: currentCharacter ? `${currentCharacter.character_name} · PF ${currentCharacter.hp}` : "Completa identita e stato del personaggio.",
      action: "Scheda",
      onClick: () => onOpenUtility("sheet")
    },
    {
      id: "map",
      done: visibleMaps.length > 0,
      title: "Orientati sulla mappa",
      detail: visibleMaps.length ? `${visibleMaps.length} mappe disponibili.` : "Quando il Master pubblica una mappa, apparira qui.",
      action: "Mappa",
      onClick: () => onOpenTab("map")
    },
    {
      id: "inventory",
      done: inventoryCount > 0,
      title: "Verifica inventario",
      detail: inventoryCount ? `${inventoryCount} oggetti assegnati.` : "Gli oggetti del Master appariranno nello zaino.",
      action: "Zaino",
      onClick: () => onOpenUtility("inventory")
    },
    {
      id: "private",
      done: privateCount > 0,
      title: "Leggi i sussurri",
      detail: privateCount ? `${privateCount} messaggi privati ricevuti.` : "I messaggi segreti con il Master restano qui.",
      action: "Privati",
      onClick: () => onOpenUtility("private")
    }
  ];
  const completed = steps.filter((step) => step.done).length;
  const completionPercent = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);
  const engagement = useMemo(
    () => buildPlayerEngagement(state, currentCharacter?.id, inventoryCount, privateCount),
    [state, currentCharacter?.id, inventoryCount, privateCount]
  );

  return (
    <section className="next-steps-panel player-next-steps rounded-xl border border-brass/20 bg-black/35 p-3 shadow-[0_0_24px_rgba(0,0,0,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brass/80">Prossime azioni</p>
          <h2 className="mt-1 font-serif text-lg text-stone-100">Tavolo giocatore</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
          <Check size={13} /> {completed}/{steps.length}
        </span>
      </div>

      <div className="progress-dashboard mt-3" aria-label={`Partecipazione giocatore completata al ${completionPercent} percento`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="progress-dashboard-label">Prontezza giocatore</span>
          <strong>{completionPercent}%</strong>
        </div>
        <div className="progress-meter mt-2" aria-hidden="true">
          <span style={{ width: `${completionPercent}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-stone-400">
          {nextStep ? `Prossima azione consigliata: ${nextStep.title.toLowerCase()}.` : "Tutto pronto: puoi concentrarti sulla scena."}
        </p>
        <div className="achievement-strip mt-3" aria-label="Traguardi giocatore">
          {engagement.milestones.slice(0, 7).map((milestone) => (
            <span key={milestone.id} className={milestone.unlocked ? "is-unlocked" : ""} title={milestone.detail}>
              <Check size={12} /> {milestone.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          Retention giocatore: {engagement.unlocked}/{engagement.total} traguardi · {engagement.score}%
        </p>
      </div>

      <div className="next-steps-track mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            aria-label={`${step.done ? "Completato" : "Da completare"}: ${step.action}. ${step.title}. ${step.detail}`}
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              step.onClick();
            }}
            className={`next-steps-card rounded-lg border p-2.5 text-left transition hover:bg-white/[0.06] ${
              step.done ? "border-emerald-400/25 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-serif text-[10px] uppercase tracking-[0.16em] text-brass">{step.action}</span>
              <Check size={12} className={step.done ? "text-emerald-300" : "text-stone-500"} />
            </span>
            <strong className="mt-1.5 block text-xs text-stone-100">{step.title}</strong>
            <span className="mt-1 block text-[11px] leading-4 text-stone-400">{step.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MobilePlayerTabs({ active, onChange }: { active: MobileTab; onChange: (tab: MobileTab) => void }) {
  const items: Array<{ id: MobileTab; label: string; icon: React.ReactNode }> = [
    { id: "chat", label: "Chat", icon: <MessageCircle size={15} /> },
    { id: "map", label: "Mappa", icon: <MapPinned size={15} /> },
    { id: "sheet", label: "Scheda", icon: <Backpack size={15} /> },
    { id: "private", label: "Privati", icon: <BookOpenText size={15} /> },
    { id: "off", label: "OFF", icon: <UsersRound size={15} /> }
  ];

  return (
    <nav className="mobile-player-tabs glass-panel sticky top-2 z-20 grid grid-cols-5 gap-1 rounded-lg p-1 lg:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={`Apri sezione ${item.label}`}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onChange(item.id)}
          className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs ${active === item.id ? "bg-ember-500 text-ink-900" : "text-slate-300"}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

type PlayerActionHotbarProps = {
  state: RoomState;
  currentCharacter?: RoomState["characters"][number];
  profile: RoomState["profile"];
  masterId: string;
  onSend: (content: string) => void;
  onPrivateSend: (content: string, recipientUserId: string) => void;
  inviteCode: string;
  immersiveMode: boolean;
  onToggleImmersive: () => void;
  onOpenUtility: (panel: Exclude<UtilityPanel, null>) => void;
  unreadPrivateCount: number;
  unreadInventoryCount: number;
  onMarkNotificationsSeen: () => void;
  localVolume: number;
  localMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onMutedChange: (muted: boolean) => void;
};

function PlayerActionHotbar({
  state,
  currentCharacter,
  profile,
  masterId,
  onSend,
  onPrivateSend,
  inviteCode,
  immersiveMode,
  onToggleImmersive,
  onOpenUtility,
  unreadPrivateCount,
  unreadInventoryCount,
  onMarkNotificationsSeen,
  localVolume,
  localMuted,
  onVolumeChange,
  onMutedChange
}: PlayerActionHotbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationStorageKey = `gdr_seen_notifications:${state.room.id}:${state.profile.id}:player`;
  const [seenNotificationKeys, setSeenNotificationKeys] = useState<Set<string>>(() => readSeenNotificationKeys(notificationStorageKey));
  const notificationPanelId = "player-notification-center";

  const visibleDiceRequests = state.diceRequests.filter(
    (request) => !request.target_user_id || request.target_user_id === state.profile.id
  );
  const pendingDiceRequests = visibleDiceRequests.filter((request) => request.status === "pending");
  const spotlightVisible = state.room.spotlight_visibility !== "off" && Boolean(state.room.spotlight_npc_id);
  const spotlightNpc = spotlightVisible ? state.npcs.find((n) => n.id === state.room.spotlight_npc_id) : null;
  const smartNotifications = useMemo(
    () => buildPlayerNotifications(state, unreadPrivateCount, unreadInventoryCount),
    [state, unreadPrivateCount, unreadInventoryCount]
  );
  const unreadSmartNotifications = smartNotifications.filter((item) => !seenNotificationKeys.has(notificationReadKey(item)));
  const totalNotifications = notificationBadgeCount(unreadSmartNotifications);
  const criticalCount = smartNotifications.filter((item) => item.priority === "critical" || item.priority === "high").length;

  const handleNotificationAction = (item: SmartNotification) => {
    if (item.actionTarget === "private") onOpenUtility("private");
    if (item.actionTarget === "inventory") onOpenUtility("inventory");
    if (item.actionTarget === "map") onOpenUtility("map");
    if (item.actionTarget === "scene") setShowNotifications(false);
    setShowNotifications(false);
    playUiClick();
  };

  useEffect(() => {
    setSeenNotificationKeys(readSeenNotificationKeys(notificationStorageKey));
  }, [notificationStorageKey]);

  return (
    <div className="player-action-hotbar fixed bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 ui-hotbar-panel shadow-2xl transition-all duration-300">
      
      {/* 🔔 Notifications Hub */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const nextVisible = !showNotifications;
            setShowNotifications(nextVisible);
            if (nextVisible) {
              onMarkNotificationsSeen();
              const nextSeen = new Set([...seenNotificationKeys, ...smartNotifications.map(notificationReadKey)]);
              setSeenNotificationKeys(nextSeen);
              writeSeenNotificationKeys(notificationStorageKey, nextSeen);
            }
            playUiClick();
          }}
          onMouseEnter={playUiHover}
          className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${showNotifications ? "border-brass bg-brass/20 text-brass" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass"}`}
          title="Notifiche attive"
          aria-label={`${showNotifications ? "Chiudi" : "Apri"} notifiche attive${totalNotifications > 0 ? `, ${totalNotifications} presenti` : ""}`}
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
              <Bell size={12} /> Notifiche Attive
            </h3>
            {totalNotifications > 0 ? (
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] text-stone-300">
                <span className="rounded border border-rose-300/20 bg-rose-500/10 px-1.5 py-1">{pendingDiceRequests.length} tiri</span>
                <span className="rounded border border-brass/20 bg-brass/10 px-1.5 py-1">{spotlightVisible ? 1 : 0} focus</span>
                <span className="rounded border border-amber-300/20 bg-amber-500/10 px-1.5 py-1">{unreadInventoryCount} zaino</span>
                <span className="rounded border border-sky-300/20 bg-sky-500/10 px-1.5 py-1">{unreadPrivateCount} privati</span>
              </div>
            ) : null}
            {smartNotifications.length ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {criticalCount ? `${criticalCount} priorita alte` : "Situazione sotto controllo"}
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
              {pendingDiceRequests.map((req) => (
                <div key={req.id} className="flex flex-col gap-1 rounded border border-rose-300/20 bg-rose-500/10 p-2 text-[11px] text-rose-50">
                  <span className="font-semibold text-rose-300 flex items-center gap-1">
                    <ShieldAlert size={11} /> Priorita alta · Tiro richiesto
                  </span>
                  <span>Il Master richiede un tiro di <strong>d{req.dice_sides}</strong> per: &ldquo;{req.reason}&rdquo;</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-rose-200/80">Apri il pannello dadi visibile nella scena</span>
                </div>
              ))}
              {spotlightVisible && spotlightNpc && (
                <div className="flex flex-col gap-0.5 rounded border border-brass/20 bg-brass/10 p-2 text-[11px] text-stone-200">
                  <span className="font-semibold text-brass flex items-center gap-1">
                    <Sparkles size={11} /> Spotlight narrativo
                  </span>
                  <span>L&apos;NPC <strong>{spotlightNpc.name}</strong> è in evidenza scenica.</span>
                </div>
              )}
              {unreadInventoryCount > 0 && (
                <button
                  type="button"
                  onClick={() => { onOpenUtility("inventory"); setShowNotifications(false); playUiClick(); }}
                  className="w-full flex flex-col gap-0.5 text-left rounded border border-amber-300/20 bg-amber-500/10 p-2 text-[11px] text-amber-50 hover:bg-amber-500/15 transition"
                >
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <Backpack size={11} /> Inventario
                  </span>
                  <span>Hai <strong>{unreadInventoryCount}</strong> nuovo{unreadInventoryCount === 1 ? "" : "i"} oggetto{unreadInventoryCount === 1 ? "" : "i"} assegnato{unreadInventoryCount === 1 ? "" : "i"}.</span>
                </button>
              )}
              {unreadPrivateCount > 0 && (
                <button
                  type="button"
                  onClick={() => { onOpenUtility("private"); setShowNotifications(false); playUiClick(); }}
                  className="w-full flex flex-col gap-0.5 text-left rounded border border-sky-300/20 bg-sky-500/10 p-2 text-[11px] text-sky-50 hover:bg-sky-500/15 transition"
                >
                  <span className="font-semibold text-sky-300 flex items-center gap-1">
                    <MessageCircle size={11} /> Sussurri Master
                  </span>
                  <span>Hai <strong>{unreadPrivateCount}</strong> nuovo{unreadPrivateCount === 1 ? "" : "i"} messaggio{unreadPrivateCount === 1 ? "" : "i"} privato{unreadPrivateCount === 1 ? "" : "i"}.</span>
                </button>
              )}
              {totalNotifications === 0 && (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-slate-500 italic">
                  <Check size={14} className="text-emerald-500" /> Nessuna notifica attiva.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* 🧰 Quick Access Utility Shortcuts */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { onOpenUtility("sheet"); playUiClick(); }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass transition-all duration-200"
          title="Apri Scheda Eroe"
          aria-label="Apri scheda eroe"
        >
          <UserRound size={14} />
        </button>

        <button
          type="button"
          onClick={() => { onOpenUtility("inventory"); playUiClick(); }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass transition-all duration-200"
          title="Apri Inventario"
          aria-label="Apri inventario"
        >
          <Backpack size={14} />
        </button>

        <button
          type="button"
          onClick={() => { onOpenUtility("map"); playUiClick(); }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass transition-all duration-200"
          title="Apri Mappa"
          aria-label="Apri mappa"
        >
          <MapPinned size={14} />
        </button>

        <button
          type="button"
          onClick={() => { onOpenUtility("notes"); playUiClick(); }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass transition-all duration-200"
          title="Apri Note personali"
          aria-label="Apri note personali"
        >
          <ScrollText size={14} />
        </button>

        <button
          type="button"
          onClick={() => { onOpenUtility("private"); playUiClick(); }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-brass/30 hover:bg-brass/15 hover:text-brass transition-all duration-200"
          title="Invia sussurro al Master"
          aria-label="Apri sussurri con il Master"
        >
          <BookOpenText size={14} />
        </button>
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* 🔊 Local Audio Volume & Mute Controls */}
      <div className="relative flex items-center gap-1.5 group">
        <button
          type="button"
          onClick={() => {
            onMutedChange(!localMuted);
            playUiClick();
          }}
          onMouseEnter={playUiHover}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${localMuted ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          title={localMuted ? "Riattiva audio locale" : "Muta audio locale"}
          aria-label={localMuted ? "Riattiva audio locale" : "Muta audio locale"}
          aria-pressed={localMuted}
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
              onMutedChange(false);
              onVolumeChange(Number(e.target.value));
            }}
            className="w-16 h-1 accent-brass bg-stone-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Volume locale"
          />
        </div>
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* ⚙️ UI / Copy Utilities */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => { onToggleImmersive(); playUiClick(); }}
          onMouseEnter={playUiHover}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${immersiveMode ? "bg-brass/15 text-brass" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          title={immersiveMode ? "Mostra interfaccia" : "Nascondi interfaccia (Immersione)"}
          aria-label={immersiveMode ? "Mostra interfaccia" : "Nascondi interfaccia in modalità immersione"}
          aria-pressed={immersiveMode}
        >
          {immersiveMode ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(inviteCode);
            playUiClick();
          }}
          onMouseEnter={playUiHover}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition"
          title="Copia codice invito"
          aria-label="Copia codice invito"
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
}
