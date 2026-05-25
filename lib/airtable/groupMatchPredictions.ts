import 'server-only';

import { listAllRecords, updateRecordsInBatches } from './client';
import {
  GROUP_MATCH_PREDICTION_FIELDS,
  GROUP_MATCH_PREDICTION_WRITABLE_FIELDS,
  getAirtableEnv,
  tableRef,
} from './config';
import { mapGroupMatchPrediction } from './mappers';
import { buildMockGroupMatchPredictions } from './mockData';
import type {
  BatchUpdateResult,
  GroupMatchPrediction,
  GroupMatchPredictionUpdate,
} from '@/types/domain';

// In-memory mock store. Lives only inside the dev server process; resets on restart.
const mockStore = new Map<string, GroupMatchPrediction[]>();

function getMockBucket(predictionSetId: string): GroupMatchPrediction[] {
  let bucket = mockStore.get(predictionSetId);
  if (!bucket) {
    bucket = buildMockGroupMatchPredictions(predictionSetId);
    mockStore.set(predictionSetId, bucket);
  }
  return bucket;
}

function sortKey(a: GroupMatchPrediction, b: GroupMatchPrediction): number {
  const groupCmp = a.group.localeCompare(b.group);
  if (groupCmp !== 0) return groupCmp;
  if (a.matchOrder != null && b.matchOrder != null) return a.matchOrder - b.matchOrder;
  if (a.matchOrder != null) return -1;
  if (b.matchOrder != null) return 1;
  if (a.matchDate && b.matchDate) return a.matchDate.localeCompare(b.matchDate);
  return 0;
}

export async function fetchGroupMatchPredictions(
  predictionSetId: string,
): Promise<GroupMatchPrediction[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    return [...getMockBucket(predictionSetId)].sort(sortKey);
  }

  // TODO(roberto): switch to a server-side filter via `filterByFormula` once a
  // Rollup/Formula field exposing the linked Prediction Set's record ID exists
  // on this table. Airtable cannot filter directly by a linked record's id.
  // For 72 rows × small N of prediction sets the in-memory filter below is fine.
  const records = await listAllRecords(tableRef('groupMatchPredictions'));
  return records
    .map(mapGroupMatchPrediction)
    .filter((r) => r.predictionSetId === predictionSetId)
    .sort(sortKey);
}

function isWritableField(name: string): boolean {
  return GROUP_MATCH_PREDICTION_WRITABLE_FIELDS.includes(name);
}

export async function updateGroupMatchPredictionsBatch(
  updates: GroupMatchPredictionUpdate[],
): Promise<BatchUpdateResult<GroupMatchPrediction>> {
  if (updates.length === 0) {
    return { successIds: [], failures: [], updated: [] };
  }

  const { isConfigured } = getAirtableEnv();

  if (!isConfigured) {
    const updated: GroupMatchPrediction[] = [];
    for (const u of updates) {
      for (const bucket of mockStore.values()) {
        const i = bucket.findIndex((r) => r.id === u.id);
        if (i >= 0) {
          bucket[i] = {
            ...bucket[i],
            predictedHomeScore: u.predictedHomeScore,
            predictedAwayScore: u.predictedAwayScore,
          };
          updated.push(bucket[i]);
          break;
        }
      }
    }
    return {
      successIds: updated.map((u) => u.id),
      failures: [],
      updated,
    };
  }

  const payload = updates.map((u) => {
    const fields: Record<string, unknown> = {
      [GROUP_MATCH_PREDICTION_FIELDS.predictedHomeScore]: u.predictedHomeScore,
      [GROUP_MATCH_PREDICTION_FIELDS.predictedAwayScore]: u.predictedAwayScore,
    };
    // Defense in depth: never let a non-writable field slip into the PATCH payload.
    for (const key of Object.keys(fields)) {
      if (!isWritableField(key)) delete fields[key];
    }
    return { id: u.id, fields };
  });

  const result = await updateRecordsInBatches(
    tableRef('groupMatchPredictions'),
    payload,
  );

  const updated = result.successRecords.map(mapGroupMatchPrediction);
  const successIds = updated.map((u) => u.id);
  const failures = result.failures.flatMap((f) =>
    f.ids.map((id) => ({ id, error: f.error })),
  );

  return { successIds, failures, updated };
}
