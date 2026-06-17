# GDR Master Room

Web app responsive per gestire una stanza narrativa GDR con Master, giocatori, scena condivisa, chat, NPC, messaggi privati, portrait, inventario, note e audio locale.

## Stack

- Next.js + React
- Tailwind CSS
- Supabase Auth, Database, Realtime e Storage
- Pronta per deploy Vercel

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

Senza variabili Supabase l'app usa `NEXT_PUBLIC_DEMO_MODE=true` implicitamente e mostra dati demo in memoria.

## Variabili ambiente

Copia `.env.example` in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_SUPERADMIN_EMAILS=admin@example.com
```

Usa l'URL base del progetto Supabase, non l'endpoint REST. Quindi:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
```

e non:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co/rest/v1/
```

## Setup Supabase

1. Crea un progetto Supabase.
2. Esegui [supabase/schema.sql](/E:/Progetti/MasterRoom/supabase/schema.sql) nel SQL editor.
3. Crea gli utenti demo via Supabase Auth oppure usa utenti reali.
4. Esegui [supabase/seed.sql](/E:/Progetti/MasterRoom/supabase/seed.sql) se vuoi dati demo persistenti.
5. Verifica che Realtime sia attivo sulle tabelle elencate nello schema.

Bucket Storage creati dallo schema:

- `scene-images`
- `portraits`
- `audio-tracks`

## Deploy su Vercel

1. Carica il progetto su GitHub.
2. In Vercel scegli **New Project** e importa il repository GitHub.
3. Framework: **Next.js**.
4. Build command: `npm run build`.
5. Output directory: lascia il valore automatico di Next.js.
6. In **Project Settings -> Environment Variables** aggiungi:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://gdr-master-room.vercel.app
```

7. Dopo il primo deploy copia il dominio Vercel, per esempio:

```text
https://gdr-master-room.vercel.app
```

8. In Supabase aggiorna **Authentication -> URL Configuration**:

```text
Site URL: https://gdr-master-room.vercel.app
Redirect URLs:
http://localhost:3000/**
https://gdr-master-room.vercel.app/**
https://*.vercel.app/**
```

`https://*.vercel.app/**` e utile per preview deploy; per produzione e meglio avere anche il dominio esatto.

Se Google mostra `Errore 400: redirect_uri_mismatch`, apri questa pagina dopo il deploy:

```text
https://gdr-master-room.vercel.app/oauth-setup
```

La pagina mostra il callback Supabase esatto da copiare in Google Cloud Console e gli URL da copiare in Supabase.

## Auth Google

Per usare il pulsante "Continua con Google":

1. In Supabase apri **Authentication → Providers → Google**.
2. Abilita Google.
3. Inserisci **Client ID** e **Client Secret** creati su Google Cloud Console.
4. In Google Cloud Console aggiungi tra gli **Authorized redirect URI** l'URL callback Supabase del tuo progetto:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

5. In Supabase, sezione **Authentication -> URL Configuration**, per sviluppo locale imposta:

```text
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/**
```

Per produzione usa invece il dominio Vercel come indicato nella sezione deploy.

Per test rapidi con email/password puoi disattivare temporaneamente la conferma email in **Authentication → Providers → Email**.

## Note produzione

- Non caricare mai `.env.local` su GitHub: Vercel deve ricevere le variabili dalla dashboard.
- `NEXT_PUBLIC_SUPABASE_URL` deve essere l'URL base del progetto, non `/rest/v1`.
- `NEXT_PUBLIC_SITE_URL` deve essere il dominio Vercel principale, senza slash finale. Questo rende stabile il redirect OAuth anche quando Vercel genera URL preview.
- Il login Google continua a funzionare anche su Vercel solo se Supabase e Google Cloud hanno redirect e dominio di produzione configurati.
- Se cambi progetto Supabase, riesegui `supabase/schema.sql` e poi eventuali file in `supabase/migrations`.
- Per abilitare il pannello superadmin in UI, inserisci le email autorizzate in `NEXT_PUBLIC_SUPERADMIN_EMAILS`.
- Per abilitare i permessi superadmin lato database, assegna all'utente un claim Supabase Auth in `app_metadata`, per esempio `{"role":"superadmin"}` oppure `{"roles":["superadmin"]}`. Non usare `user_metadata` per autorizzazioni.
- Il join stanza usa la funzione SQL `public.lookup_room_by_invite_code`: dopo aver aggiornato il codice, applica la migrazione piu recente o riesegui `supabase/schema.sql`.

## Struttura

```text
src/app
  layout.tsx
  page.tsx
  globals.css
src/components
  auth-gate.tsx
  campaign-lobby.tsx
  game-room.tsx
  room/*
src/lib
  demo-data.ts
  types.ts
  utils.ts
  supabase/client.ts
supabase
  schema.sql
  seed.sql
```

## Funzioni MVP incluse

- Login/registrazione Supabase con fallback demo.
- Menu iniziale con creazione partita, ingresso tramite codice stanza e ripresa sessione.
- Flusso Master per creare campagna, stanza, codice invito e scena iniziale.
- Flusso giocatore per entrare nella stanza tramite codice.
- Cabina di regia Master separata dalla UI giocatore.
- Lobby campagna e codice invito.
- Layout stanza immersivo responsive.
- Scena centrale con cambio scena dal pannello Master.
- Chat comune con colori per Master, personaggi e NPC.
- Selettore "Scrivi come" per Master/NPC/personaggio demo.
- Messaggi privati Master -> giocatore con cronologia.
- Portrait laterali desktop e pannelli consultabili su mobile/tablet.
- Audio player locale con volume, mute e play/pausa indipendenti.
- Inventario base e note personali.
- Schema SQL con tabelle, vincoli, RLS e pubblicazione Realtime.

## Prossimi passi tecnici

- Collegare `GameRoom` alle query Supabase reali al posto di `demoRoomState`.
- Aggiungere upload effettivo verso Supabase Storage nei controlli file.
- Implementare join stanza tramite `invite_code`.
- Aggiungere route dedicate per campagne, stanze e dashboard Master.
- Generare tipi TypeScript dal database Supabase.
