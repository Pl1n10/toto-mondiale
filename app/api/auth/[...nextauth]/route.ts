// Next.js App Router handler for all Auth.js endpoints
// (/api/auth/signin, /api/auth/callback/*, /api/auth/session, ...).
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
