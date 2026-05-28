import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '@/lib/db';

// Slice #8a: scaffolding only — providers stay empty here.
// Google provider lands in 8b, Resend magic link in 8c, the
// "must exist in Airtable Users" gate in 8d.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Database sessions are required for the magic-link (Email) provider —
  // verification tokens must round-trip through storage.
  session: { strategy: 'database' },
  providers: [],
  pages: {
    signIn: '/sign-in',
  },
});
