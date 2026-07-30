'use client';

import React, { useState, useEffect, use } from 'react';
import axios from 'axios';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useUser } from '@clerk/nextjs';
import { Avatar } from '@/components/Avatar';
import { useUserById, useUserByUsername } from '@/hooks/useQueries';
import { ShieldCheck, ArrowLeft, MessageSquare, Calendar, Gift, Image as ImageIcon, ExternalLink, Clock } from 'lucide-react';

function isClerkUserId(value: string) {
    return value.startsWith('user_');
}

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
    cost: number;
    timestamp: string;
    isLockedImage?: boolean;
    originalImageUrl?: string;
    isVideo?: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
    isGift?: boolean;
    isTemporary?: boolean;
    expiresAt?: string | Date;
    isExpired?: boolean;
}

interface ChatInfoPageProps {
    params: Promise<{ userId: string }>;
}

export default function ChatInfoPage({ params }: ChatInfoPageProps) {
    const resolvedParams = use(params);
    const otherUserId = resolvedParams.userId;
    const router = useTransitionRouter();
    const { user } = useUser();
    const { data: receiverById } = useUserById(otherUserId);
    const { data: receiverByUsername } = useUserByUsername(otherUserId);
    const receiver = receiverByUsername || receiverById;

    const [messages, setMessages] = useState<Message[]>([]);
    const [historicalMedia, setHistoricalMedia] = useState<any[]>([]);

    const targetClerkId = receiver?.clerkId || (isClerkUserId(otherUserId) ? otherUserId : null);

    // Carrega mensagens e mídias da conversa
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id && targetClerkId) {
            const currentRoomId = [user.id, targetClerkId].sort().join('_');
            const keysToTry = [
                `mimo_messages_${currentRoomId}`,
                `mimo_messages_${[user.id, otherUserId].sort().join('_')}`
            ];

            for (const key of keysToTry) {
                const cached = localStorage.getItem(key);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setMessages(parsed);
                            break;
                        }
                    } catch (e) {
                        console.error('Erro ao ler mensagens do cache:', e);
                    }
                }
            }

            axios.get(`/api/rooms/${user.id}/media`, { params: { roomId: currentRoomId } })
                .then(res => {
                    if (Array.isArray(res.data)) {
                        setHistoricalMedia(res.data);
                    }
                })
                .catch(() => {
                    // Ignora 401 silenciosamente, as mídias locais das mensagens do cache serão exibidas normalmente
                });
        }
    }, [user?.id, otherUserId, targetClerkId]);

    // Estado para exibição em modal da mídia selecionada
    const [selectedMedia, setSelectedMedia] = useState<{ url: string; isVideo?: boolean } | null>(null);

    // Mídias trocadas válidas e não expiradas
    const mediaItems = React.useMemo(() => {
        const now = new Date();
        
        // 1. Mídias históricas válidas
        const validHistorical = historicalMedia.filter(item => {
            if (item.isTemporary && item.expiresAt) {
                const expiresTime = new Date(item.expiresAt).getTime();
                if (expiresTime > 0 && expiresTime < now.getTime()) {
                    return false;
                }
            }
            return true;
        });

        // 2. Mídias locais das mensagens do chat
        const localMedias = messages
            .filter(m => {
                if (m.isLockedImage) return false;
                if (m.isExpired) return false;
                if (m.isTemporary && m.expiresAt) {
                    const expiresTime = new Date(m.expiresAt).getTime();
                    if (expiresTime > 0 && expiresTime < now.getTime()) {
                        return false;
                    }
                }
                return m.originalImageUrl || (m.isVideo && m.videoUrl);
            })
            .map(m => ({
                id: m._id,
                url: m.isVideo ? m.videoUrl! : m.originalImageUrl!,
                thumbnailUrl: m.isVideo ? m.thumbnailUrl : m.originalImageUrl,
                isVideo: !!m.isVideo,
                isTemporary: m.isTemporary,
                expiresAt: m.expiresAt,
            }));

        const loadedUrls = new Set(validHistorical.map(item => item.url));
        const newLocalMedias = localMedias.filter(item => !loadedUrls.has(item.url));

        return [...validHistorical, ...newLocalMedias];
    }, [historicalMedia, messages]);

    // Estatísticas da conversa
    const totalMessages = messages.length;
    
    const firstMessage = messages.length > 0 ? messages[0] : null;
    const firstMessageDate = firstMessage ? new Date(firstMessage.timestamp) : null;
    
    const formattedStartDate = firstMessageDate
        ? firstMessageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Início recente';

    const daysTogether = firstMessageDate
        ? Math.max(1, Math.floor((Date.now() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const giftsExchanged = messages.filter(m => m.isGift);
    const totalGiftsCount = giftsExchanged.length;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            {/* Cabeçalho */}
            <div className="sticky top-0 z-30 bg-purple-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
                <button
                    onClick={() => router.back()}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Informações da Conversa</h1>
            </div>

            {/* Cartão de Perfil Simplificado */}
            <div className="max-w-xl mx-auto px-4 pt-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="relative mb-3">
                        <Avatar uri={receiver?.photoUrl} size={96} />
                        {receiver?.isOnline && (
                            <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-white shadow-sm" />
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 justify-center mb-1">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            {receiver?.name || receiver?.username || 'Usuário Mimo'}
                        </h2>
                        {receiver?.isProfessional && receiver?.identityStatus === 'approved' && (
                            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                        )}
                    </div>

                    {receiver?.username && (
                        <p className="text-sm font-medium text-slate-400 mb-4">@{receiver.username}</p>
                    )}

                    {/* Botão Ver Perfil Completo */}
                    {receiver?.username && (
                        <button
                            onClick={() => router.push(`/${receiver.username}`)}
                            className="w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold py-3 px-6 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            Ver Perfil Completo
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Resumo da Conversa */}
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mt-6 mb-3 px-1">
                    Resumo da Conversa
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* Mensagens Trocadas */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{totalMessages}</p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Mensagens Trocadas</p>
                        </div>
                    </div>

                    {/* Tempo de Conversa */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{daysTogether > 0 ? `${daysTogether}d` : 'Hoje'}</p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tempo Conversando</p>
                        </div>
                    </div>

                    {/* Início da Conversa */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversando Desde</p>
                                <p className="text-sm font-bold text-slate-800">{formattedStartDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Mimos Trocados */}
                    {totalGiftsCount > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                    <Gift className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mimos Enviados</p>
                                    <p className="text-sm font-bold text-slate-800">{totalGiftsCount} presente(s) trocado(s)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Seção Mídias Trocadas */}
                <div className="flex items-center justify-between mt-6 mb-3 px-1">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Mídias Trocadas ({mediaItems.length})
                    </h3>
                </div>

                {mediaItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center flex flex-col items-center justify-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1">Nenhuma mídia trocada</p>
                        <p className="text-xs text-slate-400">Fotos e vídeos não expirados enviados na conversa aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {mediaItems.map((item: any, idx: number) => (
                            <div
                                key={item.id || item.url || idx}
                                onClick={() => setSelectedMedia({ url: item.url, isVideo: item.isVideo })}
                                className="aspect-square bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-100 shadow-xs active:scale-95 transition-transform"
                            >
                                {item.isVideo ? (
                                    <video src={item.url} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={item.url} alt="Mídia" className="w-full h-full object-cover" />
                                )}
                                {item.isVideo && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Mídia em Tela Cheia */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedMedia(null)}
                >
                    <button
                        onClick={() => setSelectedMedia(null)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                    >
                        ✕
                    </button>
                    {selectedMedia.isVideo ? (
                        <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
                    ) : (
                        <img src={selectedMedia.url} alt="Mídia em tela cheia" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                    )}
                </div>
            )}
        </div>
    );
}
