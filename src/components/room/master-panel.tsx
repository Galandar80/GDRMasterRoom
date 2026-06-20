"use client";

import { Headphones, ImageUp, KeyRound, Plus, Save, Send, Trash2, UserRoundCog, Wand2 } from "lucide-react";
import { useState } from "react";
import type { AudioTrack, Character, Npc, Profile, Scene } from "@/lib/types";

type MasterPanelProps = {
  profile: Profile;
  npcs: Npc[];
  scenes: Scene[];
  characters: Character[];
  audioTracks: AudioTrack[];
  identityId: string;
  currentAudioId: string;
  onIdentityChange: (id: string) => void;
  onPublicMessage: (content: string) => void;
  onPrivateMessage: (content: string, userId: string) => void;
  onSceneChange: (scene: Scene) => void;
  onAudioChange: (track: AudioTrack) => void;
  onCreateScene: (values: { title: string; description: string; imageUrl: string; imageFile?: File }) => void | Promise<void>;
  onDeleteScene: (scene: Scene) => void | Promise<void>;
  onCreateAudio: (values: { title: string; audioUrl: string; loop: boolean; audioFile?: File }) => void | Promise<void>;
  onSaveRoom: () => void;
  onDeleteRoom: () => void;
};

export function MasterPanel({
  profile,
  npcs,
  scenes,
  characters,
  audioTracks,
  identityId,
  currentAudioId,
  onIdentityChange,
  onPublicMessage,
  onPrivateMessage,
  onSceneChange,
  onAudioChange,
  onCreateScene,
  onDeleteScene,
  onCreateAudio,
  onSaveRoom,
  onDeleteRoom
}: MasterPanelProps) {
  const [publicText, setPublicText] = useState("");
  const [privateText, setPrivateText] = useState("");
  const [recipient, setRecipient] = useState(characters[0]?.user_id ?? "");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [sceneImageFile, setSceneImageFile] = useState<File | undefined>();
  const [audioTitle, setAudioTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoop, setAudioLoop] = useState(true);
  const [audioFile, setAudioFile] = useState<File | undefined>();

  return (
    <aside className="master-command-panel glass-panel flex min-h-[34rem] flex-col rounded-lg">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-brass" />
          <h2 className="font-semibold text-white">Pannello Master</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">{profile.username}</p>
      </header>

      <div className="scrollbar-soft flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <UserRoundCog size={16} className="text-ember-200" /> Scrivi come
          </label>
          <select className="input-grimoire field px-3 py-2 text-sm" value={identityId} onChange={(event) => onIdentityChange(event.target.value)}>
            <option value="master">Master / Narratore</option>
            <option value="player">Personaggio demo</option>
            {npcs.map((npc) => (
              <option key={npc.id} value={npc.id}>
                {npc.name}
              </option>
            ))}
          </select>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!publicText.trim()) return;
              onPublicMessage(publicText.trim());
              setPublicText("");
            }}
          >
            <textarea
              className="input-grimoire field min-h-20 resize-none px-3 py-2 text-sm"
              placeholder="Messaggio pubblico..."
              value={publicText}
              onChange={(event) => setPublicText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                if (!publicText.trim()) return;
                onPublicMessage(publicText.trim());
                setPublicText("");
              }}
            />
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-500 text-ink-900 hover:bg-ember-400"
              title="Invia pubblico"
              aria-label="Invia pubblico"
            >
              <Send size={17} />
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <KeyRound size={16} className="text-ember-200" /> Messaggio privato
          </label>
          <select className="input-grimoire field px-3 py-2 text-sm" value={recipient} onChange={(event) => setRecipient(event.target.value)}>
            {characters.map((character) => (
              <option key={character.id} value={character.user_id}>
                {character.character_name} {character.character_surname}
              </option>
            ))}
          </select>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!privateText.trim() || !recipient) return;
              onPrivateMessage(privateText.trim(), recipient);
              setPrivateText("");
            }}
          >
            <textarea
              className="input-grimoire field min-h-20 resize-none px-3 py-2 text-sm"
              placeholder="Sussurro, visione, indizio personale..."
              value={privateText}
              onChange={(event) => setPrivateText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                if (!privateText.trim() || !recipient) return;
                onPrivateMessage(privateText.trim(), recipient);
                setPrivateText("");
              }}
            />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ember-400/25 bg-ember-500/10 px-3 py-2 text-sm font-medium text-ember-100 hover:bg-ember-500/20">
              <Send size={16} /> Invia sussurro
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <ImageUp size={16} className="text-ember-200" /> Cambia scena
          </label>
          <div className="grid gap-2">
            {scenes.map((scene) => (
              <div key={scene.id} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
                <button
                  type="button"
                  onClick={() => onSceneChange(scene)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-left hover:border-ember-400/35 hover:bg-ember-500/10"
                >
                  <span className="block text-sm font-medium text-white">{scene.title}</span>
                  <span className="line-clamp-1 text-xs text-slate-400">{scene.description}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteScene(scene)}
                  className="flex h-full min-h-12 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                  title={`Elimina scena ${scene.title}`}
                  aria-label={`Elimina scena ${scene.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <label className="block rounded-lg border border-dashed border-brass/30 bg-brass/5 px-3 py-3 text-center text-xs text-brass">
            Carica immagine scena
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => setSceneImageFile(event.target.files?.[0])} />
          </label>
          <form
            className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!sceneTitle.trim()) return;
              onCreateScene({
                title: sceneTitle.trim(),
                description: sceneDescription.trim(),
                imageUrl: sceneImageUrl.trim(),
                imageFile: sceneImageFile
              });
              setSceneTitle("");
              setSceneDescription("");
              setSceneImageUrl("");
              setSceneImageFile(undefined);
            }}
          >
            <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Titolo nuova scena" value={sceneTitle} onChange={(event) => setSceneTitle(event.target.value)} />
            <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Link immagine scena" value={sceneImageUrl} onChange={(event) => setSceneImageUrl(event.target.value)} />
            <textarea
              className="input-grimoire field min-h-16 resize-none px-3 py-2 text-sm"
              placeholder="Descrizione scena"
              value={sceneDescription}
              onChange={(event) => setSceneDescription(event.target.value)}
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-ember-400/25 bg-ember-500/10 px-3 py-2 text-sm font-medium text-ember-100 hover:bg-ember-500/20">
              <Plus size={16} /> Crea scena
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Headphones size={16} className="text-ember-200" /> Audio scena
          </label>
          <select
            className="input-grimoire field px-3 py-2 text-sm"
            value={currentAudioId}
            onChange={(event) => {
              const track = audioTracks.find((item) => item.id === event.target.value);
              if (track) onAudioChange(track);
            }}
          >
            {audioTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
          <label className="block rounded-lg border border-dashed border-brass/30 bg-brass/5 px-3 py-3 text-center text-xs text-brass">
            Carica audio
            <input className="sr-only" type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0])} />
          </label>
          <form
            className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!audioTitle.trim()) return;
              onCreateAudio({ title: audioTitle.trim(), audioUrl: audioUrl.trim(), loop: audioLoop, audioFile });
              setAudioTitle("");
              setAudioUrl("");
              setAudioLoop(true);
              setAudioFile(undefined);
            }}
          >
            <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Titolo traccia" value={audioTitle} onChange={(event) => setAudioTitle(event.target.value)} />
            <input className="input-grimoire field px-3 py-2 text-sm" placeholder="Link audio" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={audioLoop} onChange={(event) => setAudioLoop(event.target.checked)} />
              Loop
            </label>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-ember-400/25 bg-ember-500/10 px-3 py-2 text-sm font-medium text-ember-100 hover:bg-ember-500/20">
              <Plus size={16} /> Crea traccia
            </button>
          </form>
        </section>

        <section className="grid gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onSaveRoom}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20"
          >
            <Save size={16} /> Salva stanza
          </button>
          <button
            type="button"
            onClick={onDeleteRoom}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
          >
            <Trash2 size={16} /> Chiudi ed elimina stanza
          </button>
        </section>
      </div>
      <span className="mysterium-corners-br" />
    </aside>
  );
}
