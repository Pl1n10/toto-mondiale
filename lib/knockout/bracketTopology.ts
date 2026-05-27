/**
 * Bracket topology: who feeds whom in the knockout phase.
 *
 * The FIFA 48-team bracket is encoded directly inside Airtable via the
 * `Slot A Label` / `Slot B Label` columns on the `Knockout Matches` table.
 *   - For Round of 32 those labels are descriptive ("Winner Group E",
 *     "Best 3rd A/B/C/D/F", "Runner-up Group L", ...) — there is no
 *     upstream match, the teams come straight from `Team A` / `Team B`.
 *   - For Round of 16 / Quarter Final / Semi Final / Final / Third Place
 *     they follow the regex `^(Winner|Loser) Match (\d+)$` and point to the
 *     match number whose winner (or loser, for the third-place match)
 *     feeds this slot.
 *
 * We parse those strings into a typed graph instead of hardcoding the
 * mapping so a future bracket change in Airtable (or a different format
 * altogether) only requires updating the labels.
 */

import type { KnockoutMatch, RecordId } from '@/types/domain';

export interface BracketSlotFixed {
  kind: 'fixed';
  /** The team this slot is locked to (R32 only). `null` if Airtable didn't
   *  populate it yet — UI must render an empty pill in that case. */
  teamId: RecordId | null;
  /** Human-readable label (e.g. "Winner Group E"). Kept for tooltips. */
  label: string;
}

export interface BracketSlotDerived {
  kind: 'derived';
  /** Upstream match number whose outcome feeds this slot. */
  sourceMatchNumber: number;
  /** `winner` for almost every slot; `loser` only for the Third Place match. */
  outcome: 'winner' | 'loser';
  label: string;
}

export type BracketSlot = BracketSlotFixed | BracketSlotDerived;

export interface BracketMatchSources {
  slotA: BracketSlot;
  slotB: BracketSlot;
}

/** matchNumber -> sources for slot A and slot B. */
export type BracketTopology = Map<number, BracketMatchSources>;

const R32_PHASE_PREFIX = '01';
const DERIVED_LABEL = /^(Winner|Loser) Match (\d+)$/;

function parseSlot(
  label: string,
  teamId: RecordId | undefined,
  isR32: boolean,
  context: string,
): BracketSlot {
  if (isR32) {
    return { kind: 'fixed', teamId: teamId ?? null, label };
  }
  const match = DERIVED_LABEL.exec(label.trim());
  if (!match) {
    throw new Error(
      `bracketTopology: cannot parse slot label ${JSON.stringify(label)} for ${context}. ` +
        `Expected "Winner Match N" or "Loser Match N".`,
    );
  }
  const outcome = match[1] === 'Winner' ? 'winner' : 'loser';
  const sourceMatchNumber = Number(match[2]);
  if (!Number.isInteger(sourceMatchNumber)) {
    throw new Error(
      `bracketTopology: invalid match number in ${JSON.stringify(label)} for ${context}.`,
    );
  }
  return { kind: 'derived', sourceMatchNumber, outcome, label };
}

/** Build a typed topology from the raw Airtable Knockout Match records.
 *  Throws if any non-R32 slot label is malformed — early failure beats
 *  silently broken cascades. */
export function parseBracketTopology(matches: KnockoutMatch[]): BracketTopology {
  const topology: BracketTopology = new Map();
  for (const m of matches) {
    const isR32 = m.phase.startsWith(R32_PHASE_PREFIX);
    const context = `match #${m.matchNumber} (${m.phase})`;
    topology.set(m.matchNumber, {
      slotA: parseSlot(m.slotALabel, m.teamAId, isR32, `${context} slot A`),
      slotB: parseSlot(m.slotBLabel, m.teamBId, isR32, `${context} slot B`),
    });
  }
  return topology;
}

/** Resolved candidates for a single match (both slots may be `null` if the
 *  upstream cascade is incomplete). */
export interface MatchCandidates {
  slotATeamId: RecordId | null;
  slotBTeamId: RecordId | null;
}

/** Walk the cascade for every match in the topology, given the current
 *  `predictedWinners` map (matchNumber -> winner team id). A slot is `null`
 *  whenever its upstream match has no predicted winner yet.
 *
 *  The cascade is small (32 matches, max depth 5) so a naive O(N·depth)
 *  recursion with memoization is plenty.
 */
export function resolveAllCandidates(
  topology: BracketTopology,
  predictedWinners: Map<number, RecordId>,
): Map<number, MatchCandidates> {
  const cache = new Map<number, MatchCandidates>();

  function resolveSlot(source: BracketSlot): RecordId | null {
    if (source.kind === 'fixed') return source.teamId;
    const upstream = resolveMatch(source.sourceMatchNumber);
    const winner = predictedWinners.get(source.sourceMatchNumber) ?? null;
    if (winner == null) return null;
    if (source.outcome === 'winner') return winner;
    // 'loser' — pick the candidate that is not the winner. Requires the
    // upstream candidates to be fully resolved too.
    if (upstream.slotATeamId == null || upstream.slotBTeamId == null) return null;
    if (upstream.slotATeamId === winner) return upstream.slotBTeamId;
    if (upstream.slotBTeamId === winner) return upstream.slotATeamId;
    // Winner is not among the upstream candidates — the cascade has been
    // invalidated upstream. Surface as `null` so the UI flags it.
    return null;
  }

  function resolveMatch(matchNumber: number): MatchCandidates {
    const cached = cache.get(matchNumber);
    if (cached) return cached;
    const sources = topology.get(matchNumber);
    if (!sources) {
      const empty: MatchCandidates = { slotATeamId: null, slotBTeamId: null };
      cache.set(matchNumber, empty);
      return empty;
    }
    // Insert a placeholder first to break accidental cycles (shouldn't happen
    // in a real bracket, but defensive).
    cache.set(matchNumber, { slotATeamId: null, slotBTeamId: null });
    const resolved: MatchCandidates = {
      slotATeamId: resolveSlot(sources.slotA),
      slotBTeamId: resolveSlot(sources.slotB),
    };
    cache.set(matchNumber, resolved);
    return resolved;
  }

  for (const matchNumber of topology.keys()) resolveMatch(matchNumber);
  return cache;
}
