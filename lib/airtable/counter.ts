import 'server-only';

import { listAllRecords } from './client';
import { COUNTER_FIELDS, getAirtableEnv, tableRef } from './config';
import { mapMozzarellaCounter } from './mappers';

/**
 * The "Montepremi Finale" shown on the scoreboard — the live Mozzarella
 * Counter (slice: special prize). The "11. Counter" table holds a single
 * row whose `Mozzarella Counter` formula already returns a formatted string
 * like "65 Mozzarelle" (it scales with the number of prediction sets). We
 * read that one row and pass the string through; Airtable recomputes it, so
 * a fresh load shows the current value (the scoreboard is `force-dynamic`).
 *
 * Returns `null` when Airtable is unconfigured-in-prod oddly empty; the
 * dev/mock path returns a fixed sample so the page stays usable without creds.
 */
export async function fetchMozzarellaCounter(): Promise<string | null> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return '65 Mozzarelle';

  const records = await listAllRecords(tableRef('counter'), {
    fields: [COUNTER_FIELDS.mozzarellaCounter],
    pageSize: 1,
  });
  if (records.length === 0) return null;
  return mapMozzarellaCounter(records[0]);
}
