import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/ui/AppHeader';
import { auth } from '@/lib/auth';
import { getAirtableEnv } from '@/lib/airtable/config';

export const dynamic = 'force-dynamic';

const CHOICES = [
  {
    href: '/scoreboard',
    icon: '🏆',
    title: 'Tabellone',
    blurb: 'La classifica di tutte le schedine, punti per fase e totale.',
  },
  {
    href: '/my-predictions',
    icon: '📝',
    title: 'Le tue schedine',
    blurb: 'Compila o rivedi i pronostici del tuo account.',
  },
];

export default async function DashboardPage() {
  const { isConfigured } = getAirtableEnv();
  const session = await auth();
  const email = session?.user?.email ?? null;

  // With Airtable live, the home is for logged-in users only.
  if (isConfigured && !email) redirect('/sign-in');

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Toto Mondiale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dove vuoi andare?
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Airtable env vars not set — running on in-memory mock data.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {CHOICES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>
                {c.icon}
              </span>
              <span className="mt-3 text-lg font-semibold text-slate-900">
                {c.title}
              </span>
              <span className="mt-1 text-sm text-slate-500">{c.blurb}</span>
              <span className="mt-4 text-xs font-medium text-emerald-600">
                Apri →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
