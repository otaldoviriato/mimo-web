'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Megaphone, Eye, MessageSquare, DollarSign, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PromotionMetrics {
    profileViews: number;
    newConversations: number;
    netEarningsCents: number;
}

interface ActivePromotion {
    id: string;
    startedAt: string;
    expiresAt: string;
    status: string;
    remainingSeconds: number;
    metrics: PromotionMetrics;
}

interface PromotionHistoryItem {
    id: string;
    startedAt: string;
    endedAt?: string;
    expiresAt: string;
    status: string;
    metrics: PromotionMetrics;
}

interface PromotionData {
    activePromotion: ActivePromotion | null;
    history: PromotionHistoryItem[];
    canActivate: boolean;
    isEligible: boolean;
    withinWindow: boolean;
    reachedDailyLimit: boolean;
    dailyCount: number;
    maxDaily: number;
    durationMinutes: number;
    nextOpportunityAt: string;
    isAvailable: boolean;
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatNextOpportunity(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `hoje às ${time}`;
    return `amanhã às ${time}`;
}

export default function DivulgacaoPage() {
    const router = useRouter();
    const [data, setData] = useState<PromotionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [submitting, setSubmitting] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);

    const loadData = async () => {
        try {
            const res = await fetch('/api/users/me/promotion');
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || 'Erro ao carregar dados.');
            }
            const json: PromotionData = await res.json();
            setData(json);
            if (json.activePromotion) {
                setSecondsLeft(json.activePromotion.remainingSeconds);
            } else {
                setSecondsLeft(0);
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao carregar divulgação.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    void loadData();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [secondsLeft]);

