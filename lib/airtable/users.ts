import 'server-only';

import { listAllRecords } from './client';
import { getAirtableEnv, tableRef, USER_FIELDS } from './config';
import { mapUser } from './mappers';
import type { User } from '@/types/domain';

/**
 * Look up an invited user by email (case-insensitive).
 *
 * Returns the matching {@link User} or `null` when no row carries that email.
 * The Users table is tiny (~20 invitees) so we fetch and match in memory
 * (D-007) instead of relying on `filterByFormula` — this also sidesteps any
 * formula-escaping concern on the email string.
 *
 * Throws if Airtable is not configured: callers that want to keep dev/mock
 * login open must check `getAirtableEnv().isConfigured` first (the auth
 * `signIn` callback does exactly that).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  const records = await listAllRecords(tableRef('users'), {
    fields: [USER_FIELDS.name, USER_FIELDS.email],
  });

  const match = records
    .map(mapUser)
    .find((u) => (u.email ?? '').trim().toLowerCase() === target);

  return match ?? null;
}

/** Convenience predicate used by the auth allowlist gate (slice #8d). */
export async function isInvitedEmail(email: string): Promise<boolean> {
  const { isConfigured } = getAirtableEnv();
  // Dev/mock without Airtable creds: the allowlist cannot be enforced, so
  // login stays open (the app already runs on in-memory mock data here).
  if (!isConfigured) return true;
  return (await findUserByEmail(email)) !== null;
}
