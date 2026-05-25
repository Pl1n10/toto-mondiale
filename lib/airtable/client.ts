import 'server-only';

import { getAirtableEnv } from './config';
import type {
  AirtableListResponse,
  AirtableRecord,
  AirtableUpdatePayload,
} from '@/types/airtable';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';
const MAX_PAGE_SIZE = 100;
const MAX_BATCH_SIZE = 10; // Airtable PATCH limit

export class AirtableHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AirtableHttpError';
  }
}

function buildHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

async function airtableFetch(
  url: string,
  init: RequestInit,
  apiToken: string,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...buildHeaders(apiToken), ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new AirtableHttpError(
      `Airtable ${init.method ?? 'GET'} ${res.status}: ${detail || res.statusText}`,
      res.status,
    );
  }
  return res;
}

export interface ListOptions {
  filterByFormula?: string;
  pageSize?: number;
  fields?: string[];
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
}

/** Fetch all records of a table, handling Airtable pagination transparently. */
export async function listAllRecords<F = Record<string, unknown>>(
  tableRef: string,
  options: ListOptions = {},
): Promise<AirtableRecord<F>[]> {
  const { apiToken, baseId, isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    throw new AirtableHttpError(
      'Airtable not configured (missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID).',
      0,
    );
  }
  const out: AirtableRecord<F>[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', String(options.pageSize ?? MAX_PAGE_SIZE));
    if (options.filterByFormula) params.set('filterByFormula', options.filterByFormula);
    if (offset) params.set('offset', offset);
    for (const f of options.fields ?? []) params.append('fields[]', f);
    (options.sort ?? []).forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      if (s.direction) params.set(`sort[${i}][direction]`, s.direction);
    });
    const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableRef)}?${params.toString()}`;
    const res = await airtableFetch(url, { method: 'GET' }, apiToken);
    const json = (await res.json()) as AirtableListResponse<F>;
    out.push(...json.records);
    offset = json.offset;
  } while (offset);
  return out;
}

export async function getRecord<F = Record<string, unknown>>(
  tableRef: string,
  recordId: string,
): Promise<AirtableRecord<F>> {
  const { apiToken, baseId, isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    throw new AirtableHttpError('Airtable not configured.', 0);
  }
  const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableRef)}/${recordId}`;
  const res = await airtableFetch(url, { method: 'GET' }, apiToken);
  return (await res.json()) as AirtableRecord<F>;
}

export interface BatchUpdateChunkResult<F = Record<string, unknown>> {
  successRecords: AirtableRecord<F>[];
  failures: Array<{ ids: string[]; error: string }>;
}

/**
 * Update many records in chunks of MAX_BATCH_SIZE.
 * A failing chunk does NOT abort the rest — partial success is reported back.
 */
export async function updateRecordsInBatches<F extends Record<string, unknown>>(
  tableRef: string,
  updates: Array<{ id: string; fields: F }>,
  options: { typecast?: boolean } = {},
): Promise<BatchUpdateChunkResult<F>> {
  const { apiToken, baseId, isConfigured } = getAirtableEnv();
  if (!isConfigured) {
    throw new AirtableHttpError('Airtable not configured.', 0);
  }

  const successRecords: AirtableRecord<F>[] = [];
  const failures: BatchUpdateChunkResult<F>['failures'] = [];

  for (let i = 0; i < updates.length; i += MAX_BATCH_SIZE) {
    const chunk = updates.slice(i, i + MAX_BATCH_SIZE);
    const payload: AirtableUpdatePayload<F> = {
      records: chunk,
      typecast: options.typecast ?? false,
    };
    const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableRef)}`;
    try {
      const res = await airtableFetch(
        url,
        { method: 'PATCH', body: JSON.stringify(payload) },
        apiToken,
      );
      const json = (await res.json()) as { records: AirtableRecord<F>[] };
      successRecords.push(...json.records);
    } catch (err) {
      failures.push({
        ids: chunk.map((c) => c.id),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { successRecords, failures };
}
