import Link from 'next/link';

import { auth, signOut } from '@/lib/auth';

/**
 * Shared app chrome: brand on the left, signed-in email + logout on the
 * right. Used on the dashboard and every prediction page so the whole
 * experience shares one sticky header. Server component — reads the
 * session and owns the signOut server action.
 */
export async function AppHeader() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🏆
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Toto Mondiale
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {email && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              {email}
            </span>
          )}
          <form action={doSignOut}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Esci
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
