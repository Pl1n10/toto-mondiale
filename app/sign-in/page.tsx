import { redirect } from 'next/navigation';

import { auth, signIn } from '@/lib/auth';

// Slice #8b: minimal sign-in page. A single "Sign in with Google" button
// posts to a server action that kicks off the OAuth flow. The Resend
// magic-link form lands in 8c; the Airtable allowlist gate in 8d.
export default async function SignInPage() {
  // Already authenticated → no reason to show the sign-in page.
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  async function signInWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: '/dashboard' });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-bold">Toto Mondiale</h1>
      <p className="mt-1 text-sm text-gray-600">Accedi per compilare le tue schedine</p>

      <form action={signInWithGoogle} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition hover:bg-gray-50"
        >
          Accedi con Google
        </button>
      </form>
    </main>
  );
}
