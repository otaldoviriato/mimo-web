'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'mimo_dismiss_review_banner';

export function ProfessionalReviewFrame({ pending, children }: { pending: boolean; children: ReactNode }) {
    const banner = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDismissed(sessionStorage.getItem(STORAGE_KEY) === 'true');
        }
    }, []);

    const showBanner = pending && !dismissed;

    useEffect(() => {
        if (!showBanner || !banner.current) {
            setHeight(0);
            return;
        }
        const observer = new ResizeObserver(entries => setHeight(entries[0].target.getBoundingClientRect().height));
        observer.observe(banner.current);
        return () => observer.disconnect();
    }, [showBanner]);

    const handleDismiss = () => {
        setDismissed(true);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, 'true');
        }
    };

    return <div>
        <div className={showBanner ? 'professional-review-viewport' : undefined} style={showBanner ? { '--app-viewport-height': `calc(100dvh - ${height}px)`, height: `calc(100dvh - ${height}px)`, transform: 'translateZ(0)', overflow: 'hidden' } as CSSProperties : undefined}>
            {children}
        </div>
        {showBanner && <div ref={banner} role="status" className="fixed top-[72px] inset-x-0 z-30 border-b border-purple-200 bg-purple-50/95 backdrop-blur-sm px-4 py-3 text-purple-950 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                    <p className="font-semibold text-sm text-purple-950">Seu perfil está em análise</p>
                    <p className="mt-0.5 text-xs text-purple-800/90 leading-relaxed">Você já pode preparar seu perfil. Avisaremos por aqui quando houver uma atualização.</p>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Fechar aviso"
                    className="shrink-0 -mr-1 -mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-purple-700/70 hover:bg-purple-100 hover:text-purple-900 transition-colors cursor-pointer"
                >
                    <X size={16} />
                </button>
            </div>
        </div>}
    </div>;
}
