"use client";

import { ArrowLeft, Check, Clapperboard, Copy, ImageIcon, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { RoomState } from "@/lib/types";
import { campaignPresets, type CampaignPreset } from "@/lib/campaign-presets";

export type CreateGameValues = {
  campaignTitle: string;
  genre: string;
  description: string;
  coverImageUrl: string;
  coverImageFile?: File;
  roomName: string;
  inviteCode: string;
  maxPlayers: number;
  sceneTitle: string;
  sceneDescription: string;
  sceneImageUrl: string;
  sceneImageFile?: File;
};

type CreateGameFormProps = {
  state: RoomState;
  onBack: () => void;
  onCreate: (values: CreateGameValues) => void;
};

export function CreateGameForm({ state, onBack, onCreate }: CreateGameFormProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [values, setValues] = useState<CreateGameValues>({
    campaignTitle: state.campaigns[0].title,
    genre: state.campaigns[0].genre,
    description: state.campaigns[0].description,
    coverImageUrl: state.campaigns[0].cover_image_url,
    roomName: state.room.name,
    inviteCode: state.room.invite_code,
    maxPlayers: state.room.max_players ?? 4,
    sceneTitle: state.scene.title,
    sceneDescription: state.scene.description,
    sceneImageUrl: state.scene.image_url
  });

  function update(field: keyof CreateGameValues, value: string | number | File | undefined) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function applyPreset(preset: CampaignPreset) {
    setSelectedPresetId(preset.id);
    setValues((current) => ({
      ...current,
      campaignTitle: preset.campaignTitle,
      genre: preset.genre,
      description: preset.description,
      coverImageUrl: preset.coverImageUrl,
      coverImageFile: undefined,
      roomName: preset.roomName,
      maxPlayers: preset.maxPlayers,
      sceneTitle: preset.sceneTitle,
      sceneDescription: preset.sceneDescription,
      sceneImageUrl: preset.sceneImageUrl,
      sceneImageFile: undefined
    }));
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-5 p-4 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="ui-panel-window self-start rounded-xl p-8 flex flex-col gap-4 text-white shadow-2xl relative">
        <button
          type="button"
          aria-label="Torna al menu principale"
          className="btn-iron-premium self-start inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg"
          onMouseEnter={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiHover());
          }}
          onClick={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiClick());
            onBack();
          }}
        >
          <ArrowLeft size={14} /> Menu
        </button>
        
        <h1 className="mt-2 text-2xl font-serif font-bold uppercase tracking-wider text-brass">
          Crea partita
        </h1>
        <p className="text-xs leading-relaxed text-stone-400">
          Questo flusso prepara la campagna, la stanza virtuale e la scena iniziale del capitolo. Alla conferma entrerai direttamente nella cabina di regia del Master.
        </p>

        <div className="mt-2 rounded-lg border border-brass/15 bg-black/25 p-4">
          <p className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-brass">
            <Sparkles size={14} /> Template campagna
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
            Scegli un preset per riempire campagna, stanza e scena iniziale. Puoi modificare tutto prima di creare la partita.
          </p>
          <div className="mt-3 grid gap-2">
            {campaignPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-label={`Applica template ${preset.title}: ${preset.summary}`}
                className={`rounded-lg border px-3 py-2 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass ${
                  selectedPresetId === preset.id 
                    ? "border-brass/65 bg-brass/15 shadow-[0_0_1.2rem_rgba(var(--color-brass-rgb),0.12)]" 
                    : "border-brass/15 bg-black/24 hover:border-brass/35 hover:bg-black/34"
                }`}
                aria-pressed={selectedPresetId === preset.id}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <strong className="block text-sm text-stone-100">{preset.title}</strong>
                    <span className="mt-1 block text-[11px] leading-4 text-stone-400">{preset.summary}</span>
                  </span>
                  {selectedPresetId === preset.id ? <Check className="shrink-0 text-brass" size={15} /> : null}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {preset.tags.map((tag) => (
                    <span key={tag} className="rounded border border-white/10 bg-black/24 px-1.5 py-0.5 text-[10px] text-stone-400">
                      {tag}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-600/30 bg-amber-950/15 p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-brass">
            <Copy size={14} /> Codice stanza invito
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-stone-100">{values.inviteCode || "AUTO"}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-stone-400">
            I giocatori useranno questo codice per accedere come eroi a questa sessione di gioco.
          </p>
        </div>
        <span className="mysterium-corners-br" />
      </aside>

      <form
        className="ui-panel-window grid gap-5 rounded-xl p-8 text-white shadow-2xl relative"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(values);
        }}
      >
        <FormSection icon={<Sparkles size={14} />} title="La Campagna">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titolo campagna" value={values.campaignTitle} onChange={(value) => update("campaignTitle", value)} />
            <Field label="Genere" value={values.genre} onChange={(value) => update("genre", value)} />
          </div>
          <Field label="Descrizione" value={values.description} onChange={(value) => update("description", value)} textarea />
          <Field label="URL copertina" value={values.coverImageUrl} onChange={(value) => update("coverImageUrl", value)} />
          <FileField
            label="Carica copertina dal PC"
            hint="Consigliato 16:9 o verticale soft, JPG/PNG/WebP."
            accept="image/*"
            file={values.coverImageFile}
            onChange={(file) => update("coverImageFile", file)}
          />
        </FormSection>

        <FormSection icon={<Copy size={14} />} title="Stanza di Gioco">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome stanza" value={values.roomName} onChange={(value) => update("roomName", value)} />
            <Field label="Codice invito" value={values.inviteCode} onChange={(value) => update("inviteCode", value.toUpperCase())} />
          </div>
          <label className="grid gap-2 text-xs font-serif font-bold uppercase tracking-wider text-slate-300">
            Numero giocatori disponibili
            <input
              className="field px-3 py-2 input-grimoire"
              type="number"
              min={1}
              max={12}
              value={values.maxPlayers}
              onChange={(event) => update("maxPlayers", Math.max(1, Math.min(12, Number(event.target.value))))}
            />
          </label>
        </FormSection>

        <FormSection icon={<ImageIcon size={14} />} title="Scena Iniziale">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titolo scena" value={values.sceneTitle} onChange={(value) => update("sceneTitle", value)} />
            <Field label="URL immagine scena" value={values.sceneImageUrl} onChange={(value) => update("sceneImageUrl", value)} />
          </div>
          <FileField
            label="Carica immagine scena dal PC"
            hint="Formato standard 16:9, ideale 1920x1080."
            accept="image/*"
            file={values.sceneImageFile}
            onChange={(file) => update("sceneImageFile", file)}
          />
          <Field label="Descrizione scena" value={values.sceneDescription} onChange={(value) => update("sceneDescription", value)} textarea />
        </FormSection>

        <button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2 btn-brass-premium py-3.5 rounded-lg"
          onMouseEnter={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiHover());
          }}
          onClick={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiClick());
          }}
        >
          <Clapperboard size={16} /> Crea e apri cabina di regia
        </button>
        <span className="mysterium-corners-br" />
      </form>
    </section>
  );
}

function FileField({
  label,
  hint,
  accept,
  file,
  onChange
}: {
  label: string;
  hint: string;
  accept: string;
  file?: File;
  onChange: (file?: File) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-serif font-bold uppercase tracking-wider text-slate-300">
      {label}
      <span className="ui-file-upload-field">
        {file ? file.name : hint}
        <input className="sr-only" type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0])} />
      </span>
    </label>
  );
}

function FormSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-[0.18em] text-brass">
        {icon} {title}
      </h2>
      {children}
      <div className="ui-divider-ornate my-2 opacity-50" />
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-2 text-xs font-serif font-bold uppercase tracking-wider text-slate-300">
      {label}
      {textarea ? (
        <textarea className="field min-h-24 resize-none px-3 py-2 font-sans text-sm font-normal normal-case input-grimoire" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field px-3 py-2 font-sans text-sm font-normal normal-case input-grimoire" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
