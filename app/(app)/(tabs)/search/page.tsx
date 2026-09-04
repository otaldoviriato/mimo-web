'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/services/api';
import { useMyProfile, useFeaturedUsers } from '@/hooks/useQueries';
import { Search, X } from 'lucide-react';
import { trackAcquisitionEvent } from '@/lib/clientAcquisitionAnalytics';

const calculateAge = (birthDateString?: string | Date) => {
    if (!birthDateString) return null;
    try {
        const birthDateObj = new Date(birthDateString);
        if (isNaN(birthDateObj.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        return age;
    } catch {
        return null;
    }
};

const formatOnlineStatus = (
    lastSeen?: string | Date | number,
    isOnline?: boolean
): { isOnline: boolean; label: string } => {
    const now = Date.now();
    let timestamp = 0;

    if (lastSeen) {
        const d = new Date(lastSeen).getTime();
        if (!isNaN(d)) timestamp = d;
    }

    // Se o socket indicar online ou se a última atividade foi há menos de 10 minutos -> Online
    if (isOnline || (timestamp > 0 && (now - timestamp) < 10 * 60 * 1000)) {
        return { isOnline: true, label: 'Online' };
    }

    if (!timestamp) {
        return { isOnline: false, label: '' };
    }

    const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));

    if (diffMinutes < 60) {
        return { isOnline: false, label: `Online há ${diffMinutes} min` };
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return { isOnline: false, label: `Online há ${diffHours}h` };
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
        return { isOnline: false, label: 'Online ontem' };
    }
    return { isOnline: false, label: `Online há ${diffDays} dias` };
};

