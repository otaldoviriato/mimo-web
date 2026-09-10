'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import TabShell from '@/components/TabShell';
import { isTabPath } from '@/lib/stackHistory';

const loading = () => <div className="h-full bg-slate-50" role="status" aria-label="Carregando" />;
const pages = {
    '/chats': dynamic(() => import('@/app/(app)/(tabs)/chats/page'), { loading }),
    '/profile': dynamic(() => import('@/app/(app)/(tabs)/profile/page'), { loading }),
    '/search': dynamic(() => import('@/app/(app)/(tabs)/search/page'), { loading }),
    '/wallet': dynamic(() => import('@/app/(app)/(tabs)/wallet/page'), { loading }),
    '/activation': dynamic(() => import('@/app/(app)/(tabs)/activation/page'), { loading }),
    '/profile/edit': dynamic(() => import('@/app/(app)/profile/edit/page'), { loading }),
    '/wallet/statement': dynamic(() => import('@/app/(app)/(tabs)/wallet/statement/page'), { loading }),
    '/verificacao-identidade': dynamic(() => import('@/app/(app)/verificacao-identidade/page'), { loading }),
};

/** A stable base independent of the Next route that delivered the deep link. */
export function StackBase({ path, active }: { path: string; active: boolean }) {
    const [visited, setVisited] = useState(active);
    if (active && !visited) setVisited(true);
    const Page = pages[path as keyof typeof pages];
    if (!Page) return null;
    if (!active && !visited) return null;
    return isTabPath(path) || path === '/wallet/statement'
        ? <TabShell activePath={path}><Page /></TabShell>
        : <Page />;
}
