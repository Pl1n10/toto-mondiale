# Toto Mondiale — custom frontend

Custom web frontend for the Toto Mondiale World Cup prediction game.
Airtable is the database; this Next.js app reads existing prediction rows and
sends batch updates back through a server-side adapter.

The Airtable API token never reaches the browser.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (no UI kit for now)
- Zod for payload validation
- Native `fetch` against the Airtable REST API (no SDK dependency)

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:

```
AIRTABLE_API_TOKEN=         # Personal access token with read/write on the base
AIRTABLE_BASE_ID=           # appXXXXXXXXXXXXXX
DEBUG_PREDICTION_SET_ID=    # recXXXXXXXXXXXXXX — a Prediction Set to navigate to in dev
```

If `AIRTABLE_API_TOKEN` or `AIRTABLE_BASE_ID` are empty, the app runs on
in-memory mock data (72 group matches, 48 group orders, 32 knockout slots).
This makes the UI usable on day zero without Airtable access.

The dashboard shows a banner when env vars are missing.

## Run locally

```
npm install
cp .env.example .env.local
# edit .env.local
npm run dev
```

Then open <http://localhost:3000>. The root redirects to `/dashboard`, which
links to `/prediction-set/<DEBUG_PREDICTION_SET_ID>`.

Type-check (no emit):

```
npm run typecheck
```

## Where Airtable mapping lives

All Airtable table names and field names are centralised in:

```
lib/airtable/config.ts
```

Each table has a constant like `GROUP_MATCH_PREDICTION_FIELDS` whose **keys**
are stable internal names and whose **values** are the actual Airtable field
names. When a field is renamed in Airtable, change only the value here.

Writable fields are listed separately (e.g.
`GROUP_MATCH_PREDICTION_WRITABLE_FIELDS`). The service layer strips
non-writable fields before issuing the `PATCH`, so a stray lookup/formula
field can never sneak into an update payload.

## Adapter structure

```
lib/airtable/
  config.ts                     ← single source of truth for tables/fields/env
  client.ts                     ← low-level HTTP (auth, pagination, batched PATCH)
  mappers.ts                    ← raw AirtableRecord  →  domain object
  mockData.ts                   ← in-memory fallback when env not set
  predictionSets.ts             ← fetchPredictionSet
  groupMatchPredictions.ts      ← fetch + batch update (vertical slice #1)
  groupOrderPredictions.ts      ← fetch + batch update (skeleton)
  knockoutPredictions.ts        ← fetch + batch update (skeleton)
```

The client splits updates into chunks of 10 (Airtable PATCH limit) and reports
partial failures back to the caller as `{ successIds, failures, updated }`.

## App layers

```
app/                            ← App Router pages + server actions
  dashboard/page.tsx
  prediction-set/[id]/page.tsx
  prediction-set/[id]/group-matches/{page.tsx, actions.ts}
  prediction-set/[id]/group-order/page.tsx        (read-only placeholder)
  prediction-set/[id]/knockout/page.tsx           (read-only placeholder)

components/
  ui/{LoadingState, ErrorState, SaveBar}.tsx
  predictions/{MatchPredictionTable, GroupOrderTable, KnockoutTable}.tsx

lib/
  airtable/...                  ← service layer (see above)
  validation/*.ts               ← Zod schemas for each batch payload

types/
  domain.ts                     ← User, PredictionSet, *Prediction, *Update, BatchUpdateResult
  airtable.ts                   ← raw API typings (internal to /lib/airtable)
```

UI components consume **normalised domain objects only**. They never see raw
Airtable field names.

## Vertical slice that works today

`/prediction-set/[id]/group-matches`:

1. Fetches all Group Match Predictions linked to the given Prediction Set.
2. Groups them by `group` (Group A, Group B, …).
3. Renders an editable compact table: home team, score, score, away team.
4. Tracks per-row state: clean / dirty / saving / saved / error
   (small coloured dot in the leftmost column).
5. Bottom save bar shows `N rows modified` + a single `Save predictions`
   button. No autosave.
6. On save: validates 0–99 integer scores client-side, then sends only dirty
   rows to a server action. Server action re-validates with Zod, calls the
   Airtable batch update, and revalidates the page.
7. Partial failures are surfaced per-row (failed rows stay red and keep the
   user's input, successful rows turn green).

## Switching from mock to real Airtable

1. Set `AIRTABLE_API_TOKEN` and `AIRTABLE_BASE_ID` in `.env.local`.
2. Open `lib/airtable/config.ts` and confirm:
   - Each `TableConfig.logicalName` matches the real Airtable table name, or
     set `tableId` to the `tblXXXXXXXXXXXXXX` id (preferred — survives renames).
   - Each `*_FIELDS` map has the real Airtable field names as VALUES.
   - The `*_WRITABLE_FIELDS` lists only the columns the frontend is allowed
     to PATCH.
3. Set `DEBUG_PREDICTION_SET_ID` to a real `recXXXXXXXXXXXXXX`.
4. Reload `/dashboard` — the banner about mock mode should disappear.

### Known limitation: server-side filter by prediction set

Airtable's `filterByFormula` cannot reference a linked record's record ID
directly. The MVP works around this by fetching every Group Match Prediction
row and filtering in-memory by `predictionSetId`. With 72 rows this is fine.

To switch to a server-side filter, add a Rollup or Formula field on each
prediction table that exposes the linked Prediction Set's record ID
(e.g. `Prediction Set ID`), then replace the in-memory filter in
`fetchGroupMatchPredictions` (and the equivalent in the other services)
with a `filterByFormula` query.

## Not implemented yet (by design)

- Authentication / authorisation
- Backups
- Payments
- Admin panel
- Production hardening (rate limiting, CSP, etc.)
- Migration away from Airtable
- Creation of prediction rows (Airtable Automations already generate them)
- Group Order editing UI (skeleton present; vertical slice #2)
- Knockout editing UI (skeleton present; vertical slice #3)

## TODOs marked in the code

Look for `TODO(roberto)` in:

- `lib/airtable/config.ts` — confirm table/field names against the live base
- `lib/airtable/groupMatchPredictions.ts` — swap in-memory filter for
  `filterByFormula` once a rollup/formula field is available
- `.env.example` — fill in real values
