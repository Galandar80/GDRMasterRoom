"use client";

import { ArrowLeft, ImageUp, UserRoundPlus, Sparkles, Shield, VenetianMask, Cpu, Eye, Swords, Heart, Target, Flame, Crown, Wand2, Music, Compass, Sun, FlaskConical } from "lucide-react";
import { useState } from "react";
import { playUiClick, playUiHover, playUiWhisper, playUiModalOpen, playUiCriticalSuccess } from "@/lib/sound-generator";
import type { MediaAsset } from "@/lib/types";

export type CharacterSetupValues = {
  characterName: string;
  characterSurname: string;
  color: string;
  portraitUrl: string;
  portraitFile?: File;
  portraitVisibility: "private" | "shared";
  hp: number;
  mentalState: string;
  visibleStatus: string;
  publicBackground: string;
};

type CharacterSetupFormProps = {
  defaultName: string;
  portraitAssets?: MediaAsset[];
  onBack: () => void;
  onCreate: (values: CharacterSetupValues) => void | Promise<void>;
};

const ARCHETYPES = [
  {
    id: "guerriero",
    name: "Guerriero",
    subtitle: "Impeto fisico e forza d'arme",
    icon: <Swords size={16} />,
    hp: 15,
    mentalState: "Incrollabile",
    color: "#ef4444",
    portraitUrl: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&q=80&w=600",
    background: "Un veterano di mille scontri. Corpo temprato dall'acciaio, combatte in prima linea difendendo gli alleati con forza bruta ed incrollabile risolutezza."
  },
  {
    id: "mago",
    name: "Mago Arcano",
    subtitle: "Custode dei segreti mistici",
    icon: <Sparkles size={16} />,
    hp: 8,
    mentalState: "Instabile",
    color: "#a78bfa",
    portraitUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=600",
    background: "Studioso dell'occulto e delle correnti mistiche. Il suo legame con l'arcano gli concede immensi poteri, ma rende il suo equilibrio mentale precario."
  },
  {
    id: "detective",
    name: "Investigatore",
    subtitle: "Logica, enigmi e intuito",
    icon: <Eye size={16} />,
    hp: 11,
    mentalState: "Osservatore",
    color: "#f59e0b",
    portraitUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600",
    background: "Metodico ed attento a ogni dettaglio. Sa leggere i comportamenti umani ed i segreti degli ambienti come nessun altro."
  },
  {
    id: "hacker",
    name: "Tecno-Hacker",
    subtitle: "Infiltrato della rete neurale",
    icon: <Cpu size={16} />,
    hp: 9,
    mentalState: "Eccitato",
    color: "#10b981",
    portraitUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
    background: "Specialista nella manipolazione dei congegni elettronici e nell'infiltrazione informatica. Vive in simbiosi con la rete dati."
  },
  {
    id: "canaglia",
    name: "Canaglia",
    subtitle: "Ombra furtiva e sotterfugio",
    icon: <VenetianMask size={16} />,
    hp: 11,
    mentalState: "Furtivo",
    color: "#3b82f6",
    portraitUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600",
    background: "Abile nel muoversi tra le ombre, aprire congegni e colpire a sorpresa. Privilegia l'astuzia allo scontro frontale."
  },
  {
    id: "medico",
    name: "Chirurgo",
    subtitle: "Scienza medica e chimica",
    icon: <Heart size={16} />,
    hp: 12,
    mentalState: "Razionale",
    color: "#ec4899",
    portraitUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
    background: "Un esperto di traumatologia e rimedi chimici d'emergenza. Ricuce ferite profonde sotto il fuoco nemico mantenendo un sangue freddo assoluto."
  },
  {
    id: "mercenario",
    name: "Mercenario",
    subtitle: "Balistica e tattica a ingaggio",
    icon: <Target size={16} />,
    hp: 13,
    mentalState: "Pragmatico",
    color: "#9ca3af",
    portraitUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600",
    background: "Un esperto di armi da fuoco ed esplosivi a contratto. Non combatte per ideali o bandiere, ma per il miglior offerente."
  },
  {
    id: "mistico",
    name: "Mistico",
    subtitle: "Voce degli elementi naturali",
    icon: <Flame size={16} />,
    hp: 10,
    mentalState: "Ascetico",
    color: "#06b6d4",
    portraitUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=600",
    background: "Un eremita che convoglia l'energia primordiale degli spiriti e degli elementi, alterando le leggi fisiche ambientali."
  },
  {
    id: "nobile",
    name: "Nobile",
    subtitle: "Carisma, ricchezza e diplomazia",
    icon: <Crown size={16} />,
    hp: 10,
    mentalState: "Superbo",
    color: "#eab308",
    portraitUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
    background: "Esponente dell'alta società. Utilizza influenza politica, ricchezza economica e manipolazione verbale come strumenti primari."
  },
  {
    id: "bardo",
    name: "Bardo",
    subtitle: "Fascino, racconti e ispirazione",
    icon: <Music size={16} />,
    hp: 10,
    mentalState: "Istrionico",
    color: "#ec4899",
    portraitUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600",
    background: "Un performer carismatico che usa la musica, le parole e il teatro per ispirare gli alleati, confondere i nemici ed insinuarsi nei cuori della gente."
  },
  {
    id: "cacciatore",
    name: "Cacciatore / Ranger",
    subtitle: "Tracciamento selvaggio e tiro preciso",
    icon: <Compass size={16} />,
    hp: 12,
    mentalState: "Vigile",
    color: "#84cc16",
    portraitUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600",
    background: "Esperto di sopravvivenza in terre selvagge. Sa leggere le tracce del terreno, anticipare il vento ed eliminare minacce a distanza."
  },
  {
    id: "cavaliere",
    name: "Cavaliere / Paladino",
    subtitle: "Codice d'onore e difesa incrollabile",
    icon: <Shield size={16} />,
    hp: 16,
    mentalState: "Devoto",
    color: "#f59e0b",
    portraitUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600",
    background: "Guerriero consacrato a un ideale di giustizia. Affronta l'oscurità con il peso del suo scudo e del suo credo protettivo."
  },
  {
    id: "sacerdote",
    name: "Sacerdote / Chierico",
    subtitle: "Miracoli di fede e purificazione",
    icon: <Sun size={16} />,
    hp: 11,
    mentalState: "Pio",
    color: "#38bdf8",
    portraitUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=600",
    background: "Canale vivente della volontà divina. Benedice le anime dei giusti e cura le ferite purificando la corruzione."
  },
  {
    id: "alchimista",
    name: "Alchimista / Inventore",
    subtitle: "Pozioni ed esperimenti instabili",
    icon: <FlaskConical size={16} />,
    hp: 10,
    mentalState: "Geniale",
    color: "#ea580c",
    portraitUrl: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=600",
    background: "Scienziato d'avanguardia che miscela estratti rari. Crea pozioni curative miracolose o fiasche infuocate esplosive."
  },
  {
    id: "personalizzato",
    name: "Personalizzato",
    subtitle: "Crea il tuo destino da zero",
    icon: <Wand2 size={16} />,
    hp: 10,
    mentalState: "Stabile",
    color: "#d7ad5b",
    portraitUrl: "",
    background: ""
  }
];

