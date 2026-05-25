import Link from 'next/link';

import { ErrorState } from '@/components/ui/ErrorState';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

const SECTIONS = [
  {
    href: 'group-matches',
    title: 'Group match predictions',
    blurb: '72 matches across 12 groups. Fill predicted scores.',
  },
  {
    href: 'group-order',
    title: 'Group order predictions',
    blurb: '48 rows — predict the 1st–4th rank inside each group.',
  },
  {
    href: 'knockout',
    title: 'Knockout predictions',
    blurb: '32 knockout slots. Pick the winner of each tie.',
  },
];

export default async function PredictionSetPage({ params }: PageProps) {
  let setName: string | undefined;
  let setNumber: number | undefined;
  let loadError: string | null = null;
  try {
    const set = await fetchPredictionSet(params.id);
    setName = set.name;
    setNumber = set.predictionNumber;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Dashboard
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-bold">
          {setName ?? 'Prediction set'}
          {setNumber != null && (
            <span className="ml-2 text-base font-normal text-gray-500">
              #{setNumber}
            </span>
          )}
        </h1>
        <p className="mt-1 font-mono text-xs text-gray-500">{params.id}</p>
      </header>

      {loadError && (
        <div className="mt-4">
          <ErrorState
            title="Couldn't load prediction set metadata"
            message={loadError}
          />
        </div>
      )}

      <nav className="mt-6 grid gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={`/prediction-set/${params.id}/${s.href}`}
            className="rounded-lg border p-4 transition hover:bg-gray-50"
          >
            <div className="font-medium">{s.title}</div>
            <div className="mt-1 text-sm text-gray-600">{s.blurb}</div>
          </Link>
        ))}
      </nav>
    </main>
  );
}
