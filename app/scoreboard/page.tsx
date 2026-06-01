import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { auth } from '@/lib/auth';
import { getAirtableEnv } from '@/lib/airtable/config';
import { fetchScoreboard } from '@/lib/airtable/predictionSets';
import { findUserByEmail } from '@/lib/airtable/users';
import type { PredictionSet, RecordId } from '@/types/domain';

// Points are Airtable-computed; force-dynamic so each load shows the current
// standings (no build-time freezing, no stale cache).
export const dynamic = 'force-dynamic';

// Partial-point columns (hidden on small screens; Name + Total always show).
const COLS: Array<{ key: keyof NonNullable<PredictionSet['points']>; abbr: string; full: string }> = [
  { key: 'groupMatch', abbr: 'GM', full: 'Group Match' },
  { key: 'groupOrder', abbr: 'GO', full: 'Group Order' },
  { key: 'knockout', abbr: 'KO', full: 'Knockout' },
  { key: 'topScorer', abbr: 'TS', full: 'Top Scorer' },
  { key: 'worldCupWinner', abbr: 'WC', full: 'World Cup Winner' },
];

export default async function ScoreboardPage() {
  const { isConfigured } = getAirtableEnv();
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (isConfigured && !email) redirect('/sign-in');

  let sets: PredictionSet[] = [];
  let meId: RecordId | null = null;
  let loadError: string | null = null;
  try {
    sets = await fetchScoreboard();
    if (isConfigured && email) {
      const me = await findUserByEmail(email);
      meId = me?.id ?? null;
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown error';
  }

  const leaderTotal = sets[0]?.points?.total ?? 0;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-emerald-600"
        >
          ← Home
        </Link>

        <div className="mb-6 mt-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            🏆 Tabellone
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Classifica per punti totali. Apri una schedina per vederla (le
            altrui solo quando l&apos;admin sblocca la fase).
          </p>
        </div>

        {loadError ? (
          <ErrorState title="Couldn't load the scoreboard" message={loadError} />
        ) : sets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Nessuna schedina da mostrare.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Schedina</th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      title={c.full}
                      className="hidden px-2 py-2 text-right font-medium sm:table-cell"
                    >
                      {c.abbr}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">
                    Tot
                  </th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set, i) => {
                  const p = set.points;
                  const isMine = meId != null && set.userId === meId;
                  const anyLocked =
                    set.groupPredictionsLocked === true ||
                    set.knockoutPredictionsLocked === true;
                  // Own set always openable; others only once a section locks
                  // (mirrors resolveSetAccess / slice #8f). Dev/mock: open.
                  const accessible = !isConfigured || isMine || anyLocked;
                  const isLeader = (p?.total ?? 0) === leaderTotal && leaderTotal > 0;

                  const rowBg = isMine
                    ? 'bg-emerald-50/60'
                    : isLeader
                      ? 'bg-amber-50/60'
                      : '';

                  return (
                    <tr
                      key={set.id}
                      className={`border-b border-slate-100 last:border-0 ${rowBg}`}
                    >
                      <td className="px-3 py-2 text-slate-400 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        {accessible ? (
                          <Link
                            href={`/prediction-set/${set.id}`}
                            className="font-medium text-slate-900 hover:text-emerald-600 hover:underline"
                          >
                            {set.name ?? set.id}
                          </Link>
                        ) : (
                          <span
                            className="font-medium text-slate-500"
                            title="Visibile quando l'admin sblocca la fase"
                          >
                            {set.name ?? set.id}
                            <span className="ml-1 text-slate-300" aria-hidden>
                              🔒
                            </span>
                          </span>
                        )}
                        {isMine && (
                          <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                            Tu
                          </span>
                        )}
                      </td>
                      {COLS.map((c) => (
                        <td
                          key={c.key}
                          className="hidden px-2 py-2 text-right text-slate-500 tabular-nums sm:table-cell"
                        >
                          {p?.[c.key] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">
                        {p?.total ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400">
          I punti sono calcolati da Airtable e si aggiornano man mano che le
          partite vengono giocate. Ricarica per vedere l&apos;ultimo
          aggiornamento.
        </p>
      </main>
    </div>
  );
}
