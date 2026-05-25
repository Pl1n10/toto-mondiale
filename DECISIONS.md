# DECISIONS.md — Toto Mondiale

Decisioni architetturali e di prodotto, con motivazione.
Append-only: nuove decisioni vanno in fondo, non si modifica/rimuove
una decisione passata (eventualmente la si supera con una nuova entry
che cita esplicitamente quella deprecata).

---

## D-001 — Custom frontend invece di Glide / Softr

**Data:** 2026-05-25
**Stato:** accettata

Glide e Softr sono no-code/low-code, con limiti reali su UX custom
(tabelle compatte stile Excel) e su come si integra il flusso di
pronostico. Il backend Airtable resta perché è già popolato dalle
Automation che generano le righe.

**Implicazioni:**
- Serve un layer server (Next.js) che proxa Airtable e nasconde il token
- Lo schema Airtable diventa contratto stabile con cui il frontend
  dialoga; centralizzato in `lib/airtable/config.ts`

---

## D-002 — Stack: Next.js 14 App Router + TypeScript + Tailwind + Zod

**Data:** 2026-05-25
**Stato:** accettata

- **Next.js App Router**: server components per le fetch, server actions
  per le mutation, niente API client per Airtable
- **TS strict**: contratti type-safe tra UI / actions / service / mappers
- **Tailwind puro**: niente UI kit (shadcn/ui) per ora — la UI è
  essenzialmente tabelle, non serve un sistema di componenti complesso
- **Zod**: validation runtime delle payload sia client-side che
  server-side dentro le server actions

---

## D-003 — Server Actions invece di Route Handlers

**Data:** 2026-05-25
**Stato:** accettata

Le mutation passano da `'use server'` colocate con la page
(`app/.../actions.ts`), non da `/app/api/...`. Motivi:

- Tipi end-to-end senza definire DTO HTTP (input e output sono `unknown`
  fino al confine Zod, poi `BatchUpdateResult<T>`)
- Niente serializzazione manuale, niente `fetch` lato client
- `revalidatePath` integrato nel flow

Route Handlers restano un'opzione per quando servirà esporre l'API a un
client esterno (es. mobile app).

---

## D-004 — `fetch` nativo, non SDK `airtable` npm

**Data:** 2026-05-25
**Stato:** accettata

- Nessuna dipendenza in più
- Controllo esplicito su paginazione (`offset`), chunking del PATCH,
  errori HTTP
- Più semplice fare retry/timeout custom se serviranno

**Trade-off accettato:** dobbiamo gestire noi il loop di paginazione
(fatto in `lib/airtable/client.ts → listAllRecords`).

---

## D-005 — Centralizzare i nomi di campo Airtable in un solo file

**Data:** 2026-05-25
**Stato:** accettata

Tutti i nomi tabella e campo vivono in `lib/airtable/config.ts`. Quando
Airtable rinomina un campo, si cambia una sola riga di codice.

**Convenzione:**

```ts
export const GROUP_MATCH_PREDICTION_FIELDS = {
  predictedHomeScore: 'Predicted Home Score',  // key stabile interna : value = nome reale Airtable
  ...
} as const;

export const GROUP_MATCH_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  GROUP_MATCH_PREDICTION_FIELDS.predictedHomeScore,
  GROUP_MATCH_PREDICTION_FIELDS.predictedAwayScore,
];
```

Il service layer **strippa** dal payload PATCH ogni campo che non è
nella lista writable (defense-in-depth contro errori di sviluppatore).

---

## D-006 — `TableConfig` con `logicalName` + `tableId` opzionale

**Data:** 2026-05-25
**Stato:** accettata

Il config supporta sia il nome leggibile sia il `tblXXXXXXXXXXXXXX`.
Preferiamo `tableId` quando è noto perché sopravvive ai rinomini in
Airtable; il `logicalName` resta come fallback / readability.

`tableRef(key)` risolve a `tableId ?? logicalName`.

---

## D-007 — In-memory filter per `predictionSetId`, non `filterByFormula`

