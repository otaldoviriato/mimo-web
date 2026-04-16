'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { userApi } from '@/services/api';
import { useUserById, usePublicGallery, useSubscribe, useMyProfile } from '@/hooks/useQueries';

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = React.use(params);
    const router = useRouter();

    const { data: user, isLoading, isError } = useUserById(userId);
    const { data: me } = useMyProfile();
    const { data: galleryData, isLoading: loadingGallery } = usePublicGallery(userId);
    const subscribeMutation = useSubscribe();

    const isSubscriber = galleryData?.isSubscriber;
    const isOwner = galleryData?.isOwner;
    const showSubscribeButton = user?.isProfessional && !isSubscriber && !isOwner;

    const handleSubscribe = async () => {
        if (!user) return;
        if (confirm(`Deseja assinar o perfil de ${user.name || user.username} por R$ ${user.subscriptionPrice?.toFixed(2)}?`)) {
            try {
                await subscribeMutation.mutateAsync(userId);
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
        <div className="flex flex-col h-full bg-white overflow-y-auto pb-10">
            {/* Cover and Header */}
            <div className="relative shrink-0">
                <div className="h-40 bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-inner" />
                <button 
                    onClick={() => router.back()}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                
                <div className="px-6 -mt-12 flex flex-col items-center">
                    <div className="p-1 bg-white rounded-full shadow-2xl">
                        <Avatar uri={user.photoUrl} size={110} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 mt-4 flex flex-col items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center">
                    {user.name || `@${user.username}`}
                </h1>
                <p className="text-purple-600 font-bold text-lg tracking-wide mt-1">
                    @{user.username}
                </p>

                {/* Stats / Info Badges */}
                <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex flex-col items-center justify-center gap-1.5 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Tipo de Conta</span>
                        <span className="text-sm font-bold text-gray-900 uppercase">{user.isProfessional ? 'Profissional' : 'Cliente'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex flex-col items-center justify-center gap-1.5 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Custo da Mensagem</span>
                        <span className="text-sm font-bold text-purple-600 uppercase">
                            {user.isProfessional 
                                ? (isSubscriber ? `R$ ${(user.chargePerCharSubscribers ?? 0.002).toFixed(3)}` : `R$ ${(user.chargePerCharNonSubscribers ?? 0.005).toFixed(3)}`) 
                                : 'Grátis'}
                        </span>
                    </div>
                </div>

                {user.isProfessional && (
                    <div className="mt-6 w-full max-w-sm space-y-3">
                        <div className="bg-purple-600 rounded-[2rem] p-5 text-white shadow-xl shadow-purple-200 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                               <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                           </div>
                           <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Preço p/ Assinantes</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-black">R$ {(user.chargePerCharSubscribers ?? 0.002).toFixed(3)}</span>
                                    <span className="text-[10px] font-bold opacity-70">/ caractere</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] font-black bg-white/20 w-fit px-3 py-1 rounded-full">
                                    <span>ECONOMIA DE {((( (user.chargePerCharNonSubscribers ?? 0.005) - (user.chargePerCharSubscribers ?? 0.002)) / (user.chargePerCharNonSubscribers ?? 0.005)) * 100).toFixed(0)}%</span>
                                </div>
                           </div>
                        </div>

                        <div className="bg-gray-50 rounded-[2rem] p-5 border border-gray-100 flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Não Assinantes</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-xl font-black text-gray-900">R$ {(user.chargePerCharNonSubscribers ?? 0.005).toFixed(3)}</span>
                                    <span className="text-[10px] font-bold text-gray-400">/ caractere</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-lg shadow-sm">
                                👤
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-10 w-full max-w-md bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col gap-6">
                    {user.isProfessional && (
                        <div className="bg-white/80 p-5 rounded-3xl border border-purple-100 flex items-start gap-4">
                            <span className="text-xl">💰</span>
                            <p className="text-xs text-purple-800 font-medium leading-relaxed">
                                Este usuário possui o modo profissional ativado. Cada mensagem enviada será debitada do seu saldo conforme o tamanho do texto.
                            </p>
                        </div>
                    )}
                </div>

                {/* Subscription Button */}
                {showSubscribeButton && (
                    <div className="mt-6 w-full max-w-sm px-6">
                        <Button 
                            title={`Assinar Perfil (R$ ${user.subscriptionPrice?.toFixed(2)})`}
                            onPress={handleSubscribe} 
                            size="lg" 
                            variant="outline"
                            loading={subscribeMutation.isPending}
                            className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                        />
                    </div>
                )}

                {/* Gallery section */}
                {user?.isProfessional && (
                    <div className="mt-10 w-full max-w-md px-6">
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                            📸 Galeria
                        </h2>
                        {loadingGallery ? (
                            <div className="grid grid-cols-3 gap-2 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-2xl" />
                                ))}
                            </div>
                        ) : galleryData?.items?.length === 0 ? (
                            <div className="bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl mb-2">📸</span>
                                <p className="text-sm text-gray-400 font-medium">Nenhuma foto na galeria ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {galleryData?.items?.map((item: any) => {
                                    const isLocked = item.visibility === 'subscribers' && !isSubscriber && !isOwner;
                                    return (
                                        <div key={item._id} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group">
                                            <img
                                                src={item.imageUrl}
                                                alt="Gallery item"
                                                className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'blur-xl scale-110 grayscale brightness-75' : 'group-hover:scale-105'}`}
                                            />
                                            {isLocked && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-[3px]">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-xl border border-white/30">
                                                        <span className="text-xl drop-shadow-lg">💎</span>
                                                    </div>
                                                    <span className="text-[9px] text-white font-black uppercase tracking-wider leading-tight drop-shadow-md">
                                                        exclusiva para<br/>assinantes
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-6 w-full max-w-sm px-6">
                    <Button 
                        title="Enviar Mensagem" 
                        onPress={() => router.back()} 
                        size="lg" 
                        className="w-full shadow-xl shadow-purple-600/20"
                    />
                </div>
            </div>
        </div>
    );
}
