import 'server-only';

import { auth } from '@/lib/auth';
import { getAirtableEnv } from '@/lib/airtable/config';
import { fetchPredictionSet } from '@/lib/airtable/predictionSets';
import { findUserByEmail } from '@/lib/airtable/users';
import type { PredictionSet } from '@/types/domain';

/**
 * Visibility model — slice #8f.
 *
 * Stage **unlocked** (compilation): a user sees ONLY their own sets.
 * Stage **locked** (tournament running): everyone's sets become visible
 * but other people's are read-only ("scoreboard" view). The per-set,
 * per-section lock flags (`Group/Knockout Predictions Locked?`) encode
 * the stage — Cipo flips them when the tournament starts.
 *
 * These helpers reuse the PredictionSet the page already fetched, so they
 * add at most one Airtable call (the Users lookup) and no duplicate
 * prediction-set fetch.
 */

export type PredictionSection = 'group' | 'knockout';

export interface SectionAccess {
  /** `false` → the caller must block the route (e.g. `notFound()`). */
  allowed: boolean;
  /** When allowed, whether the section must render read-only. */
  readOnly: boolean;
  isOwner: boolean;
}

/**
 * `true`/`false` ownership, or `null` when it can't be determined because
 * Airtable is unconfigured (dev/mock) — callers treat `null` as owner so
 * the app stays usable on mock data.
 */
async function currentUserOwns(set: PredictionSet): Promise<boolean | null> {
  if (!getAirtableEnv().isConfigured) return null;
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return false;
  const me = await findUserByEmail(email);
  return me != null && set.userId === me.id;
}

function sectionLocked(set: PredictionSet, section: PredictionSection): boolean {
  return section === 'group'
    ? set.groupPredictionsLocked === true
    : set.knockoutPredictionsLocked === true;
}

/** Access decision for a section page (`/groups`, `/knockout`). */
export async function resolveSectionAccess(
  set: PredictionSet,
  section: PredictionSection,
): Promise<SectionAccess> {
  const locked = sectionLocked(set, section);
  const owns = await currentUserOwns(set);

  // dev/mock (owns === null): behave as owner.
  if (owns === null || owns) {
    return { allowed: true, readOnly: locked, isOwner: true };
  }
  // Someone else's set: visible read-only only once that section is locked.
  return { allowed: locked, readOnly: true, isOwner: false };
}

/** Access decision for the set overview page. Visible to the owner, or to
 *  anyone once any section is locked (so the scoreboard links resolve). */
export async function resolveSetAccess(
  set: PredictionSet,
): Promise<{ allowed: boolean; isOwner: boolean }> {
  const owns = await currentUserOwns(set);
  if (owns === null || owns) return { allowed: true, isOwner: true };
  const anyLocked =
    set.groupPredictionsLocked === true || set.knockoutPredictionsLocked === true;
  return { allowed: anyLocked, isOwner: false };
}

/**
 * Defense-in-depth write guard (mirrors `checkLockGuard`, slice #5).
 * A user may only write to their OWN set — other people's sets are always
 * read-only under the visibility model. Server actions call this right
 * after Zod, before the PATCH. Returns a user-facing error message, or
 * `null` when the write is allowed (owner, or dev/mock).
 */
export async function checkOwnershipGuard(
  predictionSetId: string,
): Promise<string | null> {
  const set = await fetchPredictionSet(predictionSetId);
  const owns = await currentUserOwns(set);
  if (owns === null || owns) return null;
  return 'Non puoi modificare la schedina di un altro utente.';
}
