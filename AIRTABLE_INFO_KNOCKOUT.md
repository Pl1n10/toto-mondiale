# AIRTABLE_INFO_KNOCKOUT.md

Followup della raccolta info `AIRTABLE_INFO.md` (sessione 2-3). Domanda
inviata a Cipo a fine sessione 4 prima di partire con lo slice #3
(Knockout Predictions).

**Mandato a Cipo il:** 2026-05-26
**Risposto da Cipo il:** 2026-05-26 sera (vedi sezione "Risposta di Cipo")

## Testo della domanda (per Roberto, da copiare/incollare)

> Ciao Cipo!
>
> Siamo arrivati allo slice #3 della web app, il tabellone knockout.
> Tutta la parte gironi (predizioni 1/X/2 + classifica 1-4) gira già
> end-to-end contro la base reale, ora ci serve un chiarimento tecnico
> su come funziona la parte ad eliminazione.
>
> **Modello che ho in mente** (correggimi se sbaglio):
> - Gli accoppiamenti del **Round of 32** sono fissi: tu li popoli
>   manualmente in `9. Knockout Matches` riempiendo `Team A` e `Team B`
>   dopo che si concludono i gironi.
> - Per ogni schedina, in `10. Knockout Predictions` ci sono 32 righe
>   già pronte (16 R32 + 8 R16 + 4 QF + 2 SF + 1 3°/4° + 1 Finale).
> - L'utente sceglie il `Predicted Winner` di ogni match.
>
> **La domanda secca:** per un match dei round successivi al R32
> (es. R16 - Match 1), come fa il campo `Predicted Team A` /
> `Predicted Team B` a sapere chi è il `Predicted Winner` del R32 che
> lo alimenta? In altre parole: se l'utente Tizio nel R32-Match-1
> sceglie Germania come vincente, nel suo R16-Match-1 voglio vedere
> Germania come Team A da affrontare. Per l'utente Caio invece, che
> ha scelto Brasile, deve apparire Brasile.
>
> Le tre possibilità che vedo:
>
> 1. **Già fatto in Airtable**: hai messo qualche lookup/formula
>    intelligente che traccia le scelte dell'utente turno per turno e
>    popola `Predicted Team A/B` da solo. (Se sì, mi spieghi
>    brevemente la catena di campi così la replico nel frontend?)
> 2. **Lo fa il frontend**: l'app calcola in cascata chi va dove
>    dopo ogni scelta utente e scrive `Predicted Team A/B` su
>    Airtable insieme al `Predicted Winner`. Funziona ma serve che
>    quei due campi siano writable (lookup non lo sono).
> 3. **Lo fai tu manualmente**: dopo che gli utenti completano un
>    round, tu compili a mano le coppie del round successivo. Brutto
>    per tante schedine, evitiamo se possibile.
>
> Se hai un attimo, fammi sapere:
> - **In che modalità l'avevi pensata?** (1, 2, 3, o "non l'avevo
>   ancora deciso")
> - I campi `Predicted Team A` e `Predicted Team B` su
>   `10. Knockout Predictions` sono di tipo **lookup** (read-only) o
>   **linked record** (writable)? Aprili dal "+" della colonna →
>   "Customize field type" → mi dici il tipo esatto.
>
> Bonus: se per caso l'avevi pensata in modalità (2) e mi confermi
> che i due campi sono linked record writable, possiamo procedere
> direttamente.
>
> Grazie!

## Risposta di Cipo (sintesi + interpretazione)

Cipo ha risposto a fine sessione 4. Sintesi punto per punto:

| Cosa ha detto | Decodifica |
|---|---|
| "Pill 1·2·3·4 va benissimo" | OK su slice #2, già committato. |
| "Il lookup `Predicted Winner` mostra tutti i Teams. Devo modificarlo in Airtable o si può forzare la scelta in front?" | Limitiamo noi la scelta nel frontend (mostriamo solo Team A vs Team B per ogni match). Cipo non tocca nulla in Airtable: il campo resta `linked → Teams` (deve poter linkare qualunque squadra). |
| "Accoppiamenti R32 fissi" + "32 righe Knockout Predictions già pronte per ogni schedina" | Conferme attese. |
| "Al momento nessun wiring/reference. C'è il solo lookup dalla scheda dei Teams" | Niente cascata in Airtable. Il frontend deve gestirla. |
| "L'utente può comunque scegliere Giordania in Brasile-Italia, che è sbagliato" | Conferma il problema: senza filtro nel frontend l'utente può scegliere qualunque squadra. Ce ne occupiamo noi. |
| **"La mia idea era che in front-end si leggono i Round of 32 e da lì si forzano le scelte dell'utente; molto simile alla 2 che hai suggerito"** | ✅ **Caso B confermato.** Cascata frontend-side. |
| "Posso vedere se c'è un modo di lookup tra le righe" | Offerta declinata: non serve, lo gestiamo client-side (vedi twist sotto). |
| **"I campi `Predicted Team A/B` sono lookup dalla tabella Teams"** | ⚠️ Read-only. Non scrivibili dal frontend. |

### Twist rispetto al piano originale

