import { z } from 'zod';

const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

// Tournament-wide predictions on the Prediction Set record (slice #15).
// Either side may be null (not yet chosen / cleared).
export const specialPredictionsSchema = z.object({
  predictionSetId: recordId,
  predictedWinnerTeamId: recordId.nullable(),
  predictedTopScorerPlayerId: recordId.nullable(),
});

export type SpecialPredictionsInput = z.infer<typeof specialPredictionsSchema>;
