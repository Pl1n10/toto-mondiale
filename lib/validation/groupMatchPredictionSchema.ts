import { z } from 'zod';

// Permissive but explicit: real Airtable IDs are `rec[A-Za-z0-9]{14}`;
// mock IDs use the same prefix with arbitrary alphanumerics.
const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

// Totocalcio outcome: 1 = home win, X = draw, 2 = away win.
const predictedResult = z.enum(['1', 'X', '2'], {
  errorMap: () => ({ message: 'Result must be 1, X, or 2' }),
});

export const groupMatchPredictionUpdateSchema = z.object({
  id: recordId,
  predictedResult,
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
