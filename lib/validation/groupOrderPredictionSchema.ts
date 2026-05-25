import { z } from 'zod';

const recordId = z.string().regex(/^rec[A-Za-z0-9]+$/, 'invalid Airtable record id');

export const groupOrderPredictionUpdateSchema = z.object({
  id: recordId,
  group: z.string().min(1),
  predictedRank: z.number().int().min(1).max(4),
});

export const groupOrderPredictionBatchSchema = z
  .object({
    predictionSetId: recordId,
    updates: z.array(groupOrderPredictionUpdateSchema).min(1).max(500),
  })
  .superRefine((data, ctx) => {
    // No duplicate ranks inside the same group.
    const seen = new Map<string, Set<number>>();
    for (const [i, u] of data.updates.entries()) {
      const bag = seen.get(u.group) ?? new Set<number>();
      if (bag.has(u.predictedRank)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['updates', i, 'predictedRank'],
          message: `Duplicate rank ${u.predictedRank} in ${u.group}`,
        });
      }
      bag.add(u.predictedRank);
      seen.set(u.group, bag);
    }
  });

export type GroupOrderPredictionUpdateInput = z.infer<
  typeof groupOrderPredictionUpdateSchema
>;
export type GroupOrderPredictionBatchInput = z.infer<
  typeof groupOrderPredictionBatchSchema
>;
