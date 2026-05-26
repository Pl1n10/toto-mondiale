/**
 * Single source of truth for Airtable schema mapping.
 *
 * If a table name or field name changes in Airtable, change it HERE only.
 * Nothing else in the app should reference Airtable strings directly.
 *
 * Table IDs and field names below come from `AIRTABLE_INFO (1).md` filled in
 * by Cipo on 2026-05-26. Prefer `tableId` over `logicalName`: it survives
 * Airtable renames.
 */

export interface TableConfig {
  /** Human-readable name used in Airtable UI. Used as fallback when tableId is not set. */
  logicalName: string;
  /** Airtable `tblXXXXXXXXXXXXXX` id. Prefer this over logicalName once known. */
  tableId?: string;
}

export const AIRTABLE_TABLES = {
  users:                  { logicalName: '1. Users',                    tableId: 'tblV5hSUCFmUa6QKe' },
  predictionSets:         { logicalName: '2. Prediction Sets',          tableId: 'tblLdjuoKI5cGlTm9' },
  groups:                 { logicalName: '3. Groups',                   tableId: 'tbl9kH827Vv3Md3qA' },
  teams:                  { logicalName: '4. Teams',                    tableId: 'tblSrIn15i31xbfmU' },
  players:                { logicalName: '5. Players',                  tableId: 'tblRKG9GlTqsaQvGm' },
  groupMatches:           { logicalName: '6. Group Matches',            tableId: 'tblqsGL0EJvfSlrgD' },
  groupMatchPredictions:  { logicalName: '7. Group Match Predictions',  tableId: 'tblZbCTCA0vkG9DKZ' },
  groupOrderPredictions:  { logicalName: '8. Group Order Predictions',  tableId: 'tblrrWqCozhBK9E0c' },
  knockoutMatches:        { logicalName: '9. Knockout Matches',         tableId: 'tbl9IUt0116lvkbki' },
  knockoutPredictions:    { logicalName: '10. Knockout Predictions',    tableId: 'tblcb4XGJ97WFa2DT' },
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
  role: 'Role',                                // single select: Admin / Player
  allowedPredictionSets: 'Allowed Prediction Sets',
} as const;

export const PREDICTION_SET_FIELDS = {
  user: 'User',
  predictionNumber: 'Prediction no.',          // confirmed by Cipo: yes, with trailing dot
  name: 'Name',
  predictedWinner: 'Predicted World Cup Winner',
  predictedTopScorer: 'Predicted Top Scorer',
  groupPredictionsLocked: 'Group Predictions Locked?',
  knockoutPredictionsLocked: 'Knockout Predictions Locked?',
} as const;

export const GROUP_FIELDS = {
  groupName: 'Group Name',                     // e.g. "Group A".."Group L"
} as const;

export const GROUP_MATCH_PREDICTION_FIELDS = {
  // Linked records
  predictionSet: 'Prediction Set',
  groupMatch: 'Group Match',
  // Display fields — lookups; Home/Away Team return Team record IDs (array),
  // Group returns a Group record ID (array). Resolving to a readable name
  // requires either a `Team Name (from ...)` lookup or a secondary fetch.
  // TODO: when slice #1 is refactored to 1/X/2, ask Cipo to add lookups
  //       `Home Team Name`, `Away Team Name`, `Group Letter` so the mapper
  //       can read names directly.
  group: 'Group',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  // Ordering hints (any may be absent — Airtable JSON did not show these
  // in the sample record, kept as best-effort)
  matchOrder: 'Match Order',
  matchDate: 'Match Date',
  // WRITABLE — see D-015: the only user input is a single-select 1 / X / 2.
  predictedResult: 'Predicted Result',
  // Read-only (lookups / formulas) — NEVER include in PATCH payloads.
  realResult: 'Real Result',
  matchStatus: 'Match Status',                 // "Played" / "Not Played"
  pointsEarned: 'Points Earned',
} as const;

export const GROUP_MATCH_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  GROUP_MATCH_PREDICTION_FIELDS.predictedResult,
];

