import Link from 'next/link';

import { KnockoutTable } from '@/components/predictions/KnockoutTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchKnockoutPredictions } from '@/lib/airtable/knockoutPredictions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function KnockoutPage({ params }: PageProps) {
  let predictions;
  try {
    predictions = await fetchKnockoutPredictions(params.id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <ErrorState
          title="Couldn't load knockout predictions"
          message={err instanceof Error ? err.message : 'Unknown error'}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4">
        <Link
          href={`/prediction-set/${params.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to prediction set
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Knockout predictions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Read-only preview. Editing UI lands once the knockout schema is finalised.
        </p>
      </header>

      <KnockoutTable predictions={predictions} />
    </main>
  );
}