    const handleStartPromotion = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/users/me/promotion', {
                method: 'POST',
            });
            const result = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(result?.error || 'Não foi possível iniciar a divulgação.');
            }
            toast.success('Divulgação iniciada! Você está disponível no Explorar.');
            startTransition(() => {
                router.push('/chats');
            });
        } catch (err: any) {
            toast.error(err.message || 'Falha ao iniciar divulgação.');
            setSubmitting(false);
        }
    };

    const handleCancelPromotion = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/users/me/promotion/cancel', {
                method: 'POST',
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || 'Falha ao encerrar divulgação.');
            }
            toast.success('Divulgação encerrada.');
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao encerrar.');
        } finally {
            setSubmitting(false);
        }
    };

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
            {/* Header seguindo exatamente o padrão do aplicativo (conversas, carteira e perfil) */}
            <header className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-30 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer -ml-1"
                        aria-label="Voltar"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                        Divulgação
                    </span>
                </div>
            </header>

            <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4 pb-12">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-purple-800" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Receba novos contatos</h2>
                            <p className="text-xs text-slate-500">
                                Durante 1 hora, seu perfil ficará disponível no Explorar para receber novos contatos.
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-700">Dicas para seu atendimento:</p>
                        <p>• Acompanhe e responda às mensagens recebidas durante a divulgação.</p>
                        <p>• Você pode participar todos os dias, sem cobrança adicional pela ativação.</p>
                        <p>• Conversas já iniciadas continuam funcionando normalmente mesmo após o término.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400 text-sm animate-pulse">
                        Carregando informações da divulgação...
                    </div>
                ) : data?.activePromotion ? (
                    <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs space-y-5 relative overflow-hidden">
                        {/* Efeito de ondas/radar em movimento no fundo quando a divulgação está ativada */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 pointer-events-none">
                            <span className="absolute inset-0 rounded-full bg-purple-400/10 animate-ping duration-1000" />
                            <span className="absolute inset-4 rounded-full bg-purple-400/15 animate-pulse" />
                        </div>

                        {/* Switch de controle da divulgação */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 relative z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900">Status da divulgação</h3>
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-700 font-semibold mt-0.5">Ativada e transmitindo no Explorar</p>
                            </div>

                            {/* Switch Ativado (toggle para desativar) */}
                            <button
                                type="button"
                                role="switch"
                                aria-checked={true}
                                aria-label="Desativar divulgação"
                                disabled={submitting}
                                onClick={handleCancelPromotion}
                                className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-emerald-500 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <span
                                    className="pointer-events-none inline-block h-7 w-7 translate-x-6 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out"
                                />
                            </button>
                        </div>

                        {/* Indicador de Transmissão Ativa em Movimento */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-3 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-4.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-3 bg-purple-600 rounded-full animate-bounce" />
                                </div>
                                <span className="text-xs font-semibold text-purple-900">Em destaque agora</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-purple-900 text-sm font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-purple-100">
                                <Clock className="w-4 h-4 text-purple-600" />
                                <span>{formattedTimer}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                <Eye className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                                <div className="text-lg font-black text-slate-900">{data.activePromotion.metrics.profileViews}</div>
                                <div className="text-[11px] text-slate-500 font-medium leading-tight">Visitas</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                <MessageSquare className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                                <div className="text-lg font-black text-slate-900">{data.activePromotion.metrics.newConversations}</div>
                                <div className="text-[11px] text-slate-500 font-medium leading-tight">Novas conversas</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                <DollarSign className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                                <div className="text-sm font-black text-purple-700 mt-1">
                                    {formatCurrency(data.activePromotion.metrics.netEarningsCents)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium leading-tight">Arrecadado</div>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 text-center">
                            Ganhos acumulados com os clientes conquistados nesta divulgação.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
                        {/* Switch Desativado */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Começar divulgação</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {data?.canActivate
                                        ? 'Ative o switch para colocar seu perfil no ar por 1 hora'
                                        : 'A divulgação não está disponível no momento'}
                                </p>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={false}
                                aria-label="Ativar divulgação"
                                disabled={!data?.canActivate || submitting || isPending}
                                onClick={handleStartPromotion}
                                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                    data?.canActivate && !submitting && !isPending
                                        ? 'bg-slate-300 hover:bg-slate-400'
                                        : 'bg-slate-200 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-7 w-7 translate-x-0 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                                        submitting || isPending ? 'animate-pulse' : ''
                                    }`}
                                />
                            </button>
                        </div>

                        {!data?.isEligible ? (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Perfil em análise</p>
                                    <p>A divulgação estará disponível após a aprovação do seu perfil profissional.</p>
                                </div>
                            </div>
                        ) : data?.reachedDailyLimit ? (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Participação de hoje concluída</p>
                                    <p>
                                        Você já realizou sua participação de hoje. A próxima oportunidade estará disponível{' '}
                                        {formatNextOpportunity(data.nextOpportunityAt)}.
                                    </p>
                                </div>
                            </div>
                        ) : !data?.withinWindow ? (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Fora do horário de ativação</p>
                                    <p>
                                        A próxima oportunidade de ativação estará disponível{' '}
                                        {formatNextOpportunity(data?.nextOpportunityAt || new Date().toISOString())}.
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Histórico de divulgações</h3>

                    {loading ? (
                        <p className="text-xs text-slate-400 py-3 text-center">Carregando histórico...</p>
                    ) : !data?.history || data.history.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-medium">
                            Nenhuma divulgação realizada até o momento.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.history.map(item => (
                                <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-800">
                                            {formatDateTime(item.startedAt)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            item.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : item.status === 'cancelled'
                                                    ? 'bg-slate-100 text-slate-600'
                                                    : 'bg-purple-50 text-purple-700'
                                        }`}>
                                            {item.status === 'active' ? 'Ativa' : item.status === 'cancelled' ? 'Encerrada' : 'Concluída'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                                            {item.metrics.profileViews} visitas
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                            {item.metrics.newConversations} conversas
                                        </span>
                                        <span className="font-semibold text-purple-700">
                                            {formatCurrency(item.metrics.netEarningsCents)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
