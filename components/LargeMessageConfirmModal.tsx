'use client';

import React from 'react';
import { MessageSquareText, X, AlertCircle, Wallet } from 'lucide-react';

interface LargeMessageConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onRecharge: () => void;
    senderName: string;
    isAudio?: boolean;
    audioDuration?: number;
    charCount: number;
    costInCents: number;
    userBalanceInCents: number;
}

export function LargeMessageConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    onRecharge,
    senderName,
    isAudio = false,
    audioDuration,
    charCount,
    costInCents,
    userBalanceInCents,
}: LargeMessageConfirmModalProps) {
    if (!isOpen) return null;

    const formattedCost = (costInCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const formattedBalance = (userBalanceInCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const hasSufficientBalance = userBalanceInCents >= costInCents;
    const missingCents = Math.max(0, costInCents - userBalanceInCents);
    const formattedMissing = (missingCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="large-message-modal-title"
        >
            <div
                className="relative w-full max-w-md p-6 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
            >
                {/* Botão fechar */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} />
                </button>

                {/* Cabeçalho */}
                <div className="flex items-start gap-3.5 pr-6">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
                        <MessageSquareText size={24} />
                    </div>
                    <div>
                        <h3 id="large-message-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                            {isAudio ? 'Mensagem de áudio longa' : 'Mensagem longa recebida'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                            <strong className="text-slate-700">{senderName}</strong> enviou uma mensagem maior que o habitual. Para sua segurança e controle de gastos, confirme se deseja desbloqueá-la:
                        </p>
                    </div>
                </div>

                {/* Card de Resumo de Custos */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium">
                            {isAudio ? 'Duração do áudio' : 'Tamanho da mensagem'}
                        </span>
                        <span className="font-bold text-slate-800">
                            {isAudio
                                ? `${Math.round(audioDuration || charCount / 5)}s (${charCount} carac. equiv.)`
                                : `${charCount} caracteres`}
                        </span>
                    </div>

                    <div className="h-px bg-slate-200/70" />

                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Valor para visualização:</span>
                        <span className="font-bold text-purple-700 text-base">{formattedCost}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                            <Wallet size={13} className="text-slate-400" />
                            <span>Seu saldo atual:</span>
                        </div>
                        <span className="font-semibold text-slate-700">{formattedBalance}</span>
                    </div>

                    {!hasSufficientBalance && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
                            <AlertCircle size={15} className="shrink-0 text-amber-600" />
                            <span>Saldo insuficiente. Faltam <strong>{formattedMissing}</strong> para visualizar esta mensagem.</span>
                        </div>
                    )}
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col gap-2 pt-1">
                    {hasSufficientBalance ? (
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Confirmar e Visualizar ({formattedCost})
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onRecharge}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Recarregar Saldo
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                    >
                        Agora não
                    </button>
                </div>

                {/* Rodapé explicativo */}
                <p className="text-[11px] text-slate-400 text-center leading-normal">
                    Se escolher &quot;Agora não&quot;, a mensagem continuará reservada no chat e você poderá visualizá-la quando quiser tocando sobre ela.
                </p>
            </div>
        </div>
    );
}
