// Minimal typings for the raw Airtable REST API.
// Only used inside /lib/airtable. The rest of the app must work with /types/domain.

export interface AirtableRecord<F = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: F;
}

export interface AirtableListResponse<F = Record<string, unknown>> {
  records: AirtableRecord<F>[];
  offset?: string;
}

export interface AirtableUpdatePayload<F = Record<string, unknown>> {
  records: Array<{ id: string; fields: F }>;
  typecast?: boolean;
}
