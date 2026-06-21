"use client";

import { Check, CornerUpLeft, Crown, Dice5, Heart, Lock, MessageCircle, Pencil, Pin, Search, Send, Shield, Trash2, UserRound, VenetianMask, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Character, ChatFilter, DiceRequest, Message, Npc, RoomTyping } from "@/lib/types";
import { cn, shortTime } from "@/lib/utils";
import { parseCharacterMetadata } from "@/lib/character-metadata";

const TECHNICAL_MESSAGE_PREFIXES = ["__gdr_map_sync__:"];
type ChatDensity = "wide" | "compact" | "ultra";

type ChatPanelProps = {
  messages: Message[];
  value: string;
  onChange: (value: string) => void;
  onSend: (text?: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  onDeleteMessage?: (message: Message) => void;
  onEditMessage?: (message: Message, content: string) => void;
  onTogglePin?: (message: Message) => void;
  onTyping?: () => void;
  onLoadOlder?: () => void;
  hasOlderMessages?: boolean;
  currentUserId?: string;
  isMaster?: boolean;
  typing?: RoomTyping[];
  characters?: Character[];
  npcs?: Npc[];
  showAvatars?: boolean;
  diceRequests?: DiceRequest[];
  onRollDice?: (request: DiceRequest) => void;
  identityId?: string;
  onIdentityChange?: (id: string) => void;
};

export function ChatPanel({
  messages,
  value,
  onChange,
  onSend,
  disabled = false,
  disabledReason,
  onDeleteMessage,
  onEditMessage,
  onTogglePin,
  onTyping,
  onLoadOlder,
  hasOlderMessages = false,
  currentUserId,
  isMaster = false,
  typing = [],
  characters = [],
  npcs = [],
  showAvatars = false,
  diceRequests = [],
  onRollDice,
  identityId,
  onIdentityChange
}: ChatPanelProps) {
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [density, setDensity] = useState<ChatDensity>("wide");
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<Set<string>>(new Set());
  const composeRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeProfile, setActiveProfile] = useState<{
    name: string;
    avatarUrl: string;
    color: string;
    isNpc: boolean;
    npcId?: string | null;
    userId?: string | null;
    archetype?: string;
    origin?: string;
    traits?: string[];
    alignment?: string;
    religion?: string;
    appearance?: string;
    bond?: string;
    bio?: string;
    secret?: string;
    hp?: number;
    mentalState?: string;
    conditions?: string[];
  } | null>(null);

  const handleAvatarClick = (msg: Message) => {
    import("@/lib/sound-generator").then((mod) => {
      mod.playUiClick();
      mod.playUiModalOpen();
    });

    if (msg.sender_type === "npc" && msg.npc_id) {
      const npc = npcs.find((item) => item.id === msg.npc_id);
      setActiveProfile({
        name: npc?.name ?? msg.sender_display_name,
        avatarUrl: npc?.portrait_url ?? "",
        color: npc?.color ?? msg.sender_color,
        isNpc: true,
        npcId: msg.npc_id,
        bio: npc?.description ?? "Nessun dettaglio aggiuntivo per questo NPC."
      });
    } else if (msg.sender_type === "player" && msg.sender_user_id) {
      const char = characters.find((item) => item.user_id === msg.sender_user_id);
      if (char) {
        const meta = parseCharacterMetadata(char.public_background);
        setActiveProfile({
          name: `${char.character_name} ${char.character_surname}`.trim(),
          avatarUrl: char.portrait_url ?? "",
          color: char.color ?? msg.sender_color,
          isNpc: false,
          userId: msg.sender_user_id,
          archetype: meta.archetype || "Personalizzato",
          origin: meta.origin || "Strada",
          traits: meta.traits || [],
          alignment: meta.alignment || "Neutrale",
          religion: char.visible_status || "Nessuno",
          appearance: meta.appearance || "",
          bond: meta.bond || "",
          bio: meta.bio || "",
          secret: meta.private_secret || "",
          hp: char.hp,
          mentalState: char.mental_state || "Stabile",
          conditions: char.conditions || []
        });
      } else {
        setActiveProfile({
          name: msg.sender_display_name,
          avatarUrl: "",
          color: msg.sender_color,
          isNpc: false,
          userId: msg.sender_user_id,
          bio: "Profilo del giocatore. I dettagli della scheda non sono disponibili in questa sessione."
        });
      }
    } else {
      setActiveProfile({
        name: msg.sender_display_name,
        avatarUrl: "",
        color: msg.sender_color,
        isNpc: false,
        bio: msg.sender_type === "master" ? "Il Game Master che conduce la narrazione di questa campagna." : "Messaggio di sistema."
      });
    }
  };

  const visibleMessages = useMemo(() => messages.filter((message) => !isTechnicalMessage(message)), [messages]);
  const latestOwnMessageId = [...visibleMessages].reverse().find((message) => message.sender_user_id === currentUserId)?.id;

  const feedItems = useMemo(() => {
    const msgs = visibleMessages.map((m) => ({ ...m, feedType: "message" as const }));
    const reqs = (diceRequests || [])
      .filter((req) => {
        const isTarget = !req.target_user_id || req.target_user_id === currentUserId;
        return isMaster || isTarget;
      })
      .map((req) => ({
        id: `dice-request-${req.id}`,
        created_at: req.created_at,
        feedType: "dice-request" as const,
        request: req
      }));
    return [...msgs, ...reqs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [visibleMessages, diceRequests, currentUserId, isMaster]);

  const filteredFeed = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return feedItems.filter((item) => {
      if (item.feedType === "message") {
        const message = item;
        if (filter === "master" && message.sender_type !== "master") return false;
        if (filter === "npc" && message.sender_type !== "npc") return false;
        if (filter === "player" && message.sender_type !== "player") return false;
        const visibleContent = getVisibleMessageContent(message.content);
        if (filter === "dice" && !visibleContent.toLowerCase().includes("tira d")) return false;
        if (filter === "pinned" && !message.is_pinned) return false;
        if (normalized && !`${message.sender_display_name} ${visibleContent}`.toLowerCase().includes(normalized)) return false;
        return true;
      } else {
        const req = item.request;
        if (filter === "master") return true;
        if (filter === "npc") return false;
        if (filter === "player") return true;
        if (filter === "dice") return true;
        if (filter === "pinned") return false;
        if (normalized && !`richiesta tiro dadi ${req.reason}`.toLowerCase().includes(normalized)) return false;
        return true;
      }
    });
  }, [feedItems, filter, search]);
  const hasActiveMessageFilters = filter !== "all" || Boolean(search.trim());

  const activeTyping = typing.filter((item) => item.user_id !== currentUserId && item.channel === "gdr" && Date.now() - new Date(item.updated_at).getTime() < 6000);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDensity = localStorage.getItem("gdr_chat_density");
    setDensity(savedDensity === "compact" || savedDensity === "ultra" ? savedDensity : "wide");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [filteredFeed]);

  const setChatDensity = (nextDensity: ChatDensity) => {
    setDensity(nextDensity);
    if (typeof window !== "undefined") {
      localStorage.setItem("gdr_chat_density", nextDensity);
    }
  };

  const insertNarrativeTag = (tag: string) => {
    const textarea = composeRef.current;
    const token = `[${tag}] `;
    if (!textarea) {
      onChange(value ? `${value} ${token}` : token);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const prefix = value.slice(0, start);
    const suffix = value.slice(end);
    const nextValue = `${prefix}${prefix && !prefix.endsWith("\n") && !prefix.endsWith(" ") ? " " : ""}${token}${suffix}`;
    const nextCursor = `${prefix}${prefix && !prefix.endsWith("\n") && !prefix.endsWith(" ") ? " " : ""}${token}`.length;
    onChange(nextValue);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  // Sound effects trigger for incoming messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const text = lastMessage.content.toLowerCase();
        const elapsed = Date.now() - new Date(lastMessage.created_at).getTime();
        const isRecent = elapsed < 5000;

        if (isRecent) {
          import("@/lib/sound-generator").then((mod) => {
            const hasKeyword = (kw: string) => text.includes(`*${kw}*`);
            if (hasKeyword("esplosione")) {
              mod.playUiCinematicDanger();
            } else if (hasKeyword("magia") || hasKeyword("incantesimo")) {
              mod.playUiCinematicReveal();
            } else if (hasKeyword("terremoto") || hasKeyword("crollo")) {
              mod.playUiCinematicEarthquake();
            } else if (hasKeyword("visione") || hasKeyword("silenzio")) {
              mod.playUiCinematicVision();
            } else if (hasKeyword("sussurro") || hasKeyword("segreto")) {
              mod.playUiWhisper();
            } else if (text.includes("risultato:") || text.includes("tira d")) {
              if (text.includes("critico") || text.includes("successo critico") || text.includes("20 critico")) {
                mod.playUiCriticalSuccess();
              } else if (text.includes("fallimento") || text.includes("fallimento critico") || text.includes(" 1 ") || text.includes("1 critico")) {
                mod.playUiCriticalFailure();
              } else {
                mod.playUiDiceRoll();
              }
            } else if (lastMessage.is_private) {
              mod.playUiWhisper();
            } else {
              mod.playUiClick();
            }
          });
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  return (
    <section className={cn("story-chat-panel glass-panel flex min-h-[34rem] flex-col rounded-lg", density === "compact" ? "story-chat-panel--compact" : "", density === "ultra" ? "story-chat-panel--ultra" : "")}>
      <header className="story-chat-header flex items-center justify-between border-b border-white/10 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-brass" />
          <div>
            <h2 className="font-serif text-base text-white">Chat comune</h2>
            <p className="text-xs text-stone-500">Registro narrativo della sessione</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="story-density-toggle inline-flex rounded-md border border-white/10 bg-black/20 p-0.5">
            <button type="button" className={cn("rounded px-2 py-1 text-xs text-stone-300", density === "wide" ? "bg-brass/20 text-brass" : "")} onClick={() => setChatDensity("wide")}>
              Ampia
            </button>
            <button type="button" className={cn("rounded px-2 py-1 text-xs text-stone-300", density === "compact" ? "bg-brass/20 text-brass" : "")} onClick={() => setChatDensity("compact")}>
              Compatta
            </button>
            <button type="button" className={cn("rounded px-2 py-1 text-xs text-stone-300", density === "ultra" ? "bg-brass/20 text-brass" : "")} onClick={() => setChatDensity("ultra")}>
              Ultra
            </button>
          </div>
          <span className="story-status-badge rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
            {disabled ? "chat bloccata" : "realtime ready"}
          </span>
        </div>
      </header>

      <div className="grid gap-2 border-b border-white/10 px-4 py-3 flex-shrink-0">
        <div className="flex flex-nowrap overflow-x-auto scrollbar-none gap-2 pb-1">
          {[
            ["all", "Tutti"],
            ["master", "Master"],
            ["npc", "NPC"],
            ["player", "Giocatori"],
            ["dice", "Dadi"],
            ["pinned", "Pin"]
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onMouseEnter={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiHover());
              }}
              onClick={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                setFilter(id as ChatFilter);
              }}
              className={cn("story-filter-pill", filter === id ? "is-active" : "")}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
          <Search size={15} />
          <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Cerca nella chat..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      <div 
        ref={scrollContainerRef}
        className="scrollbar-soft flex-1 space-y-3 overflow-y-auto p-4"
      >
        {hasOlderMessages && onLoadOlder ? (
          <button
            type="button"
            onClick={onLoadOlder}
            className="mx-auto flex rounded-md border border-brass/25 bg-brass/10 px-3 py-2 text-xs font-medium text-brass hover:bg-brass/15"
          >
            Carica messaggi precedenti
          </button>
        ) : null}
        {filteredFeed.map((item) => {
          if (item.feedType === "dice-request") {
            const req = item.request;
            const isPending = req.status === "pending";
            const canRoll = isPending && onRollDice && !isMaster;
            const isTargetMe = !req.target_user_id || req.target_user_id === currentUserId;

            let outcomeClass = "dice-request-card--rolled";
            if (req.status === "rolled" && req.result !== undefined && req.result !== null) {
              if (req.dice_sides === 20 && req.result === 20) outcomeClass = "dice-request-card--crit-success";
              else if (req.dice_sides === 20 && req.result === 1) outcomeClass = "dice-request-card--crit-failure";
            } else if (isPending) {
              outcomeClass = "dice-request-card--pending";
            }

            return (
              <article
                key={item.id}
                className={cn("dice-request-card", outcomeClass)}
                role="status"
              >
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider flex items-center gap-1.5 font-serif">
                      <Dice5 size={12} /> Richiesta Regia
                    </span>
                    <time className="text-xs text-slate-500">{shortTime(req.created_at)}</time>
                  </div>
                  <p className="text-sm font-medium text-stone-100">
                    Richiesto tiro di <strong className="text-brass">d{req.dice_sides}</strong> per: &ldquo;{req.reason}&rdquo;
                  </p>
                  
                  {isPending ? (
                    <div className="mt-1">
                      {canRoll && isTargetMe ? (
                        <button
                          type="button"
                          onClick={() => onRollDice(req)}
                          className="dice-request-btn flex items-center gap-1.5"
                        >
                          <Dice5 size={14} />
                          Lancia d{req.dice_sides}
                        </button>
                      ) : (
                        <span className="text-xs italic text-stone-500 font-serif">In attesa del tiro...</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <span>Tiro eseguito:</span>
                      <strong className="text-sm border border-emerald-400/30 rounded bg-emerald-500/10 px-2 py-0.5">
                        {req.result}
                      </strong>
                      {req.dice_sides === 20 && req.result === 20 && <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold animate-pulse">Critico!</span>}
                      {req.dice_sides === 20 && req.result === 1 && <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold animate-pulse">Fallimento Critico!</span>}
                    </div>
                  )}
                </div>
              </article>
            );
          }

          const message = item;
          const avatar = resolveChatAvatar(message, characters, npcs);
          const avatarUrl = avatar.url && !failedAvatarUrls.has(avatar.url) ? avatar.url : "";
          const meta = messageMeta(message);
          const replyInfo = parseMessageReplies(message.content);
          const narrative = parseNarrativeContent(replyInfo.content);
          const canReplyToMessage = !message.is_private && message.sender_type !== "system";
          const startReply = () => {
            import("@/lib/sound-generator").then((mod) => mod.playUiClick());
            setReplyTo(message);
          };

          let critClass = "";
          if (meta.isDice) {
            const contentLower = getVisibleMessageContent(message.content).toLowerCase();
            if (contentLower.includes("critico") || contentLower.includes("critica") || contentLower.includes("20") || contentLower.includes("successo")) {
              if (contentLower.includes("falliment") || contentLower.includes(" 1 ") || contentLower.includes(" 1")) {
                critClass = "story-message--crit-failure";
              } else {
                critClass = "story-message--crit-success";
              }
            }
          }

          return (
            <article
              key={message.id}
              className={cn(
                "story-message",
                `story-message--${message.sender_type}`,
                meta.isDice ? "story-message--dice" : "",
                critClass,
                narrative.kind ? `story-message--narrative-${narrative.kind}` : "",
                message.is_private ? "story-message--private" : "",
                message.is_pinned ? "story-message--pinned" : "",
                showAvatars && density !== "ultra" ? "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3" : ""
              )}
            >
              {showAvatars && density !== "ultra" ? (
                <button
                  type="button"
                  onClick={() => handleAvatarClick(message)}
                  className="chat-message-avatar cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none focus:scale-105"
                  style={{ color: message.sender_color }}
                  aria-label={`Visualizza profilo di ${message.sender_display_name}`}
                >
                  <span className="chat-message-avatar-fallback">{avatar.fallback}</span>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      loading="lazy"
                      onError={() => setFailedAvatarUrls((current) => new Set(current).add(avatarUrl))}
                    />
                  ) : null}
                </button>
              ) : null}
              <div className="min-w-0">
                <div className="story-message-top flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="story-message-type">{meta.icon}{meta.label}</span>
                    <strong className="truncate text-sm" style={{ color: message.sender_color }}>
                      {message.sender_display_name}
                    </strong>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {message.is_pinned ? <Pin size={13} className="text-ember-200" /> : null}
                    <time className="text-xs text-slate-500">{shortTime(message.created_at)}</time>

                    {canReplyToMessage ? (
                      <button
                        type="button"
                        onClick={startReply}
                        className="story-reply-button text-stone-400 hover:text-white"
                        title="Rispondi a questo messaggio"
                        aria-label="Rispondi"
                      >
                        <CornerUpLeft size={14} />
                      </button>
                    ) : null}

                    {onTogglePin && isMaster ? (
                      <button type="button" onClick={() => onTogglePin(message)} className="text-ember-200 hover:text-ember-100" title="Fissa messaggio" aria-label="Fissa messaggio">
                        <Pin size={14} />
                      </button>
                    ) : null}
                    {onEditMessage && message.id === latestOwnMessageId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(message.id);
                          setEditingText(message.content);
                        }}
                        className="text-sky-200 hover:text-sky-100"
                        title="Modifica ultimo messaggio"
                        aria-label="Modifica ultimo messaggio"
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}
                    {onDeleteMessage && (isMaster || message.id === latestOwnMessageId) ? (
                      <button type="button" onClick={() => onDeleteMessage(message)} className="text-rose-200 hover:text-rose-100" title="Elimina messaggio" aria-label="Elimina messaggio">
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
                {editingId === message.id ? (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onEditMessage?.(message, editingText);
                      setEditingId(null);
                    }}
                  >
                    <input className="field flex-1 px-3 py-2 text-sm" value={editingText} onChange={(event) => setEditingText(event.target.value)} />
                    <button className="rounded-md bg-emerald-500 px-2 text-ink-900" title="Salva modifica" aria-label="Salva modifica">
                      <Check size={15} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-white/10 px-2 text-slate-200" title="Annulla modifica" aria-label="Annulla modifica">
                      <X size={15} />
                    </button>
                  </form>
                ) : (
                  <div className="story-message-content mt-1">
                    {replyInfo.replyToId ? (() => {
                      const parentMsg = messages.find((m) => m.id === replyInfo.replyToId);
                      const parentText = parentMsg
                        ? getVisibleMessageContent(parentMsg.content).replace(/^\[(dialogo|azione|pensiero|evento|capitolo|sussurro)\]\s*/i, "")
                        : "[Messaggio non trovato]";
                      return (
                        <div className="mb-1.5 flex items-center gap-1.5 rounded chat-reply-quote border-l-2 px-2 py-1 text-xs text-stone-400 select-none">
                          <span className="font-semibold text-stone-300">
                            {replyInfo.replyToSender}:
                          </span>
                          <span className="truncate italic">
                            &ldquo;{parentText}&rdquo;
                          </span>
                        </div>
                      );
                    })() : null}

                    <p className="whitespace-pre-wrap text-sm leading-6 text-white">
                      {meta.isDice ? getVisibleMessageContent(message.content) : renderNarrativeSegments(narrative.content, narrative.wrap, narrative.kind)}
                      {message.edited_at ? <span className="text-xs text-slate-500"> (modificato)</span> : null}
                    </p>
                    {canReplyToMessage ? (
                      <button
                        type="button"
                        onClick={startReply}
                        className="story-mobile-reply-button mt-2 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-stone-300"
                      >
                        <CornerUpLeft size={12} /> Rispondi
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!filteredFeed.length ? (
          <div className="story-empty-state">
            <MessageCircle size={24} />
            <p>{hasActiveMessageFilters ? "Nessun risultato nei filtri." : "Nessun messaggio da mostrare."}</p>
            <span>
              {hasActiveMessageFilters
                ? "La chat contiene altri canali o parole chiave: torna alla vista completa per orientarti."
                : "La scena e ancora silenziosa: prepara un primo intervento o apri con una cue narrativa."}
            </span>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {hasActiveMessageFilters ? (
                <button
                  type="button"
                  className="rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-xs font-medium text-brass transition hover:bg-brass/15"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Mostra tutto
                </button>
              ) : (
                narrativeModes.slice(0, 3).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-200 transition hover:border-brass/25 hover:bg-brass/10 hover:text-brass"
                    onClick={() => insertNarrativeTag(mode.tag)}
                    disabled={disabled}
                  >
                    Inizia con {mode.label.toLowerCase()}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      {activeTyping.length ? (
        <p className="border-t border-white/10 px-4 py-2 text-xs text-slate-400">
          {activeTyping.map((item) => item.display_name).join(", ")} sta scrivendo...
        </p>
      ) : null}

      <form
        className="border-t border-white/10 p-3 flex-shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          let finalContent = value;
          if (replyTo) {
            finalContent = `[reply-to:${replyTo.id}:${replyTo.sender_display_name}] ${finalContent}`;
            setReplyTo(null);
          }
          onSend(finalContent);
        }}
      >
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-stone-400">
            <span className="truncate">
              Risposta a <strong style={{ color: replyTo.sender_color }}>{replyTo.sender_display_name}</strong>: &ldquo;{getVisibleMessageContent(replyTo.content).replace(/^\[(dialogo|azione|pensiero|evento|capitolo|sussurro)\]\s*/i, "").slice(0, 45)}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                setReplyTo(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}

        {isMaster && npcs && npcs.length > 0 && onIdentityChange && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-2">
            <span className="text-[10px] uppercase font-bold text-stone-500 mr-1">Scrivi come:</span>
            <button
              type="button"
              onClick={() => onIdentityChange("master")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-semibold transition border",
                identityId === "master"
                  ? "bg-brass/20 text-brass border-brass/45"
                  : "bg-white/[0.02] text-stone-400 border-white/5 hover:bg-white/[0.06]"
              )}
            >
              Master
            </button>
            {npcs.map((npc) => (
              <button
                key={npc.id}
                type="button"
                onClick={() => onIdentityChange(npc.id)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-semibold transition border",
                  identityId === npc.id
                    ? "border-brass/45 bg-brass/20 text-brass"
                    : "bg-white/[0.02] text-stone-400 border-white/5 hover:bg-white/[0.06]"
                )}
                style={identityId === npc.id ? {} : { color: npc.color }}
              >
                {npc.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-2 flex flex-wrap gap-2">
          {narrativeModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className="story-compose-mode"
              onClick={() => insertNarrativeTag(mode.tag)}
              disabled={disabled}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            ref={composeRef}
            className="field min-h-12 flex-1 resize-none px-3 py-3 text-sm input-grimoire"
            placeholder={disabled ? (disabledReason ?? "Chat disattivata dal Master") : "Scrivi in scena... Shift+Invio va a capo"}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              if (event.target.value.trim()) onTyping?.();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              
              let finalContent = value;
              if (replyTo) {
                finalContent = `[reply-to:${replyTo.id}:${replyTo.sender_display_name}] ${finalContent}`;
                setReplyTo(null);
              }
              onSend(finalContent);
            }}
            disabled={disabled}
          />
          <button
            className="btn-wax-seal shrink-0 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-45"
            type="submit"
            aria-label="Invia messaggio"
            title="Invia messaggio"
            disabled={disabled}
            onMouseEnter={() => {
              import("@/lib/sound-generator").then((mod) => mod.playUiHover());
            }}
            onClick={() => {
              import("@/lib/sound-generator").then((mod) => mod.playUiClick());
            }}
          >
            <Send size={16} className="relative left-[1px]" />
          </button>
        </div>
      </form>

      {/* Finestra Dettagli Personaggio / NPC in Overlay */}
      {activeProfile && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="ui-panel-window glass-panel w-full max-w-3xl overflow-hidden rounded-xl border border-brass/25 text-white shadow-2xl relative">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                import("@/lib/sound-generator").then((mod) => {
                  mod.playUiClick();
                  mod.playUiModalClose();
                });
                setActiveProfile(null);
              }}
              className="absolute right-4 top-4 text-stone-400 hover:text-white transition duration-150 p-1"
              aria-label="Chiudi"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <header className="pr-8">
              <span className="text-[10px] uppercase font-serif font-bold text-brass tracking-widest">
                {activeProfile.isNpc ? "Personaggio Non Giocante (NPC)" : "Personaggio Giocante (Eroe)"}
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-wide mt-1" style={{ color: activeProfile.color }}>
                {activeProfile.name}
              </h2>
              {activeProfile.archetype && (
                <p className="text-xs text-stone-400 font-serif italic mt-0.5">{activeProfile.archetype}</p>
              )}
            </header>

            {/* Divider */}
            <div className="ui-divider-ornate" />

            {/* Modal Body */}
            <div className="grid gap-6 md:grid-cols-[13rem_1fr] mt-2">
              {/* Left Column: Portrait & Stats */}
              <div className="flex flex-col items-center gap-3">
                <div className="ui-portrait-rectangular h-52 w-52 rounded-xl bg-cover bg-center overflow-hidden bg-black/50 border border-brass/20 shadow-lg">
                  {activeProfile.avatarUrl ? (
                    <div 
                      className="h-full w-full bg-cover bg-center" 
                      style={{ backgroundImage: `url(${activeProfile.avatarUrl})` }} 
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-brass/30 bg-brass/5">
                      <UserRound size={48} />
                    </div>
                  )}
                </div>

                {/* HP/Status (If PC and HP exists) */}
                {!activeProfile.isNpc && activeProfile.hp !== undefined && (
                  <div className="w-full bg-black/40 rounded-xl border border-brass/20 p-3 text-xs space-y-2.5 mt-2">
                    <div className="flex items-center justify-between font-serif font-bold text-stone-300">
                      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-brass">
                        <Heart size={11} className="text-red-500" /> Vita (HP)
                      </span>
                      <span className="text-stone-100 font-mono">{activeProfile.hp} / 15</span>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full border border-white/5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-700 via-red-500 to-amber-500 transition-all duration-300" 
                        style={{ width: `${Math.min(100, (activeProfile.hp / 15) * 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-400 border-t border-white/5 pt-2">
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-stone-500 tracking-wider">Mente</span>
                        <strong className="text-stone-200">{activeProfile.mentalState || "Stabile"}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-stone-500 tracking-wider">Credo</span>
                        <strong className="text-stone-200">{activeProfile.religion || "Nessuno"}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Information details */}
              <div className="space-y-4 max-h-[26rem] overflow-y-auto pr-1 scrollbar-soft text-sm">
                
                {/* PC specifics */}
                {!activeProfile.isNpc && activeProfile.userId && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-black/35 border border-brass/20 p-2.5">
                      <span className="block text-[9px] uppercase font-bold text-brass tracking-wider">Origine</span>
                      <p className="text-stone-200 font-medium mt-0.5 text-sm">{activeProfile.origin || "Sconosciuta"}</p>
                    </div>
                    <div className="rounded-lg bg-black/35 border border-brass/20 p-2.5">
                      <span className="block text-[9px] uppercase font-bold text-brass tracking-wider">Allineamento</span>
                      <p className="text-stone-200 font-medium mt-0.5 text-sm">{activeProfile.alignment || "Neutrale"}</p>
                    </div>
                  </div>
                )}

                {/* Traits and conditions */}
                {!activeProfile.isNpc && ((activeProfile.traits && activeProfile.traits.length > 0) || (activeProfile.conditions && activeProfile.conditions.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.traits?.map((t: string) => (
                      <span key={t} className="rounded border border-brass/35 bg-brass/15 px-2.5 py-0.5 text-[10px] font-bold text-brass uppercase tracking-wider">
                        {t}
                      </span>
                    ))}
                    {activeProfile.conditions?.map((c: string) => (
                      <span key={c} className="rounded border border-red-500/25 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-200 uppercase tracking-wider">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {activeProfile.appearance && (
                  <p className="text-xs text-stone-300 italic border-l-2 border-brass/45 pl-2 leading-relaxed">
                    Aspetto distintivo: {activeProfile.appearance}
                  </p>
                )}

                {activeProfile.bond && (
                  <p className="text-xs text-stone-400">
                    Legame Narrativo: <strong className="text-stone-200 font-medium">{activeProfile.bond}</strong>
                  </p>
                )}

                {/* Biography / Description wrapped in parchment style */}
                <div className="ui-parchment text-xs leading-relaxed space-y-1">
                  <span className="block font-serif text-[10px] uppercase tracking-wider font-bold mb-1.5 border-b border-black/10 pb-1 text-stone-800">
                    Biografia / Descrizione
                  </span>
                  <p className="whitespace-pre-wrap font-sans text-stone-900 font-medium leading-relaxed">
                    {activeProfile.bio || "Nessun dettaglio descritto."}
                  </p>
                </div>

                {/* Private Secret: Visible only to owner OR Game Master */}
                {!activeProfile.isNpc && activeProfile.secret && (activeProfile.userId === currentUserId || isMaster) && (
                  <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3 shadow-[inset_0_0_12px_rgba(127,29,29,0.08)]">
                    <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-red-400 uppercase tracking-wider">
                      <Lock size={12} className="text-red-500" /> Segreto Privato (Solo tu e il Master)
                    </div>
                    <p className="text-xs text-red-200/90 italic mt-1.5 leading-relaxed">
                      {activeProfile.secret}
                    </p>
                  </div>
                )}

              </div>
            </div>
            <span className="mysterium-corners-br" />
          </div>
        </div>
      )}
      <span className="mysterium-corners-br" />
    </section>
  );
}

function messageMeta(message: Message) {
  const lowered = getVisibleMessageContent(message.content).toLowerCase();
  const isDice = lowered.includes("tira d") || lowered.includes("risultato:");
  if (isDice) return { label: "Tiro", icon: <Dice5 size={13} />, isDice };
  if (message.is_private) return { label: "Sussurro", icon: <Shield size={13} />, isDice };
  if (message.sender_type === "master") return { label: "Narratore", icon: <Crown size={13} />, isDice };
  if (message.sender_type === "npc") return { label: "NPC", icon: <VenetianMask size={13} />, isDice };
  if (message.sender_type === "system") return { label: "Sistema", icon: <Shield size={13} />, isDice };
  return { label: "Giocatore", icon: <UserRound size={13} />, isDice };
}

const narrativeModes = [
  { id: "dialogue", label: "Dialogo", tag: "dialogo" },
  { id: "action", label: "Azione", tag: "azione" },
  { id: "thought", label: "Pensiero", tag: "pensiero" },
  { id: "event", label: "Evento", tag: "evento" }
];

function parseNarrativeContent(content: string) {
  const match = content.match(/^\[(dialogo|azione|pensiero|evento|capitolo|sussurro)\]\s*(.*)$/i);
  if (!match) {
    return { kind: "", label: "", content, wrap: false };
  }

  const kind = match[1].toLowerCase();
  return {
    kind,
    label: narrativeLabel(kind),
    content: match[2],
    wrap: kind === "sussurro"
  };
}

function narrativeLabel(kind: string) {
  if (kind === "dialogo") return "Dialogo";
  if (kind === "azione") return "Azione";
  if (kind === "pensiero") return "Pensiero";
  if (kind === "evento") return "Evento";
  if (kind === "capitolo") return "Capitolo";
  if (kind === "sussurro") return "Sussurro";
  return "";
}

function renderNarrativeSegments(content: string, wrap = false, fallbackKind = "") {
  const segments = parseNarrativeSegments(content, fallbackKind);
  return segments.map((segment, index) => {
    const text = wrap ? `“${segment.text}”` : segment.text;
    if (!segment.kind) return <span key={index}>{text}</span>;
    return (
      <span key={index} className={`story-narrative-part story-narrative-part--${segment.kind}`}>
        {text}
      </span>
    );
  });
}

function parseNarrativeSegments(content: string, fallbackKind = "") {
  const tagPattern = /\[(dialogo|azione|pensiero|evento|capitolo|sussurro)\]\s*/gi;
  const matches = [...content.matchAll(tagPattern)];
  if (!matches.length) return [{ kind: fallbackKind, text: content }];

  const segments: Array<{ kind: string; text: string }> = [];
  if ((matches[0].index ?? 0) > 0) {
    segments.push({ kind: fallbackKind, text: content.slice(0, matches[0].index) });
  }

  matches.forEach((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    const text = content.slice(start, end);
    if (text) segments.push({ kind: match[1].toLowerCase(), text });
  });

  return segments;
}

function resolveChatAvatar(message: Message, characters: Character[], npcs: Npc[]) {
  if (message.sender_type === "npc") {
    const npc = npcs.find((item) => item.id === message.npc_id) ?? findNpcByDisplayName(npcs, message.sender_display_name);
    return { url: npc?.portrait_url ?? "", fallback: npc?.name.slice(0, 1).toUpperCase() ?? "N" };
  }

  if (message.sender_type === "player") {
    const character = characters.find((item) => item.user_id === message.sender_user_id) ?? findCharacterByDisplayName(characters, message.sender_display_name);
    return {
      url: character?.portrait_url ?? "",
      fallback: (character?.character_name ?? message.sender_display_name).slice(0, 1).toUpperCase()
    };
  }

  return { url: "", fallback: "M" };
}

function findCharacterByDisplayName(characters: Character[], displayName: string) {
  const normalized = normalizeDisplayName(displayName);
  return characters.find((character) => normalizeDisplayName(`${character.character_name} ${character.character_surname}`) === normalized)
    ?? characters.find((character) => normalizeDisplayName(character.character_name) === normalized);
}

function findNpcByDisplayName(npcs: Npc[], displayName: string) {
  const normalized = normalizeDisplayName(displayName);
  return npcs.find((npc) => normalizeDisplayName(npc.name) === normalized);
}

function normalizeDisplayName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isTechnicalMessage(message: Message) {
  return TECHNICAL_MESSAGE_PREFIXES.some((prefix) => message.content.startsWith(prefix));
}

function parseMessageReplies(content: string) {
  const normalized = content.trimStart();
  const match = normalized.match(/^(["“]?)(?:\[reply-to:([^:]+):([^\]]+)\]\s*)([\s\S]*)$/i);
  if (!match) return { replyToId: null, replyToSender: null, content };
  const wrappedByQuote = Boolean(match[1]);
  let visibleContent = match[4];
  if (wrappedByQuote) {
    visibleContent = visibleContent.replace(/["”]\s*$/u, "");
  }
  return {
    replyToId: match[2],
    replyToSender: match[3],
    content: visibleContent
  };
}

function getVisibleMessageContent(content: string) {
  return parseMessageReplies(content).content;
}

function filterMessages(messages: Message[], filter: ChatFilter, search: string) {
  const normalized = search.trim().toLowerCase();

  return messages.filter((message) => {
    if (filter === "master" && message.sender_type !== "master") return false;
    if (filter === "npc" && message.sender_type !== "npc") return false;
    if (filter === "player" && message.sender_type !== "player") return false;
    if (filter === "dice" && !message.content.toLowerCase().includes("tira d")) return false;
    if (filter === "pinned" && !message.is_pinned) return false;
    if (normalized && !`${message.sender_display_name} ${message.content}`.toLowerCase().includes(normalized)) return false;
    return true;
  });
}
