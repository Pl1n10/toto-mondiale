import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { resolveSetAccess } from '@/lib/access';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

const SECTIONS = [
  {
    href: 'groups',
    title: 'Pronostici gironi',
    blurb: 'Per ogni girone: le 6 partite (1/X/2) e l’ordine finale 1·2·3·4.',
    icon: '🗓️',
  },
  {
    href: 'knockout',
    title: 'Pronostici eliminazione',
    blurb: 'Dai sedicesimi alla finale: scegli chi vince ogni sfida.',
    icon: '🏟️',
  },
];

export default async function PredictionSetPage({ params }: PageProps) {
  let setName: string | undefined;
  let setNumber: number | undefined;
  let loadError: string | null = null;
  let allowed = true;
  try {
    const set = await fetchPredictionSet(params.id);
    setName = set.name;
    setNumber = set.predictionNumber;
    // Slice #8f: own set always visible; other's set only once it locks.
    allowed = (await resolveSetAccess(set)).allowed;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown error';
  }

  // Outside the try so the Next.js 404 signal propagates.
  if (!allowed) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-emerald-600"
        >
          ← Le tue schedine
        </Link>

        <header className="mt-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {setName ?? 'Schedina'}
            {setNumber != null && (
              <span className="ml-2 text-base font-normal text-slate-400">
                #{setNumber}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scegli una sezione da compilare.
          </p>
        </header>

        {loadError && (
          <div className="mt-4">
            <ErrorState
              title="Couldn't load prediction set metadata"
              message={loadError}
            />
          </div>
        )}

        <nav className="mt-6 grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={`/prediction-set/${params.id}/${s.href}`}
              className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <span className="text-2xl" aria-hidden>
                {s.icon}
              </span>
              <span className="mt-2 font-semibold text-slate-900">
                {s.title}
              </span>
              <span className="mt-1 text-sm text-slate-500">{s.blurb}</span>
              <span className="mt-3 text-xs font-medium text-emerald-600">
                Apri →
              </span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
