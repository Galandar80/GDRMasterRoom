"use client";

import { ArrowLeft, ClipboardPaste, DoorOpen, KeyRound, Loader2, Shield, UserRound, X } from "lucide-react";
import { useState } from "react";

export type JoinMode = "player" | "master";

type JoinRoomFormProps = {
  onBack: () => void;
  onJoin: (code: string, mode: JoinMode) => boolean | Promise<boolean>;
  suggestedInviteCode?: string;
};

export function JoinRoomForm({ onBack, onJoin, suggestedInviteCode }: JoinRoomFormProps) {
  const [code, setCode] = useState(suggestedInviteCode ?? "");
  const [mode, setMode] = useState<JoinMode>("player");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const normalizedCode = normalizeInviteCode(code);
  const isCodeReady = /^[A-Z0-9]{3}-[A-Z0-9]{3,}$/.test(normalizedCode);

  function submitJoin() {
    if (isJoining) return;
    if (!isCodeReady) {
      setError("Inserisci un codice valido nel formato ABC-123.");
      return;
    }

    setIsJoining(true);
    setError("");
    Promise.resolve(onJoin(normalizedCode, mode))
      .then((joined) => setError(joined ? "" : "Codice stanza non trovato o non accessibile con questa modalita."))
      .catch((joinError) => {
        setError(joinError instanceof Error ? joinError.message : "Accesso non riuscito. Controlla il codice e riprova.");
      })
      .finally(() => setIsJoining(false));
  }

  async function pasteInviteCode() {
    try {
      const text = await navigator.clipboard.readText();
      setCode(normalizeInviteCode(text));
      setError("");
    } catch {
      setError("Non riesco a leggere gli appunti del browser. Incolla il codice manualmente.");
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-xl items-center p-4">
      <form
        className="ui-panel-window w-full rounded-xl p-8 relative flex flex-col gap-4 text-white shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          submitJoin();
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="self-start inline-flex items-center gap-2 rounded-lg border border-brass/25 bg-black/32 px-3.5 py-2 text-xs uppercase tracking-wider text-stone-300 hover:border-brass/55 hover:bg-brass/10 hover:text-white transition font-serif"
        >
          <ArrowLeft size={14} /> Menu
        </button>

        <h1 className="mt-2 text-2xl font-serif font-bold uppercase tracking-wider text-brass">
          Entra in stanza
        </h1>
        <p className="text-xs leading-relaxed text-slate-400">
          Inserisci il codice fornito dal Master. Scegli Giocatore se devi creare o riprendere il tuo eroe, Master solo se quella stanza appartiene al tuo account.
        </p>

        <div className="mt-2 grid gap-2 rounded-lg border border-brass/15 bg-black/45 p-1 sm:grid-cols-2" role="tablist" aria-label="Modalita ingresso">
          <button
            type="button"
            onClick={() => setMode("player")}
            className={`ui-tab-button justify-center text-center py-3 ${mode === "player" ? "is-active" : ""}`}
            role="tab"
            aria-selected={mode === "player"}
          >
            <span className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider">
              <UserRound size={15} /> Giocatore
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("master")}
            className={`ui-tab-button justify-center text-center py-3 ${mode === "master" ? "is-active" : ""}`}
            role="tab"
            aria-selected={mode === "master"}
          >
            <span className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider">
              <Shield size={15} /> Master
            </span>
          </button>
        </div>

        <label className="mt-2 grid gap-2 text-xs font-serif font-bold uppercase tracking-wider text-slate-300">
          Codice invito stanza
          <span className="flex gap-2">
            <span className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brass/70" size={17} />
              <input
                className="field w-full px-10 py-3.5 text-center font-mono text-xl uppercase tracking-[0.18em] input-grimoire"
                value={code}
                onChange={(event) => {
                  setCode(normalizeInviteCode(event.target.value));
                  setError("");
                }}
                placeholder="ABC-123"
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={9}
                aria-invalid={Boolean(error)}
                required
              />
              {code ? (
                <button
                  type="button"
                  onClick={() => {
                    setCode("");
                    setError("");
                  }}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-stone-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Svuota codice"
                >
                  <X size={15} />
                </button>
              ) : null}
            </span>
            <button
              type="button"
              onClick={pasteInviteCode}
              className="grid w-12 place-items-center rounded-lg border border-brass/35 bg-black/45 text-brass transition hover:border-brass/55 hover:bg-brass/10"
              aria-label="Incolla codice dagli appunti"
            >
              <ClipboardPaste size={18} />
            </button>
          </span>
        </label>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-stone-400 font-serif">
          {mode === "master"
            ? "La regia si apre solo se il codice appartiene a una campagna creata da questo account."
            : "Se è il primo ingresso in questa stanza, dopo il codice ti chiederò di completare l'eroe."}
        </div>

        {error ? (
          <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 w-full flex items-center justify-center gap-2 btn-brass-premium py-3 rounded-lg"
          disabled={isJoining || !isCodeReady}
          aria-busy={isJoining}
          onMouseEnter={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiHover());
          }}
          onClick={() => {
            import("@/lib/sound-generator").then((mod) => mod.playUiClick());
          }}
        >
          {isJoining ? <Loader2 className="animate-spin" size={16} /> : <DoorOpen size={16} />}{" "}
          {isJoining
            ? "Verifica codice..."
            : mode === "master"
              ? "Rientra come Master"
              : "Entra come eroe"}
        </button>
        <span className="mysterium-corners-br" />
      </form>
    </section>
  );
}

function normalizeInviteCode(value: string) {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}
