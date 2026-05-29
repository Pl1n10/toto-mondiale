import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '@/lib/db';

// Slice #8b: Google OAuth provider. Credentials are read automatically
// from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET. Resend magic link lands in
// 8c, the "must exist in Airtable Users" gate in 8d.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Database sessions are required for the magic-link (Email) provider —
  // verification tokens must round-trip through storage.
  session: { strategy: 'database' },
  providers: [Google],
  pages: {
    signIn: '/sign-in',
  },
});
