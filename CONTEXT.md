# CONTEXT.md — Toto Mondiale

## Cosa è il progetto

Toto Mondiale è un gioco di pronostici della Coppa del Mondo FIFA.
Ogni utente acquista una "schedina" — un **Prediction Set** — che gli
permette di pronosticare:

- il risultato di ogni partita della fase a gironi (72 partite per
  formato a 48 squadre)
- la classifica finale di ogni girone (1° / 2° / 3° / 4° posto)
- chi vince ogni partita del tabellone a eliminazione diretta
- il vincitore del Mondiale e il capocannoniere del torneo

Lo scoring è a punti; vince chi totalizza di più alla fine del torneo.

## Contesto pre-esistente

- **Backend:** Airtable. Una serie di Automations Airtable, all'atto
  della creazione di un Prediction Set, genera già tutte le righe
  vuote che l'utente deve compilare:
  - 72 Group Match Predictions
  - 48 Group Order Predictions
  - 32 Knockout Predictions
- **Frontend storico:** Glide / Softr. Funzionante ma limitante per
  fare una UX davvero compatta stile "spreadsheet prefilled".

## Cosa stiamo costruendo

Un frontend custom in Next.js che:

1. Legge le righe già esistenti su Airtable
2. Le mostra in tabelle compatte raggruppate per girone / round
3. Permette l'editing locale + un batch save esplicito
4. Non crea righe nuove (le crea Airtable)

L'app è un **client + un server proxy**: il browser parla solo col server
Next.js; il token Airtable resta lato server. Deploy futuro su un VPS.

## Utente target

Persone che giocano a Toto Mondiale durante il Mondiale FIFA.
Tipicamente non tecnici. Vogliono compilare le predizioni velocemente,
spesso da mobile.

## Vincoli prodotto noti

- Mai esporre il token Airtable al browser
- I conteggi delle righe (72/48/32) sono **fissati lato Airtable** —
  il frontend si adatta a quello che trova
- Lo schema esatto dei campi può cambiare → l'adapter deve isolare
  bene il mapping (vedi `DECISIONS.md` D-005)
- I pronostici si possono modificare finché non sono lockati (in MVP
  non c'è ancora gestione del lock; predisposto su `PredictionSet`)

## Fuori scope per l'MVP

- Autenticazione / autorizzazione
- Backup automatici
- Pagamenti (Stripe / Satispay)
- Admin panel
- Production hardening (rate limiting, CSP, ecc.)
- Migrazione da Airtable a un DB proprio
- Creazione di righe di pronostico (le fa già Airtable)

## Roadmap orientativa

| Fase | Output |
|---|---|
| **0. Bootstrap** | Scaffold + slice #1 (Group Match) su mock ✅ |
| **1. Connessione Airtable reale** | Schema reale nel config, env vars, smoke test contro base reale ✅ |
| **2. Slice #2 — Group Order** | Editing UI con check duplicate-rank client+server ✅ |
| **3. Slice #3 — Knockout** | Editing UI con cascata client-side, dot ambra invalidate, save check completezza ✅ |
| **4. Auth** | Login utente, scoping del Prediction Set per user |
| **5. Lock & deadline** | Disable editing dopo l'inizio della fase del torneo |
| **6. Deploy** | VPS, Cloudflare Tunnel, secrets in env del VPS |
| **7. Backup + admin panel** | Solo se richiesto |

**MVP delle 3 slice è chiuso** (fine sessione 5, 2026-05-27). Le fasi
4..7 sono prossimi step di prodotto, non ancora pianificati nel
dettaglio.

## Interlocutori

- **Roberto Novara** (dev unico per ora) — definisce schema, fa code review
- **Claude** (agente AI assistant) — implementa con vertical slice

## Riferimenti esterni utili

- Airtable REST API: <https://airtable.com/developers/web/api/introduction>
- Next.js App Router Server Actions:
  <https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations>
- Zod: <https://zod.dev/>
