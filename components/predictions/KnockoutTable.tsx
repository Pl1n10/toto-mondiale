// Read-only placeholder. Editing UI lands once the knockout schema is finalised.

import type { KnockoutPrediction } from '@/types/domain';

interface Props {
  predictions: KnockoutPrediction[];
}

export function KnockoutTable({ predictions }: Props) {
  const grouped = new Map<string, KnockoutPrediction[]>();
  for (const p of predictions) {
    const arr = grouped.get(p.round) ?? [];
    arr.push(p);
    grouped.set(p.round, arr);
  }

  return (
    <div className="space-y-6 pb-12">
      {Array.from(grouped.entries()).map(([round, rows]) => (
        <section key={round}>
          <h2 className="mb-2 border-b py-1 text-lg font-semibold">{round}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-1">Slot</th>
                <th className="py-1">Team 1</th>
                <th className="py-1">Team 2</th>
                <th className="py-1">Predicted winner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-1">{p.slot ?? '—'}</td>
                  <td className="py-1">{p.candidateTeam1Name ?? '—'}</td>
                  <td className="py-1">{p.candidateTeam2Name ?? '—'}</td>
                  <td className="py-1 text-gray-500">
                    {p.predictedWinnerTeamName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
