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
                        (window as any).__resolveTransition = () => {
                            setTimeout(resolve, 50);
                        };
                        window.scrollTo(0, 0); // Reseta a rolagem da janela instantaneamente para evitar que a nova página monte deslocada (header cortado)
                    }
                    router.push(href);
                    
                    // Fallback de segurança para não travar a tela caso a próxima página demore a notificar
                    setTimeout(() => {
                        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 1000); // Aumentado para 1000ms para permitir carregamento inicial do bundle da rota
                });
            });
            
            // Trata rejeições silenciosamente se a transição for abortada por atualizações assíncronas do DOM ou concorrência
            if (transition.ready) {
                transition.ready.catch(() => {});
            }
            
            transition.finished
                .catch(() => {})
                .finally(() => {
                    document.documentElement.classList.remove('transition-forward');
                });
        } else {
            router.push(href);
        }
    };

    const back = () => {
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            if (typeof window !== 'undefined') {
                (window as any).__navigatingWithTransition = true;
            }
            document.documentElement.classList.add('transition-backward');
            document.documentElement.classList.remove('transition-forward');
            
            const transition = (document as any).startViewTransition(() => {
                return new Promise<void>((resolve) => {
                    if (typeof window !== 'undefined') {
                        (window as any).__resolveTransition = () => {
                            setTimeout(resolve, 50);
                        };
                    }
                    router.back();
                    
                    setTimeout(() => {
                        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 1000); // Aumentado para 1000ms
                });
            });
            
            if (transition.ready) {
                transition.ready.catch(() => {});
            }
            
            transition.finished
                .catch(() => {})
                .finally(() => {
                    document.documentElement.classList.remove('transition-backward');
                    if (typeof window !== 'undefined') {
                        (window as any).__navigatingWithTransition = false;
                    }
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
