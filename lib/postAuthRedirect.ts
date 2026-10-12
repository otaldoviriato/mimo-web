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

export function getPendingPostAuthRedirect({ allowApplicant = false }: { allowApplicant?: boolean } = {}): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const redirect = sanitizePostAuthRedirect(localStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY));
    // Normal login must never inherit an abandoned professional signup.
    // Only the OAuth callback may explicitly resume the applicant flow.
    if (redirect && !allowApplicant) {
        const pathname = new URL(redirect, 'https://mimo.local').pathname;
        if (pathname === '/participar' || pathname.startsWith('/participar/')) return undefined;
    }
    return redirect;
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
