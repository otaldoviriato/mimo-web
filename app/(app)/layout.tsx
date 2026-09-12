'use client';
import { ReceiptConsentModal } from '@/components/ReceiptConsentModal';
import { requiresReceiptConsent } from '@/lib/receiptBilling';
import { Gift, X } from 'lucide-react';


import React, { Suspense, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPromptModal } from '@/components';
import { StackNavigationProvider, useStackNavigation } from '@/context/StackNavigationContext';
import { isStackBasePath, readStackEntry, resolveStackRoute } from '@/lib/stackHistory';
import { StackBase } from '@/components/StackBase';
import { useMyProfile, useChatRooms, QueryKeys } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { usePageTitleNotifications } from '@/hooks/usePageTitleNotifications';
import ChatPage from '@/components/screens/ChatScreen';
import ChatInfoPage from '@/components/screens/ChatInfoScreen';
import UserProfilePage from '@/components/screens/UserProfileScreen';
import SettingsPage from '@/components/screens/SettingsScreen';
import { REFERRAL_STORAGE_KEY, getReferralFromSearchParams } from '@/lib/referral';
import { calculateOnboardingStep } from '@/lib/onboarding';
import { consumePostAuthRedirect, storePostAuthRedirect } from '@/lib/postAuthRedirect';


