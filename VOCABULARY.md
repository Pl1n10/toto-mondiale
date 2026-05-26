# VOCABULARY.md — Toto Mondiale

Glossario dei termini di dominio e tecnici usati nel codice e nella
documentazione. Quando un concetto è ambiguo nel parlare, **prevale
il nome qui sotto**.

## Termini di dominio

### Prediction Set
La "schedina" di un utente: un singolo set di pronostici per l'intero
torneo. Riga in Airtable nella tabella `Prediction Sets`. Identificata
da `recXXXXXXXXXXXXXX` (Airtable record ID). Linkata a tutte le righe
di pronostico (Group Match / Group Order / Knockout / Winner / Top Scorer)
che le appartengono.

### Group Match (≠ Group Match Prediction)
La **partita reale** di un girone, condivisa fra tutti gli utenti
(es. "Italia – Argentina, Girone A, partita 1"). Tabella Airtable
`Group Matches`. **Non viene mai creata dal frontend**: vive nel calendario
del torneo.

### Group Match Prediction
La **riga di pronostico di un utente** per uno specifico Group Match.
Una riga `Group Match Predictions` linkata a un `Prediction Set` e a un
`Group Match`, con un solo campo writable: `Predicted Result`, single
select con valori `1` / `X` / `2` (Totocalcio: home / draw / away).
NON è un pronostico di risultato esatto (vedi D-015).

### Group Order Prediction
La riga di pronostico di **un utente** per il rank finale di **una
squadra** in un girone. Una riga per ogni (Prediction Set × Team). Campo
writable: `Predicted Rank` (1–4). Vincolo logico: nessun rank duplicato
nello stesso girone.

### Knockout Prediction
La riga di pronostico per uno **slot** del tabellone a eliminazione
diretta. Le 32 righe (formato 48 squadre) coprono i 6 round, in
Airtable identificati con queste **label esatte** del single-select
`Phase` (vedi `KNOCKOUT_ROUND_LABELS` in `config.ts`):

| Label Airtable | Italiano | Slot |
|---|---|---|
| `01 - Round of 32` | Ottavi (32 squadre)   | 16 |
| `02 - Round of 16` | Sedicesimi finalisti  | 8 |
| `03 - Quarter Final` | Quarti              | 4 |
| `04 - Semi Final`    | Semifinali          | 2 |
| `05 - Third Place`   | Finale 3°-4° posto  | 1 |
| `06 - Final`         | Finale              | 1 |

Campo writable: `Predicted Winner` (linked → Teams). I round successivi
al R32 si compongono in cascata dalle scelte utente sui round
precedenti — **dettaglio implementativo bloccato in attesa di Cipo**,
vedi `AIRTABLE_INFO_KNOCKOUT.md`.

### Team
Una nazionale partecipante. Tabella Airtable `Teams`. Linkata da
`Group Matches`, `Group Order Predictions`, `Knockout Predictions`.

### Player
Un calciatore, usato per il pronostico "Top Scorer". Tabella `Players`.
Linkato da `Prediction Sets.Predicted Top Scorer`.

### User
L'umano che possiede uno o più Prediction Set. In MVP non c'è auth, si
finge ci sia un solo utente identificato dal `DEBUG_PREDICTION_SET_ID`.

---

## Termini tecnici del codice

### Adapter / Service layer
`lib/airtable/*`. È il **solo** posto del codebase che conosce i nomi dei
campi Airtable. Espone funzioni `fetchX(...)` e `updateXBatch(...)` che
parlano la lingua del domain layer.

### Domain object
Oggetto TypeScript normalizzato definito in `types/domain.ts`. È quello
che UI components e server actions vedono. Mai il raw `AirtableRecord`.

### Mapper
Funzione `mapXxx(record)` in `lib/airtable/mappers.ts` che traduce
`AirtableRecord` → domain object. Punto unico in cui i nomi-stringa dei
campi entrano nel mondo TypeScript.

### Mock data fallback
`lib/airtable/mockData.ts` + le `mockStore` nei file per-tabella. Quando
le env Airtable non sono settate, l'app gira con dati finti in-memory che
persistono nel processo del dev server. **Non è un sistema di test**.

### Writable / Read-only field
Campo Airtable che il frontend **può** PATCHare (es. `Predicted Result`)
vs quello che può solo leggere (lookup, formula, autonumber). Le liste
`*_WRITABLE_FIELDS` in `config.ts` sono autoritarie; il service strippa
difensivamente tutto ciò che non è in lista.

### Batch update / Chunking
Una "save" può contenere N update. Il client Airtable spezza in chunk di
10 (limite hard del PATCH endpoint) e riporta i risultati per chunk.

### Partial failure
Quando un chunk fallisce e gli altri no. Il `BatchUpdateResult<T>`
restituisce `successIds`, `updated[]`, `failures[]` separati. La UI
mostra successi e fallimenti distinti.

### Dirty / Saving / Saved / Error / Clean (row state)
Macchina a stati per riga nella tabella editabile (`MatchPredictionTable`):

- **clean** — input == ultimo valore salvato sul server
- **dirty** — utente ha modificato, non ancora salvato (dot ambra)
- **saving** — PATCH in volo (dot blu pulsante)
- **saved** — PATCH OK (dot verde, bordo verde)
- **error** — PATCH fallito o input invalido (dot rosso, bordo rosso)

Tornare al valore del server fa tornare a **clean** (transizioni reversibili).

### Vertical slice
Un pezzo di funzionalità end-to-end (types → service → validation →
server action → UI → page → smoke test) per UNA delle tre famiglie di
pronostico. Si fa una slice alla volta.

### `DEBUG_PREDICTION_SET_ID`
Env var con un record ID di Prediction Set da usare in sviluppo.
Sostituisce la mancanza di auth: il dashboard punta direttamente lì.
In assenza, il dashboard usa un ID fittizio (`recDebugMock000`).

### Server Action
Funzione marcata `'use server'` che gira sul server Next.js. È il
**solo modo** in cui il browser comanda mutation. Validazione Zod
obbligatoria all'ingresso.

### `tableRef(key)`
Funzione di `config.ts` che restituisce la stringa da mettere nell'URL
Airtable: preferisce `tableId` (`tblXXXX`) se presente, altrimenti
`logicalName`. Permette di passare da nomi a ID senza toccare i service.

---

## Convenzioni di naming

- **Nomi file:** `kebab-case` per route folders, `camelCase.ts` per
  lib/types, `PascalCase.tsx` per componenti React.
- **Tipi domain:** singolare PascalCase (`GroupMatchPrediction`).
  Update payload: `<Tipo>Update`.
- **Service functions:** `fetchXxx(...)`, `updateXxxBatch(...)`,
  `createXxx(...)` (futuro).
- **Server actions:** `saveXxx(...)`, `<verbo>Xxx(...)`.
- **Schemi Zod:** `xxxSchema`, `xxxBatchSchema`.

## Convenzioni di linguaggio

- **Conversazione:** italiano
- **Codice, identificatori, commenti, commit message:** inglese
- **Documentazione (`*.md`):** italiano è OK per `HANDOFF`, `DECISIONS`,
  `CONTEXT`; inglese per `README` (per future contributor non-italiani)
