# ANTIPATTERNS.md — Toto Mondiale

Cose che NON vanno fatte in questo repo. Append-only: se in futuro un
pattern di questa lista diventa accettabile, si aggiunge una nota di
deprecazione invece di rimuovere la voce.

---

## AP-001 — Chiamare l'Airtable REST API da un client component

Il token Airtable è server-only (mai in `NEXT_PUBLIC_*`). Tutte le
chiamate ad `api.airtable.com` partono da `lib/airtable/client.ts`,
importato solo da file con `'use server'` o da Server Components. Il
client browser parla solo col proxy Next.js (Server Actions).

**Sentinella in codice:** `import 'server-only'` in cima a
`lib/airtable/client.ts` e ai service per-tabella. Romperebbe il build
se qualcuno provasse a importarlo da un client component.

---

## AP-002 — Inviare in PATCH un campo che non è in `*_WRITABLE_FIELDS`

I lookup, le formule e gli autonumber Airtable NON accettano write. Se
si manda comunque, Airtable risponde 422 e l'intero batch chunk fallisce.

Il service layer ha un filtro difensivo che **strippa** dal payload
qualunque campo non in writable list. Non disabilitarlo. Se serve un
nuovo campo writable, aggiungilo in `*_WRITABLE_FIELDS` in
`lib/airtable/config.ts` con motivazione in `DECISIONS.md`.

---

## AP-003 — Far apparire nomi di campo Airtable fuori da `lib/airtable/*`

I componenti React e le server actions devono lavorare su
`types/domain.ts`. Mai cercare in un componente una stringa tipo
`"Predicted Home Score"` o `record.fields['Group']`.

Se serve esporre un campo nuovo: aggiungilo a `config.ts`, mappalo in
`mappers.ts`, aggiungilo al tipo domain, propaga.

---

## AP-004 — PATCH con più di 10 record in una sola chiamata

Limite hard Airtable. Usa sempre `updateRecordsInBatches`, che chunka a
10. Non chiamare `fetch` PATCH a mano dal service per "ottimizzare".

---

## AP-005 — Una chiamata API per ogni cella modificata (chatty saves)

L'utente può modificare decine di righe prima di salvare. La UX scelta
è batch save esplicito (vedi DECISIONS D-012). Non introdurre autosave
on blur né debounced per-cell PATCH: distrugge il pattern partial-failure
e satura le rate limit di Airtable.

---

## AP-006 — Bypassare la validazione Zod nelle server action

La validazione client-side è solo UX (feedback rapido). La server action
**deve** ri-validare con `*Schema.safeParse(input)` prima di toccare
Airtable. Un client compromesso potrebbe mandare payload arbitrari.

---

## AP-007 — Mostrare un errore globale e azzerare l'input utente

In caso di errore (parziale o totale), **mai** sovrascrivere o cancellare
l'input dell'utente. Lo state machine per-row preserva sempre il valore
inserito; il dot diventa rosso. L'utente può correggere e ri-salvare.

---

## AP-008 — Hardcodare un `predictionSetId` in un componente

L'ID arriva sempre dalla route (`params.id`) o dal config env
(`DEBUG_PREDICTION_SET_ID`). Niente costanti in mezzo al codice
UI/business: rende impossibile estendere ad auth reale.

---

## AP-009 — Auth ad-hoc inline ("controllo se l'utente è loggato qui")

L'MVP non ha auth. Quando si aggiungerà, sarà un layer dedicato
(probabilmente middleware Next.js + sessione server-side), non
`if (user.id)` sparso nei service. Non anticipare con codice morto.

---

## AP-010 — Committare `.env.local`, token, o ID che ti fanno passare per Roberto

`.env.local` è in `.gitignore`. Quando aggiungi nuove env, aggiorna
`.env.example` con il nome ma valore VUOTO o placeholder palese
(`__set_me__`). Mai un token reale, nemmeno troncato.

---

## AP-011 — Riscrivere il sistema invece di completare la slice in corso

Vertical slice alla volta, end-to-end. Se durante slice #2 emerge che la
slice #1 ha un problema architetturale serio, si finisce #2 e si apre una
slice di refactor dedicata. Non si tocca slice #1 "mentre si è qui".

---

## AP-012 — Aggiungere shadcn/ui / un design system "perché tanto serve"

Per ora la UI è tabelle compatte. Tailwind puro basta. Introdurre
shadcn/ui aggiunge dipendenza, file di config, copy-paste di componenti
che diventano debito di manutenzione. Quando servirà un componente
non-banale (modal, command palette), si rivaluta.

---

