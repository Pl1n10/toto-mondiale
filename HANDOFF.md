# HANDOFF.md — Toto Mondiale

**Stato al 2026-05-26 (tardo)** — sessione 4: slice #2 (Group Order
Predictions) completato end-to-end contro Airtable reale. Slice #1 e #2
verdi. Resta lo slice #3 (Knockout) e i task amministrativi.

## Stato git

- **Branch:** `main`
- **Ultimo commit:** `2d983e8` "Session 2: prepare Airtable info request,
  partial data collected"
- **Working tree:** dirty in questo momento — pronti per il commit
  "Real Airtable connection + 1/X/2 refactor" a fine sessione.
- **Remote:** ancora nessuno.

## Step completati in questa sessione (3)

1. ✅ Ricevuto `AIRTABLE_INFO (1).md` compilato da Cipo + Personal
   Access Token (su canale privato).
2. ✅ `.env.local` creato con `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`
   (`appPV77eshDFrfgII`), `DEBUG_PREDICTION_SET_ID` (`recnWpdJeglgnngOc`).
   File coperto da `.gitignore`.
3. ✅ `lib/airtable/config.ts` allineato allo schema reale:
   - Tutti i 10 Table IDs popolati (aggiunte `groups` e `knockoutMatches`).
   - Field name maps aggiornate per Teams (`Team Name`), Players
     (`Player Name`), Knockout Predictions (Phase/Match Number/Real
     Team A·B/Predicted Team A·B + nuovi knockoutMatch / realWinner /
     matchStatus / pointsEarned).
   - Nuovi `GROUP_FIELDS` e `KNOCKOUT_MATCH_FIELDS`.
   - `KNOCKOUT_ROUND_LABELS` e `GROUP_MATCH_RESULT_VALUES` esportati per
     la UI futura.
4. ✅ Refactor 1/X/2 dello slice #1 (vedi D-015):
   - `types/domain.GroupMatchPrediction.predictedResult` (era
     `predictedHomeScore` + `predictedAwayScore`)
   - mapper + service + mock + Zod schema + UI tutti allineati
   - `MatchPredictionTable` ora ha 3 bottoni pillola "1 / X / 2"
5. ✅ Group Order: typecast attivato su PATCH (D-016). Mapper accetta
   sia integer che numeric-string.
6. ✅ Knockout: naming Airtable allineato (D-017). Slice #3 resta
   placeholder UI ma `config.ts` è ora source of truth corretto.
7. ✅ `DECISIONS.md` aggiornato con D-015 (1/X/2), D-016 (rank
   typecast), D-017 (knockout naming), D-018 (helper field text).

## Step in corso

**Smoke test runtime contro Airtable reale** — non eseguito ancora in
questa sessione. Da fare prima del commit:

```bash
npm run dev &
sleep 5
# Test che il dashboard fetcha la lista delle schedine reali
curl -sI http://localhost:3000/dashboard

# Test che la pagina di un Prediction Set reale carichi
curl -sI http://localhost:3000/prediction-set/recnWpdJeglgnngOc

# Test che le 72 righe di Group Match Predictions vengano fetchate
# e rese
curl -sI http://localhost:3000/prediction-set/recnWpdJeglgnngOc/group-matches

pkill -f "next dev"
```

E poi un test "vero" col browser per vedere:
- 72 righe caricate, ordinate per `Group A..L`
- I bottoni 1/X/2 mostrano il valore corretto se Cipo ha già
  pre-popolato qualche `Predicted Result` (sì, nel JSON di esempio
  alcune righe lo hanno)
- Save di 2-3 righe → verifica scrittura su Airtable

## Smoke test runtime contro Airtable reale — read OK, write bloccato

Eseguito a fine sessione 3:

**Read (GET) ✅:**
- 5/5 pagine HTTP 200, nessun errore.
- `/group-matches`: 216 radio buttons = 72 righe × 3 opzioni.
- 12 sezioni Group A..Group L (nomi risolti via enrichment, D-015).
- Nomi squadra leggibili (South Africa, Mexico, Czechia, …).
- 72 radio con `aria-checked="true"`: i `Predicted Result` pre-popolati
  da Cipo arrivano correttamente.

