'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function ProfessionalReviewFrame({ pending, children }: { pending: boolean; children: ReactNode }) {
    const banner = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(100);
    useEffect(() => {
        if (!pending || !banner.current) return;
        const observer = new ResizeObserver(entries => setHeight(entries[0].target.getBoundingClientRect().height));
        observer.observe(banner.current);
        return () => observer.disconnect();
    }, [pending]);
    return <div>
        {pending && <div ref={banner} role="status" className="border-b border-purple-200 bg-purple-50 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-purple-950">
            <div className="mx-auto max-w-5xl">
                <p className="font-semibold text-sm">Seu perfil está em análise</p>
                <p className="mt-1 text-xs leading-relaxed">Você já pode preparar seu perfil. Avisaremos por aqui quando houver uma atualização.</p>
            </div>
        </div>}
        <div className={pending ? 'professional-review-viewport' : undefined} style={pending ? { '--app-viewport-height': `calc(100dvh - ${height}px)`, height: `calc(100dvh - ${height}px)`, transform: 'translateZ(0)', overflow: 'hidden' } as CSSProperties : undefined}>
            {children}
        </div>
    </div>;
}
