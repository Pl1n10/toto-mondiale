// Read-only placeholder. Full editing UI (with per-group duplicate-rank check)
// lands in the second vertical slice.

import type { GroupOrderPrediction } from '@/types/domain';

interface Props {
  predictions: GroupOrderPrediction[];
}

export function GroupOrderTable({ predictions }: Props) {
  const grouped = new Map<string, GroupOrderPrediction[]>();
  for (const p of predictions) {
    const arr = grouped.get(p.group) ?? [];
    arr.push(p);
    grouped.set(p.group, arr);
  }
  const ordered = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6 pb-12">
      {ordered.map(([group, rows]) => (
        <section key={group}>
          <h2 className="mb-2 border-b py-1 text-lg font-semibold">{group}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-1">Team</th>
                <th className="w-24 py-1">Predicted rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-1">{p.teamName}</td>
                  <td className="py-1 text-gray-500">{p.predictedRank ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
