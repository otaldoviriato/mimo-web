'use client';

import React from 'react';
import { Tag, ShieldCheck, Coins, AlertCircle, CheckCircle2, Power } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'welcomeBonusEnabled' | 'setWelcomeBonusEnabled'
    | 'welcomeBonusAmountCents' | 'setWelcomeBonusAmountCents'
    | 'welcomeBonusLimitByIp' | 'setWelcomeBonusLimitByIp'
    | 'welcomeBonusBlockSameIpChat' | 'setWelcomeBonusBlockSameIpChat'
    | 'defaultPricePerCharNonSubscribers'
    | 'isDirtyPromotions' | 'saving' | 'saveSettings'
>;

export function SettingsPromotionsPage({
    welcomeBonusEnabled,
    setWelcomeBonusEnabled,
    welcomeBonusAmountCents,
    setWelcomeBonusAmountCents,
    welcomeBonusLimitByIp,
    setWelcomeBonusLimitByIp,
    welcomeBonusBlockSameIpChat,
    setWelcomeBonusBlockSameIpChat,
    defaultPricePerCharNonSubscribers,
    isDirtyPromotions,
    saving,
    saveSettings,
}: Props) {
    const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-xs';

    const pricePerChar = defaultPricePerCharNonSubscribers || 0.02;
    const valueInReais = (welcomeBonusAmountCents / 100).toFixed(2);
    const equivalentChars = Math.round(welcomeBonusAmountCents / (pricePerChar * 100));

    const quickAmounts = [
        { label: 'R$ 2,00', cents: 200, chars: Math.round(200 / (pricePerChar * 100)) },
        { label: 'R$ 3,00', cents: 300, chars: Math.round(300 / (pricePerChar * 100)) },
        { label: 'R$ 4,00', cents: 400, chars: Math.round(400 / (pricePerChar * 100)) },
        { label: 'R$ 5,00', cents: 500, chars: Math.round(500 / (pricePerChar * 100)) },
    ];

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyPromotions} saving={saving} onSave={() => saveSettings()} />

            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <Tag size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Promoções & Bônus de Boas-Vindas</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Controle manual de distribuição de saldo de boas-vindas para novos clientes.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-8">
                {/* 1. Interruptor Mestre (Ligar / Desligar Manual) */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 py-2 border-b border-slate-100 pb-6">
                    <div className="md:w-3/5 space-y-2">
                        <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-800">
                                Concessão de Bônus para Novos Cadastros
                            </h4>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                welcomeBonusEnabled 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                                {welcomeBonusEnabled ? '● Ligada' : '○ Desligada'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Controle mestre da promoção: <strong>enquanto esta chave estiver ligada</strong>, todos os novos clientes cadastrados receberão o saldo de boas-vindas automaticamente na carteira.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Ao desligar a chave, a distribuição é interrompida imediatamente para quaisquer novos cadastros que entrarem a partir desse momento.
                        </p>
                    </div>

                    <div className="md:w-2/5 flex md:justify-end">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={welcomeBonusEnabled}
                                onChange={(e) => setWelcomeBonusEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-purple-600 shadow-inner" />
                            <span className="ml-3 text-sm font-bold text-slate-800">
                                {welcomeBonusEnabled ? 'Promoção Ligada' : 'Promoção Desligada'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Banner de Estado em Tempo Real */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                    welcomeBonusEnabled 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                    {welcomeBonusEnabled ? (
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <Power size={20} className="text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs leading-relaxed font-medium">
                        {welcomeBonusEnabled ? (
                            <>
                                <strong className="text-emerald-800 block text-sm font-bold mb-0.5">
                                    Campanha Ativa: Concessão Automática Habilitada
                                </strong>
                                Todos os novos clientes que finalizarem o cadastro receberão <strong>R$ {valueInReais}</strong> de saldo promocional na hora para testar o bate-papo com as criadoras.
                            </>
                        ) : (
                            <>
                                <strong className="text-slate-800 block text-sm font-bold mb-0.5">
                                    Campanha Pausada: Sem Concessão de Saldo
                                </strong>
                                Novos cadastros nascerão com <strong>R$ 0,00 de saldo</strong> e precisarão recarregar para conversar.
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Valor do Bônus */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 border-b border-slate-100 pb-6">
                    <div className="md:w-1/2 space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                            Valor do Saldo de Boas-Vindas
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Define a quantia exata em Reais creditada na carteira do novo cliente quando a promoção estiver ligada.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            A tarifa padrão atual é de <strong>R$ {pricePerChar.toFixed(2)} por caractere</strong>. O saldo permite que o cliente troque as primeiras mensagens para que a profissional envie fotos ou vídeos com blur.
                        </p>
                    </div>
                    <div className="md:w-1/2 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="relative w-full max-w-xs">
                                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                                    R$
                                </span>
                                <input
                                    type="number"
                                    step="0.50"
                                    min={0}
                                    max={100}
                                    value={valueInReais}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val >= 0) {
                                            setWelcomeBonusAmountCents(Math.round(val * 100));
                                        }
                                    }}
                                    className={`${inputCls} pl-10`}
                                />
                            </div>
                        </div>

                        {/* Atalhos de valores */}
                        <div className="flex flex-wrap gap-2">
                            {quickAmounts.map((opt) => (
                                <button
                                    key={opt.cents}
                                    type="button"
                                    onClick={() => setWelcomeBonusAmountCents(opt.cents)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        welcomeBonusAmountCents === opt.cents
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {opt.label} ({opt.chars} carac.)
                                </button>
                            ))}
                        </div>

                        {/* Card informativo de consumo */}
                        <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 flex items-start gap-2.5">
                            <Coins size={16} className="text-purple-600 shrink-0 mt-0.5" />
                            <p className="text-[11.5px] text-purple-900 leading-relaxed">
                                Com <strong>R$ {valueInReais}</strong>, o cliente pode visualizar até <strong>{equivalentChars} caracteres</strong> de mensagens de texto lidas (aproximadamente <strong>3 respostas</strong> da modelo para preparar o gancho da foto com blur).
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Travas de Segurança e Antifraude */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">
                            Travas de Segurança & Antifraude
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
                            Proteções automáticas ativas mesmo durante a campanha ligada para impedir que um mesmo usuário crie múltiplas contas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-purple-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800">
                                        Limite Estrito por IP
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={welcomeBonusLimitByIp}
                                        onChange={(e) => setWelcomeBonusLimitByIp(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                                </label>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Permite no máximo <strong>1 concessão de bônus por endereço IP</strong>. Se alguém tentar criar várias contas na mesma rede, apenas a primeira recebe o bônus.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-purple-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800">
                                        Bloqueio de Auto-Atendimento
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={welcomeBonusBlockSameIpChat}
                                        onChange={(e) => setWelcomeBonusBlockSameIpChat(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                                </label>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Se o cliente e a criadora estiverem no <strong>mesmo endereço IP</strong>, a transferência de saldo bônus é bloqueada, eliminando qualquer incentivo de auto-atendimento.
                            </p>
                        </div>
                    </div>

                    {/* Resumo das garantias financeiras */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-emerald-900 leading-relaxed">
                            <strong>Garantia de Boa-Fé das Criadoras:</strong> As profissionais que atenderem novos clientes durante a campanha receberão normalmente suas comissões em dinheiro sacável via Pix, sem nenhuma retenção ou dependência de recargas futuras do usuário.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
