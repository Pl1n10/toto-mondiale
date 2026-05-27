import 'server-only';

import { listAllRecords } from './client';
import { TEAM_FIELDS, getAirtableEnv, tableRef } from './config';
import { buildMockTeamsNameMap } from './mockData';
import type { RecordId } from '@/types/domain';

/** Id -> name map for the Teams table. Used by pages that display team
 *  names resolved from linked-record ids. Cheap (~48 rows). */
export async function fetchTeamsNameMap(): Promise<Map<RecordId, string>> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return buildMockTeamsNameMap();

  const records = await listAllRecords(tableRef('teams'), {
    fields: [TEAM_FIELDS.name],
  });
  const map = new Map<RecordId, string>();
  for (const r of records) {
    const name = r.fields[TEAM_FIELDS.name];
    if (typeof name === 'string') map.set(r.id, name);
  }
  return map;
}
