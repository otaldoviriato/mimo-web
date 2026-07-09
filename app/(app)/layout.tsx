'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPromptModal } from '@/components';
import { StackNavigationProvider, useStackNavigation } from '@/context/StackNavigationContext';
import { isReservedRoute } from '@/hooks/useTransitionRouter';
import { useMyProfile, useChatRooms, QueryKeys } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { usePageTitleNotifications } from '@/hooks/usePageTitleNotifications';
import ChatPage from './chat/[userId]/page';
import UserProfilePage from './[username]/page';
import SettingsPage from './settings/page';


const isTabRoute = (path: string) => {
    return ['/chats', '/search', '/profile', '/'].includes(path);
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const { data: userData, refetch: refetchProfile } = useMyProfile();
    
    // Garante que o perfil carregado no cache/Query pertence ao usuário atualmente logado no Clerk
    const isProfileValid = !!(userData && user && userData.clerkId === user.id);
    
    // O usuário precisa de validação de identidade se ele escolheu a role mas não tem CPF (taxId)
    const userNeedsIdentity =
        isProfileValid &&
        userData.isProfessional !== undefined &&
        !userData.taxId;

    // Determina dinamicamente se o usuário já preencheu absolutamente todos os dados
    const isFullyCompleted =
        isProfileValid &&
        userData.isProfessional !== undefined &&
        !!userData.taxId &&
        !!userData.photoUrl &&
        !!userData.name &&
        !!userData.username;

    const router = useRouter();
    const pathname = usePathname();
    const { handleRequestPermission } = usePushNotifications();
    const { screens, popVirtual, pushVirtual } = useStackNavigation();
    const screensRef = useRef(screens);
    const [isNavInitialized, setIsNavInitialized] = React.useState(false);
    const [isProfessionalReleased, setIsProfessionalReleased] = React.useState<boolean | null>(null);
    const [fadeOutRelease, setFadeOutRelease] = React.useState(false);

    const queryClient = useQueryClient();
    const { socket, connected, socketVersion } = useSocket(user?.id);
    const { data: rooms = [] } = useChatRooms();

    const [welcomeNotice, setWelcomeNotice] = React.useState<{
        grantId: string;
        amount: number;
        title: string;
        description: string;
    } | null>(null);

    useEffect(() => {
        if (userData?.welcomeCreditNotice) {
            setWelcomeNotice(userData.welcomeCreditNotice);
        }
    }, [userData]);

    const handleCloseWelcomeNotice = async () => {
        if (!welcomeNotice) return;
        const grantId = welcomeNotice.grantId;
        setWelcomeNotice(null);
        
        // Remove do cache local para não reabrir em outras navegações rápidas
        queryClient.setQueryData(QueryKeys.me, (old: any) =>
            old ? { ...old, welcomeCreditNotice: null } : old
        );

        try {
            await fetch('/api/users/me/welcome-credit-notice-shown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grantId })
            });
            refetchProfile();
        } catch (err) {
            console.error('Falha ao confirmar aviso de boas-vindas visualizado:', err);
        }
    };

    // ─── Socket Listeners Globais para Sincronização de Estado ──────────────────
    useEffect(() => {
        if (!socket || !user?.id) return;

        // 1. Atualiza o saldo via socket (balance_update)
        const handleBalanceUpdate = (data: { userId: string; balance: number }) => {
            if (data.userId === user.id) {
                queryClient.setQueryData(QueryKeys.me, (old: any) =>
                    old ? { ...old, balance: data.balance } : old
                );
            }
        };

        // 2. Atualiza a lista de salas quando uma nova mensagem chega
        const handleRoomUpdated = (data: {
            roomId: string;
            mongoRoomId?: string;
            lastMessage: string;
            lastMessageTime: string;
            senderId: string;
        }) => {
            let matchedRoom = false;
            queryClient.setQueryData(
                QueryKeys.rooms(user.id!),
                (old: any[] | undefined) => {
                    if (!old) return old;
                    const updated = old.map((room) => {
                        const derivedRoomId = room.roomId ?? [...room.participants].sort().join('_');
                        const match = room._id === data.mongoRoomId
                            || derivedRoomId === data.roomId;
                        if (match) {
                            matchedRoom = true;
                            const currentUnread = room.unreadCount?.[user.id!] ?? 0;
                            const isMe = data.senderId === user.id;
                            return {
                                ...room,
                                lastMessage: data.lastMessage,
                                lastMessageTime: data.lastMessageTime,
                                updatedAt: data.lastMessageTime,
                                unreadCount: {
                                    ...room.unreadCount,
                                    [user.id!]: isMe ? currentUnread : currentUnread + 1,
                                },
                            };
                        }
                        return room;
                    });
                    // Reordena por mensagem mais recente
                    return [...updated].sort(
                        (a, b) =>
                            new Date(b.lastMessageTime ?? b.updatedAt).getTime() -
                            new Date(a.lastMessageTime ?? a.updatedAt).getTime()
                    );
                }
            );
            if (!matchedRoom) {
                queryClient.invalidateQueries({ queryKey: QueryKeys.rooms(user.id!) });
            }
        };

        // 3. Marca sala como lida
        const handleRoomRead = (data: { roomId: string; userId: string }) => {
            queryClient.setQueryData(
                QueryKeys.rooms(user.id!),
                (old: any[] | undefined) => {
                    if (!old) return old;
                    return old.map((room) => {
                        const derivedRoomId = room.roomId ?? [...room.participants].sort().join('_');
                        if (derivedRoomId === data.roomId) {
                            return {
                                ...room,
                                unreadCount: {
                                    ...room.unreadCount,
                                    [user.id!]: 0,
                                },
                            };
                        }
                        return room;
                    });
                }
            );
        };

        // 4. Invalida salas quando uma sala é excluída
        const handleRoomDeletedOnSocket = (data: { roomId: string }) => {
            queryClient.invalidateQueries({ queryKey: QueryKeys.rooms(user.id!) });
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('room_updated', handleRoomUpdated);
        socket.on('room_read', handleRoomRead);
        socket.on('room_deleted', handleRoomDeletedOnSocket);

        return () => {
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('room_updated', handleRoomUpdated);
            socket.off('room_read', handleRoomRead);
            socket.off('room_deleted', handleRoomDeletedOnSocket);
        };
    }, [socket, socketVersion, user?.id, queryClient]);

    // ─── Título de Notificação no Navegador ──────────────────────────────────
    const totalUnreads = React.useMemo(() => {
        if (!user?.id) return 0;
        // Filtra e conta a quantidade de salas (conversas) que possuem mensagens não lidas
        return rooms.filter((room: any) => (room.unreadCount?.[user.id!] ?? 0) > 0).length;
    }, [rooms, user?.id]);

    usePageTitleNotifications(totalUnreads);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const released = localStorage.getItem('mimo_professional_released');
            if (released === 'false') {
                setIsProfessionalReleased(false);
            } else {
                setIsProfessionalReleased(true);
            }
        }
    }, [pathname]);

    useEffect(() => {
        if (isProfessionalReleased === false) {
            // Inicia o timer da animação de liberação flutuante
            const fadeTimer = setTimeout(() => {
                setFadeOutRelease(true);
            }, 2500);

            const endTimer = setTimeout(() => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('mimo_professional_released', 'true');
                }
                setIsProfessionalReleased(true);
            }, 3500);

            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(endTimer);
            };
        }
    }, [isProfessionalReleased]);

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
                
                // Se o redirecionamento pendente for para configurações, ignoramos para evitar
                // o redirecionamento incorreto e o bug do botão de voltar para o Google OAuth.
                if (pendingRedirect === '/settings' || pendingRedirect.startsWith('/settings?')) {
                    setIsNavInitialized(true);
                    return;
                }

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
                router.replace('/profile?openSettings=true');
                setIsNavInitialized(true);
                return;
            }

            // 3. Caso seja rota de perfil público: /[username]
            // ATENÇÃO: Rotas como /juaccioli/chat são tratadas pela própria página [username]/chat.
            // Aqui tratamos apenas o caso /[username] sem subrotas adicionais.
            const cleanedPath = currentPath.replace(/^\//, '');
            // Ignora caminhos com sub-segmentos (ex: juaccioli/chat) — a página cuida disso
            if (cleanedPath.length > 0 && !cleanedPath.includes('/') && !isReservedRoute(currentPath)) {
                const username = cleanedPath.replace(/^@/, '');
                router.replace(`/chats?openProfile=${username}`);
                setIsNavInitialized(true);
                return;
            }

            // Se for uma rota base ou qualquer outra, apenas inicializa
            setIsNavInitialized(true);
        };

        initDeepLinkRoute();
    }, [isLoaded, isSignedIn]);

    // Escuta parâmetros de busca (query params) para abrir salas de chat ou perfis virtuais
    useEffect(() => {
        if (typeof window === 'undefined' || !isNavInitialized) return;

        const params = new URLSearchParams(window.location.search);
        const openChatId = params.get('openChat');
        const openProfileUsername = params.get('openProfile');
        const openSettings = params.get('openSettings');
        const giftCode = params.get('gift');

        if (openChatId) {
            // Remove os query params da URL silenciosamente para não reabrir o chat ao atualizar a página
            const url = new URL(window.location.href);
            url.searchParams.delete('openChat');
            url.searchParams.delete('gift');
            window.history.replaceState({}, '', url.pathname + url.search);

            pushVirtual('chat', { userId: openChatId, giftCode: giftCode || undefined });
        } else if (openProfileUsername) {
            // Remove os query params da URL silenciosamente para não reabrir o perfil ao atualizar a página
            const url = new URL(window.location.href);
            url.searchParams.delete('openProfile');
            window.history.replaceState({}, '', url.pathname + url.search);

            pushVirtual('profile', { username: openProfileUsername });
        } else if (openSettings) {
            // Remove os query params da URL silenciosamente para não reabrir as configurações ao atualizar a página
            const url = new URL(window.location.href);
            url.searchParams.delete('openSettings');
            window.history.replaceState({}, '', url.pathname + url.search);

            pushVirtual('settings', {});
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
                if (
                    window.location.pathname &&
                    window.location.pathname !== '/login' &&
                    window.location.pathname !== '/' &&
                    window.location.pathname !== '/settings'
                ) {
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

    useEffect(() => {
        if (isFullyCompleted && typeof window !== 'undefined') {
            const step = localStorage.getItem('mimo_onboarding_step');
            if (step) {
                console.log('[Layout] Limpando mimo_onboarding_step obsoleto do localStorage');
                localStorage.removeItem('mimo_onboarding_step');
            }
        }
    }, [isFullyCompleted]);

    useEffect(() => {
        // Redireciona para o onboarding em três casos:
        // 1. Usuário ainda não escolheu seu papel (cliente ou profissional)
        // 2. Profissional que precisa completar a verificação de identidade
        // 3. Usuário no meio do onboarding (step salvo no localStorage) que tentou acessar outra rota
        if (pathname === '/onboarding') return;
        if (isFullyCompleted) return; // Se já está completamente completo, não redireciona!

        if (isProfileValid && userData?.isProfessional === undefined) {
            router.replace('/onboarding');
            return;
        }
        if (userNeedsIdentity) {
            router.replace('/onboarding');
            return;
        }
        if (isProfileValid && typeof window !== 'undefined') {
            const step = localStorage.getItem('mimo_onboarding_step');
            if (step === 'identity' || step === 'profile') {
                router.replace('/onboarding');
            }
        }
    }, [isProfileValid, userData?.isProfessional, userNeedsIdentity, isFullyCompleted, pathname, router]);

    if (!isLoaded || (isSignedIn && !isNavInitialized)) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
                <div className="flex flex-col items-center animate-fade-in-up">
                    {/* Logo do MimoChat */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 animate-pulse">
                        <img 
                            src="/Logo.svg" 
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

    // Se o banco local oficial nos disser que o perfil é pendente, limpamos qualquer resíduo local de liberação anterior
    if (typeof window !== 'undefined' && isProfileValid && userData.isProfessional && userData.professionalStatus === 'pending') {
        if (localStorage.getItem('mimo_professional_released') !== null) {
            localStorage.removeItem('mimo_professional_released');
        }
    }


    // Evita hydration mismatch e vazamento visual enquanto carrega o perfil ou o estado de liberação local
    const isResolvingSecurity = (isSignedIn && !isProfileValid) || (isProfileValid && userData.isProfessional && isProfessionalReleased === null);


    if (isResolvingSecurity) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
                <div className="flex flex-col items-center animate-fade-in-up">
                    {/* Logo do MimoChat */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 animate-pulse">
                        <img 
                            src="/Logo.svg" 
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

    // Permite que /onboarding renderize seus próprios filhos — ele gerencia todo o fluxo de cadastro.
    if (pathname === '/onboarding') {
        return <>{children}</>;
    }

    // ── Guard de onboarding síncrono ────────────────────────────────────────
    //
    // Verifica NO CORPO DO RENDER (não em useEffect) se o onboarding precisa
    // ser concluído. O useEffect de redirect abaixo vai disparar logo em seguida,
    // mas sem este guard síncrono o app renderizaria brevemente antes do redirect
    // (flash visual). A leitura de localStorage é segura aqui porque este componente
    // é 'use client' e nunca executa no servidor.
    //
    // Três condições bloqueiam o acesso ao app:
    //  1. isProfessional === undefined  → usuário nunca escolheu cliente/profissional
    //  2. professionalNeedsIdentity     → profissional sem verificação de identidade
    //  3. mimo_onboarding_step no localStorage → no meio do fluxo de cadastro
    const hasPendingOnboardingStep =
        isProfileValid &&
        !isFullyCompleted &&
        typeof window !== 'undefined' &&
        (['identity', 'profile'].includes(localStorage.getItem('mimo_onboarding_step') ?? ''));

    const needsOnboarding =
        !isFullyCompleted &&
        ((isProfileValid && userData?.isProfessional === undefined) ||
        userNeedsIdentity ||
        hasPendingOnboardingStep);

    if (needsOnboarding) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
                <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 animate-pulse">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat Logo"
                        className="w-16 h-16 object-contain"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen w-full relative overflow-hidden">
            <div className={isProfessionalReleased === false ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'}>
                {children}
            </div>

            {/* Animação Premium de Acesso Liberado */}
            {isProfessionalReleased === false && (
                <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 text-slate-900 overflow-hidden transition-all duration-[1000ms] ease-in-out ${
                    fadeOutRelease ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-none scale-100'
                }`}>
                    {/* Efeito de flash e liberação */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100/60 via-fuchsia-100/60 to-slate-50 animate-pulse"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50"></div>
                    
                    <div className="relative z-[10000] text-center space-y-6 max-w-md p-6">
                        <div className="relative mx-auto w-24 h-24 bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25 animate-bounce">
                            <img 
                                src="/Logo.svg" 
                                alt="Mimo Logo" 
                                className="w-14 h-14 object-contain brightness-0 invert"
                            />
                            <span className="absolute inset-0 rounded-3xl border border-white/40 animate-ping"></span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600">
                                Acesso Liberado!
                            </h1>
                            <p className="text-sm font-bold text-purple-700">
                                Sua conta foi aprovada! Prepare-se para a experiência.
                            </p>
                        </div>
                        <div className="flex space-x-1.5 justify-center items-center pt-2">
                            <span className="w-2.5 h-2.5 bg-fuchsia-500 rounded-full animate-ping" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                </div>
            )}
            
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

            {/* Modal de Crédito de Boas-vindas */}
            {welcomeNotice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 select-none no-select">
                    <div
                        className="absolute inset-0 bg-purple-950/35 backdrop-blur-[2px] animate-in fade-in duration-200"
                        onClick={handleCloseWelcomeNotice}
                    />
                    <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-300">
                        <div className="relative overflow-hidden rounded-[28px] border border-purple-100 bg-white text-gray-900 shadow-2xl">
                            <button
                                type="button"
                                aria-label="Fechar"
                                onClick={handleCloseWelcomeNotice}
                                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>

                            <div className="h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-500" />

                            <div className="px-6 pb-6 pt-7">
                                <div className="mb-5 flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                        </svg>
                                    </div>
                                    <div className="min-w-0 pr-7">
                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-500">Crédito de Boas-vindas</p>
                                        <h2 className="text-[22px] font-semibold leading-tight tracking-normal text-gray-900">{welcomeNotice.title}</h2>
                                    </div>
                                </div>

                                <div className="mb-5 rounded-2xl border border-purple-100 bg-purple-50/60 px-5 py-4">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <p className="mb-1 text-sm text-gray-500">Valor adicionado</p>
                                            <p className="text-[42px] font-semibold leading-none tracking-normal text-purple-700">
                                                {((welcomeNotice.amount) / 100).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                    maximumFractionDigits: 0,
                                                })}
                                            </p>
                                        </div>
                                        <svg className="mb-1 shrink-0 text-emerald-500" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <div className="mt-4 h-px bg-purple-100" />
                                    <p className="mt-4 text-sm leading-relaxed text-gray-600">
                                        {welcomeNotice.description}
                                    </p>
                                </div>

                                <button
                                    onClick={handleCloseWelcomeNotice}
                                    className="w-full rounded-2xl bg-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-700 active:scale-[0.99]"
                                >
                                    Começar a conversar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

