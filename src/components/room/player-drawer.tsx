import { Backpack, BookOpenText, Eye, Lock, MessageSquareLock, Plus } from "lucide-react";
import { useState } from "react";
import type { Character, InventoryItem, Message, PlayerNote } from "@/lib/types";

type PlayerDrawerProps = {
  character: Character;
  inventory: InventoryItem[];
  notes: PlayerNote[];
  privateMessages: Message[];
  onCreateNote: (values: { title: string; content: string }) => void;
};

export function PlayerDrawer({ character, inventory, notes, privateMessages, onCreateNote }: PlayerDrawerProps) {
  const characterItems = inventory.filter((item) => item.character_id === character.id);
  const characterNotes = notes.filter((note) => note.character_id === character.id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  return (
    <section className="player-drawer-grid grid gap-4 lg:grid-cols-3">
      <article className="player-tool-card glass-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Backpack size={17} className="text-brass" /> Inventario
        </div>
        <div className="player-inventory-grid">
          {characterItems.map((item) => (
            <div key={item.id} className="player-inventory-tile">
              {item.image_url ? <span className="player-inventory-image" style={{ backgroundImage: `url(${item.image_url})` }} /> : <span className="player-inventory-image is-empty"><Backpack size={20} /></span>}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">
                  {item.name} x{item.quantity}
                </p>
                {item.is_public ? <Eye size={15} className="text-emerald-300" /> : <Lock size={15} className="text-amber-300" />}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-300">{item.description}</p>
            </div>
          ))}
          {!characterItems.length ? <p className="player-empty-copy">Nessun oggetto assegnato.</p> : null}
        </div>
        <span className="mysterium-corners-br" />
      </article>

      <article className="player-tool-card player-diary-card glass-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <BookOpenText size={17} className="text-brass" /> Note personali
        </div>
        <form
          className="mb-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() && !content.trim()) return;
            onCreateNote({ title: title.trim() || "Nota", content: content.trim() });
            setTitle("");
            setContent("");
          }}
        >
          <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Titolo nota" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="input-grimoire field min-h-20 resize-none px-3 py-2 text-sm" placeholder="Scrivi una nota privata..." value={content} onChange={(event) => setContent(event.target.value)} />
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-sm font-medium text-brass hover:bg-brass/15">
            <Plus size={16} /> Aggiungi nota
          </button>
        </form>
        <div className="player-diary-list space-y-2">
          {characterNotes.map((note) => (
            <div key={note.id} className="player-diary-note">
              <p className="text-sm font-medium text-white">{note.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{note.content}</p>
            </div>
          ))}
          {!characterNotes.length ? <p className="player-empty-copy">Il diario e ancora vuoto.</p> : null}
        </div>
        <span className="mysterium-corners-br" />
      </article>

      <article className="player-tool-card glass-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <MessageSquareLock size={17} className="text-brass" /> Privati
        </div>
        <div className="space-y-2">
          {privateMessages.map((message) => (
            <p key={message.id} className="rounded-lg border border-ember-400/15 bg-ember-500/10 p-3 text-sm leading-6 text-white">
              {message.content}
            </p>
          ))}
        </div>
        <span className="mysterium-corners-br" />
      </article>
    </section>
  );
}
