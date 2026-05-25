# HANDOFF.md — Toto Mondiale

**Stato al 2026-05-25** — bootstrap iniziale del progetto.

## Stato git

- **Branch:** `main`
- **Ultimo commit:** vedi `git log --oneline -n 1` (questo file è incluso
  nel commit di bootstrap, quindi l'hash non è prevedibile a priori).
- **Working tree:** clean dopo il commit di bootstrap.

## Step completati

- **Bootstrap** (commit di bootstrap) — scaffold completo del progetto:
  Next.js 14 App Router + TS + Tailwind + Zod, layer Airtable, prima
  vertical slice (Group Match Predictions) funzionante su mock data,
  placeholder read-only per Group Order e Knockout, README e meta-file.

## Step in corso

Nessuno. Lo scaffold gira (`npm run build`, `npm run typecheck`, smoke
test SSR via curl su tutte e 6 le route → 200/307). In attesa di:

- Schema Airtable reale (Base ID, table IDs `tblXXXX`, field names, esempio
  di record JSON per Group Match Predictions).

## Step pending (in ordine)

1. **Connettere Airtable reale**
   - Sostituire i placeholder in `lib/airtable/config.ts` con i nomi/ID
     veri (vedi sezione "Switching from mock to real Airtable" nel README).
   - Aggiungere un Rollup field "Prediction Set ID" sulle tre tabelle di
     pronostico per abilitare il `filterByFormula` server-side (vedi
     `lib/airtable/groupMatchPredictions.ts` → TODO sopra `listAllRecords`).
   - Riempire `.env.local`.
   - Smoke test contro il base reale.

2. **Vertical slice #2 — Group Order Predictions**
   - Domain type + service già pronti (`fetchGroupOrderPredictions`,
     `updateGroupOrderPredictionsBatch`).
   - Zod schema già pronto con `superRefine` che blocca rank duplicati
     nello stesso gruppo.
   - Da fare: editing UI (`GroupOrderTable.tsx` → versione client con
     dirty tracking analogo a `MatchPredictionTable`), Server Action
     analoga a `saveGroupMatchPredictions`, check duplicate-rank anche
     lato client prima del save.
   - ⚠️ Punto delicato: la UX della scelta rank (select 1-4? drag&drop?).
     Da concordare con l'utente prima di scrivere il componente.

3. **Vertical slice #3 — Knockout Predictions**
   - In attesa di chiarezza sulla struttura definitiva del knockout
     (32 righe = 16 R32 + 8 R16 + 4 QF + 2 SF + 1 F + 1 3rd place,
     coerente con formato FIFA 48 squadre, ma da confermare).
   - Da fare: design del componente per scegliere il vincitore di ogni
     tie (dropdown delle due candidate team, oppure pulsanti).

4. **Hardening dopo le 3 slice**
   - Test unitari sui mapper (vitest)
   - Eventuale switch da fetch in-memory a `filterByFormula`
   - Pagine 404/500 custom
   - Considerare caching server-side per le tabelle Teams/Players (rare
     modifiche, lookup frequenti)

## Decisioni di design non ovvie

Per il dettaglio completo vedi `DECISIONS.md`. Le più importanti:

- **Server Actions** per le mutation (no Route Handlers `/app/api`)
- **`fetch` nativo** verso Airtable (no SDK `airtable` npm)
- **In-memory filter** invece di `filterByFormula` per il primo MVP
  (Airtable non sa filtrare per record ID di un linked field senza un
  rollup ausiliario)
- **Partial-failure handling**: righe ok diventano verdi, righe ko
  restano rosse e preservano l'input dell'utente
- **Mock data fallback** quando `AIRTABLE_API_TOKEN`/`AIRTABLE_BASE_ID`
  non sono settate — l'app è usabile dal minuto zero senza credenziali
- **12 gruppi × 4 squadre** nei mock (formato FIFA 48 squadre WC2026)
- **Batch chunk size = 10** (limite hard del PATCH Airtable)
- **Single save button**, no autosave per cella (richiesta esplicita)

## Workflow concordato con l'utente

- Italiano nelle conversazioni, inglese nei commit message
- Identità git: Roberto Novara / robnovara@gmail.com (global già a posto)
- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` nei commit
  generati da Claude
- Una vertical slice alla volta, end-to-end (types → service → UI →
  page → smoke test)
- HANDOFF aggiornato a fine step, nello stesso commit del codice
- Nessun auth/backup/payment/admin/permissions in MVP
- Mai esporre token Airtable al client
- Diff preview obbligatoria per modifiche all'adapter Airtable

## Come verificare lo stato verde

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run build        # next build → 5/5 static pages OK
```

Smoke test runtime:

```bash
npm run dev &
sleep 5
curl -sI http://localhost:3000/                                    # 307 → /dashboard
curl -sI http://localhost:3000/dashboard                           # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000      # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/group-matches  # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/group-order    # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/knockout       # 200
pkill -f "next dev"
```

## File da leggere per riprendere il filo (in ordine)

1. `~/.claude/CLAUDE.md` — istruzioni globali Roberto
2. `./CLAUDE.md` — istruzioni specifiche del progetto
3. `./HANDOFF.md` — questo file (stato corrente)
4. `./DECISIONS.md` — perché le scelte architetturali
5. `./ANTIPATTERNS.md` — cosa non fare
6. `./VOCABULARY.md` — terminologia di dominio
7. `./CONTEXT.md` — contesto del progetto e roadmap
8. `./README.md` — istruzioni operative (env, struttura, run)
9. `git log --oneline -n 5` + `git status`
