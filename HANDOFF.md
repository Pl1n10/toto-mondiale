# HANDOFF.md — Toto Mondiale

**Stato al 2026-05-26 fine sessione 4.** Slice #1 (Group Match, modello
1/X/2) e #2 (Group Order, rank 1·2·3·4) chiusi end-to-end contro
Airtable reale. Slice #3 (Knockout) in attesa della risposta di Cipo
su come funziona la cascata fra i round; piano di esecuzione completo
in `AIRTABLE_INFO_KNOCKOUT.md`.

## Stato git

- **Branch:** `main`
- **Ultimi commit:**
  - `c4330f8` Add Group Order editing UI with duplicate-rank guard (slice #2)
  - `6238d81` Connect to real Airtable backend, refactor Group Match slice to 1/X/2
  - `2d983e8` Session 2: prepare Airtable info request, partial data collected
  - `fc84d0a` Bootstrap Next.js frontend with Airtable adapter
- **Working tree:** clean dopo l'ultimo commit di sessione 4 (questo
  HANDOFF e gli altri meta-file aggiornati vanno in un commit
  "Docs sync before slice #3").
- **Remote:** non ancora configurato. Pending per domani: Gitea
  homelab + GitHub mirror `Pl1n10/toto-mondiale` (privato).

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

## Slice #3 — Knockout Predictions ⏳ (entry point per la prossima sessione)

**Sbloccato da Cipo a fine sessione 4** (risposta intera + decodifica
in `AIRTABLE_INFO_KNOCKOUT.md` → sezione "Risposta di Cipo").

### Modello deciso

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

### Decisioni UX ancora da confermare con Roberto (prima cosa domani)

Entrambe dettagliate in `AIRTABLE_INFO_KNOCKOUT.md` → "Decisioni UX
ancora aperte". In sintesi:

1. **Cascata invalidata:** se cambi un winner upstream e le scelte a
   valle puntano a squadre che non passano più, cosa fa la UI?
   Raccomandazione Claude: (i) `null` + dot ambra "scelta da rifare".
2. **Match 3°/4° posto:** candidate = i due perdenti delle SF (regola
   FIFA standard). Raccomandazione Claude: implementare così, niente
   di particolare da decidere.

Roberto deve dare il via libera su entrambe prima che parta il codice.

### Cosa fare nella prossima sessione

1. **Probe di conferma (1 minuto):** verifica che effettivamente
   `Knockout Match.Team A/B` siano popolati solo per i 16 record R32 e
   vuoti per i 16 round successivi:

   ```bash
   set -a && . ./.env.local && set +a
   python3 - <<'PY'
   import json, os, urllib.request
   url = f"https://api.airtable.com/v0/{os.environ['AIRTABLE_BASE_ID']}/tbl9IUt0116lvkbki?pageSize=100"
   req = urllib.request.Request(url, headers={'Authorization': f"Bearer {os.environ['AIRTABLE_API_TOKEN']}"})
   recs = json.loads(urllib.request.urlopen(req).read())['records']
   from collections import Counter
   c = Counter()
   for r in recs:
       has_a = bool(r['fields'].get('Team A'))
       has_b = bool(r['fields'].get('Team B'))
       phase = (r['fields'].get('Phase') or '?')
       c[(phase, has_a and has_b)] += 1
   for k, v in sorted(c.items()): print(k, v)
   PY
   ```

2. **`lib/knockout/bracketTopology.ts`** (nuovo): mappa statica
   match-number → slot-output. Per il formato 48 squadre serve
   sapere "il vincitore di R32 match N alimenta R16 match M slot A/B".
   Match numbers 73..104 da `KNOCKOUT_MATCH_FIELDS.matchNumber`.

3. **Service & schema:**
   - `lib/airtable/knockoutPredictions.ts`: implementare
     `updateKnockoutPredictionsBatch` (oggi è placeholder). PATCH solo
     `Predicted Winner`.
   - `KNOCKOUT_PREDICTION_WRITABLE_FIELDS` già contiene solo
     `predictedWinner`. ✓
   - `lib/validation/knockoutPredictionSchema.ts`: estendere per il
     batch.

4. **Server action:** `app/prediction-set/[id]/knockout/actions.ts`
   (nuovo).

5. **UI:** riscrivere `components/predictions/KnockoutTable.tsx` come
   client component. 6 sezioni (uno per round). Per ogni partita,
   pill A / B che mostrano i nomi delle candidate (`null` → pill
   disabled + tooltip "complete the previous round"). Pill selezionata
   = winner. State machine identica a slice #1/#2.

6. **UX cascata invalidata** (decisione presa, da implementare):
   quando l'utente cambia il `Predicted Winner` di un R32 e il suo
   R16 a valle puntava a una squadra che ora non passa più, la scelta
   a valle diventa `null` con dot ambra "scelta da rifare". Non reset
   silenzioso, non blocco preventivo.

7. **Mock data:** aggiornare `buildMockKnockoutPredictions` per
   riflettere il modello reale (con riferimenti a bracket topology).

8. **Smoke test:** probe PATCH manuale → save in browser → conferma.

### Cose ancora aperte con Cipo (non bloccanti)

- Cipo si è offerto di "vedere se c'è un modo di lookup tra le righe"
  in Airtable. **Risposta da dare a Cipo** (da inviare domani):
  "Non serve, gestiamo tutto frontend. Grazie!" — così non perde
  tempo per nulla. ✅ Roberto ha confermato il testo.
- Eventuali precisazioni che Cipo potrebbe aggiungere dopo aver letto
  la risposta. Non bloccanti — lo slice #3 può iniziare anche prima.

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
contro Airtable reale).

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
