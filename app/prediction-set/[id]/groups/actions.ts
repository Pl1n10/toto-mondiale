'use server';

import { revalidatePath } from 'next/cache';

import { updateGroupMatchPredictionsBatch } from '@/lib/airtable/groupMatchPredictions';
import { updateGroupOrderPredictionsBatch } from '@/lib/airtable/groupOrderPredictions';
import { checkLockGuard } from '@/lib/airtable/predictionSets';
import {
  groupMatchPredictionUpdateSchema,
  type GroupMatchPredictionUpdateInput,
} from '@/lib/validation/groupMatchPredictionSchema';
import {
  groupOrderPredictionBatchSchema,
  type GroupOrderPredictionUpdateInput,
} from '@/lib/validation/groupOrderPredictionSchema';
import { z } from 'zod';
import type {
  BatchUpdateResult,
  GroupMatchPrediction,
  GroupOrderPrediction,
  RecordId,
} from '@/types/domain';

const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

const unifiedSchema = z.object({
  predictionSetId: recordId,
  matchUpdates: z.array(groupMatchPredictionUpdateSchema).max(500),
  orderUpdates: z
    .array(
      z.object({
        id: recordId,
        group: z.string().min(1),
        predictedRank: z.number().int().min(1).max(4),
      }),
    )
    .max(500),
});

export type UnifiedGroupSaveInput = {
  predictionSetId: RecordId;
  matchUpdates: GroupMatchPredictionUpdateInput[];
  orderUpdates: GroupOrderPredictionUpdateInput[];
};

export type UnifiedGroupSaveResult =
  | {
      ok: true;
      matches: BatchUpdateResult<GroupMatchPrediction>;
      order: BatchUpdateResult<GroupOrderPrediction>;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function saveUnifiedGroupPredictions(
  input: UnifiedGroupSaveInput,
): Promise<UnifiedGroupSaveResult> {
  const parsed = unifiedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid payload',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { predictionSetId, matchUpdates, orderUpdates } = parsed.data;

  if (matchUpdates.length === 0 && orderUpdates.length === 0) {
    return {
      ok: false,
      error: 'No changes to save',
    };
  }

  // Run the order-side superRefine guard (duplicate ranks per group) even
  // though the per-update items already validated individually.
  if (orderUpdates.length > 0) {
    const orderCheck = groupOrderPredictionBatchSchema.safeParse({
      predictionSetId,
      updates: orderUpdates,
    });
    if (!orderCheck.success) {
      return {
        ok: false,
        error: 'Invalid order payload',
        fieldErrors: orderCheck.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
  }

  try {
    const lockError = await checkLockGuard(predictionSetId, 'group');
    if (lockError) return { ok: false, error: lockError };

    const [matchesResult, orderResult] = await Promise.all([
      matchUpdates.length > 0
        ? updateGroupMatchPredictionsBatch(matchUpdates)
        : Promise.resolve<BatchUpdateResult<GroupMatchPrediction>>({
            successIds: [],
            failures: [],
            updated: [],
          }),
      orderUpdates.length > 0
        ? updateGroupOrderPredictionsBatch(orderUpdates)
        : Promise.resolve<BatchUpdateResult<GroupOrderPrediction>>({
            successIds: [],
            failures: [],
            updated: [],
          }),
    ]);

    revalidatePath(`/prediction-set/${predictionSetId}/groups`);
    return { ok: true, matches: matchesResult, order: orderResult };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
