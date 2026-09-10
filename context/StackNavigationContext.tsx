'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
    initializeStackHistory, isStackBasePath, readStackEntry, stackHistoryState,
    type HistoryScreen, type ScreenType, type StackEntry,
} from '@/lib/stackHistory';

export interface StackScreen extends HistoryScreen {
    // Rich user data stays in memory; only routing identifiers enter browser history.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: HistoryScreen['params'] & { initialUser?: any };
    isClosing?: boolean;
    animate?: boolean;
    mounted?: boolean;
}

interface StackNavigationContextType {
    screens: StackScreen[];
    basePath: string | null;
    initialize: (href: string) => void;
    pushVirtual: (type: ScreenType, params: StackScreen['params']) => void;
    popVirtual: () => void;
    isVirtualActive: boolean;
}

const StackNavigationContext = createContext<StackNavigationContextType | undefined>(undefined);
const currentHref = () => window.location.pathname + window.location.search + window.location.hash;

export function StackNavigationProvider({ children }: { children: React.ReactNode }) {
    const [screens, setScreens] = useState<StackScreen[]>([]);
    const [basePath, setBasePath] = useState<string | null>(null);
    const entryRef = useRef<StackEntry | null>(null);
    const screensRef = useRef<StackScreen[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backPendingRef = useRef(false);

    const commitScreens = useCallback((next: StackScreen[]) => {
        screensRef.current = next;
        setScreens(next);
    }, []);

    const restore = useCallback((entry: StackEntry | null, animate: boolean) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        backPendingRef.current = false;
        const previous = entryRef.current;
        const current = screensRef.current.filter(screen => !screen.isClosing);
        entryRef.current = entry;
        setBasePath(entry?.basePath ?? null);
        const next: StackScreen[] = (entry?.screens ?? []).map((screen, index, all) => {
            const existing = current.find(item => item.key === screen.key);
            const isTop = index === all.length - 1;
            return { ...screen, params: { ...existing?.params, ...screen.params },
                mounted: isTop || existing?.mounted === true,
                animate: animate && isTop && !existing };
        });
        const isBack = animate && entry && previous?.basePath === entry.basePath &&
            next.length < current.length && next.every((screen, index) => screen.key === current[index]?.key);
        if (isBack) {
            // Reconcile the destination, including history.go(-N). Never call back here.
            const leaving = current.slice(next.length).map(screen => ({ ...screen, isClosing: true, animate: false }));
            commitScreens([...next, ...leaving]);
            timerRef.current = setTimeout(() => commitScreens(next), 250);
        } else {
            commitScreens(next);
        }
    }, [commitScreens]);

    const initialize = useCallback((href: string) => {
        const entry = initializeStackHistory(window.history, href, () => crypto.randomUUID());
        const previous = entryRef.current;
        // Our own URL updates must not cancel exit animations.
        if (entry && previous && entry.basePath === previous.basePath &&
            entry.screens.length === previous.screens.length &&
            entry.screens.every((screen, index) => screen.key === previous.screens[index]?.key)) {
            entryRef.current = entry;
            return;
        }
        if (!entry && !previous) return;
        restore(entry, false);
    }, [restore]);

    const pushVirtual = useCallback((type: ScreenType, params: StackScreen['params']) => {
        if (backPendingRef.current || screensRef.current.some(screen => screen.isClosing)) return;
        const href = currentHref();
        const saved = readStackEntry(window.history.state, href);
        const previous = saved ?? {
            version: 1 as const,
            basePath: isStackBasePath(window.location.pathname) ? window.location.pathname : '/chats',
            url: href,
            screens: [],
        };
        const top = previous.screens[previous.screens.length - 1];
        if (top?.type === type && (type === 'settings' ||
            (type === 'profile' ? top.params.username === params.username : top.params.userId === params.userId))) return;

        const identifier = params.username || params.initialUser?.username || params.userId;
        let url = type === 'settings' ? '/settings' : type === 'profile'
            ? '/' + encodeURIComponent(params.username || '')
            : '/chat/' + encodeURIComponent(identifier || '') + (type === 'chatInfo' ? '/info' : '');
        if (params.giftCode) url += '?gift=' + encodeURIComponent(params.giftCode);
        const screen: HistoryScreen = {
            type, key: crypto.randomUUID(), url,
            params: { userId: params.userId, username: params.username || params.initialUser?.username, giftCode: params.giftCode },
        };
        if (!saved) window.history.replaceState(stackHistoryState(previous), '', href);
        const entry: StackEntry = { ...previous, url, screens: [...previous.screens, screen] };
        window.history.pushState(stackHistoryState(entry), '', url);
        entryRef.current = entry;
        setBasePath(entry.basePath);
        commitScreens([...screensRef.current, { ...screen, params, animate: true, mounted: true }]);
    }, [commitScreens]);

    const popVirtual = useCallback(() => {
        if (!entryRef.current?.screens.length || backPendingRef.current) return;
        backPendingRef.current = true;
        window.history.back();
    }, []);

    useEffect(() => {
        const handlePopState = () => restore(readStackEntry(window.history.state, currentHref()), true);
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) restore(readStackEntry(window.history.state, currentHref()), false);
        };
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('pageshow', handlePageShow);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [restore]);

    return (
        <StackNavigationContext.Provider value={{ screens, basePath, initialize, pushVirtual, popVirtual, isVirtualActive: screens.length > 0 }}>
            {children}
        </StackNavigationContext.Provider>
    );
}

export function useStackNavigation() {
    const context = useContext(StackNavigationContext);
    if (!context) throw new Error('useStackNavigation must be used within a StackNavigationProvider');
    return context;
}
