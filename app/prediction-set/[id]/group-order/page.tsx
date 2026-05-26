import Link from 'next/link';

import { GroupOrderTable } from '@/components/predictions/GroupOrderTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchGroupOrderPredictions } from '@/lib/airtable/groupOrderPredictions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function GroupOrderPage({ params }: PageProps) {
  let predictions;
  try {
    predictions = await fetchGroupOrderPredictions(params.id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <ErrorState
          title="Couldn't load group order predictions"
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
        <h1 className="mt-2 text-2xl font-bold">Group order predictions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick a rank 1..4 for each team. No two teams in the same group can share a rank.
        </p>
      </header>

      <GroupOrderTable predictionSetId={params.id} predictions={predictions} />
    </main>
  );
}
