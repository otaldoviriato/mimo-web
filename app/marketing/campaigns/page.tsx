'use client';

import { Archive, Pause, Play, Plus, Save, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
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

type CampaignStatus = 'active' | 'paused' | 'archived';
interface Campaign {
    _id: string;
    name: string;
    description: string;
    targetDescription: string;
    minFollowers: number;
    maxFollowers: number;
    positiveSignals: string[];
    negativeSignals: string[];
    status: CampaignStatus;
    createdAt: string;
}

const emptyForm = {
    name: '',
    description: '',
    targetDescription: '',
    minFollowers: 1000,
    maxFollowers: 250000,
    positiveSignals: '',
    negativeSignals: '',
};

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const load = useCallback(() => {
        marketingFetch<{ campaigns: Campaign[] }>('/api/marketing/campaigns')
            .then(data => setCampaigns(data.campaigns))
            .catch(error => toast.error(error.message));
    }, []);
    useEffect(load, [load]);

    async function create(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        try {
            await marketingFetch('/api/marketing/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setForm(emptyForm);
            setShowForm(false);
            load();
            toast.success('Campanha criada.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao criar campanha.');
        } finally {
            setSaving(false);
        }
    }

    async function setStatus(id: string, status: CampaignStatus) {
        try {
            const data = await marketingFetch<{ campaign: Campaign }>(`/api/marketing/campaigns/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            setCampaigns(current => current?.map(item => item._id === id ? data.campaign : item) || []);
            toast.success('Status atualizado.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao atualizar.');
        }
    }

    if (!campaigns) return <LoadingState text="Carregando campanhas..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro
                title="Campanhas"
                description="Defina o público-alvo e os sinais que orientarão a priorização e qualificação pela IA."
                action={<button className={primaryButtonClass} onClick={() => setShowForm(value => !value)}>{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? 'Fechar' : 'Nova campanha'}</button>}
            />
            {showForm && (
                <Panel className="mb-5 p-5 md:p-6">
                    <form onSubmit={create}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label><span className={labelClass}>Nome</span><input required className={fieldClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
                            <label><span className={labelClass}>Descrição interna</span><input className={fieldClass} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
                            <label className="md:col-span-2"><span className={labelClass}>Descrição do público-alvo</span><textarea required rows={4} className={fieldClass} value={form.targetDescription} onChange={event => setForm({ ...form, targetDescription: event.target.value })} /></label>
                            <label><span className={labelClass}>Seguidores mínimos</span><input type="number" min={0} className={fieldClass} value={form.minFollowers} onChange={event => setForm({ ...form, minFollowers: Number(event.target.value) })} /></label>
                            <label><span className={labelClass}>Seguidores máximos</span><input type="number" min={0} className={fieldClass} value={form.maxFollowers} onChange={event => setForm({ ...form, maxFollowers: Number(event.target.value) })} /></label>
                            <label><span className={labelClass}>Sinais positivos (um por linha)</span><textarea rows={4} className={fieldClass} value={form.positiveSignals} onChange={event => setForm({ ...form, positiveSignals: event.target.value })} /></label>
                            <label><span className={labelClass}>Sinais negativos (um por linha)</span><textarea rows={4} className={fieldClass} value={form.negativeSignals} onChange={event => setForm({ ...form, negativeSignals: event.target.value })} /></label>
                        </div>
                        <div className="mt-4 flex justify-end"><button disabled={saving} className={primaryButtonClass}><Save className="h-4 w-4" />{saving ? 'Criando...' : 'Criar campanha'}</button></div>
                    </form>
                </Panel>
            )}

            {campaigns.length === 0 ? (
                <EmptyState title="Nenhuma campanha" description="Crie uma campanha para orientar a primeira rodada." />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {campaigns.map(campaign => (
                        <Panel key={campaign._id} className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-black">{campaign.name}</h3>
                                        <StatusBadge tone={campaign.status === 'active' ? 'green' : campaign.status === 'paused' ? 'amber' : 'slate'}>{campaign.status}</StatusBadge>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">{campaign.description || 'Sem descrição interna.'}</p>
                                </div>
                            </div>
                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase text-slate-400">Público-alvo</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{campaign.targetDescription}</p>
                                <p className="mt-3 text-xs font-semibold text-purple-700">
                                    {campaign.minFollowers.toLocaleString('pt-BR')} a {campaign.maxFollowers.toLocaleString('pt-BR')} seguidores
                                </p>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <SignalList title="Sinais positivos" values={campaign.positiveSignals} tone="green" />
                                <SignalList title="Sinais negativos" values={campaign.negativeSignals} tone="red" />
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {campaign.status !== 'active' && <button className={secondaryButtonClass} onClick={() => setStatus(campaign._id, 'active')}><Play className="h-4 w-4" />Ativar</button>}
                                {campaign.status === 'active' && <button className={secondaryButtonClass} onClick={() => setStatus(campaign._id, 'paused')}><Pause className="h-4 w-4" />Pausar</button>}
                                {campaign.status !== 'archived' && <button className={secondaryButtonClass} onClick={() => setStatus(campaign._id, 'archived')}><Archive className="h-4 w-4" />Arquivar</button>}
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}

function SignalList({ title, values, tone }: { title: string; values: string[]; tone: 'green' | 'red' }) {
    return (
        <div>
            <p className="mb-2 text-xs font-bold text-slate-500">{title}</p>
            <div className="flex flex-wrap gap-1.5">
                {values.length ? values.map(value => <StatusBadge key={value} tone={tone}>{value}</StatusBadge>) : <span className="text-xs text-slate-400">Não informado</span>}
            </div>
        </div>
    );
}