const isTabRoute = (path: string) => {
    return ['/chats', '/search', '/profile', '/wallet', '/'].includes(path);
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const { data: userData, isLoading: isProfileLoading, refetch: refetchProfile } = useMyProfile();
    
    // Garante que o perfil carregado no cache/Query pertence ao usuário atualmente logado no Clerk
    const isProfileValid = !!(userData && user && userData.clerkId === user.id);
    
    const onboardingStep = isProfileValid ? calculateOnboardingStep(userData) : null;

    const needsReceiptConsent = isProfileValid && requiresReceiptConsent(userData);
    const isFullyCompleted = onboardingStep === 'completed' && !needsReceiptConsent;
    const isProfileResolved = isLoaded && isSignedIn && !isProfileLoading && isProfileValid;
    const shouldBlockAppRender = isLoaded && isSignedIn && (!isProfileResolved || !isFullyCompleted);

    const router = useRouter();
    const pathname = usePathname();
    const { handleRequestPermission } = usePushNotifications();
    const { screens, basePath, popVirtual, initialize } = useStackNavigation();
    const searchParams = useSearchParams();
    const pendingRedirectHandled = useRef(false);
    const screensRef = useRef(screens);
    const [isNavInitialized, setIsNavInitialized] = React.useState(false);
    const [isProfessionalReleased, setIsProfessionalReleased] = React.useState<boolean | null>(null);
    const [fadeOutRelease, setFadeOutRelease] = React.useState(false);

    const queryClient = useQueryClient();
    const { socket, connected, socketVersion } = useSocket(isFullyCompleted ? user?.id : undefined);
    const { data: rooms = [], isSuccess: roomsLoaded } = useChatRooms({ enabled: isFullyCompleted });

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
            isInactive?: boolean;
            lastExchangeTime?: string;
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
                                lastMessageSenderId: data.senderId,
                                isInactive: data.isInactive,
                                lastExchangeTime: data.lastExchangeTime,
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



    // Build ancestry and browser entries together before exposing the destination.
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !isFullyCompleted || pathname === '/onboarding') return;
        let cancelled = false;
        // Run after Next's parent effects install the public History API adapter.
        queueMicrotask(() => {
            if (cancelled) return;
            let href = window.location.pathname + window.location.search + window.location.hash;
            if (!pendingRedirectHandled.current) {
                pendingRedirectHandled.current = true;
                if (localStorage.getItem('mimo_redirect_after_login')) {
                    const pending = consumePostAuthRedirect();
                    if (pending !== href) {
                        if (resolveStackRoute(pending)) {
                            href = pending;
                        } else {
                            router.replace(pending);
                            return;
                        }
                    }
                }
            }
            initialize(href);
            setIsNavInitialized(true);
        });
        return () => { cancelled = true; };
    }, [isLoaded, isSignedIn, isFullyCompleted, pathname, searchParams, initialize, router]);

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
                const referral = getReferralFromSearchParams(searchParams);
                if (referral) {
                    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referral));
                }
                const currentPath = window.location.pathname + window.location.search;
                if (
                    window.location.pathname &&
                    window.location.pathname !== '/login' &&
                    window.location.pathname !== '/' &&
                    window.location.pathname !== '/settings'
                ) {
                    storePostAuthRedirect(currentPath);
                }
            }
            router.replace('/login');
        }
    }, [isLoaded, isSignedIn, isFullyCompleted, pathname]);

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
        if (pathname === '/onboarding') return;

        if (isProfileResolved && !isFullyCompleted && !needsReceiptConsent) {
            router.replace('/onboarding');
            return;
        }

        // Se o cliente (homem) logar ou criar conta e não houver chats, redireciona para o Explorar (/search)
        if (
            isFullyCompleted &&
            roomsLoaded &&
            !userData?.isProfessional &&
            pathname === '/chats' &&
            !readStackEntry(window.history.state)
        ) {
            const hasPostLoginFlag = typeof window !== 'undefined' && localStorage.getItem('mimo_post_login_check_rooms') === 'true';
            const hasNotNavigatedYet = typeof window !== 'undefined' && !sessionStorage.getItem('mimo_has_navigated_chats');

            if (rooms.length === 0 && (hasPostLoginFlag || hasNotNavigatedYet)) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('mimo_post_login_check_rooms');
                    sessionStorage.setItem('mimo_has_navigated_chats', 'true');
                }
                router.replace('/search');
            } else if (typeof window !== 'undefined' && hasPostLoginFlag) {
                localStorage.removeItem('mimo_post_login_check_rooms');
                sessionStorage.setItem('mimo_has_navigated_chats', 'true');
            }
        }
    }, [isProfileResolved, isFullyCompleted, needsReceiptConsent, roomsLoaded, userData?.isProfessional, rooms, pathname, router]);

    if (!isSignedIn) return null;
    if (needsReceiptConsent) return <ReceiptConsentModal onAccepted={refetchProfile} />;

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
    if (!shouldBlockAppRender && !isNavInitialized) {
        return <div className="min-h-screen bg-slate-50" role="status" aria-label="Carregando tela" />;
    }

    if (shouldBlockAppRender) {
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
            <div inert={screens.length > 0} aria-hidden={screens.length > 0 || undefined} className={isProfessionalReleased === false ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'}>
                {basePath || isStackBasePath(pathname) ? <StackBase path={basePath || pathname} active={screens.every(screen => screen.isClosing)} /> : children}
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
                if (!screen.mounted) return null;
                const isClosing = screen.isClosing;
                const animationClass = isClosing ? 'animate-android-slide-out' : screen.animate ? 'animate-android-slide-in' : '';
                return (
                    <div
                        key={screen.key}
                        inert={screen !== screens[screens.length - 1] || !!screen.isClosing}
                        aria-hidden={screen !== screens[screens.length - 1] || !!screen.isClosing || undefined}
                        className={`fixed inset-0 z-50 w-full h-full bg-white select-none no-select ${animationClass}`}
                    >
                        {screen.type === 'chat' && (
                            <ChatPage
                                userId={screen.params.userId}
                                initialUser={screen.params.initialUser}
                                giftCode={screen.params.giftCode}
                                isSubPage={true}
                                isClosing={isClosing}
                                onBack={popVirtual}
                            />
                        )}
                        {screen.type === 'chatInfo' && (
                            <ChatInfoPage
                                userId={screen.params.userId}
                            />
                        )}
                        {screen.type === 'profile' && (
                            <UserProfilePage
                                username={screen.params.username}
                                initialUser={screen.params.initialUser}
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={handleCloseWelcomeNotice}
                    />
                    <div className="relative w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-5 zoom-in-95 duration-250">
                        <div className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 text-slate-900 shadow-2xl shadow-purple-950/15">
                            {/* Botão Fechar discreto */}
                            <button
                                type="button"
                                aria-label="Fechar"
                                onClick={handleCloseWelcomeNotice}
                                className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Ícone de Presente Harmonioso */}
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-8 ring-purple-50/50">
                                <Gift className="h-7 w-7" />
                            </div>

                            {/* Título & Mensagem Enxuta */}
                            <div className="text-center space-y-1.5">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                    {welcomeNotice.title || 'Você ganhou créditos de presente!'}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Adicionamos créditos na sua conta para você conversar e trocar mensagens com as criadoras agora mesmo.
                                </p>
                            </div>

                            {/* Linha Discreta de Saldo Disponível (Sem número gigante) */}
                            <div className="my-5 flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-slate-600">Saldo disponível</span>
                                </div>
                                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100/80 px-2.5 py-1 rounded-full">
                                    {((welcomeNotice.amount) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>

                            {/* Botão de Ação */}
                            <button
                                type="button"
                                onClick={handleCloseWelcomeNotice}
                                className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-purple-600/25 transition-all flex items-center justify-center cursor-pointer"
                            >
                                Começar a conversar
                            </button>
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
            <Suspense fallback={<div className="min-h-screen bg-slate-50" role="status" aria-label="Carregando tela" />}>
                <AppLayoutContent>{children}</AppLayoutContent>
            </Suspense>
        </StackNavigationProvider>
    );
}

