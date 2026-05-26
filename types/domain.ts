// Internal application models.
// The UI and API layers depend on these types — NOT on raw Airtable records.

export type RecordId = string;

export interface User {
  id: RecordId;
  name: string;
  email?: string;
}

export interface Team {
  id: RecordId;
  name: string;
  code?: string;
  group?: string;
}

export interface Player {
  id: RecordId;
  name: string;
  teamId?: RecordId;
}

export interface PredictionSet {
  id: RecordId;
  predictionNumber?: number;
  name?: string;
  userId?: RecordId;
  predictedWinnerTeamId?: RecordId;
  predictedTopScorerPlayerId?: RecordId;
  // Optional lock flags; not used in MVP but kept here so the type is forward-compatible.
  groupPredictionsLocked?: boolean;
  knockoutPredictionsLocked?: boolean;
}

/** Totocalcio-style outcome: home win / draw / away win. */
export type GroupMatchResult = '1' | 'X' | '2';

export interface GroupMatchPrediction {
  id: RecordId;
  predictionSetId: RecordId;
  groupMatchId?: RecordId;
  group: string;
  homeTeamName: string;
  awayTeamName: string;
  predictedResult: GroupMatchResult | null;
  matchOrder?: number;
  matchDate?: string;
}

export interface GroupOrderPrediction {
  id: RecordId;
  predictionSetId: RecordId;
  group: string;
  teamName: string;
  teamId?: RecordId;
  predictedRank: number | null;
}

export interface KnockoutPrediction {
  id: RecordId;
  predictionSetId: RecordId;
  round: string;
  slot?: string;
  candidateTeam1Name?: string;
  candidateTeam2Name?: string;
  candidateTeam1Id?: RecordId;
  candidateTeam2Id?: RecordId;
  predictedWinnerTeamName?: string;
  predictedWinnerTeamId?: RecordId;
}

// Update payload types — only WRITABLE fields go in here.
// Field-name mapping back to Airtable lives in /lib/airtable/config.ts + service layer.

export interface GroupMatchPredictionUpdate {
  id: RecordId;
  predictedResult: GroupMatchResult;
}

export interface GroupOrderPredictionUpdate {
  id: RecordId;
  // `group` rides along so the Zod superRefine can enforce no duplicate
  // ranks per group. Not part of the Airtable PATCH payload.
  group: string;
  predictedRank: number;
}

export interface KnockoutPredictionUpdate {
  id: RecordId;
  predictedWinnerTeamId: RecordId;
}

// Result of a batch update — partial-failure aware.
export interface BatchUpdateResult<T extends { id: RecordId }> {
  successIds: RecordId[];
  failures: Array<{ id: RecordId; error: string }>;
  updated: T[];
}

// Server-action discriminated union for save results.
export type SaveResult<T extends { id: RecordId }> =
  | { ok: true; result: BatchUpdateResult<T> }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
