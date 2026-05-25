/**
 * Single source of truth for Airtable schema mapping.
 *
 * If a table name or field name changes in Airtable, change it HERE only.
 * Nothing else in the app should reference Airtable strings directly.
 *
 * TODO(roberto): replace placeholders below once the real schema is confirmed.
 *   - prefer `tableId` (tblXXXXXXXXXXXXXX) over `logicalName` once known: it survives renames.
 *   - same for writable score fields and lookup names.
 */

export interface TableConfig {
  /** Human-readable name used in Airtable UI. Used as fallback when tableId is not set. */
  logicalName: string;
  /** Airtable `tblXXXXXXXXXXXXXX` id. Prefer this over logicalName once known. */
  tableId?: string;
}

export const AIRTABLE_TABLES = {
  users: { logicalName: 'Users' },
  predictionSets: { logicalName: 'Prediction Sets' },
  groupMatches: { logicalName: 'Group Matches' },
  groupMatchPredictions: { logicalName: 'Group Match Predictions' },
  groupOrderPredictions: { logicalName: 'Group Order Predictions' },
  knockoutPredictions: { logicalName: 'Knockout Predictions' },
  teams: { logicalName: 'Teams' },
  players: { logicalName: 'Players' },
} satisfies Record<string, TableConfig>;

export type AirtableTableKey = keyof typeof AIRTABLE_TABLES;

/** Resolve a table key to the string the Airtable REST API expects. */
export function tableRef(key: AirtableTableKey): string {
  const t: TableConfig = AIRTABLE_TABLES[key];
  return t.tableId ?? t.logicalName;
}

// ─── Field-name maps ────────────────────────────────────────────────────────
// Each table has a const object whose KEYS are stable internal names and
// whose VALUES are the actual Airtable field names. When Airtable renames a
// field, only the VALUE changes here.

export const USER_FIELDS = {
  name: 'Name',
  email: 'Email',
} as const;

export const PREDICTION_SET_FIELDS = {
  user: 'User',
  predictionNumber: 'Prediction no.',
  name: 'Name',
  predictedWinner: 'Predicted World Cup Winner',
  predictedTopScorer: 'Predicted Top Scorer',
  groupPredictionsLocked: 'Group Predictions Locked?',
  knockoutPredictionsLocked: 'Knockout Predictions Locked?',
} as const;

export const GROUP_MATCH_PREDICTION_FIELDS = {
  // Linked records
  predictionSet: 'Prediction Set',
  groupMatch: 'Group Match',
  // Display fields (likely lookups/formulas — read-only)
  group: 'Group',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  // Ordering hints (any may be absent)
  matchOrder: 'Match Order',
  matchDate: 'Match Date',
  // WRITABLE — the only fields the frontend sends back
  predictedHomeScore: 'Predicted Home Score',
  predictedAwayScore: 'Predicted Away Score',
} as const;

export const GROUP_MATCH_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  GROUP_MATCH_PREDICTION_FIELDS.predictedHomeScore,
  GROUP_MATCH_PREDICTION_FIELDS.predictedAwayScore,
];

export const GROUP_ORDER_PREDICTION_FIELDS = {
  predictionSet: 'Prediction Set',
  group: 'Group',
  team: 'Team',          // linked record → Teams
  teamName: 'Team Name', // lookup, optional
  predictedRank: 'Predicted Rank', // WRITABLE (1..4)
} as const;

export const GROUP_ORDER_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  GROUP_ORDER_PREDICTION_FIELDS.predictedRank,
];

export const KNOCKOUT_PREDICTION_FIELDS = {
  predictionSet: 'Prediction Set',
  round: 'Round',
  slot: 'Slot',
  candidateTeam1: 'Candidate Team 1',
  candidateTeam2: 'Candidate Team 2',
  candidateTeam1Name: 'Candidate Team 1 Name',
  candidateTeam2Name: 'Candidate Team 2 Name',
  predictedWinner: 'Predicted Winner',          // WRITABLE — linked → Teams
  predictedWinnerName: 'Predicted Winner Name', // lookup, optional
} as const;

export const KNOCKOUT_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  KNOCKOUT_PREDICTION_FIELDS.predictedWinner,
];

export const TEAM_FIELDS = {
  name: 'Name',
  code: 'Code',
  group: 'Group',
} as const;

export const PLAYER_FIELDS = {
  name: 'Name',
  team: 'Team',
} as const;

// ─── Runtime env access (server-only) ───────────────────────────────────────

export function getAirtableEnv() {
  const apiToken = process.env.AIRTABLE_API_TOKEN ?? '';
  const baseId = process.env.AIRTABLE_BASE_ID ?? '';
  const debugPredictionSetId = process.env.DEBUG_PREDICTION_SET_ID ?? '';
  const isConfigured = apiToken.length > 0 && baseId.length > 0;
  return { apiToken, baseId, debugPredictionSetId, isConfigured };
}
