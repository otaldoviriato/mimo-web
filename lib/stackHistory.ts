import { isReservedRoute } from './routes';

export const STACK_HISTORY_KEY = 'mimoNavigation';
export const TAB_PATHS = ['/chats', '/search', '/profile', '/wallet', '/activation'] as const;
export type ScreenType = 'chat' | 'chatInfo' | 'profile' | 'settings';

export interface ScreenLocation {
    type: ScreenType;
    url: string;
    params: { userId?: string; username?: string; giftCode?: string };
}

export interface HistoryScreen extends ScreenLocation {
    key: string;
}

export interface StackEntry {
    version: 1;
    basePath: string;
    url: string;
    screens: HistoryScreen[];
}

export interface HistoryWriter {
    state: unknown;
    replaceState(data: unknown, unused: string, url?: string): void;
    pushState(data: unknown, unused: string, url?: string): void;
}

export function isTabPath(path: string) {
    return TAB_PATHS.some(tab => tab === path);
}

export function isStackBasePath(path: string) {
    return isTabPath(path) || ['/profile/edit', '/wallet/statement', '/verificacao-identidade'].includes(path);
}

/** Resolve ancestry without fetching data, visiting routes, or mounting screens. */
export function resolveStackRoute(href: string): { basePath: string; screens: ScreenLocation[] } | null {
    if (!href.startsWith('/') || href.startsWith('//')) return null;
    const url = new URL(href, 'https://mimo.local');
    if (url.origin !== 'https://mimo.local') return null;
    let path = url.pathname.replace(/\/$/, '') || '/';
    const openChat = url.searchParams.get('openChat');
    const openProfile = url.searchParams.get('openProfile');
    const openSettings = url.searchParams.get('openSettings');
    if (isTabPath(path)) {
        if (openChat) path = `/chat/${encodeURIComponent(openChat)}`;
        else if (openProfile) path = `/${encodeURIComponent(openProfile)}`;
        else if (openSettings === 'true') path = '/settings';
    }
    for (const name of ['openChat', 'openProfile', 'openSettings']) url.searchParams.delete(name);
    const alias = path.match(/^\/([^/]+)\/chat$/);
    if (alias && !isReservedRoute(`/${alias[1]}`)) path = `/chat/${alias[1]}`;
    const chat = path.match(/^\/chat\/([^/]+)(\/info)?$/);
    if (chat) {
        let identifier: string;
        try { identifier = decodeURIComponent(chat[1]); } catch { return null; }
        const chatUrl = `/chat/${encodeURIComponent(identifier)}`;
        const params = {
            userId: identifier,
            username: identifier.startsWith('user_') ? undefined : identifier,
        };
        const screens: ScreenLocation[] = [{ type: 'chat', url: chatUrl, params }];
        if (chat[2]) screens.push({ type: 'chatInfo', url: `${chatUrl}/info`, params: { ...params } });
        const top = screens[screens.length - 1];
        top.url += url.search + url.hash;
        if (!chat[2]) top.params = { ...params, giftCode: url.searchParams.get('gift') || undefined };
        return { basePath: '/chats', screens };
    }
    if (path === '/settings') {
        return { basePath: '/profile', screens: [{ type: 'settings', url: path + url.search + url.hash, params: {} }] };
    }
    if (/^\/[^/]+$/.test(path) && !isReservedRoute(path) && !isTabPath(path)) {
        let username: string;
        try { username = decodeURIComponent(path.slice(1)).replace(/^@/, ''); } catch { return null; }
        return { basePath: '/chats', screens: [{ type: 'profile', url: `/${encodeURIComponent(username)}` + url.search + url.hash, params: { username } }] };
    }
    return null;
}

export function readStackEntry(state: unknown, href?: string): StackEntry | null {
    if (!state || typeof state !== 'object') return null;
    const entry = (state as Record<string, unknown>)[STACK_HISTORY_KEY] as StackEntry | undefined;
    if (!entry || entry.version !== 1 || !isStackBasePath(entry.basePath) || typeof entry.url !== 'string' ||
        (href !== undefined && entry.url !== href) || !Array.isArray(entry.screens)) return null;
    if (!entry.screens.every(screen => screen && typeof screen.key === 'string' &&
        typeof screen.url === 'string' && ['chat', 'chatInfo', 'profile', 'settings'].includes(screen.type) &&
        screen.params && typeof screen.params === 'object')) return null;
    return entry;
}

// Do not copy Next's private routing tree: its public History API adapter owns it.
export function stackHistoryState(entry: StackEntry) {
    return { [STACK_HISTORY_KEY]: entry };
}

export function initializeStackHistory(history: HistoryWriter, href: string, createKey: () => string): StackEntry | null {
    const restored = readStackEntry(history.state, href);
    if (restored) return restored;
    const route = resolveStackRoute(href);
    if (!route) return null;
    let entry: StackEntry = { version: 1, basePath: route.basePath, url: route.basePath, screens: [] };
    history.replaceState(stackHistoryState(entry), '', entry.url);
    for (const screen of route.screens) {
        entry = { ...entry, url: screen.url, screens: [...entry.screens, { ...screen, key: createKey() }] };
        history.pushState(stackHistoryState(entry), '', entry.url);
    }
    return entry;
}

/** URL cleanup/canonicalization must keep the current stack restorable on reload. */
export function replaceStackUrl(href: string) {
    const state = window.history.state;
    const entry = readStackEntry(state);
    if (!entry) {
        window.history.replaceState({}, '', href);
        return;
    }
    const screens = entry.screens.map((screen, index) => {
        if (index !== entry.screens.length - 1) return screen;
        const params = { ...screen.params };
        if (!new URL(href, window.location.origin).searchParams.has('gift')) delete params.giftCode;
        return { ...screen, url: href, params };
    });
    window.history.replaceState({ ...stackHistoryState({ ...entry, url: href, screens }),
        ...(state?.mimoViewerOpen ? { mimoViewerOpen: true } : {}),
        ...(state?.mimoMessageSelectionOpen ? { mimoMessageSelectionOpen: true } : {}),
    }, '', href);
}

export function stackOverlayState(overlay: Record<string, unknown>) {
    const state = window.history.state;
    const entry = readStackEntry(state);
    return { ...(entry ? stackHistoryState(entry) : {}),
        ...(state?.mimoViewerOpen ? { mimoViewerOpen: true } : {}),
        ...(state?.mimoMessageSelectionOpen ? { mimoMessageSelectionOpen: true } : {}),
        ...overlay };
}
