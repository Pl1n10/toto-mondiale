'use server';

import { revalidatePath } from 'next/cache';

import { checkOwnershipGuard } from '@/lib/access';
import { updateKnockoutPredictionsBatch } from '@/lib/airtable/knockoutPredictions';
import { checkLockGuard } from '@/lib/airtable/predictionSets';
import {
  knockoutPredictionBatchSchema,
  type KnockoutPredictionBatchInput,
} from '@/lib/validation/knockoutPredictionSchema';
import type { KnockoutPrediction, SaveResult } from '@/types/domain';

export async function saveKnockoutPredictions(
  input: KnockoutPredictionBatchInput,
): Promise<SaveResult<KnockoutPrediction>> {
  const parsed = knockoutPredictionBatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid payload',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const ownershipError = await checkOwnershipGuard(parsed.data.predictionSetId);
    if (ownershipError) return { ok: false, error: ownershipError };

    const lockError = await checkLockGuard(parsed.data.predictionSetId, 'knockout');
    if (lockError) return { ok: false, error: lockError };

    const result = await updateKnockoutPredictionsBatch(parsed.data.updates);
    revalidatePath(`/prediction-set/${parsed.data.predictionSetId}/knockout`);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
