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

**Blocker esterno:** servono due risposte da Cipo prima di scrivere
codice. Domanda completa in **`AIRTABLE_INFO_KNOCKOUT.md`** (testo già
mandato a Cipo a fine sessione 4):

1. In che modalità sono pensate le candidate dei round post-R32
   (`Predicted Team A` / `Predicted Team B`)? Lookup auto, frontend
   in cascata, o admin manuale?
2. Qual è il **tipo Airtable** esatto dei due campi su
   `10. Knockout Predictions` (lookup vs linked record)?

**Quattro casi pre-pianificati** in `AIRTABLE_INFO_KNOCKOUT.md` →
sezione "Piano in base alla risposta — pronto da eseguire":

- **Caso A** (lookup automatici): solo PATCH `Predicted Winner`,
  sblocco progressivo dei round.
- **Caso B** (frontend gestisce cascata) — più probabile: definire
  `lib/knockout/bracketTopology.ts`, propagazione client-side,
  PATCH include anche `Predicted Team A/B`.
- **Caso C** (admin manuale): identico a Caso A operativamente,
  discutere se ha senso lanciare in queste condizioni.
- **Caso D** (Cipo non ha deciso): default = Caso B.

Quando la risposta arriva, **prima cosa** da fare:

```bash
# Verifica diretta del tipo dei campi (richiede schema.bases:read sul PAT)
set -a && . ./.env.local && set +a
python3 - <<'PY'
import json, os, urllib.request
url = f"https://api.airtable.com/v0/meta/bases/{os.environ['AIRTABLE_BASE_ID']}/tables"
req = urllib.request.Request(url, headers={'Authorization': f"Bearer {os.environ['AIRTABLE_API_TOKEN']}"})
data = json.loads(urllib.request.urlopen(req).read())
for t in data.get('tables', []):
    if 'Knockout Predictions' in t['name']:
        for f in t['fields']:
            if 'Predicted Team' in f['name']:
                print(f['name'], '->', f['type'])
PY
```

Se il probe risponde 403 → chiedere a Cipo a parole, scope mancante.

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
