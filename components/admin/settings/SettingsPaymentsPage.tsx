'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'pixEnabled' | 'setPixEnabled'
    | 'creditCardEnabled' | 'setCreditCardEnabled'
    | 'couponsEnabled' | 'setCouponsEnabled'
    | 'isDirtyPayments' | 'saving' | 'saveSettings'
>;

interface PaymentToggleProps {
    title: string;
    description: string;
    statusLabel: string;
    enabled: boolean;
    onChange: (v: boolean) => void;
    warningWhenOff?: string;
}

function PaymentToggle({ title, description, statusLabel, enabled, onChange, warningWhenOff }: PaymentToggleProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-6 border-b border-slate-100 last:border-0">
            <div className="md:w-1/2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                        {enabled ? 'Ativo' : 'Desativado'}
                    </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
                {!enabled && warningWhenOff && (
                    <p className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                        ⚠️ {warningWhenOff}
                    </p>
                )}
            </div>
            <div className="md:w-1/2 flex items-center">
                <button
                    type="button"
                    onClick={() => onChange(!enabled)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/25 cursor-pointer ${
                        enabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={enabled}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                </button>
                <span className="ml-3 text-sm font-semibold text-slate-600">{statusLabel}</span>
            </div>
        </div>
    );
}

export function SettingsPaymentsPage({
    pixEnabled, setPixEnabled,
    creditCardEnabled, setCreditCardEnabled,
    couponsEnabled, setCouponsEnabled,
    isDirtyPayments, saving, saveSettings,
}: Props) {
    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyPayments} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                    <CreditCard size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Meios de Pagamento</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Ative ou desative os meios de pagamento disponíveis para recarga de créditos na plataforma.
                    </p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <p className="text-sm font-bold text-amber-800 mb-1">Como funciona a desativação</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                    Desativar um meio de pagamento <strong>não cancela cobranças em andamento</strong> nem remove o método do sistema — apenas oculta a opção para o usuário no modal de recarga, exibindo a mensagem <strong>&quot;Indisponível temporariamente&quot;</strong>. Use este controle para manutenção do gateway, problemas técnicos temporários ou durante campanhas que exijam exclusividade de um método.
                </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <PaymentToggle
                    title="Pagamento via Pix"
                    description="O Pix é o principal método de pagamento da plataforma pela sua instantaneidade e baixo custo de processamento. Quando ativo, os usuários podem recarregar créditos via QR Code ou cópia e cola. As recargas são confirmadas automaticamente via webhook do gateway AbacatePay. Desative apenas em casos de instabilidade do provedor ou manutenção emergencial."
                    statusLabel={pixEnabled ? 'Pix habilitado' : 'Pix desabilitado'}
                    enabled={pixEnabled}
                    onChange={setPixEnabled}
                    warningWhenOff="O Pix está desativado. Usuários verão 'Indisponível temporariamente' ao tentar pagar com Pix."
                />

                <PaymentToggle
                    title="Pagamento via Cartão de Crédito"
                    description="Permite que usuários recarreguem créditos utilizando cartão de crédito. As transações passam pelo processamento do gateway e podem ter taxas de processamento mais elevadas que o Pix. Ideal para usuários que preferem parcelar ou não possuem conta bancária vinculada ao Pix. Quando desativado, o cartão some do modal de recarga."
                    statusLabel={creditCardEnabled ? 'Cartão habilitado' : 'Cartão desabilitado'}
                    enabled={creditCardEnabled}
                    onChange={setCreditCardEnabled}
                    warningWhenOff="Pagamento via cartão está desativado. Usuários não conseguirão recarregar com cartão de crédito."
                />


            </div>
        </div>
    );
}
