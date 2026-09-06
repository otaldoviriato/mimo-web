'use client';

import React from 'react';
import { Clock, Play } from 'lucide-react';

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
            className="group relative block w-fit min-w-[190px] max-w-[78%] cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 rounded-2xl rounded-bl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden transition-all active:scale-[0.99] hover:border-purple-300 px-3 pt-2 pb-1.5"
            aria-label={`Mensagem recebida aguardando saldo. Valor: ${formattedPrice}. Toque para liberar.`}
        >
            {/* Cabeçalho sutil no mesmo padrão da profissional: status com bolinha âmbar e valor */}
            <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-slate-100 text-[10.5px] select-none">
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                    </span>
                    <span className="font-medium text-slate-500 tracking-tight whitespace-nowrap">
                        Aguardando saldo
                    </span>
                </div>
                <span className="font-semibold text-purple-700 shrink-0 whitespace-nowrap">
                    {formattedPrice}
                </span>
            </div>

            {/* Conteúdo com blur real: 100% estático, sem shimmer ou skeleton pulsante */}
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
                <div className="select-none filter blur-[3.8px] text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words pointer-events-none mb-0.5 pr-1">
                    {item.content || 'Mensagem reservada'}
                </div>
            )}

            {/* Rodapé: Horário com reloginho neutro (sem laranja, sem salada visual) */}
            <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-slate-400 select-none">
                <time>{formattedTime}</time>
                <Clock size={11} className="text-slate-400 shrink-0" strokeWidth={2} />
            </div>
        </button>
    );
};
