"use client";

import { Download, FileText, MessageCircle, MessageSquareLock, Send, Trash2 } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { Character, Message, Profile } from "@/lib/types";
import { shortTime } from "@/lib/utils";

type OffChatPanelProps = {
  messages: Message[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onDeleteMessage?: (message: Message) => void;
};

export function OffChatPanel({ messages, value, onChange, onSend, onDeleteMessage }: OffChatPanelProps) {
  return (
    <section className="off-chat-panel glass-panel flex min-h-[22rem] flex-col rounded-lg">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="social-panel-kicker">Fuori narrazione</p>
          <h2 className="flex items-center gap-2 font-serif text-lg text-white">
            <MessageCircle size={18} className="text-sky-200" /> OFF GDR
          </h2>
        </div>
        <span className="social-panel-badge social-panel-badge--off">fuori gioco</span>
      </header>
      <div className="scrollbar-soft flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <article key={message.id} className="off-message-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-sm" style={{ color: message.sender_color }}>
                {message.sender_display_name}
              </strong>
              <time className="text-xs text-slate-500">{shortTime(message.created_at)}</time>
              {onDeleteMessage ? (
                <button type="button" onClick={() => onDeleteMessage(message)} className="text-rose-200 hover:text-rose-100" title="Elimina messaggio" aria-label="Elimina messaggio">
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white">{message.content}</p>
          </article>
        ))}
        {!messages.length ? (
          <SocialEmptyState
            title="Nessun messaggio OFF"
            text="Qui potete coordinarvi senza interrompere la scena."
            actions={
              <button
                type="button"
                className="rounded-lg border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 transition hover:bg-sky-500/15"
                onClick={() => onChange("Pausa veloce: ")}
              >
                Prepara coordinamento
              </button>
            }
          />
        ) : null}
      </div>
      <form
        className="border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <div className="flex gap-2">
          <textarea
            className="field min-h-12 flex-1 resize-none px-3 py-3 text-sm"
            placeholder="Scrivi fuori gioco..."
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              onSend();
            }}
          />
          <button className="social-send-button social-send-button--off" type="submit" aria-label="Invia OFF GDR" title="Invia OFF GDR">
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}

type PrivateThreadsPanelProps = {
  profile: Profile;
  characters: Character[];
  messages: Message[];
  masterId: string;
  isMaster: boolean;
  onSend: (content: string, recipientUserId: string) => void;
  onDeleteMessage?: (message: Message) => void;
};

export function PrivateThreadsPanel({ profile, characters, messages, masterId, isMaster, onSend, onDeleteMessage }: PrivateThreadsPanelProps) {
  const visibleCharacters = useMemo(
    () => (isMaster ? characters : characters.filter((character) => character.user_id === profile.id)),
    [characters, isMaster, profile.id]
  );
  const [selectedUserId, setSelectedUserId] = useState(visibleCharacters[0]?.user_id ?? profile.id);
  const [text, setText] = useState("");
  const selectedCharacter = visibleCharacters.find((character) => character.user_id === selectedUserId) ?? visibleCharacters[0];
  const threadUserId = isMaster ? selectedCharacter?.user_id : profile.id;
  const threadMessages = messages.filter((message) =>
    isMaster
      ? message.sender_user_id === threadUserId || message.recipient_user_id === threadUserId
      : message.sender_user_id === profile.id || message.recipient_user_id === profile.id
  );
  const recipientUserId = isMaster ? threadUserId : masterId;

  return (
    <section className="private-thread-panel glass-panel flex min-h-[22rem] flex-col rounded-lg">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="social-panel-kicker">Canale riservato</p>
          <h2 className="flex items-center gap-2 font-serif text-lg text-white">
            <MessageSquareLock size={18} className="text-brass" /> Sussurri
          </h2>
        </div>
        {isMaster ? (
          <select className="field max-w-56 px-3 py-2 text-sm" value={selectedCharacter?.user_id ?? ""} onChange={(event) => setSelectedUserId(event.target.value)}>
            {visibleCharacters.map((character) => (
              <option key={character.id} value={character.user_id}>
                {character.character_name} {character.character_surname}
              </option>
            ))}
          </select>
        ) : null}
      </header>
      <div className="scrollbar-soft flex-1 space-y-3 overflow-y-auto p-4">
        {threadMessages.map((message) => (
          <article key={message.id} className="private-message-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-sm" style={{ color: message.sender_color }}>
                {message.sender_display_name}
              </strong>
              <time className="text-xs text-slate-500">{shortTime(message.created_at)}</time>
              {onDeleteMessage ? (
                <button type="button" onClick={() => onDeleteMessage(message)} className="text-rose-200 hover:text-rose-100" title="Elimina messaggio" aria-label="Elimina messaggio">
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white">{message.content}</p>
          </article>
        ))}
        {!threadMessages.length ? (
          <SocialEmptyState
            title="Nessun sussurro"
            text={isMaster ? "Seleziona un personaggio e invia un indizio riservato." : "I messaggi privati del Master appariranno qui."}
            actions={
              recipientUserId ? (
                <button
                  type="button"
                  className="rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-xs text-brass transition hover:bg-brass/15"
                  onClick={() => setText(isMaster ? "Indizio riservato: " : "Master, vorrei chiarire: ")}
                >
                  Prepara sussurro
                </button>
              ) : null
            }
          />
        ) : null}
      </div>
      <form
        className="border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim() || !recipientUserId) return;
          onSend(text.trim(), recipientUserId);
          setText("");
        }}
      >
        <div className="flex gap-2">
          <textarea
            className="field min-h-12 flex-1 resize-none px-3 py-3 text-sm"
            placeholder={isMaster ? "Scrivi al giocatore selezionato..." : "Rispondi privatamente al Master..."}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              if (!text.trim() || !recipientUserId) return;
              onSend(text.trim(), recipientUserId);
              setText("");
            }}
          />
          <button className="social-send-button social-send-button--private" type="submit" aria-label="Invia privato" title="Invia privato" disabled={!recipientUserId}>
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}

