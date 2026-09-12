'use client';

import React from 'react';
import { Gift, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'freeIntroReplyLimit' | 'setFreeIntroReplyLimit'
    | 'isDirtyFreeIntro' | 'saving' | 'saveSettings'
>;

export function SettingsFreeIntroPage({
    freeIntroReplyLimit,
    setFreeIntroReplyLimit,
    isDirtyFreeIntro,
    saving,
    saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyFreeIntro} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <Gift size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Conheça Grátis</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Parametrização global das mensagens gratuitas oferecidas por criadoras a novos clientes.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-2">
                    <div className="md:w-1/2 space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                            Mensagens Gratuitas para Visualização
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Define quantas respostas da profissional o cliente pode visualizar sem custo no primeiro contato antes de ser cobrado.
                        </p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                            Ao esgotar essa cota, as mensagens subsequentes enviadas pela profissional tornam-se tarifadas (leitura paga) de acordo com o saldo do cliente.
                        </p>
                    </div>
                    <div className="md:w-1/2 space-y-3">
                        <div className="flex items-center gap-3">
                            <input
                                aria-label="Quantidade de respostas gratuitas"
                                type="number"
                                min={1}
                                max={100}
                                value={freeIntroReplyLimit}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setFreeIntroReplyLimit(isNaN(val) ? 1 : Math.max(1, Math.min(100, Math.round(val))));
                                }}
                                className={inputCls}
                            />
                            <span className="text-sm font-bold text-slate-500">
                                {freeIntroReplyLimit === 1 ? 'mensagem' : 'mensagens'}
                            </span>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-purple-700 font-semibold">
                                Configuração ativa: <strong>{freeIntroReplyLimit} {freeIntroReplyLimit === 1 ? 'resposta gratuita' : 'respostas gratuitas'}</strong> por conversa elegível. Novas conversas de Conheça Grátis criadas utilizarão este valor.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                        Regras de Funcionamento do Recurso
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                            <ShieldCheck size={18} className="text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-slate-800">Participação Voluntária</h5>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                    Cada profissional decide voluntariamente quando ativar ou desativar o Conheça Grátis em seu perfil.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                            <MessageSquare size={18} className="text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-slate-800">Primeiro Contato Apenas</h5>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                    A cota gratuita aplica-se exclusivamente no início da primeira interação entre o homem e a profissional.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                            <AlertCircle size={18} className="text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-slate-800">Sem Desativação por Tempo</h5>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                    A profissional não sofre pausa nem desativação automática do recurso por demora na resposta.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                            <Gift size={18} className="text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-slate-800">Conversão em Mensagens Pagas</h5>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                    Após visualizar a última mensagem gratuita, a conversa segue a monetização padrão por leitura.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
