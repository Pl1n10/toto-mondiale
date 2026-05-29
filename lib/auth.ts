import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

import { isInvitedEmail } from '@/lib/airtable/users';

// Slice #8 (Google-only, revised 2026-05-29): the magic-link path was
// dropped, so there is no adapter and no database — sessions are JWT.
// Airtable remains the only user store; SQLite/Prisma were removed.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // No adapter → JWT session strategy (the default). Stateless, edge-safe.
  session: { strategy: 'jwt' },
  providers: [Google],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    // Slice #8d: allowlist gate. Only emails already present in the
    // Airtable Users table may sign in (Cipo curates the invitees).
    // Per the 2026-05-29 decision the gate checks email PRESENCE only.
    // A `false` return makes Auth.js redirect to /sign-in?error=AccessDenied.
    async signIn({ user }) {
      const email = user.email?.trim();
      if (!email) return false;
      return isInvitedEmail(email);
    },
    // Slice #8e: route gating. Invoked by the middleware for matched
    // routes (see middleware.ts). Returning false redirects to /sign-in.
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
