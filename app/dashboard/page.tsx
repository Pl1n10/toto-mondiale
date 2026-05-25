import Link from 'next/link';

import { getAirtableEnv } from '@/lib/airtable/config';

const FALLBACK_DEBUG_ID = 'recDebugMock000';

export default function DashboardPage() {
  const { debugPredictionSetId, isConfigured } = getAirtableEnv();
  const predictionSetId = debugPredictionSetId || FALLBACK_DEBUG_ID;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Toto Mondiale</h1>
      <p className="mt-1 text-sm text-gray-600">World Cup prediction frontend</p>

      {!isConfigured && (
        <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Airtable env vars not set — running on in-memory mock data.
          Add <code className="font-mono">AIRTABLE_API_TOKEN</code> and{' '}
          <code className="font-mono">AIRTABLE_BASE_ID</code> to{' '}
          <code className="font-mono">.env.local</code> to switch to the live base.
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Debug prediction set
        </h2>
        <Link
          href={`/prediction-set/${predictionSetId}`}
          className="mt-2 block rounded-lg border p-4 transition hover:bg-gray-50"
        >
          <div className="text-sm text-gray-500">ID</div>
          <div className="font-mono">{predictionSetId}</div>
          {!debugPredictionSetId && (
            <div className="mt-2 text-xs text-gray-500">
              Set <code className="font-mono">DEBUG_PREDICTION_SET_ID</code> in{' '}
              <code className="font-mono">.env.local</code> to point at a real record.
            </div>
          )}
        </Link>
      </section>
    </main>
  );
}
