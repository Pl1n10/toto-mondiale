import type {
  GroupMatchPrediction,
  GroupOrderPrediction,
  KnockoutMatch,
  KnockoutPrediction,
  PredictionSet,
  RecordId,
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

// Knockout mock is built to mirror the real Airtable layout: numeric match
// numbers 73..104, phase strings identical to the single-select values, and
// slot labels in the exact format `bracketTopology.ts` parses.

function mockTeamId(name: string): RecordId {
  return 'recMock' + name.replace(/[^A-Za-z0-9]/g, '');
}

/** Id -> display name for every mock team that appears in the mock bracket. */
export function buildMockTeamsNameMap(): Map<RecordId, string> {
  const map = new Map<RecordId, string>();
  for (const g of GROUPS) for (const t of g.teams) map.set(mockTeamId(t), t);
  return map;
}

/** Pick the 32 mock teams that "qualify" to R32 — top 2 of each group plus
 *  the top 8 third-placed (one per group A..H here, purely illustrative). */
function mockQualifiedTeams(): string[] {
  const qualified: string[] = [];
  for (const g of GROUPS) qualified.push(g.teams[0], g.teams[1]);
  for (const g of GROUPS.slice(0, 8)) qualified.push(g.teams[2]);
  return qualified;
}

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

interface MockMatchSpec {
  matchNumber: number;
  phase: string;
  matchName: string;
  slotALabel: string;
  slotBLabel: string;
}

// The 32 mock matches. R32 (73..88) use descriptive slot labels; deeper
// rounds use the "Winner Match N" / "Loser Match N" format required by the
// topology parser. The topology below matches the live Airtable layout
// observed during the slice #3 probe.
const MOCK_KO_MATCHES: MockMatchSpec[] = [
  // Round of 32
  { matchNumber: 73, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 1',  slotALabel: 'Runner-up Group A',   slotBLabel: 'Runner-up Group B' },
  { matchNumber: 74, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 2',  slotALabel: 'Winner Group E',      slotBLabel: 'Best 3rd A/B/C/D/F' },
  { matchNumber: 75, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 3',  slotALabel: 'Winner Group F',      slotBLabel: 'Runner-up Group C' },
  { matchNumber: 76, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 4',  slotALabel: 'Winner Group C',      slotBLabel: 'Runner-up Group F' },
  { matchNumber: 77, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 5',  slotALabel: 'Winner Group I',      slotBLabel: 'Best 3rd C/D/F/G/H' },
  { matchNumber: 78, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 6',  slotALabel: 'Runner-up Group E',   slotBLabel: 'Runner-up Group I' },
  { matchNumber: 79, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 7',  slotALabel: 'Winner Group A',      slotBLabel: 'Best 3rd C/E/F/H/I' },
  { matchNumber: 80, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 8',  slotALabel: 'Winner Group L',      slotBLabel: 'Best 3rd E/H/I/J/K' },
  { matchNumber: 81, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 9',  slotALabel: 'Winner Group D',      slotBLabel: 'Best 3rd B/E/F/I/J' },
  { matchNumber: 82, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 10', slotALabel: 'Winner Group G',      slotBLabel: 'Best 3rd A/E/H/I/J' },
  { matchNumber: 83, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 11', slotALabel: 'Runner-up Group K',   slotBLabel: 'Runner-up Group L' },
  { matchNumber: 84, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 12', slotALabel: 'Winner Group H',      slotBLabel: 'Runner-up Group J' },
  { matchNumber: 85, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 13', slotALabel: 'Winner Group B',      slotBLabel: 'Best 3rd E/F/G/I/J' },
  { matchNumber: 86, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 14', slotALabel: 'Winner Group J',      slotBLabel: 'Runner-up Group H' },
  { matchNumber: 87, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 15', slotALabel: 'Winner Group K',      slotBLabel: 'Best 3rd D/E/I/J/L' },
  { matchNumber: 88, phase: '01 - Round of 32', matchName: 'Round of 32 - Match 16', slotALabel: 'Runner-up Group D',   slotBLabel: 'Runner-up Group G' },
  // Round of 16
  { matchNumber: 89, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 1', slotALabel: 'Winner Match 74', slotBLabel: 'Winner Match 77' },
  { matchNumber: 90, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 2', slotALabel: 'Winner Match 73', slotBLabel: 'Winner Match 75' },
  { matchNumber: 91, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 3', slotALabel: 'Winner Match 76', slotBLabel: 'Winner Match 78' },
  { matchNumber: 92, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 4', slotALabel: 'Winner Match 79', slotBLabel: 'Winner Match 80' },
  { matchNumber: 93, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 5', slotALabel: 'Winner Match 83', slotBLabel: 'Winner Match 84' },
  { matchNumber: 94, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 6', slotALabel: 'Winner Match 81', slotBLabel: 'Winner Match 82' },
  { matchNumber: 95, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 7', slotALabel: 'Winner Match 86', slotBLabel: 'Winner Match 88' },
  { matchNumber: 96, phase: '02 - Round of 16', matchName: 'Round of 16 - Match 8', slotALabel: 'Winner Match 85', slotBLabel: 'Winner Match 87' },
  // Quarter Final
  { matchNumber: 97, phase: '03 - Quarter Final', matchName: 'Quarter Final - Match 1', slotALabel: 'Winner Match 89', slotBLabel: 'Winner Match 90' },
  { matchNumber: 98, phase: '03 - Quarter Final', matchName: 'Quarter Final - Match 2', slotALabel: 'Winner Match 93', slotBLabel: 'Winner Match 94' },
  { matchNumber: 99, phase: '03 - Quarter Final', matchName: 'Quarter Final - Match 3', slotALabel: 'Winner Match 91', slotBLabel: 'Winner Match 92' },
  { matchNumber: 100, phase: '03 - Quarter Final', matchName: 'Quarter Final - Match 4', slotALabel: 'Winner Match 95', slotBLabel: 'Winner Match 96' },
  // Semi Final
  { matchNumber: 101, phase: '04 - Semi Final', matchName: 'Semi Final - Match 1', slotALabel: 'Winner Match 97', slotBLabel: 'Winner Match 98' },
  { matchNumber: 102, phase: '04 - Semi Final', matchName: 'Semi Final - Match 2', slotALabel: 'Winner Match 99', slotBLabel: 'Winner Match 100' },
  // Third place: candidates are the SF losers.
  { matchNumber: 103, phase: '05 - Third Place', matchName: 'Third Place Match', slotALabel: 'Loser Match 101', slotBLabel: 'Loser Match 102' },
  // Final
  { matchNumber: 104, phase: '06 - Final', matchName: 'Final', slotALabel: 'Winner Match 101', slotBLabel: 'Winner Match 102' },
];

export function buildMockKnockoutMatches(): KnockoutMatch[] {
  const qualified = mockQualifiedTeams();
  return MOCK_KO_MATCHES.map((spec, i) => {
    const isR32 = spec.phase.startsWith('01');
    // R32 gets a real (mock) pairing; deeper rounds intentionally leave
    // teamAId/teamBId undefined — the cascade owns them.
    const teamAName = isR32 ? qualified[2 * i] : undefined;
    const teamBName = isR32 ? qualified[2 * i + 1] : undefined;
    return {
      id: `recMockKM${String(spec.matchNumber).padStart(3, '0')}`,
      matchNumber: spec.matchNumber,
      phase: spec.phase,
      matchName: spec.matchName,
      slotALabel: spec.slotALabel,
      slotBLabel: spec.slotBLabel,
      teamAId: teamAName ? mockTeamId(teamAName) : undefined,
      teamBId: teamBName ? mockTeamId(teamBName) : undefined,
    };
  });
}

export function buildMockKnockoutPredictions(
  predictionSetId: string,
): KnockoutPrediction[] {
  const matches = buildMockKnockoutMatches();
  const names = buildMockTeamsNameMap();
  return matches.map((m) => ({
    id: `recMockKO${String(m.matchNumber).padStart(3, '0')}`,
    predictionSetId,
    round: m.phase,
    matchNumber: m.matchNumber,
    candidateTeam1Name: m.teamAId ? names.get(m.teamAId) : undefined,
    candidateTeam2Name: m.teamBId ? names.get(m.teamBId) : undefined,
    candidateTeam1Id: m.teamAId,
    candidateTeam2Id: m.teamBId,
    predictedWinnerTeamId: undefined,
  }));
}
