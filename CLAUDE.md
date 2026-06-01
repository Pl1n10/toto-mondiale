# CLAUDE.md — Toto Mondiale (local)

> Project-specific instructions. Loaded by Claude Code in every session
> opened in this directory. Use together with `~/.claude/CLAUDE.md`.

## Cos'è

Custom web frontend per **Toto Mondiale**, gioco di pronostici della Coppa
del Mondo. Sostituisce un precedente setup Glide/Softr. **Airtable resta il
backend/database**; questa app legge le righe di pronostico già generate
dalle Automation di Airtable e permette all'utente di compilarle.

Un VPS sta tra il browser e Airtable — **il token Airtable non deve mai
arrivare al client**.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS (no UI kit)
- Zod per validazione payload
- `fetch` nativo verso Airtable REST API (nessun SDK)
- Auth.js v5 (next-auth@beta), **Google OAuth come unico login**,
  **sessioni JWT (nessun database)**. Airtable resta il source of truth
  per le identità "di gioco": il login dimostra l'identità (authn), la
  presenza in Users autorizza (authz, gate 8d). Prisma/SQLite e il
  magic-link Resend sono stati RIMOSSI il 2026-05-29 (decisione
  Google-only, vedi HANDOFF).
- npm (Node 24 ok)

## Architettura — i 4 layer

```
UI components   ← lavorano SOLO su tipi domain.ts
       ↓
Server Actions  ← validano payload con Zod, chiamano il service layer
       ↓
Airtable service ← una funzione per use-case (fetch / batch update)
       ↓
Airtable adapter ← config (mapping campi), client (HTTP+paging+batch),
                   mappers (raw → domain)
```

**Regola d'oro:** i nomi dei campi Airtable esistono solo dentro
`lib/airtable/config.ts` e `lib/airtable/mappers.ts`. Mai altrove.

## File da leggere all'inizio di ogni sessione

1. `~/.claude/CLAUDE.md` (global)
2. `./CLAUDE.md` (questo file)
3. `./HANDOFF.md` (stato corrente del task)
4. `./DECISIONS.md` se servono motivazioni di scelte architetturali
5. `./ANTIPATTERNS.md` se stai per toccare l'adapter o la save flow
6. `./AIRTABLE_INFO_KNOCKOUT.md` se stai per partire con lo slice #3
7. `git log --oneline -n 10` + `git status`

## Comandi per lo stato verde

```
npm run typecheck       # tsc --noEmit
npm run build           # next build (full SSR + linting)
npm run dev             # http://localhost:3000
```

Smoke test rapido senza Airtable: app gira su mock data se le env
`AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` sono vuote.

## Dove vivono le cose

| Cosa | Dove |
|---|---|
| Mapping Airtable (UNICA fonte) | `lib/airtable/config.ts` |
| HTTP client + paginazione + batch PATCH | `lib/airtable/client.ts` |
| Raw record → domain object | `lib/airtable/mappers.ts` |
| Per-tabella fetch/update | `lib/airtable/<tabella>.ts` |
| Mock data fallback | `lib/airtable/mockData.ts` |
| Tipi di dominio | `types/domain.ts` |
| Schemi Zod | `lib/validation/*Schema.ts` |
| Server Actions | `app/.../actions.ts` (colocate con la page) |
| UI riusabile | `components/ui/` |
| Tabelle predizioni | `components/predictions/` |
| Auth.js config + provider Google + callback gate/authorized | `lib/auth.ts` |
| Airtable Users lookup (allowlist 8d) | `lib/airtable/users.ts` |
| Visibility model + ownership guard (8f) | `lib/access.ts` |
| Route gating (`/prediction-set/*`) | `middleware.ts` |
| Auth API handler | `app/api/auth/[...nextauth]/route.ts` |
| IaC deploy (Terraform + Ansible) | `infra/` (README spiega topologia) |
| Runbook generici riutilizzabili | `minion` → `templates/playbooks/gcp-deploy/` |

## Cosa NON fare in questo repo

Estratti da `ANTIPATTERNS.md`, qui per visibilità:

- **Mai** chiamare l'Airtable REST API da un client component
- **Mai** mandare in PATCH un campo non presente in `*_WRITABLE_FIELDS`
- **Mai** spezzare la dipendenza "UI → domain types" inserendo nomi di
  campo Airtable nelle pagine o nei componenti
