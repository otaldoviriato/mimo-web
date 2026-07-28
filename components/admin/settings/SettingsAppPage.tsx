'use client';

import React from 'react';
import { Smartphone } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'pwaShowAgainIntervalDays' | 'setPwaShowAgainIntervalDays'
    | 'identityVerificationPromptIntervalDays' | 'setIdentityVerificationPromptIntervalDays'
    | 'creatorEngagementEmailsEnabled' | 'setCreatorEngagementEmailsEnabled'
    | 'creatorEngagementStep1Enabled' | 'setCreatorEngagementStep1Enabled'
    | 'creatorEngagementStep1Hours' | 'setCreatorEngagementStep1Hours'
    | 'creatorEngagementStep2Enabled' | 'setCreatorEngagementStep2Enabled'
    | 'creatorEngagementStep2Hours' | 'setCreatorEngagementStep2Hours'
    | 'isDirtyApp' | 'saving' | 'saveSettings'
>;

export function SettingsAppPage({
    pwaShowAgainIntervalDays, setPwaShowAgainIntervalDays,
    identityVerificationPromptIntervalDays, setIdentityVerificationPromptIntervalDays,
    creatorEngagementEmailsEnabled, setCreatorEngagementEmailsEnabled,
    creatorEngagementStep1Enabled, setCreatorEngagementStep1Enabled,
    creatorEngagementStep1Hours, setCreatorEngagementStep1Hours,
    creatorEngagementStep2Enabled, setCreatorEngagementStep2Enabled,
    creatorEngagementStep2Hours, setCreatorEngagementStep2Hours,
    isDirtyApp, saving, saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyApp} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100">
                    <Smartphone size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">App & Experiência</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Configurações relacionadas à experiência do aplicativo instalável (PWA) e comportamentos de interface.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
                {/* Configuração PWA */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 pb-6 border-b border-slate-100">
                    <div className="md:w-1/2 space-y-2">
                        <h4 className="text-sm font-bold text-slate-800">Intervalo de Reexibição do Modal de Instalação (PWA)</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            O MimoChat é um <strong className="text-slate-600">Progressive Web App (PWA)</strong> — pode ser instalado como aplicativo nativo no celular ou desktop diretamente pelo navegador, sem precisar de App Store. Ao detectar que o usuário está em um navegador compatível, o sistema exibe automaticamente um modal convidando-o a instalar o app.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                            Se o usuário clicar em <strong className="text-slate-600">&quot;Fechar&quot;</strong> ou <strong className="text-slate-600">&quot;Continuar no navegador&quot;</strong>, o sistema aguarda o número de dias configurado aqui antes de exibir o modal novamente para aquele usuário. A contagem é individual e salva no navegador do usuário via localStorage.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                            <strong className="text-slate-600">Defina como 0</strong> para exibir o modal sempre que o usuário acessar a plataforma (não recomendado — pode ser percebido como intrusivo). Um intervalo de <strong className="text-slate-600">7 a 14 dias</strong> é o mais equilibrado entre visibilidade e não-intrusividade.
                        </p>
                        <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 mt-3">
                            <p className="text-[11px] text-violet-700 font-semibold leading-relaxed">
                                Configuração atual: o modal de instalação reaparecerá a cada <strong>{pwaShowAgainIntervalDays === 0 ? 'acesso (sem intervalo)' : `${pwaShowAgainIntervalDays} ${pwaShowAgainIntervalDays === 1 ? 'dia' : 'dias'}`}</strong> para usuários que já fecharam o convite.
                            </p>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex items-center gap-3">
                        <input
                            type="number"
                            value={pwaShowAgainIntervalDays}
                            onChange={(e) => setPwaShowAgainIntervalDays(Number(e.target.value))}
                            min={0}
                            className={inputCls}
                        />
                        <span className="text-sm font-bold text-slate-500 shrink-0">dias</span>
                    </div>
                </div>

                {/* Configuração do Banner de Verificação de Identidade */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 pb-6 border-b border-slate-100">
                    <div className="md:w-1/2 space-y-2">
                        <h4 className="text-sm font-bold text-slate-800">Intervalo de Reexibição do Banner de Verificação de Identidade</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Para incentivar a credibilidade do MimoChat, exibimos um banner na tela de conversas (/chats) estimulando o usuário a verificar o seu perfil caso ele não tenha feito isso ou caso sua verificação não esteja sob análise ou aprovada.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                            Se o usuário fechar o banner, ele ficará oculto temporariamente para não se tornar excessivamente incômodo. Esta configuração define quantos dias o sistema aguardará antes de exibir o banner de incentivo novamente para aquele usuário.
                        </p>
                        <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 mt-3">
                            <p className="text-[11px] text-violet-700 font-semibold leading-relaxed">
                                Configuração atual: o banner reaparecerá a cada <strong>{identityVerificationPromptIntervalDays === 0 ? 'acesso (sem intervalo)' : `${identityVerificationPromptIntervalDays} ${identityVerificationPromptIntervalDays === 1 ? 'dia' : 'dias'}`}</strong> para usuários que já fecharam a sugestão.
                            </p>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex items-center gap-3">
                        <input
                            type="number"
                            value={identityVerificationPromptIntervalDays}
                            onChange={(e) => setIdentityVerificationPromptIntervalDays(Number(e.target.value))}
                            min={0}
                            className={inputCls}
                        />
                        <span className="text-sm font-bold text-slate-500 shrink-0">dias</span>
                    </div>
                </div>

                {/* Seção: Réguas de E-mail de Engajamento de Criadoras */}
                <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Réguas de E-mail de Engajamento para Criadoras</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Disparos automáticos orientando criadoras inativas (com 0 conversas) a divulgar seu link exclusivo.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={creatorEngagementEmailsEnabled}
                                onChange={(e) => setCreatorEngagementEmailsEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            <span className="ml-2.5 text-xs font-bold text-slate-700">
                                {creatorEngagementEmailsEnabled ? 'Ativado Globalmente' : 'Desativado'}
                            </span>
                        </label>
                    </div>

                    {creatorEngagementEmailsEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Régua 1 */}
                            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Lembrete 1 (Primeiro Passo)</h4>
                                    <input
                                        type="checkbox"
                                        checked={creatorEngagementStep1Enabled}
                                        onChange={(e) => setCreatorEngagementStep1Enabled(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Envia e-mail convidando a criadora a copiar seu link e colocar no Instagram/TikTok após o tempo configurado abaixo sem nenhuma conversa iniciada.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs font-bold text-slate-600">Enviar após:</span>
                                    <input
                                        type="number"
                                        value={creatorEngagementStep1Hours}
                                        onChange={(e) => setCreatorEngagementStep1Hours(Number(e.target.value))}
                                        min={1}
                                        disabled={!creatorEngagementStep1Enabled}
                                        className="w-20 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 font-bold text-slate-700 text-center"
                                    />
                                    <span className="text-xs font-bold text-slate-500">horas de cadastro</span>
                                </div>
                            </div>

                            {/* Régua 2 */}
                            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Lembrete 2 (Reforço Dica de Ouro)</h4>
                                    <input
                                        type="checkbox"
                                        checked={creatorEngagementStep2Enabled}
                                        onChange={(e) => setCreatorEngagementStep2Enabled(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Segunda mensagem de incentivo caso a criadora continue sem conversas ativas, enfatizando histórias de sucesso e kit de divulgação.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs font-bold text-slate-600">Enviar após:</span>
                                    <input
                                        type="number"
                                        value={creatorEngagementStep2Hours}
                                        onChange={(e) => setCreatorEngagementStep2Hours(Number(e.target.value))}
                                        min={1}
                                        disabled={!creatorEngagementStep2Enabled}
                                        className="w-20 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 font-bold text-slate-700 text-center"
                                    />
                                    <span className="text-xs font-bold text-slate-500">horas de cadastro</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
