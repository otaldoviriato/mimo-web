'use client';

import React, { useState } from 'react';
import { Tag, ShieldCheck, Link as LinkIcon, Gift, Copy, Check, Info, Coins, AlertCircle } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';
import toast from 'react-hot-toast';

type Props = Pick<UseSettingsReturn,
    | 'welcomeBonusEnabled' | 'setWelcomeBonusEnabled'
    | 'welcomeBonusAmountCents' | 'setWelcomeBonusAmountCents'
    | 'welcomeBonusUrlParamKey' | 'setWelcomeBonusUrlParamKey'
    | 'welcomeBonusUrlParamValue' | 'setWelcomeBonusUrlParamValue'
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
    welcomeBonusUrlParamKey,
    setWelcomeBonusUrlParamKey,
    welcomeBonusUrlParamValue,
    setWelcomeBonusUrlParamValue,
    welcomeBonusLimitByIp,
    setWelcomeBonusLimitByIp,
    welcomeBonusBlockSameIpChat,
    setWelcomeBonusBlockSameIpChat,
    defaultPricePerCharNonSubscribers,
    isDirtyPromotions,
    saving,
    saveSettings,
}: Props) {
    const [copied, setCopied] = useState(false);

    const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-xs';

    const pricePerChar = defaultPricePerCharNonSubscribers || 0.02;
    const valueInReais = (welcomeBonusAmountCents / 100).toFixed(2);
    const equivalentChars = Math.round(welcomeBonusAmountCents / (pricePerChar * 100));

    const paramKey = welcomeBonusUrlParamKey || 'promo';
    const paramVal = welcomeBonusUrlParamValue || 'exoclick';
    const sampleCampaignUrl = `https://mimochat.com.br/?${encodeURIComponent(paramKey)}=${encodeURIComponent(paramVal)}`;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(sampleCampaignUrl);
            setCopied(true);
            toast.success('Link de campanha copiado para a área de transferência!');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Não foi possível copiar o link.');
        }
    };

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
                        Concessão de saldo promocional para aquisição de novos clientes vindos de campanhas de tráfego pago.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-8">
                {/* 1. Ativação da Promoção */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-2 border-b border-slate-100 pb-6">
                    <div className="md:w-3/5 space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800">
                                Bônus de Boas-Vindas para Novos Cadastros
                            </h4>
                            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                                welcomeBonusEnabled 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                                {welcomeBonusEnabled ? 'Ativo' : 'Pausado'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Quando ativado, novos clientes que se cadastrarem vindos de links de campanha receberão o saldo de teste imediatamente na carteira.
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
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                            <span className="ml-3 text-xs font-semibold text-slate-700">
                                {welcomeBonusEnabled ? 'Promoção Ligada' : 'Promoção Desligada'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* 2. Valor do Bônus */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 border-b border-slate-100 pb-6">
                    <div className="md:w-1/2 space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                            Valor do Saldo de Degustação
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Define o valor em Reais creditado na carteira do novo cliente elegível.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            A tarifa padrão atual é de <strong>R$ {pricePerChar.toFixed(2)} por caractere</strong>. O saldo permite que o cliente troque as primeiras mensagens para que a profissional possa enviar fotos ou vídeos com blur.
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
                                Com <strong>R$ {valueInReais}</strong>, o cliente pode visualizar até <strong>{equivalentChars} caracteres</strong> de mensagens de texto lidas (aproximadamente <strong>3 a 4 respostas</strong> curtas da modelo para armar o gancho da foto borrada).
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Parâmetro da URL de Campanha */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 border-b border-slate-100 pb-6">
                    <div className="md:w-1/2 space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                            Parâmetro da URL de Campanha
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Define qual parâmetro na barra de endereço ativa a concessão deste bônus.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            Usuários que acessam o MimoChat diretamente sem este parâmetro não recebem o saldo, garantindo que o investimento fique restrito ao tráfego pago medido.
                        </p>
                    </div>
                    <div className="md:w-1/2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                    Nome do Parâmetro (Key)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: promo"
                                    value={welcomeBonusUrlParamKey}
                                    onChange={(e) => setWelcomeBonusUrlParamKey(e.target.value.toLowerCase().trim())}
                                    className={inputCls}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Ex: promo, utm_campaign, src
                                </span>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                    Valor Esperado (Value)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: exoclick"
                                    value={welcomeBonusUrlParamValue}
                                    onChange={(e) => setWelcomeBonusUrlParamValue(e.target.value.toLowerCase().trim())}
                                    className={inputCls}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Ex: exoclick, hot, adulto (ou vazio para qualquer valor)
                                </span>
                            </div>
                        </div>

                        {/* Link Gerado para Campanha */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                                Link formatado para inserir nos anúncios (ExoClick):
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg font-mono text-xs text-purple-700 truncate select-all">
                                    {sampleCampaignUrl}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyUrl}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Segurança e Antifraude */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">
                            Travas de Segurança & Antifraude
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
                            Proteções automáticas para impedir abusos, criação em massa de contas e desvio de verba.
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
                                Permite no máximo <strong>1 concessão de bônus por endereço IP</strong>. Se uma pessoa ou profissional tentar criar várias contas na mesma rede, apenas a primeira recebe o benefício.
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
                                Se o cliente e a profissional estiverem no <strong>mesmo endereço IP</strong>, a transferência de saldo bônus é bloqueada, eliminando o incentivo de profissionais criarem contas para farmar comissões.
                            </p>
                        </div>
                    </div>

                    {/* Resumo das garantias financeiras */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-emerald-900 leading-relaxed">
                            <strong>Garantia de Boa-Fé das Criadoras:</strong> As profissionais que atenderem novos clientes elegíveis e consumirem esse saldo receberão normalmente a comissão em dinheiro sacável via Pix no fechamento de repasses, sem nenhuma retenção ou dependência de recargas futuras.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
