'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import { useStackNavigation } from '@/context/StackNavigationContext';

export const reservedRoutes = ['chats', 'search', 'profile', 'settings', 'login', 'sso-callback', 'api', 'admin', 'termos-de-uso', 'politica-de-privacidade', 'institucional', 'onboarding', 'ajuda', 'founders', 'para-criadoras', 'creators', 'para-criadoras2'];

export const isReservedRoute = (path: string) => {
    const cleaned = path.replace(/^\//, ''); // Remove leading slash
    const parts = cleaned.split('/');
    const base = parts[0];
    return reservedRoutes.includes(base) || base === '';
};

export function useTransitionRouter() {
    const router = useNextRouter();
    
    let stackNav: any = null;
    try {
        // Envolve em try/catch para evitar erros se for usado fora do StackNavigationProvider
        stackNav = useStackNavigation();
    } catch {
        stackNav = null;
    }

    const push = (href: string) => {
        if (stackNav) {
            // 1. Verifica se é rota de chat (/chat/userId)
            const chatMatch = href.match(/^\/chat\/([^\/]+)$/);
            if (chatMatch) {
                const userId = chatMatch[1];
                stackNav.pushVirtual('chat', { userId });
                return;
            }

            // 2. Verifica se é rota de perfil público (/[username])
            // Remove o prefixo / e @ se houver
            const cleanedPath = href.replace(/^\//, '');
            if (!isReservedRoute(href) && cleanedPath.length > 0) {
                const username = cleanedPath.replace(/^@/, '');
                stackNav.pushVirtual('profile', { username });
                return;
            }

            // 3. Verifica se é rota de configurações (/settings)
            if (href === '/settings') {
                stackNav.pushVirtual('settings', {});
                return;
            }
        }

        // Fallback para View Transitions nativas
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
        if (stackNav && stackNav.isVirtualActive) {
            // Se a pilha virtual está ativa, voltar retrocede o histórico do navegador.
            // O event listener de popstate no StackNavigationContext vai capturar e fechar a tela virtual.
            router.back();
            return;
        }

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

