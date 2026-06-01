'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveUnifiedGroupPredictions } from '@/app/prediction-set/[id]/groups/actions';
import { SaveBar, type SaveBarMessage } from '@/components/ui/SaveBar';
import type {
  GroupMatchPrediction,
  GroupMatchResult,
  GroupOrderPrediction,
  RecordId,
} from '@/types/domain';

type RowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface MatchDraft {
  result: GroupMatchResult | null;
  status: RowStatus;
  errorMessage?: string;
}

interface OrderDraft {
  rank: number | null;
  status: RowStatus;
  errorMessage?: string;
}

interface Props {
  predictionSetId: RecordId;
  matchPredictions: GroupMatchPrediction[];
  orderPredictions: GroupOrderPrediction[];
  readOnly?: boolean;
}

const RESULT_OPTIONS: ReadonlyArray<GroupMatchResult> = ['1', 'X', '2'];
const RANK_OPTIONS = [1, 2, 3, 4] as const;

const DOT_CLASS: Record<RowStatus, string> = {
  clean: 'bg-transparent border border-slate-300',
  dirty: 'bg-amber-400',
  saving: 'bg-blue-400 animate-pulse',
  saved: 'bg-emerald-500',
  error: 'bg-red-500',
};

export function UnifiedGroupTable({
  predictionSetId,
  matchPredictions,
  orderPredictions,
  readOnly = false,
}: Props) {
  // Per-id server snapshots (used to decide clean vs dirty and to apply saved updates).
  const [matchServer, setMatchServer] = useState(
    () => new Map(matchPredictions.map((p) => [p.id, p] as const)),
  );
  const [orderServer, setOrderServer] = useState(
    () => new Map(orderPredictions.map((p) => [p.id, p] as const)),
  );

  const [matchDrafts, setMatchDrafts] = useState<Map<string, MatchDraft>>(() => {
    const m = new Map<string, MatchDraft>();
    for (const p of matchPredictions) {
      m.set(p.id, { result: p.predictedResult, status: 'clean' });
    }
    return m;
  });
  const [orderDrafts, setOrderDrafts] = useState<Map<string, OrderDraft>>(() => {
    const m = new Map<string, OrderDraft>();
    for (const p of orderPredictions) {
      m.set(p.id, { rank: p.predictedRank, status: 'clean' });
    }
    return m;
  });

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<SaveBarMessage | null>(null);

  // Group predictions by group name; show the union of groups seen on either side.
  const groupedView = useMemo(() => {
    const groups = new Set<string>();
    for (const p of matchPredictions) groups.add(p.group);
    for (const p of orderPredictions) groups.add(p.group);

    const matchesByGroup = new Map<string, GroupMatchPrediction[]>();
    for (const p of matchPredictions) {
      const arr = matchesByGroup.get(p.group) ?? [];
      arr.push(p);
      matchesByGroup.set(p.group, arr);
    }
    const orderByGroup = new Map<string, GroupOrderPrediction[]>();
    for (const p of orderPredictions) {
      const arr = orderByGroup.get(p.group) ?? [];
      arr.push(p);
      orderByGroup.set(p.group, arr);
    }

    return Array.from(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((group) => ({
        group,
        matches: (matchesByGroup.get(group) ?? []).slice().sort((a, b) => {
          const ao = a.matchOrder ?? 0;
          const bo = b.matchOrder ?? 0;
          if (ao !== bo) return ao - bo;
          return (a.matchDate ?? '').localeCompare(b.matchDate ?? '');
        }),
        order: (orderByGroup.get(group) ?? [])
          .slice()
          .sort((a, b) => a.teamName.localeCompare(b.teamName)),
      }));
  }, [matchPredictions, orderPredictions]);

  /** Per-group conflict set for order predictions (same rank picked twice). */
  const conflictOrderIds = useMemo(() => {
    const conflicts = new Set<string>();
    for (const { group, order } of groupedView) {
      const byRank = new Map<number, string[]>();
      for (const p of order) {
        const rank = orderDrafts.get(p.id)?.rank;
        if (rank == null) continue;
        const arr = byRank.get(rank) ?? [];
        arr.push(p.id);
        byRank.set(rank, arr);
      }
      for (const [, ids] of byRank) {
        if (ids.length > 1) for (const id of ids) conflicts.add(id);
      }
      // touch `group` so eslint can't complain about unused destructure
      void group;
    }
    return conflicts;
  }, [orderDrafts, groupedView]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [, d] of matchDrafts) if (d.status === 'dirty' || d.status === 'error') n++;
    for (const [, d] of orderDrafts) if (d.status === 'dirty' || d.status === 'error') n++;
    return n;
  }, [matchDrafts, orderDrafts]);

  const missingMatches = useMemo(() => {
    let n = 0;
    for (const [, d] of matchDrafts) if (d.result == null) n++;
    return n;
  }, [matchDrafts]);
  const missingOrder = useMemo(() => {
    let n = 0;
    for (const [, d] of orderDrafts) if (d.rank == null) n++;
    return n;
  }, [orderDrafts]);
  const missingTotal = missingMatches + missingOrder;

  /** Banner state: live conflict overrides everything; otherwise the latest save message. */
  const visibleMessage: SaveBarMessage | null = useMemo(() => {
    if (conflictOrderIds.size > 0) {
      return {
        kind: 'error',
        text: `${conflictOrderIds.size} righ${conflictOrderIds.size === 1 ? 'a' : 'e'} con rank duplicato nello stesso gruppo. Risolvi i duplicati per salvare.`,
      };
    }
    if (message) return message;
    if (missingTotal > 0) {
      return {
        kind: 'info',
        text: `Mancano ${missingTotal} prediction${missingTotal === 1 ? '' : 's'} per completare la schedina.`,
      };
    }
    return null;
  }, [conflictOrderIds, message, missingTotal]);

  function updateMatch(id: string, value: GroupMatchResult) {
    setMatchDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(id);
      if (!row) return prev;
      const server = matchServer.get(id);
      const updated: MatchDraft = {
        result: value,
        status: 'dirty',
        errorMessage: undefined,
      };
      if (updated.result === (server?.predictedResult ?? null)) {
        updated.status = 'clean';
      }
      next.set(id, updated);
      return next;
    });
    if (message?.kind !== 'info') setMessage(null);
  }

  function updateOrder(id: string, value: number) {
    setOrderDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(id);
      if (!row) return prev;
      const server = orderServer.get(id);
      const updated: OrderDraft = { rank: value, status: 'dirty', errorMessage: undefined };
      if (updated.rank === (server?.predictedRank ?? null)) {
        updated.status = 'clean';
      }
      next.set(id, updated);
      return next;
    });
    if (message?.kind !== 'info') setMessage(null);
  }

  function collectMatchChanges() {
    const out: Array<{ id: string; predictedResult: GroupMatchResult }> = [];
    for (const [id, d] of matchDrafts) {
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (d.result == null) continue;
      out.push({ id, predictedResult: d.result });
    }
    return out;
  }
  function collectOrderChanges() {
    const out: Array<{ id: string; group: string; predictedRank: number }> = [];
    for (const p of orderPredictions) {
      const d = orderDrafts.get(p.id);
      if (!d) continue;
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (d.rank == null) continue;
      out.push({ id: p.id, group: p.group, predictedRank: d.rank });
    }
    return out;
  }

  function onSave() {
    setMessage(null);

    if (conflictOrderIds.size > 0) {
      setMessage({
        kind: 'error',
        text: 'Risolvi i duplicati di rank prima di salvare.',
      });
      return;
    }

    const matchUpdates = collectMatchChanges();
    const orderUpdates = collectOrderChanges();

    if (matchUpdates.length === 0 && orderUpdates.length === 0) {
      setMessage({ kind: 'info', text: 'No changes to save.' });
      return;
    }

    // Option C: incomplete schedina → confirm dialog. The user can still save
    // the draft (incremental save), but is warned about what's missing first.
    if (missingTotal > 0) {
      const proceed = window.confirm(
        `Schedina incompleta: mancano ${missingTotal} prediction${missingTotal === 1 ? '' : 's'} (${missingMatches} partite, ${missingOrder} posizioni).\n\nSalvare comunque la bozza?`,
      );
      if (!proceed) return;
    }

    setMatchDrafts((prev) => {
      const next = new Map(prev);
      for (const u of matchUpdates) {
        const r = next.get(u.id);
        if (r) next.set(u.id, { ...r, status: 'saving', errorMessage: undefined });
      }
      return next;
    });
    setOrderDrafts((prev) => {
      const next = new Map(prev);
      for (const u of orderUpdates) {
        const r = next.get(u.id);
        if (r) next.set(u.id, { ...r, status: 'saving', errorMessage: undefined });
      }
      return next;
    });

    startTransition(async () => {
      const result = await saveUnifiedGroupPredictions({
        predictionSetId,
        matchUpdates,
        orderUpdates,
      });

      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error });
        setMatchDrafts((prev) => {
          const next = new Map(prev);
          for (const u of matchUpdates) {
            const r = next.get(u.id);
            if (r) next.set(u.id, { ...r, status: 'error', errorMessage: result.error });
          }
          return next;
        });
        setOrderDrafts((prev) => {
          const next = new Map(prev);
          for (const u of orderUpdates) {
            const r = next.get(u.id);
            if (r) next.set(u.id, { ...r, status: 'error', errorMessage: result.error });
          }
          return next;
        });
        return;
      }

      const matchSuccess = new Set(result.matches.successIds);
      const matchFailureMap = new Map(result.matches.failures.map((f) => [f.id, f.error]));
      const orderSuccess = new Set(result.order.successIds);
      const orderFailureMap = new Map(result.order.failures.map((f) => [f.id, f.error]));

      setMatchServer((prev) => {
        const next = new Map(prev);
        for (const u of result.matches.updated) next.set(u.id, u);
        return next;
      });
      setOrderServer((prev) => {
        const next = new Map(prev);
        for (const u of result.order.updated) next.set(u.id, u);
        return next;
      });

      setMatchDrafts((prev) => {
        const next = new Map(prev);
        for (const u of matchUpdates) {
          const r = next.get(u.id);
          if (!r) continue;
          if (matchSuccess.has(u.id)) {
            next.set(u.id, { ...r, status: 'saved', errorMessage: undefined });
          } else {
            next.set(u.id, {
              ...r,
              status: 'error',
              errorMessage: matchFailureMap.get(u.id) ?? 'Failed to save',
            });
          }
        }
        return next;
      });
      setOrderDrafts((prev) => {
        const next = new Map(prev);
        for (const u of orderUpdates) {
          const r = next.get(u.id);
          if (!r) continue;
          if (orderSuccess.has(u.id)) {
            next.set(u.id, { ...r, status: 'saved', errorMessage: undefined });
          } else {
            next.set(u.id, {
              ...r,
              status: 'error',
              errorMessage: orderFailureMap.get(u.id) ?? 'Failed to save',
            });
          }
        }
        return next;
      });

      const successCount = matchSuccess.size + orderSuccess.size;
      const failureCount = result.matches.failures.length + result.order.failures.length;
      if (failureCount === 0) {
        setMessage({
          kind: 'success',
          text: `Saved ${successCount} prediction${successCount === 1 ? '' : 's'}.`,
        });
      } else {
        setMessage({
          kind: 'error',
          text: `Saved ${successCount}, failed ${failureCount}. Failed rows are marked in red.`,
        });
      }
    });
  }

  return (
    <div className="space-y-5 pb-32">
      {groupedView.map(({ group, matches, order }) => (
        <section
          key={group}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-block h-4 w-1 rounded-full bg-emerald-500" />
            {group}
          </h2>

          {matches.length > 0 && (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="w-6"></th>
                  <th className="py-1 text-right pr-3">Home</th>
                  <th className="w-40 text-center">1 / X / 2</th>
                  <th className="py-1 pl-3">Away</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((p) => {
                  const d = matchDrafts.get(p.id);
                  if (!d) return null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[d.status]}`}
                          title={d.errorMessage ?? d.status}
                          aria-label={`status: ${d.status}`}
                        />
                      </td>
                      <td className="py-1 pr-3 text-right">{p.homeTeamName}</td>
                      <td className="py-1 text-center">
                        <div
                          role="radiogroup"
                          aria-label={`${p.homeTeamName} vs ${p.awayTeamName} prediction`}
                          className="inline-flex overflow-hidden rounded-lg border border-slate-300"
                        >
                          {RESULT_OPTIONS.map((opt) => {
                            const selected = d.result === opt;
                            const base =
                              'w-10 px-2 py-1 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed';
                            const cls = selected
                              ? d.status === 'error'
                                ? `${base} bg-red-500 text-white`
                                : d.status === 'saved'
                                ? `${base} bg-emerald-500 text-white`
                                : `${base} bg-slate-900 text-white`
                              : `${base} bg-white text-slate-700 hover:bg-slate-100`;
                            return (
                              <button
                                key={opt}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={readOnly || d.status === 'saving'}
                                className={cls}
                                onClick={() => updateMatch(p.id, opt)}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-1 pl-3">{p.awayTeamName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {matches.length > 0 && order.length > 0 && (
            <div aria-hidden className="h-4" />
          )}

          {order.length > 0 && (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="w-6"></th>
                  <th className="py-1 pr-3">Team</th>
                  <th className="w-56 text-center">Predicted rank</th>
                </tr>
              </thead>
              <tbody>
                {order.map((p) => {
                  const d = orderDrafts.get(p.id);
                  if (!d) return null;
                  const isConflict = conflictOrderIds.has(p.id);
                  const effectiveStatus: RowStatus = isConflict ? 'error' : d.status;
                  const tooltip = isConflict
                    ? `Duplicate rank ${d.rank} in ${p.group}`
                    : d.errorMessage ?? effectiveStatus;
                  const disabled = readOnly || d.status === 'saving';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[effectiveStatus]}`}
                          title={tooltip}
                          aria-label={`status: ${effectiveStatus}`}
                        />
                      </td>
                      <td className="py-1 pr-3">{p.teamName}</td>
                      <td className="py-1 text-center">
                        <div
                          role="radiogroup"
                          aria-label={`${p.teamName} predicted rank`}
                          className="inline-flex overflow-hidden rounded-lg border border-slate-300"
                        >
                          {RANK_OPTIONS.map((opt) => {
                            const selected = d.rank === opt;
                            const base =
                              'w-10 px-2 py-1 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
                            const cls = selected
                              ? isConflict
                                ? `${base} bg-red-500 text-white`
                                : effectiveStatus === 'saved'
                                ? `${base} bg-emerald-500 text-white`
                                : `${base} bg-slate-900 text-white`
                              : `${base} bg-white text-slate-700 hover:bg-slate-100`;
                            return (
                              <button
                                key={opt}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={disabled}
                                className={cls}
                                onClick={() => updateOrder(p.id, opt)}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {!readOnly && (
        <SaveBar
          dirtyCount={dirtyCount}
          isSaving={isPending}
          onSave={onSave}
          message={visibleMessage}
          saveDisabled={conflictOrderIds.size > 0}
        />
      )}
    </div>
  );
}