export default function SearchPage() {
    const router = useRouter();
    const { data: userData } = useMyProfile();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const {
        data: featuredUsers = [],
        isLoading: loadingFeatured,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFeaturedUsers();
    const [error, setError] = useState('');
    const exposedProfiles = useRef(new Set<string>());
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        if (userData?.isProfessional) {
            router.replace('/chats');
        }
    }, [userData, router]);

    const clearSearch = () => {
        setUsername('');
        setFoundUsers([]);
        setError('');
        setLoading(false);
    };

    // Resolve a transição de visualização imediatamente para não travar a animação de volta
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }

        const handleToggle = () => setIsSearchOpen(prev => !prev);
        window.addEventListener('mimo:toggle-search', handleToggle);
        return () => window.removeEventListener('mimo:toggle-search', handleToggle);
    }, []);

    useEffect(() => {
        if (userData?.isProfessional || username.trim() || loadingFeatured) return;

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
                const professionalId = (entry.target as HTMLElement).dataset.exploreProfessionalId;
                if (!professionalId || exposedProfiles.current.has(professionalId)) continue;

                exposedProfiles.current.add(professionalId);
                trackAcquisitionEvent({
                    eventType: 'explore_profile_impression',
                    professionalId,
                });
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.5 });

        const cards = document.querySelectorAll<HTMLElement>('[data-explore-professional-id]');
        cards.forEach((card) => observer.observe(card));
        return () => observer.disconnect();
    }, [featuredUsers, loadingFeatured, userData?.isProfessional, username]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || username.trim() || !hasNextPage) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && !isFetchingNextPage) {
                void fetchNextPage();
            }
        }, { rootMargin: '300px 0px' });

        observer.observe(target);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, username]);

    const handleOpenChat = (user: any) => {
        const isDirectSearch = Boolean(username.trim());
        if (!isDirectSearch) {
            trackAcquisitionEvent({
                eventType: 'explore_profile_viewed',
                professionalId: user.clerkId,
            });
        }
        // Ao clicar, leva imediatamente para o chat com a criadora
        router.push(`/chat/${user.clerkId}`);
    };

    useEffect(() => {
        const searchQuery = username.trim();
        if (!searchQuery) return;

        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setFoundUsers([]);
            setError('');

            try {
                const data = await userApi.searchByUsername(searchQuery);
                if (!cancelled) setFoundUsers(data.users || []);
            } catch (err: any) {
                if (cancelled) return;
                if (err.response?.status === 404) {
                    setError('Nenhum perfil encontrado');
                } else {
                    setError('Não foi possível buscar agora');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 600);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [username]);

    // Renderiza Card da Criadora em Grid 3:4 com foco total na foto, nome, idade e badge de atividade
    const renderCreatorCard = (user: any) => {
        const age = calculateAge(user.birthDate);
        const displayName = age !== null 
            ? `${user.name || `@${user.username}`}, ${age}` 
            : (user.name || `@${user.username}`);
        const mainPhoto = user.photoUrl || (user.publicPhotos && user.publicPhotos[0]) || '/Logo.svg';
        const status = formatOnlineStatus(user.lastSeen || user.lastActiveTime, user.isOnline);

        return (
            <div
                key={user.clerkId}
                data-explore-professional-id={!username.trim() ? user.clerkId : undefined}
                onClick={() => handleOpenChat(user)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-200/80 bg-slate-100 group"
            >
                {/* Imagem de fundo */}
                <img
                    src={mainPhoto}
                    alt={user.name || user.username}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay gradiente escuro suave na parte inferior */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Badge Online (topo direito) - Apenas se estiver Online: Fundo branco sólido e texto verde */}
                {status.isOnline && (
                    <div className="absolute top-2.5 right-2.5 bg-white text-emerald-600 border border-emerald-100 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1.5 z-10">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span className="leading-none whitespace-nowrap">Online</span>
                    </div>
                )}

                {/* Conteúdo inferior com Nome, Idade e Recência de acesso */}
                <div className="absolute bottom-0 inset-x-0 p-3 text-white flex flex-col gap-0.5 z-10">
                    <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate drop-shadow-sm">
                        {displayName}
                    </h3>
                    {!status.isOnline && status.label && (
                        <p className="text-[11px] sm:text-xs text-white/90 font-medium tracking-wide drop-shadow-sm truncate">
                            {status.label}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    if (userData?.isProfessional) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                    <h2 className="text-base font-bold text-slate-800 mb-1">Vitrine do Marketplace</h2>
                    <p className="text-xs text-slate-500">
                        O Explorar é a área onde novos clientes descobrem o seu perfil para iniciar conversas.
                    </p>
                </div>
            </div>
        );
    }

    const displayUsers = username.trim() ? foundUsers : featuredUsers;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Modern Search Bar - Expandível */}
            {isSearchOpen && (
                <div className="bg-white px-4 py-3 shrink-0 border-b border-slate-100 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 z-10 relative shadow-xs">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-600/10 transition-all font-medium"
                            placeholder="Nome ou @usuário da criadora..."
                            value={username}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                setUsername(nextValue);
                                if (!nextValue.trim()) {
                                    setFoundUsers([]);
                                    setError('');
                                    setLoading(false);
                                }
                            }}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoFocus
                        />
                        {username.length > 0 && !loading && (
                            <button 
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 appearance-none cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        {loading && (
                            <div className="absolute inset-y-0 right-3.5 flex items-center">
                                <svg className="animate-spin h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setIsSearchOpen(false);
                            clearSearch();
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-purple-600 px-2 py-2 transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4 flex flex-col">
                {error && username.length > 2 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 animate-in fade-in zoom-in">
                        <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {error}
                        </p>
                    </div>
                )}

                {/* Seção Explorar / Vitrine */}
                {!username.trim() && (
                    <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-500 pt-1">
                        {loadingFeatured ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <div key={n} className="aspect-[3/4] bg-slate-200 rounded-2xl" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {displayUsers.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {displayUsers.map((user) => renderCreatorCard(user))}
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-[50vh] flex items-center justify-center text-center text-slate-400 text-xs sm:text-sm font-medium py-12 px-4 animate-in fade-in duration-300">
                                        <p>Nenhuma criadora ativa no momento.</p>
                                    </div>
                                )}
                                <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center py-3" aria-live="polite">
                                    {isFetchingNextPage ? (
                                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
                                            Carregando mais criadoras...
                                        </span>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Exibição de Resultados da Busca Específica */}
                {username.trim().length > 0 && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {foundUsers.map((user) => renderCreatorCard(user))}
                        </div>
                        {foundUsers.length === 0 && !loading && !error && (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                Nenhuma criadora encontrada para &quot;{username}&quot;.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