**Write (PATCH) ❌ blocker esterno:**
- PATCH su `tblZbCTCA0vkG9DKZ` risponde
  `403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`.
- Causa diagnosticata via probe manuale (`python3` con il token in
  `.env.local`): il token ha `data.records:read` ma NON ha
  `data.records:write`.
- Soluzione: Cipo deve aggiungere lo scope `data.records:write` al
  token esistente su https://airtable.com/create/tokens (non serve
  rigenerarlo, e il token attuale resta valido).
- Verificato che NON è un problema applicativo: payload del PATCH
  ben formato, `Predicted Result` (single-select 1/X/2) esiste,
  field name corretto. Solo permessi mancanti.

Verifica al ritorno del token aggiornato: 1 click radio → Save → dot
verde. Non serve riavviare il dev server (token letto a runtime).

## Problemi noti residui

1. **`Prediction Set ID` text non valorizzato** (D-018). Continuiamo
   con in-memory filter (D-007). Lazy, ok.

2. **Knockout slice #3**: UI placeholder. Quando lo facciamo, va
   chiarita con Cipo la semantica di `Predicted Team A/B` (lookup
   verso quale source?).

## Slice #2 — Group Order Predictions ✅ (sessione 4)

- `components/predictions/GroupOrderTable.tsx`: client component con
  pill 1·2·3·4 per ogni squadra. Stati `clean/dirty/saving/saved/error`
  invariati rispetto allo slice #1.
- **Duplicate-rank guard live**: appena l'utente crea un rank doppio
  in un girone entrambe le righe diventano rosse, il SaveBar mostra
  un banner "N rows share a rank..." e il bottone Save è disabilitato
  finché il conflict non è risolto. Validation duplicata anche
  server-side via `superRefine` in `groupOrderPredictionBatchSchema`.
- `components/ui/SaveBar.tsx`: aggiunto prop `saveDisabled` opzionale
  per gate esterni alla state machine clean/dirty/error.
- `app/prediction-set/[id]/group-order/actions.ts`: nuova server
  action (pattern identico a group-matches).
- `types/domain.GroupOrderPredictionUpdate.group`: nuovo campo, va
  insieme all'update perché serve al refinement; non finisce nel
  PATCH Airtable (defense-in-depth nel service).
- **Fix non banale (D-016 revisionata)**: `typecast: true` di Airtable
  coerce string→target, NON integer→text. PATCH con integer 1 su
  Single-line-text → `422 Unprocessable Entity`. Soluzione: il service
  ora converte a stringa via `String(u.predictedRank)` prima del PATCH
  e `typecast` è stato tolto (era no-op).

Smoke test save end-to-end OK: 4 record modificati su
`recnWpdJeglgnngOc` salvati su Airtable, nessun girone con duplicati
o missing rank residuo, tutti i 12 gironi coprono 1·2·3·4.

## Step pending (in ordine)

1. **Setup remote git (Gitea homelab + GitHub mirror)** — Roberto ha
   detto domani. 5 min di lavoro. Quando ci si arriva: usare identità
   `Pl1n10`, repo privato fino al lancio del Mondiale.

2. **Vertical slice #3 — Knockout Predictions**. Prima di partire:
   chiarire con Cipo la semantica di `Predicted Team A/B` (vedi nota
   in `config.ts KNOCKOUT_PREDICTION_FIELDS.candidateTeam1Name`).
   Modello atteso: tabellone, utente sceglie `Predicted Winner`
   (linked → Teams) per ciascuna delle 32 partite knockout.
   Le candidate (Real Team A vs Real Team B) sono fissate dall'admin
   dopo i gironi per Round-of-32; gli altri turni si formano a
   cascata dalle scelte utente sui turni precedenti.

