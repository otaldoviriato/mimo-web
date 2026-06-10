'use client';

import { Copy, ExternalLink, Save, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    EmptyState,
    fieldClass,
    labelClass,
    LoadingState,
    PageIntro,
    Panel,
    primaryButtonClass,
    secondaryButtonClass,
    StatusBadge,
} from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

type LeadStatus = 'new' | 'reviewed' | 'approved' | 'contacted' | 'interested' | 'onboarded' | 'rejected' | 'ignored';
interface Lead {
    _id: string;
    username: string;
    displayName: string;
    profileUrl: string;
    bio: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    externalLink: string;
    sourceSeedUsername: string;
    sourceContext: string;
    aiScore: number;
    aiSummary: string;
    aiPositiveSignals: string[];
    aiRiskSignals: string[];
    aiRecommendation: 'approve' | 'review' | 'reject';
    suggestedMessage: string;
    status: LeadStatus;
    notes: string;
    createdAt: string;
}

const statuses: Array<{ value: LeadStatus | ''; label: string }> = [
    { value: '', label: 'Todos os status' },
    { value: 'new', label: 'Nova' },
    { value: 'reviewed', label: 'Revisada' },
    { value: 'approved', label: 'Aprovada' },
    { value: 'contacted', label: 'Contatada' },
    { value: 'interested', label: 'Interessada' },
    { value: 'onboarded', label: 'Onboarded' },
    { value: 'rejected', label: 'Rejeitada' },
    { value: 'ignored', label: 'Ignorada' },
];

const statusTone = (status: LeadStatus) => {
    if (status === 'onboarded' || status === 'interested' || status === 'approved') return 'green' as const;
    if (status === 'rejected' || status === 'ignored') return 'red' as const;
    if (status === 'contacted') return 'blue' as const;
    if (status === 'new') return 'purple' as const;
    return 'slate' as const;
};

