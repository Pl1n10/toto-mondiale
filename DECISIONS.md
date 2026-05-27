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

---

## D-015 — Group Match Predictions: pronostico segno 1/X/2, non risultato esatto

**Data:** 2026-05-26
**Stato:** accettata (supersede l'ipotesi iniziale "Predicted Home/Away
Score" della scaffolding originaria)

Il JSON di esempio inviato da Cipo (`AIRTABLE_INFO (1).md`, sezione E)
dimostra che la tabella `Group Match Predictions` **non** contiene
`Predicted Home Score` / `Predicted Away Score`. L'unico campo
writable è `Predicted Result`, single select con valori `"1"`, `"X"`,
`"2"` (stile Totocalcio).

**Implicazioni applicate in questo commit:**

- `types/domain.GroupMatchPrediction` → `predictedResult: '1' | 'X' | '2' | null`
  (rimossi `predictedHomeScore` / `predictedAwayScore`)
- `lib/airtable/config.GROUP_MATCH_PREDICTION_FIELDS.predictedResult`
  → `'Predicted Result'`. Rimossi i due campi score, aggiunti
  campi read-only (`Real Result`, `Match Status`, `Points Earned`).
- `WRITABLE_FIELDS` contiene solo `Predicted Result`. PATCH defense-in-depth
  invariato.
- `MatchPredictionTable.tsx` → 3 bottoni pillola `1 / X / 2` per riga,
  niente più due input numerici. Stato `dirty/saved/error` invariato.
- Mock data: `predictedResult: null` iniziale.

**Fix nomi squadra applicato (opzione 2 — enrichment server-side):**

`Home Team` / `Away Team` / `Group` su `Group Match Predictions` sono
lookup che ritornano array di record ID. La risoluzione id → nome
avviene dentro `fetchGroupMatchPredictions`:

1. Fetch di `Teams` (`Team Name`) e `Groups` (`Group Name`) in
   parallelo al fetch dei pronostici (Promise.all).
2. Costruzione di `Map<recordId, name>` per ciascuno.
3. Sostituzione in-place dei campi `homeTeamName` / `awayTeamName` /
   `group` quando il valore matcha `/^rec[A-Za-z0-9]+$/`.

Costo: ~60 record extra per ogni fetch (48 Teams + 12 Groups).
Trascurabile. Cache HTTP `no-store` resta in vigore — se servirà
caching aggressivo, futura ottimizzazione.

Scartata l'**opzione 1** (chiedere a Cipo di creare i lookup
`Home Team Name`) perché self-contained server-side ha zero round-trip
con Cipo e funziona indipendentemente da modifiche dello schema.

---

## D-016 — Group Order Predictions: `Predicted Rank` text, PATCH come stringa

**Data:** 2026-05-26 (revisionata in sessione 4 dopo probe empirico)
**Stato:** accettata

Il JSON di Cipo mostra `"Predicted Rank": "2"` (stringa). In Airtable
il campo è **single-line text**, non Number Integer.

**Scoperta empirica:** `typecast: true` su Airtable coerce
string-to-target, **NON** integer-to-text. Un PATCH con
`{"Predicted Rank": 1, typecast: true}` su un campo single-line text
ritorna `422 Unprocessable Entity`. Verificato sul record
`rec0I3MhRApEzhCQQ` durante l'integrazione dello slice #2.

**Soluzione applicata:**
- domain TS mantiene `predictedRank: number | null` (più type-safe per
  la logica 1..4)
- mapper accetta sia number che numeric-string (`asIntegerOrNull`)
- il **service** converte a stringa via `String(u.predictedRank)`
  prima del PATCH
- `typecast` rimosso dalla chiamata `updateRecordsInBatches` su
  Group Order Predictions: non serve e nasconderebbe altri errori
  di tipo

**Se in futuro Cipo cambia il campo a Number Integer:** semplice fix
nel service rimuovendo lo `String(...)` (un solo punto da toccare).

---

