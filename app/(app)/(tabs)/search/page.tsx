'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/services/api';
import { useMyProfile, useFeaturedUsers } from '@/hooks/useQueries';
import { ShieldAlert, ShieldCheck, Search, X, MapPin, MessageCircle, MessageSquare, CheckCheck } from 'lucide-react';
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

export default function SearchPage() {
    const router = useRouter();
    const { data: userData } = useMyProfile();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const { data: featuredUsers = [], isLoading: loadingFeatured } = useFeaturedUsers();
    const [error, setError] = useState('');
    const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

    const [activeFilter, setActiveFilter] = useState<'online' | 'novos' | 'todos'>('online');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        if (userData?.isProfessional) {
            router.replace('/chats');
        }
    }, [userData, router]);

    const getEmptyStateMessage = () => {
        if (userData?.isProfessional) {
            if (activeFilter === 'online') {
                return 'não existem perfis online no momento';
            }
            if (activeFilter === 'novos') {
                return 'não existem perfis novos no momento';
            }
            return 'não existem perfis disponíveis no momento';
        }
        if (activeFilter === 'online') {
            return 'não existem perfis online no momento';
        }
        if (activeFilter === 'novos') {
            return 'não existem perfis novos no momento';
        }
        return 'Nenhum perfil encontrado no momento.';
    };

    const getFilteredUsers = () => {
        let sourceList = username.trim() ? foundUsers : featuredUsers;

        if (userData?.isProfessional) {
            if (activeFilter === 'online') {
                sourceList = sourceList.filter((u) => !!u.isOnline);
            } else if (activeFilter === 'novos') {
                sourceList = sourceList.filter((u) => !!u.isNew && !u.isInactive);
            }

            // Priorizar por Tier (1: Com recarga ativa -> 2: Novos/Ativos sem recarga -> 3: Inativos)
            return [...sourceList].sort((a, b) => {
                const aTier = a.tier ?? (a.isInactive ? 3 : 1);
                const bTier = b.tier ?? (b.isInactive ? 3 : 1);
                if (aTier !== bTier) {
                    return aTier - bTier;
                }
                const aChat = !!a.hasChat;
                const bChat = !!b.hasChat;
                if (aChat !== bChat) {
                    return aChat ? 1 : -1;
                }
                return 0;
            });
        }

        // Visão do cliente masculino buscando criadoras femininas:
        // Exibe todas as criadoras sem filtro, priorizando online primeiro, depois com conversa ativa
        return [...sourceList].sort((a, b) => {
            const aOnline = !!a.isOnline;
            const bOnline = !!b.isOnline;
            if (aOnline !== bOnline) {
                return aOnline ? -1 : 1;
            }
            const aChat = !!a.hasChat;
            const bChat = !!b.hasChat;
            if (aChat !== bChat) {
                return aChat ? -1 : 1;
            }
            return 0;
        });
    };

    const openLightbox = (e: React.MouseEvent, photos: string[], index: number) => {
        e.stopPropagation();
        setLightbox({ photos, index });
    };

    const closeLightbox = () => setLightbox(null);

    const lightboxPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null);
    };

    const lightboxNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null);
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



    const handleSearch = async () => {
        if (!username.trim()) {
            setError('Digite um username para buscar');
            return;
        }

        setLoading(true);
        setFoundUsers([]);
        setError('');

        try {
            const data = await userApi.searchByUsername(username.trim());
            setFoundUsers(data.users || []);
        } catch (err: any) {
            if (err.response?.status === 404) {
                const code = err.response?.data?.error;
                if (code === 'incompatible_professional_status') {
                    setError('Este usuário tem o mesmo modo que você. Só é possível conversar entre quem cobra e quem não cobra.');
                } else {
                    setError('Usuário não encontrado');
                }
            } else {
                setError('Erro ao buscar usuário');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = (clerkId: string) => {
        router.push(`/chat/${clerkId}`);
    };

    const handleExploreProfile = (user: any) => {
        trackAcquisitionEvent({
            eventType: 'explore_profile_viewed',
            professionalId: user.clerkId,
        });
        router.push(`/${user.username}?source=explore`);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.trim()) {
                handleSearch();
            } else {
                setFoundUsers([]);
                setError('');
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [username]);

    // Renderiza Card de Criadora em Grid 3:4 (Exibido para Clientes / Homens)
    const renderCreatorCard = (user: any) => {
        const age = calculateAge(user.birthDate);
        const displayName = age !== null 
            ? `${user.name || `@${user.username}`}, ${age}` 
            : (user.name || `@${user.username}`);
        const locationStr = user.city && user.state ? `${user.city}, ${user.state}` : 'Brasil';
        const mainPhoto = user.photoUrl || (user.publicPhotos && user.publicPhotos[0]) || '/Logo.svg';

        return (
            <div
                key={user.clerkId}
                onClick={() => handleExploreProfile(user)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-100/50 bg-slate-100 animate-in fade-in zoom-in-95 duration-300 group"
            >
                {/* Imagem de fundo */}
                <img
                    src={mainPhoto}
                    alt={user.name || user.username}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay gradiente escuro na parte inferior */}
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Badge Já Conversou ou Badge Novo (top left) */}
                {user.isNew ? (
                    <div className="absolute top-2.5 left-2.5 bg-purple-600 text-white text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md z-10">
                        Novo
                    </div>
                ) : null}

                {/* Badge Online (top right) */}
                {!!user.isOnline && (
                    <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1.5 z-10 border border-white/10">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span>Online</span>
                    </div>
                )}

                {/* Conteúdo inferior */}
                <div className="absolute bottom-0 inset-x-0 p-3 text-white flex flex-col gap-0.5 z-10">
                    <div className="flex items-center gap-1 flex-wrap">
                        <h3 className="text-sm font-extrabold tracking-tight leading-none truncate max-w-[85%]">
                            {displayName}
                        </h3>
                        {user.identityStatus === 'approved' && (
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-in zoom-in duration-300" />
                        )}
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium tracking-tight">
                        {locationStr}
                    </span>
                </div>
            </div>
        );
    };

    // Renderiza Item de Cliente em Lista Limpa (Exibido para Criadoras / Profissionais)
    const renderClientListItem = (user: any) => {
        const age = calculateAge(user.birthDate);
        const nameText = user.name || user.username || 'Cliente';
        const displayName = age !== null ? `${nameText}, ${age}` : nameText;
        const locationStr = user.city && user.state ? `${user.city}, ${user.state}` : (user.city || user.state || 'Brasil');
        const photoUrl = user.photoUrl;
        const initial = nameText.charAt(0).toUpperCase();
        const isInactive = !!user.isInactive;

        return (
            <div
                key={user.clerkId}
                onClick={() => handleStartChat(user.clerkId)}
                className={`w-full rounded-2xl border p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    isInactive
                        ? 'grayscale opacity-60 bg-slate-100/80 border-slate-200'
                        : user.hasChat
                        ? 'bg-slate-50/70 border-slate-200/80 hover:border-purple-300/60'
                        : 'bg-white border-slate-200/80 hover:border-purple-300'
                }`}
            >
                {/* Esquerda: Avatar com Badge Integrada + Informações em 3 Linhas */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar Container com Micro-Badges no Topo/Base */}
                    <div className="relative shrink-0">
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt={nameText}
                                className="w-13 h-13 rounded-full object-cover border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white font-extrabold text-lg flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                {initial}
                            </div>
                        )}

                        {/* Tag de Novo / Inativo no Canto Superior do Avatar */}
                        {isInactive ? (
                            <span className="absolute -top-1 -left-1 text-[9px] font-extrabold text-slate-600 bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded-full shadow-2xs shrink-0 z-10 leading-none">
                                Inativo
                            </span>
                        ) : (
                            user.isNew && !user.isOnline && (
                                <span className="absolute -top-1 -left-1 text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full shadow-2xs shrink-0 z-10 leading-none">
                                    Novo
                                </span>
                            )
                        )}

                        {/* Indicador de Status Online no Canto Inferior do Avatar */}
                        {!!user.isOnline ? (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            </span>
                        ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-300 border-2 border-white rounded-full z-10"></span>
                        )}
                    </div>

                    {/* Bloco de Dados: 100% de Espaço Horizontal para o Nome na Linha 1 */}
                    <div className="flex flex-col min-w-0 flex-1 justify-center space-y-0.5">
                        {/* Linha 1: Nome Sem Pílulas ao Lado (Máximo Espaço Livre) */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate leading-tight group-hover:text-purple-700 transition-colors w-full">
                            {displayName}
                        </h3>

                        {/* Linha 2: Username Exclusivo */}
                        <p className="text-xs text-slate-400 font-medium truncate leading-none">
                            @{user.username}
                        </p>

                        {/* Linha 3: Localização (Ícone + Cidade/Estado) */}
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium truncate pt-0.5">
                            <MapPin className="w-3 h-3 text-purple-500/80 shrink-0" />
                            <span className="truncate">{locationStr}</span>
                        </div>
                    </div>
                </div>

                {/* Direita: Botão de Ação Enxuto e Proporcional */}
                {user.hasChat ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartChat(user.clerkId);
                        }}
                        className="shrink-0 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 font-bold text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1 transition-all border border-slate-200/90 cursor-pointer shadow-2xs"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="whitespace-nowrap">Ver chat</span>
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartChat(user.clerkId);
                        }}
                        className="shrink-0 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1 transition-all shadow-sm shadow-purple-200 cursor-pointer"
                    >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Conversar</span>
                    </button>
                )}
            </div>
        );
    };

    const renderUserItem = (user: any) => {
        if (userData?.isProfessional) {
            return renderClientListItem(user);
        }
        return renderCreatorCard(user);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Lightbox de Imagem em Tela Cheia */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Imagem Principal */}
                    <img
                        src={lightbox.photos[lightbox.index]}
                        alt="Foto"
                        className="max-w-full max-h-full object-contain select-none"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Botão Fechar */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                    </button>

                    {/* Navegação: Anterior */}
                    {lightbox.photos.length > 1 && (
                        <button
                            onClick={lightboxPrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                    )}

                    {/* Navegação: Próximo */}
                    {lightbox.photos.length > 1 && (
                        <button
                            onClick={lightboxNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    )}

                    {/* Contador de imagens */}
                    {lightbox.photos.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {lightbox.photos.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, index: i } : null); }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === lightbox.index ? 'bg-white w-4' : 'bg-white/40'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modern Search Bar - Expandível */}
            {isSearchOpen && (
                <div className="bg-white px-4 py-3 shrink-0 border-b border-slate-100 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 z-10 relative shadow-sm">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600">
                            <Search className="w-4.5 h-4.5" />
                        </div>
                        <input
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-600/10 transition-all font-medium"
                            placeholder="Digite o @username..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoFocus
                        />
                        {username.length > 0 && !loading && (
                            <button 
                                onClick={() => setUsername('')}
                                className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 appearance-none"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        )}
                        {loading && (
                            <div className="absolute inset-y-0 right-3.5 flex items-center">
                                <svg className="animate-spin h-4.5 w-4.5 text-purple-600" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setIsSearchOpen(false);
                            setUsername('');
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-purple-600 px-2 py-2 transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Controle Segmentado de Filtros (Apenas para Perfil Profissional buscando clientes) */}
            {userData?.isProfessional && (
                <div className="bg-slate-50/90 backdrop-blur-md px-4 pt-3 pb-2 border-b border-slate-200/60 sticky top-[72px] z-10 shrink-0">
                    <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 max-w-md mx-auto shadow-inner">
                        {/* 1º: Online (Padrão) */}
                        <button
                            onClick={() => setActiveFilter('online')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeFilter === 'online'
                                    ? 'bg-white text-purple-900 shadow-sm shadow-slate-300/40 border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeFilter === 'online' ? 'bg-emerald-400 opacity-75' : 'hidden'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeFilter === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            </span>
                            <span>Online</span>
                        </button>

                        {/* 2º: Novos */}
                        <button
                            onClick={() => setActiveFilter('novos')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeFilter === 'novos'
                                    ? 'bg-white text-purple-900 shadow-sm shadow-slate-300/40 border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>Novos</span>
                        </button>

                        {/* 3º: Todos */}
                        <button
                            onClick={() => setActiveFilter('todos')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeFilter === 'todos'
                                    ? 'bg-white text-purple-900 shadow-sm shadow-slate-300/40 border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>Todos</span>
                        </button>
                    </div>
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

                {/* Seção Explorar */}
                {!username.trim() && (
                    <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-500 pt-1">
                        {loadingFeatured ? (
                            userData?.isProfessional ? (
                                <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full animate-pulse">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <div key={n} className="h-20 bg-white border border-slate-200/60 rounded-2xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                        <div key={n} className="aspect-[3/4] bg-gray-200 rounded-xl" />
                                    ))}
                                </div>
                            )
                        ) : (
                            <>
                                {getFilteredUsers().length > 0 ? (
                                    <div className={userData?.isProfessional ? "flex flex-col gap-2.5 max-w-2xl mx-auto w-full" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"}>
                                        {getFilteredUsers().map((user) => renderUserItem(user))}
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-[50vh] flex items-center justify-center text-center text-slate-400 text-xs sm:text-sm font-medium py-12 px-4 animate-in fade-in duration-300">
                                        <p>{getEmptyStateMessage()}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Exibição de Resultados da Busca */}
                {username.trim().length > 0 && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pt-1">
                        <div className={userData?.isProfessional ? "flex flex-col gap-2.5 max-w-2xl mx-auto w-full" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"}>
                            {foundUsers.map((user) => renderUserItem(user))}
                        </div>
                        {foundUsers.length === 0 && !loading && (
                            <div className="text-center py-12 text-gray-400 text-xs">
                                Nenhum perfil encontrado para "@ {username}".
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

