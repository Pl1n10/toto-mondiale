import Link from 'next/link';

import { MatchPredictionTable } from '@/components/predictions/MatchPredictionTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { LockBanner } from '@/components/ui/LockBanner';
import { fetchGroupMatchPredictions } from '@/lib/airtable/groupMatchPredictions';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function GroupMatchesPage({ params }: PageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4">
        <Link
          href={`/prediction-set/${params.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to prediction set
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Group match predictions</h1>
      </header>

      <Content predictionSetId={params.id} />
    </main>
  );
}

async function Content({ predictionSetId }: { predictionSetId: string }) {
  let predictions;
  let setName: string | undefined;
  let setNumber: number | undefined;
  let locked = false;

  try {
    const [set, list] = await Promise.all([
      fetchPredictionSet(predictionSetId),
      fetchGroupMatchPredictions(predictionSetId),
    ]);
    predictions = list;
    setName = set.name;
    setNumber = set.predictionNumber;
    locked = set.groupPredictionsLocked === true;
  } catch (err) {
    return (
      <ErrorState
        title="Couldn't load predictions"
        message={err instanceof Error ? err.message : 'Unknown error'}
      />
    );
  }

  if (predictions.length === 0) {
    return (
      <ErrorState
        title="No predictions found"
        message={`No Group Match Predictions linked to prediction set ${predictionSetId}.`}
      />
    );
  }

  return (
    <>
      {setName && (
        <p className="mb-4 text-sm text-gray-600">
          Set: <span className="font-medium">{setName}</span>
          {setNumber != null && ` (#${setNumber})`}
        </p>
      )}
      {locked && <LockBanner />}
      <MatchPredictionTable
        predictionSetId={predictionSetId}
        predictions={predictions}
        readOnly={locked}
      />
    </>
  );
}
