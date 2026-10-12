'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

export function ProfessionalReviewFrame({ pending, children }: { pending: boolean; children: ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setCollapsed(true);
    }, [pathname]);

    return (
        <div className="flex flex-col min-h-screen w-full">
            {pending && (
                <aside
                    role="status"
                    className="sticky top-[72px] z-30 w-full border-b border-purple-200/90 bg-purple-50/95 backdrop-blur-xs text-purple-950 transition-all select-none"
                >
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
                        <button
                            type="button"
                            onClick={() => setCollapsed(prev => !prev)}
                            className="flex flex-1 items-center gap-2.5 text-left cursor-pointer min-w-0"
                            aria-expanded={!collapsed}
                            aria-label={collapsed ? "Expandir aviso de perfil em análise" : "Recolher aviso de perfil em análise"}
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-200/70 text-purple-800">
                                <Clock className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs sm:text-sm text-purple-950 truncate">
                                    Seu perfil está em análise
                                </p>
                                {!collapsed && (
                                    <p className="mt-0.5 text-xs text-purple-800/90 leading-snug">
                                        Você já pode preparar seu perfil. Avisaremos por aqui quando houver uma atualização.
                                    </p>
                                )}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCollapsed(prev => !prev)}
                            aria-label={collapsed ? "Expandir aviso" : "Recolher aviso"}
                            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-purple-700/80 hover:bg-purple-100/80 hover:text-purple-900 transition-colors cursor-pointer"
                        >
                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </aside>
            )}
            <div className="flex-1 w-full flex flex-col">
                {children}
            </div>
        </div>
    );
}
