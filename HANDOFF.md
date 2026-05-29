# HANDOFF.md — Toto Mondiale

**Stato al 2026-05-29 sessione 7.** Decisa la strada deploy e aggiunta
la roadmap #9→#12 (vedi sezione "Roadmap deploy"). **8b chiuso**:
provider Google + pagina `/sign-in`, login reale verificato in browser
(account `robnovara@gmail.com`). Prossimo step **8c (Resend magic
link)**, bloccato dal dominio dedicato. **Bloccanti esterni ancora
aperti:** dominio dedicato da registrare → sblocca Resend per 8c
(Roberto), colonna `Email` popolata sulla tabella Users di Airtable
(Cipo, oggi 1/4).

**8b (chiuso in sessione 7) — cosa è stato fatto:**
- `lib/auth.ts`: aggiunto `Google` ai providers (Auth.js v5 legge
  `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` dall'env in automatico).
- `app/sign-in/page.tsx`: server component, bottone "Accedi con
  Google" → server action `signIn('google', { redirectTo: '/dashboard' })`.
  Se già loggato → redirect `/dashboard`.
- `AUTH_URL=http://localhost:3000` pinnato in `.env.local` + documentato
  in `.env.example`. Serve perché il dev server gira `-H 0.0.0.0`
  (Tailscale) e senza pin Auth.js inferiva host `0.0.0.0`, rompendo il
  match col redirect URI registrato su Google.
- **Test da remoto via Tailscale:** SSH local-forward
  `ssh -L 3000:localhost:3000 hypn0@<tailscale-ip>` poi browser su
  `http://localhost:3000`. Google rifiuta IP nudi e http non-localhost
  come redirect URI, quindi l'IP Tailscale diretto NON funziona.
- **Footgun Prisma+SQLite risolto:** Prisma 6 risolve `file:./dev.db`
  rispetto alla cartella dello schema (`prisma/`), NON alla repo root.
  Esistevano due `dev.db` (root migrato vs `prisma/dev.db` vuoto che il
  runtime apriva → errore `Configuration` "table Account does not
  exist"). Fix: `prisma migrate deploy` su `prisma/dev.db`, rimosso il
  `dev.db` vagante in root, `.gitignore` aggiornato per ignorare
  `prisma/*.db` + sidecar WAL/journal. **L'unico DB valido ora è
  `prisma/dev.db`.**
- **Nota gate:** a questo stadio entra QUALSIASI account Google. Il
  blocco "email deve essere in Users di Airtable" è 8d, non ancora
  scritto.

**Decisioni prese in sessione 7 (2026-05-29):**

1. **Account Google dedicato** consigliato per il progetto GCP (owner
   unico per GCP + Resend + dominio), ma non bloccante.
2. **OAuth consent screen pubblicato in Production** con soli scope
   non-sensitive (email/profile/openid) → niente verifica Google,
   niente lista test-user. Il gating sui ~20 invitati resta l'allowlist
   Airtable (8d).
3. **Dominio dedicato** (no sottodominio di robertonovara.me).
4. **Esposizione via Cloudflare Tunnel** (`cloudflared`), nessuna porta
   aperta sul VPS Hetzner, TLS gestito da Cloudflare.
5. **Ordine:** il dominio dedicato sblocca anche Resend (8c). Quindi
   8b ora → registra dominio → 8c → 8d/8e/8f → deploy #9→#12.

**Decisioni chiuse in sessione 6 (riportate da Cipo):**

1. **"Match Status = Played" NON è un lock UX**. È solo un meccanismo
   Airtable per il conteggio punti: una partita played fa scattare il
   calcolo punteggi su Airtable per chi ha indovinato; non-played no.
   L'utente continua a modificare il pronostico fino a che la schedina
   intera non è bloccata via `Group/Knockout Predictions Locked?`.
   → Nessuna logica frontend da aggiungere su `Match Status`.
2. **Modello di visibilità per l'auth (slice futura):**
   - Stage **unlocked** (compilazione): user vede SOLO le sue schedine
   - Stage **locked** (torneo iniziato): user vede tutte (read-only su
     quelle altrui, accesso dal tabellone segna-punti tipo "click su
     Roberto1 → leggo la sua schedina")
3. **Highlight schedina vincitrice (stage 5):** prima riga del
   tabellone segna-punti in verde, le altre in bianco. UX minimal.

**Stato al 2026-05-27 fine sessione 5.** Tutte e tre le slice (Group
Match 1/X/2, Group Order 1·2·3·4, Knockout con cascata) chiuse
end-to-end contro Airtable reale. La sessione 5 ha sbloccato slice #3
con il go di Roberto sulle 3 decisioni UX (cascata invalidata, match
3/4, save check completezza), ha derivato la bracket topology dai Slot
Labels Airtable invece di hardcodarla, ha implementato la cascata
client-side con dot ambra e banner di errore in italiano.

## Stato git

- **Branch:** `main`
- **Ultimi commit:**
  - `3664d18` Add slice #8a: scaffold Auth.js v5 + Prisma + SQLite
  - `cff1d96` Drop legacy group pages after Cipo validated the unified flow
  - `26fd696` Fix slice #7: enrich group name on order predictions
  - `ec900bd` Add slice #7: unified Group Predictions page + soft completeness check
  - `e9621b8` Docs: reflect slices #4 and #5 (lock read-only + server-side guard)
- **Working tree:** docs unstaged (CLAUDE.md + HANDOFF.md). Da pushare.
- **Remote:** `origin` su `git@github.com:Pl1n10/toto-mondiale.git`
  (privato, branch `main` tracking). Mirror Gitea homelab ancora
  pending — bassa priorità.

## Cosa è verde end-to-end

### Slice #1 — Group Match Predictions ✅

- Modello **1 / X / 2** (Totocalcio): pill button per riga, niente
  score esatto. La scelta è da Cipo's schema (D-015).
- Read da Airtable reale: 72 righe per `recnWpdJeglgnngOc`, nomi
  squadra e gironi risolti via enrichment server-side (fetch
  parallelo Teams + Groups, mappa `id → name`).
- Save end-to-end verificato (7 record modificati salvati).
- Page: `/prediction-set/[id]/group-matches`.

### Slice #2 — Group Order Predictions ✅

- Pill button **1·2·3·4** per ogni squadra di ogni girone.
- **Duplicate-rank guard live**: appena si crea un conflitto nello
  stesso gruppo entrambe le righe diventano rosse, il SaveBar mostra
  un banner esplicativo, Save bloccato finché non si risolve.
  Validation duplicata server-side via `superRefine`.
- Save end-to-end verificato (4 record modificati, nessun duplicate
  residuo, tutti i 12 gironi coprono 1·2·3·4).
- Page: `/prediction-set/[id]/group-order`.
- Fix non banale lungo la strada (D-016 revisionata): `typecast: true`
  di Airtable coerce string→target, NON integer→text. Il service ora
  converte a stringa via `String(...)` prima del PATCH.

### Slice #3 — Knockout Predictions ✅

- **Caso B** (cascata frontend-side, conferma Cipo sessione 4) +
  **Predicted Team A/B sono lookup read-only**, quindi mai in PATCH.
  Il PATCH contiene solo `Predicted Winner`. La cascata vive interamente
  nello stato client.
- **Bracket topology derivata a runtime** dai `Slot A Label` / `Slot B Label`
  del Knockout Match table (sessione 5 scoperta durante il probe; non
  era stato menzionato da Cipo ma è già nei dati). Niente mappa
  hardcodata: parser in `lib/knockout/bracketTopology.ts` legge i label
  nel formato `^(Winner|Loser) Match (\d+)$` e fallisce in modo
  esplicito se Cipo cambia convenzione. Più robusto.
- **Match 3°/4°**: candidate = i due perdenti delle SF (via outcome
  `'loser'` nel parser). Funziona out-of-the-box senza casi speciali.
- **Cascata invalidata**: quando l'utente cambia un winner upstream
  e una scelta a valle non è più tra le candidate, `reconcileCascade`
  azzera quella scelta a valle e marca la riga con dot ambra
  "scelta da rifare" (tooltip). Iterativo: si propaga finché stabilizza.
- **Save check completezza**: al click di Save, se ci sono row senza
  `Predicted Winner`, niente PATCH; banner rosso in italiano
  ("Attenzione!!! Mancano delle squadre…") con conteggio, ogni row
  vuota riceve dot ambra "scelta mancante". Coerente col modello
  one-shot pre-lock.
- **Display**: 6 sezioni (R32 → Final), pill A/B per ogni match con
  i nomi delle candidate risolti dalla mappa `id → name` Teams. Pill
  disabilitata + tooltip "Complete previous round" finché upstream
  non è compilato.
- Page: `/prediction-set/[id]/knockout` (HTTP 200 contro Airtable
  reale, 32 match render con cascata coerente da winner pre-esistenti
  del test set `recnWpdJeglgnngOc`).
- **Save end-to-end verde in browser** (sessione 5): Roberto ha
  rimosso alcune scelte → banner "Mancano 5 scelte su 32" ✓ →
  ricompilato tutto → "Saved 14 predictions" → "No changes" ✓.
  PATCH reale verificato su Airtable. Slice #3 chiusa definitivamente.

### Slice #4 — Lock read-only ✅

- Le 3 pagine di editing leggono i flag `Group Predictions Locked?` /
  `Knockout Predictions Locked?` dal `Prediction Set` (fetch in
  parallelo con le predictions) e propagano `readOnly: boolean` ai
  componenti tabella.
- Quando un flag è `true`: banner `<LockBanner />` giallo in cima
  ("Schedina lockata — modifiche disabilitate"), tutti i pill
  `disabled`, SaveBar **nascosta**.
- Smoke test verificato: group flag locked → group-matches +
  group-order in read-only, knockout invariato (e viceversa). I due
  flag sono indipendenti come da D-022.
- Slice pronta per il test di Cipo del 28 maggio 2026.

### Slice #8 — Auth Google + Email + visibility model 🟡

Slice grande, decomposta in 6 sotto-step. Triggered da Roberto/Cipo
fine sessione 6: serve un login per poter applicare il visibility
model (ognuno vede le sue durante stage unlocked, tutte read-only
durante stage locked).

**Scelte UX confermate da Roberto (2026-05-28):**
- Login: **Google OAuth** + **Email magic link** (no password)
- SMTP per i magic link: **Resend** (free tier 100 mail/giorno)
- Sessioni: DB-backed via Prisma + SQLite (richiesta dal magic link)
- Onboarding: **blocca login se l'email non è già nella tabella
  Users di Airtable** ("non sei invitato — contatta l'admin"). Cipo
  popola la tabella manualmente per i 20 invitati.

**Stato sotto-slice:**

| # | Step | Stato | Bloccato da |
|---|---|---|---|
| 8a | Scaffold Auth.js + Prisma + SQLite, providers vuoti | ✅ | — |
| 8b | Google OAuth + pagina `/sign-in` | ✅ | — (login reale verificato) |
| 8c | Email magic link via Resend | ⏳ | env `AUTH_RESEND_*` + **dominio dedicato** verificato su Resend |
| 8d | `signIn` callback: lookup Airtable Users, blocca se non presente | ⏳ | colonna `Email` su Users (Cipo) |
| 8e | Middleware: gating su `/prediction-set/*` | ⏳ | — |
| 8f | Filtro visibility: only-mine quando unlocked, all-read-only quando locked | ⏳ | — |

**8a (chiusa) — cosa è stato fatto:**
- Pacchetti installati: `next-auth@5.0.0-beta.31`,
  `@auth/prisma-adapter@2.11.x`, `prisma@^6`, `@prisma/client@^6`,
  `resend@^6`. Prisma 7 ha dato problemi col nuovo
  `prisma.config.ts` flow → pinnato a 6.x stabile.
- Schema Prisma standard Auth.js (`User` / `Account` / `Session` /
  `VerificationToken`). Migration `20260528153507_init_auth`
  applicata, SQLite in `./dev.db` (gitignored).
- `lib/db.ts` Prisma singleton (HMR-safe).
- `lib/auth.ts` config: adapter Prisma, `session.strategy = 'database'`
  (obbligatorio per il magic link), provider list vuota,
  `pages.signIn = '/sign-in'`.
- `app/api/auth/[...nextauth]/route.ts` re-exporta `handlers.GET/POST`.
- `.env.example` aggiornato con AUTH_SECRET / AUTH_GOOGLE_* / AUTH_RESEND_*.
- `.env.local` ha un AUTH_SECRET dev-only (rigenera in prod).
- Script `npm run db:migrate` / `db:generate` + `postinstall` su `prisma generate`.
- Smoke test: `/api/auth/session` → 200 `null`, `/api/auth/providers`
  → 200 `{}`, build production verde, /groups e /knockout invariati.

**Bloccanti esterni per proseguire con 8b/8c/8d (per Roberto e Cipo):**
1. **Roberto — Google OAuth Client su GCP:**
   - Crea progetto su `console.cloud.google.com`
   - Credentials → Create OAuth client ID → Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
     (+ URL prod quando si arriverà)
   - Annota `Client ID` + `Client secret` in `.env.local`
     (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
2. **Roberto — Resend:**
   - Crea account su `resend.com` (free tier)
   - Verifica un dominio "from" (es. `noreply@robertonovara.me`)
   - Annota `AUTH_RESEND_KEY` + `AUTH_RESEND_FROM`
3. **Cipo — Airtable Users:**
   - ✅ Colonna aggiunta. Nome confermato via probe 2026-05-29:
     esattamente `Email` (coincide con `USER_FIELDS.email`, nessun
     tocco al mapping). Oggi 1/4 record valorizzati.
   - ⏳ Popola le email dei ~20 invitati (manca; ma per scaffoldare e
     testare 8d basta che ci sia l'email di login del tester).
   - ✅ Deciso con Cipo (2026-05-29): il gate 8d controlla **solo la
     presenza dell'email** in Users. `Active?` NON entra nella regola
     (niente blocco da quel campo). Per sospendere un invitato si
     rimuove la riga.

Quando arrivano (1) e (2), 8b + 8c sono lavoro di codice di una
sessione. Senza (3), 8d non è testabile end-to-end ma posso
comunque scaffoldarne la logica.

**Step manuali Google OAuth (per Roberto, sessione 7):**
1. console.cloud.google.com → New Project `toto-mondiale`.
2. OAuth consent screen → External → app name `Toto Mondiale`, support
   + developer email → scope SOLO `email` / `profile` / `openid` →
   **Publish App** (Production, no verifica Google).
3. Credentials → Create OAuth client ID → Web application
   `toto-mondiale-web`.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
     (in prod si aggiunge `https://<dominio>/api/auth/callback/google` → slice #12)
4. Copia Client ID + secret in `.env.local` come `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET` (mai in repo).

## Roadmap deploy (slice #9 → #12)

Architettura target: VM **Hetzner Cloud** (Ubuntu 24.04, ~CX22) con
**Docker Compose**, due container: app Next.js standalone +
`cloudflared`. **Cloudflare Tunnel** come ingress → nessuna porta
aperta sul VPS, TLS gestito da Cloudflare. SQLite (`prod.db`) su volume
persistente; per ~20 utenti basta e avanza, backup = copia del file.

| # | Step | Stato | Bloccato da |
|---|---|---|---|
| 9  | Dockerize: `output:'standalone'`, Dockerfile multi-stage, compose con volume SQLite + migrate all'avvio, smoke `docker compose up` | ⏳ | — |
| 10 | Dominio dedicato → Cloudflare (nameserver) → Tunnel su Zero Trust → tunnel token | ⏳ | Roberto registra dominio |
| 11 | VM Hetzner, Docker, deploy compose + `cloudflared`, secret via env (`AIRTABLE_*`, `AUTH_SECRET`, `AUTH_GOOGLE_*`, `AUTH_RESEND_*`, `AUTH_URL=https://<dominio>`) | ⏳ | slice #9, #10 |
| 12 | Redirect URI prod su GCP, dominio verificato su Resend, test login end-to-end (Google + magic link) in prod | ⏳ | slice #11, env Resend |

**Nota ordine:** il dominio dedicato (slice #10) sblocca anche Resend
(8c). Conviene registrarlo presto in parallelo a 8b, così l'auth si
completa e si testa in locale prima del deploy.

### Slice #7 — Unified Group page + completeness check opzione C ✅

- **Triggered da Cipo (sessione 6):** flippare tra `/group-matches` e
  `/group-order` per ricordarsi chi vince quante partite era scomodo.
  Soluzione: pagina unificata che per ogni gruppo mostra prima i 6
  match con 1/X/2, poi le 4 squadre con pill 1·2·3·4. UX-wise: vedi i
  segni e ragioni sulle posizioni nella stessa schermata.
- **Route:** `/prediction-set/[id]/groups` (nuova). Vecchie
  `/group-matches` e `/group-order` etichettate "(legacy)" nel
  dashboard `/prediction-set/[id]/page.tsx`. Resteranno vive finché
  Cipo non valida la nuova; dopo si cancellano.
- **Server action:** `saveUnifiedGroupPredictions` in
  `app/prediction-set/[id]/groups/actions.ts`. Valida payload (Zod,
  riusa schemas esistenti incluso `superRefine` duplicate-rank),
  esegue `checkLockGuard(..., 'group')` UNA volta, poi lancia in
  parallelo i due `update*Batch`. Ritorna `{ matches: BatchUpdateResult,
  order: BatchUpdateResult }` per gestire partial-failure indipendenti
  sui due lati.
- **Component:** `components/predictions/UnifiedGroupTable.tsx`.
  Tiene due `drafts` separati (match Map e order Map), un solo
  `dirtyCount`, una sola SaveBar. Conflict guard live per i duplicate
  rank già presente. `visibleMessage` priorità: conflicts > save
  message > "Mancano N predictions" (info banner sempre presente
  quando incompleto).
- **Completeness check (opzione C):** scelta UX di Cipo confermata da
  Roberto. Non bloccare il save incrementale — al click di Save, se
  `missingTotal > 0` parte `window.confirm`:
  > "Schedina incompleta: mancano N prediction (X partite, Y posizioni).
  > Salvare comunque la bozza?"
  Cancel → niente. OK → salva solo il dirty (esattamente come prima).
- **Knockout completeness:** stesso pattern in `KnockoutTable.tsx`.
  Il vecchio hard-block (mancano scelte → niente save) è stato
  sostituito con confirm dialog limitato a Finale + Terzo posto
  (`05 - Third Place`, `06 - Final`). Gli altri round sono già gated
  da "Complete previous round" → non serve check esplicito.
- **Smoke test:** HTTP 200 contro Airtable reale, 12 gruppi render
  (Group A..L), 120 radiogroup (72 match + 48 order). Knockout HTTP
  200, 32 match render, 6 fasi visibili. Save end-to-end in browser
  DEMANDATO A CIPO/Roberto per il test del 28 maggio.

### Slice #5 — Defense-in-depth server-side del lock ✅

- Helper shared `checkLockGuard(predictionSetId, kind)` in
  `lib/airtable/predictionSets.ts`: re-fetcha il PredictionSet e
  ritorna un messaggio di errore se il flag corrispondente è `true`,
  altrimenti `null`.
- Le 3 server action (`saveGroupMatch*`, `saveGroupOrder*`,
  `saveKnockout*`) chiamano `checkLockGuard` subito dopo la
  validazione Zod e prima del PATCH. Se lockato, ritornano
  `{ ok: false, error: "Schedina lockata: …" }` senza toccare
  Airtable.
- Chiude lo step (b) del rollout D-022. Niente test runtime esplicito:
  la slice protegge contro client malevoli che inviano payload
  direttamente alle server action, scenario che non emerge naturalmente
  da un click via UI (slice #4 nasconde già il bottone). Logica
  banale e già validata dal typecheck.

### Lessons learned sessione 5

1. **Probe Airtable: SEMPRE con paginazione.** Il probe iniziale aveva
   `pageSize=100` senza loop offset e mancava 7 record del set test,
   facendo credere che ci fosse un bug di Airtable automation
   (`25 records invece di 32`). In realtà i 32 c'erano: il bug era il
   probe. Lezione: usare `listAllRecords` style anche negli script
   ad-hoc, oppure forzare `pageSize=10` per testare il loop.
2. **Slot Labels sono già la topology.** L'idea originale era di
   hardcodare la mappa "match N → match M slot A/B" in
   `bracketTopology.ts`. Il probe ha rivelato che Airtable ha già
   `Slot A Label = "Winner Match 74"` etc. Derivare da lì è più
   robusto: se Cipo cambia un accoppiamento, l'app si adatta da sola.
3. **`Team A/B` dei round non-R32 sono dummy.** Cipo li ha lasciati
   compilati con dati di esempio (Spain in finale, ecc.). Non leggerli
   mai per round != R32; usare la cascata.

## Slice #3 — entry point archivio (cosa avevamo programmato)

**Sbloccato da Cipo a fine sessione 4** (risposta intera + decodifica
in `AIRTABLE_INFO_KNOCKOUT.md` → sezione "Risposta di Cipo").

### Modello previsto (preserved for reference)

- **Caso B** confermato da Cipo: cascata frontend-side. CON UNA
  CORREZIONE rispetto al piano originale: `Predicted Team A/B` sono
  **lookup read-only**, quindi NON li scriviamo. La cascata vive solo
  nello stato client.
- **Compilazione one-shot pre-lock** (chiarimento Roberto sessione 4):
  l'utente compila tutto il tabellone in un'unica sessione dopo i
  gironi, non round-per-round durante il torneo.
- PATCH contiene solo `Predicted Winner` per ogni match modificato.
- Per R16/QF/SF/F i campi `Predicted Team A/B` su Airtable restano
  vuoti — il browser mostra i nomi tramite la mappa `id → name`
  (Teams) combinata con il `Predicted Winner` dei round precedenti.
- L'utente NON può scegliere una squadra che non è nel match: il
  frontend mostra solo le 2 candidate pertinenti. Cipo non tocca
  niente in Airtable.

### Decisioni UX confermate (sessione 5, 2026-05-27)

1. **Cascata invalidata** → `null` + dot ambra "scelta da rifare".
   Coerente con stato "incomplete" generale della UI.
2. **Match 3°/4°** → candidate = i due perdenti delle SF
   (regola FIFA standard). Bracket topology deve esporre `loserOf(matchN)`.
3. **Save check di completezza** (nuovo, sessione 5): il bottone Save
   verifica che tutti i 32 `Predicted Winner` siano compilati. Se
   incompleto: banner di errore in alto ("Attenzione!!! Mancano delle
   squadre; prego ricontrollare il tabellone e inserire le mancanti.
   Grazie") + dot ambra sui match senza winner. Save bloccato finché
   non si completa. Coerente col modello one-shot pre-lock.

### Cosa fare nella prossima sessione

Slice #4 + #5 (lock read-only frontend + defense-in-depth server-side)
chiuse in sessione 5. D-022 step (a) e (b) implementati. Cipo può
testare il 28 maggio senza rischio che la UI o un client malevolo
scriva su una schedina lockata.

**Priorità alta — niente urgente**

Le feature core dell'MVP sono complete. La prossima slice naturale è
auth (D-022 step c), che è grande.

**Priorità media — decisioni / cleanup**

1. **D-018 helper field text**: indagare con Cipo perché
   `RECORD_ID()` non gli funziona; nel mentre l'in-memory filter
   (D-007) regge benissimo per 72/48/32 righe per fetch.

**Priorità bassa — feature grosse successive**

2. **Auth + visibility model** (slice grande, prerequisito hard per
   D-022 punto 4): scoping delle Prediction Sets per utente loggato;
   sblocca la "vista altrui" durante gli stage lockati.
3. **Deploy** — VPS Proxmox + Cloudflare Tunnel.
4. **Mirror Gitea homelab** (`origin` GitHub è già a posto).

### Cose ancora aperte con Cipo (non bloccanti)

- Feedback dal suo test del 28 maggio (lock gironi → calcolo punti →
  test fasi successive).
- Specifica "highlight schedina vincitrice" stage 5 — UX nice-to-have,
  non urgente.

## Cleanup minori pending (non bloccanti)

1. **Setup remote git** (Gitea + GitHub mirror) — Roberto domani.
   Identità `Pl1n10` / `robnovara@gmail.com`. Privato fino al lancio.
2. **Dev script `-H 0.0.0.0` in `package.json`** — Roberto lavora
   regolarmente via Tailscale, ricordarselo ogni volta non è ideale.
   Modifica banale.
3. ~~**Decisione UX "Played"**~~ — CHIUSO sessione 6: Played non è
   un lock UX, è solo per il calcolo punti su Airtable. L'utente
   modifica fino al lock della fase. Niente da implementare.
4. **D-018 helper field text** — `RECORD_ID()` non funziona per Cipo,
   ha messo `Prediction Set ID` come single-line text vuoto.
   Indagare con lui quando sarà comodo; nel mentre l'in-memory
   filter (D-007) regge benissimo per 72/48/32 righe per fetch.

## Workflow concordato con l'utente

- Italiano in chat, inglese nei commit message / identifier / codice
- Identità git: `Roberto Novara` / `robnovara@gmail.com`
- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` nei commit
- Una vertical slice alla volta, end-to-end (vedi AP-011)
- HANDOFF aggiornato a fine step / fine sessione, stesso commit
- Mai esporre token Airtable al client (`'server-only'` import)
- Diff preview obbligatoria per modifiche all'adapter Airtable
- Token Airtable mai in chat, mai in repo — solo `.env.local` sulla
  devbox o canali privati. Scope richiesto:
  `data.records:read` + `data.records:write` (D-019).
- Save test end-to-end demandati a Roberto/owner; Claude verifica
  con probe manuali contro Airtable e dump comparativi quando serve

## Come verificare lo stato verde

```bash
npm run typecheck       # tsc --noEmit
npm run build           # next build → 6/6 routes OK (incl. /api/auth/[...nextauth])
npm run dev             # dev server -H 0.0.0.0 (gia' nello script)
npm run db:migrate      # solo se cambi prisma/schema.prisma
```

Smoke auth scaffold:
```bash
curl http://localhost:3000/api/auth/session     # → null
curl http://localhost:3000/api/auth/providers   # → {}
```

Smoke test runtime già verde (slice #1 e #2 con save end-to-end
contro Airtable reale; slice #3 verificato server-side, save in
browser demandato a Roberto in sessione 6).

## File da leggere per riprendere il filo (in ordine)

1. `~/.claude/CLAUDE.md` — istruzioni globali Roberto
2. `./CLAUDE.md` — istruzioni specifiche del progetto (roadmap status
   aggiornato in fondo)
3. `./HANDOFF.md` — **questo file** (stato corrente)
4. `./AIRTABLE_INFO_KNOCKOUT.md` — domande inviate a Cipo + piano
   esecutivo per ognuno dei 4 casi
5. `./DECISIONS.md` — D-015..D-019 contengono il razionale di tutte
   le scelte di sessione 3-4
6. `./ANTIPATTERNS.md` — AP-015 (typecast int→text) e AP-016 (build
   sopra dev) sono lesson learned di sessione 4
7. `./VOCABULARY.md` — Knockout labels Airtable esatte, Group Match
   Prediction è 1/X/2 (non score)
8. `git log --oneline -n 5` + `git status`
9. `./AIRTABLE_INFO.md` se servono dettagli sullo schema reale
   compilato da Cipo
