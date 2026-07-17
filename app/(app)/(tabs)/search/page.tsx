'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { userApi } from '@/services/api';
import { useMyProfile } from '@/hooks/useQueries';
import { ShieldAlert, ShieldCheck, Search, X, MapPin, Award, Medal, Crown, Star } from 'lucide-react';

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
    const [featuredUsers, setFeaturedUsers] = useState<any[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(false);
    const [error, setError] = useState('');
    const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const getFilteredUsers = () => {
        return featuredUsers;
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
    }, []);

    // Carregar usuários profissionais em destaque ao montar
    useEffect(() => {
        const fetchFeatured = async () => {
            setLoadingFeatured(true);
            try {
                const data = await userApi.getFeaturedUsers();
                setFeaturedUsers(data.users || []);
            } catch (err) {
                console.error('Erro ao buscar criadores em destaque:', err);
            } finally {
                setLoadingFeatured(false);
            }
        };

        fetchFeatured();
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

    const renderUserCard = (user: any) => {
        const age = calculateAge(user.birthDate);
        const displayName = age !== null 
            ? `${user.name || `@${user.username}`}, ${age}` 
            : (user.name || `@${user.username}`);
        const locationStr = user.city && user.state ? `${user.city}, ${user.state}` : 'Brasil';
        const mainPhoto = user.photoUrl || (user.publicPhotos && user.publicPhotos[0]) || '/Logo.svg';

        return (
            <div
                key={user.clerkId}
                onClick={() => {
                    if (userData?.isProfessional) {
                        router.push(`/chat/${user.clerkId}`);
                    } else {
                        router.push(`/${user.username}`);
                    }
                }}
                className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-100/50 bg-slate-100 animate-in fade-in zoom-in-95 duration-300 group"
            >
                {/* Imagem de fundo */}
                <img
                    src={mainPhoto}
                    alt={user.name || user.username}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay gradiente escuro (apenas na parte inferior para leitura do texto) */}
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Badge Novo (top left) - Apenas para profissionais */}
                {user.isNew && user.isProfessional && (
                    <div className="absolute top-2.5 left-2.5 bg-purple-600 text-white text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md z-10">
                        Novo
                    </div>
                )}

                {/* Medalha de Nível (top left) - Para clientes */}
                {!user.isProfessional && userData?.isProfessional && user.clientLevel && typeof user.clientLevel === 'object' && (() => {
                    const IconComponent = 
                        user.clientLevel.icon === 'Crown' ? Crown :
                        user.clientLevel.icon === 'Star' ? Star :
                        user.clientLevel.icon === 'Medal' ? Medal : Award;
                    return (
                        <div 
                            className="absolute top-2.5 left-2.5 w-6 h-6 rounded-xl flex items-center justify-center shadow-md backdrop-blur-md border z-10 transition-all duration-300"
                            style={{ 
                                backgroundColor: `${user.clientLevel.color}d0`, 
                                borderColor: `${user.clientLevel.color}45`,
                                color: '#ffffff'
                            }}
                            title={`Nível ${user.clientLevel.name}`}
                        >
                            <IconComponent className="w-3.5 h-3.5" />
                        </div>
                    );
                })()}

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
                        {user.isProfessional && user.identityStatus === 'approved' && (
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

            {/* Header */}

            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                        Buscar
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                    {/* Botão de Busca Discreto (Lupa) */}
                    <button
                        onClick={() => setIsSearchOpen(prev => !prev)}
                        className={`p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center cursor-pointer ${
                            isSearchOpen ? 'bg-white/15' : ''
                        }`}
                        title="Buscar usuário"
                    >
                        <Search className="w-5 h-5 text-white" />
                    </button>

                    {userData?.isAdmin && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center cursor-pointer"
                            title="Painel Admin"
                        >
                            <ShieldAlert className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
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
                    <div className="flex flex-col gap-4 animate-in fade-in duration-500 pt-1">
                        {loadingFeatured ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <div key={n} className="aspect-[3/4] bg-gray-200 rounded-3xl" />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {getFilteredUsers().map((user) => renderUserCard(user))}
                                </div>
                                
                                {getFilteredUsers().length === 0 && (
                                    <div className="text-center py-12 text-gray-400 text-xs">
                                        Nenhum perfil sugerido encontrado.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Exibição de Resultados da Busca */}
                {username.trim().length > 0 && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {foundUsers.map((user) => renderUserCard(user))}
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
