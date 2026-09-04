'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type CampaignRow = { _id: string; name: string; slug: string; status: string; visits: number; ctaClicks: number; signups: number; recharges: number; paidChatStarts: number; rechargeRevenueCents: number };

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', slug: '', landingHeadline: '', landingBody: '', targetProfessionalId: '' });

    const load = async () => {
        setLoading(true);
        const response = await fetch('/api/admin/campaigns');
        const data = await response.json();
        if (response.ok) setCampaigns(data.campaigns ?? []);
        setLoading(false);
    };

    useEffect(() => { void load(); }, []);

    const create = async (event: FormEvent) => {
        event.preventDefault();
        const response = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await response.json();
        if (!response.ok) return toast.error(data.error ?? 'Não foi possível criar a campanha.');
        toast.success('Campanha criada como rascunho.');
        setForm({ name: '', slug: '', landingHeadline: '', landingBody: '', targetProfessionalId: '' });
        await load();
    };

    const changeStatus = async (id: string, status: string) => {
        await fetch('/api/admin/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
        await load();
    };

    return (
        <div className="space-y-6">
            <div><Link href="/admin" className="text-xs font-bold text-purple-600">← Dashboard</Link><h1 className="mt-2 text-2xl font-black text-slate-900">Campanhas</h1><p className="text-sm text-slate-500">Cadastre a landing e depois use a URL pública no ExoClick.</p></div>
            <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
                <input required placeholder="Nome interno" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm" />
                <input required placeholder="slug-da-campanha" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm" />
                <input required placeholder="Título da landing" value={form.landingHeadline} onChange={e => setForm({ ...form, landingHeadline: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm sm:col-span-2" />
                <textarea required placeholder="Texto da landing" value={form.landingBody} onChange={e => setForm({ ...form, landingBody: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm sm:col-span-2" />
                <input placeholder="Clerk ID da profissional (opcional)" value={form.targetProfessionalId} onChange={e => setForm({ ...form, targetProfessionalId: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm" />
                <button className="rounded-xl bg-purple-600 p-3 text-sm font-bold text-white">Criar rascunho</button>
            </form>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {loading ? <p className="p-8 text-sm text-slate-500">Carregando...</p> : campaigns.map(row => (
                    <div key={row._id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="font-bold text-slate-900">{row.name}</p><a href={`/c/${row.slug}`} target="_blank" rel="noreferrer" className="text-xs text-purple-600">/c/{row.slug}</a><p className="text-xs text-slate-500">{row.visits} visitas · {row.ctaClicks} cliques · {row.signups} cadastros · {row.recharges} recargas · {row.paidChatStarts} primeiras mensagens pagas · {(row.rechargeRevenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recarregados</p></div>
                        <select value={row.status} onChange={e => void changeStatus(row._id, e.target.value)} className="rounded-xl border border-slate-200 p-2 text-sm"><option value="draft">Rascunho</option><option value="active">Ativa</option><option value="paused">Pausada</option><option value="archived">Arquivada</option></select>
                    </div>
                ))}
            </div>
        </div>
    );
}
