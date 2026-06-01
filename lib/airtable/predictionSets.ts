import 'server-only';

import { getRecord, listAllRecords } from './client';
import { getAirtableEnv, PREDICTION_SET_FIELDS, tableRef } from './config';
import { mapPredictionSet } from './mappers';
import { buildMockPredictionSet } from './mockData';
import { findUserByEmail } from './users';
import type { PredictionSet } from '@/types/domain';

export async function fetchPredictionSet(id: string): Promise<PredictionSet> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return buildMockPredictionSet(id);
  const record = await getRecord(tableRef('predictionSets'), id);
  return mapPredictionSet(record);
}

/**
 * The prediction sets owned by the logged-in user (dashboard, slice #13).
 *
 * Ownership mirrors {@link checkOwnershipGuard}: session email → Airtable
 * Users row → `PredictionSet.User` linked id. The Prediction Sets table is
 * tiny (~20 rows), so we list all and filter in memory (D-007). Returns
 * them sorted by prediction number. On dev/mock (Airtable unconfigured)
 * returns a single mock set so the dashboard stays usable without creds.
 */
export async function fetchPredictionSetsForUser(
  email: string,
): Promise<PredictionSet[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return [buildMockPredictionSet('recDebugMock000')];

  const me = await findUserByEmail(email);
  if (!me) return [];

  const records = await listAllRecords(tableRef('predictionSets'), {
    fields: [
      PREDICTION_SET_FIELDS.user,
      PREDICTION_SET_FIELDS.name,
      PREDICTION_SET_FIELDS.predictionNumber,
      PREDICTION_SET_FIELDS.groupPredictionsLocked,
      PREDICTION_SET_FIELDS.knockoutPredictionsLocked,
    ],
  });

  return records
    .map(mapPredictionSet)
    .filter((set) => set.userId === me.id)
    .sort((a, b) => (a.predictionNumber ?? 0) - (b.predictionNumber ?? 0));
}

/**
 * Every prediction set with its (Airtable-computed) points, ranked by total
 * desc then by name — the scoreboard (slice #14). Points are read-only here;
 * Airtable recomputes them as matches are played, so a fresh load shows the
 * current standings. On dev/mock returns a small fixed leaderboard.
 */
export async function fetchScoreboard(): Promise<PredictionSet[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    return [buildMockPredictionSet('recDebugMock000')];
  }

  const records = await listAllRecords(tableRef('predictionSets'), {
    fields: [
      PREDICTION_SET_FIELDS.user,
      PREDICTION_SET_FIELDS.name,
      PREDICTION_SET_FIELDS.predictionNumber,
      PREDICTION_SET_FIELDS.groupPredictionsLocked,
      PREDICTION_SET_FIELDS.knockoutPredictionsLocked,
      PREDICTION_SET_FIELDS.groupMatchPoints,
      PREDICTION_SET_FIELDS.groupOrderPoints,
      PREDICTION_SET_FIELDS.knockoutPoints,
      PREDICTION_SET_FIELDS.topScorerPoints,
      PREDICTION_SET_FIELDS.worldCupWinnerPoints,
      PREDICTION_SET_FIELDS.totalPoints,
    ],
  });

  return records.map(mapPredictionSet).sort((a, b) => {
    const diff = (b.points?.total ?? 0) - (a.points?.total ?? 0);
    if (diff !== 0) return diff;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
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