## AP-013 — Chiamare Airtable nei test

Vale la regola globale di Roberto (`~/.claude/CLAUDE.md` → "Regole
trasversali"). I service avranno una versione mock injectable. I test
non toccano `api.airtable.com`.

(Test non ancora presenti: arrivano dopo slice #3.)

---

## AP-014 — Reintrodurre `filterByFormula` senza il rollup field

Vedi DECISIONS D-007. Airtable non sa filtrare per record ID di un linked
field nudo. Se si vuole il filtro server-side, **prima** si aggiunge il
rollup/formula field su Airtable, **poi** si modifica il service. Non
inventarsi formule creative tipo `SEARCH('rec...', {LinkedField})` —
falliscono in modo silenzioso quando il display field cambia.

---

## AP-015 — Affidarsi a `typecast: true` per convertire integer → text

Scoperto empiricamente in sessione 4 (vedi D-016 revisionata): l'opzione
`typecast` di Airtable coerce **string → target field type**, NON
integer → text. Un PATCH con `{"Predicted Rank": 1}` + `typecast: true`
su un campo Single-line-text ritorna `422 Unprocessable Entity`.

Regola: se l'Airtable field è single-line-text e nel domain TS hai un
number, **converti tu** a stringa via `String(...)` nel service prima
del PATCH. `typecast` resta utile per single-select / multi-select
(creazione lazy delle option) ma non risolve mismatch di tipo
numerico→testuale.

---

## AP-016 — Lanciare `npm run build` mentre `npm run dev` è attivo

Sintomo: la pagina arriva server-rendered ma client JS / CSS chunks
ritornano 404 (`/_next/static/chunks/...`) → niente hydration → click
inerti, look "minimal" perché manca CSS. Il production build sovrascrive
`.next/` mentre il dev server lo sta servendo, e i chunk path
versionati divergono.

Soluzione operativa quando capita:

```bash
pkill -f "next dev"
rm -rf .next
npm run dev   # riparte pulito
```

Da evitare a monte: scegli **uno** dei due (dev OR build), non
entrambi sulla stessa cartella `.next`. Se serve verificare il build,
ferma prima il dev server.

---

## AP-017 — Probe Airtable senza loop su `offset` (paginazione mancante)

Scoperto in sessione 5: il probe diagnostico iniziale dei
`Knockout Predictions` (`pageSize=100` SENZA loop su `offset`) faceva
vedere solo 25 record per il prediction set test, suggerendo un bug
nell'automation di Cipo. **Falsa diagnosi:** i 32 record c'erano tutti
— stavano semplicemente nelle pagine successive (tabella aveva 128
record totali, 32 prediction sets × 4 turni in media).

Regola: gli script ad-hoc che probano Airtable devono o (a) iterare
su `offset` finché `null`, oppure (b) mirare a tabelle con < 100
record (es. Teams = 48, Groups = 12) dove la prima pagina basta.
Per le 4 tabelle con N × {72|48|32} righe (predictions), il paging
è obbligatorio.

```python
# Pattern corretto per probe ad-hoc
all_records = []
offset = None
while True:
    params = "pageSize=100"
    if offset: params += f"&offset={offset}"
    url = f".../{table}?{params}"
    data = json.loads(urllib.request.urlopen(req).read())
    all_records.extend(data['records'])
    offset = data.get('offset')
    if not offset: break
```

`lib/airtable/client.ts → listAllRecords` lo fa già correttamente; il
problema è solo negli script Python "veloci" che scriviamo per
diagnosi durante una sessione. Non c'è una sentinella di codice per
proteggere da questo — solo memoria muscolare.

---

## AP-018 — Scrivere `Predicted Team A/B` su Knockout Predictions

Confermato da Cipo in sessione 4 e codificato nella roadmap di slice
#3: i campi `Predicted Team A` e `Predicted Team B` sulla tabella
`Knockout Predictions` sono **lookup**, quindi read-only. Tentare un
PATCH con uno di questi due field ritorna 422.

Conseguenza architetturale: la cascata fra i round vive **interamente
nello stato client**. Il PATCH contiene solo `Predicted Winner` per
ogni match modificato; le candidate A/B per i round successivi a R32
vengono calcolate al volo da `resolveAllCandidates(topology, winners)`
e mostrate nelle pill, ma mai persistite.

Per i round non-R32, i valori che vedi in `Knockout Match.Team A/B`
sono **dummy lasciati da Cipo** durante la fase di setup (es. "Spain
in finale"). **Non leggerli mai per round != R32**: usa la cascata.
Per R32 invece sono i veri accoppiamenti compilati dopo i gironi.
