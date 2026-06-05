'use client';

import React from 'react';
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
    const showSubscribeButton = user?.isProfessional && !isSubscriber && !isOwner;

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
        <div className={`flex flex-col bg-gradient-to-b from-purple-50/60 via-white to-pink-50/50 overflow-y-auto pb-28 no-scrollbar relative ${layoutClass} ${animationClass}`}>
            {/* Textura sutil no fundo da página */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none select-none z-0" 
                style={{ 
                    backgroundImage: 'radial-gradient(#6D28D9 1.2px, transparent 1.2px)', 
                    backgroundSize: '24px 24px' 
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
            </div>

            {/* Gallery section */}
            {user?.isProfessional && (
                <div className="mt-6 w-full">
                    {loadingGallery ? (
                        <div className="grid grid-cols-3 gap-0.5 animate-pulse px-0.5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square bg-gray-100" />
                            ))}
                        </div>
                    ) : galleryData?.items?.length === 0 ? (
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
                    )}
                </div>
            )}

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
