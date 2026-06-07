'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPromptModal } from '@/components';
import { StackNavigationProvider, useStackNavigation } from '@/context/StackNavigationContext';
import { isReservedRoute } from '@/hooks/useTransitionRouter';
import ChatPage from './chat/[userId]/page';
import UserProfilePage from './[username]/page';
import SettingsPage from './settings/page';

const isTabRoute = (path: string) => {
    return ['/chats', '/search', '/profile', '/'].includes(path);
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const { handleRequestPermission } = usePushNotifications();
    const { screens, popVirtual, pushVirtual } = useStackNavigation();
    const screensRef = useRef(screens);
    const [isNavInitialized, setIsNavInitialized] = React.useState(false);

    useEffect(() => {
        screensRef.current = screens;
    }, [screens]);

    // Inicialização de roteamento para Deep Links no carregamento inicial da sessão
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const initDeepLinkRoute = async () => {
            if (typeof window === 'undefined') return;

            // Se houver um redirecionamento pendente no localStorage (pós-login), usamos ele!
            // Usamos localStorage em vez de sessionStorage para sobreviver a redirects OAuth no PWA.
            const pendingRedirect = localStorage.getItem('mimo_redirect_after_login');
            if (pendingRedirect) {
                localStorage.removeItem('mimo_redirect_after_login');
                // Marcamos um flag para que o initDeepLinkRoute não reprocesse a URL
                // depois que o router.replace levar para a nova página (ex: /juaccioli/chat)
                (window as any).__mimo_handled_pending_redirect = true;
                (window as any).__mimo_nav_initialized = true;
                router.replace(pendingRedirect);
                // A página [username]/chat tem sua própria tela de loading enquanto resolve o username.
                // Não precisamos de splash screen extra — inicializamos imediatamente.
                setIsNavInitialized(true);
                return;
            }

            // Se já inicializamos o roteamento nesta sessão do app, não repetimos
            if ((window as any).__mimo_nav_initialized) {
                setIsNavInitialized(true);
                return;
            }
            (window as any).__mimo_nav_initialized = true;

            const currentPath = window.location.pathname;

            // 1. Caso seja rota de chat: /chat/userId
            const chatMatch = currentPath.match(/^\/chat\/([^\/]+)$/);
            if (chatMatch) {
                const userId = chatMatch[1];
                // Redireciona fisicamente para /chats com openChat para que o layout abra a tela virtual
                // por cima de forma consistente e evite o bug de voltar do histórico.
                router.replace(`/chats?openChat=${userId}`);
                setIsNavInitialized(true);
                return;
            }

            // 2. Caso seja rota de configurações: /settings
            if (currentPath === '/settings') {
                router.replace('/profile');
                pushVirtual('settings', {});
                setTimeout(() => {
                    setIsNavInitialized(true);
                }, 150);
                return;
            }

            // 3. Caso seja rota de perfil público: /[username]
            // ATENÇÃO: Rotas como /juaccioli/chat são tratadas pela própria página [username]/chat.
            // Aqui tratamos apenas o caso /[username] sem subrotas adicionais.
            const cleanedPath = currentPath.replace(/^\//, '');
            // Ignora caminhos com sub-segmentos (ex: juaccioli/chat) — a página cuida disso
            if (cleanedPath.length > 0 && !cleanedPath.includes('/') && !isReservedRoute(currentPath)) {
                const username = cleanedPath.replace(/^@/, '');
                router.replace('/chats');
                pushVirtual('profile', { username });
                setTimeout(() => {
                    setIsNavInitialized(true);
                }, 150);
                return;
            }

            // Se for uma rota base ou qualquer outra, apenas inicializa
            setIsNavInitialized(true);
        };

        initDeepLinkRoute();
    }, [isLoaded, isSignedIn]);

    // Escuta parâmetros de busca (query params) para abrir salas de chat virtuais
    useEffect(() => {
        if (typeof window === 'undefined' || !isNavInitialized) return;

        const params = new URLSearchParams(window.location.search);
        const openChatId = params.get('openChat');
        const giftCode = params.get('gift');

        if (openChatId) {
            // Remove os query params da URL silenciosamente para não reabrir o chat ao atualizar a página
            const url = new URL(window.location.href);
            url.searchParams.delete('openChat');
            url.searchParams.delete('gift');
            window.history.replaceState({}, '', url.pathname + url.search);

            pushVirtual('chat', { userId: openChatId, giftCode: giftCode || undefined });
        }
    }, [pathname, isNavInitialized, pushVirtual]);

    useEffect(() => {
        // Se a rota for o chat, deixamos a própria página de chat gerenciar a resolução
        // para aguardar o carregamento das mensagens do cache.
        // Para outras rotas, resolvemos a transição pendente imediatamente.
        if (pathname && !pathname.includes('/chat/')) {
            if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
                (window as any).__resolveTransition();
                (window as any).__resolveTransition = null;
            }
        }
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('startViewTransition' in document)) return;

        const handlePopState = () => {
            if (screensRef.current.length > 0) {
                return;
            }

            // Ignora a animação View Transition de slide se estivermos navegando (voltando) entre abas principais do rodapé
            const destination = window.location.pathname;
            if (isTabRoute(pathname) && isTabRoute(destination)) {
                return;
            }

            if ((window as any).__navigatingWithTransition) {
                return;
            }

            document.documentElement.classList.add('transition-backward');
            document.documentElement.classList.remove('transition-forward');

            const transition = (document as any).startViewTransition(() => {
                return new Promise<void>((resolve) => {
                    (window as any).__resolveTransition = () => {
                        setTimeout(resolve, 50);
                    };

                    setTimeout(() => {
                        if ((window as any).__resolveTransition) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 1000);
                });
            });

            if (transition.ready) {
                transition.ready.catch(() => {});
            }

            transition.finished
                .catch(() => {})
                .finally(() => {
                    document.documentElement.classList.remove('transition-backward');
                });
        };

        window.addEventListener('popstate', handlePopState, true);
        return () => {
            window.removeEventListener('popstate', handlePopState, true);
        };
    }, []);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            if (typeof window !== 'undefined') {
                const searchParams = new URLSearchParams(window.location.search);
                const gift = searchParams.get('gift');
                if (gift) {
                    // localStorage persiste em redirects OAuth no PWA (sessionStorage pode ser destruído)
                    localStorage.setItem('mimo_pending_gift', gift);
                }
                const currentPath = window.location.pathname + window.location.search;
                if (window.location.pathname && window.location.pathname !== '/login' && window.location.pathname !== '/') {
                    localStorage.setItem('mimo_redirect_after_login', currentPath);
                }
            }
            router.replace('/login');
        }
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (isSignedIn && user) {
            setupAxiosInterceptors(getToken);
            // Apenas renova/atualiza o token se a permissão já foi dada
            // Evita disparar prompt automático no carregamento (bloqueado no iOS)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                handleRequestPermission();
            }
        }
    }, [isSignedIn, user, getToken]);

    if (!isLoaded || (isSignedIn && !isNavInitialized)) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
                <div className="flex flex-col items-center animate-fade-in-up">
                    {/* Logo do MimoChat */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 animate-pulse">
                        <img 
                            src="/icon-192x192.png" 
                            alt="MimoChat Logo" 
                            className="w-20 h-20 md:w-24 md:h-24 object-contain"
                        />
                    </div>
                    {/* Nome do Aplicativo */}
                    <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-wider drop-shadow-md">
                        MimoChat
                    </h1>
                    <p className="text-purple-200 text-xs md:text-sm tracking-widest mt-1 uppercase font-semibold opacity-80">
                        Conectando você de verdade
                    </p>
                </div>
                {/* Loader Sutil */}
                <div className="absolute bottom-12 flex flex-col items-center">
                    <div className="flex space-x-1.5 justify-center items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isSignedIn) return null;

    return (
        <div className="bg-black min-h-screen w-full relative overflow-hidden">
            {children}
            
            {/* Pilha de Telas Virtuais */}
            {screens.map((screen) => {
                const isClosing = screen.isClosing;
                const animationClass = isClosing ? 'animate-android-slide-out' : 'animate-android-slide-in';
                return (
                    <div
                        key={screen.key}
                        className={`fixed inset-0 z-50 w-full h-full bg-white select-none no-select ${animationClass}`}
                    >
                        {screen.type === 'chat' && (
                            <ChatPage
                                userId={screen.params.userId}
                                giftCode={screen.params.giftCode}
                                isSubPage={true}
                                isClosing={isClosing}
                                onBack={popVirtual}
                            />
                        )}
                        {screen.type === 'profile' && (
                            <UserProfilePage
                                username={screen.params.username}
                                isSubPage={true}
                                isClosing={isClosing}
                                onBack={popVirtual}
                            />
                        )}
                        {screen.type === 'settings' && (
                            <SettingsPage
                                isSubPage={true}
                                isClosing={isClosing}
                                onBack={popVirtual}
                            />
                        )}
                    </div>
                );
            })}

            <NotificationPromptModal />
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <StackNavigationProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </StackNavigationProvider>
    );
}