Il piano originale del Caso B prevedeva di **scrivere** `Predicted Team A/B`
su Airtable insieme al `Predicted Winner`. Cipo conferma che quei campi
sono **lookup**, quindi non scrivibili. Conseguenza:

- La cascata vive **solo nel client state** del frontend; non la
  persistiamo in Airtable.
- Il PATCH contiene unicamente `Predicted Winner` per match.
- Per R16/QF/SF/F/3°-4° i lookup `Predicted Team A/B` su Airtable
  resteranno vuoti — non importa, il display delle squadre nel browser
  viene dalla mappa `id → name` (come slice #1) combinata con le
  scelte utente nei round precedenti.

È **più pulito** così: meno PATCH, meno superficie di partial-failure,
schema Airtable invariato.

### Chiarimento di Roberto su quando l'utente compila (post-Cipo)

Modello operativo: **compilazione one-shot prima del lock**. Appena
finiscono i gironi, le 32 squadre che passano sono fissate; l'utente
si siede e compila TUTTO il tabellone (R32 → R16 → QF → SF → 3°/4° →
Finale) in un'unica sessione, prima che il primo match knockout
inizi. Non c'è un editing "settimana per settimana".

Le scelte sono lockate dopo l'inizio della fase (logica MVP futura,
oggi non implementata).

### Modello finale slice #3

1. Fetch dei 32 `Knockout Predictions` per il prediction set.
2. Fetch dei 32 `Knockout Matches` (per leggere `Team A` e `Team B`
   reali dei R32; vuoti per i round successivi, atteso — da
   verificare col probe nel HANDOFF).
3. Fetch `Teams` per la mappa `id → name`.
4. Il client costruisce il **bracket state** in memoria:
   - per ogni match, computa le `candidates: [TeamA, TeamB]`:
     - R32: prese da `Knockout Match.Team A` e `.Team B`
     - R16/QF/SF/F: prese dai `Predicted Winner` dei due match a monte
       (se compilati) — altrimenti `null` (pill disabled + tooltip
       "complete the previous round")
     - 3°/4° posto: vedi sotto, decisione aperta
5. UI: 6 sezioni come per slice #2 (`01 - Round of 32` ... `06 - Final`),
   ognuna con N partite. Per ogni partita: pill A / B che mostrano i
   nomi delle candidate. Pill selezionata = winner.
6. On click pill: aggiornamento client del winner. Se invalida una
   scelta a valle, vedi decisione aperta sotto.
7. Save: PATCH di tutti i `Predicted Winner` modificati, in batch da 10.

### Decisioni UX ancora aperte (da chiudere domani con Roberto)

#### Aperta 1 — Cosa fare quando una scelta upstream invalida una scelta a valle

Anche se la compilazione è "one-shot", durante la stessa sessione
l'utente può tornare indietro a un round già compilato e cambiare un
winner. La scelta a valle che dipendeva dal vecchio winner ora punta
a una squadra che non gioca più quel match.

Esempio:
- L'utente in R32-M1 ha detto "vince Brasile"
- L'utente in R16-M1 ha detto "vince Brasile"
- L'utente torna su R32-M1 e cambia: "vince Italia"
- Ora R16-M1 ha "Italia vs <altro>". La scelta "Brasile vince R16-M1"
  punta a una squadra che non è candidata

Tre opzioni:

- **(i)** Mette `null` sulle scelte a valle invalidate, le righe
  diventano dot ambra "scelta da rifare". L'utente scrolla giù,
  ricompila.
- **(ii)** Resetta silenziosamente alla nuova candidata "Team A" (o
  alla scelta più simile possibile).
- **(iii)** Blocca il cambio upstream mostrando "prima rimuovi le
  scelte a valle che ne dipendono".

**Raccomandazione Claude:** (i). Trasparente, non distrugge
silenziosamente, non frustra con blocchi preventivi. Coerente col
modello one-shot: l'utente è già sulla pagina, scrolla giù, vede
le righe ambra, le ricompila in 10 secondi.

⏳ **In attesa di conferma di Roberto.**

#### Aperta 2 — Candidate del match 3°/4° posto

Il match 3°/4° (Phase `05 - Third Place`) si gioca tra i due
**perdenti** delle Semifinali. Quindi le sue candidate non sono i
winner di altri match a monte, ma le squadre **non scelte** nei due
match Semifinale.

Esempio:
- SF-M1: Italia vs Germania. Utente sceglie "Italia vince" → Germania
  è candidata 3°/4°
- SF-M2: Brasile vs Argentina. Utente sceglie "Brasile vince" →
  Argentina è candidata 3°/4°
- Third Place: Germania vs Argentina

Bracket topology deve tener traccia non solo del winner ma anche del
"loser" implicito = `[teamA, teamB].filter(t => t !== winner)`.

**Raccomandazione Claude:** implementare così come sopra. Niente di
particolare da decidere, è la regola FIFA standard.

⏳ **In attesa di conferma di Roberto.** (probabilmente solo formalità)

### Cose ancora aperte con Cipo

