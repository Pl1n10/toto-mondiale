# HANDOFF.md — Toto Mondiale

**Stato al 2026-05-25 sera** — sessione 2: in attesa di info Airtable dal
referente che cura la base (Cipo).

## Stato git

- **Branch:** `main`
- **Ultimo commit:** `fc84d0a` "Bootstrap Next.js frontend with Airtable adapter"
- **Working tree:** sarà clean dopo il commit che chiude questa sessione
  (HANDOFF.md aggiornato + AIRTABLE_INFO.md aggiunto al repo).
- **Remote:** nessuno ancora. Quando ci sarà Gitea/GitHub, `remote add origin`.

## Step completati

- **fc84d0a — Bootstrap**: scaffold Next.js + Airtable adapter + slice #1
  (Group Match Predictions) funzionante su mock data + meta-file
  (CLAUDE / HANDOFF / DECISIONS / CONTEXT / ANTIPATTERNS / VOCABULARY).
- **Sessione 2 (questo commit)**: redazione e invio della richiesta info
  Airtable a Cipo (`AIRTABLE_INFO.md`). Raccolta parziale di info.

## Step in corso

**Connettere il frontend alla base Airtable reale.** Aspettiamo che Cipo
compili e rimandi `AIRTABLE_INFO.md`. Non si può procedere col codice
finché non arrivano almeno: token, table IDs, field names reali, un
record JSON di esempio.

## Info Airtable già raccolte (parziali)

Tieni queste a mano per la prossima sessione, non sono ancora in
`.env.local` né in `config.ts`:

| Cosa | Valore | Fonte |
|---|---|---|
| `AIRTABLE_BASE_ID` | `appPV77eshDFrfgII` | URL di una tabella mostrato da Roberto in sessione 2 |
| Table ID di **una** tabella (identità ancora da confermare) | `tblqsGL0EJvfSlrgD` | Stesso URL — Roberto deve dirmi a quale tabella corrisponde |
| Numero di Prediction Set di test già pronti | 4 | Cipo ha confermato, ne pulirà i campi così la UI vede righe vuote |

## Info Airtable ancora da raccogliere (in attesa di Cipo)

Tutta la sezione A–G di `AIRTABLE_INFO.md`:

- [ ] Personal Access Token (su canale privato, mai in chat / mai nel repo)
- [ ] `DEBUG_PREDICTION_SET_ID` (uno dei 4 prediction set già pronti)
- [ ] 8 Table IDs (B compilata? abbiamo solo 1 su 8)
- [ ] Field names reali per le 8 tabelle (solo quelli ≠ placeholder)
- [ ] Risposte alle 3 domande critiche:
  - tipo dei campi score (Number integer? oppure text → typecast)
  - modello knockout: candidate fisse o computate
  - `Prediction no.` ha davvero il `.` finale?
- [ ] Almeno **un** record JSON di esempio (Group Match Predictions)
- [ ] Sì/no agli helper field per server-side filtering
- [ ] Nome esatto del campo `Played` su `Group Matches` + altri campi
      amministrativi che il frontend deve **leggere ma non scrivere**
      (es. `Actual Home/Away Score`, `Points Earned`, …)

## Chiarimenti già acquisiti da Cipo

Da memorizzare nel modello mentale:

