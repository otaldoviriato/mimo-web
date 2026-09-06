'use client';

import React from 'react';
import { LockKeyhole, ChevronRight, Play } from 'lucide-react';

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
            className="group relative block w-64 max-w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 rounded-2xl rounded-bl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden transition-all active:scale-[0.99] hover:border-purple-300/80"
            aria-label={`Mensagem recebida aguardando liberação. Valor: ${formattedPrice}. Toque para liberar.`}
        >
            {/* Conteúdo com blur real: preserva a silhueta, tamanho e curiosidade da mensagem */}
            {item.isAudio ? (
                <div className="p-3.5 pb-8 select-none filter blur-[3.5px] opacity-40 flex items-center gap-2 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <Play size={13} className="text-slate-600 fill-slate-600 ml-0.5" />
                    </div>
                    <div className="flex-1 flex items-center gap-1 h-5">
                        <div className="w-1 h-3 bg-slate-500 rounded-full" />
                        <div className="w-1 h-5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-2 bg-slate-500 rounded-full" />
                        <div className="w-1 h-6 bg-slate-500 rounded-full" />
                        <div className="w-1 h-3.5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-2.5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-5.5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-4 bg-slate-500 rounded-full" />
                        <div className="w-1 h-2 bg-slate-500 rounded-full" />
                    </div>
                </div>
            ) : (
                <div className="p-3 pb-8 select-none filter blur-[4px] text-sm text-slate-700/85 leading-relaxed whitespace-pre-wrap break-words pointer-events-none min-h-[58px]">
                    {item.content || 'Mensagem reservada'}
                </div>
            )}

            {/* Feixe suave de luz (shimmer) passando continuamente pelo blur (sem saltos) */}
            <div 
                aria-hidden="true" 
                className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/55 to-transparent" 
            />

            {/* Pill de Ação Flutuante Centralizado (Design limpo, sem amarelo gritante) */}
            <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md shadow-md border border-purple-200/80 rounded-full py-1.5 px-3.5 flex items-center gap-2 text-slate-800 transition-transform group-hover:scale-105">
                    <LockKeyhole size={13} className="text-purple-600 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    <span className="text-xs font-bold text-purple-700">
                        {formattedPrice}
                    </span>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-0.5">
                        Liberar
                        <ChevronRight size={12} className="text-slate-400" strokeWidth={2.5} />
                    </span>
                </div>
            </div>

            {/* Horário no canto inferior direito padrão do chat */}
            <div className="absolute bottom-1.5 right-2.5 pointer-events-none">
                <time className="text-[10px] font-medium text-slate-400">
                    {formattedTime}
                </time>
            </div>
        </button>
    );
};
