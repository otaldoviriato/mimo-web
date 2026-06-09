'use client';

import React, { useState } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useUserByUsername, usePublicGallery, useSubscribe, useMyProfile } from '@/hooks/useQueries';

interface UserProfilePageProps {
    params?: Promise<{ username: string }>;
    username?: string;
    onBack?: () => void;
    isSubPage?: boolean;
    isClosing?: boolean;
}

export default function UserProfilePage({ params, username: propUsername, onBack, isSubPage = false, isClosing = false }: UserProfilePageProps) {
    const router = useTransitionRouter();
    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');

    let resolvedUsername = '';
    if (propUsername) {
        resolvedUsername = propUsername;
    } else if (params) {
        const resolvedParams = React.use(params);
        resolvedUsername = resolvedParams.username;
    }

    React.useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    // Decodifica e remove o @ caso o usuário tenha digitado com ele na URL
    const decodedUsername = decodeURIComponent(resolvedUsername).replace('@', '');

    const { data: user, isLoading, isError } = useUserByUsername(decodedUsername);
    const { data: me } = useMyProfile();
    const { data: galleryData, isLoading: loadingGallery } = usePublicGallery(user?.clerkId);
    const subscribeMutation = useSubscribe();

    const isSubscriber = galleryData?.isSubscriber;
    const isOwner = galleryData?.isOwner;
    const showSubscribeButton = user?.isProfessional && user?.isSubscriptionEnabled && !isSubscriber && !isOwner;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const handleSubscribe = async () => {
        if (!user) return;
        if (confirm(`Deseja assinar o perfil de ${user.name || user.username} por R$ ${user.subscriptionPrice?.toFixed(2)}?`)) {
            try {
                await subscribeMutation.mutateAsync(user.clerkId);
                alert('Assinatura realizada com sucesso!');
            } catch (err: any) {
                alert(err.message || 'Erro ao realizar assinatura');
            }
        }
    };

    const layoutClass = isSubPage
        ? 'fixed inset-0 z-50 w-full h-full'
        : 'w-full h-full';

    const animationClass = ''; // A div externa do layout já gerencia as animações de slide-in/out da subpágina

    if (isLoading) {
        return (
            <div className={`flex flex-col bg-white animate-pulse ${layoutClass} ${animationClass}`}>
                <div className="h-48 bg-gray-200" />
                <div className="px-6 -mt-12 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gray-300 border-4 border-white shadow-lg" />
                    <div className="mt-4 h-8 w-48 bg-gray-200 rounded-lg" />
                    <div className="mt-2 h-4 w-32 bg-gray-100 rounded-lg" />
                </div>
            </div>
        );
    }

    if (isError || !user) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 text-center bg-white ${layoutClass} ${animationClass}`}>
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-gray-300">👻</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Pessoa não encontrada</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">O perfil que você está tentando acessar não existe,<br/>é do mesmo modo que o seu ou foi removido.</p>
                <button 
                    onClick={handleBack}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                >
                    Voltar para Conversa
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-slate-50 overflow-y-auto pb-28 no-scrollbar relative ${layoutClass} ${animationClass}`}>
            {/* Efeito de Fundo Aurora (Esferas Desfocadas Modernas) */}
            <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-purple-400/15 blur-[100px] pointer-events-none select-none z-0" />
            <div className="absolute top-[35%] right-[-15%] w-[300px] h-[300px] rounded-full bg-pink-400/12 blur-[90px] pointer-events-none select-none z-0" />
            <div className="absolute bottom-[15%] left-[-15%] w-[280px] h-[280px] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none select-none z-0" />
            
            {/* Textura Geométrica Discreta (Bolinhas Lavanda) */}
            <div 
                className="absolute inset-0 pointer-events-none select-none z-0" 
                style={{ 
                    backgroundImage: 'radial-gradient(#E9D5FF 1.5px, transparent 1.5px)', 
                    backgroundSize: '20px 20px',
                    opacity: 0.4
                }} 
            />

            {/* Cover and Header */}
            <div className="relative shrink-0 z-10">
                <div className="relative h-44 w-full overflow-hidden bg-purple-50 shadow-inner">
                    {user.coverUrl ? (
                        <img 
                            src={user.coverUrl} 
                            alt="Foto de capa" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-500" />
                    )}
                </div>
                <button 
                    onClick={handleBack}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-all active:scale-90 z-20"
                    title="Voltar"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                
                <div className="px-6 -mt-14 flex flex-col items-center relative z-10">
                    <div className="p-1.5 bg-white rounded-full shadow-2xl">
                        <Avatar uri={user.photoUrl} size={110} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 mt-4 flex flex-col items-center">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
                    {user.name || `@${user.username}`}
                </h1>
                <p className="text-purple-600 font-bold text-sm tracking-wide mt-0.5">
                    @{user.username}
                </p>

                {/* Painel de Relacionamento Exclusivo para Profissionais */}
                {me?.isProfessional && !user.isProfessional && (user as any).relationshipStats && (
                    <div className="w-full max-w-md mt-6 bg-white/85 backdrop-blur-md border border-purple-100 rounded-2xl p-5 shadow-lg shadow-purple-950/5 z-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
                        <div className="flex items-center justify-between border-b border-purple-50 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">💼</span>
                                <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Informações do Cliente</h3>
                            </div>
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Privado
                            </span>
                        </div>

                        {/* Top Highlights: Saldo e Total Gasto */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex flex-col hover:bg-slate-50 transition-colors">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo da Carteira</span>
                                <span className="text-lg font-black text-slate-800 tracking-tight mt-1">
                                    R$ {(((user as any).balance ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="bg-purple-50/50 border border-purple-100/50 rounded-xl p-3 flex flex-col hover:bg-purple-50 transition-colors">
                                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Gastou com Você</span>
                                <span className="text-lg font-black text-purple-700 tracking-tight mt-1">
                                    R$ {(((user as any).relationshipStats.totalSpent ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Detalhamento de Gastos */}
                        <div className="space-y-2.5 mb-4 bg-slate-50/40 border border-slate-100/80 rounded-xl p-3 w-full">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Origem dos Gastos</h4>
                            
                            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                                <span className="flex items-center gap-1.5">💬 Mensagens Pagas ({(user as any).relationshipStats.detailStats?.message?.count ?? 0})</span>
                                <span className="font-bold text-slate-800">
                                    R$ {(((user as any).relationshipStats.detailStats?.message?.amount ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                                <span className="flex items-center gap-1.5">📸 Mídias Desbloqueadas ({(user as any).relationshipStats.detailStats?.image_unlock?.count ?? 0})</span>
                                <span className="font-bold text-slate-800">
                                    R$ {(((user as any).relationshipStats.detailStats?.image_unlock?.amount ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                                <span className="flex items-center gap-1.5">🎁 Presentes Enviados ({(user as any).relationshipStats.detailStats?.gift?.count ?? 0})</span>
                                <span className="font-bold text-slate-800">
                                    R$ {(((user as any).relationshipStats.detailStats?.gift?.amount ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                                <span className="flex items-center gap-1.5">👑 Assinatura do Canal ({(user as any).relationshipStats.detailStats?.subscription?.count ?? 0})</span>
                                <span className="font-bold text-slate-800">
                                    R$ {(((user as any).relationshipStats.detailStats?.subscription?.amount ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Estatísticas de Conversa */}
                        <div className="grid grid-cols-2 gap-2 text-center text-[11px] text-slate-400 border-t border-purple-50 pt-3.5 w-full">
                            <div className="flex flex-col border-r border-slate-100">
                                <span className="font-bold text-slate-700 text-sm">{(user as any).relationshipStats.totalMessages}</span>
                                <span className="mt-0.5 font-semibold text-[9px] uppercase tracking-wider">mensagens trocadas</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-sm">
                                    {(user as any).relationshipStats.conversationStart 
                                        ? new Date((user as any).relationshipStats.conversationStart).toLocaleDateString('pt-BR') 
                                        : 'N/A'}
                                </span>
                                <span className="mt-0.5 font-semibold text-[9px] uppercase tracking-wider">início do contato</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Galeria Privada - Contador minimalista e discreto no topo */}
                {user.isProfessional && ((galleryData?.privatePhotosCount ?? 0) > 0 || (galleryData?.privateVideosCount ?? 0) > 0) && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] text-slate-500 font-medium border border-slate-200/50 shadow-sm z-10 animate-in fade-in duration-300">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Galeria Privada:</span>
                        <span className="font-bold text-slate-700">
                            {galleryData.privatePhotosCount > 0 && `${galleryData.privatePhotosCount} ${galleryData.privatePhotosCount === 1 ? 'foto' : 'fotos'}`}
                            {galleryData.privatePhotosCount > 0 && galleryData.privateVideosCount > 0 && ' e '}
                            {galleryData.privateVideosCount > 0 && `${galleryData.privateVideosCount} ${galleryData.privateVideosCount === 1 ? 'vídeo' : 'vídeos'}`}
                        </span>
                    </div>
                )}

                {/* Biografia do usuário */}
                {user.isProfessional && user.bio && (
                    <p className="mt-4 px-6 text-center text-xs text-slate-600 leading-relaxed max-w-sm italic font-medium z-10 animate-in fade-in duration-300">
                        "{user.bio}"
                    </p>
                )}

                {/* Painel Elegante de Estatísticas (Stats) para Credibilidade */}
                {user.isProfessional && (
                    <div className="w-full max-w-sm mt-5 grid grid-cols-3 gap-2 border-y border-slate-200/50 py-3.5 px-4 mb-4 z-10 bg-white/40 backdrop-blur-sm rounded-xl">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {user.subscribers?.length ?? 0}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Assinantes
                            </span>
                        </div>
                        <div className="flex flex-col items-center text-center border-x border-slate-200/50">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {galleryData?.items?.length ?? 0}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Mídias Públicas
                            </span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {(galleryData?.privatePhotosCount ?? 0) + (galleryData?.privateVideosCount ?? 0)}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Mídias Privadas
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Seletor de Abas da Galeria (apenas para o dono ou se for assinante e o recurso estiver habilitado) */}
            {user?.isProfessional && (isOwner || (isSubscriber && user?.isSubscriptionEnabled)) ? (
                <div className="flex border-b border-purple-100/50 mb-2.5 px-6 shrink-0 z-10">
                    <button
                        onClick={() => setActiveGalleryTab('public')}
                        className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${
                            activeGalleryTab === 'public'
                                ? 'border-purple-600 text-purple-600 font-bold'
                                : 'border-transparent text-gray-400'
                        }`}
                    >
                        Galeria Pública ({galleryData?.items?.length ?? 0})
                    </button>
                    <button
                        onClick={() => setActiveGalleryTab('private')}
                        className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${
                            activeGalleryTab === 'private'
                                ? 'border-purple-600 text-purple-600 font-bold'
                                : 'border-transparent text-gray-400'
                        }`}
                    >
                        Galeria Privada ({galleryData?.privateItems?.length ?? 0})
                    </button>
                </div>
            ) : null}

            {/* Gallery section */}
            {user?.isProfessional && (
                <div className="mt-2 w-full shrink-0 z-10">
                    {loadingGallery ? (
                        <div className="grid grid-cols-3 gap-0.5 animate-pulse px-0.5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square bg-gray-100" />
                            ))}
                        </div>
                    ) : activeGalleryTab === 'public' ? (
                        (galleryData?.items?.length ?? 0) === 0 ? (
                            <div className="bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center mx-6 mt-4">
                                <span className="text-2xl mb-1">📸</span>
                                <p className="text-sm text-gray-400 font-medium">Nenhuma foto na galeria ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-0.5 px-0.5">
                                {galleryData?.items?.map((item: any) => {
                                    const isLocked = item.visibility === 'subscribers' && !isSubscriber && !isOwner;
                                    return (
                                        <div key={item._id} className="relative aspect-square overflow-hidden bg-gray-100 group">
                                            {isLocked ? (
                                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-500 flex flex-col items-center justify-center p-2.5 text-center select-none">
                                                    {/* Textura geométrica de bolinhas */}
                                                    <div 
                                                        className="absolute inset-0 opacity-[0.15]" 
                                                        style={{ 
                                                            backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)', 
                                                            backgroundSize: '10px 10px' 
                                                        }} 
                                                    />
                                                    {/* Textura geométrica de linhas diagonais */}
                                                    <div 
                                                        className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(45deg,_rgba(255,255,255,0.15)_25%,_transparent_25%,_transparent_50%,_rgba(255,255,255,0.15)_50%,_rgba(255,255,255,0.15)_75%,_transparent_75%,_transparent)] bg-[size:16px_16px]" 
                                                    />
                                                    
                                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                                        <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                                                            Exclusivo
                                                        </span>
                                                        <span className="text-[7.5px] font-bold text-purple-100 uppercase tracking-wider leading-none block mt-0.5">
                                                            para assinantes
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={item.imageUrl}
                                                    alt="Gallery item"
                                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        (galleryData?.privateItems?.length ?? 0) === 0 ? (
                            <div className="bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center mx-6 mt-4">
                                <span className="text-2xl mb-1">🔒</span>
                                <p className="text-sm text-gray-400 font-medium">Nenhuma mídia privada ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-0.5 px-0.5">
                                {galleryData?.privateItems?.map((item: any) => (
                                    <div key={item._id} className="relative aspect-square overflow-hidden bg-gray-100 group">
                                        {item.mediaType === 'video' ? (
                                            <div className="w-full h-full relative">
                                                <video src={item.imageUrl} preload="metadata" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="opacity-80 drop-shadow-md">
                                                        <polygon points="5 3 19 12 5 21 5 3"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <img
                                                src={item.imageUrl}
                                                alt="Private Gallery item"
                                                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* O banner discretizado antigo foi removido por ter sido integrado ao bloco superior */}

            {/* Barra de Ações Flutuante no Rodapé */}
            <div className="fixed bottom-6 left-4 right-4 z-30 flex justify-center pointer-events-none">
                <div className="w-full max-w-md flex gap-3 px-2 pointer-events-auto">
                    {showSubscribeButton ? (
                        <>
                            <button 
                                onClick={handleSubscribe} 
                                disabled={subscribeMutation.isPending}
                                className="flex-[3] py-3.5 px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30"
                            >
                                <span>Assinar por R$ {user.subscriptionPrice?.toFixed(2)}</span>
                            </button>
                            <button 
                                onClick={() => router.push(`/chat/${user.clerkId}`)}
                                className="flex-[2] py-3.5 px-4 bg-white/95 hover:bg-gray-50 active:scale-[0.98] text-gray-800 border border-gray-200/80 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                <span>Mensagem</span>
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => router.push(`/chat/${user.clerkId}`)}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>Enviar Mensagem</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