**Data:** 2026-05-25
**Stato:** accettata (temporanea, vedi D-007-bis quando applicata)

Airtable `filterByFormula` non può filtrare direttamente per record ID
di un linked field. La soluzione standard è aggiungere un Rollup o
Formula field che esponga gli ID linkati, poi filtrare per quello.

**Per il primo MVP** fetch all + filter in memory: con 72 righe per
tabella e basso numero di prediction set in dev, l'overhead è
trascurabile. TODO marcato in
`lib/airtable/groupMatchPredictions.ts`.

**Trigger per passare alla versione finale:** > ~1000 record per
tabella, oppure quando aggiungiamo il rollup field in Airtable.

---

## D-008 — Mock data fallback quando env Airtable non sono settate

**Data:** 2026-05-25
**Stato:** accettata

Se `AIRTABLE_API_TOKEN` o `AIRTABLE_BASE_ID` mancano, il service layer
usa `lib/airtable/mockData.ts` (in-memory store). Vantaggi:

- Si lavora alla UI anche senza credenziali Airtable
- Il dashboard mostra un banner ambra che ricorda che è in mock mode
- La mock store persiste in-process: i salvataggi si vedono finché il
  dev server non riparte (utile per testare il dirty/saved flow)

**NON è un sistema di test.** Per i test useremo un service in-memory
isolato con fixture deterministiche.

---

## D-009 — Mock formato FIFA 48 squadre (WC2026): 12 gruppi × 4 squadre

**Data:** 2026-05-25
**Stato:** accettata

I conteggi citati nel prompt iniziale tornano solo col formato 48
squadre:

- 12 gruppi × 6 partite per gruppo = **72** group match predictions ✓
- 12 gruppi × 4 squadre = **48** group order predictions ✓
- 16 R32 + 8 R16 + 4 QF + 2 SF + 1 F + 1 3rd place = **32** knockout ✓

I mock data riflettono questo formato. **Da confermare** quando avremo
lo schema Airtable reale.

---

## D-010 — Batch chunk size = 10

**Data:** 2026-05-25
**Stato:** accettata (limite hard Airtable)

`updateRecordsInBatches` spezza la lista degli update in chunk di 10
perché è il massimo accettato dal `PATCH` Airtable in una singola
chiamata. Non configurabile.

---

## D-011 — Partial-failure handling (opzione B)

**Data:** 2026-05-25
**Stato:** accettata

Se un chunk del PATCH fallisce, gli altri chunk continuano. La UI
distingue righe ok (verde) da righe fallite (rosse), preservando
sempre l'input dell'utente. Niente rollback ottimistico globale.

**Motivazione:** in un editor stile foglio di calcolo, perdere i
valori già inseriti perché un singolo update è andato male è il peggior
fallimento UX possibile.

---

## D-012 — Single save button, no autosave

**Data:** 2026-05-25
**Stato:** accettata (richiesta esplicita Roberto)

Niente autosave per cella o per blur. Un solo bottone "Save predictions"
in fondo alla pagina, con contatore "X rows modified". La UX si avvicina
all'editing di un foglio Excel.

**Da rivalutare in futuro** se la latenza percepita o il rischio di
"perdere modifiche" diventano un problema.

---

## D-013 — Per-row state machine: clean → dirty → saving → saved/error

**Data:** 2026-05-25
**Stato:** accettata

Stati visualizzati come dot colorato a sinistra di ogni riga:

- `clean` — niente dot (input == ultimo valore noto dal server)
- `dirty` — dot ambra (utente ha modificato, non ancora salvato)
- `saving` — dot blu pulsante (PATCH in corso)
- `saved` — dot verde (PATCH OK, server state aggiornato)
- `error` — dot rosso, bordo input rosso, errore in tooltip

Tornare al valore del server fa tornare `clean` (transizioni reversibili).

---

## D-014 — npm, non pnpm né yarn

**Data:** 2026-05-25
**Stato:** accettata

Già installato sulla devbox di Roberto (npm 11.11.0). Nessun beneficio
chiaro nel cambiarlo per questo progetto.
