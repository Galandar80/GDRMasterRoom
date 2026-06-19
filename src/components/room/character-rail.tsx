import { Brain, HeartPulse, ShieldAlert } from "lucide-react";
import type React from "react";
import type { Character, InventoryItem } from "@/lib/types";
import { parseCharacterMetadata } from "@/lib/character-metadata";

type CharacterRailProps = {
  characters: Character[];
  inventory?: InventoryItem[];
  side: "left" | "right";
  onOpenCharacter?: (characterId: string) => void;
};

export function CharacterRail({ characters, inventory = [], side, onOpenCharacter }: CharacterRailProps) {
  return (
    <aside className="player-character-rail hidden xl:block">
      <div className="sticky top-4 flex flex-col gap-3">
        {characters.map((character) => {
          const meta = parseCharacterMetadata(character.public_background);
          return (
            <button
              key={character.id}
              type="button"
              onClick={() => onOpenCharacter?.(character.id)}
              className="player-character-card overflow-hidden rounded-xl text-left transition hover:border-brass/40 focus-visible:border-brass/60"
              title={`Apri scheda di ${character.character_name}`}
            >
              <header className="flex items-center justify-between gap-3 px-3 py-3">
                <h3 className="truncate text-lg font-semibold" style={{ color: character.color }}>
                  {character.character_name}
                </h3>
              </header>
              <div
                className={`mx-3 aspect-[4/5] rounded-lg border border-white/10 bg-cover bg-center ${character.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
                style={character.portrait_url ? { backgroundImage: `url(${character.portrait_url})` } : undefined}
              />
              <div className="space-y-3 p-3">
                <div>
                  <h4 className="font-serif text-xl uppercase tracking-wide leading-tight" style={{ color: character.color }}>
                    {character.character_name} {character.character_surname}
                  </h4>
                  {meta.archetype && (
                    <span className="mt-1 inline-block rounded bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brass">
                      {meta.archetype}
                    </span>
                  )}
                  {meta.bio ? (
                    <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-300">{meta.bio}</p>
                  ) : meta.origin ? (
                    <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-400 italic">Origine: {meta.origin}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 text-xs text-slate-200">
                <StatRow icon={<HeartPulse size={14} />} label="PF" value={`${character.hp} / 10`} tone="rose" progress={Math.min(100, Math.max(0, character.hp * 10))} />
                <StatRow icon={<Brain size={14} />} label="Mente" value={character.mental_state} tone="sky" progress={character.mental_state.toLowerCase().includes("stabile") ? 86 : 55} />
                <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5">
                  <ShieldAlert size={14} className="text-amber-300" /> {character.visible_status}
                </span>
              </div>
              <p className="font-serif text-xs uppercase tracking-[0.18em] text-brass">Condizioni</p>
              <ConditionBadges conditions={character.conditions?.length ? character.conditions : [character.visible_status]} />
              <div className="player-public-inventory grid gap-1 text-xs text-slate-300">
                <p>Oggetti visibili</p>
                {inventory.filter((item) => item.character_id === character.id && item.is_public).map((item) => (
                  <span key={item.id} className="player-public-item">
                    {item.image_url ? <span className="player-public-item-thumb" style={{ backgroundImage: `url(${item.image_url})` }} /> : null}
                    <span className="min-w-0 truncate">{item.name}</span>
                    <strong>x{item.quantity}</strong>
                  </span>
                ))}
                {!inventory.some((item) => item.character_id === character.id && item.is_public) ? <span className="text-slate-500">Nessun oggetto pubblico.</span> : null}
              </div>
            </div>
          </button>
          );
        })}
        {characters.length === 0 ? (
          <div className="player-rail-empty glass-panel rounded-lg p-4 text-sm text-slate-400">
            <p>Nessun personaggio</p>
            <span>Il lato {side === "left" ? "sinistro" : "destro"} della stanza e ancora libero.</span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StatRow({ icon, label, value, tone, progress }: { icon: React.ReactNode; label: string; value: string; tone: "rose" | "sky"; progress: number }) {
  return (
    <div className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 uppercase ${tone === "rose" ? "text-rose-200" : "text-sky-200"}`}>
          {icon} {label}
        </span>
        <strong className="text-slate-100">{value}</strong>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className={`block h-full ${tone === "rose" ? "bg-rose-400" : "bg-sky-400"}`} style={{ width: `${progress}%` }} />
      </span>
    </div>
  );
}

function ConditionBadges({ conditions }: { conditions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {conditions.filter(Boolean).map((condition) => (
        <span key={condition} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200">
          {conditionIcon(condition)} {condition}
        </span>
      ))}
    </div>
  );
}

function conditionIcon(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes("ferit")) return "✚";
  if (normalized.includes("paur") || normalized.includes("spavent")) return "!";
  if (normalized.includes("shock")) return "◇";
  if (normalized.includes("velen")) return "☠";
  if (normalized.includes("confus")) return "?";
  if (normalized.includes("esaust")) return "…";
  if (normalized.includes("pericolo")) return "△";
  return "•";
}
