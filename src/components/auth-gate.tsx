"use client";

import { useEffect, useState } from "react";
import { LogIn, Shield, UserPlus } from "lucide-react";
import { getAuthRedirectUrl } from "@/lib/auth-config";
import { clearSupabaseAuthStorage, createClient, demoMode } from "@/lib/supabase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(demoMode ? "master@example.com" : "");
  const [password, setPassword] = useState(demoMode ? "demo-master-room" : "");
  const [isAuthed, setIsAuthed] = useState(demoMode);
  const [message, setMessage] = useState(demoMode ? "Modalita demo attiva" : "");
  const [isBusy, setIsBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const handleRejectedSession = (event: PromiseRejectionEvent) => {
      if (!isInvalidRefreshTokenError(event.reason)) return;
      event.preventDefault();
      clearSupabaseAuthStorage();
      setIsAuthed(false);
      setIsBusy(false);
      setMessage("Sessione locale scaduta o non valida. Accedi di nuovo.");
    };

    window.addEventListener("unhandledrejection", handleRejectedSession);
    return () => window.removeEventListener("unhandledrejection", handleRejectedSession);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function initializeAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const urlError = params.get("error_description") ?? params.get("error");
      let hasSession = false;
      let codeExchangeFailed = false;

      if (urlError) {
        setMessage(readAuthError(urlError));
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (code) {
        setIsBusy(true);
        setMessage("Completamento accesso Google...");
        const { data, error } = await withAuthTimeout(
          supabase!.auth.exchangeCodeForSession(code),
          "Google ha risposto, ma il completamento accesso non ha risposto in tempo. Riprova."
        );

        if (!active) return;

        if (error) {
          codeExchangeFailed = true;
          setMessage(readAuthError(error.message));
        } else {
          const session = data.session ?? (await supabase!.auth.getSession()).data.session;
          if (session?.user) {
            setIsAuthed(true);
            setIsBusy(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }
        setIsBusy(false);
      }

      try {
        const { data, error } = await withAuthTimeout(
          supabase!.auth.getSession(),
          "Controllo sessione non riuscito in tempo. Puoi accedere di nuovo."
        );

        if (!active) return;

        if (error) {
          throw error;
        }
        hasSession = Boolean(data.session);
        setIsAuthed(hasSession);
      } catch (sessionError) {
        if (isInvalidRefreshTokenError(sessionError)) {
          clearSupabaseAuthStorage();
          setIsAuthed(false);
          setMessage("Sessione locale scaduta o non valida. Accedi di nuovo.");
        } else {
          setMessage(readAuthError(readUnknownError(sessionError)));
        }
      }

      if (code && !hasSession && !codeExchangeFailed) {
        setMessage("Google ha risposto, ma Supabase non ha creato una sessione locale. Controlla Site URL e Redirect URLs in Supabase.");
      }
    }

    initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setIsAuthed(Boolean(session));
      setIsBusy(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");

    if (!supabase) {
      setIsAuthed(true);
      setIsBusy(false);
      return;
    }

    try {
      const action =
        mode === "login"
          ? signInWithPasswordViaRest(email, password)
          : supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: getAuthRedirectUrl(window.location.origin)
              }
            });

      const { data, error } = await action;

      if (error) {
        setMessage(readAuthError(error.message));
        return;
      }

      if (data.user) {
        setIsAuthed(true);
      }

      setMessage(mode === "login" ? "Accesso effettuato" : "Registrazione avviata. Controlla la mail di conferma.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGoogleAuth() {
    if (!supabase) {
      setIsAuthed(true);
      return;
    }

    setIsBusy(true);
    setMessage("");
    clearSupabaseAuthStorage();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(window.location.origin)
      }
    });

    if (error) {
      setMessage(readAuthError(error.message));
      setIsBusy(false);
    }
  }

  async function signInWithPasswordViaRest(loginEmail: string, loginPassword: string) {
    if (!supabase) {
      return { data: { user: null }, error: null };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return { data: { user: null }, error: new Error("Variabili Supabase mancanti") };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });

    const payload = await response.json();

    if (!response.ok) {
      return { data: { user: null }, error: new Error(payload.msg ?? payload.message ?? "Accesso non riuscito") };
    }

    const { error } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token
    });

    if (error) {
      return { data: { user: null }, error };
    }

    return { data: { user: payload.user }, error: null };
  }

  if (isAuthed) {
    return <>{children}</>;
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center p-4">
      <div className="auth-gate-card grid w-full overflow-hidden rounded-xl border border-brass/30 bg-ink-950/95 shadow-2xl md:grid-cols-[1.05fr_0.95fr] relative">
        <div className="auth-gate-vignette relative min-h-[32rem] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-black/85" />
          <div className="absolute inset-x-0 bottom-0 p-8 z-10">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-brass">GDR Master Room</p>
            <h1 className="max-w-xl text-3xl font-serif font-bold leading-tight text-stone-100 sm:text-4xl">
              Una stanza narrativa condivisa per campagne online e ibride.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-stone-300">
              Scene, chat, NPC, sussurri privati, portrait, inventari e audio ambientale in un solo tavolo digitale.
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="auth-gate-form-panel flex flex-col justify-center gap-5 p-6 sm:p-8 relative z-10">
          <div>
            <div className="auth-gate-logo mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-brass/35 bg-brass/10 text-brass">
              <Shield size={22} className="filter drop-shadow-[0_0_8px_rgba(200,163,93,0.3)]" />
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-wide text-stone-100">
              {mode === "login" ? "Entra nella stanza" : "Crea il tuo accesso"}
            </h2>
            <p className="mt-2 text-xs leading-5 text-stone-400">
              Con Supabase configurato userai Auth reale. Senza variabili ambiente, l&apos;app parte in demo locale.
            </p>
          </div>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-300">
            Email
            <input
              className="field px-3 py-3 mt-1.5"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-300">
            Password
            <input
              className="field px-3 py-3 mt-1.5"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={isBusy}
            className="ui-btn-fantasy inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-serif text-sm font-bold uppercase tracking-wider text-stone-900 transition disabled:opacity-50"
          >
            {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {isBusy ? "Attendi..." : mode === "login" ? "Accedi" : "Registrati"}
          </button>

          <div className="auth-gate-divider flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 my-1">
            <span className="h-px flex-1 bg-white/10" />
            oppure
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={handleGoogleAuth}
            className="auth-gate-sso-button inline-flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">G</span>
            Continua con Google
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-left text-xs font-semibold uppercase tracking-wider text-brass hover:text-stone-100 mt-2"
          >
            {mode === "login" ? "Non hai un account? Registrati" : "Hai gia un account? Accedi"}
          </button>

          {message ? <p className="rounded-lg border border-brass/25 bg-brass/10 px-3.5 py-2.5 text-xs text-brass leading-relaxed">{message}</p> : null}
        </form>
        <span className="mysterium-corners-br" />
      </div>
    </section>
  );
}

function readAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded") || normalized.includes("rate limit")) {
    return "Limite email Supabase raggiunto: attendi qualche minuto, disattiva temporaneamente la conferma email oppure configura un SMTP personalizzato in Supabase.";
  }

  if (message.includes("Invalid login credentials")) {
    return "Credenziali non valide. Se non hai ancora un account, passa a Registrati.";
  }

  if (message.includes("Email not confirmed")) {
    return "Email non confermata. Controlla la posta oppure disattiva temporaneamente la conferma email in Supabase per i test.";
  }

  if (message.includes("User already registered")) {
    return "Questo account esiste gia. Passa ad Accedi oppure usa Google.";
  }

  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return "Provider Google non abilitato in Supabase. Vai in Authentication > Providers > Google e inserisci Client ID e Client Secret.";
  }

  if (normalized.includes("code verifier") || normalized.includes("pkce") || normalized.includes("bad_code_verifier")) {
    return "Accesso Google non completato: riprova con Continua con Google dalla stessa finestra del browser.";
  }

  return message;
}

function isInvalidRefreshTokenError(error: unknown) {
  return readUnknownError(error).toLowerCase().includes("invalid refresh token");
}

function readUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function withAuthTimeout<T>(promise: Promise<T>, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), 6000);
    })
  ]);
}
