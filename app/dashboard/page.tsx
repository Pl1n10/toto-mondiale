import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth, signOut } from '@/lib/auth';
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

  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🏆
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Toto Mondiale
            </span>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-xs text-slate-500 sm:inline">
                {email}
              </span>
            )}
            <form action={doSignOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Le tue schedine
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scegli una schedina per compilare o rivedere i tuoi pronostici.
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Airtable env vars not set — running on in-memory mock data.
          </div>
        )}

        {sets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              Non hai ancora schedine collegate al tuo account.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Se pensi sia un errore, contatta l&apos;amministratore.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sets.map((set) => (
              <li key={set.id}>
                <Link
                  href={`/prediction-set/${set.id}`}
                  className="group flex h-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {setLabel(set)}
                    </div>
                    <div className="mt-1 text-xs font-medium text-emerald-600">
                      Apri la schedina
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
