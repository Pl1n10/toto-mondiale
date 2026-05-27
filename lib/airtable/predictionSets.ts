import 'server-only';

import { getRecord } from './client';
import { getAirtableEnv, tableRef } from './config';
import { mapPredictionSet } from './mappers';
import { buildMockPredictionSet } from './mockData';
import type { PredictionSet } from '@/types/domain';

export async function fetchPredictionSet(id: string): Promise<PredictionSet> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return buildMockPredictionSet(id);
  const record = await getRecord(tableRef('predictionSets'), id);
  return mapPredictionSet(record);
}

export type LockKind = 'group' | 'knockout';

/** Defense-in-depth server-side check (D-022 step b). Re-fetches the
 *  Prediction Set right before a mutation and returns a user-facing
 *  error message if the relevant lock flag is set; `null` otherwise.
 *  Server actions call this after Zod validation, before the PATCH. */
export async function checkLockGuard(
  predictionSetId: string,
  kind: LockKind,
): Promise<string | null> {
  const set = await fetchPredictionSet(predictionSetId);
  const flag =
    kind === 'group' ? set.groupPredictionsLocked : set.knockoutPredictionsLocked;
  if (flag === true) {
    const label = kind === 'group' ? 'gironi' : 'knockout';
    return `Schedina lockata: modifiche ${label} disabilitate.`;
  }
  return null;
}
