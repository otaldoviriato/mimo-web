'use client';

import React, { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { X, Crown, ImageIcon, MessageCircle, CheckCircle2, AlertCircle, Loader2, Lock, ShieldCheck } from 'lucide-react';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    professional: {
        name?: string;
        username: string;
        photoUrl?: string;
        subscriptionPrice?: number;
    };
    myBalance: number; // em centavos
}

type ModalState = 'confirm' | 'loading' | 'success' | 'error';

export function SubscribeModal({ isOpen, onClose, onConfirm, professional, myBalance }: SubscribeModalProps) {
    const [state, setState] = useState<ModalState>('confirm');
    const [errorMessage, setErrorMessage] = useState('');
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    const priceInReais = professional.subscriptionPrice ?? 0;
    const priceInCents = Math.round(priceInReais * 100);
    const hasEnoughBalance = myBalance >= priceInCents;
    const balanceInReais = myBalance / 100;

    useEffect(() => {
        if (isOpen) {
            setState('confirm');
            setErrorMessage('');
            setVisible(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const t = setTimeout(() => setVisible(false), 350);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    if (!visible) return null;

    const handleConfirm = async () => {
        setState('loading');
        try {
            await onConfirm();
            setState('success');
        } catch (err: any) {
            setErrorMessage(err?.message || 'Erro ao realizar assinatura. Tente novamente.');
            setState('error');
        }
    };

    const handleClose = () => {
        if (state === 'loading') return;
        onClose();
    };

    const displayName = professional.name || `@${professional.username}`;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center"
            onClick={(e) => {
                if (e.target === e.currentTarget && state !== 'loading') handleClose();
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                style={{ opacity: animateIn ? 1 : 0 }}
            />

            {/* Sheet */}
            <div
                className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden"
                style={{
                    transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* ESTADO: CONFIRMAÇÃO */}
                {state === 'confirm' && (
                    <div className="px-6 pb-8 pt-2">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-black text-slate-800 tracking-tight">Confirmar Assinatura</h2>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
                            >
                                <X size={16} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Card da profissional */}
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100 rounded-2xl mb-5">
                            <div className="relative shrink-0">
                                <Avatar uri={professional.photoUrl} size={56} />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-md">
                                    <Crown size={10} className="text-white" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 text-sm truncate">{displayName}</p>
                                <p className="text-xs text-purple-500 font-semibold">@{professional.username}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-2xl font-black text-slate-800 tracking-tight">
                                    R$ {priceInReais.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">por mês</p>
                            </div>
                        </div>

                        {/* O que está incluso */}
                        <div className="mb-5 space-y-2.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">O que está incluso</p>
                            <Benefit icon={<ImageIcon size={14} className="text-purple-600" />} text="Acesso à galeria de fotos exclusivas" />
                            <Benefit icon={<MessageCircle size={14} className="text-purple-600" />} text="Desconto no custo por mensagem no chat" />
                            <Benefit icon={<Crown size={14} className="text-purple-600" />} text="Badge de assinante no perfil" />
                            <Benefit icon={<ShieldCheck size={14} className="text-purple-600" />} text="Válido por 30 dias — renova automaticamente" />
                        </div>

                        {/* Saldo do usuário */}
                        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl mb-4 ${hasEnoughBalance ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                            <div className="flex items-center gap-2">
                                {hasEnoughBalance
                                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                                    : <AlertCircle size={16} className="text-rose-500" />
                                }
                                <span className={`text-xs font-bold ${hasEnoughBalance ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {hasEnoughBalance ? 'Saldo suficiente' : 'Saldo insuficiente'}
                                </span>
                            </div>
                            <span className={`text-sm font-black ${hasEnoughBalance ? 'text-emerald-700' : 'text-rose-700'}`}>
                                R$ {balanceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {!hasEnoughBalance && (
                            <p className="text-xs text-rose-500 font-semibold text-center mb-4 leading-snug">
                                Você precisa de mais{' '}
                                <span className="font-black">
                                    R$ {((priceInCents - myBalance) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>{' '}
                                na carteira para assinar.
                            </p>
                        )}

                        {/* Botões */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-[0.98] transition-all hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!hasEnoughBalance}
                                className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm active:scale-[0.98] transition-all hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/25"
                            >
                                Confirmar assinatura
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 mt-4">
                            <Lock size={10} className="text-slate-300" />
                            <span className="text-[10px] text-slate-300 font-semibold">Pagamento seguro via saldo da carteira</span>
                        </div>
                    </div>
                )}

                {/* ESTADO: CARREGANDO */}
                {state === 'loading' && (
                    <div className="px-6 py-14 flex flex-col items-center justify-center gap-5">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-purple-100 animate-ping opacity-30" />
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
                                <Loader2 size={28} className="text-white animate-spin" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-black text-slate-800 text-base">Processando assinatura</p>
                            <p className="text-sm text-slate-400 font-medium mt-1">Aguarde um momento...</p>
                        </div>
                    </div>
                )}

                {/* ESTADO: SUCESSO */}
                {state === 'success' && (
                    <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-5">
                        <div className="relative w-24 h-24 flex items-center justify-center mt-2">
                            <div className="absolute inset-0 rounded-full bg-emerald-100" />
                            <div className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-40" style={{ animationDuration: '1.5s' }} />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-400/30">
                                <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>

                        <div>
                            <p className="font-black text-slate-800 text-xl tracking-tight">Assinatura ativada!</p>
                            <p className="text-sm text-slate-500 font-medium mt-1.5 leading-snug max-w-xs">
                                Você agora tem acesso à galeria exclusiva e ao desconto no chat de{' '}
                                <span className="font-bold text-slate-700">{displayName}</span>.
                            </p>
                        </div>

                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Perfil assinado</span>
                                <span className="text-slate-700 font-bold truncate max-w-[140px]">{displayName}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Valor cobrado</span>
                                <span className="text-slate-700 font-bold">R$ {priceInReais.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Válido por</span>
                                <span className="text-slate-700 font-bold">30 dias</span>
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-purple-600/25"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* ESTADO: ERRO */}
                {state === 'error' && (
                    <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-5">
                        <div className="relative w-24 h-24 flex items-center justify-center mt-2">
                            <div className="absolute inset-0 rounded-full bg-rose-100" />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center shadow-xl shadow-rose-400/30">
                                <AlertCircle size={36} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>

                        <div>
                            <p className="font-black text-slate-800 text-xl tracking-tight">Algo deu errado</p>
                            <p className="text-sm text-slate-500 font-medium mt-1.5 leading-snug max-w-xs">
                                {errorMessage}
                            </p>
                        </div>

                        <div className="w-full flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-[0.98] transition-all"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => setState('confirm')}
                                className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-purple-600/25"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                {icon}
            </div>
            <span className="text-xs text-slate-600 font-semibold">{text}</span>
        </div>
    );
}