- Roberto deve rispondere a Cipo: "Non serve indagare il lookup tra
  le righe, gestiamo tutto frontend. Grazie!" ✅ confermato da Roberto,
  da inviare domani.
- Eventuali precisazioni di Cipo su edge case che potrebbero emergere
  domani dopo che gli rispondi.

## Piano in base alla risposta — pronto da eseguire

### Caso A — Cipo risponde "modalità 1 (lookup intelligente)"

Improbabile ma possibile. Significa che `Predicted Team A/B` sono
lookup popolati automaticamente da una catena di linked record che
parte dal `Predicted Winner` del round precedente.

**Cosa fa il frontend:** solo scrive `Predicted Winner` per ogni
prediction. Niente cascata client. UI = stessa pattern di slice #1/#2:
6 sezioni per round, pill A/B per scegliere il winner.

**Sblocco progressivo:** la pagina mostra il round N+1 solo quando
il round N è completamente compilato (32 selezioni in R32 → mostro
R16; 16 → mostro QF; ecc.). Discutere se mostrarli grigi finché
non pronti vs nasconderli.

### Caso B — Cipo risponde "modalità 2 (frontend fa cascata)"

**Probabile.** Significa che `Predicted Team A` e `Predicted Team B`
sono linked record writable; il frontend deve gestire la cascata.

**Cosa fa il frontend:**

1. Definire **bracket topology**: una struttura statica che dice
   "il vincitore di R32 match N va in slot A/B di R16 match M".
   Per il formato FIFA 48 squadre serve la mappa dei 31 match
   non-R32 (R16, QF, SF, 3°/4°, Finale). Documentarla in
   `lib/knockout/bracketTopology.ts` con i numeri match (73..104).
2. Quando l'utente cambia `Predicted Winner` di un match:
   - aggiornamento ottimistico del match corrente
   - propagazione client-side: il vincitore alimenta `Predicted Team A`
     o `Predicted Team B` del match successivo
   - se l'utente aveva già pronosticato un winner nel match a valle,
     ed era una squadra che ora non c'è più nelle candidate, va
     **invalidato** (riga in stato `dirty` / `error`?). Decisione UX
     da prendere.
3. PATCH al server include:
   - `Predicted Winner` del match modificato
   - `Predicted Team A` / `Predicted Team B` dei match a valle che ne
     dipendono (uno o due al massimo, per ogni livello di profondità).
   - I match a valle invalidati (winner ora impossibile) hanno il loro
     winner messo a `null`.

**File da creare/modificare in caso B:**

- `lib/knockout/bracketTopology.ts` (nuovo) — mappa statica
  match-number → slot-output (es. match 73 → R16 match 89 slot A)
- `lib/airtable/knockoutPredictions.ts` — aggiornare payload PATCH per
  includere `Predicted Team A/B`; aggiungere `Predicted Team A/B`
  a `KNOCKOUT_PREDICTION_WRITABLE_FIELDS` in `config.ts`
- `lib/validation/knockoutPredictionSchema.ts` — Zod per il batch
- `app/prediction-set/[id]/knockout/actions.ts` (nuovo) — server action
- `components/predictions/KnockoutTable.tsx` — UI completa con
  cascata client-side
- `types/domain.KnockoutPredictionUpdate` — aggiungere campi
  `predictedTeamA/B?` opzionali (popolati solo quando il match
  modificato alimenta uno a valle)
- `lib/airtable/mockData.ts` — mock realistico con la stessa topology

**Decisione UX da prendere prima di iniziare:** quando l'utente
ri-cambia un R32 e il suo R16 puntava a una squadra che ora non passa
più, cosa succede al R16?

- (i) `null` + dot ambra "scelta da rifare"
- (ii) reset automatico al "Team A" del nuovo accoppiamento
- (iii) bloccare il click sul R32 finché l'utente non resetta a valle

Mia raccomandazione: (i). Trasparente, non distrugge silenziosamente,
chiede conferma.

### Caso C — Cipo risponde "modalità 3 (manuale)"

Non scalabile a tante schedine, ma è quello che girava su Glide/Softr,
quindi tecnicamente è gestibile.

**Cosa fa il frontend:** legge `Real Team A` / `Real Team B` dei match
del round attuale; non li tocca. L'utente sceglie solo
`Predicted Winner`. La cascata la gestisce Cipo a mano fra un round
e l'altro.

UI identica al Caso A. Discutere però se ha senso lanciare l'app in
queste condizioni o se vale la pena spingere per modalità 2.

### Caso D — Cipo risponde "non l'avevo ancora deciso"

Default = procediamo come Caso B (modalità 2). È la soluzione più
scalabile e che ci richiede meno round-trip. Aggiornare DECISIONS.md
con un'entry "D-020 — Frontend gestisce la cascata knockout"
spiegando perché.

## Verifiche tecniche al ritorno della risposta

Prima di scrivere codice, fare un probe diretto sull'Airtable per
confermare il tipo dei campi `Predicted Team A` / `Predicted Team B`:

```bash
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

(richiede scope `schema.bases:read` sul token PAT; se manca il probe
risponde 403 e si chiede a Cipo a parole)