3. **Cleanup minori** (quando vengono comodi):
   - Rendere il dev script `-H 0.0.0.0` permanente in `package.json`
     (Roberto lavora regolarmente via Tailscale da una macchina remota)
   - Decisione UX "Played": se una partita ha `Match Status = Played`
     l'utente può ancora modificare il proprio Predicted Result?
     Default attuale: sì (editabile sempre). Da rivalutare prima del
     torneo reale.
   - D-018 helper field text non valorizzato: indagare con Cipo
     perché `RECORD_ID()` non gli funziona; quando risolto possiamo
     passare a `filterByFormula` server-side (D-007-bis).

2. **Commit "Real Airtable connection + 1/X/2 refactor"** dopo OK di Roberto:
   - codice (config + types + mapper + service + Zod + UI)
   - DECISIONS.md (D-015..D-018)
   - HANDOFF.md (questo file)
   - rinomina `AIRTABLE_INFO (1).md` → `AIRTABLE_INFO.md` (sostituisce
     il vecchio file della richiesta)

3. **Vertical slice #2 — Group Order Predictions**: editing UI.
   Chiedere a Roberto la modalità di scelta del rank
   (dropdown 1–4 / drag&drop / input numerico free) prima di
   iniziare. Schema Zod e service backend già pronti.

4. **Vertical slice #3 — Knockout Predictions**: dopo aver chiarito
   la semantica di `Predicted Team A/B` con Cipo (vedi nota in
   `config.ts` `KNOCKOUT_PREDICTION_FIELDS.candidateTeam1Name`).

## Chiarimenti già acquisiti da Cipo (sessione 2 + 3)

Memo da non perdere:

- Creazione di User e Prediction Set resta manuale su Airtable
  (no signup dal frontend, no auth nell'MVP).
- Automation Airtable genera le 72+48+32 righe figlie automaticamente
  alla creazione di un Prediction Set.
- Esiste un campo `Played` (checkbox, su `Group Matches`) settato
  dall'admin → MVP non lo legge né lo scrive. Decisione UX A/B
  (vedi sotto) ancora aperta.
- 4 Prediction Sets di test pronti; quello usato come debug è
  `recnWpdJeglgnngOc`.
- `Prediction no.` ha davvero il `.` finale (confermato).
- Tipo Group Match Predictions: **NON** Number Integer score. È un
  single-select `Predicted Result` (1/X/2). Refactor applicato.
- Tipo Group Order: `Predicted Rank` è single-line text con valori
  "1".."4". Typecast attivato.
- Knockout: accoppiamenti Round-of-32 admin-fixed; gli altri round
  si formano dalle scelte utente sui round precedenti ("tabellone").

## Scelta UX in sospeso (post-integrazione)

Una volta che `Played === true` per una partita, l'utente deve ancora
poter modificare la sua predizione? Vedi sessione 2 — default attuale
B (sempre editabile). Da rivedere quando smoke test verde.

## Workflow concordato con l'utente

- Italiano in chat, inglese nei commit
- Identità git: Roberto Novara / robnovara@gmail.com
- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` nei commit
- Una vertical slice alla volta, end-to-end
- HANDOFF aggiornato a fine step / fine sessione, stesso commit
- Mai esporre token Airtable al client (ok: server-only)
- Diff preview obbligatoria per modifiche all'adapter Airtable
- Token Airtable mai in chat, mai in repo — solo `.env.local` sulla
  devbox o canali privati

## Come verificare lo stato verde

```bash
npm install            # già fatto
npm run typecheck      # tsc --noEmit
npm run build          # next build → 5/5 pages OK
```

Entrambi verdi a fine sessione 3.

## File rilevanti per chi riapre la sessione

1. `~/.claude/CLAUDE.md` — istruzioni globali Roberto
2. `./CLAUDE.md` — istruzioni specifiche del progetto
3. `./HANDOFF.md` — **questo file**
4. `./AIRTABLE_INFO (1).md` — risposta compilata di Cipo (da
   eventualmente sostituire al vecchio `AIRTABLE_INFO.md` al
   prossimo commit)
5. `./DECISIONS.md` — D-001..D-018, vedere ultime 4 entry per
   contesto sessione 3
6. `./ANTIPATTERNS.md` se stai per toccare adapter o save flow
7. `git log --oneline -n 5` + `git status`
