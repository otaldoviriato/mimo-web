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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Voltar"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-base font-bold text-slate-900">Divulgação do perfil</h1>
                <div className="w-10" />
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
                    <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Divulgação ativa
                            </span>
                            <div className="flex items-center gap-1 text-slate-600 text-sm font-semibold">
                                <Clock className="w-4 h-4 text-purple-600" />
                                <span>{formattedTimer}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
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

                        <button
                            onClick={handleCancelPromotion}
                            disabled={submitting}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Encerrando...' : 'Encerrar divulgação'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
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

                        <button
                            onClick={handleStartPromotion}
                            disabled={!data?.canActivate || submitting || isPending}
                            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.99] transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting || isPending ? 'Iniciando divulgação...' : 'Começar divulgação'}
                        </button>
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
