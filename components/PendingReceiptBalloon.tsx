'use client';

import React from 'react';
import { Clock, ChevronRight, Play } from 'lucide-react';

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
            className="group relative block w-68 max-w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 rounded-2xl rounded-bl-sm bg-white border border-slate-200/90 shadow-xs overflow-hidden transition-all active:scale-[0.99] hover:border-purple-300/80"
            aria-label={`Mensagem recebida aguardando saldo para liberar. Valor: ${formattedPrice}. Toque para recarregar.`}
        >
            {/* Cabeçalho integrado no balão, alinhado à identidade visual da profissional */}
            <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1.5 border-b border-slate-100 bg-slate-50/60 select-none">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-700 truncate">
                        Aguardando saldo para liberar
                    </span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded shrink-0">
                    {formattedPrice}
                </span>
            </div>

            {/* Conteúdo com blur real: preserva a silhueta, tamanho e curiosidade da mensagem, sem nenhuma pílula em cima */}
            <div className="relative p-3 overflow-hidden">
                {item.isAudio ? (
                    <div className="select-none filter blur-[3.5px] opacity-40 flex items-center gap-2 pointer-events-none py-1">
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
                    <div className="select-none filter blur-[4px] text-sm text-slate-700/85 leading-relaxed whitespace-pre-wrap break-words pointer-events-none min-h-[44px]">
                        {item.content || 'Mensagem reservada'}
                    </div>
                )}

                {/* Feixe suave de luz (shimmer) passando continuamente pelo blur (sem saltos) */}
                <div 
                    aria-hidden="true" 
                    className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/50 to-transparent" 
                />
            </div>

            {/* Rodapé integrado: Ação direta de recarga + Horário com reloginho pulsante idêntico ao da profissional */}
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 group-hover:bg-purple-50/40 transition-colors">
                <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-0.5">
                    <span>Recarregar para liberar</span>
                    <ChevronRight size={12} className="text-purple-500 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                    <time className="text-[10px] font-medium text-slate-400">
                        {formattedTime}
                    </time>
                    <Clock size={11} className="text-amber-500 animate-pulse shrink-0" strokeWidth={2.2} />
                </div>
            </div>
        </button>
    );
};
