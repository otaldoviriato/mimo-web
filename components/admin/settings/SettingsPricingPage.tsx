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
    maxPricePerChar, setMaxPricePerChar,
    defaultPricePerCharNonSubscribers, setDefaultPricePerCharNonSubscribers,
    defaultPricePerCharSubscribers, setDefaultPricePerCharSubscribers,
    minSubscriptionPrice, setMinSubscriptionPrice,
    maxSubscriptionPrice, setMaxSubscriptionPrice,
    subscriberDiscountPercentage, setSubscriberDiscountPercentage,
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
                        Limites e valores padrão que controlam como profissionais precificam seus serviços e assinaturas.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço por Caractere</h3>
                </div>

                <SettingField
                    title="Preço Máximo por Caractere (R$)"
                    description="Teto global que nenhum profissional pode ultrapassar ao definir seu preço por caractere digitado pelo cliente. O sistema bloqueia qualquer tentativa de cadastrar um valor acima deste limite. Protege os usuários de preços abusivos e mantém a acessibilidade da plataforma. Lembre-se que o preço é cobrado por caractere, então valores pequenos representam cobranças significativas em mensagens longas."
                    unit="R$ / char"
                >
                    <input
                        type="number"
                        step="0.0001"
                        value={maxPricePerChar}
                        onChange={(e) => setMaxPricePerChar(Number(e.target.value))}
                        min={0}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Preço Padrão por Caractere (Não-Assinantes) (R$)"
                    description={
                        <span>
                            Valor pré-preenchido como padrão no campo de preço por caractere para usuários <strong className="text-slate-600">sem assinatura ativa</strong> do profissional. Cada profissional pode alterar esse valor individualmente no seu perfil — este é apenas o valor inicial sugerido no cadastro. Representa o preço cheio, sem desconto.
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
                    title="Preço Padrão por Caractere (Assinantes) (R$)"
                    description={
                        <span>
                            Valor pré-preenchido como padrão para usuários <strong className="text-slate-600">com assinatura ativa</strong> do profissional. Este valor é calculado automaticamente aplicando o Desconto Automático para Assinantes (%) sobre o preço padrão de não-assinantes.
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
                    description="Percentual de desconto aplicado automaticamente pelo sistema sobre o preço por caractere quando o usuário possui uma assinatura ativa com aquele profissional. Este desconto é calculado em cima do preço configurado pelo profissional para assinantes. Por exemplo: se o preço é R$ 0,005/char e o desconto é 20%, o assinante paga R$ 0,004/char. Este mecanismo incentiva assinaturas como forma de reduzir o custo de mensagens."
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
