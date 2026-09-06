'use client';

import React from 'react';
import { LockKeyhole, Clock, Play } from 'lucide-react';

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
            className="group relative block w-fit min-w-[170px] max-w-[78%] cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 rounded-2xl rounded-bl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden transition-all active:scale-[0.99] hover:border-purple-300 px-3.5 pt-2.5 pb-1.5"
            aria-label={`Mensagem recebida bloqueada por saldo. Valor: ${formattedPrice}. Toque para liberar.`}
        >
            {/* Conteúdo com blur real: sem caixas ou molduras extras */}
            {item.isAudio ? (
                <div className="select-none filter blur-[3.5px] opacity-40 flex items-center gap-2 pointer-events-none py-1 mb-1">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <Play size={12} className="text-slate-600 fill-slate-600 ml-0.5" />
                    </div>
                    <div className="flex-1 flex items-center gap-1 h-4">
                        <div className="w-1 h-2.5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-4 bg-slate-500 rounded-full" />
                        <div className="w-1 h-2 bg-slate-500 rounded-full" />
                        <div className="w-1 h-5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-3 bg-slate-500 rounded-full" />
                        <div className="w-1 h-4 bg-slate-500 rounded-full" />
                        <div className="w-1 h-2 bg-slate-500 rounded-full" />
                        <div className="w-1 h-4.5 bg-slate-500 rounded-full" />
                        <div className="w-1 h-3 bg-slate-500 rounded-full" />
                        <div className="w-1 h-1.5 bg-slate-500 rounded-full" />
                    </div>
                </div>
            ) : (
                <div className="select-none filter blur-[4px] text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words pointer-events-none mb-1 pr-1">
                    {item.content || 'Mensagem reservada'}
                </div>
            )}

            {/* Shimmer sweep suave percorrendo o balão */}
            <div 
                aria-hidden="true" 
                className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/50 to-transparent" 
            />

            {/* Linha de rodapé fluida e integrada, sem divisores pesados nem excesso de cores */}
            <div className="flex items-center justify-between gap-4 mt-0.5 text-slate-500 select-none">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 group-hover:text-purple-700 transition-colors">
                    <LockKeyhole size={11} className="text-slate-400 group-hover:text-purple-600 shrink-0" strokeWidth={2.4} />
                    <span>{formattedPrice}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <time>{formattedTime}</time>
                    <Clock size={10.5} className="text-amber-500/90 animate-pulse shrink-0" strokeWidth={2.2} />
                </div>
            </div>
        </button>
    );
};
