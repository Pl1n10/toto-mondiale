import type {
  GroupMatchPrediction,
  GroupOrderPrediction,
  KnockoutPrediction,
  PredictionSet,
} from '@/types/domain';

// Mock data used as fallback when AIRTABLE_API_TOKEN / AIRTABLE_BASE_ID
// are not configured. Numbers match the real generator:
//   - 12 groups × 6 matches = 72 group-match predictions
//   - 12 groups × 4 teams   = 48 group-order predictions
//   - 16+8+4+2+1+1          = 32 knockout predictions (FIFA 48-team format)
// Team names are illustrative only.

const GROUPS: Array<{ letter: string; teams: [string, string, string, string] }> = [
  { letter: 'A', teams: ['Italy', 'Argentina', 'Mexico', 'Saudi Arabia'] },
  { letter: 'B', teams: ['Brazil', 'Germany', 'Japan', 'Canada'] },
  { letter: 'C', teams: ['France', 'Spain', 'Morocco', 'Australia'] },
  { letter: 'D', teams: ['England', 'Netherlands', 'Senegal', 'USA'] },
  { letter: 'E', teams: ['Portugal', 'Belgium', 'South Korea', 'Egypt'] },
  { letter: 'F', teams: ['Croatia', 'Uruguay', 'Iran', 'Norway'] },
  { letter: 'G', teams: ['Denmark', 'Switzerland', 'Colombia', 'Ghana'] },
  { letter: 'H', teams: ['Poland', 'Serbia', 'Ecuador', 'Tunisia'] },
  { letter: 'I', teams: ['Sweden', 'Czechia', 'Nigeria', 'Panama'] },
  { letter: 'J', teams: ['Austria', 'Wales', 'Cameroon', 'Costa Rica'] },
  { letter: 'K', teams: ['Turkey', 'Greece', 'Algeria', 'Honduras'] },
  { letter: 'L', teams: ['Ireland', 'Slovakia', 'Ivory Coast', 'Jamaica'] },
];

const MATCH_PAIRS: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

const KO_ROUNDS = [
  { name: 'Round of 32', slots: 16 },
  { name: 'Round of 16', slots: 8 },
  { name: 'Quarterfinals', slots: 4 },
  { name: 'Semifinals', slots: 2 },
  { name: 'Final', slots: 1 },
  { name: 'Third place', slots: 1 },
];

export function buildMockPredictionSet(id: string): PredictionSet {
  return {
    id,
    predictionNumber: 1,
    name: 'Mock prediction set',
    groupPredictionsLocked: false,
    knockoutPredictionsLocked: false,
  };
}

export function buildMockGroupMatchPredictions(
  predictionSetId: string,
): GroupMatchPrediction[] {
  const out: GroupMatchPrediction[] = [];
  let order = 1;
  for (const g of GROUPS) {
    for (const [h, a] of MATCH_PAIRS) {
      out.push({
        id: `recMockGM${g.letter}${String(order).padStart(3, '0')}`,
        predictionSetId,
        group: `Group ${g.letter}`,
        homeTeamName: g.teams[h],
        awayTeamName: g.teams[a],
        predictedResult: null,
        matchOrder: order,
      });
      order++;
    }
  }
  return out;
}

export function buildMockGroupOrderPredictions(
  predictionSetId: string,
): GroupOrderPrediction[] {
  const out: GroupOrderPrediction[] = [];
  let n = 1;
  for (const g of GROUPS) {
    for (const team of g.teams) {
      out.push({
        id: `recMockGO${g.letter}${String(n).padStart(3, '0')}`,
        predictionSetId,
        group: `Group ${g.letter}`,
        teamName: team,
        predictedRank: null,
      });
      n++;
    }
  }
  return out;
}

export function buildMockKnockoutPredictions(
  predictionSetId: string,
): KnockoutPrediction[] {
  const out: KnockoutPrediction[] = [];
  let n = 1;
  for (const r of KO_ROUNDS) {
    for (let i = 1; i <= r.slots; i++) {
      out.push({
        id: `recMockKO${String(n).padStart(3, '0')}`,
        predictionSetId,
        round: r.name,
        slot: `${r.name} #${i}`,
        candidateTeam1Name: 'TBD',
        candidateTeam2Name: 'TBD',
      });
      n++;
    }
  }
  return out;
}
