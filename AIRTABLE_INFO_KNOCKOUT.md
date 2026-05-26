# AIRTABLE_INFO_KNOCKOUT.md

Followup della raccolta info `AIRTABLE_INFO.md` (sessione 2-3). Domanda
inviata a Cipo a fine sessione 4 prima di partire con lo slice #3
(Knockout Predictions).

**Mandato a Cipo il:** 2026-05-26

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
