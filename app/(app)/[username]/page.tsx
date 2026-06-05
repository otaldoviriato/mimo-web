'use client';

import React from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useUserByUsername, usePublicGallery, useSubscribe, useMyProfile } from '@/hooks/useQueries';

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = React.use(params);
    const router = useTransitionRouter();

    React.useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    // Decodifica e remove o @ caso o usuário tenha digitado com ele na URL
    const decodedUsername = decodeURIComponent(username).replace('@', '');

    const { data: user, isLoading, isError } = useUserByUsername(decodedUsername);
    const { data: me } = useMyProfile();
    const { data: galleryData, isLoading: loadingGallery } = usePublicGallery(user?.clerkId);
    const subscribeMutation = useSubscribe();

    const isSubscriber = galleryData?.isSubscriber;
    const isOwner = galleryData?.isOwner;
    const showSubscribeButton = user?.isProfessional && !isSubscriber && !isOwner;

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

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white animate-pulse">
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
            <div className="flex flex-col items-center justify-center p-8 h-[100dvh] text-center bg-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-gray-300">👻</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Pessoa não encontrada</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">O perfil que você está tentando acessar não existe,<br/>é do mesmo modo que o seu ou foi removido.</p>
                <button 
                    onClick={() => router.back()}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                >
                    Voltar para Conversa
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto pb-28 no-scrollbar relative">
            {/* Cover and Header */}
            <div className="relative shrink-0">
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
                    {/* Overlay degradê sutil */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 to-fuchsia-500/15 mix-blend-overlay" />
                </div>
                <button 
                    onClick={() => router.back()}
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
                                        <img
                                            src={item.imageUrl}
                                            alt="Gallery item"
                                            className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'blur-[3.5px] scale-105 brightness-[90%]' : 'group-hover:scale-105'}`}
                                        />
                                        {isLocked && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Barra de Ações Fixa no Rodapé */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-4 flex gap-3 z-30 justify-center">
                <div className="w-full max-w-md flex gap-3">
                    {showSubscribeButton ? (
                        <>
                            <button 
                                onClick={handleSubscribe} 
                                disabled={subscribeMutation.isPending}
                                className="flex-[3] py-3.5 px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/50"
                            >
                                <span>Assinar por R$ {user.subscriptionPrice?.toFixed(2)}</span>
                            </button>
                            <button 
                                onClick={() => router.push(`/chat/${user.clerkId}`)}
                                className="flex-[2] py-3.5 px-4 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-800 border border-gray-200/60 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
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
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/50"
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
