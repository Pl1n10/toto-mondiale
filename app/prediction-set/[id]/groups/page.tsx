import Link from 'next/link';

import { UnifiedGroupTable } from '@/components/predictions/UnifiedGroupTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { LockBanner } from '@/components/ui/LockBanner';
import { fetchGroupMatchPredictions } from '@/lib/airtable/groupMatchPredictions';
import { fetchGroupOrderPredictions } from '@/lib/airtable/groupOrderPredictions';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function GroupsPage({ params }: PageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4">
        <Link
          href={`/prediction-set/${params.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to prediction set
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Group predictions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per ogni girone: pronostico 1/X/2 sulle 6 partite e ordine finale 1·2·3·4.
        </p>
      </header>

      <Content predictionSetId={params.id} />
    </main>
  );
}

async function Content({ predictionSetId }: { predictionSetId: string }) {
  let matchPredictions;
  let orderPredictions;
  let setName: string | undefined;
  let setNumber: number | undefined;
  let locked = false;

  try {
    const [set, matches, order] = await Promise.all([
      fetchPredictionSet(predictionSetId),
      fetchGroupMatchPredictions(predictionSetId),
      fetchGroupOrderPredictions(predictionSetId),
    ]);
    matchPredictions = matches;
    orderPredictions = order;
    setName = set.name;
    setNumber = set.predictionNumber;
    locked = set.groupPredictionsLocked === true;
  } catch (err) {
    return (
      <ErrorState
        title="Couldn't load group predictions"
        message={err instanceof Error ? err.message : 'Unknown error'}
      />
    );
  }

  if (matchPredictions.length === 0 && orderPredictions.length === 0) {
    return (
      <ErrorState
        title="No predictions found"
        message={`No group predictions linked to prediction set ${predictionSetId}.`}
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
      <UnifiedGroupTable
        predictionSetId={predictionSetId}
        matchPredictions={matchPredictions}
        orderPredictions={orderPredictions}
        readOnly={locked}
      />
    </>
  );
}
