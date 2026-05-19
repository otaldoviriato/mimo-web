'use client';

import { useRouter as useNextRouter } from 'next/navigation';

export function useTransitionRouter() {
    const router = useNextRouter();

    const push = (href: string) => {
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            document.documentElement.classList.add('transition-forward');
            document.documentElement.classList.remove('transition-backward');
            
            const transition = (document as any).startViewTransition(() => {
                return new Promise<void>((resolve) => {
                    if (typeof window !== 'undefined') {
                        (window as any).__resolveTransition = resolve;
                        window.scrollTo(0, 0); // Reseta a rolagem da janela instantaneamente para evitar que a nova página monte deslocada (header cortado)
                    }
                    router.push(href);
                    
                    // Fallback de segurança para não travar a tela caso a próxima página demore a notificar
                    setTimeout(() => {
                        if (typeof window !== 'undefined' && (window as any).__resolveTransition === resolve) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 400);
                });
            });
            
            transition.finished.finally(() => {
                document.documentElement.classList.remove('transition-forward');
            });
        } else {
            router.push(href);
        }
    };

    const back = () => {
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            document.documentElement.classList.add('transition-backward');
            document.documentElement.classList.remove('transition-forward');
            
            const transition = (document as any).startViewTransition(() => {
                return new Promise<void>((resolve) => {
                    if (typeof window !== 'undefined') {
                        (window as any).__resolveTransition = resolve;
                    }
                    router.back();
                    
                    setTimeout(() => {
                        if (typeof window !== 'undefined' && (window as any).__resolveTransition === resolve) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 400);
                });
            });
            
            transition.finished.finally(() => {
                document.documentElement.classList.remove('transition-backward');
            });
        } else {
            router.back();
        }
    };

    return {
        ...router,
        push,
        back,
    };
}
