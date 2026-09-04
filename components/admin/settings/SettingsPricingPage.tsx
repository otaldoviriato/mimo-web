'use client';

import React from 'react';
import { Coins } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'maxPricePerChar' | 'setMaxPricePerChar'
    | 'defaultPricePerCharNonSubscribers' | 'setDefaultPricePerCharNonSubscribers'
    | 'defaultPricePerCharSubscribers' | 'setDefaultPricePerCharSubscribers'
    | 'minSubscriptionPrice' | 'setMinSubscriptionPrice'
    | 'maxSubscriptionPrice' | 'setMaxSubscriptionPrice'
    | 'subscriberDiscountPercentage' | 'setSubscriberDiscountPercentage'
    | 'audioPriceMultiplier' | 'setAudioPriceMultiplier'
    | 'isDirtyPricing' | 'saving' | 'saveSettings'
>;

function SettingField({ title, description, unit, children }: { title: string; description: string | React.ReactNode; unit?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-6 border-b border-slate-100 last:border-0">
            <div className="md:w-1/2 space-y-1">
                <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">{description}</div>
            </div>
            <div className="md:w-1/2 flex items-center gap-3">
                {children}
                {unit && <span className="text-sm font-bold text-slate-500 shrink-0">{unit}</span>}
            </div>
        </div>
    );
}

export function SettingsPricingPage({
    defaultPricePerCharNonSubscribers, setDefaultPricePerCharNonSubscribers,
    defaultPricePerCharSubscribers,
    minSubscriptionPrice, setMinSubscriptionPrice,
    maxSubscriptionPrice, setMaxSubscriptionPrice,
    subscriberDiscountPercentage, setSubscriberDiscountPercentage,
    audioPriceMultiplier, setAudioPriceMultiplier,
    isDirtyPricing, saving, saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyPricing} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                    <Coins size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Precificação & Assinaturas</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Valores globais que controlam o custo das mensagens, audios e assinaturas na plataforma.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço por Caractere</h3>
                </div>

                <SettingField
                    title="Preco da Plataforma por Caractere (Nao-Assinantes) (R$)"
                    description={
                        <span>
                            Valor cobrado por caractere de usuarios sem assinatura ativa. Este preco e definido pela administracao e vale para todas as profissionais.
                        </span>
                    }
                    unit="R$ / char"
                >
                    <input
                        type="number"
                        step="0.0001"
                        value={defaultPricePerCharNonSubscribers}
                        onChange={(e) => setDefaultPricePerCharNonSubscribers(Number(e.target.value))}
                        min={0}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Preco da Plataforma por Caractere (Assinantes) (R$)"
                    description={
                        <span>
                            Valor cobrado de usuarios com assinatura ativa. Ele e calculado automaticamente a partir do preco de nao-assinantes e do desconto para assinantes.
                        </span>
                    }
                    unit="R$ / char"
                >
                    <input
                        type="number"
                        step="0.0001"
                        value={defaultPricePerCharSubscribers}
                        disabled
                        className={`${inputCls} opacity-60 bg-slate-50 cursor-not-allowed`}
                    />
                </SettingField>

                <SettingField
                    title="Multiplicador de Preço do Áudio"
                    description={
                        <span>
                            Cada segundo de áudio equivale a esta quantidade de caracteres. Com R$ 0,05 por caractere e 5 equivalentes, cada segundo custa R$ 0,25.
                        </span>
                    }
                    unit="x por segundo"
                >
                    <input
                        type="number"
                        step="0.5"
                        value={audioPriceMultiplier}
                        onChange={(e) => setAudioPriceMultiplier(Number(e.target.value))}
                        min={0}
                        className={inputCls}
                    />
                </SettingField>

                <div className="mt-6 mb-4 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assinaturas de Conteúdo Exclusivo</h3>
                </div>

                <SettingField
                    title="Preço Mínimo da Assinatura Mensal (R$)"
                    description="Valor mínimo que um profissional pode cobrar pela assinatura mensal de seu conteúdo exclusivo (fotos, vídeos e acesso preferencial). Impede que assinaturas sejam ofertadas a valores irrisórios que poderiam desvalorizar a plataforma ou criar percepções negativas sobre a qualidade do conteúdo."
                    unit="R$"
                >
                    <input
                        type="number"
                        step="0.01"
                        value={minSubscriptionPrice}
                        onChange={(e) => setMinSubscriptionPrice(Number(e.target.value))}
                        min={0}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Preço Máximo da Assinatura Mensal (R$)"
                    description="Teto de valor para assinaturas mensais de conteúdo exclusivo. Profissionais não conseguem cadastrar um preço de assinatura acima deste limite. Mantém os preços dentro de uma faixa razoável para o mercado e evita cobranças que possam afastar usuários da plataforma."
                    unit="R$"
                >
                    <input
                        type="number"
                        step="0.01"
                        value={maxSubscriptionPrice}
                        onChange={(e) => setMaxSubscriptionPrice(Number(e.target.value))}
                        min={0}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Desconto Automático para Assinantes (%)"
                    description="Percentual global aplicado automaticamente sobre o preço por caractere quando o cliente possui uma assinatura ativa com aquela profissional. Por exemplo: com preço global de R$ 0,05 e desconto de 20%, o assinante paga R$ 0,04 por caractere. Não é a taxa da plataforma e não pode ser definido individualmente pela profissional."
                    unit="%"
                >
                    <input
                        type="number"
                        value={subscriberDiscountPercentage}
                        onChange={(e) => setSubscriberDiscountPercentage(Number(e.target.value))}
                        min={0}
                        max={100}
                        className={inputCls}
                    />
                </SettingField>
            </div>
        </div>
    );
}
