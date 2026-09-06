'use client';

import React from 'react';
import { LockKeyhole, ChevronRight } from 'lucide-react';

interface PendingReceiptBalloonProps {
    item: {
        _id?: string;
        isAudio?: boolean;
        receiptChargeCents?: number;
        timestamp: string | Date;
        content?: string;
    };
    currentBalanceInCents: number;
    onOpenRecharge: (requiredAmountInCents: number) => void;
}

export const PendingReceiptBalloon: React.FC<PendingReceiptBalloonProps> = ({
    item,
    currentBalanceInCents,
    onOpenRecharge,
}) => {
    const requiredCents = item.receiptChargeCents ?? 0;
    const formattedPrice = requiredCents > 0
        ? (requiredCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : 'R$ 0,00';

    const formattedTime = React.useMemo(() => {
        try {
            return new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    }, [item.timestamp]);

    const handleClick = () => {
        onOpenRecharge(requiredCents);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group relative block w-64 max-w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 rounded-2xl rounded-bl-sm transition-transform active:scale-[0.99] bg-white p-1.5 shadow-sm border border-amber-200/80"
            aria-label={`Mensagem aguardando saldo para liberar. Valor: ${formattedPrice}. Toque para recarregar.`}
        >
            <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/50 p-3 shadow-xs transition-colors group-hover:border-amber-300">
                {/* Efeito Shimmer contínuo passando pelo card */}
                <div 
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent" 
                />

                {/* Header com status vivo e cadeado */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span className="text-[11px] font-semibold text-amber-900 tracking-tight truncate">
                            Aguardando saldo para liberar
                        </span>
                    </div>
                    <LockKeyhole size={13} className="text-amber-600 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                </div>

                {/* Conteúdo em espera: Áudio ou Texto com Skeleton */}
                {item.isAudio ? (
                    <div className="my-2.5 flex items-center gap-2 py-0.5">
                        <div className="w-7 h-7 rounded-full bg-amber-100/90 flex items-center justify-center text-amber-700 shrink-0">
                            <LockKeyhole size={12} strokeWidth={2.5} />
                        </div>
                        {/* Waveform animada em espera */}
                        <div className="flex items-center gap-1 h-5 flex-1 px-1" aria-hidden="true">
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-1 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-2 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-3 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-4 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-5 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-6 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-7 origin-bottom" />
                            <div className="w-1 h-5 bg-amber-400/80 rounded-full animate-audio-wave-8 origin-bottom" />
                        </div>
                    </div>
                ) : (
                    /* Linhas Skeleton simulando mensagem retida */
                    <div className="space-y-1.5 my-2.5 opacity-60" aria-hidden="true">
                        <div className="h-2 bg-amber-300/70 rounded-full w-11/12" />
                        <div className="h-2 bg-amber-300/55 rounded-full w-8/12" />
                    </div>
                )}

                {/* Linha de Ação Direta com Valor */}
                <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                    <span className="text-[11px] font-bold text-amber-950">
                        {formattedPrice}
                    </span>
                    <span className="bg-amber-500 group-hover:bg-amber-600 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 transition-all">
                        <span>{item.isAudio ? 'Ouvir agora' : 'Liberar agora'}</span>
                        <ChevronRight size={12} strokeWidth={2.5} />
                    </span>
                </div>
            </div>

            {/* Timestamp no canto inferior direito do balão */}
            <div className="flex items-center justify-end gap-1 mt-1 mr-0.5">
                <time className="text-[10px] font-medium text-gray-400">
                    {formattedTime}
                </time>
            </div>
        </button>
    );
};