export default function LeadsPage() {
    const searchParams = useSearchParams();
    const [leads, setLeads] = useState<Lead[] | null>(null);
    const [selected, setSelected] = useState<Lead | null>(null);
    const [status, setStatus] = useState<LeadStatus | ''>('');
    const [minScore, setMinScore] = useState(0);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'score' | 'date'>('score');
    const [notes, setNotes] = useState('');
    const [detailStatus, setDetailStatus] = useState<LeadStatus>('new');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (search.trim()) params.set('q', search.trim());
            params.set('minScore', String(minScore));
            params.set('sort', sort);
            const data = await marketingFetch<{ leads: Lead[] }>(`/api/marketing/leads?${params}`);
            setLeads(data.leads);
            const requestedLead = searchParams.get('lead');
            if (requestedLead && !selected) {
                const match = data.leads.find(lead => lead._id === requestedLead);
                if (match) openLead(match);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar leads.');
        }
    }, [minScore, search, searchParams, selected, sort, status]);

    useEffect(() => {
        const timer = window.setTimeout(load, 250);
        return () => window.clearTimeout(timer);
    }, [load]);

    function openLead(lead: Lead) {
        setSelected(lead);
        setNotes(lead.notes || '');
        setDetailStatus(lead.status);
    }

    async function save() {
        if (!selected) return;
        setSaving(true);
        try {
            const data = await marketingFetch<{ lead: Lead }>(`/api/marketing/leads/${selected._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: detailStatus, notes }),
            });
            setSelected(data.lead);
            setLeads(current => current?.map(item => item._id === data.lead._id ? data.lead : item) || []);
            toast.success('Lead atualizada.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    async function copyMessage() {
        if (!selected?.suggestedMessage) return;
        await navigator.clipboard.writeText(selected.suggestedMessage);
        toast.success('Mensagem copiada.');
    }

    async function removeLead() {
        if (!selected) return;
        const confirmed = window.confirm(`Remover definitivamente a lead @${selected.username}?`);
        if (!confirmed) return;
        setDeleting(true);
        try {
            await marketingFetch(`/api/marketing/leads/${selected._id}`, { method: 'DELETE' });
            setLeads(current => current?.filter(item => item._id !== selected._id) || []);
            setSelected(null);
            toast.success('Lead removida.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao remover lead.');
        } finally {
            setDeleting(false);
        }
    }

    if (!leads) return <LoadingState text="Carregando leads..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro title="Leads prospectadas" description="Revise a qualificação, organize o funil e faça qualquer contato manualmente fora do sistema." />
            <Panel className="mb-4 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${fieldClass} pl-9`} placeholder="Buscar username" value={search} onChange={event => setSearch(event.target.value)} />
                    </label>
                    <select className={fieldClass} value={status} onChange={event => setStatus(event.target.value as LeadStatus | '')}>{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3">
                        <span className="whitespace-nowrap text-xs font-bold text-slate-500">Score ≥</span>
                        <input type="number" min={0} max={100} className="min-w-0 flex-1 py-2.5 text-sm outline-none" value={minScore} onChange={event => setMinScore(Number(event.target.value))} />
                    </label>
                    <select className={fieldClass} value={sort} onChange={event => setSort(event.target.value as 'score' | 'date')}><option value="score">Maior score</option><option value="date">Mais recentes</option></select>
                </div>
            </Panel>

            {leads.length === 0 ? (
                <EmptyState title="Nenhuma lead encontrada" description="Ajuste os filtros ou conclua uma rodada de prospecção." />
            ) : (
                <Panel className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                <tr><th className="px-5 py-4">Lead</th><th className="px-5 py-4">Audiência</th><th className="px-5 py-4">Score</th><th className="px-5 py-4">Recomendação</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Data</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map(lead => (
                                    <tr key={lead._id} onClick={() => openLead(lead)} className="cursor-pointer hover:bg-purple-50/50">
                                        <td className="px-5 py-4"><p className="font-black">@{lead.username}</p><p className="max-w-xs truncate text-xs text-slate-500">{lead.displayName || lead.bio}</p></td>
                                        <td className="px-5 py-4 font-semibold">{lead.followersCount.toLocaleString('pt-BR')}</td>
                                        <td className="px-5 py-4"><span className={`text-lg font-black ${lead.aiScore >= 75 ? 'text-emerald-600' : lead.aiScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{Math.round(lead.aiScore)}</span></td>
                                        <td className="px-5 py-4"><StatusBadge tone={lead.aiRecommendation === 'approve' ? 'green' : lead.aiRecommendation === 'reject' ? 'red' : 'amber'}>{lead.aiRecommendation}</StatusBadge></td>
                                        <td className="px-5 py-4"><StatusBadge tone={statusTone(lead.status)}>{statuses.find(item => item.value === lead.status)?.label}</StatusBadge></td>
                                        <td className="px-5 py-4 text-xs text-slate-500">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            {selected && (
                <>
                    <button className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => setSelected(null)} aria-label="Fechar detalhes" />
                    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-slate-200 bg-white px-5 py-4">
                            <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-purple-600">Detalhes da lead</p><h2 className="truncate text-xl font-black">@{selected.username}</h2></div>
                            <button className="rounded-xl bg-slate-100 p-2" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-5 p-5">
                            <div className="grid grid-cols-3 gap-3">
                                <Metric label="Score IA" value={Math.round(selected.aiScore).toString()} />
                                <Metric label="Seguidores" value={selected.followersCount.toLocaleString('pt-BR')} />
                                <Metric label="Posts" value={selected.postsCount.toLocaleString('pt-BR')} />
                            </div>
                            <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-400">Resumo da IA</p><p className="mt-2 text-sm leading-6 text-slate-700">{selected.aiSummary}</p></Panel>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SignalBox title="Sinais positivos" values={selected.aiPositiveSignals} tone="green" />
                                <SignalBox title="Riscos" values={selected.aiRiskSignals} tone="red" />
                            </div>
                            <Panel className="p-4">
                                <p className="text-xs font-bold uppercase text-slate-400">Dados do perfil</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.bio || 'Bio não informada.'}</p>
                                {selected.sourceContext && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{selected.sourceContext}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a href={selected.profileUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}><ExternalLink className="h-4 w-4" />Abrir perfil</a>
                                    {selected.externalLink && <a href={selected.externalLink} target="_blank" rel="noreferrer" className={secondaryButtonClass}><ExternalLink className="h-4 w-4" />Link externo</a>}
                                </div>
                            </Panel>
                            <Panel className="p-4">
                                <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase text-slate-400">Mensagem sugerida</p><button onClick={copyMessage} disabled={!selected.suggestedMessage} className={secondaryButtonClass}><Copy className="h-4 w-4" />Copiar</button></div>
                                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-purple-50 p-4 text-sm leading-6 text-purple-950">{selected.suggestedMessage || 'Mensagem não gerada para esta lead.'}</p>
                                <p className="mt-2 text-xs text-slate-400">O envio é manual. O Mimo Growth não envia DMs ou executa ações no Instagram.</p>
                            </Panel>
                            <label><span className={labelClass}>Status</span><select className={fieldClass} value={detailStatus} onChange={event => setDetailStatus(event.target.value as LeadStatus)}>{statuses.filter(item => item.value).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                            <label><span className={labelClass}>Notas internas</span><textarea rows={5} className={fieldClass} value={notes} onChange={event => setNotes(event.target.value)} /></label>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                <button disabled={saving || deleting} className={`${primaryButtonClass} w-full`} onClick={save}><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar status e notas'}</button>
                                <button
                                    disabled={saving || deleting}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                    onClick={removeLead}
                                >
                                    <Trash2 className="h-4 w-4" />{deleting ? 'Removendo...' : 'Remover lead'}
                                </button>
                            </div>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-lg font-black text-purple-700">{value}</p><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p></div>;
}

function SignalBox({ title, values, tone }: { title: string; values: string[]; tone: 'green' | 'red' }) {
    return <Panel className="p-4"><p className="mb-3 text-xs font-bold uppercase text-slate-400">{title}</p><div className="flex flex-wrap gap-1.5">{values.length ? values.map(value => <StatusBadge key={value} tone={tone}>{value}</StatusBadge>) : <span className="text-xs text-slate-400">Nenhum sinal.</span>}</div></Panel>;
}
