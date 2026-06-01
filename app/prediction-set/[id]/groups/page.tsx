import Link from 'next/link';
import { notFound } from 'next/navigation';

import { UnifiedGroupTable } from '@/components/predictions/UnifiedGroupTable';
import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { LockBanner } from '@/components/ui/LockBanner';
import { resolveSectionAccess } from '@/lib/access';
import { fetchGroupMatchPredictions } from '@/lib/airtable/groupMatchPredictions';
import { fetchGroupOrderPredictions } from '@/lib/airtable/groupOrderPredictions';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function GroupsPage({ params }: PageProps) {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <Link
            href={`/prediction-set/${params.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-emerald-600"
          >
            ← Torna alla schedina
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Pronostici gironi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Per ogni girone: pronostico 1/X/2 sulle 6 partite e ordine finale
            1·2·3·4.
          </p>
        </header>

        <Content predictionSetId={params.id} />
      </main>
    </div>
  );
}

async function Content({ predictionSetId }: { predictionSetId: string }) {
  let matchPredictions;
  let orderPredictions;
  let setName: string | undefined;
  let setNumber: number | undefined;
  let readOnly = false;
  let allowed = true;

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
    // Slice #8f: own set → editable unless locked; other's set → read-only
    // and only once locked, otherwise blocked.
    const access = await resolveSectionAccess(set, 'group');
    allowed = access.allowed;
    readOnly = access.readOnly;
  } catch (err) {
    return (
      <ErrorState
        title="Couldn't load group predictions"
        message={err instanceof Error ? err.message : 'Unknown error'}
      />
    );
  }

  // Outside the try so the Next.js 404 signal propagates instead of being
  // swallowed by the catch above.
  if (!allowed) notFound();

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
        <p className="mb-4 text-sm text-slate-500">
          Schedina: <span className="font-medium text-slate-700">{setName}</span>
          {setNumber != null && ` (#${setNumber})`}
        </p>
      )}
      {readOnly && <LockBanner />}
      <UnifiedGroupTable
        predictionSetId={predictionSetId}
        matchPredictions={matchPredictions}
        orderPredictions={orderPredictions}
        readOnly={readOnly}
      />
    </>
  );
}
