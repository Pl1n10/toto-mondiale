'use server';

import { revalidatePath } from 'next/cache';

import { checkOwnershipGuard } from '@/lib/access';
import {
  checkLockGuard,
  updateSpecialPredictions,
} from '@/lib/airtable/predictionSets';
import {
  specialPredictionsSchema,
  type SpecialPredictionsInput,
} from '@/lib/validation/specialPredictionSchema';
import type { PredictionSet } from '@/types/domain';

export type SaveSpecialResult =
  | { ok: true; set: PredictionSet }
  | { ok: false; error: string };

/**
 * Persist the World Cup Winner + Top Scorer predictions (slice #15).
 * Mirrors the other save actions: Zod → ownership guard → lock guard, then
 * the single-record PATCH. These two predictions lock together with the
 * group stage (Roberto: they must close before the tournament starts).
 */
export async function saveSpecialPredictions(
  input: SpecialPredictionsInput,
): Promise<SaveSpecialResult> {
  const parsed = specialPredictionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid payload' };
  }

  try {
    const ownershipError = await checkOwnershipGuard(parsed.data.predictionSetId);
    if (ownershipError) return { ok: false, error: ownershipError };

    const lockError = await checkLockGuard(parsed.data.predictionSetId, 'group');
    if (lockError) return { ok: false, error: lockError };

    const set = await updateSpecialPredictions(parsed.data);
    revalidatePath(`/prediction-set/${parsed.data.predictionSetId}`);
    return { ok: true, set };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
