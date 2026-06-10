'use client';

import { ExternalLink, Save, Search, Trash2, X } from 'lucide-react';
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

type CompatibilityLevel = 'excellent' | 'very_promising' | 'promising' | 'low_fit' | 'incompatible';
type ContactStatus = 'not_contacted' | 'contacted_no_reply' | 'replied_interested' | 'replied_not_interested' | 'became_user';

interface Lead {
    _id: string;
    username: string;
    displayName: string;
    profileUrl: string;
    bio: string;
    followersCount: number;
    postsCount: number;
    externalLink: string;
    sourceContext: string;
    aiCompatibility: CompatibilityLevel;
    aiSummary: string;
    aiPositiveSignals: string[];
    aiRiskSignals: string[];
    suggestedMessage: string;
    contactStatus: ContactStatus;
    contactResponse: string;
    notes: string;
    createdAt: string;
}

const compatibilityOptions: Array<{ value: CompatibilityLevel; label: string }> = [
    { value: 'excellent', label: 'Excelente' },
    { value: 'very_promising', label: 'Muito promissor' },
    { value: 'promising', label: 'Promissor' },
    { value: 'low_fit', label: 'Pouco compatível' },
    { value: 'incompatible', label: 'Incompatível' },
];

const contactOptions: Array<{ value: ContactStatus; label: string }> = [
    { value: 'not_contacted', label: 'Ainda não falamos' },
    { value: 'contacted_no_reply', label: 'Contatada, sem resposta' },
    { value: 'replied_interested', label: 'Respondeu com interesse' },
    { value: 'replied_not_interested', label: 'Não demonstrou interesse' },
    { value: 'became_user', label: 'Virou usuária' },
];

function compatibilityTone(level: CompatibilityLevel) {
    if (level === 'excellent' || level === 'very_promising') return 'green' as const;
    if (level === 'promising') return 'amber' as const;
    return 'red' as const;
}

function contactTone(status: ContactStatus) {
    if (status === 'became_user' || status === 'replied_interested') return 'green' as const;
    if (status === 'contacted_no_reply') return 'blue' as const;
    if (status === 'replied_not_interested') return 'red' as const;
    return 'slate' as const;
}

function labelFor<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
    return options.find(option => option.value === value)?.label || value;
}

