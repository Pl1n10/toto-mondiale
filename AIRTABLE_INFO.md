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
righe `\_\_\_\_` o nei blocchi marcati con `// scrivi qui`. Quando hai
finito, manda a Roberto:

* questo file compilato (via email / WhatsApp / Signal / quello che usate)
* il **Personal Access Token** **NON in questo file**, ma su un canale
diverso e privato (vedi sezione A)

\---

## 🔐 A. Personal Access Token (PAT)

Il frontend di Roberto userà un Personal Access Token per parlare con
Airtable. Va creato **uno nuovo** dedicato a questa app — non
riusare token esistenti.

### Passi

1. Vai su [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Compila:

   * **Name:** `Toto Mondiale frontend (Roberto)`
   * **Scopes:** seleziona questi due:

     * `data.records:read`
     * `data.records:write`
     * (opzionale, comodo per debugging) `schema.bases:read`
   * **Access:** aggiungi **solo** la base Toto Mondiale.
NON dare accesso a tutte le basi del workspace.
4. Click **Create token**
5. Airtable mostra il token **una sola volta**: copialo subito.
6. **Manda il token a Roberto in modo sicuro:** non scriverlo qui.
Va bene Signal, una password manager condivisa, un Bitwarden
send, ecc. Non WhatsApp non-cifrato, non email in chiaro, non
GitHub/Slack pubblici.

**Token mandato a Roberto?** \[X] sì / \[ ] no

\---

## 🆔 B. Base ID + Prediction Set di test

### B.1 — Base ID

1. Apri la base Toto Mondiale in Airtable.
2. In alto a destra, click sull'icona **?** (Help) → **API documentation**
(o vai direttamente a [https://airtable.com/api](https://airtable.com/api)).
3. Nella sezione "Introduction" leggi una frase tipo:

> \_"The ID of this base is `appXXXXXXXXXXXXXX`"\_

4. Copia quel codice (inizia con `app`, lungo 17 caratteri).

**Base ID:** `appPV77eshDFrfgII

### B.2 — Un Prediction Set di test già popolato

A Roberto serve l'ID di **una riga** della tabella `Prediction Sets`
che abbia già tutte le 72 + 48 + 32 righe figlie generate (cioè una
schedina di test, anche non compilata, ma con tutte le righe pronte).

1. Apri la tabella `Prediction Sets` in Airtable.
2. Trova una riga di test (creane una nuova se non c'è).
3. Clicca sulla riga per aprire la **record view**.
4. Guarda l'URL nel browser: finisce con `/recXXXXXXXXXXXXXX`.
5. Copia quella parte (inizia con `rec`, 17 caratteri totali).

**Debug Prediction Set ID:** `recnWpdJeglgnngOc`

(Se preferisci, puoi anche prendere l'ID dalla colonna del "Record ID"
se esiste già, oppure cliccando su "Expand record" → in basso a sinistra
c'è "Copy record URL".)

\---

## 📋 C. Table IDs

Servono i `tblXXX...` di tutte le tabelle che il frontend toccherà
(anche solo in lettura). Sono stabili anche se rinomini la tabella, per
cui sono preferibili al nome leggibile.

### Come trovarli

1. Dalla base, click **? → API documentation**.
2. Nella sidebar di sinistra ti elenca tutte le tabelle.
3. Click su una tabella → in alto leggi: *"The ID of this table is `tblXXX...`"*
4. Copia il `tbl...` e incollalo sotto.

**Se una tabella ha un nome diverso da quello indicato** (es. si chiama
"Matches" invece di "Group Matches"), scrivilo nel campo `Nome reale`.

|Cosa è|Nome atteso|Nome reale (se diverso)|Table ID|
|-|-|-|-|
|Utenti|`Users`|1. Users|`tblV5hSUCFmUa6QKe`|
|Schedine|`Prediction Sets`|2. Prediction Sets|`tblLdjuoKI5cGlTm9`|
|Calendario partite|`Group Matches`|6. Group Matches|`tblqsGL0EJvfSlrgD`|
|Pronostico risultato partita|`Group Match Predictions`|7. Group Match Predictions|`tblZbCTCA0vkG9DKZ`|
|Pronostico classifica girone|`Group Order Predictions`|8. Group Order Predictions|`tblrrWqCozhBK9E0c`|
|Pronostico fase a eliminazione|`Knockout Predictions`|10. Knockout Predictions|`tblcb4XGJ97WFa2DT`|
|Nazionali|`Teams`|4. Teams|`tblSrIn15i31xbfmU`|
|Calciatori|`Players`|5. Players|`tblRKG9GlTqsaQvGm`|

**Ci sono altre tabelle in base** che Roberto dovrebbe conoscere
(es. tournaments, settings, special predictions per Winner / Top Scorer)?
Elencale qui:

```

|Cosa è|Cosa c'e'|Nome reale|Table ID|
|-|-|-|-|
|Gruppi|Una Colonna con "Group Name" e i 12 Gruppi (Group A, Group B)|3. Groups|`tbl9kH827Vv3Md3qA`|
|Partite fase ad eliminazione|Varie colonne:<br /><br />Match Name (text) tipo :Round of 32 - Match 1...16, Round of 16 - Match 1...8, Quarter Final - Match 1...4, Semi Final - Match 1...2, Third Place Match, Final<br /><br />Match Number (number): numero progressive da 73 (Round of 32 - Match 1 e' la 73esima partita del torneo) a 104 (Final e' la 104esima partita del torneo)<br /><br />Phase (single select): Questa colonna e' piu' di controllo per tenere ordinate le varie fasi della fase ad eliminazione: 01 - Round of 32, 02 - Round of 16, 03 - Quarter Final, 04 - Semi Final, 05 - Third Place, 06 - Final<br /><br />Slot A Label (text): indicazioni su come formare gli accoppiamenti (non devono essere scriptati, gli accoppiamenti verrano creati a mano in seguito)<br /><br />Slot B Label (text): come sopra<br /><br />Team A (link to teams): dove viene inserito il primo Team nei vari accoppiamenti<br /><br />Team B (link to teams): come sopra ma per il secondo Team<br /><br />Real Winner (link to teams): dove viene inserito il Vincente della sfida<br /><br />Status (single select): selezione tra "Played" "Not Played"<br /><br />|9. Knockout Matches|`tbl9IUt0116lvkbki`|







// scrivi qui (nome + a cosa serve), oppure "no, solo quelle"
```

\---

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

|A cosa serve nel codice|Placeholder attuale|Nome reale (se diverso)|
|-|-|-|
|Link all'utente proprietario|`User`|\_\_\_\_|
|Numero progressivo della schedina|`Prediction no.` ⚠️|\_\_\_\_|
|Nome / titolo schedina|`Name`|\_\_\_\_|
|Pronostico vincitore Mondiale (link → Teams)|`Predicted World Cup Winner`|\_\_\_\_|
|Pronostico capocannoniere (link → Players)|`Predicted Top Scorer`|\_\_\_\_|
|Flag "gironi bloccati" (checkbox)|`Group Predictions Locked?`|\_\_\_\_|
|Flag "knockout bloccati" (checkbox)|`Knockout Predictions Locked?`|\_\_\_\_|

⚠️ **Domanda:** `Prediction no.` ha davvero quel punto finale `.`? È un
po' insolito come naming. Conferma esattamente: `Prediction no.` /
`Prediction No.` / `Prediction #` / `Number` / altro?



Si, naming giusto.



### D.2 — Tabella `Group Match Predictions` ⭐ (la più importante)

Questa è la tabella su cui il frontend lavora di più. Sii preciso.

|A cosa serve nel codice|Placeholder attuale|Nome reale (se diverso)|Tipo del campo|
|-|-|-|-|
|Link alla schedina|`Prediction Set`|\_\_\_\_|linked record|
|Link alla partita reale|`Group Match`|\_\_\_\_|linked record|
|Lettera del girone (A, B, C…)|`Group`|\_\_\_\_|lookup / formula|
|Nome squadra di casa|`Home Team`|\_\_\_\_|lookup / formula|
|Nome squadra ospite|`Away Team`|\_\_\_\_|lookup / formula|
|Pronostico della partita : 1, X, 2|`Predicted Result`|\_\_\_\_|single select|
|Risultato della partita: 1, X, 2|`Real Result`|\_\_\_\_|lookup|
|Se la partita e' stata giocata o meno (Played, Not Played)|`Match Status`|\_\_\_\_|lookup|
|Calcolatore dei punti per le previsioni corrette|'Points Earned'|\_\_\_\_|formula|

⚠️ **Domanda critica:** `Predicted Home Score` e `Predicted Away Score`
sono di tipo **`Number`** con formato `Integer` (0 decimali)? Non esistono questi valori
Se sono `Single line text`, va saputo perché Roberto dovrà mandare i
numeri come stringhe e attivare il typecast.

Tipo dei due campi score: \[ ] Number integer / \[ ] Single line text / \[ ] altro: \_\_\_\_



### D.3 — Tabella `Group Order Predictions`

|A cosa serve|Placeholder|Nome reale (se diverso)|Tipo|
|-|-|-|-|
|Link alla schedina|`Prediction Set`|\_\_\_\_|linked record|
|Lettera del girone|`Group`|\_\_\_\_|text / lookup|
|Link alla nazionale|`Team`|\_\_\_\_|linked → Teams|
|Posizione predetta in classifica girone|`Predicted Rank`|\_\_\_\_|Number 1–4|
|Posizione reale finale in classifca girone|`Real Final Group Rank`|\_\_\_\_|Number 1–4|
|Calcolatore dei punti per le previsioni corrette|'Points Earned'||formula|

### 

### D.4 — Tabella `Knockout Predictions`

|A cosa serve|Placeholder|Nome reale (se diverso)|Tipo|
|-|-|-|-|
|Link alla schedina|`Prediction Set`|\_\_\_\_|linked record|
|Link alla fase/match|'Knockout Match'||link|
|Fase / round|`Round`|'Phase'|Lookup|
|Codice slot della partita|`Slot`|'Match Number'|Lookup|
|Squadra reale A|`Candidate Team 1`|'Real Team A'|linked → Knockout Matches -> Team A|
|Squadra reale B|`Candidate Team 2`|'Real Team B'|linked → Knockout Matches -> Team B|
|Squadra ipotizzata A|`Candidate Team 1 Name`|'Predicted Team A'|lookup (Teams)|
|Squadra ipotizzata B|`Candidate Team 2 Name`|'Predicted Team B'|lookup (Teams)|
|Squadra vincitrice predetta ✏️|`Predicted Winner`|\_\_\_\_|**linked → Teams**|
|Squadra vincitrice reale|`Real Winner`|\_\_\_\_|lookup (Knockout Matches->Real Winner)|
|Se la partita e' stata giocata o meno (Played, Not Played)|'Match Status'||lookup|
|Calcolatore dei punti per le previsioni corrette|'Points Earned'||formula|

⚠️ **Domanda importante (knockout):** ogni riga di `Knockout Predictions`
ha già le due squadre candidate fisse, oppure dipendono dalle predizioni
precedenti dell'utente (es. "il vincitore di R32-1 vs il vincitore di
R32-2", che cambia a seconda di chi hai pronosticato nei round precedenti)?

\[ ] candidate fisse, già linkate a 2 Team specifici
\[ ] candidate computate dalle predizioni precedenti (segna come)
\[X] non lo so / da capire insieme



Teoricamente l'idea e' quella di finire la fase a gironi, inserire le squadre dei Round of 32 e da li' i giocatori dovrebbero avere una schermata tipo "tabellone" dove sono "forzati" a scegliere chi passa tra due opzioni.

Esempio, gli accoppiamenti dei Round of 32 sono fissi (messi dall'admin), le scelte di chi passa ogni match e' scelto dal singolo utente per la singola schedina (quindi un utente scegliera' che a passare negli scontri tra Germania-Brasile e Francia-Olanda saranno Germania e Olanda, un altro potrebbe scegliere Germania e Francia e cosi' via) 





Per i valori di `Round`: quali sono **esattamente** le label che usate?
(esempio: `Round of 32`, `Round of 16`, `Quarterfinals`, `Semifinals`,
`Final`, `Third place`)

```
// scrivi qui le label reali, una per riga



01 - Round of 32

02 - Round of 16

03 - Quarter Final

04 - Semi Final

05 - Third Place

06 - Final


```

Quante sono in totale le righe knockout in una schedina? (Atteso: 32 per
il formato FIFA 48 squadre. Da confermare.)

**Numero totale righe knockout per schedina:** 32 righe (16 Round of 32, 8 Round of 16, 4 Quater Final, 2 Semi Final, 1 Third Place, 1 Final)



### D.5 — Tabelle `Teams`, `Players`, `Users`

Solo i nomi del campo principale:

|Tabella|Cosa|Placeholder|Nome reale (se diverso)|
|-|-|-|-|
|4. Teams|Nome nazionale|`Name`|'Team Name'|
|4. Teams|Girone di appartenenza|`Group`||
|4. Teams|Bandiera|`Flag`|\_\_\_\_|
|4. Teams|Posizione finale in classifica|`Real Final Group Rank`|\_\_\_\_|
|4. Teams|Checkbox per il calcolatore di punti|'Is Official World Cup Winner?'||
|5. Players|Nome calciatore|'Player Name'||
|5. Players|Squadra (link)|`Team`|\_\_\_\_|
|5. Players|Posizione (Tra G, D, M, F)|`Position`|\_\_\_\_|
|5. Players|Club e sua lega di appartenenza|`Club and League`|\_\_\_\_|
|1. Users|Nome|`Name`|\_\_\_\_|
|1. Users|Email|'Email'||
|1. Users|Ruolo (se Admin o Player)|'Role'||
|1. Users|Numero da aggiungere manualmente per essere sicuri che il giocatore ha richiesto tot numeri di schedine (non attiva nessuna automazione)|'Allowed Prediction Sets'||

\---

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
`records: \[...]`).

Se hai dati sensibili, va benissimo cambiare i valori display dei nomi
squadra in qualcosa di finto. **Non rimuovere i campi tecnici** (id,
arrays di record id linkati, tipi).

**Esempio (sostituisci con il tuo):**

```json
{
  "id": "recXXXXXXXXXXXXXX",
  "createdTime": "2026-05-20T10:00:00.000Z",
  "fields": {
    "Prediction Set": \["recYYYYYYYYYYYYYY"],
    "Group Match":    \["recZZZZZZZZZZZZZZ"],
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


{

&#x20;   "records": \[

&#x20;       {

&#x20;           "id": "recx9VUGrvqmKllvA",

&#x20;           "createdTime": "2026-05-25T16:17:22.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Away Team": \[

&#x20;                   "recxG6NnIpUjtsH2l"

&#x20;               ],

&#x20;               "Points Earned": 1,

&#x20;               "Match Status": \[

&#x20;                   "Played"

&#x20;               ],

&#x20;               "Predicted Result": "X",

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Home Team": \[

&#x20;                   "rec6ggahsc1iEO44k"

&#x20;               ],

&#x20;               "Group Match Predictions To Show": "Group A - South Korea vs Czechia - X",

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - South Korea vs Czechia",

&#x20;               "Group Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group Match": \[

&#x20;                   "rec4XhFx5fcKhLqDJ"

&#x20;               ],

&#x20;               "Real Result": \[

&#x20;                   "X"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "rec2bZkgsjfXRTQBH",

&#x20;           "createdTime": "2026-05-25T16:17:23.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Away Team": \[

&#x20;                   "rec6ggahsc1iEO44k"

&#x20;               ],

&#x20;               "Points Earned": 0,

&#x20;               "Match Status": \[

&#x20;                   "Played"

&#x20;               ],

&#x20;               "Predicted Result": "1",

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Home Team": \[

&#x20;                   "recJlTqkV3RDdQekR"

&#x20;               ],

&#x20;               "Group Match Predictions To Show": "Group A - South Africa vs South Korea - 1",

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - South Africa vs South Korea",

&#x20;               "Group Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group Match": \[

&#x20;                   "recIOteVdi37TrfEd"

&#x20;               ],

&#x20;               "Real Result": \[

&#x20;                   "X"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "rec8S31bqTN5AC2yy",

&#x20;           "createdTime": "2026-05-25T16:17:24.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Away Team": \[

&#x20;                   "recJlTqkV3RDdQekR"

&#x20;               ],

&#x20;               "Points Earned": 1,

&#x20;               "Match Status": \[

&#x20;                   "Played"

&#x20;               ],

&#x20;               "Predicted Result": "2",

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Home Team": \[

&#x20;                   "recohx2ye30y4QnQD"

&#x20;               ],

&#x20;               "Group Match Predictions To Show": "Group A - Mexico vs South Africa - 2",

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Mexico vs South Africa",

&#x20;               "Group Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group Match": \[

&#x20;                   "reczmPElpkVLHcoFl"

&#x20;               ],

&#x20;               "Real Result": \[

&#x20;                   "2"

&#x20;               ]

&#x20;           }

&#x20;       }

&#x20;   ],

&#x20;   "offset": "itreZviIqGxLy15uu/rec8S31bqTN5AC2yy"

}







```

(Se ti va, fai la stessa cosa anche per **Group Order Predictions** e
**Knockout Predictions** — opzionale ma aiuta tantissimo.)

```json
// (opzionale) JSON di una riga di Group Order Predictions



{

&#x20;   "records": \[

&#x20;       {

&#x20;           "id": "recI4jOMfS3TVQQCC",

&#x20;           "createdTime": "2026-05-25T16:17:01.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Group A - Czechia",

&#x20;               "Team": \[

&#x20;                   "recxG6NnIpUjtsH2l"

&#x20;               ],

&#x20;               "Real Final Group Rank": \[

&#x20;                   3

&#x20;               ],

&#x20;               "Name (from Prediction Set)": \[

&#x20;                   "1 - Claudio Cipolletta - 1"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Predicted Rank": "2",

&#x20;               "Group Predictions Locked": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Points Earned": 0,

&#x20;               "Team Name (from Team)": \[

&#x20;                   "Czechia"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "rec0I3MhRApEzhCQQ",

&#x20;           "createdTime": "2026-05-25T16:17:15.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Group A - Mexico",

&#x20;               "Team": \[

&#x20;                   "recohx2ye30y4QnQD"

&#x20;               ],

&#x20;               "Real Final Group Rank": \[

&#x20;                   1

&#x20;               ],

&#x20;               "Name (from Prediction Set)": \[

&#x20;                   "1 - Claudio Cipolletta - 1"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Predicted Rank": "3",

&#x20;               "Group Predictions Locked": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Points Earned": 0,

&#x20;               "Team Name (from Team)": \[

&#x20;                   "Mexico"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "recLogESFw7FjrY96",

&#x20;           "createdTime": "2026-05-25T16:17:15.000Z",

&#x20;           "fields": {

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Group A - South Africa",

&#x20;               "Team": \[

&#x20;                   "recJlTqkV3RDdQekR"

&#x20;               ],

&#x20;               "Real Final Group Rank": \[

&#x20;                   4

&#x20;               ],

&#x20;               "Name (from Prediction Set)": \[

&#x20;                   "1 - Claudio Cipolletta - 1"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Predicted Rank": "1",

&#x20;               "Group Predictions Locked": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Group": \[

&#x20;                   "recjJgoCPw869mLNK"

&#x20;               ],

&#x20;               "Points Earned": 0,

&#x20;               "Team Name (from Team)": \[

&#x20;                   "South Africa"

&#x20;               ]

&#x20;           }

&#x20;       }

&#x20;   ],

&#x20;   "offset": "itreZviIqGxLy15uu/recLogESFw7FjrY96"

}




```

```json
// (opzionale) JSON di una riga di Knockout Predictions



{

&#x20;   "records": \[

&#x20;       {

&#x20;           "id": "rec40cMJo4Zxsc5xm",

&#x20;           "createdTime": "2026-05-25T16:17:08.000Z",

&#x20;           "fields": {

&#x20;               "Points Earned": 0,

&#x20;               "Real Team B": \[

&#x20;                   "recH7V0TBAAZERmIf"

&#x20;               ],

&#x20;               "Phase": \[

&#x20;                   "01 - Round of 32"

&#x20;               ],

&#x20;               "Match Number": \[

&#x20;                   73

&#x20;               ],

&#x20;               "Knockout Match": \[

&#x20;                   "recGhOrYcKuEnH4f0"

&#x20;               ],

&#x20;               "Predicted Team A": \[

&#x20;                   "rec6ggahsc1iEO44k"

&#x20;               ],

&#x20;               "Real Team A": \[

&#x20;                   "rec6ggahsc1iEO44k"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Knockout Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Real Winner": \[

&#x20;                   "rec6ggahsc1iEO44k"

&#x20;               ],

&#x20;               "Predicted Winner": \[

&#x20;                   "recH7V0TBAAZERmIf"

&#x20;               ],

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Round of 32 - Match 1",

&#x20;               "Match Status": \[

&#x20;                   "Not Played"

&#x20;               ],

&#x20;               "Predicted Team B": \[

&#x20;                   "recH7V0TBAAZERmIf"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "recaISIdptIKupd2R",

&#x20;           "createdTime": "2026-05-25T16:17:01.000Z",

&#x20;           "fields": {

&#x20;               "Points Earned": 0,

&#x20;               "Real Team B": \[

&#x20;                   "rectXtbv2fWoOlSmg"

&#x20;               ],

&#x20;               "Phase": \[

&#x20;                   "01 - Round of 32"

&#x20;               ],

&#x20;               "Match Number": \[

&#x20;                   74

&#x20;               ],

&#x20;               "Knockout Match": \[

&#x20;                   "recDy5XovuVWUdbgQ"

&#x20;               ],

&#x20;               "Predicted Team A": \[

&#x20;                   "rec7vsFYEWdulqvaL"

&#x20;               ],

&#x20;               "Real Team A": \[

&#x20;                   "rec7vsFYEWdulqvaL"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Knockout Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Real Winner": \[

&#x20;                   "rec7vsFYEWdulqvaL"

&#x20;               ],

&#x20;               "Predicted Winner": \[

&#x20;                   "rectXtbv2fWoOlSmg"

&#x20;               ],

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Round of 32 - Match 2",

&#x20;               "Match Status": \[

&#x20;                   "Played"

&#x20;               ],

&#x20;               "Predicted Team B": \[

&#x20;                   "rectXtbv2fWoOlSmg"

&#x20;               ]

&#x20;           }

&#x20;       },

&#x20;       {

&#x20;           "id": "recByLFGLo2SonkJq",

&#x20;           "createdTime": "2026-05-25T16:16:59.000Z",

&#x20;           "fields": {

&#x20;               "Points Earned": 5,

&#x20;               "Real Team B": \[

&#x20;                   "recEvADRfRqv1Y95k"

&#x20;               ],

&#x20;               "Phase": \[

&#x20;                   "01 - Round of 32"

&#x20;               ],

&#x20;               "Match Number": \[

&#x20;                   75

&#x20;               ],

&#x20;               "Knockout Match": \[

&#x20;                   "recpC2db2QdHcgRIX"

&#x20;               ],

&#x20;               "Predicted Team A": \[

&#x20;                   "rec51CbAaSYt137Yu"

&#x20;               ],

&#x20;               "Real Team A": \[

&#x20;                   "rec51CbAaSYt137Yu"

&#x20;               ],

&#x20;               "Prediction Set": \[

&#x20;                   "recnWpdJeglgnngOc"

&#x20;               ],

&#x20;               "Knockout Predictions Locked?": \[

&#x20;                   null

&#x20;               ],

&#x20;               "Real Winner": \[

&#x20;                   "recEvADRfRqv1Y95k"

&#x20;               ],

&#x20;               "Predicted Winner": \[

&#x20;                   "recEvADRfRqv1Y95k"

&#x20;               ],

&#x20;               "Prediction Name": "1 - Claudio Cipolletta - 1 - Round of 32 - Match 3",

&#x20;               "Match Status": \[

&#x20;                   "Played"

&#x20;               ],

&#x20;               "Predicted Team B": \[

&#x20;                   "recEvADRfRqv1Y95k"

&#x20;               ]

&#x20;           }

&#x20;       }

&#x20;   ],

&#x20;   "offset": "itreZviIqGxLy15uu/recByLFGLo2SonkJq"

}


```

\---

## 🛠️ F. Helper fields per filtri server-side (opzionale, raccomandato)

Senza questi campi, il frontend funziona lo stesso ma ogni volta che
qualcuno apre una pagina di pronostico carica **tutte** le righe della
tabella e filtra in memoria. Con poche schedine va bene, con molte è
spreco. Crearli è un lavoro di 5 minuti totale.

Se preferisci saltare per ora, scrivi `skip` e si fa dopo.

**Salti questa sezione?** \[ ] sì, skip / \[ ] no, li creo

### Setup (se hai detto no allo skip sopra)

1. Sulla tabella **`Prediction Sets`** crea un nuovo campo:

   * **Field name:** `Record ID`
   * **Field type:** `Formula`
   * **Formula:** `RECORD\_ID()`
   * **Formatting:** lascia default (plain text)



LA FORMULA NON FUNZIONA



2. Sulla tabella **`Group Match Predictions`** crea un nuovo campo:

   * **Field name:** `Prediction Set ID`
   * **Field type:** `Lookup`
   * **Pick a linked record field:** `Prediction Set` (quello che linka
già la schedina)
   * **Pick a field from linked table:** `Record ID` (quello creato al
passo 1)



AGGIUNTI MA LA FORMULA NON FUNZIONA



3. Ripeti **identico al passo 2** anche su:

   * tabella `Group Order Predictions`
   * tabella `Knockout Predictions`

   (Stesso nome del campo: `Prediction Set ID`. Stessa procedura.)



   AGGIUNTI MA LA FORMULA NON FUNZIONA



   ### Verifica

   Apri una qualsiasi riga di una delle tre tabelle di pronostico: il
campo `Prediction Set ID` deve mostrare la stringa `recXXX...` (il
record ID della schedina linkata).

   ### Conferma dei nomi

* `Prediction Sets.Record ID` → creato? \[X] sì / \[ ] no
* `Group Match Predictions.Prediction Set ID` → creato? \[X] sì / \[ ] no
* `Group Order Predictions.Prediction Set ID` → creato? \[X] sì / \[ ] no
* `Knockout Predictions.Prediction Set ID` → creato? \[X] sì / \[ ] no

  Se hai usato nomi diversi, scrivili qui:

  ```
// nome reale del lookup su Group Match Predictions:    \_\_\_\_
// nome reale del lookup su Group Order Predictions:    \_\_\_\_
// nome reale del lookup su Knockout Predictions:       \_\_\_\_
// nome reale della formula RECORD\_ID() su Prediction Sets: \_\_\_\_



  NESSUN NOME DIVERSO, LA FORMULA NON FUNZIONA (QUINDI PER ORA E' SETTATO COME TEXT E NON FORMULA POICHE' ALTRIMENTI NON ME LO FA SALVARE)
```

  \---

  ## ❓ G. Domande aperte / note libere

  Qualsiasi cosa che mi dovrei sapere e che non rientra nei punti sopra:
campi rinominati di recente, righe particolari, vincoli, view che il
frontend dovrebbe rispettare, ecc.

  ```
// scrivi qui (lascia vuoto se nulla)
```

  \---

  ## ✅ Riepilogo per Roberto

  Quando hai finito, controlla di avermi mandato:

* \[ ] Personal Access Token (su canale privato, **non in questo file**)
* \[ ] Base ID (sezione B.1)
* \[ ] Debug Prediction Set ID (sezione B.2)
* \[ ] Table IDs delle 8 tabelle (sezione C)
* \[ ] Nomi reali dei campi quando diversi dal placeholder (sezione D)
* \[ ] Risposta alle 3 domande critiche:

  * \[ ] tipo dei campi score (D.2)
  * \[ ] modello knockout: candidate fisse o computate (D.4)
  * \[ ] `Prediction no.` ha il punto finale? (D.1)
* \[ ] Almeno **un** record JSON di esempio (sezione E)
* \[ ] Sì/no agli helper field per server-side filtering (sezione F)

  Grazie! 🙌

