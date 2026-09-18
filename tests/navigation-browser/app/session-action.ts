'use server';
import { cookies } from 'next/headers';

// Reproduce Clerk's pre-activation cookie invalidation without an account.
export async function invalidateSessionCache() {
    (await cookies()).delete('__navigation_test_session_cache');
}
