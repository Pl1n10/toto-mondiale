'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveKnockoutPredictions } from '@/app/prediction-set/[id]/knockout/actions';
import { SaveBar, type SaveBarMessage } from '@/components/ui/SaveBar';
import {
  parseBracketTopology,
  resolveAllCandidates,
  type BracketTopology,
} from '@/lib/knockout/bracketTopology';
import type {
  KnockoutMatch,
  KnockoutPrediction,
  RecordId,
  SaveResult,
} from '@/types/domain';

type RowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface DraftRow {
  winnerTeamId: RecordId | null;
  status: RowStatus;
  errorMessage?: string;
  /** Set when an upstream pick rendered this row's winner invalid. */
  invalidated?: boolean;
  /** Set when the user clicked Save while this row was still missing. */
  missing?: boolean;
}

interface Props {
  predictionSetId: string;
  predictions: KnockoutPrediction[];
  matches: KnockoutMatch[];
  /** Plain object so React server→client serialization works. */
  teamNames: Record<RecordId, string>;
}

// Round headers, in display order. Keys match the `Phase` single-select.
const PHASE_TITLES: Array<[string, string]> = [
  ['01 - Round of 32', 'Round of 32'],
  ['02 - Round of 16', 'Round of 16'],
  ['03 - Quarter Final', 'Quarter Final'],
  ['04 - Semi Final', 'Semi Final'],
  ['05 - Third Place', 'Third Place'],
  ['06 - Final', 'Final'],
];

function buildInitialDrafts(
  predictions: KnockoutPrediction[],
): Map<number, DraftRow> {
  const m = new Map<number, DraftRow>();
  for (const p of predictions) {
    if (p.matchNumber == null) continue;
    m.set(p.matchNumber, {
      winnerTeamId: p.predictedWinnerTeamId ?? null,
      status: 'clean',
    });
  }
  return m;
}

function collectWinners(drafts: Map<number, DraftRow>): Map<number, RecordId> {
  const out = new Map<number, RecordId>();
  for (const [mn, d] of drafts) {
    if (d.winnerTeamId != null) out.set(mn, d.winnerTeamId);
  }
  return out;
}

/** After a pick, invalidate every downstream row whose winner is no longer in
 *  its (recomputed) candidate set. Mutates `drafts` in place and returns it. */
function reconcileCascade(
  drafts: Map<number, DraftRow>,
  topology: BracketTopology,
  serverWinners: Map<number, RecordId | null>,
): Map<number, DraftRow> {
  let safety = topology.size + 2;
  let changed = true;
  while (changed && safety-- > 0) {
    changed = false;
    const candidates = resolveAllCandidates(topology, collectWinners(drafts));
    for (const [mn, row] of drafts) {
      const w = row.winnerTeamId;
      if (w == null) continue;
      const c = candidates.get(mn);
      if (!c) continue;
      const isValid = c.slotATeamId === w || c.slotBTeamId === w;
      if (!isValid) {
        const serverWinner = serverWinners.get(mn) ?? null;
        drafts.set(mn, {
          ...row,
          winnerTeamId: null,
          // dirty iff server had a winner here (we've effectively removed it).
          // If server was already null, this is just a transient invalidation.
          status: serverWinner != null ? 'dirty' : 'clean',
          invalidated: true,
          missing: false,
        });
        changed = true;
      }
    }
  }
  return drafts;
}

