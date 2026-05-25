import 'server-only';

import { getRecord } from './client';
import { getAirtableEnv, tableRef } from './config';
import { mapPredictionSet } from './mappers';
import { buildMockPredictionSet } from './mockData';
import type { PredictionSet } from '@/types/domain';

export async function fetchPredictionSet(id: string): Promise<PredictionSet> {
  const { isConfigured } = getAirtableEnv();
  if (!isConfigured) return buildMockPredictionSet(id);
  const record = await getRecord(tableRef('predictionSets'), id);
  return mapPredictionSet(record);
}
