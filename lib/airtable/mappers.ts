import {
  GROUP_MATCH_PREDICTION_FIELDS,
  GROUP_ORDER_PREDICTION_FIELDS,
  KNOCKOUT_MATCH_FIELDS,
  KNOCKOUT_PREDICTION_FIELDS,
  PLAYER_FIELDS,
  PREDICTION_SET_FIELDS,
  TEAM_FIELDS,
  USER_FIELDS,
} from './config';
import type { AirtableRecord } from '@/types/airtable';
import type {
  GroupMatchPrediction,
  GroupMatchResult,
  GroupOrderPrediction,
  KnockoutMatch,
  KnockoutPrediction,
  Player,
  PredictionSet,
  Team,
  User,
} from '@/types/domain';

function asGroupMatchResult(value: unknown): GroupMatchResult | null {
  const s = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
  return s === '1' || s === 'X' || s === '2' ? s : null;
}

// Airtable lookups frequently return either a scalar OR a single-element array
// depending on whether they traverse a multi-linked field. These helpers
// normalise the two shapes.

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.length > 0) {
    const v = value[0];
    return typeof v === 'string' ? v : String(v);
  }
  return undefined;
}

function firstNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
  return undefined;
}

/** Accept both Number Integer and Single-line-text encodings (e.g. "2"). */
function asIntegerOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function firstLinkedId(value: unknown): string | undefined {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

export function mapUser(record: AirtableRecord): User {
  const f = record.fields;
  return {
    id: record.id,
    name: firstString(f[USER_FIELDS.name]) ?? '',
    email: firstString(f[USER_FIELDS.email]),
  };
}

export function mapPredictionSet(record: AirtableRecord): PredictionSet {
  const f = record.fields;
  return {
    id: record.id,
    predictionNumber: firstNumber(f[PREDICTION_SET_FIELDS.predictionNumber]),
    name: firstString(f[PREDICTION_SET_FIELDS.name]),
    userId: firstLinkedId(f[PREDICTION_SET_FIELDS.user]),
    predictedWinnerTeamId: firstLinkedId(f[PREDICTION_SET_FIELDS.predictedWinner]),
    predictedTopScorerPlayerId: firstLinkedId(f[PREDICTION_SET_FIELDS.predictedTopScorer]),
    groupPredictionsLocked: f[PREDICTION_SET_FIELDS.groupPredictionsLocked] === true,
    knockoutPredictionsLocked: f[PREDICTION_SET_FIELDS.knockoutPredictionsLocked] === true,
    points: {
      groupMatch: firstNumber(f[PREDICTION_SET_FIELDS.groupMatchPoints]) ?? 0,
      groupOrder: firstNumber(f[PREDICTION_SET_FIELDS.groupOrderPoints]) ?? 0,
      knockout: firstNumber(f[PREDICTION_SET_FIELDS.knockoutPoints]) ?? 0,
      topScorer: firstNumber(f[PREDICTION_SET_FIELDS.topScorerPoints]) ?? 0,
      worldCupWinner: firstNumber(f[PREDICTION_SET_FIELDS.worldCupWinnerPoints]) ?? 0,
      total: firstNumber(f[PREDICTION_SET_FIELDS.totalPoints]) ?? 0,
    },
  };
}

export function mapGroupMatchPrediction(record: AirtableRecord): GroupMatchPrediction {
  const f = record.fields;
  // Home/Away Team and Group are lookups that return arrays of record IDs in
  // Airtable's JSON (see sample in AIRTABLE_INFO). The mapper passes through
  // whatever firstString resolves to: when Cipo adds lookups
  // `Team Name (from Home Team)` etc., we'll prefer those here.
  return {
    id: record.id,
    predictionSetId: firstLinkedId(f[GROUP_MATCH_PREDICTION_FIELDS.predictionSet]) ?? '',
    groupMatchId: firstLinkedId(f[GROUP_MATCH_PREDICTION_FIELDS.groupMatch]),
    group: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.group]) ?? '?',
    homeTeamName: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.homeTeam]) ?? '—',
    awayTeamName: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.awayTeam]) ?? '—',
    predictedResult: asGroupMatchResult(f[GROUP_MATCH_PREDICTION_FIELDS.predictedResult]),
    matchOrder: firstNumber(f[GROUP_MATCH_PREDICTION_FIELDS.matchOrder]),
    matchDate: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.matchDate]),
  };
}

export function mapGroupOrderPrediction(record: AirtableRecord): GroupOrderPrediction {
  const f = record.fields;
  return {
    id: record.id,
    predictionSetId: firstLinkedId(f[GROUP_ORDER_PREDICTION_FIELDS.predictionSet]) ?? '',
    group: firstString(f[GROUP_ORDER_PREDICTION_FIELDS.group]) ?? '?',
    teamName:
      firstString(f[GROUP_ORDER_PREDICTION_FIELDS.teamName]) ??
      firstString(f[GROUP_ORDER_PREDICTION_FIELDS.team]) ??
      '—',
    teamId: firstLinkedId(f[GROUP_ORDER_PREDICTION_FIELDS.team]),
    predictedRank: asIntegerOrNull(f[GROUP_ORDER_PREDICTION_FIELDS.predictedRank]),
  };
}

export function mapKnockoutPrediction(record: AirtableRecord): KnockoutPrediction {
  const f = record.fields;
  return {
    id: record.id,
    predictionSetId: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.predictionSet]) ?? '',
    round: firstString(f[KNOCKOUT_PREDICTION_FIELDS.round]) ?? '?',
    matchNumber: firstNumber(f[KNOCKOUT_PREDICTION_FIELDS.slot]),
    candidateTeam1Name:
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1Name]) ??
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1]),
    candidateTeam2Name:
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2Name]) ??
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2]),
    candidateTeam1Id: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1]),
    candidateTeam2Id: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2]),
    // No dedicated "Predicted Winner Name" lookup exists in Airtable today;
    // the page enriches `predictedWinnerTeamId` via the Teams id→name map.
    predictedWinnerTeamName: undefined,
    predictedWinnerTeamId: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.predictedWinner]),
  };
}

export function mapKnockoutMatch(record: AirtableRecord): KnockoutMatch {
  const f = record.fields;
  return {
    id: record.id,
    matchNumber: firstNumber(f[KNOCKOUT_MATCH_FIELDS.matchNumber]) ?? 0,
    phase: firstString(f[KNOCKOUT_MATCH_FIELDS.phase]) ?? '?',
    matchName: firstString(f[KNOCKOUT_MATCH_FIELDS.matchName]) ?? '?',
    slotALabel: firstString(f[KNOCKOUT_MATCH_FIELDS.slotALabel]) ?? '',
    slotBLabel: firstString(f[KNOCKOUT_MATCH_FIELDS.slotBLabel]) ?? '',
    teamAId: firstLinkedId(f[KNOCKOUT_MATCH_FIELDS.teamA]),
    teamBId: firstLinkedId(f[KNOCKOUT_MATCH_FIELDS.teamB]),
  };
}

export function mapTeam(record: AirtableRecord): Team {
  const f = record.fields;
  return {
    id: record.id,
    name: firstString(f[TEAM_FIELDS.name]) ?? '?',
    group: firstString(f[TEAM_FIELDS.group]),
  };
}

export function mapPlayer(record: AirtableRecord): Player {
  const f = record.fields;
  return {
    id: record.id,
    name: firstString(f[PLAYER_FIELDS.name]) ?? '?',
    teamId: firstLinkedId(f[PLAYER_FIELDS.team]),
  };
}
