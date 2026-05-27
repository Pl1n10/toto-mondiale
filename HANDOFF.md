# HANDOFF.md — Toto Mondiale

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
  - `b4f5e1f` Add slice #4: read-only mode when the prediction set is locked
  - `f93be96` Docs: capture 5-stage tournament lifecycle spec from Cipo
  - `2df48db` Bind dev server to 0.0.0.0 so Tailscale clients can reach it
  - `66c4760` Docs: record GitHub origin setup in HANDOFF
  - `09be5e5` Docs: full sync at end of session 5 (slice #3 closed end-to-end)
- **Working tree:** clean (sessione 5 + slice #4 + slice #5 chiuse).
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
3. **Decisione UX "Played"** — se `Match Status = Played` su una
   partita, l'utente può ancora modificare il proprio
   `Predicted Result`? Default attuale: sì. Da rivalutare prima del
   torneo reale.
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
npm run typecheck      # tsc --noEmit
npm run build          # next build → 5/5 pages OK
npm run dev -- -H 0.0.0.0   # dev server raggiungibile via Tailscale
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