export function CharacterSetupForm({ defaultName, portraitAssets = [], onBack, onCreate }: CharacterSetupFormProps) {
  const [values, setValues] = useState<CharacterSetupValues>({
    characterName: defaultName || "",
    characterSurname: "",
    color: "#f59e0b",
    portraitUrl: ARCHETYPES[2].portraitUrl, // Default: Detective
    portraitVisibility: "private",
    hp: ARCHETYPES[2].hp,
    mentalState: ARCHETYPES[2].mentalState,
    visibleStatus: "Nessuno",
    publicBackground: ARCHETYPES[2].background
  });
  const [selectedArchId, setSelectedArchId] = useState<string>("detective");
  const [isSaving, setIsSaving] = useState(false);

  // Character Metadata fields
  const [origin, setOrigin] = useState("Strada");
  const [traitsString, setTraitsString] = useState("");
  const [privateSecret, setPrivateSecret] = useState("");
  const [publicBio, setPublicBio] = useState(ARCHETYPES[2].background);
  const [appearance, setAppearance] = useState("");
  const [alignment, setAlignment] = useState("Pragmatico");
  const [bond, setBond] = useState("");

  function update<K extends keyof CharacterSetupValues>(field: K, value: CharacterSetupValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  const handleSelectArchetype = (arch: typeof ARCHETYPES[0]) => {
    setSelectedArchId(arch.id);
    if (arch.id === "personalizzato") {
      setValues({
        characterName: defaultName || "",
        characterSurname: "",
        color: "#d7ad5b",
        portraitUrl: "",
        portraitVisibility: "private",
        hp: 10,
        mentalState: "Stabile",
        visibleStatus: "Nessuno",
        publicBackground: ""
      });
      setPublicBio("");
      setOrigin("Nessuna");
      setTraitsString("");
      setPrivateSecret("");
      setAppearance("");
      setAlignment("Pragmatico");
      setBond("");
      playUiModalOpen();
      return;
    }

    setValues({
      characterName: values.characterName || arch.name,
      characterSurname: values.characterSurname || "",
      color: arch.color,
      portraitUrl: arch.portraitUrl,
      portraitVisibility: "private",
      hp: arch.hp,
      mentalState: arch.mentalState,
      visibleStatus: "Nessuno",
      publicBackground: arch.background
    });
    setPublicBio(arch.background);

    // Suggest origin based on class
    const suggestedOrigin = 
      arch.id === "nobile" ? "Nobiltà" :
      arch.id === "guerriero" || arch.id === "mercenario" ? "Militare" :
      arch.id === "mago" || arch.id === "mistico" ? "Accademia" :
      arch.id === "hacker" ? "Corporativo" : "Strada";
    setOrigin(suggestedOrigin);

    const suggestedAlignment = 
      arch.id === "canaglia" || arch.id === "mercenario" ? "Cinico" :
      arch.id === "hacker" ? "Ribelle" :
      arch.id === "medico" ? "Altruista" :
      arch.id === "guerriero" || arch.id === "mistico" ? "Idealista" : "Pragmatico";
    setAlignment(suggestedAlignment);

    // Sound triggers
    if (arch.id === "mago" || arch.id === "hacker" || arch.id === "mistico") {
      playUiWhisper();
    } else if (arch.id === "detective" || arch.id === "nobile") {
      playUiModalOpen();
    } else if (arch.id === "guerriero" || arch.id === "mercenario") {
      playUiClick();
      setTimeout(() => playUiClick(), 120);
    } else {
      playUiClick();
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6.5xl gap-5 py-4 p-4 text-white">
      {/* Top Selection Strip - Fluid Grid for 10 items */}
      <section className="character-archetype-panel ui-panel-window rounded-xl relative shadow-2xl glass-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brass/15 pb-3 mb-4">
          <button
            type="button"
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onBack();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-brass/25 bg-black/32 px-3.5 py-2 text-xs uppercase tracking-wider text-stone-300 hover:border-brass/55 hover:bg-brass/10 hover:text-white transition font-serif"
          >
            <ArrowLeft size={14} /> Indietro
          </button>
          <h2 className="text-center font-serif text-lg tracking-[0.15em] text-brass uppercase flex items-center gap-2">
            <Sparkles size={16} /> Seleziona un archetipo narrativo
          </h2>
          <div className="w-24 hidden sm:block" />
        </div>
        <div className="character-archetype-grid grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              type="button"
              onMouseEnter={playUiHover}
              onClick={() => handleSelectArchetype(arch)}
              className={`character-archetype-card flex flex-col items-center justify-center rounded-xl border p-2.5 transition duration-200 focus:outline-none ${
                selectedArchId === arch.id
                  ? "border-brass bg-brass/15 text-brass shadow-[0_0_15px_rgba(var(--color-brass-rgb),0.18)]"
                  : "border-brass/15 bg-black/24 text-slate-400 hover:border-brass/35 hover:bg-black/34 hover:text-white"
              }`}
            >
              <span className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full ${selectedArchId === arch.id ? "bg-brass/20 text-brass" : "bg-white/5 text-slate-400"}`}>
                {arch.icon}
              </span>
              <strong className="text-[11px] tracking-wider font-semibold text-center leading-none">{arch.name}</strong>
              <small className="mt-1 text-[9px] opacity-65 text-center line-clamp-1 leading-none">{arch.subtitle}</small>
            </button>
          ))}
        </div>
        <span className="mysterium-corners-br" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        {/* Left Side: Avatar Card */}
        <aside className="glass-panel relative overflow-hidden rounded-xl border border-brass/25 bg-black/60 p-6 flex flex-col justify-between min-h-[30rem] shadow-2xl">
          <div className="absolute left-1 top-1 h-3 w-3 border-l border-t border-brass/40" />
          <div className="absolute right-1 top-1 h-3 w-3 border-r border-t border-brass/40" />
          <div className="absolute left-1 bottom-1 h-3 w-3 border-l border-b border-brass/40" />
          <div className="absolute right-1 bottom-1 h-3 w-3 border-r border-b border-brass/40" />

          <div>
            <h1 className="font-serif text-xl font-bold uppercase tracking-wider text-brass">Anteprima Eroe</h1>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              Personalizza il tuo avatar e la tua combinazione di colori per differenziarti visivamente sul tabellone del Master.
            </p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center">
            {values.portraitUrl ? (
              <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-brass/20 bg-black/40 shadow-xl ui-portrait-rectangular">
                <div
                  className="h-full w-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
                  style={{ backgroundImage: `url(${values.portraitUrl})` }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brass border border-brass/25">
                  {selectedArchId}
                </span>
              </div>
            ) : (
              <div className="flex h-48 w-48 flex-col items-center justify-center rounded-xl border border-dashed border-brass/30 bg-brass/5 text-brass/70 gap-2 p-4 text-center">
                <Wand2 size={32} className="animate-pulse" />
                <span className="text-xs text-stone-300">Carica un file o fornisci l&apos;URL del portrait</span>
              </div>
            )}
            <p className="mt-4 text-center font-serif text-lg font-bold" style={{ color: values.color }}>
              {values.characterName || "Eroe Senza Nome"} {values.characterSurname}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3 text-xs leading-relaxed text-slate-400">
            <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-white/5">
              <span className="text-[10px] uppercase text-brass font-bold">Origine: <strong className="text-white normal-case block truncate">{origin || "n/d"}</strong></span>
              <span className="text-[10px] uppercase text-brass font-bold">Tratti: <strong className="text-white normal-case block truncate">{traitsString || "Nessuno"}</strong></span>
              <span className="text-[10px] uppercase text-brass font-bold">Credo: <strong className="text-white normal-case block truncate">{alignment}</strong></span>
            </div>
            {appearance && (
              <p className="mb-2 text-[10px] uppercase text-brass font-bold">Aspetto: <span className="text-stone-300 normal-case">{appearance}</span></p>
            )}
            <p className="italic">&ldquo;{publicBio || "Nessuna biografia inserita."}&rdquo;</p>
          </div>
          <span className="mysterium-corners-br" />
        </aside>

        {/* Right Side: Setup Form */}
        <form
          className="ui-panel-window grid gap-4 rounded-xl p-8 relative shadow-2xl glass-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSaving(true);
            playUiCriticalSuccess();

            // Build JSON metadata structure and stringify inside publicBackground
            const metadata = {
              archetype: selectedArchId === "personalizzato" ? "Personalizzato" : (ARCHETYPES.find(a => a.id === selectedArchId)?.name ?? "Personalizzato"),
              origin,
              traits: traitsString.split(",").map(t => t.trim()).filter(Boolean),
              private_secret: privateSecret.trim(),
              bio: publicBio.trim(),
              appearance: appearance.trim(),
              alignment,
              bond: bond.trim()
            };

            const valuesToSubmit = {
              ...values,
              publicBackground: JSON.stringify(metadata)
            };

            Promise.resolve(onCreate(valuesToSubmit)).finally(() => setIsSaving(false));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome Eroe" value={values.characterName} onChange={(value) => update("characterName", value)} />
            <Field label="Cognome / Titolo" value={values.characterSurname} onChange={(value) => update("characterSurname", value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="URL Portrait" value={values.portraitUrl} onChange={(value) => update("portraitUrl", value)} />
            <label className="grid gap-1.5 text-sm text-slate-300">
              Colore Rilievo
              <input
                className="field h-10 w-full px-2 py-1 cursor-pointer"
                type="color"
                value={values.color}
                onMouseEnter={playUiHover}
                onChange={(event) => {
                  playUiClick();
                  update("color", event.target.value);
                }}
              />
            </label>
          </div>

          <label className="ui-file-upload-field">
            <ImageUp className="mx-auto mb-2 text-brass" size={20} />
            Carica file immagine personalizzato
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                playUiClick();
                update("portraitFile", event.target.files?.[0]);
              }}
            />
          </label>

          <fieldset className="rounded-lg border border-white/10 bg-black/25 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-brass">Visibilita portrait caricato</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border p-3 text-sm transition ${values.portraitVisibility === "private" ? "border-brass bg-brass/10" : "border-white/10 bg-black/20 hover:border-brass/40"}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="portraitVisibility"
                  checked={values.portraitVisibility === "private"}
                  onChange={() => {
                    playUiClick();
                    update("portraitVisibility", "private");
                  }}
                />
                <span className="block font-semibold text-white">Privato</span>
                <span className="mt-1 block text-xs text-slate-400">Lo usi solo per questo personaggio/sessione.</span>
              </label>
              <label className={`cursor-pointer rounded-lg border p-3 text-sm transition ${values.portraitVisibility === "shared" ? "border-brass bg-brass/10" : "border-white/10 bg-black/20 hover:border-brass/40"}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="portraitVisibility"
                  checked={values.portraitVisibility === "shared"}
                  onChange={() => {
                    playUiClick();
                    update("portraitVisibility", "shared");
                  }}
                />
                <span className="block font-semibold text-white">Pubblico in libreria</span>
                <span className="mt-1 block text-xs text-slate-400">Altri giocatori potranno usarlo in altre stanze.</span>
              </label>
            </div>
          </fieldset>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Portrait pubblici dalla libreria</p>
              <span className="text-xs text-slate-500">{portraitAssets.length} disponibili</span>
            </div>
            {portraitAssets.length ? (
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-auto sm:grid-cols-5">
                {portraitAssets.slice(0, 20).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`group overflow-hidden rounded-lg border bg-black/30 text-left transition ${
                      values.portraitUrl === asset.url ? "border-brass shadow-[0_0_18px_rgba(220,184,92,0.25)]" : "border-white/10 hover:border-brass/50"
                    }`}
                    onClick={() => {
                      playUiClick();
                      update("portraitUrl", asset.url);
                      update("portraitFile", undefined);
                    }}
                    title={asset.title}
                    aria-label={`Usa portrait ${asset.title}`}
                  >
                    <span className="block aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${asset.url})` }} />
                    <span className="block truncate px-2 py-1 text-[11px] text-slate-300">{asset.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nessun portrait pubblico disponibile. Puoi caricarne uno privato o renderlo pubblico per gli altri utenti.</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm text-slate-300">
              Punti Ferita (HP)
              <input
                className="field px-3 py-2 text-sm"
                type="number"
                min="1"
                max="99"
                value={values.hp}
                onChange={(event) => update("hp", Math.max(1, Number(event.target.value)))}
              />
            </label>
            <Field label="Situazione Mentale" value={values.mentalState} onChange={(value) => update("mentalState", value)} />
            <Field label="Religione / Credo" value={values.visibleStatus} onChange={(value) => update("visibleStatus", value)} />
          </div>

          {/* EXTENDED FIELDS */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-slate-300">
              Origine / Background Narrativo
              <input
                className="field px-3 py-2 text-sm"
                placeholder="es. Strada, Nobiltà, Accademia, Eremita..."
                value={origin}
                onMouseEnter={playUiHover}
                onChange={(event) => setOrigin(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Tratti Speciali / Abilità (separati da virgola)
              <input
                className="field px-3 py-2 text-sm"
                placeholder="es. Forza fisica, Sesto senso"
                value={traitsString}
                onMouseEnter={playUiHover}
                onChange={(event) => setTraitsString(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-slate-300">
              Allineamento / Tratto Psicologico
              <select
                className="field px-3 py-2 text-sm"
                value={alignment}
                onMouseEnter={playUiHover}
                onChange={(event) => {
                  import("@/lib/sound-generator").then((mod) => mod.playUiClick());
                  setAlignment(event.target.value);
                }}
              >
                <option value="Idealista">Idealista</option>
                <option value="Pragmatico">Pragmatico</option>
                <option value="Cinico">Cinico</option>
                <option value="Ribelle">Ribelle</option>
                <option value="Altruista">Altruista</option>
                <option value="Opportunista">Opportunista</option>
                <option value="Neutrale">Neutrale</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Tratto Estetico Distintivo / Aspetto
              <input
                className="field px-3 py-2 text-sm"
                placeholder="es. Occhio bionico, Cicatrice sul volto"
                value={appearance}
                onMouseEnter={playUiHover}
                onChange={(event) => setAppearance(event.target.value)}
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm text-slate-300">
            Connessione con il Gruppo / Legame Narrativo
            <input
              className="field px-3 py-2 text-sm"
              placeholder="es. Deve la vita al Detective, conosce l'Hacker da anni..."
              value={bond}
              onMouseEnter={playUiHover}
              onChange={(event) => setBond(event.target.value)}
            />
          </label>


          <label className="grid gap-1.5 text-sm text-slate-300">
            Segreto Privato (Visibile solo a te e al Master)
            <textarea
              className="field min-h-16 resize-none px-3 py-2 text-sm leading-relaxed border border-orange-500/20 shadow-[inset_0_0_8px_rgba(249,115,22,0.02)]"
              placeholder="Scrivi un segreto inconfessabile o un obiettivo nascosto..."
              value={privateSecret}
              onMouseEnter={playUiHover}
              onChange={(event) => setPrivateSecret(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-300">
            Biografia Pubblica (Visibile a tutti i giocatori)
            <textarea
              className="field min-h-20 resize-none px-3 py-2 text-sm leading-relaxed"
              placeholder="Scrivi la biografia e la storia del tuo eroe..."
              value={publicBio}
              onMouseEnter={playUiHover}
              onChange={(event) => setPublicBio(event.target.value)}
            />
          </label>

          <button
            type="submit"
            onMouseEnter={playUiHover}
            className="w-full flex items-center justify-center gap-2 ui-btn-fantasy py-3.5"
          >
            <UserRoundPlus size={18} /> {isSaving ? "Ingresso in Camera..." : "Completa Eroe ed Entra in Gioco"}
          </button>
          <span className="mysterium-corners-br" />
        </form>
      </div>
    </div>
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
    <label className="grid gap-1.5 text-sm text-slate-300">
      {label}
      {textarea ? (
        <textarea
          className="field min-h-24 resize-none px-3 py-2 text-sm leading-relaxed"
          value={value}
          onMouseEnter={playUiHover}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="field px-3 py-2 text-sm"
          value={value}
          onMouseEnter={playUiHover}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