- **Mai** fare PATCH con più di 10 record in una sola richiesta (limite
  Airtable); usa `updateRecordsInBatches` che già chunka
- **Mai** introdurre autosave per cella; la UX scelta è save batch
  esplicito (vedi DECISIONS.md)
- **Mai** committare `.env.local`, token Airtable o gli `AUTH_*` secrets
- **Mai** reintrodurre un database/adapter (Prisma, SQLite) o il
  magic-link: l'auth è Google-only con sessioni JWT (decisione
  2026-05-29). Airtable è l'unico user store.
- Niente backups, payments, admin panel finché non esplicitamente
  richiesto (sono fuori scope per l'MVP). L'auth è invece IN scope
  con slice #8.

## Workflow concordato

- Vertical slice alla volta, ogni slice ha: domain types → service →
  validation → UI → page → smoke test
- Un solo bottone "Save predictions", no autosave
- Partial-failure handling: righe ok diventano verdi, righe fallite
  restano rosse con l'input utente preservato
- `HANDOFF.md` aggiornato a fine step, nello stesso commit
- Commit message inglesi, factual, con
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

## Slice in roadmap

1. ✅ **Group Match Predictions** — slice completa contro Airtable reale,
   modello segno **1/X/2** (Totocalcio, vedi D-015). Niente score esatto.
2. ✅ **Group Order Predictions** — slice completa contro Airtable reale,
   pill 1·2·3·4 con duplicate-rank guard live (client + Zod superRefine).
3. ✅ **Knockout Predictions** — slice completa contro Airtable reale.
   Cascata client-side derivata dai `Slot A/B Label` del Knockout Match
   table (parser in `lib/knockout/bracketTopology.ts`); PATCH solo su
   `Predicted Winner`; cascata invalidata + save check completezza
   gestiti via dot ambra. Save end-to-end verificato in browser.
4. ✅ **Lock read-only frontend (slice #4)** — le 3 pagine leggono i
   flag `Group/Knockout Predictions Locked?` dal PredictionSet e
   passano `readOnly: boolean` ai componenti tabella. Quando lockato:
   `<LockBanner />` giallo + pill `disabled` + SaveBar nascosta.
   D-022 step (a).
5. ✅ **Server-side lock guard (slice #5)** — `checkLockGuard()` in
   `lib/airtable/predictionSets.ts`, chiamato da tutte le server
   action subito dopo Zod e prima del PATCH. Difende contro payload
   inviati a mano da client malevoli. D-022 step (b).
6. ✅ **Connessione ad Airtable reale** — base reale `appPV77eshDFrfgII`
   integrata: tutti i Table IDs in `config.ts`, enrichment server-side
   per i nomi Team/Group, save end-to-end verde su slice #1, #2, #3.
   PAT deve avere scopes `data.records:read` + `data.records:write`
   (D-019).
7. ✅ **Unified Group Predictions page (slice #7)** — route
   `/prediction-set/[id]/groups` che mostra per ogni girone i 6 match
   1/X/2 + le 4 squadre con pill 1·2·3·4, una sola SaveBar che fa
   entrambi i batch PATCH in parallelo (`saveUnifiedGroupPredictions`).
   Validata da Cipo il 2026-05-28: le vecchie `/group-matches` e
   `/group-order` (+ componenti `MatchPredictionTable`/`GroupOrderTable`)
   sono state rimosse. Completeness check opzione C: `window.confirm`
   "Schedina incompleta — salvare comunque la bozza?" sia sulla pagina
   unificata che sul knockout (limitata a Finale + Terzo posto, gli
   altri round sono già gated da "Complete previous round").
8. ✅ **Auth + visibility model (slice #8)** — Google-only, sessioni JWT
   (revisione 2026-05-29: Prisma/SQLite/Resend rimossi). Sotto-slice:
   - 8a ✅ Scaffold Auth.js v5 (lo scaffold Prisma/SQLite è poi stato
     rimosso nella revisione Google-only).
   - 8b ✅ Google OAuth provider + pagina `/sign-in`, login reale
     verificato in browser (callback → `/dashboard`).
   - ~~8c~~ ❌ **Annullato** — magic link/Resend rimossi (Google-only).
   - 8d ✅ `signIn` callback: lookup email su Airtable Users
     (`lib/airtable/users.ts`), blocca se non presente → redirect
     `/sign-in?error=AccessDenied`. Solo presenza email (no `Active?`).
   - 8e ✅ `middleware.ts`: gating su `/prediction-set/*` via callback
     `authorized` (sessioni JWT → leggibili su Edge, niente DB).
     Verificato: route protetta senza auth → 307 `/sign-in`.
   - 8f ✅ Visibility model (`lib/access.ts`): durante unlocked vede
     solo le sue (`notFound()` sulle altrui), durante locked vede tutte
     read-only. Ownership via `PredictionSet.User` vs email loggata.
     `checkOwnershipGuard` difende anche le save action (no scrittura
     su schedine altrui).
9. ✅ **Dockerize (slice #9)** — `output: 'standalone'` in
   `next.config.mjs`, `Dockerfile` multi-stage (deps→builder→runner,
   `node:24-alpine`, non-root), `.dockerignore`, `docker-compose.yml`
   con due servizi (app + `cloudflared`, nessuna porta host, app
   **stateless** → niente volume). Smoke verde: immagine 261 MB,
   container serve sign-in/providers/middleware (ready 70ms). Secret in
   `.env.production` (gitignored, template `.env.production.example`).
10. ⏳ **Dominio + Cloudflare (slice #10)** — dominio
    `t0t0m0ndlale.online` (registrato 2026-05-29) → aggiungere a
    Cloudflare (cambio nameserver), Tunnel dal dashboard Zero Trust →
    tunnel token.
11. ✅ **Deploy GCP via IaC (slice #11)** — APP LIVE su
    `https://t0t0m0ndlale.online` (2026-06-01). Control plane sulla **devbox**.
    `infra/terraform/` provisiona VM **e2-micro Always Free** (Ubuntu
    24.04, regione US), VPC senza ingress, service account least-priv,
    startup-script che fa join **Tailscale** (`--ssh`); state su **bucket
    GCS**. `infra/ansible/` (over Tailscale SSH): hardening (swap 2 GB,
    sshd, unattended-upgrades, fail2ban), Docker, app stack (app +
    `cloudflared` + **Watchtower** autodeploy). Immagine **buildata su
    devbox** e pushata su GHCR (la e2-micro va OOM su build). Secret via
    `group_vars`/vault (`AIRTABLE_*`, `AUTH_SECRET`, `AUTH_GOOGLE_*`,
    `AUTH_URL`, `TUNNEL_TOKEN`). Runbook generici: famiglia
    `gcp-deploy` in `minion` (`templates/playbooks/`).
12. ✅ **Wiring prod (slice #12)** — redirect URI prod
    (`https://t0t0m0ndlale.online/api/auth/callback/google`) + origin JS
    aggiunti al client OAuth Google. Login end-to-end verificato in prod
    (2026-06-01).
13. ✅ **Vero dashboard per-utente (slice #13)** — elenco delle Prediction
    Sets dell'utente loggato (`fetchPredictionSetsForUser`, ownership come
    8f). Sostituisce il placeholder di debug statico col banner mock
    congelato. (Ora la lista vive su `/my-predictions`; vedi slice #14.)
14. ✅ **Tabellone + bivio dashboard (slice #14)** — `/dashboard` è un
    bivio (🏆 Tabellone → `/scoreboard`, 📝 Le tue schedine →
    `/my-predictions`). `/scoreboard` (`fetchScoreboard`) elenca TUTTE le
    schedine coi punti Airtable (5 parziali + Total), ordinate per totale,
    leader/own evidenziati; righe altrui apribili read-only solo quando
    l'admin blocca la fase (riusa il gating 8f). Punti read-only,
    `force-dynamic` → refresh-current.
15. ✅ **Pronostici speciali (slice #15)** — Campione del Mondo +
    Capocannoniere nella pagina overview `/prediction-set/[id]`. Scrivono
    sul record di "2. Prediction Sets" (`Predicted World Cup Winner` →
    Teams, `Predicted Top Scorer` → Players) via un singolo PATCH
    (`updateSpecialPredictions`). Capocannoniere = picker a 2 step
    **nazione → giocatore** (scala a ~1200 player senza liste lunghe).
    Lock **in coppia coi gironi** (`groupPredictionsLocked`); editabile
    solo dall'owner.

🎉 **MVP LIVE in produzione:** `https://t0t0m0ndlale.online`.

Per ogni slice consultare `HANDOFF.md` per lo stato preciso.