## D-017 — Knockout Predictions: naming Airtable allineato al modello "passa chi"

**Data:** 2026-05-26
**Stato:** accettata (supersede i placeholder iniziali di
`KNOCKOUT_PREDICTION_FIELDS`)

Dal documento compilato da Cipo (sezione D.4) emerge che il modello
knockout è "scelta chi passa" sul tabellone, non "indovino la
composizione". Gli accoppiamenti Round-of-32 sono fissi (admin), poi
ogni utente sceglie quale dei due Team passa al turno successivo.

**Naming allineato in `lib/airtable/config.ts`:**

| Key TS interna | Airtable (prima) | Airtable (ora) |
|---|---|---|
| `round` | `Round` | `Phase` (lookup) |
| `slot` | `Slot` | `Match Number` (lookup) |
| `candidateTeam1` | `Candidate Team 1` | `Real Team A` |
| `candidateTeam2` | `Candidate Team 2` | `Real Team B` |
| `candidateTeam1Name` | `Candidate Team 1 Name` | `Predicted Team A` |
| `candidateTeam2Name` | `Candidate Team 2 Name` | `Predicted Team B` |
| `predictedWinner` | `Predicted Winner` | `Predicted Winner` (invariato) |
| `predictedWinnerName` | `Predicted Winner Name` | (rimosso — non esiste in Airtable) |
| (nuovo) `knockoutMatch` | — | `Knockout Match` |
| (nuovo) `realWinner` | — | `Real Winner` |
| (nuovo) `matchStatus` | — | `Match Status` |
| (nuovo) `pointsEarned` | — | `Points Earned` |

Aggiunta anche la tabella `9. Knockout Matches` (`tbl9IUt0116lvkbki`)
e relativa map `KNOCKOUT_MATCH_FIELDS`. La semantica esatta del
campo `Predicted Team A/B` (lookup verso quale source?) è da
chiarire quando implementeremo lo slice #3.

Slice #3 è ancora placeholder UI, quindi questo refactor non rompe
nulla a livello applicazione.

---

## D-019 — Token PAT richiede sia `data.records:read` sia `data.records:write`

**Data:** 2026-05-26
**Stato:** osservazione operativa

Smoke test runtime sessione 3: il PATCH su Airtable falliva
sistematicamente con `403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`
nonostante:

- field name corretti
- payload ben formato
- base ID corretto
- read (GET) funzionante con lo stesso token

Causa: il token PAT generato da Cipo aveva solo
`data.records:read`. Il messaggio Airtable per scope mancante è
identico a quello per "base non condivisa" o "tabella inesistente",
quindi il debug si è risolto con un probe manuale che ha isolato la
PATCH come unico verbo fallente.

**Documentato qui per future regressioni**: se compare 403 dal save,
la prima ipotesi è scope token (non base ID, non field name).

---

## D-018 — Helper field `Prediction Set ID` come text, non formula

**Data:** 2026-05-26
**Stato:** osservata, non bloccante

Cipo segnala che la formula `RECORD_ID()` su `Prediction Sets` non
glielo lascia salvare. Ha creato `Prediction Set ID` come
single-line text sulle 3 tabelle figlie, ma il valore è
verosimilmente vuoto.

**Conseguenza:** `filterByFormula` server-side per filtrare per
prediction set non funziona oggi. Continuiamo con
[[in-memory filter D-007]] (`listAll + filter`). Da indagare
insieme a Cipo quando ottimizzeremo per più schedine: probabile
problema di permessi del campo formula o di field type selezionato.

---

## D-020 — Bracket topology derivata dai Slot Labels, non hardcodata

**Data:** 2026-05-27
**Stato:** accettata

