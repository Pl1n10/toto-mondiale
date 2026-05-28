# CLAUDE.md — Toto Mondiale (local)

> Project-specific instructions. Loaded by Claude Code in every session
> opened in this directory. Use together with `~/.claude/CLAUDE.md`.

## Cos'è

Custom web frontend per **Toto Mondiale**, gioco di pronostici della Coppa
del Mondo. Sostituisce un precedente setup Glide/Softr. **Airtable resta il
backend/database**; questa app legge le righe di pronostico già generate
dalle Automation di Airtable e permette all'utente di compilarle.

Un VPS sta tra il browser e Airtable — **il token Airtable non deve mai
arrivare al client**.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS (no UI kit)
- Zod per validazione payload
- `fetch` nativo verso Airtable REST API (nessun SDK)
- Auth.js v5 (next-auth@beta) + Prisma + SQLite per sessioni/magic-link
  (slice #8 in corso). Airtable resta il source of truth per le
  identità "di gioco"; SQLite contiene solo session/token/account.
- Resend per spedire i magic link (slice #8c)
- npm (Node 24 ok)

## Architettura — i 4 layer

```
UI components   ← lavorano SOLO su tipi domain.ts
       ↓
Server Actions  ← validano payload con Zod, chiamano il service layer
       ↓
Airtable service ← una funzione per use-case (fetch / batch update)
       ↓
Airtable adapter ← config (mapping campi), client (HTTP+paging+batch),
                   mappers (raw → domain)
```

**Regola d'oro:** i nomi dei campi Airtable esistono solo dentro
`lib/airtable/config.ts` e `lib/airtable/mappers.ts`. Mai altrove.

## File da leggere all'inizio di ogni sessione

1. `~/.claude/CLAUDE.md` (global)
2. `./CLAUDE.md` (questo file)
3. `./HANDOFF.md` (stato corrente del task)
4. `./DECISIONS.md` se servono motivazioni di scelte architetturali
5. `./ANTIPATTERNS.md` se stai per toccare l'adapter o la save flow
6. `./AIRTABLE_INFO_KNOCKOUT.md` se stai per partire con lo slice #3
7. `git log --oneline -n 10` + `git status`

## Comandi per lo stato verde

```
npm run typecheck       # tsc --noEmit
npm run build           # next build (full SSR + linting)
npm run dev             # http://localhost:3000
```

Smoke test rapido senza Airtable: app gira su mock data se le env
`AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` sono vuote.

## Dove vivono le cose

| Cosa | Dove |
|---|---|
| Mapping Airtable (UNICA fonte) | `lib/airtable/config.ts` |
| HTTP client + paginazione + batch PATCH | `lib/airtable/client.ts` |
| Raw record → domain object | `lib/airtable/mappers.ts` |
| Per-tabella fetch/update | `lib/airtable/<tabella>.ts` |
| Mock data fallback | `lib/airtable/mockData.ts` |
| Tipi di dominio | `types/domain.ts` |
| Schemi Zod | `lib/validation/*Schema.ts` |
| Server Actions | `app/.../actions.ts` (colocate con la page) |
| UI riusabile | `components/ui/` |
| Tabelle predizioni | `components/predictions/` |
| Auth.js config + provider | `lib/auth.ts` |
| Prisma client singleton | `lib/db.ts` |
| Schema sessioni / token | `prisma/schema.prisma` |
| Auth API handler | `app/api/auth/[...nextauth]/route.ts` |

## Cosa NON fare in questo repo

Estratti da `ANTIPATTERNS.md`, qui per visibilità:

- **Mai** chiamare l'Airtable REST API da un client component
- **Mai** mandare in PATCH un campo non presente in `*_WRITABLE_FIELDS`
- **Mai** spezzare la dipendenza "UI → domain types" inserendo nomi di
  campo Airtable nelle pagine o nei componenti
- **Mai** fare PATCH con più di 10 record in una sola richiesta (limite
  Airtable); usa `updateRecordsInBatches` che già chunka
- **Mai** introdurre autosave per cella; la UX scelta è save batch
  esplicito (vedi DECISIONS.md)
- **Mai** committare `.env.local` o token Airtable
- **Mai** committare `dev.db` (SQLite Auth.js, gitignored) o gli
  `AUTH_*` secrets
- Niente backups, payments, admin panel finché non esplicitamente
  richiesto (sono fuori scope per l'MVP). L'auth è invece IN scope
  con slice #8.

## Workflow concordato

- Vertical slice alla volta, ogni slice ha: domain types → service →
  validation → UI → page → smoke test
- Un solo bottone "Save predictions", no autosave
- Partial-failure handling: righe ok diventano verdi, righe fallite
  restano rosse con l'input utente preservato
- `HANDOFF.md` aggiornato a fine step, nello stesso commit
- Commit message inglesi, factual, con
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

## Slice in roadmap

1. ✅ **Group Match Predictions** — slice completa contro Airtable reale,
   modello segno **1/X/2** (Totocalcio, vedi D-015). Niente score esatto.
2. ✅ **Group Order Predictions** — slice completa contro Airtable reale,
   pill 1·2·3·4 con duplicate-rank guard live (client + Zod superRefine).
3. ✅ **Knockout Predictions** — slice completa contro Airtable reale.
   Cascata client-side derivata dai `Slot A/B Label` del Knockout Match
   table (parser in `lib/knockout/bracketTopology.ts`); PATCH solo su
   `Predicted Winner`; cascata invalidata + save check completezza
   gestiti via dot ambra. Save end-to-end verificato in browser.
4. ✅ **Lock read-only frontend (slice #4)** — le 3 pagine leggono i
   flag `Group/Knockout Predictions Locked?` dal PredictionSet e
   passano `readOnly: boolean` ai componenti tabella. Quando lockato:
   `<LockBanner />` giallo + pill `disabled` + SaveBar nascosta.
   D-022 step (a).
5. ✅ **Server-side lock guard (slice #5)** — `checkLockGuard()` in
   `lib/airtable/predictionSets.ts`, chiamato da tutte le server
   action subito dopo Zod e prima del PATCH. Difende contro payload
   inviati a mano da client malevoli. D-022 step (b).
6. ✅ **Connessione ad Airtable reale** — base reale `appPV77eshDFrfgII`
   integrata: tutti i Table IDs in `config.ts`, enrichment server-side
   per i nomi Team/Group, save end-to-end verde su slice #1, #2, #3.
   PAT deve avere scopes `data.records:read` + `data.records:write`
   (D-019).
7. ✅ **Unified Group Predictions page (slice #7)** — route
   `/prediction-set/[id]/groups` che mostra per ogni girone i 6 match
   1/X/2 + le 4 squadre con pill 1·2·3·4, una sola SaveBar che fa
   entrambi i batch PATCH in parallelo (`saveUnifiedGroupPredictions`).
   Validata da Cipo il 2026-05-28: le vecchie `/group-matches` e
   `/group-order` (+ componenti `MatchPredictionTable`/`GroupOrderTable`)
   sono state rimosse. Completeness check opzione C: `window.confirm`
   "Schedina incompleta — salvare comunque la bozza?" sia sulla pagina
   unificata che sul knockout (limitata a Finale + Terzo posto, gli
   altri round sono già gated da "Complete previous round").
8. 🟡 **Auth + visibility model (slice #8)** — IN CORSO. Sotto-slice:
   - 8a ✅ Scaffold Auth.js v5 + Prisma + SQLite, providers vuoti.
   - 8b ⏳ Google OAuth provider + pagina `/sign-in`.
   - 8c ⏳ Email magic link via Resend.
   - 8d ⏳ `signIn` callback: lookup email su Airtable Users, blocca
     se non presente.
   - 8e ⏳ Middleware: gating su `/prediction-set/*`.
   - 8f ⏳ Filtro server-side per visibility model: vede solo le sue
     durante unlocked, tutte read-only durante locked.

Per ogni slice consultare `HANDOFF.md` per lo stato preciso.
