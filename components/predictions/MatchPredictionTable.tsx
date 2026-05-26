'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveGroupMatchPredictions } from '@/app/prediction-set/[id]/group-matches/actions';
import { SaveBar, type SaveBarMessage } from '@/components/ui/SaveBar';
import type {
  GroupMatchPrediction,
  GroupMatchResult,
  SaveResult,
} from '@/types/domain';

type RowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface DraftRow {
  result: GroupMatchResult | null;
  status: RowStatus;
  errorMessage?: string;
}

interface Props {
  predictionSetId: string;
  predictions: GroupMatchPrediction[];
}

const RESULT_OPTIONS: ReadonlyArray<GroupMatchResult> = ['1', 'X', '2'];

export function MatchPredictionTable({ predictionSetId, predictions }: Props) {
  const [serverState, setServerState] = useState(
    () => new Map(predictions.map((p) => [p.id, p] as const)),
  );

  const [drafts, setDrafts] = useState<Map<string, DraftRow>>(() => {
    const m = new Map<string, DraftRow>();
    for (const p of predictions) {
      m.set(p.id, { result: p.predictedResult, status: 'clean' });
    }
    return m;
  });

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<SaveBarMessage | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupMatchPrediction[]>();
    for (const p of predictions) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [predictions]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [, d] of drafts) if (d.status === 'dirty' || d.status === 'error') n++;
    return n;
  }, [drafts]);

  function updateCell(id: string, value: GroupMatchResult) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(id);
      if (!row) return prev;
      const server = serverState.get(id);
      const updated: DraftRow = {
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

  function collectChanges(): Array<{ id: string; result: GroupMatchResult }> {
    const valid: Array<{ id: string; result: GroupMatchResult }> = [];
    for (const [id, d] of drafts) {
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (d.result == null) continue;
      valid.push({ id, result: d.result });
    }
    return valid;
  }

  function onSave() {
    setMessage(null);
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
      const result: SaveResult<GroupMatchPrediction> = await saveGroupMatchPredictions({
        predictionSetId,
        updates: valid.map((u) => ({ id: u.id, predictedResult: u.result })),
      });

      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error });
        setDrafts((prev) => {
          const next = new Map(prev);
          for (const u of valid) {
            const r = next.get(u.id);
            if (r) {
              next.set(u.id, {
                ...r,
                status: 'error',
                errorMessage: result.error,
              });
            }
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
            next.set(u.id, {
              ...r,
              status: 'saved',
              errorMessage: undefined,
            });
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
                <th className="py-1 text-right pr-3">Home</th>
                <th className="w-40 text-center">1 / X / 2</th>
                <th className="py-1 pl-3">Away</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const d = drafts.get(p.id);
                if (!d) return null;
                const dotClass = {
                  clean: 'bg-transparent border border-gray-200',
                  dirty: 'bg-amber-400',
                  saving: 'bg-blue-400 animate-pulse',
                  saved: 'bg-emerald-500',
                  error: 'bg-red-500',
                }[d.status];
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
                        title={d.errorMessage ?? d.status}
                        aria-label={`status: ${d.status}`}
                      />
                    </td>
                    <td className="py-1 pr-3 text-right">{p.homeTeamName}</td>
                    <td className="py-1 text-center">
                      <div
                        role="radiogroup"
                        aria-label={`${p.homeTeamName} vs ${p.awayTeamName} prediction`}
                        className="inline-flex overflow-hidden rounded border border-gray-300"
                      >
                        {RESULT_OPTIONS.map((opt) => {
                          const selected = d.result === opt;
                          const base = 'w-10 px-2 py-1 text-sm font-medium transition';
                          const cls = selected
                            ? d.status === 'error'
                              ? `${base} bg-red-500 text-white`
                              : d.status === 'saved'
                              ? `${base} bg-emerald-500 text-white`
                              : `${base} bg-gray-800 text-white`
                            : `${base} bg-white text-gray-700 hover:bg-gray-100`;
                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              className={cls}
                              onClick={() => updateCell(p.id, opt)}
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
        </section>
      ))}

      <SaveBar
        dirtyCount={dirtyCount}
        isSaving={isPending}
        onSave={onSave}
        message={message}
      />
    </div>
  );
}
