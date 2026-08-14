'use client';

export const POST_AUTH_REDIRECT_STORAGE_KEY = 'mimo_redirect_after_login';

export function sanitizePostAuthRedirect(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return undefined;

    try {
        const url = new URL(trimmed, 'https://mimo.local');
        if (url.origin !== 'https://mimo.local') return undefined;
        if (url.pathname === '/login' || url.pathname === '/sso-callback') return undefined;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return undefined;
    }
}

export function getPendingPostAuthRedirect(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return sanitizePostAuthRedirect(localStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY));
}

export function storePostAuthRedirect(value: unknown) {
    if (typeof window === 'undefined') return;
    const redirect = sanitizePostAuthRedirect(value);
    if (redirect) localStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, redirect);
}

export function consumePostAuthRedirect(fallback = '/chats') {
    if (typeof window === 'undefined') return fallback;
    const redirect = getPendingPostAuthRedirect();
    localStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    return redirect || fallback;
}