Il piano iniziale per slice #3 prevedeva una mappa statica
`matchNumber → { slotA, slotB }` in `lib/knockout/bracketTopology.ts`,
scritta a mano per il formato FIFA 48 squadre (es. "vincitore di m74
alimenta slot A di m89").

Il probe Airtable di sessione 5 ha rivelato che ogni record di
`9. Knockout Matches` espone già due campi text **`Slot A Label`** e
**`Slot B Label`** che descrivono la sorgente di ogni slot:

- R32 → label descrittiva ("Winner Group E", "Runner-up Group B",
  "Best 3rd A/B/C/D/F", ...)
- R16 / QF / SF / Final → `Winner Match <N>` per ogni slot
- Third Place match → `Loser Match <N>` per entrambi gli slot

Il parser in `bracketTopology.ts` legge i label nel formato regex
`^(Winner|Loser) Match (\d+)$` e produce la topology al boot del
componente (`useMemo`). Per i R32 i candidate vengono direttamente da
`Knockout Match.Team A/B`; per i round successivi da
`resolveAllCandidates(topology, predictedWinners)`.

**Vantaggi rispetto alla mappa hardcodata:**

1. **Single source of truth.** Se Cipo cambia un accoppiamento in
   Airtable, il frontend si adatta automaticamente — niente deploy.
2. **Robusto alla schema drift.** Il parser fa throw se incontra un
   label che non matcha il regex (es. Cipo per sbaglio scrive
   "winner match 74" minuscolo). Errore precoce ed esplicito invece
   di cascata silenziosamente rotta.
3. **Niente duplicazione.** L'unica fonte è l'Airtable; il TS non
   deve restare in sync con un foglio di carta.
4. **Caso 3°/4° posto è gratis.** La regola FIFA "candidate = i
   loser delle 2 SF" è codificata direttamente nel Slot Label
   (`Loser Match 101` / `Loser Match 102`). Il resolver gestisce
   `outcome: 'loser'` senza casi speciali.

**Trade-off accettato:** runtime di parse a ogni boot client
(banale — 32 record). Se Airtable cambierà drasticamente formato di
label, basta toccare il regex in `bracketTopology.ts`.

---

## D-022 — Lifecycle a 5 stage del torneo + lock per-schedina (read-only frontend)

**Data:** 2026-05-27
**Stato:** accettata (Cipo + Roberto, sessione 5)

Il ciclo di vita di una schedina si articola in 5 stage. Le transizioni
sono guidate da due flag boolean **per ogni** `Prediction Set`:
`Group Predictions Locked?` e `Knockout Predictions Locked?`.

| Stage | Editing gironi | Editing knockout | Visibilità schedine altrui |
|---|---|---|---|
| **1 — Pre-gironi** | ✅ aperto | ❌ struttura visibile ma lockata | solo le proprie |
| **2 — Gironi in corso** (lock #1 ON) | ❌ lockato | ❌ ancora lockata | tutte |
| **3a — Tra gironi e knockout** (admin compila R32) | ❌ lockato | ❌ ancora lockata | tutte |
| **3b — Compila knockout** (admin sblocca knockout) | ❌ lockato | ✅ aperto | solo le proprie |
| **4 — Knockout in corso** (lock #2 ON) | ❌ lockato | ❌ lockato | tutte |
| **5 — Fine torneo** | ❌ lockato | ❌ lockato | tutte + highlight vincitore |

**Implicazioni applicative.**

1. **Il frontend è solo lettore dei flag**, non li scrive mai. Il
   flipping è manuale via Airtable nel primo test (28 maggio 2026); in
   futuro un'Automation Airtable li flipperà automaticamente in base
   ai timestamp delle partite. Da parte nostra cambia nulla: leggiamo
   sempre il valore corrente per ogni `Prediction Set`.
2. **Lock per-schedina, non globale.** Ogni utente può potenzialmente
   essere in uno stage diverso da un altro (anche se nella pratica
   l'Automation li flipperà tutti insieme).
3. **L'utente non edita mai durante una partita** → la decisione
   pendente sull'UX "Played" (singola row read-only se
   `Match Status = Played`) **decade**: coperta dal lock globale di
   stage. Niente soft-lock per partita.
4. **Visibility model dipende dallo stage**: durante stage di editing
   (1 e 3b) l'utente vede solo le proprie schedine; durante stage
   lockati (2, 3a, 4, 5) vede tutte. Prerequisito hard:
   [[auth-scoping-per-user]] (oggi `DEBUG_PREDICTION_SET_ID` finge il
   single-user — bisogna passare a un layer auth vero prima che il
   visibility model abbia senso).
5. **Stage 3a (admin riempie R32)** non richiede UI dedicata da parte
   nostra: Cipo compila i 16 R32 direttamente in Airtable. Quando ha
   finito flippa `Knockout Predictions Locked?` = false e parte lo
   stage 3b.
6. **Stage 5 (fine torneo)**: il "highlight della schedina vincitrice"
   è UX nice-to-have, dipende dal campo `Is Official World Cup Winner?`
   su Teams + score finale. Si vedrà.

**Roadmap di implementazione del lock** (in ordine):

- (a) **Read-only mode lato frontend** quando un flag è `true`: tutti
  i pill diventano `disabled`, la SaveBar è nascosta. È la slice
  minima che serve a Cipo per il test del 28 maggio.
- (b) **Defense-in-depth server-side**: la server action rifiuta
  payload per un Prediction Set lockato (re-fetch del flag prima del
  PATCH). Slice successiva, non prerequisito per (a).
- (c) **Auth + visibility model**: la "vista altrui" da abilitare in
  stage lockati richiede prima auth reale. Slice grande.

**Naming.** Per evitare collisione con il `Phase` del knockout
(R32 / R16 / ...) ci riferiamo al lifecycle come **stage** nel codice
e nelle doc. Vedi VOCABULARY [[tournament-stage]].

---

## D-021 — Knockout UX: cascata invalidata + save check completezza

**Data:** 2026-05-27
**Stato:** accettata (confermata da Roberto in sessione 5)

Tre decisioni UX prese all'avvio di slice #3, tutte implementate in
`components/predictions/KnockoutTable.tsx`.

**1. Cascata invalidata → `null` + dot ambra "scelta da rifare".**

Quando l'utente cambia un winner upstream e una scelta a valle non è
più tra le candidate (= squadra che non gioca più quel match),
`reconcileCascade` azzera quella scelta a valle e marca la riga con
dot ambra (tooltip "Scelta da rifare (upstream cambiato)"). Iterativo:
si propaga finché la cascata stabilizza.

Alternative scartate:
- **Reset silenzioso al nuovo Team A/B**: distrugge l'input utente
  senza segnalarlo, peggior UX possibile.
- **Blocco preventivo del click upstream** finché l'utente non risolve
  i downstream: rompe il modello one-shot.

**2. Match 3°/4° → candidate = i due perdenti delle SF.**

Regola FIFA standard. Implementata via `outcome: 'loser'` nella
bracket topology (D-020): nessun caso speciale nel componente, è già
nei dati Airtable.

**3. Save check di completezza → banner + dot ambra "scelta mancante".**

Al click di Save, se ci sono row senza `Predicted Winner`, niente
PATCH. Il `SaveBar` mostra:

> Attenzione!!! Mancano delle squadre; prego ricontrollare il tabellone
> e inserire le mancanti. Grazie. (Mancano N scelte su M.)

Ogni row vuota riceve dot ambra "scelta mancante". Stesso colore
visivo della cascata invalidata: in entrambi i casi la row richiede
attenzione dell'utente, due semantiche distinte sul tooltip.

Il "totale" (`M`) è dinamico: numero di prediction row effettivamente
fetchate da Airtable, non un costante 32. Così se la Automation di
Cipo genera meno righe per un prediction set, l'UI non si soft-locca.

**Check solo client-side** (per ora): la server action valida ID e
team ID validi (Zod) ma non rifiuta payload incompleti. La completezza
è un controllo UX coerente col modello one-shot pre-lock; quando
implementeremo il vero lock saliamo a defense-in-depth server-side.