export function KnockoutTable({
  predictionSetId,
  predictions,
  matches,
  teamNames,
}: Props) {
  const topology = useMemo(() => parseBracketTopology(matches), [matches]);

  const phaseGroups = useMemo(() => {
    const groups = new Map<string, KnockoutMatch[]>();
    for (const km of matches) {
      const arr = groups.get(km.phase) ?? [];
      arr.push(km);
      groups.set(km.phase, arr);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.matchNumber - b.matchNumber);
    return groups;
  }, [matches]);

  const [serverState, setServerState] = useState(
    () => new Map(predictions.map((p) => [p.id, p] as const)),
  );
  const serverWinnersByMatchNumber = useMemo(() => {
    const m = new Map<number, RecordId | null>();
    for (const p of serverState.values()) {
      if (p.matchNumber == null) continue;
      m.set(p.matchNumber, p.predictedWinnerTeamId ?? null);
    }
    return m;
  }, [serverState]);

  const [drafts, setDrafts] = useState<Map<number, DraftRow>>(() =>
    buildInitialDrafts(predictions),
  );

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<SaveBarMessage | null>(null);

  const candidates = useMemo(
    () => resolveAllCandidates(topology, collectWinners(drafts)),
    [topology, drafts],
  );

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [, d] of drafts) {
      if (d.status === 'dirty' || d.status === 'error') n++;
    }
    return n;
  }, [drafts]);

  // Completeness is computed over the predictions actually fetched, not the
  // 32-row theoretical bracket: if Airtable's automation produced fewer rows
  // for a prediction set there is no UI affordance to fill those gaps.
  const totalToFill = drafts.size;
  const incompleteCount = useMemo(() => {
    let n = 0;
    for (const [, d] of drafts) if (d.winnerTeamId == null) n++;
    return n;
  }, [drafts]);

  function predictionIdFor(matchNumber: number): RecordId | undefined {
    for (const p of serverState.values()) {
      if (p.matchNumber === matchNumber) return p.id;
    }
    return undefined;
  }

  function handlePick(matchNumber: number, teamId: RecordId) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(matchNumber);
      if (!row) return prev;
      const serverWinner = serverWinnersByMatchNumber.get(matchNumber) ?? null;
      const isClean = teamId === serverWinner;
      next.set(matchNumber, {
        winnerTeamId: teamId,
        status: isClean ? 'clean' : 'dirty',
        errorMessage: undefined,
        invalidated: false,
        missing: false,
      });
      return reconcileCascade(next, topology, serverWinnersByMatchNumber);
    });
    if (message?.kind !== 'info') setMessage(null);
  }

  function collectChanges(): Array<{ id: RecordId; predictedWinnerTeamId: RecordId }> {
    const out: Array<{ id: RecordId; predictedWinnerTeamId: RecordId }> = [];
    for (const [mn, d] of drafts) {
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (d.winnerTeamId == null) continue;
      const id = predictionIdFor(mn);
      if (!id) continue;
      out.push({ id, predictedWinnerTeamId: d.winnerTeamId });
    }
    return out;
  }

  function onSave() {
    setMessage(null);

    if (incompleteCount > 0) {
      // Mark every still-empty row so the amber dot signals where to look.
      setDrafts((prev) => {
        const next = new Map(prev);
        for (const km of matches) {
          const d = next.get(km.matchNumber);
          if (!d) continue;
          if (d.winnerTeamId == null) {
            next.set(km.matchNumber, { ...d, missing: true });
          }
        }
        return next;
      });
      setMessage({
        kind: 'error',
        text: `Attenzione!!! Mancano delle squadre; prego ricontrollare il tabellone e inserire le mancanti. Grazie. (Mancano ${incompleteCount} scelt${incompleteCount === 1 ? 'a' : 'e'} su ${totalToFill}.)`,
      });
      return;
    }

    const valid = collectChanges();
    if (valid.length === 0) {
      setMessage({ kind: 'info', text: 'No changes to save.' });
      return;
    }

    setDrafts((prev) => {
      const next = new Map(prev);
      for (const u of valid) {
        const found = [...next.entries()].find(
          ([mn]) => predictionIdFor(mn) === u.id,
        );
        if (!found) continue;
        const [mn, row] = found;
        next.set(mn, { ...row, status: 'saving', errorMessage: undefined });
      }
      return next;
    });

    startTransition(async () => {
      const result: SaveResult<KnockoutPrediction> = await saveKnockoutPredictions({
        predictionSetId,
        updates: valid,
      });

      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error });
        setDrafts((prev) => {
          const next = new Map(prev);
          for (const u of valid) {
            const found = [...next.entries()].find(
              ([mn]) => predictionIdFor(mn) === u.id,
            );
            if (!found) continue;
            const [mn, row] = found;
            next.set(mn, { ...row, status: 'error', errorMessage: result.error });
          }
          return next;
        });
        return;
      }

      const { successIds, failures, updated } = result.result;
      const successSet = new Set(successIds);
      const failureMap = new Map(failures.map((f) => [f.id, f.error]));

      setServerState((prev) => {
        const next = new Map(prev);
        for (const u of updated) next.set(u.id, u);
        return next;
      });

      setDrafts((prev) => {
        const next = new Map(prev);
        for (const u of valid) {
          const found = [...next.entries()].find(
            ([mn]) => predictionIdFor(mn) === u.id,
          );
          if (!found) continue;
          const [mn, row] = found;
          if (successSet.has(u.id)) {
            next.set(mn, {
              ...row,
              status: 'saved',
              errorMessage: undefined,
              invalidated: false,
              missing: false,
            });
          } else {
            next.set(mn, {
              ...row,
              status: 'error',
              errorMessage: failureMap.get(u.id) ?? 'Failed to save',
            });
          }
        }
        return next;
      });

      if (failures.length === 0) {
        setMessage({
          kind: 'success',
          text: `Saved ${successIds.length} prediction${successIds.length === 1 ? '' : 's'}.`,
        });
      } else {
        setMessage({
          kind: 'error',
          text: `Saved ${successIds.length}, failed ${failures.length}. Failed rows are marked in red.`,
        });
      }
    });
  }

  function nameOf(id: RecordId | null | undefined): string {
    if (!id) return '—';
    return teamNames[id] ?? id;
  }

  return (
    <div className="space-y-8 pb-32">
      {PHASE_TITLES.map(([phaseKey, title]) => {
        const phaseMatches = phaseGroups.get(phaseKey) ?? [];
        if (phaseMatches.length === 0) return null;
        return (
          <section key={phaseKey}>
            <h2 className="sticky top-0 z-10 mb-2 border-b bg-white/95 py-1 text-lg font-semibold backdrop-blur">
              {title}
            </h2>
            <ul className="divide-y">
              {phaseMatches.map((km) => {
                const d = drafts.get(km.matchNumber);
                if (!d) return null;
                const c = candidates.get(km.matchNumber);
                const slotATeamId = c?.slotATeamId ?? null;
                const slotBTeamId = c?.slotBTeamId ?? null;

                const showAmber = d.invalidated || d.missing;
                const dotClass = (() => {
                  if (d.status === 'saving') return 'bg-blue-400 animate-pulse';
                  if (d.status === 'error') return 'bg-red-500';
                  if (showAmber) return 'bg-amber-400';
                  if (d.status === 'saved') return 'bg-emerald-500';
                  if (d.status === 'dirty') return 'bg-gray-400';
                  return 'bg-transparent border border-gray-200';
                })();
                const dotTooltip = (() => {
                  if (d.errorMessage) return d.errorMessage;
                  if (d.invalidated) return 'Scelta da rifare (upstream cambiato)';
                  if (d.missing) return 'Scelta mancante';
                  return d.status;
                })();
                const disabled = d.status === 'saving';

                return (
                  <li
                    key={km.id}
                    className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
                        title={dotTooltip}
                        aria-label={`status: ${dotTooltip}`}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {km.matchName}
                      </span>
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={`${km.matchName} predicted winner`}
                      className="inline-flex overflow-hidden rounded border border-gray-300"
                    >
                      {([
                        { team: slotATeamId, label: km.slotALabel },
                        { team: slotBTeamId, label: km.slotBLabel },
                      ] as const).map((slot, idx) => {
                        const teamId = slot.team;
                        const teamLabel = teamId
                          ? nameOf(teamId)
                          : 'Complete previous round';
                        const selected =
                          teamId != null && d.winnerTeamId === teamId;
                        const slotDisabled = disabled || teamId == null;
                        const base =
                          'min-w-[8rem] px-3 py-1 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
                        const cls = selected
                          ? d.status === 'saved'
                            ? `${base} bg-emerald-500 text-white`
                            : showAmber
                            ? `${base} bg-amber-400 text-gray-900`
                            : `${base} bg-gray-800 text-white`
                          : `${base} bg-white text-gray-700 hover:bg-gray-100`;
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={slotDisabled}
                            className={cls}
                            title={slot.label}
                            onClick={() => teamId && handlePick(km.matchNumber, teamId)}
                          >
                            {teamLabel}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <SaveBar
        dirtyCount={dirtyCount}
        isSaving={isPending}
        onSave={onSave}
        message={message}
      />
    </div>
  );
}
