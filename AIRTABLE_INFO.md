# Toto Mondiale — info Airtable da raccogliere

Ciao! Roberto sta costruendo un frontend custom (web app) per il
Toto Mondiale, in sostituzione dell'attuale Glide/Softr. La parte
backend resta Airtable: il frontend si limita a leggere le righe già
generate dalle Automation e a salvarci sopra i pronostici dell'utente.

Per collegare il frontend alla base Airtable reale gli servono alcune
informazioni che solo tu (che hai l'accesso) puoi recuperare.

Tempo stimato: **15–30 minuti**, tutto in Airtable. Non serve toccare
nulla di funzionante: ti chiedo solo di **leggere** i nomi/ID, fare
una verifica sui tipi di alcuni campi, e (se ti va) creare 4 piccoli
helper field opzionali ma molto utili.

**Come usare questo documento:** scrivi le risposte direttamente nelle
righe `____` o nei blocchi marcati con `// scrivi qui`. Quando hai
finito, manda a Roberto:

- questo file compilato (via email / WhatsApp / Signal / quello che usate)
- il **Personal Access Token** **NON in questo file**, ma su un canale
  diverso e privato (vedi sezione A)

---

## 🔐 A. Personal Access Token (PAT)

Il frontend di Roberto userà un Personal Access Token per parlare con
Airtable. Va creato **uno nuovo** dedicato a questa app — non
riusare token esistenti.

### Passi

1. Vai su <https://airtable.com/create/tokens>
2. Click **Create new token**
3. Compila:
   - **Name:** `Toto Mondiale frontend (Roberto)`
   - **Scopes:** seleziona questi due:
     - `data.records:read`
     - `data.records:write`
     - (opzionale, comodo per debugging) `schema.bases:read`
   - **Access:** aggiungi **solo** la base Toto Mondiale.
     NON dare accesso a tutte le basi del workspace.
4. Click **Create token**
5. Airtable mostra il token **una sola volta**: copialo subito.
6. **Manda il token a Roberto in modo sicuro:** non scriverlo qui.
   Va bene Signal, una password manager condivisa, un Bitwarden
   send, ecc. Non WhatsApp non-cifrato, non email in chiaro, non
   GitHub/Slack pubblici.

**Token mandato a Roberto?** [ ] sì / [ ] no

---

## 🆔 B. Base ID + Prediction Set di test

### B.1 — Base ID

1. Apri la base Toto Mondiale in Airtable.
2. In alto a destra, click sull'icona **?** (Help) → **API documentation**
   (o vai direttamente a <https://airtable.com/api>).
3. Nella sezione "Introduction" leggi una frase tipo:
   > _"The ID of this base is `appXXXXXXXXXXXXXX`"_
4. Copia quel codice (inizia con `app`, lungo 17 caratteri).

**Base ID:** `app______________`

### B.2 — Un Prediction Set di test già popolato

A Roberto serve l'ID di **una riga** della tabella `Prediction Sets`
che abbia già tutte le 72 + 48 + 32 righe figlie generate (cioè una
schedina di test, anche non compilata, ma con tutte le righe pronte).

1. Apri la tabella `Prediction Sets` in Airtable.
2. Trova una riga di test (creane una nuova se non c'è).
3. Clicca sulla riga per aprire la **record view**.
4. Guarda l'URL nel browser: finisce con `/recXXXXXXXXXXXXXX`.
5. Copia quella parte (inizia con `rec`, 17 caratteri totali).

**Debug Prediction Set ID:** `rec______________`

(Se preferisci, puoi anche prendere l'ID dalla colonna del "Record ID"
se esiste già, oppure cliccando su "Expand record" → in basso a sinistra
c'è "Copy record URL".)

---

## 📋 C. Table IDs

Servono i `tblXXX...` di tutte le tabelle che il frontend toccherà
(anche solo in lettura). Sono stabili anche se rinomini la tabella, per
cui sono preferibili al nome leggibile.

### Come trovarli

1. Dalla base, click **? → API documentation**.
2. Nella sidebar di sinistra ti elenca tutte le tabelle.
3. Click su una tabella → in alto leggi: _"The ID of this table is `tblXXX...`"_
4. Copia il `tbl...` e incollalo sotto.

**Se una tabella ha un nome diverso da quello indicato** (es. si chiama
"Matches" invece di "Group Matches"), scrivilo nel campo `Nome reale`.

| Cosa è | Nome atteso | Nome reale (se diverso) | Table ID |
|---|---|---|---|
| Utenti | `Users` | ____ | `tbl______________` |
| Schedine | `Prediction Sets` | ____ | `tbl______________` |
| Calendario partite | `Group Matches` | ____ | `tbl______________` |
| Pronostico risultato partita | `Group Match Predictions` | ____ | `tbl______________` |
| Pronostico classifica girone | `Group Order Predictions` | ____ | `tbl______________` |
| Pronostico fase a eliminazione | `Knockout Predictions` | ____ | `tbl______________` |
| Nazionali | `Teams` | ____ | `tbl______________` |
| Calciatori | `Players` | ____ | `tbl______________` |

**Ci sono altre tabelle in base** che Roberto dovrebbe conoscere
(es. tournaments, settings, special predictions per Winner / Top Scorer)?
Elencale qui:

```
// scrivi qui (nome + a cosa serve), oppure "no, solo quelle"
```

---

## 🏷️ D. Nomi esatti dei campi

Per ogni tabella, Roberto ha già messo nel codice dei **nomi placeholder**.
Ti chiedo di confermare quali sono uguali e quali sono diversi.

**Compila SOLO i campi che hanno un nome diverso dal placeholder.**
Se il placeholder è esattamente il nome del campo in Airtable, lascia
vuoto o scrivi `=`.

> Suggerimento: per vederli, apri la tabella, click sulla freccetta in
> testa a una colonna → "Customize field type" mostra il nome esatto.
> Oppure: sempre da API docs sulla destra c'è la lista dei campi.

### D.1 — Tabella `Prediction Sets`

| A cosa serve nel codice | Placeholder attuale | Nome reale (se diverso) |
|---|---|---|
| Link all'utente proprietario | `User` | ____ |
| Numero progressivo della schedina | `Prediction no.` ⚠️ | ____ |
| Nome / titolo schedina | `Name` | ____ |
| Pronostico vincitore Mondiale (link → Teams) | `Predicted World Cup Winner` | ____ |
| Pronostico capocannoniere (link → Players) | `Predicted Top Scorer` | ____ |
| Flag "gironi bloccati" (checkbox) | `Group Predictions Locked?` | ____ |
| Flag "knockout bloccati" (checkbox) | `Knockout Predictions Locked?` | ____ |

⚠️ **Domanda:** `Prediction no.` ha davvero quel punto finale `.`? È un
po' insolito come naming. Conferma esattamente: `Prediction no.` /
`Prediction No.` / `Prediction #` / `Number` / altro?

### D.2 — Tabella `Group Match Predictions` ⭐ (la più importante)

Questa è la tabella su cui il frontend lavora di più. Sii preciso.

| A cosa serve nel codice | Placeholder attuale | Nome reale (se diverso) | Tipo del campo |
|---|---|---|---|
| Link alla schedina | `Prediction Set` | ____ | linked record |
| Link alla partita reale | `Group Match` | ____ | linked record |
| Lettera del girone (A, B, C…) | `Group` | ____ | lookup / formula |
| Nome squadra di casa | `Home Team` | ____ | lookup / formula |
| Nome squadra ospite | `Away Team` | ____ | lookup / formula |
| Ordine partita nel girone (1–6) | `Match Order` | ____ | opzionale |
| Data della partita | `Match Date` | ____ | opzionale |
| **Pronostico goal squadra di casa** ✏️ | `Predicted Home Score` | ____ | **Number, integer** |
| **Pronostico goal squadra ospite** ✏️ | `Predicted Away Score` | ____ | **Number, integer** |

⚠️ **Domanda critica:** `Predicted Home Score` e `Predicted Away Score`
sono di tipo **`Number`** con formato `Integer` (0 decimali)?
Se sono `Single line text`, va saputo perché Roberto dovrà mandare i
numeri come stringhe e attivare il typecast.

Tipo dei due campi score: [ ] Number integer / [ ] Single line text / [ ] altro: ____

### D.3 — Tabella `Group Order Predictions`

| A cosa serve | Placeholder | Nome reale (se diverso) | Tipo |
|---|---|---|---|
| Link alla schedina | `Prediction Set` | ____ | linked record |
| Lettera del girone | `Group` | ____ | text / lookup |
| Link alla nazionale | `Team` | ____ | linked → Teams |
| Nome leggibile della nazionale | `Team Name` | ____ | lookup (opzionale) |
| **Posizione predetta in classifica girone** ✏️ | `Predicted Rank` | ____ | **Number 1–4** |

### D.4 — Tabella `Knockout Predictions`

| A cosa serve | Placeholder | Nome reale (se diverso) | Tipo |
|---|---|---|---|
| Link alla schedina | `Prediction Set` | ____ | linked record |
| Fase / round | `Round` | ____ | single select / text |
| Codice slot della partita | `Slot` | ____ | text / formula (opzionale) |
| Candidato squadra 1 | `Candidate Team 1` | ____ | linked → Teams (?) |
| Candidato squadra 2 | `Candidate Team 2` | ____ | linked → Teams (?) |
| Nome leggibile candidato 1 | `Candidate Team 1 Name` | ____ | lookup (opzionale) |
| Nome leggibile candidato 2 | `Candidate Team 2 Name` | ____ | lookup (opzionale) |
| **Squadra vincitrice predetta** ✏️ | `Predicted Winner` | ____ | **linked → Teams** |
| Nome leggibile vincitrice predetta | `Predicted Winner Name` | ____ | lookup (opzionale) |

⚠️ **Domanda importante (knockout):** ogni riga di `Knockout Predictions`
ha già le due squadre candidate fisse, oppure dipendono dalle predizioni
precedenti dell'utente (es. "il vincitore di R32-1 vs il vincitore di
R32-2", che cambia a seconda di chi hai pronosticato nei round precedenti)?

[ ] candidate fisse, già linkate a 2 Team specifici
[ ] candidate computate dalle predizioni precedenti (segna come)
[ ] non lo so / da capire insieme

Per i valori di `Round`: quali sono **esattamente** le label che usate?
(esempio: `Round of 32`, `Round of 16`, `Quarterfinals`, `Semifinals`,
`Final`, `Third place`)

```
// scrivi qui le label reali, una per riga
```

Quante sono in totale le righe knockout in una schedina? (Atteso: 32 per
il formato FIFA 48 squadre. Da confermare.)

**Numero totale righe knockout per schedina:** ____

### D.5 — Tabelle `Teams`, `Players`, `Users`

Solo i nomi del campo principale:

| Tabella | Cosa | Placeholder | Nome reale (se diverso) |
|---|---|---|---|
| Teams | Nome nazionale | `Name` | ____ |
| Teams | Sigla (opzionale, es. ITA) | `Code` | ____ |
| Teams | Girone di appartenenza | `Group` | ____ |
| Players | Nome calciatore | `Name` | ____ |
| Players | Squadra (link) | `Team` | ____ |
| Users | Nome utente | `Name` | ____ |
| Users | Email | `Email` | ____ |

---

## 📦 E. Un record di esempio (JSON)

Roberto deve vedere **una** riga reale della tabella
`Group Match Predictions` per essere sicuro di come Airtable serializza
i valori (linked record, lookup, ecc.).

### Come ottenerlo

1. Apri la base → **? → API documentation**.
2. Nella sidebar di sinistra, click su **Group Match Predictions** (o
   come si chiama da te).
3. Click su **List records**.
4. Sulla destra trovi un esempio `curl` precompilato con il token
   personale. Oppure scrolla in fondo e c'è una sezione "Example
   response".
5. Copia il JSON di **un solo record completo** (l'oggetto dentro
   `records: [...]`).

Se hai dati sensibili, va benissimo cambiare i valori display dei nomi
squadra in qualcosa di finto. **Non rimuovere i campi tecnici** (id,
arrays di record id linkati, tipi).

**Esempio (sostituisci con il tuo):**

```json
{
  "id": "recXXXXXXXXXXXXXX",
  "createdTime": "2026-05-20T10:00:00.000Z",
  "fields": {
    "Prediction Set": ["recYYYYYYYYYYYYYY"],
    "Group Match":    ["recZZZZZZZZZZZZZZ"],
    "Group":          "Group A",
    "Home Team":      "Italy",
    "Away Team":      "Argentina",
    "Match Order":    1,
    "Predicted Home Score": 2,
    "Predicted Away Score": 1
  }
}
```

**Il tuo record reale qui:**

```json
// incolla qui il JSON di una riga reale di Group Match Predictions
```

(Se ti va, fai la stessa cosa anche per **Group Order Predictions** e
**Knockout Predictions** — opzionale ma aiuta tantissimo.)

```json
// (opzionale) JSON di una riga di Group Order Predictions
```

```json
// (opzionale) JSON di una riga di Knockout Predictions
```

---

## 🛠️ F. Helper fields per filtri server-side (opzionale, raccomandato)

Senza questi campi, il frontend funziona lo stesso ma ogni volta che
qualcuno apre una pagina di pronostico carica **tutte** le righe della
tabella e filtra in memoria. Con poche schedine va bene, con molte è
spreco. Crearli è un lavoro di 5 minuti totale.

Se preferisci saltare per ora, scrivi `skip` e si fa dopo.

**Salti questa sezione?** [ ] sì, skip / [ ] no, li creo

### Setup (se hai detto no allo skip sopra)

1. Sulla tabella **`Prediction Sets`** crea un nuovo campo:
   - **Field name:** `Record ID`
   - **Field type:** `Formula`
   - **Formula:** `RECORD_ID()`
   - **Formatting:** lascia default (plain text)

2. Sulla tabella **`Group Match Predictions`** crea un nuovo campo:
   - **Field name:** `Prediction Set ID`
   - **Field type:** `Lookup`
   - **Pick a linked record field:** `Prediction Set` (quello che linka
     già la schedina)
   - **Pick a field from linked table:** `Record ID` (quello creato al
     passo 1)

3. Ripeti **identico al passo 2** anche su:
   - tabella `Group Order Predictions`
   - tabella `Knockout Predictions`

   (Stesso nome del campo: `Prediction Set ID`. Stessa procedura.)

### Verifica

Apri una qualsiasi riga di una delle tre tabelle di pronostico: il
campo `Prediction Set ID` deve mostrare la stringa `recXXX...` (il
record ID della schedina linkata).

### Conferma dei nomi

- `Prediction Sets.Record ID` → creato? [ ] sì / [ ] no
- `Group Match Predictions.Prediction Set ID` → creato? [ ] sì / [ ] no
- `Group Order Predictions.Prediction Set ID` → creato? [ ] sì / [ ] no
- `Knockout Predictions.Prediction Set ID` → creato? [ ] sì / [ ] no

Se hai usato nomi diversi, scrivili qui:

```
// nome reale del lookup su Group Match Predictions:    ____
// nome reale del lookup su Group Order Predictions:    ____
// nome reale del lookup su Knockout Predictions:       ____
// nome reale della formula RECORD_ID() su Prediction Sets: ____
```

---

## ❓ G. Domande aperte / note libere

Qualsiasi cosa che mi dovrei sapere e che non rientra nei punti sopra:
campi rinominati di recente, righe particolari, vincoli, view che il
frontend dovrebbe rispettare, ecc.

```
// scrivi qui (lascia vuoto se nulla)
```

---

## ✅ Riepilogo per Roberto

Quando hai finito, controlla di avermi mandato:

- [ ] Personal Access Token (su canale privato, **non in questo file**)
- [ ] Base ID (sezione B.1)
- [ ] Debug Prediction Set ID (sezione B.2)
- [ ] Table IDs delle 8 tabelle (sezione C)
- [ ] Nomi reali dei campi quando diversi dal placeholder (sezione D)
- [ ] Risposta alle 3 domande critiche:
  - [ ] tipo dei campi score (D.2)
  - [ ] modello knockout: candidate fisse o computate (D.4)
  - [ ] `Prediction no.` ha il punto finale? (D.1)
- [ ] Almeno **un** record JSON di esempio (sezione E)
- [ ] Sì/no agli helper field per server-side filtering (sezione F)

Grazie! 🙌
