import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '@/lib/db';
import { isInvitedEmail } from '@/lib/airtable/users';

// Slice #8b: Google OAuth provider. Credentials are read automatically
// from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET. Resend magic link lands in 8c.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Database sessions are required for the magic-link (Email) provider —
  // verification tokens must round-trip through storage.
  session: { strategy: 'database' },
  providers: [Google],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    // Slice #8d: allowlist gate. Only emails already present in the
    // Airtable Users table may sign in (Cipo curates the ~20 invitees).
    // Per the 2026-05-29 decision the gate checks email PRESENCE only —
    // `Active?` is not consulted; suspending someone = removing the row.
    // Runs for every provider, so it also gates the magic link (8c).
    // A `false` return aborts before the adapter persists the user and
    // Auth.js redirects to /sign-in?error=AccessDenied.
    async signIn({ user }) {
      const email = user.email?.trim();
      if (!email) return false;
      return isInvitedEmail(email);
    },
  },
});
