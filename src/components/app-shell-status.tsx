"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, LogOut, Sparkles } from "lucide-react";

export function AppLoading({ status }: { status: string }) {
  return (
    <main className="app-loading-shell">
      <div className="app-loading-card">
        <div className="app-loading-orb" aria-hidden="true">
          <Loader2 size={28} />
        </div>
        <p className="app-loading-kicker">GDR Master Room</p>
        <h1>Preparazione della stanza</h1>
        <p>{status}</p>
        <div className="app-loading-line" aria-hidden="true" />
      </div>
    </main>
  );
}

export function StatusBar({ status, error, onSignOut }: { status: string; error: string; onSignOut: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile && !error) return null;

  return (
    <div className={`app-status-bar ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
      <div className="app-status-content">
        <span className="app-status-icon" aria-hidden="true">
          {error ? <AlertTriangle size={16} /> : status.toLowerCase().includes("caric") ? <Sparkles size={16} /> : <CheckCircle2 size={16} />}
        </span>
        <span>{error || status}</span>
      </div>
      <button type="button" onClick={onSignOut} className="app-status-logout">
        <LogOut size={14} aria-hidden="true" />
        Logout
      </button>
    </div>
  );
}
