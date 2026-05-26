'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveGroupOrderPredictions } from '@/app/prediction-set/[id]/group-order/actions';
import { SaveBar, type SaveBarMessage } from '@/components/ui/SaveBar';
import type { GroupOrderPrediction, SaveResult } from '@/types/domain';

type RowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface DraftRow {
  rank: number | null;
  status: RowStatus;
  errorMessage?: string;
}

interface Props {
  predictionSetId: string;
  predictions: GroupOrderPrediction[];
}

const RANK_OPTIONS = [1, 2, 3, 4] as const;

export function GroupOrderTable({ predictionSetId, predictions }: Props) {
  const [serverState, setServerState] = useState(
    () => new Map(predictions.map((p) => [p.id, p] as const)),
  );

  const [drafts, setDrafts] = useState<Map<string, DraftRow>>(() => {
    const m = new Map<string, DraftRow>();
    for (const p of predictions) {
      m.set(p.id, { rank: p.predictedRank, status: 'clean' });
    }
    return m;
  });

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<SaveBarMessage | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupOrderPrediction[]>();
    for (const p of predictions) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [predictions]);

  /** Per-group rank → ids carrying that rank. Used to mark duplicates. */
  const conflictIds = useMemo(() => {
    const conflicts = new Set<string>();
    for (const [, rows] of grouped) {
      const byRank = new Map<number, string[]>();
      for (const r of rows) {
        const rank = drafts.get(r.id)?.rank;
        if (rank == null) continue;
        const arr = byRank.get(rank) ?? [];
        arr.push(r.id);
        byRank.set(rank, arr);
      }
      for (const [, ids] of byRank) {
        if (ids.length > 1) for (const id of ids) conflicts.add(id);
      }
    }
    return conflicts;
  }, [drafts, grouped]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [, d] of drafts) if (d.status === 'dirty' || d.status === 'error') n++;
    return n;
  }, [drafts]);

  /** Live conflict banner — shown before the user even clicks Save. */
  const visibleMessage: SaveBarMessage | null = useMemo(() => {
    if (conflictIds.size > 0) {
      return {
        kind: 'error',
        text: `${conflictIds.size} row${conflictIds.size === 1 ? '' : 's'} share a rank with another team in the same group. Resolve duplicates to enable save.`,
      };
    }
    return message;
  }, [conflictIds, message]);

  function updateCell(id: string, value: number) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(id);
      if (!row) return prev;
      const server = serverState.get(id);
      const updated: DraftRow = { rank: value, status: 'dirty', errorMessage: undefined };
      if (updated.rank === (server?.predictedRank ?? null)) {
        updated.status = 'clean';
      }
      next.set(id, updated);
      return next;
    });
    if (message?.kind !== 'info') setMessage(null);
  }

  function collectChanges(): Array<{ id: string; group: string; rank: number }> {
    const valid: Array<{ id: string; group: string; rank: number }> = [];
    for (const p of predictions) {
      const d = drafts.get(p.id);
      if (!d) continue;
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (d.rank == null) continue;
      valid.push({ id: p.id, group: p.group, rank: d.rank });
    }
    return valid;
  }

  function onSave() {
    setMessage(null);
    if (conflictIds.size > 0) {
      setMessage({
        kind: 'error',
        text: 'Some groups have duplicate ranks. Fix the rows highlighted in red before saving.',
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
        const r = next.get(u.id);
        if (r) next.set(u.id, { ...r, status: 'saving', errorMessage: undefined });
      }
      return next;
    });

    startTransition(async () => {
      const result: SaveResult<GroupOrderPrediction> = await saveGroupOrderPredictions({
        predictionSetId,
        updates: valid.map((u) => ({ id: u.id, group: u.group, predictedRank: u.rank })),
      });

      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error });
        setDrafts((prev) => {
          const next = new Map(prev);
          for (const u of valid) {
            const r = next.get(u.id);
            if (r) next.set(u.id, { ...r, status: 'error', errorMessage: result.error });
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
          const r = next.get(u.id);
          if (!r) continue;
          if (successSet.has(u.id)) {
            next.set(u.id, { ...r, status: 'saved', errorMessage: undefined });
          } else {
            next.set(u.id, {
              ...r,
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

  return (
    <div className="space-y-8 pb-32">
      {grouped.map(([group, rows]) => (
        <section key={group}>
          <h2 className="sticky top-0 z-10 mb-2 border-b bg-white/95 py-1 text-lg font-semibold backdrop-blur">
            {group}
          </h2>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="w-6"></th>
                <th className="py-1 pr-3">Team</th>
                <th className="w-56 text-center">Predicted rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const d = drafts.get(p.id);
                if (!d) return null;
                const isConflict = conflictIds.has(p.id);
                const effectiveStatus: RowStatus = isConflict ? 'error' : d.status;
                const dotClass = {
                  clean: 'bg-transparent border border-gray-200',
                  dirty: 'bg-amber-400',
                  saving: 'bg-blue-400 animate-pulse',
                  saved: 'bg-emerald-500',
                  error: 'bg-red-500',
                }[effectiveStatus];
                const tooltip = isConflict
                  ? `Duplicate rank ${d.rank} in ${p.group}`
                  : d.errorMessage ?? effectiveStatus;
                const disabled = d.status === 'saving';
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
                        title={tooltip}
                        aria-label={`status: ${effectiveStatus}`}
                      />
                    </td>
                    <td className="py-1 pr-3">{p.teamName}</td>
                    <td className="py-1 text-center">
                      <div
                        role="radiogroup"
                        aria-label={`${p.teamName} predicted rank`}
                        className="inline-flex overflow-hidden rounded border border-gray-300"
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
                              : `${base} bg-gray-800 text-white`
                            : `${base} bg-white text-gray-700 hover:bg-gray-100`;
                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={disabled}
                              className={cls}
                              onClick={() => updateCell(p.id, opt)}
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
        </section>
      ))}

      <SaveBar
        dirtyCount={dirtyCount}
        isSaving={isPending}
        onSave={onSave}
        message={visibleMessage}
        saveDisabled={conflictIds.size > 0}
      />
    </div>
  );
}
