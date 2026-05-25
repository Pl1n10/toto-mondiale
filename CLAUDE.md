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
6. `git log --oneline -n 10` + `git status`

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
- Niente auth, backups, payments, admin panel finché non esplicitamente
  richiesto (sono fuori scope per l'MVP)

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

1. ✅ **Group Match Predictions** — vertical slice completa, gira su mock
2. ⏳ **Group Order Predictions** — placeholder; servirà editing UI con
   check duplicate-rank lato client + server (lo schema Zod c'è già)
3. ⏳ **Knockout Predictions** — placeholder; aspettiamo che la struttura
   knockout si stabilizzi prima di costruirci UI sopra
4. ⏳ **Connessione ad Airtable reale** — sostituire placeholder in
   `lib/airtable/config.ts`, aggiungere rollup field per server-side
   filter, settare env vars

Per ogni slice consultare `HANDOFF.md` per lo stato preciso.
