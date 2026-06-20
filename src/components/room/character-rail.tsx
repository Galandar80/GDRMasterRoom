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
    <aside className="player-character-rail hidden xl:block w-[17rem] shrink-0">
      <div className="sticky top-4 flex flex-col gap-3.5">
        {characters.map((character) => {
          const meta = parseCharacterMetadata(character.public_background);
          return (
            <button
              key={character.id}
              type="button"
              onMouseEnter={() => {
                import("@/lib/sound-generator").then((mod) => mod.playUiHover());
              }}
              onClick={() => {
                import("@/lib/sound-generator").then((mod) => {
                  mod.playUiClick();
                  mod.playUiModalOpen();
                });
                onOpenCharacter?.(character.id);
              }}
              className="player-character-card glass-panel overflow-hidden rounded-xl text-left border border-brass/25 transition shadow-lg focus-visible:border-brass/65"
              title={`Apri scheda di ${character.character_name}`}
            >
              <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-black/10">
                <h3 className="truncate font-serif text-sm uppercase tracking-wider font-semibold" style={{ color: character.color }}>
                  {character.character_name}
                </h3>
              </header>
              <div className="flex justify-center my-4">
                <div
                  className={`char-medallion-premium h-24 w-24 rounded-full overflow-hidden bg-cover bg-center ${character.portrait_url ? "" : "atlas-placeholder atlas-placeholder--hero"}`}
                  style={character.portrait_url ? { backgroundImage: `url(${character.portrait_url})` } : undefined}
                />
              </div>
              <div className="space-y-3.5 p-4 bg-black/5">
                <div>
                  <h4 className="font-serif text-base uppercase tracking-wider leading-tight text-stone-100">
                    {character.character_name} {character.character_surname}
                  </h4>
                  {meta.archetype && (
                    <span className="mt-1.5 inline-block rounded bg-white/[0.04] border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brass">
                      {meta.archetype}
                    </span>
                  )}
                  {meta.bio ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">{meta.bio}</p>
                  ) : meta.origin ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 italic">Origine: {meta.origin}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 text-xs text-slate-200">
                  <StatRow 
                    icon={<HeartPulse size={14} />} 
                    label="PF" 
                    value={`${character.hp} / 15`} 
                    tone="rose" 
                    progress={Math.min(100, Math.max(0, (character.hp / 15) * 100))} 
                  />
                  <StatRow 
                    icon={<Brain size={14} />} 
                    label="Mente" 
                    value={character.mental_state} 
                    tone="sky" 
                    progress={character.mental_state.toLowerCase().includes("stabile") ? 86 : 55} 
                  />
                  <span className="inline-flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2 text-xs text-stone-300">
                    <ShieldAlert size={14} className="text-amber-400" /> {character.visible_status}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <p className="font-serif text-[10px] uppercase tracking-[0.18em] text-brass mb-1.5">Condizioni</p>
                  <ConditionBadges conditions={character.conditions?.length ? character.conditions : [character.visible_status]} />
                </div>
                <div className="player-public-inventory grid gap-1.5 text-xs text-slate-300 border-t border-white/5 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Oggetti visibili</p>
                  {inventory.filter((item) => item.character_id === character.id && item.is_public).map((item) => (
                    <span key={item.id} className="player-public-item flex items-center justify-between gap-2 p-1 bg-white/[0.02] border border-white/5 rounded">
                      {item.image_url ? <span className="player-public-item-thumb h-4 w-4 rounded-sm bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }} /> : null}
                      <span className="min-w-0 flex-1 truncate text-stone-300">{item.name}</span>
                      <strong className="text-brass">x{item.quantity}</strong>
                    </span>
                  ))}
                  {!inventory.some((item) => item.character_id === character.id && item.is_public) ? (
                    <span className="text-stone-500 italic text-[11px]">Nessun oggetto pubblico.</span>
                  ) : null}
                </div>
              </div>
              <span className="mysterium-corners-br" />
            </button>
          );
        })}
        {characters.length === 0 ? (
          <div className="player-rail-empty glass-panel rounded-lg p-5 text-sm text-slate-400 border border-brass/20">
            <p className="font-serif text-brass text-base uppercase tracking-wider">Nessun personaggio</p>
            <span className="text-xs text-stone-400 block mt-1">Il lato {side === "left" ? "sinistro" : "destro"} della stanza è libero.</span>
            <span className="mysterium-corners-br" />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StatRow({ icon, label, value, tone, progress }: { icon: React.ReactNode; label: string; value: string; tone: "rose" | "sky"; progress: number }) {
  const isHp = tone === "rose";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-bold ${isHp ? "text-red-400" : "text-sky-300"}`}>
            {icon} {label}
          </span>
          <strong className="text-slate-100 font-mono text-xs">{value}</strong>
        </div>
        {!isHp && (
          <span className="h-1.5 overflow-hidden rounded-full bg-black/45 border border-white/5">
            <span className="block h-full bg-sky-400" style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>
      {isHp && (
        <div className="fial-hp-container shrink-0" title={`Salute: ${value}`}>
          <div className="fial-hp-liquid" style={{ height: `${progress}%` }} />
        </div>
      )}
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
