import 'server-only';

import { listAllRecords } from './client';
import { getAirtableEnv, tableRef } from './config';
import { mapKnockoutMatch } from './mappers';
import { buildMockKnockoutMatches } from './mockData';
import type { KnockoutMatch } from '@/types/domain';

/** Fetch the 32 Knockout Match fixture rows. Read-only: this table is
 *  populated by the admin and exposes the bracket topology to the client
 *  via the `Slot A/B Label` fields. */
export async function fetchKnockoutMatches(): Promise<KnockoutMatch[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    return buildMockKnockoutMatches();
  }
  const records = await listAllRecords(tableRef('knockoutMatches'));
  return records.map(mapKnockoutMatch).sort((a, b) => a.matchNumber - b.matchNumber);
}
