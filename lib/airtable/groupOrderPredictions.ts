import 'server-only';

import { listAllRecords, updateRecordsInBatches } from './client';
import {
  GROUP_FIELDS,
  GROUP_ORDER_PREDICTION_FIELDS,
  GROUP_ORDER_PREDICTION_WRITABLE_FIELDS,
  getAirtableEnv,
  tableRef,
} from './config';
import { mapGroupOrderPrediction } from './mappers';
import { buildMockGroupOrderPredictions } from './mockData';
import type {
  BatchUpdateResult,
  GroupOrderPrediction,
  GroupOrderPredictionUpdate,
} from '@/types/domain';

const RECORD_ID = /^rec[A-Za-z0-9]+$/;

// Skeleton — full editing UI and validation come after the Group Match slice.

const mockStore = new Map<string, GroupOrderPrediction[]>();

function getMockBucket(predictionSetId: string): GroupOrderPrediction[] {
  let bucket = mockStore.get(predictionSetId);
  if (!bucket) {
    bucket = buildMockGroupOrderPredictions(predictionSetId);
    mockStore.set(predictionSetId, bucket);
  }
  return bucket;
}

export async function fetchGroupOrderPredictions(
  predictionSetId: string,
): Promise<GroupOrderPrediction[]> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    return [...getMockBucket(predictionSetId)].sort(
      (a, b) => a.group.localeCompare(b.group) || a.teamName.localeCompare(b.teamName),
    );
  }
  // Fetch the Groups table alongside the predictions so we can resolve the
  // linked-record id stored in `Group Name` back into "Group A".."Group L".
  // Group Match Predictions already do the same enrichment; without it on
  // this side the unified page can't merge the two halves by group key.
  const [records, groupRecords] = await Promise.all([
    listAllRecords(tableRef('groupOrderPredictions')),
    listAllRecords(tableRef('groups'), { fields: [GROUP_FIELDS.groupName] }),
  ]);
  const groupNameById = new Map<string, string>();
  for (const r of groupRecords) {
    const name = r.fields[GROUP_FIELDS.groupName];
    if (typeof name === 'string') groupNameById.set(r.id, name);
  }
  return records
    .map(mapGroupOrderPrediction)
    .filter((r) => r.predictionSetId === predictionSetId)
    .map((r) => ({
      ...r,
      group: RECORD_ID.test(r.group)
        ? groupNameById.get(r.group) ?? r.group
        : r.group,
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.teamName.localeCompare(b.teamName));
}

function isWritableField(name: string): boolean {
  return GROUP_ORDER_PREDICTION_WRITABLE_FIELDS.includes(name);
}

/**
 * Reserved for the next vertical slice. Backend validation of the
 * "no duplicate ranks in same group" rule must run before the PATCH.
 * Left as a placeholder that already maps domain → Airtable correctly.
 */
export async function updateGroupOrderPredictionsBatch(
  updates: GroupOrderPredictionUpdate[],
): Promise<BatchUpdateResult<GroupOrderPrediction>> {
  if (updates.length === 0) {
    return { successIds: [], failures: [], updated: [] };
  }

  const { isConfigured } = getAirtableEnv();

  if (!isConfigured) {
    const updated: GroupOrderPrediction[] = [];
    for (const u of updates) {
      for (const bucket of mockStore.values()) {
        const i = bucket.findIndex((r) => r.id === u.id);
        if (i >= 0) {
          bucket[i] = { ...bucket[i], predictedRank: u.predictedRank };
          updated.push(bucket[i]);
          break;
        }
      }
    }
    return { successIds: updated.map((u) => u.id), failures: [], updated };
  }

  const payload = updates.map((u) => {
    // Predicted Rank is a Single-line-text field in Airtable. typecast is
    // string-to-target, NOT integer-to-text, so we must serialize to string
    // ourselves (D-016 revised: empirical 422 confirmed integer+typecast
    // does not coerce).
    const fields: Record<string, unknown> = {
      [GROUP_ORDER_PREDICTION_FIELDS.predictedRank]: String(u.predictedRank),
    };
    for (const key of Object.keys(fields)) {
      if (!isWritableField(key)) delete fields[key];
    }
    return { id: u.id, fields };
  });

  const result = await updateRecordsInBatches(
    tableRef('groupOrderPredictions'),
    payload,
  );
  const updated = result.successRecords.map(mapGroupOrderPrediction);
  return {
    successIds: updated.map((u) => u.id),
    failures: result.failures.flatMap((f) =>
      f.ids.map((id) => ({ id, error: f.error })),
    ),
    updated,
  };
}