function SocialEmptyState({ title, text, actions }: { title: string; text: string; actions?: React.ReactNode }) {
  return (
    <div className="social-empty-state">
      <p>{title}</p>
      <span>{text}</span>
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ExportChatButton({ messages, onLoadAll }: { messages: Message[]; onLoadAll?: () => Promise<Message[]> }) {
  const [isExporting, setIsExporting] = useState(false);

  async function getExportMessages() {
    return (onLoadAll ? await onLoadAll() : messages)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  function formatMessageLine(message: Message) {
    const channel = message.is_private ? "Sussurro" : message.channel === "off" ? "OFF GDR" : "Chat";
    return `[${new Date(message.created_at).toLocaleString("it-IT")}] [${channel}] ${message.sender_display_name}: ${cleanExportContent(message.content)}`;
  }

  async function exportTxt() {
    setIsExporting(true);
    try {
      const exportMessages = await getExportMessages();
      const lines = exportMessages.map(formatMessageLine);
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "chat-sessione-gdr.txt";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportPdf() {
    setIsExporting(true);
    try {
      const exportMessages = await getExportMessages();
      const rows = exportMessages.map((message) => {
        const channel = message.is_private ? "Sussurro" : message.channel === "off" ? "OFF GDR" : "Chat";
        return `
          <article class="message">
            <div class="meta">
              <span>${escapeHtml(new Date(message.created_at).toLocaleString("it-IT"))}</span>
              <strong>${escapeHtml(message.sender_display_name)}</strong>
              <em>${escapeHtml(channel)}</em>
            </div>
            <p>${escapeHtml(cleanExportContent(message.content))}</p>
          </article>
        `;
      }).join("");
      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) return;
      printWindow.document.write(`<!doctype html>
        <html lang="it">
          <head>
            <meta charset="utf-8" />
            <title>Chat sessione GDR</title>
            <style>
              @page { margin: 18mm; }
              body { color: #1f2933; font-family: Georgia, "Times New Roman", serif; line-height: 1.5; }
              h1 { margin: 0 0 4px; font-size: 24px; }
              .subtitle { margin: 0 0 18px; color: #64748b; font-family: Arial, sans-serif; font-size: 12px; }
              .message { break-inside: avoid; border-top: 1px solid #d7c7a0; padding: 10px 0; }
              .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; font-family: Arial, sans-serif; font-size: 11px; color: #64748b; }
              .meta strong { color: #7c2d12; font-size: 13px; }
              .meta em { border: 1px solid #d7c7a0; border-radius: 999px; padding: 1px 7px; color: #854d0e; font-style: normal; }
              p { margin: 6px 0 0; white-space: pre-wrap; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>Chat sessione GDR</h1>
            <p class="subtitle">Esportata il ${escapeHtml(new Date().toLocaleString("it-IT"))} · ${exportMessages.length} messaggi</p>
            ${rows || "<p>Nessun messaggio da esportare.</p>"}
            <script>
              window.addEventListener("load", () => {
                window.print();
              });
            </script>
          </body>
        </html>`);
      printWindow.document.close();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={exportTxt} disabled={isExporting} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:bg-white/[0.08] disabled:opacity-60">
        <Download size={16} /> {isExporting ? "Esporto..." : "TXT"}
      </button>
      <button type="button" onClick={exportPdf} disabled={isExporting} className="inline-flex items-center gap-2 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-brass hover:bg-brass/15 disabled:opacity-60">
        <FileText size={16} /> PDF
      </button>
    </div>
  );
}

function cleanExportContent(content: string) {
  const replyMatch = content.trimStart().match(/^(["“]?)(?:\[reply-to:[^:]+:[^\]]+\]\s*)([\s\S]*)$/i);
  const visible = replyMatch ? replyMatch[2].replace(/["”]\s*$/u, "") : content;
  return visible.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
