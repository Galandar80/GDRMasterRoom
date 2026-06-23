# Controllo operativo Supabase Free

Snapshot verificato il 22 giugno 2026:

- Storage applicativo: circa 87 MB.
- Database: 22 tabelle pubbliche con volumi bassi; la tabella maggiore contiene 188 messaggi.
- Realtime: un solo canale privato per stanza; trascinamento mappa limitato a circa 8 eventi al secondo.

## Soglie operative

Controllare il pannello Usage di Supabase almeno ogni settimana durante l'uso attivo:

- avviso preventivo al 70% di Database, Storage, Egress, MAU o messaggi Realtime;
- intervento obbligatorio all'85%;
- non attendere il 100%, perché traffico ed egress non sono misurabili con precisione dal client.

Limiti applicativi già attivi:

- ritratti: 4 MB;
- audio: 12 MB;
- immagini/video scena: 20 MB;
- messaggi: 8.000 caratteri;
- esportazioni chat: massimo 5.000 righe;
- libreria media: query limitate e ordinate.

## Query di controllo

```sql
select pg_size_pretty(pg_database_size(current_database())) as database_size;

select
  bucket_id,
  count(*) as objects,
  pg_size_pretty(coalesce(sum(nullif(metadata->>'size', '')::bigint), 0)) as storage_size
from storage.objects
group by bucket_id
order by bucket_id;

select 'messages' as resource, count(*) from public.messages
union all select 'media_assets', count(*) from public.media_assets
union all select 'rooms', count(*) from public.rooms
union all select 'users', count(*) from public.users;
```

Messaggi Realtime, egress e utenti attivi mensili devono essere verificati nel pannello Usage del progetto.

## Manutenzione

- Eliminare periodicamente stanze di prova e media non più referenziati dal pannello superadmin.
- Non rimuovere automaticamente gli indici indicati come `unused` su database piccoli: le statistiche non sono ancora rappresentative.
- Eseguire `npm run verify` prima di ogni pubblicazione.
- Rieseguire Security e Performance Advisor dopo ogni migrazione.
