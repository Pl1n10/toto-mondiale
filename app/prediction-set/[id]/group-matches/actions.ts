'use server';

import { revalidatePath } from 'next/cache';

import { updateGroupMatchPredictionsBatch } from '@/lib/airtable/groupMatchPredictions';
import { checkLockGuard } from '@/lib/airtable/predictionSets';
import {
  groupMatchPredictionBatchSchema,
  type GroupMatchPredictionBatchInput,
} from '@/lib/validation/groupMatchPredictionSchema';
import type { GroupMatchPrediction, SaveResult } from '@/types/domain';

export async function saveGroupMatchPredictions(
  input: GroupMatchPredictionBatchInput,
): Promise<SaveResult<GroupMatchPrediction>> {
  const parsed = groupMatchPredictionBatchSchema.safeParse(input);
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

    const result = await updateGroupMatchPredictionsBatch(parsed.data.updates);
    revalidatePath(
      `/prediction-set/${parsed.data.predictionSetId}/group-matches`,
    );
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
