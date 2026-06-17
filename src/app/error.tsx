"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-loading-shell text-slate-100">
      <section className="app-loading-card" role="alert" aria-live="assertive">
        <div className="app-loading-orb text-rose-300" aria-hidden="true">
          <AlertTriangle size={28} />
        </div>
        <p className="app-loading-kicker">GDR Master Room</p>
        <h1>Qualcosa ha interrotto la sessione</h1>
        <p>{error.message || "Errore imprevisto durante il caricamento dell'app."}</p>
        <button type="button" onClick={reset} className="app-status-logout mx-auto mt-4 justify-center">
          <RotateCcw size={16} aria-hidden="true" />
          Riprova
        </button>
      </section>
    </main>
  );
}