export const GROUP_ORDER_PREDICTION_FIELDS = {
  predictionSet: 'Prediction Set',
  group: 'Group',
  team: 'Team',                                // linked record → Teams
  teamName: 'Team Name (from Team)',           // lookup, exact name from JSON sample
  predictedRank: 'Predicted Rank',             // WRITABLE — single-line text in Airtable; values "1".."4". See D-016: PATCH with typecast:true.
  realFinalGroupRank: 'Real Final Group Rank', // read-only lookup
  pointsEarned: 'Points Earned',               // read-only formula
} as const;

export const GROUP_ORDER_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  GROUP_ORDER_PREDICTION_FIELDS.predictedRank,
];

export const KNOCKOUT_MATCH_FIELDS = {
  matchName: 'Match Name',                     // text, e.g. "Round of 32 - Match 1"
  matchNumber: 'Match Number',                 // number 73..104
  phase: 'Phase',                              // single select "01 - Round of 32" .. "06 - Final"
  slotALabel: 'Slot A Label',
  slotBLabel: 'Slot B Label',
  teamA: 'Team A',                             // linked → Teams (set by admin after groups)
  teamB: 'Team B',
  realWinner: 'Real Winner',                   // linked → Teams
  status: 'Status',                            // single select "Played" / "Not Played"
} as const;

export const KNOCKOUT_PREDICTION_FIELDS = {
  predictionSet: 'Prediction Set',
  knockoutMatch: 'Knockout Match',             // linked → Knockout Matches
  // Display / context fields (lookups from Knockout Match) — read-only.
  round: 'Phase',                              // lookup, "01 - Round of 32" etc.
  slot: 'Match Number',                        // lookup, 73..104
  candidateTeam1: 'Real Team A',               // linked → Teams (admin-set Team A)
  candidateTeam2: 'Real Team B',
  candidateTeam1Name: 'Predicted Team A',      // lookup of Team A name. NOTE semantics TBD: per Cipo's note in D.4, the Round-of-32 pairings are admin-fixed; deeper rounds depend on the user's earlier knockout picks. Revisit when slice #3 is implemented.
  candidateTeam2Name: 'Predicted Team B',
  // WRITABLE — user picks the winner team.
  predictedWinner: 'Predicted Winner',          // linked → Teams
  // Read-only.
  realWinner: 'Real Winner',                    // lookup of Knockout Matches.Real Winner
  matchStatus: 'Match Status',                  // "Played" / "Not Played"
  pointsEarned: 'Points Earned',                // formula
} as const;

export const KNOCKOUT_PREDICTION_WRITABLE_FIELDS: readonly string[] = [
  KNOCKOUT_PREDICTION_FIELDS.predictedWinner,
];

export const TEAM_FIELDS = {
  name: 'Team Name',
  group: 'Group',
  flag: 'Flag',
  realFinalGroupRank: 'Real Final Group Rank',
  isOfficialWinner: 'Is Official World Cup Winner?',
} as const;

export const PLAYER_FIELDS = {
  name: 'Player Name',
  team: 'Team',
  position: 'Position',                        // G / D / M / F
  clubAndLeague: 'Club and League',
} as const;

/** Round labels used in Airtable Phase single-select. Kept here so UI can
 *  map them to user-facing strings without re-spelling Airtable values. */
export const KNOCKOUT_ROUND_LABELS = [
  '01 - Round of 32',
  '02 - Round of 16',
  '03 - Quarter Final',
  '04 - Semi Final',
  '05 - Third Place',
  '06 - Final',
] as const;

/** Group Match prediction values used in Airtable single-select. */
export const GROUP_MATCH_RESULT_VALUES = ['1', 'X', '2'] as const;
export type GroupMatchResult = (typeof GROUP_MATCH_RESULT_VALUES)[number];

// ─── Runtime env access (server-only) ───────────────────────────────────────

export function getAirtableEnv() {
  const apiToken = process.env.AIRTABLE_API_TOKEN ?? '';
  const baseId = process.env.AIRTABLE_BASE_ID ?? '';
  const debugPredictionSetId = process.env.DEBUG_PREDICTION_SET_ID ?? '';
  const isConfigured = apiToken.length > 0 && baseId.length > 0;
  return { apiToken, baseId, debugPredictionSetId, isConfigured };
}
