import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { getAirtableEnv } from '@/lib/airtable/config';
import { fetchPredictionSetsForUser } from '@/lib/airtable/predictionSets';
import type { PredictionSet } from '@/types/domain';

// Reads runtime env + the session per request; never prerender at build
// (otherwise `isConfigured` and the list freeze to build-time values).
export const dynamic = 'force-dynamic';

function setLabel(set: PredictionSet): string {
  if (set.name) return set.name;
  if (set.predictionNumber != null) return `Schedina #${set.predictionNumber}`;
  return set.id;
}

export default async function DashboardPage() {
  const { isConfigured } = getAirtableEnv();
  const session = await auth();
  const email = session?.user?.email ?? null;

  // With Airtable live, the dashboard is for logged-in users only.
  if (isConfigured && !email) redirect('/sign-in');

  const sets = await fetchPredictionSetsForUser(email ?? '');

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Toto Mondiale</h1>
      <p className="mt-1 text-sm text-gray-600">
        World Cup prediction frontend
      </p>

      {!isConfigured && (
        <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Airtable env vars not set — running on in-memory mock data.
          Add <code className="font-mono">AIRTABLE_API_TOKEN</code> and{' '}
          <code className="font-mono">AIRTABLE_BASE_ID</code> to{' '}
          <code className="font-mono">.env.local</code> to switch to the live base.
        </div>
      )}

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Le tue schedine
          </h2>
          {email && <span className="text-xs text-gray-400">{email}</span>}
        </div>

        {sets.length === 0 ? (
          <p className="mt-3 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Non hai ancora schedine collegate al tuo account. Se pensi sia un
            errore, contatta l&apos;amministratore.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sets.map((set) => (
              <li key={set.id}>
                <Link
                  href={`/prediction-set/${set.id}`}
                  className="block rounded-lg border p-4 transition hover:bg-gray-50"
                >
                  <div className="font-medium">{setLabel(set)}</div>
                  <div className="mt-1 font-mono text-xs text-gray-400">
                    {set.id}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
