'use client';

import React, { useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { Calculator, TrendingUp, Check } from 'lucide-react';

export const PRICE_PER_CHAR_OPTIONS = [0.01, 0.02, 0.04, 0.10] as const;

interface SimulatedMessage {
    from: 'client' | 'pro';
    text: string;
}

const SIMULATED_CONVERSATION: SimulatedMessage[] = [
    { from: 'client', text: 'Oi! Vi seu perfil agora e fiquei encantado, posso te chamar de algo? 😍' },
    { from: 'pro', text: 'Oiii, tudo bem? Pode sim! 💕' },
    { from: 'client', text: 'Que bom! Você é ainda mais linda pessoalmente do que nas fotos, sério mesmo' },
    { from: 'pro', text: 'Ahh que fofo, obrigada por falar isso 🥰' },
    { from: 'client', text: 'Imaginei... me conta, você atende só por aqui ou tem outro lugar pra gente conversar?' },
    { from: 'pro', text: 'Só por aqui mesmo, no chat! É onde fico mais tranquila 😊' },
    { from: 'client', text: 'Perfeito, então bora continuar nossa conversa por aqui, quero te conhecer melhor' },
];

function messageCostCents(text: string, rate: number) {
    const raw = text.length * rate * 100;
    return raw > 0 ? Math.ceil(raw) : 0;
}

function formatBRL(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PricingGuideModalProps {
    visible: boolean;
    onClose: () => void;
    selectedRate: number;
    maxPricePerChar: number;
    onApply: (rate: number) => void;
}

export function PricingGuideModal({ visible, onClose, selectedRate, maxPricePerChar, onApply }: PricingGuideModalProps) {
    const [previewRate, setPreviewRate] = useState(selectedRate);

    // Sincroniza o preview com o valor atualmente selecionado sempre que o modal é reaberto
    React.useEffect(() => {
        if (visible) setPreviewRate(selectedRate);
    }, [visible, selectedRate]);

    const totalCents = useMemo(
        () => SIMULATED_CONVERSATION
            .filter((m) => m.from === 'client')
            .reduce((sum, m) => sum + messageCostCents(m.text, previewRate), 0),
        [previewRate]
    );

    return (
        <Drawer.Root open={visible} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-gray-950/55 backdrop-blur-[2px]" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)] outline-none">
                    {/* Header */}
                    <div className="shrink-0 border-b border-purple-100 bg-gradient-to-br from-purple-600 to-purple-700 px-5 pb-4 pt-3">
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" />
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/20">
                                <Calculator size={16} className="text-white" strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <Drawer.Title className="text-base font-bold tracking-tight text-white">
                                    Como saber quanto cobrar?
                                </Drawer.Title>
                                <p className="mt-0.5 text-xs leading-relaxed text-purple-100">
                                    Veja uma conversa simulada e quanto você ganharia por mensagem em cada faixa de preço.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full flex-1 flex-col overflow-y-auto min-h-0">
                        {/* Seletor de faixa de preço */}
                        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-gray-100 bg-white">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Simular com o preço</p>
                            <div className="grid grid-cols-4 gap-2">
                                {PRICE_PER_CHAR_OPTIONS.map((option) => {
                                    const disabled = option > maxPricePerChar;
                                    const active = previewRate === option;
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => setPreviewRate(option)}
                                            className={`h-9 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                                active
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            R$ {option.toFixed(2).replace('.', ',')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversa simulada */}
                        <div className="flex-1 px-4 py-4 flex flex-col gap-2.5 bg-[repeating-linear-gradient(135deg,rgba(147,51,234,0.02)_0px,rgba(147,51,234,0.02)_1px,transparent_1px,transparent_18px)]">
                            {SIMULATED_CONVERSATION.map((message, index) => {
                                const isClient = message.from === 'client';
                                const costCents = isClient ? messageCostCents(message.text, previewRate) : 0;
                                return (
                                    <div key={index} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                                        <div
                                            className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ${
                                                isClient
                                                    ? 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                                                    : 'bg-purple-600 text-white rounded-br-md'
                                            }`}
                                        >
                                            {message.text}
                                        </div>
                                        {isClient ? (
                                            <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                                + {formatBRL(costCents)}
                                            </span>
                                        ) : (
                                            <span className="mt-1 mr-1 text-[9px] font-medium text-gray-400 italic">
                                                Sua resposta · grátis
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer fixo com total e CTA */}
                    <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-3.5 pb-5">
                        <div className="flex items-center justify-between rounded-xl bg-purple-50/60 border border-purple-100 px-3.5 py-3 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                                    <TrendingUp size={13} className="text-purple-600" strokeWidth={2.4} />
                                </div>
                                <span className="text-xs font-semibold text-gray-600">Total desta conversa</span>
                            </div>
                            <span className="text-base font-black text-purple-700 tabular-nums">{formatBRL(totalCents)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onApply(previewRate);
                                onClose();
                            }}
                            className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Check size={15} strokeWidth={2.5} />
                            Usar R$ {previewRate.toFixed(2).replace('.', ',')} por caractere
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full h-9 mt-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
