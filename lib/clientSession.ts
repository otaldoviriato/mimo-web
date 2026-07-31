'use client';

import type { QueryClient } from '@tanstack/react-query';

const LOCAL_STORAGE_EXACT_KEYS = [
    'mimo_profile',
    'mimo_redirect_after_login',
    'mimo_onboarding_step',
    'mimo_professional_released',
    'mimo_signup_flow',
    'mimo_pending_gift',
    'mimo_new_session',
    'mimo_session_intentional',
    'mimo_session_ended',
] as const;

const LOCAL_STORAGE_PREFIXES = [
    'mimo_rooms_',
    'mimo_pending_rooms_',
    'mimo_user_',
    'mimo_messages_',
    'mimo_chat_rate_accepted_',
] as const;

const SESSION_STORAGE_EXACT_KEYS = [
    'mimo_pending_gift',
    'mimo_hide_profile_progress_banner',
    'mimo_zero_rooms_onboard_shown',
] as const;

export function clearMimoClientSession(queryClient?: QueryClient) {
    queryClient?.clear();

    if (typeof window === 'undefined') return;

    for (const key of LOCAL_STORAGE_EXACT_KEYS) {
        localStorage.removeItem(key);
    }

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
            localStorage.removeItem(key);
        }
    }

    for (const key of SESSION_STORAGE_EXACT_KEYS) {
        sessionStorage.removeItem(key);
    }

    const mimoWindow = window as Window & {
        __mimo_nav_initialized?: boolean;
        __mimo_handled_pending_redirect?: boolean;
        __resolveTransition?: (() => void) | null;
        __navigatingWithTransition?: boolean;
    };

    delete mimoWindow.__mimo_nav_initialized;
    delete mimoWindow.__mimo_handled_pending_redirect;
    mimoWindow.__resolveTransition = null;
    delete mimoWindow.__navigatingWithTransition;
}
