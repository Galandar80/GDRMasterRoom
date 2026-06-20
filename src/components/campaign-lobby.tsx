import { ArrowLeft, Copy, Crown, DoorOpen, Eye } from "lucide-react";
import type { Campaign, Room } from "@/lib/types";

type CampaignLobbyProps = {
  campaigns: Campaign[];
  room: Room;
  mode?: "player" | "master";
  onBack?: () => void;
};

export function CampaignLobby({ campaigns, room, mode = "master", onBack }: CampaignLobbyProps) {
  const campaign = campaigns[0];

  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] sm:flex"
              title="Torna al menu"
              aria-label="Torna al menu"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div
            className="h-16 w-16 shrink-0 rounded-lg border border-brass/25 bg-cover bg-center"
            style={{ backgroundImage: `url(${campaign.cover_image_url})` }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-brass/25 bg-brass/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-brass">
                {mode === "master" ? <Crown size={13} /> : <Eye size={13} />}
                {mode === "master" ? "Master" : "Giocatore"}
              </span>
              <span className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                {campaign.status}
              </span>
            </div>
            <h2 className="mt-2 truncate text-xl font-semibold text-white">{campaign.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">{campaign.description}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[24rem]">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <DoorOpen size={14} /> Stanza
            </div>
            <p className="mt-1 text-sm font-medium text-white">{room.name}</p>
          </div>
          <div className="rounded-lg border border-ember-400/20 bg-ember-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ember-200">
              <Copy size={14} /> Invito
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-white">{room.invite_code}</p>
          </div>
        </div>
      </div>
      <span className="mysterium-corners-br" />
    </section>
  );
}