export default function LeadsPage() {
    const searchParams = useSearchParams();
    const [leads, setLeads] = useState<Lead[] | null>(null);
    const [selected, setSelected] = useState<Lead | null>(null);
    const [search, setSearch] = useState('');
    const [compatibility, setCompatibility] = useState<CompatibilityLevel | ''>('');
    const [contactStatus, setContactStatus] = useState<ContactStatus | ''>('');
    const [sort, setSort] = useState<'compatibility' | 'date'>('compatibility');
    const [detailCompatibility, setDetailCompatibility] = useState<CompatibilityLevel>('promising');
    const [detailContactStatus, setDetailContactStatus] = useState<ContactStatus>('not_contacted');
    const [contactResponse, setContactResponse] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const openLead = useCallback((lead: Lead) => {
        setSelected(lead);
        setDetailCompatibility(lead.aiCompatibility);
        setDetailContactStatus(lead.contactStatus);
        setContactResponse(lead.contactResponse || '');
        setNotes(lead.notes || '');
    }, []);

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams({ sort });
            if (search.trim()) params.set('q', search.trim());
            if (compatibility) params.set('compatibility', compatibility);
            if (contactStatus) params.set('contactStatus', contactStatus);
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
    }, [compatibility, contactStatus, openLead, search, searchParams, selected, sort]);

    useEffect(() => {
        const timer = window.setTimeout(load, 250);
        return () => window.clearTimeout(timer);
    }, [load]);

    async function save() {
        if (!selected) return;
        setSaving(true);
        try {
            const data = await marketingFetch<{ lead: Lead }>(`/api/marketing/leads/${selected._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aiCompatibility: detailCompatibility,
                    contactStatus: detailContactStatus,
                    contactResponse,
                    notes,
                }),
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

    async function removeLead() {
        if (!selected || !window.confirm(`Remover definitivamente a lead @${selected.username}?`)) return;
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
            <PageIntro title="Leads prospectadas" description="Abra o Instagram rapidamente e acompanhe contato, resposta e conversão de cada lead." />
            <Panel className="mb-4 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${fieldClass} pl-9`} placeholder="Buscar username" value={search} onChange={event => setSearch(event.target.value)} />
                    </label>
                    <select className={fieldClass} value={compatibility} onChange={event => setCompatibility(event.target.value as CompatibilityLevel | '')}>
                        <option value="">Todas as compatibilidades</option>
                        {compatibilityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select className={fieldClass} value={contactStatus} onChange={event => setContactStatus(event.target.value as ContactStatus | '')}>
                        <option value="">Todas as situações</option>
                        {contactOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select className={fieldClass} value={sort} onChange={event => setSort(event.target.value as 'compatibility' | 'date')}>
                        <option value="compatibility">Melhor compatibilidade</option>
                        <option value="date">Mais recentes</option>
                    </select>
                </div>
            </Panel>

            {leads.length === 0 ? (
                <EmptyState title="Nenhuma lead encontrada" description="Ajuste os filtros ou adicione perfis pelo Mimo Scout." />
            ) : (
                <Panel className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-4">Lead</th>
                                    <th className="px-5 py-4">Audiência</th>
                                    <th className="px-5 py-4">Compatibilidade</th>
                                    <th className="px-5 py-4">Contato</th>
                                    <th className="px-5 py-4">Adicionada</th>
                                    <th className="px-5 py-4 text-right">Acessar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map(lead => (
                                    <tr key={lead._id} onClick={() => openLead(lead)} className="cursor-pointer hover:bg-purple-50/50">
                                        <td className="px-5 py-4">
                                            <p className="font-black">@{lead.username}</p>
                                            <p className="max-w-xs truncate text-xs text-slate-500">{lead.displayName || lead.bio}</p>
                                        </td>
                                        <td className="px-5 py-4 font-semibold">{lead.followersCount.toLocaleString('pt-BR')}</td>
                                        <td className="px-5 py-4"><StatusBadge tone={compatibilityTone(lead.aiCompatibility)}>{labelFor(compatibilityOptions, lead.aiCompatibility)}</StatusBadge></td>
                                        <td className="px-5 py-4"><StatusBadge tone={contactTone(lead.contactStatus)}>{labelFor(contactOptions, lead.contactStatus)}</StatusBadge></td>
                                        <td className="px-5 py-4 text-xs text-slate-500">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-5 py-4 text-right">
                                            <a
                                                href={lead.profileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={event => event.stopPropagation()}
                                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-purple-700"
                                            >
                                                <ExternalLink className="h-4 w-4" />Abrir Instagram
                                            </a>
                                        </td>
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
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase text-purple-600">Detalhes da lead</p>
                                <h2 className="truncate text-xl font-black">@{selected.username}</h2>
                            </div>
                            <a href={selected.profileUrl} target="_blank" rel="noreferrer" className={primaryButtonClass}><ExternalLink className="h-4 w-4" />Abrir Instagram</a>
                            <button className="rounded-xl bg-slate-100 p-2" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-5 p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label>
                                    <span className={labelClass}>Compatibilidade</span>
                                    <select className={fieldClass} value={detailCompatibility} onChange={event => setDetailCompatibility(event.target.value as CompatibilityLevel)}>
                                        {compatibilityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span className={labelClass}>Situação do contato</span>
                                    <select className={fieldClass} value={detailContactStatus} onChange={event => setDetailContactStatus(event.target.value as ContactStatus)}>
                                        {contactOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </label>
                            </div>
                            <Panel className="p-4">
                                <p className="text-xs font-bold uppercase text-slate-400">Resumo da IA</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.aiSummary}</p>
                            </Panel>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SignalBox title="Sinais positivos" values={selected.aiPositiveSignals} tone="green" />
                                <SignalBox title="Riscos" values={selected.aiRiskSignals} tone="red" />
                            </div>
                            <Panel className="p-4">
                                <p className="text-xs font-bold uppercase text-slate-400">Perfil</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.bio || 'Bio não informada.'}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a href={selected.profileUrl} target="_blank" rel="noreferrer" className={primaryButtonClass}><ExternalLink className="h-4 w-4" />Abrir Instagram</a>
                                    {selected.externalLink && <a href={selected.externalLink} target="_blank" rel="noreferrer" className={secondaryButtonClass}><ExternalLink className="h-4 w-4" />Abrir link da bio</a>}
                                </div>
                            </Panel>
                            <label>
                                <span className={labelClass}>Resposta obtida</span>
                                <textarea rows={4} className={fieldClass} placeholder="Registre o que ela respondeu ou o contexto do contato." value={contactResponse} onChange={event => setContactResponse(event.target.value)} />
                            </label>
                            <label>
                                <span className={labelClass}>Notas internas</span>
                                <textarea rows={4} className={fieldClass} value={notes} onChange={event => setNotes(event.target.value)} />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                <button disabled={saving || deleting} className={`${primaryButtonClass} w-full`} onClick={save}><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar acompanhamento'}</button>
                                <button disabled={saving || deleting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50" onClick={removeLead}>
                                    <Trash2 className="h-4 w-4" />{deleting ? 'Removendo...' : 'Remover'}
                                </button>
                            </div>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}

function SignalBox({ title, values, tone }: { title: string; values: string[]; tone: 'green' | 'red' }) {
    return (
        <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase text-slate-400">{title}</p>
            <div className="flex flex-wrap gap-1.5">
                {values.length
                    ? values.map(value => <StatusBadge key={value} tone={tone}>{value}</StatusBadge>)
                    : <span className="text-xs text-slate-400">Nenhum sinal.</span>}
            </div>
        </Panel>
    );
}
