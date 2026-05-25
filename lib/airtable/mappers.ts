import {
  GROUP_MATCH_PREDICTION_FIELDS,
  GROUP_ORDER_PREDICTION_FIELDS,
  KNOCKOUT_PREDICTION_FIELDS,
  PREDICTION_SET_FIELDS,
} from './config';
import type { AirtableRecord } from '@/types/airtable';
import type {
  GroupMatchPrediction,
  GroupOrderPrediction,
  KnockoutPrediction,
  PredictionSet,
} from '@/types/domain';

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

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function firstLinkedId(value: unknown): string | undefined {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
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
  };
}

export function mapGroupMatchPrediction(record: AirtableRecord): GroupMatchPrediction {
  const f = record.fields;
  return {
    id: record.id,
    predictionSetId: firstLinkedId(f[GROUP_MATCH_PREDICTION_FIELDS.predictionSet]) ?? '',
    groupMatchId: firstLinkedId(f[GROUP_MATCH_PREDICTION_FIELDS.groupMatch]),
    group: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.group]) ?? '?',
    homeTeamName: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.homeTeam]) ?? '—',
    awayTeamName: firstString(f[GROUP_MATCH_PREDICTION_FIELDS.awayTeam]) ?? '—',
    predictedHomeScore: asNumberOrNull(f[GROUP_MATCH_PREDICTION_FIELDS.predictedHomeScore]),
    predictedAwayScore: asNumberOrNull(f[GROUP_MATCH_PREDICTION_FIELDS.predictedAwayScore]),
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
    predictedRank: asNumberOrNull(f[GROUP_ORDER_PREDICTION_FIELDS.predictedRank]),
  };
}

export function mapKnockoutPrediction(record: AirtableRecord): KnockoutPrediction {
  const f = record.fields;
  return {
    id: record.id,
    predictionSetId: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.predictionSet]) ?? '',
    round: firstString(f[KNOCKOUT_PREDICTION_FIELDS.round]) ?? '?',
    slot: firstString(f[KNOCKOUT_PREDICTION_FIELDS.slot]),
    candidateTeam1Name:
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1Name]) ??
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1]),
    candidateTeam2Name:
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2Name]) ??
      firstString(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2]),
    candidateTeam1Id: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam1]),
    candidateTeam2Id: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.candidateTeam2]),
    predictedWinnerTeamName: firstString(f[KNOCKOUT_PREDICTION_FIELDS.predictedWinnerName]),
    predictedWinnerTeamId: firstLinkedId(f[KNOCKOUT_PREDICTION_FIELDS.predictedWinner]),
  };
}
