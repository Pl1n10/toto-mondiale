import { z } from 'zod';

// Permissive but explicit: real Airtable IDs are `rec[A-Za-z0-9]{14}`;
// mock IDs use the same prefix with arbitrary alphanumerics.
const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

const score = z
  .number({ invalid_type_error: 'Score must be a number' })
  .int('Score must be an integer')
  .min(0, 'Score cannot be negative')
  .max(99, 'Score is unreasonably large');

export const groupMatchPredictionUpdateSchema = z.object({
  id: recordId,
  predictedHomeScore: score,
  predictedAwayScore: score,
});

export const groupMatchPredictionBatchSchema = z.object({
  predictionSetId: recordId,
  // 72 group matches in MVP; cap is generous to absorb future tournament sizes.
  updates: z.array(groupMatchPredictionUpdateSchema).min(1).max(500),
});

export type GroupMatchPredictionUpdateInput = z.infer<
  typeof groupMatchPredictionUpdateSchema
>;
export type GroupMatchPredictionBatchInput = z.infer<
  typeof groupMatchPredictionBatchSchema
>;
