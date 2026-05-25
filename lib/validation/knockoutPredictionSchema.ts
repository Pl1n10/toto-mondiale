import { z } from 'zod';

const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

export const knockoutPredictionUpdateSchema = z.object({
  id: recordId,
  predictedWinnerTeamId: recordId,
});

export const knockoutPredictionBatchSchema = z.object({
  predictionSetId: recordId,
  updates: z.array(knockoutPredictionUpdateSchema).min(1).max(64),
});

export type KnockoutPredictionUpdateInput = z.infer<
  typeof knockoutPredictionUpdateSchema
>;
export type KnockoutPredictionBatchInput = z.infer<
  typeof knockoutPredictionBatchSchema
>;