- **Creazione di User e Prediction Set** resta manuale su Airtable
  (no signup dal frontend, no auth nell'MVP).
- L'**Automation Airtable** genera le 72+48+32 righe figlie
  **automaticamente** alla creazione di un Prediction Set: nessun
  trigger esplicito richiesto.
- Esiste un campo `Played` (checkbox, su `Group Matches`) che chi
  cura il toto setta a true quando la partita è stata giocata. Serve
  al calcolo punti su Airtable. **Il frontend MVP non lo legge né lo
  scrive.**
- Cipo ha 4 Prediction Sets di test già pronti; ne pulirà i campi
  perché la UI mostri righe vuote da compilare.

## Scelta UX in sospeso (decidere dopo l'integrazione Airtable)

**Una volta che `Played === true` per una partita, l'utente deve ancora
poter modificare la sua predizione su quella partita?**

- **Opzione A (anti-bara):** riga read-only, mostra il risultato vero
  a fianco. Richiede di leggere `Played` + `Actual Home/Away Score` da
  `Group Matches` via lookup.
- **Opzione B (status quo MVP):** sempre editabile. Lock solo a livello
  schedina via `Group Predictions Locked?`.

Default attuale: B (non leggiamo `Played`). Decisione Roberto da prendere
quando avremo gli helper field e potremo valutare il costo di A.

## Step pending (in ordine)

1. **Ricevere `AIRTABLE_INFO.md` compilato da Cipo + token su canale privato**
   - Roberto mette token + `AIRTABLE_BASE_ID` + `DEBUG_PREDICTION_SET_ID`
     in `.env.local` sulla devbox
   - Roberto mi gira il file compilato

2. **Update `lib/airtable/config.ts`** con i valori reali
   - sostituisco i `VALUE` dei `*_FIELDS`
   - popolo i `tableId` dei `TableConfig`
   - eventuali aggiustamenti al mapper se il JSON di esempio rivela tipi
     non previsti (es. lookup che ritorna array invece di scalare)
   - se i campi score sono text e non Number → `typecast: true` nel batch
   - aggiungo i campi amministrativi alla **read-only list** (mai writable)

3. **(Opzionale, se Cipo ha creato gli helper field)** switch dei 3
   service da `listAll + filter in-memory` a `filterByFormula` su
   `{Prediction Set ID}`. Annoto come D-007-bis in `DECISIONS.md`.

4. **Smoke test contro la base reale**
   - 72 righe caricate, ordine corretto, nomi squadre giusti
   - edit + save di 2-3 score, verifica scrittura su Airtable
   - test errore: score 999 → verifico errore lato server

5. **Commit "Real Airtable connection"** con: codice + HANDOFF + DECISIONS
   aggiornati. Tolgo "Connettere Airtable reale" dai pending.

6. **Decisione su UX Played**: A o B (vedi sopra). Se A → codice
   aggiuntivo nel mapper e nel componente.

7. **Vertical slice #2 — Group Order Predictions** (editing UI con
   duplicate-rank check). Prima ti chiedo come vuoi la scelta del rank
   (dropdown 1–4 / drag&drop / input numerico free).

8. **Vertical slice #3 — Knockout Predictions** quando avremo chiarezza
   sul modello candidate (vedi domanda critica D.4 della checklist).

## Decisioni di design non ovvie

Per il dettaglio completo vedi `DECISIONS.md`. Da quella lista, le più
rilevanti per il lavoro di domani:

- **D-005**: nomi campo Airtable solo in `config.ts`. Quando aggiorni
  `config.ts` con i valori reali, NON sparpagliare i nomi altrove.
- **D-007**: in-memory filter per `predictionSetId`. Da promuovere a
  D-007-bis se passiamo a `filterByFormula` (richiede helper field).
- **D-010**: chunk size 10. Non toccare.
- **D-011**: partial-failure handling. Non toccare.

## Workflow concordato con l'utente

- Italiano nelle conversazioni, inglese nei commit message
- Identità git: Roberto Novara / robnovara@gmail.com
- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` nei commit
- Una vertical slice alla volta, end-to-end
- HANDOFF aggiornato a fine step / fine sessione, nello stesso commit
- Mai esporre token Airtable al client
- Diff preview obbligatoria per modifiche all'adapter Airtable
- Token Airtable mai in chat, mai nel repo — solo `.env.local` sulla
  devbox o canali privati

## Come verificare lo stato verde

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run build        # next build → 5/5 static pages OK
```

Smoke test runtime (su mock data, l'app gira anche senza Airtable):

```bash
npm run dev &
sleep 5
curl -sI http://localhost:3000/                                              # 307 → /dashboard
curl -sI http://localhost:3000/dashboard                                     # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000                # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/group-matches  # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/group-order    # 200
curl -sI http://localhost:3000/prediction-set/recDebugMock000/knockout       # 200
pkill -f "next dev"
```

Tutto dovrebbe restare verde anche domani (nessun codice toccato in
questa sessione).

## File rilevanti per chi riapre la sessione

In ordine di lettura suggerito:

1. `~/.claude/CLAUDE.md` — istruzioni globali Roberto
2. `./CLAUDE.md` — istruzioni specifiche del progetto
3. `./HANDOFF.md` — **questo file** (stato corrente)
4. `./AIRTABLE_INFO.md` — la richiesta info inviata a Cipo, vedi se
   nel frattempo è arrivata la versione compilata
5. `./DECISIONS.md` se servono motivazioni delle scelte
6. `./ANTIPATTERNS.md` se stai per toccare l'adapter o la save flow
7. `git log --oneline -n 5` + `git status`
