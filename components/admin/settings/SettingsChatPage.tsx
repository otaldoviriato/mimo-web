'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'chatSessionTimeoutMinutes' | 'setChatSessionTimeoutMinutes'
    | 'earningsSessionInactivityMinutes' | 'setEarningsSessionInactivityMinutes'
    | 'earningsSessionMinimumCents' | 'setEarningsSessionMinimumCents'
    | 'lowBalanceThresholdInCents' | 'setLowBalanceThresholdInCents'
    | 'onlineDelayMinutes' | 'setOnlineDelayMinutes'
    | 'activeUserThresholdDays' | 'setActiveUserThresholdDays'
    | 'isDirtyChat' | 'saving' | 'saveSettings'
>;

export function SettingsChatPage({
    chatSessionTimeoutMinutes, setChatSessionTimeoutMinutes,
    earningsSessionInactivityMinutes, setEarningsSessionInactivityMinutes,
    earningsSessionMinimumCents, setEarningsSessionMinimumCents,
    lowBalanceThresholdInCents, setLowBalanceThresholdInCents,
    onlineDelayMinutes, setOnlineDelayMinutes,
    activeUserThresholdDays, setActiveUserThresholdDays,
    isDirtyChat, saving, saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyChat} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                    <Clock size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Chat & Sessões</h2>
                    <p className="text-sm text-slate-505 font-medium mt-0.5">
                        Controles de comportamento das sessões de conversa entre usuários e profissionais.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <div className="py-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                        <div className="md:w-1/2 space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">Tempo de Sessão de Chat (minutos)</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Define o intervalo mínimo de inatividade entre mensagens, em minutos, para que o sistema interprete que uma <strong className="text-slate-600">nova sessão de conversa</strong> foi iniciada.
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                <strong className="text-slate-600">Como funciona na prática:</strong> se um usuário envia uma mensagem às 14h e a próxima chega às 14h35 (e o timeout é de 30 minutos), o sistema considera que uma nova conversa começou e dispara uma <strong className="text-slate-600">notificação por e-mail</strong> ao profissional avisando sobre a nova interação.
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                <strong className="text-slate-600">Valores muito baixos</strong> (ex: 5 min) geram muitas notificações mesmo em conversas contínuas, podendo irritar os profissionais. <strong className="text-slate-600">Valores muito altos</strong> (ex: 120 min) agrupam muitas mensagens em uma única sessão, reduzindo a percepção de engajamento. O valor padrão recomendado é de <strong className="text-slate-600">30 minutos</strong>.
                            </p>
                        </div>
                        <div className="md:w-1/2 space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={chatSessionTimeoutMinutes}
                                    onChange={(e) => setChatSessionTimeoutMinutes(Number(e.target.value))}
                                    min={1}
                                    max={1440}
                                    className={inputCls}
                                />
                                <span className="text-sm font-bold text-slate-500">min</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-[11px] text-blue-700 font-semibold">
                                    Configuração atual: mensagens com intervalo ≥ <strong>{chatSessionTimeoutMinutes} minutos</strong> iniciam uma nova sessão e disparam notificação ao profissional.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-6" />

                <div className="py-6 space-y-8">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Sessões motivacionais do extrato</h3>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                            Estes parâmetros controlam apenas os blocos exibidos no BackOffice. Eles não alteram saldo,
                            saques nem o livro financeiro. Desbloqueios posteriores são atribuídos à conversa original.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                        <div className="space-y-1 md:w-1/2">
                            <h4 className="text-sm font-bold text-slate-800">Inatividade entre sessões</h4>
                            <p className="text-xs font-medium leading-relaxed text-slate-500">
                                Uma nova sessão começa quando o intervalo entre duas mensagens do mesmo cliente ultrapassa este tempo.
                            </p>
                        </div>
                        <div className="space-y-3 md:w-1/2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={earningsSessionInactivityMinutes}
                                    onChange={(event) => setEarningsSessionInactivityMinutes(Number(event.target.value))}
                                    min={1}
                                    max={1440}
                                    className={inputCls}
                                />
                                <span className="text-sm font-bold text-slate-505">min</span>
                            </div>
                            <p className="text-[11px] font-semibold text-purple-700">
                                Recomendado: 120 minutos.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                        <div className="space-y-1 md:w-1/2">
                            <h4 className="text-sm font-bold text-slate-800">Ganho mínimo para exibir a sessão</h4>
                            <p className="text-xs font-medium leading-relaxed text-slate-500">
                                Blocos abaixo deste valor ficam fora dos destaques. O valor pode promover uma conversa curta ou unilateral.
                            </p>
                        </div>
                        <div className="space-y-3 md:w-1/2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-500">R$</span>
                                <input
                                    type="number"
                                    value={(earningsSessionMinimumCents / 100).toString()}
                                    onChange={(event) => setEarningsSessionMinimumCents(Math.round(Number(event.target.value || 0) * 100))}
                                    min={0}
                                    step={0.01}
                                    className={inputCls}
                                />
                            </div>
                            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                                <p className="text-[11px] font-semibold text-purple-700">
                                    Sessões com pelo menos <strong>{(earningsSessionMinimumCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> serão exibidas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-6" />

                <div className="py-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                        <div className="md:w-1/2 space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">Alerta de Saldo Baixo (R$)</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Define o saldo mÃ­nimo para exibir uma faixa de alerta dentro da sala de chat do cliente. Ao tocar na faixa, o BottomSheet de recarga Ã© aberto.
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                O valor padrÃ£o recomendado Ã© de <strong className="text-slate-600">R$ 10,00</strong>. Use 0 para desativar o alerta.
                            </p>
                        </div>
                        <div className="md:w-1/2 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-505">R$</span>
                                <input
                                    type="number"
                                    value={(lowBalanceThresholdInCents / 100).toString()}
                                    onChange={(e) => setLowBalanceThresholdInCents(Math.round(Number(e.target.value || 0) * 100))}
                                    min={0}
                                    step={0.01}
                                    className={inputCls}
                                />
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-[11px] text-blue-700 font-semibold">
                                    ConfiguraÃ§Ã£o atual: clientes com saldo atÃ© <strong>{(lowBalanceThresholdInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> verÃ£o o alerta na sala.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-6" />

                <div className="py-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                        <div className="md:w-1/2 space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">Tempo de Atraso para Status Offline (minutos)</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Define o intervalo de espera, em minutos, após o usuário fechar a aba, mudar de guia ou se desconectar temporariamente, para que o sistema altere seu status de "Online" para "Visto por último".
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                <strong className="text-slate-600">Como funciona na prática:</strong> isso evita que o status do usuário oscile muito rápido para offline quando ele muda rapidamente de guia ou perde a conexão momentaneamente. Ele continuará aparecendo como "Online" para os outros usuários até que esse tempo expire.
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                O valor padrão recomendado é de <strong className="text-slate-600">2 minutos</strong>. Se configurado como 0, o status mudará para offline imediatamente após a desconexão.
                            </p>
                        </div>
                        <div className="md:w-1/2 space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={onlineDelayMinutes}
                                    onChange={(e) => setOnlineDelayMinutes(Number(e.target.value))}
                                    min={0}
                                    max={1440}
                                    className={inputCls}
                                />
                                <span className="text-sm font-bold text-slate-505">min</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-[11px] text-blue-700 font-semibold">
                                    Configuração atual: o status offline será ativado apenas após <strong>{onlineDelayMinutes} minutos</strong> de inatividade total da conexão.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>



                <div className="border-t border-slate-100 my-6" />

                <div className="py-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                        <div className="md:w-1/2 space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">Limite de Dias para Usuário Ativo (dias)</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Define o período limite, em dias, para que o sistema considere um cliente ou profissional como "Ativo" no painel geral com base no seu acesso recente.
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                                O valor padrão recomendado é de <strong className="text-slate-600">7 dias</strong>.
                            </p>
                        </div>
                        <div className="md:w-1/2 space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={activeUserThresholdDays}
                                    onChange={(e) => setActiveUserThresholdDays(Number(e.target.value))}
                                    min={1}
                                    max={365}
                                    className={inputCls}
                                />
                                <span className="text-sm font-bold text-slate-505">dias</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-[11px] text-blue-700 font-semibold">
                                    Configuração atual: usuários com acesso nos últimos <strong>{activeUserThresholdDays} dias</strong> serão considerados ativos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
