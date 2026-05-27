'use server';

import { revalidatePath } from 'next/cache';

import { updateGroupOrderPredictionsBatch } from '@/lib/airtable/groupOrderPredictions';
import { checkLockGuard } from '@/lib/airtable/predictionSets';
import {
  groupOrderPredictionBatchSchema,
  type GroupOrderPredictionBatchInput,
} from '@/lib/validation/groupOrderPredictionSchema';
import type { GroupOrderPrediction, SaveResult } from '@/types/domain';

export async function saveGroupOrderPredictions(
  input: GroupOrderPredictionBatchInput,
): Promise<SaveResult<GroupOrderPrediction>> {
  const parsed = groupOrderPredictionBatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid payload',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const lockError = await checkLockGuard(parsed.data.predictionSetId, 'group');
    if (lockError) return { ok: false, error: lockError };

    const result = await updateGroupOrderPredictionsBatch(parsed.data.updates);
    revalidatePath(`/prediction-set/${parsed.data.predictionSetId}/group-order`);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
