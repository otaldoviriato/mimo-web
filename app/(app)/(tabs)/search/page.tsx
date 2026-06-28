'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { userApi } from '@/services/api';
import { useMyProfile } from '@/hooks/useQueries';
import { ShieldAlert } from 'lucide-react';

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
        const mockResponseTimes = ["5 min", "10 min", "15 min", "30 min", "1 hora"];
        const idCharCodeSum = user.clerkId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const responseTime = mockResponseTimes[idCharCodeSum % mockResponseTimes.length];
        const photos: string[] = user.publicPhotos || [];

        return (
            <div
                key={user.clerkId}
                onClick={() => router.push(`/${user.username}`)}
                className="bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-purple-100/50 transition-all duration-300 overflow-hidden flex flex-col p-4 gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-pointer active:scale-[0.99]"
            >
                {/* Top Section: Avatar e Informações */}
                <div className="flex items-start gap-3.5">
                    {/* Avatar com Badge "Novo" sobreposta */}
                    <div className="shrink-0 relative">
                        <Avatar uri={user.photoUrl} size={64} />
                        {user.isNew && (
                            <span className="absolute -top-1 -right-1 bg-slate-500 text-white text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-sm border border-white z-10">
                                Novo
                            </span>
                        )}
                    </div>

                    {/* Nome, Bio e Tempo de Resposta */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-800 truncate hover:text-purple-700 tracking-tight leading-snug">
                                {user.name || `@${user.username}`}
                            </h2>
                            {user.bio && (
                                <p className="text-slate-500 text-[11px] leading-relaxed font-normal mt-0.5 line-clamp-2">
                                    {user.bio}
                                </p>
                            )}
                        </div>

                        {/* Indicador de Tempo Médio de Resposta */}
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full w-fit">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                            </svg>
                            <span>Responde em média em {responseTime}</span>
                        </div>
                    </div>
                </div>

                {/* Galeria Pública Compacta com Scroll Horizontal */}
                {photos.length > 0 && (
                    <div className="mt-0.5">
                        <div className="flex overflow-x-auto gap-2.5 pb-1 no-scrollbar scroll-smooth snap-x">
                            {photos.map((photoUrl: string, idx: number) => (
                                <div
                                    key={idx}
                                    onClick={(e) => openLightbox(e, photos, idx)}
                                    className="w-24 h-24 aspect-square rounded-2xl overflow-hidden cursor-pointer relative group bg-slate-50 border border-slate-100 shrink-0 snap-start shadow-sm hover:border-purple-200 transition-all duration-300"
                                >
                                    <img
                                        src={photoUrl}
                                        alt={`Foto pública de ${user.name || user.username}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rodapé: Botão Conversar */}
                <div className="pt-0.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStartChat(user.clerkId); }}
                        className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold tracking-wide text-xs shadow-sm hover:shadow-md hover:shadow-purple-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Conversar
                    </button>
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
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Buscar</span>
                </div>
                {userData?.isAdmin && (
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center"
                        title="Painel Admin"
                    >
                        <ShieldAlert className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Modern Search Bar */}
            <div className="bg-white px-4 pt-5 pb-3 shrink-0">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-600 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                        </svg>
                    </div>
                    <input
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-600/10 transition-all font-medium"
                        placeholder="Digite o @username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                    />
                    {username.length > 0 && !loading && (
                        <button 
                            onClick={() => setUsername('')}
                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 appearance-none"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    )}
                    {loading && (
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <svg className="animate-spin h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
                {error && username.length > 2 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 animate-in fade-in zoom-in">
                        <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                             </svg>
                             {error}
                        </p>
                    </div>
                )}

                {/* Exibição de Resultados da Busca */}
                {username.trim().length > 0 && (
                    <div className="flex flex-col gap-4">
                        {foundUsers.map((user) => renderUserCard(user))}
                    </div>
                )}

                {/* Seção Explorar */}
                {!username.trim() && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-500 pt-1">
                        <div className="mb-2">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Explorar</h2>
                            <p className="text-gray-400 text-xs">Conecte-se com novos perfis disponíveis no MimoChat.</p>
                        </div>

                        {loadingFeatured ? (
                            <div className="flex flex-col gap-4 animate-pulse">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                                    <div className="h-3 w-20 bg-gray-200 rounded" />
                                                </div>
                                            </div>
                                            <div className="h-9 w-24 bg-gray-200 rounded-xl" />
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 2, 3, 4].map((m) => (
                                                <div key={m} className="aspect-square bg-gray-200 rounded-xl" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {featuredUsers.map((user) => renderUserCard(user))}
                                
                                {featuredUsers.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        Nenhum perfil sugerido encontrado no momento.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
