'use server';

import { getServerSession } from '@/lib/auth-server';

/**
 * Server action entry point for the current Better Auth session (cookies → Nest API).
 * Prefer importing {@link getServerSession} in Server Components when you do not need an action.
 */
export async function getSession() {
  return getServerSession();
}
