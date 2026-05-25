'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveGroupMatchPredictions } from '@/app/prediction-set/[id]/group-matches/actions';
import { SaveBar, type SaveBarMessage } from '@/components/ui/SaveBar';
import type { GroupMatchPrediction, SaveResult } from '@/types/domain';

type RowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface DraftRow {
  home: string;
  away: string;
  status: RowStatus;
  errorMessage?: string;
}

interface Props {
  predictionSetId: string;
  predictions: GroupMatchPrediction[];
}

function toDraftValue(n: number | null): string {
  return n == null ? '' : String(n);
}

function isValidScore(s: string): boolean {
  if (s === '') return false;
  if (!/^\d{1,2}$/.test(s)) return false;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 99;
}

export function MatchPredictionTable({ predictionSetId, predictions }: Props) {
  const [serverState, setServerState] = useState(
    () => new Map(predictions.map((p) => [p.id, p] as const)),
  );

  const [drafts, setDrafts] = useState<Map<string, DraftRow>>(() => {
    const m = new Map<string, DraftRow>();
    for (const p of predictions) {
      m.set(p.id, {
        home: toDraftValue(p.predictedHomeScore),
        away: toDraftValue(p.predictedAwayScore),
        status: 'clean',
      });
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

  function updateCell(id: string, side: 'home' | 'away', value: string) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const row = next.get(id);
      if (!row) return prev;
      const server = serverState.get(id);
      const updated: DraftRow = {
        ...row,
        [side]: value,
        status: 'dirty',
        errorMessage: undefined,
      };
      const serverHome = toDraftValue(server?.predictedHomeScore ?? null);
      const serverAway = toDraftValue(server?.predictedAwayScore ?? null);
      if (updated.home === serverHome && updated.away === serverAway) {
        updated.status = 'clean';
      }
      next.set(id, updated);
      return next;
    });
    if (message?.kind !== 'info') setMessage(null);
  }

  function collectChanges(): {
    valid: Array<{ id: string; home: number; away: number }>;
    invalid: string[];
  } {
    const valid: Array<{ id: string; home: number; away: number }> = [];
    const invalid: string[] = [];
    for (const [id, d] of drafts) {
      if (d.status !== 'dirty' && d.status !== 'error') continue;
      if (!isValidScore(d.home) || !isValidScore(d.away)) {
        invalid.push(id);
        continue;
      }
      valid.push({ id, home: Number(d.home), away: Number(d.away) });
    }
    return { valid, invalid };
  }

  function onSave() {
    setMessage(null);
    const { valid, invalid } = collectChanges();

    if (invalid.length > 0) {
      setDrafts((prev) => {
        const next = new Map(prev);
        for (const id of invalid) {
          const r = next.get(id);
          if (r) {
            next.set(id, {
              ...r,
              status: 'error',
              errorMessage: 'Both scores must be integers between 0 and 99',
            });
          }
        }
        return next;
      });
      setMessage({
        kind: 'error',
        text: `${invalid.length} row${invalid.length === 1 ? '' : 's'} have invalid scores`,
      });
      return;
    }

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
        updates: valid.map((u) => ({
          id: u.id,
          predictedHomeScore: u.home,
          predictedAwayScore: u.away,
        })),
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
                <th className="w-14 text-center"></th>
                <th className="w-4"></th>
                <th className="w-14 text-center"></th>
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
                const inputCls = `w-12 rounded border px-1 py-1 text-center tabular-nums ${
                  d.status === 'error'
                    ? 'border-red-500 bg-red-50'
                    : d.status === 'saved'
                    ? 'border-emerald-300'
                    : 'border-gray-300'
                }`;
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
                      <input
                        inputMode="numeric"
                        maxLength={2}
                        className={inputCls}
                        value={d.home}
                        onChange={(e) => updateCell(p.id, 'home', e.target.value)}
                        aria-label={`${p.homeTeamName} predicted score`}
                      />
                    </td>
                    <td className="text-center text-gray-400">–</td>
                    <td className="py-1 text-center">
                      <input
                        inputMode="numeric"
                        maxLength={2}
                        className={inputCls}
                        value={d.away}
                        onChange={(e) => updateCell(p.id, 'away', e.target.value)}
                        aria-label={`${p.awayTeamName} predicted score`}
                      />
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
