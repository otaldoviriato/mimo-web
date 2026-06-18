export const PUBLIC_CONTENT_ROUTES = [
    '/institucional',
    '/para-criadoras',
    '/ajuda',
    '/termos-de-uso',
    '/politica-de-privacidade',
] as const;

export const CLERK_PUBLIC_ROUTES = [
    ...PUBLIC_CONTENT_ROUTES,
    '/login',
    '/sso-callback',
] as const;

export const RESERVED_BASE_ROUTES = [
    ...CLERK_PUBLIC_ROUTES,
    '/chats',
    '/search',
    '/profile',
    '/settings',
    '/wallet',
    '/api',
    '/admin',
    '/verificacao-identidade',
] as const;

export function isReservedRoute(path: string) {
    const pathname = path.split(/[?#]/, 1)[0];
    const base = `/${pathname.replace(/^\/+/, '').split('/')[0]}`;
    return base === '/' || RESERVED_BASE_ROUTES.includes(base as typeof RESERVED_BASE_ROUTES[number]);
}
