import 'server-only';

import { listAllRecords } from './client';
import { PLAYER_FIELDS, getAirtableEnv, tableRef } from './config';
import { mapPlayer } from './mappers';
import { buildMockTeamsNameMap } from './mockData';
import type { Player } from '@/types/domain';

/**
 * Full Players list (id + name + teamId), sorted by name (slice #15).
 *
 * Feeds the Top Scorer two-step picker (nation → player). The table grows to
 * ~1200 rows once national rosters are final, which is fine: pagination is
 * cheap and the UI never renders a flat 1200-item list (it filters by team).
 * Mock fallback synthesises a couple of players per team so dev works without
 * Airtable creds.
 */
export async function fetchPlayers(): Promise<Player[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    const out: Player[] = [];
    for (const [teamId, teamName] of buildMockTeamsNameMap()) {
      for (let n = 1; n <= 3; n++) {
        out.push({ id: `${teamId}-p${n}`, name: `${teamName} Player ${n}`, teamId });
      }
    }
    return out;
  }

  const records = await listAllRecords(tableRef('players'), {
    fields: [PLAYER_FIELDS.name, PLAYER_FIELDS.team],
  });
  return records.map(mapPlayer).sort((a, b) => a.name.localeCompare(b.name));
}
