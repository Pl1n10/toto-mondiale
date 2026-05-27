import 'server-only';

import { listAllRecords, updateRecordsInBatches } from './client';
import {
  KNOCKOUT_PREDICTION_FIELDS,
  KNOCKOUT_PREDICTION_WRITABLE_FIELDS,
  getAirtableEnv,
  tableRef,
} from './config';
import { mapKnockoutPrediction } from './mappers';
import { buildMockKnockoutPredictions } from './mockData';
import type {
  BatchUpdateResult,
  KnockoutPrediction,
  KnockoutPredictionUpdate,
} from '@/types/domain';

const mockStore = new Map<string, KnockoutPrediction[]>();

function getMockBucket(predictionSetId: string): KnockoutPrediction[] {
  let bucket = mockStore.get(predictionSetId);
  if (!bucket) {
    bucket = buildMockKnockoutPredictions(predictionSetId);
    mockStore.set(predictionSetId, bucket);
  }
  return bucket;
}

// Match numbers are dense and ascending across rounds (73..104), so sorting
// by matchNumber yields R32 → R16 → QF → SF → Third Place → Final in order.
function sortKey(a: KnockoutPrediction, b: KnockoutPrediction): number {
  return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
}

export async function fetchKnockoutPredictions(
  predictionSetId: string,
): Promise<KnockoutPrediction[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    return [...getMockBucket(predictionSetId)].sort(sortKey);
  }
  const records = await listAllRecords(tableRef('knockoutPredictions'));
  return records
    .map(mapKnockoutPrediction)
    .filter((r) => r.predictionSetId === predictionSetId)
    .sort(sortKey);
}

function isWritableField(name: string): boolean {
  return KNOCKOUT_PREDICTION_WRITABLE_FIELDS.includes(name);
}

export async function updateKnockoutPredictionsBatch(
  updates: KnockoutPredictionUpdate[],
): Promise<BatchUpdateResult<KnockoutPrediction>> {
  if (updates.length === 0) {
    return { successIds: [], failures: [], updated: [] };
  }

  const { isConfigured } = getAirtableEnv();

  if (!isConfigured) {
    const updated: KnockoutPrediction[] = [];
    for (const u of updates) {
      for (const bucket of mockStore.values()) {
        const i = bucket.findIndex((r) => r.id === u.id);
        if (i >= 0) {
          bucket[i] = { ...bucket[i], predictedWinnerTeamId: u.predictedWinnerTeamId };
          updated.push(bucket[i]);
          break;
        }
      }
    }
    return { successIds: updated.map((u) => u.id), failures: [], updated };
  }

  const payload = updates.map((u) => {
    const fields: Record<string, unknown> = {
      [KNOCKOUT_PREDICTION_FIELDS.predictedWinner]: [u.predictedWinnerTeamId],
    };
    for (const key of Object.keys(fields)) {
      if (!isWritableField(key)) delete fields[key];
    }
    return { id: u.id, fields };
  });

  const result = await updateRecordsInBatches(
    tableRef('knockoutPredictions'),
    payload,
  );
  const updated = result.successRecords.map(mapKnockoutPrediction);
  return {
    successIds: updated.map((u) => u.id),
    failures: result.failures.flatMap((f) =>
      f.ids.map((id) => ({ id, error: f.error })),
    ),
    updated,
  };
}
