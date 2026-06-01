import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KnockoutTable } from '@/components/predictions/KnockoutTable';
import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { LockBanner } from '@/components/ui/LockBanner';
import { resolveSectionAccess } from '@/lib/access';
import { fetchKnockoutMatches } from '@/lib/airtable/knockoutMatches';
import { fetchKnockoutPredictions } from '@/lib/airtable/knockoutPredictions';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';
import { fetchTeamsNameMap } from '@/lib/airtable/teams';
import type { RecordId } from '@/types/domain';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function KnockoutPage({ params }: PageProps) {
  let predictions;
  let matches;
  let teamsMap: Map<RecordId, string>;
  let readOnly = false;
  let allowed = true;
  try {
    const [set, p, m, t] = await Promise.all([
      fetchPredictionSet(params.id),
      fetchKnockoutPredictions(params.id),
      fetchKnockoutMatches(),
      fetchTeamsNameMap(),
    ]);
    predictions = p;
    matches = m;
    teamsMap = t;
    // Slice #8f: own set → editable unless locked; other's set → read-only
    // and only once locked, otherwise blocked.
    const access = await resolveSectionAccess(set, 'knockout');
    allowed = access.allowed;
    readOnly = access.readOnly;
  } catch (err) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <ErrorState
            title="Couldn't load knockout predictions"
            message={err instanceof Error ? err.message : 'Unknown error'}
          />
        </main>
      </div>
    );
  }

  // Outside the try so the Next.js 404 signal propagates.
  if (!allowed) notFound();

  const teamNames: Record<RecordId, string> = Object.fromEntries(teamsMap);

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
            Pronostici eliminazione
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scegli chi vince ogni sfida. I turni successivi si sbloccano da soli
            man mano che compili quelli precedenti.
          </p>
        </header>

        {readOnly && <LockBanner />}
        <KnockoutTable
          predictionSetId={params.id}
          predictions={predictions}
          matches={matches}
          teamNames={teamNames}
          readOnly={readOnly}
        />
      </main>
    </div>
  );
}
