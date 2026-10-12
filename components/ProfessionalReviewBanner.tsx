'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMyProfile } from '@/hooks/useQueries';

export function ProfessionalReviewBanner() {
    const pathname = usePathname();
    const { data: userData } = useMyProfile();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setCollapsed(true);
    }, [pathname]);

    const isPending = !!userData?.isProfessional && userData?.professionalStatus === 'pending';
    if (!isPending) return null;

    return (
        <aside
            role="status"
            className="w-full shrink-0 border-b border-purple-200/90 bg-purple-50 text-purple-950 transition-all select-none shadow-xs"
        >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-2.5">
                <button
                    type="button"
                    onClick={() => setCollapsed(prev => !prev)}
                    className="flex flex-1 items-center gap-2.5 text-left cursor-pointer min-w-0"
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? "Expandir aviso de perfil em análise" : "Recolher aviso de perfil em análise"}
                >
                    <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-purple-950 leading-tight">
                            Seu perfil está em análise
                        </p>
                        {!collapsed && (
                            <p className="mt-1 text-xs text-purple-800/90 leading-snug">
                                Você já pode preparar seu perfil. Avisaremos por aqui quando houver uma atualização.
                            </p>
                        )}
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setCollapsed(prev => !prev)}
                    aria-label={collapsed ? "Expandir aviso" : "Recolher aviso"}
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-purple-700/80 hover:bg-purple-100 hover:text-purple-900 transition-colors cursor-pointer"
                >
                    {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>
        </aside>
    );
}
