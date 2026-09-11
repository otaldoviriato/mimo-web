'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
    Megaphone,
    Play,
    Square,
    Users,
    MousePointer,
    Eye,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    Compass,
    MessageSquare,
    Image as ImageIcon,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    X,
    ExternalLink,
    ChevronRight,
    Search,
    TrendingUp,
    FileText,
    Pencil,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserInfo {
    username: string;
    name?: string | null;
    photoUrl?: string | null;
    email?: string | null;
}

interface TimelineEvent {
    type: string;
    title: string;
    detail?: string | null;
    timestamp: string | Date;
    metadata?: Record<string, any>;
}

interface LeadJourney {
    _id: string;
    userId: string;
    userInfo: UserInfo;
    signupAt: string | Date;
    isOnline: boolean;
    lastActiveAt: string | Date;
    lastAction: string;
    firstProfileViewed?: {
        professionalId: string;
        username: string;
        name?: string | null;
        viewedAt: string | Date;
    } | null;
    profilesVisited: Array<{
        professionalId: string;
        username: string;
        name?: string | null;
        viewedAt: string | Date;
        count: number;
    }>;
    profilesVisitedCount: number;
    hasScrolledExplore: boolean;
    exploreScrollCount: number;
    photoGalleryActions: Array<{
        professionalId: string;
        username: string;
        photoIndex: number;
        totalPhotos: number;
        action: string;
        timestamp: string | Date;
    }>;
    hasNavigatedPastFirstPhoto: boolean;
    messageButtonClicks: Array<{
        professionalId: string;
        username: string;
        timestamp: string | Date;
    }>;
    rechargeTriggers: Array<{
        professionalId: string;
        username?: string | null;
        reason?: string | null;
        timestamp: string | Date;
    }>;
    timeline: TimelineEvent[];
}

interface CampaignData {
    _id: string;
    name: string;
    slug: string;
    entryPoint: string;
    description?: string | null;
    status: 'draft' | 'tracking' | 'completed' | 'active' | 'paused' | 'archived';
    startedAt?: string | Date | null;
    endedAt?: string | Date | null;
    uniqueVisits: number;
    signups: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversionRate: number;
    createdAt?: string | Date;
}

interface ActiveCampaignData extends CampaignData {
    leads: LeadJourney[];
    signupsCount: number;
}

export default function CampaignsPage() {
    const [activeCampaign, setActiveCampaign] = useState<ActiveCampaignData | null>(null);
    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
    const [loading, setLoading] = useState(true);
    const [pollingActive, setPollingActive] = useState(true);
    const [lastPollTime, setLastPollTime] = useState<Date>(new Date());

    // Modais
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
    const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<LeadJourney | null>(null);
    const [inspectCampaignData, setInspectCampaignData] = useState<{ campaign: CampaignData; leads: LeadJourney[] } | null>(null);
    const [campaignToDelete, setCampaignToDelete] = useState<CampaignData | null>(null);
    const [campaignToEdit, setCampaignToEdit] = useState<CampaignData | null>(null);

    // Formulários
    const [createForm, setCreateForm] = useState({
        name: '',
        entryPoint: '/descubra',
        description: '',
    });
    const [editForm, setEditForm] = useState({
        name: '',
        entryPoint: '/descubra',
        description: '',
        externalImpressions: '',
        externalClicks: '',
        status: 'completed',
    });
    const [stopForm, setStopForm] = useState({
        externalImpressions: '',
        externalClicks: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Destaque de novos itens na lista de leads (animação incremental)
    const prevLeadIdsRef = useRef<Set<string>>(new Set());
    const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());

    const fetchCampaigns = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await fetch('/api/admin/campaigns');
            if (!res.ok) throw new Error('Erro ao carregar dados');
            const data = await res.json();

            if (data.activeCampaign) {
                const currentLeads: LeadJourney[] = data.activeCampaign.leads || [];
                const currentIds = new Set(currentLeads.map(l => l._id));

                if (prevLeadIdsRef.current.size > 0) {
                    const newlyAdded = new Set<string>();
                    currentIds.forEach(id => {
                        if (!prevLeadIdsRef.current.has(id)) {
                            newlyAdded.add(id);
                        }
                    });
                    if (newlyAdded.size > 0) {
                        setNewLeadIds(newlyAdded);
                        // Limpa o destaque após 4 segundos
                        setTimeout(() => setNewLeadIds(new Set()), 4000);
                    }
                }
                prevLeadIdsRef.current = currentIds;
                setActiveCampaign(data.activeCampaign);
            } else {
                setActiveCampaign(null);
                prevLeadIdsRef.current.clear();
            }

            setCampaigns(data.campaigns || []);
            setLastPollTime(new Date());
        } catch (err) {
            console.error('Erro na sincronização de campanhas:', err);
            if (!isBackground) toast.error('Falha ao carregar campanhas');
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Carga inicial
    useEffect(() => {
        fetchCampaigns(false);
    }, []);

    // Polling contínuo para atualizações em tempo real (a cada 3.5 segundos quando há campanha ativa ou tela aberta)
    useEffect(() => {
        if (!pollingActive) return;
        const interval = setInterval(() => {
            fetchCampaigns(true);
        }, 3500);
        return () => clearInterval(interval);
    }, [pollingActive]);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name.trim()) {
            toast.error('Informe o nome da campanha');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao criar');

            toast.success('Campanha criada com sucesso!');
            setIsCreateModalOpen(false);
            setCreateForm({ name: '', entryPoint: '/descubra', description: '' });
            await fetchCampaigns(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar campanha');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartTracking = async (campaignId: string) => {
        if (!confirm('Iniciar o rastreamento ao vivo para esta campanha agora?')) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: campaignId, action: 'start_tracking' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao iniciar rastreamento');

            toast.success('Rastreamento ao vivo iniciado!');
            await fetchCampaigns(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao iniciar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStopTrackingConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCampaign) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: activeCampaign._id,
                    action: 'stop_tracking',
                    externalImpressions: Number(stopForm.externalImpressions) || 0,
                    externalClicks: Number(stopForm.externalClicks) || 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao encerrar rastreamento');

            toast.success('Rastreamento encerrado e métricas salvas!');
            setIsStopModalOpen(false);
            setStopForm({ externalImpressions: '', externalClicks: '' });
            await fetchCampaigns(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao finalizar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/campaigns?id=${campaignToDelete._id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

            toast.success('Campanha excluída com sucesso!');
            setCampaignToDelete(null);
            await fetchCampaigns(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEditModal = (c: CampaignData) => {
        setCampaignToEdit(c);
        setEditForm({
            name: c.name || '',
            entryPoint: c.entryPoint || '/descubra',
            description: c.description || '',
            externalImpressions: c.impressions ? String(c.impressions) : '',
            externalClicks: c.clicks ? String(c.clicks) : '',
            status: c.status || 'completed',
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEditCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignToEdit) return;
        if (!editForm.name.trim()) {
            toast.error('O nome da campanha é obrigatório');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: campaignToEdit._id,
                    action: 'edit',
                    name: editForm.name,
                    entryPoint: editForm.entryPoint,
                    description: editForm.description,
                    externalImpressions: Number(editForm.externalImpressions) || 0,
                    externalClicks: Number(editForm.externalClicks) || 0,
                    status: editForm.status,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações');

            toast.success('Campanha atualizada com sucesso!');
            setIsEditModalOpen(false);
            setCampaignToEdit(null);
            await fetchCampaigns(false);

            if (inspectCampaignData && inspectCampaignData.campaign._id === campaignToEdit._id) {
                await handleOpenInspectCampaign(campaignToEdit._id);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenInspectCampaign = async (campaignId: string) => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/campaigns?campaignId=${campaignId}`);
            if (!res.ok) throw new Error('Erro ao carregar detalhes');
            const data = await res.json();
            setInspectCampaignData(data);
            setIsInspectModalOpen(true);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao inspecionar campanha');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm('Deseja realmente remover este lead desta campanha?')) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/campaigns?leadId=${leadId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao remover lead');

            toast.success('Lead removido da campanha');
            setSelectedLeadForDetails(null);
            await fetchCampaigns(false);
            if (inspectCampaignData) {
                await handleOpenInspectCampaign(inspectCampaignData.campaign._id);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remover lead');
        } finally {
            setSubmitting(false);
        }
    };

    const getUserDisplayName = (lead: LeadJourney) => {
        const name = lead.userInfo?.name?.trim();
        const username = lead.userInfo?.username?.trim();
        if (name && name.toLowerCase() !== 'usuario') return name;
        if (username && username.toLowerCase() !== 'usuario') return `@${username}`;
        return 'Novo Usuário';
    };

    const getUserInitials = (lead: LeadJourney) => {
        const name = lead.userInfo?.name?.trim();
        const username = lead.userInfo?.username?.trim();
        const raw = (name && name.toLowerCase() !== 'usuario' ? name : (username && username.toLowerCase() !== 'usuario' ? username : 'U'));
        const parts = raw.replace(/^@/, '').split(' ').filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return raw.replace(/^@/, '').slice(0, 2).toUpperCase();
    };

    const formatTimestamp = (dateVal?: string | Date | null) => {
        if (!dateVal) return '--';
        const d = new Date(dateVal);
        return d.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatTimeOnly = (dateVal?: string | Date | null) => {
        if (!dateVal) return '--';
        const d = new Date(dateVal);
        return d.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const calculateDuration = (start?: string | Date | null, end?: string | Date | null) => {
        if (!start) return '--';
        const s = new Date(start).getTime();
        const e = end ? new Date(end).getTime() : Date.now();
        const diffMinutes = Math.max(0, Math.floor((e - s) / (1000 * 60)));
        if (diffMinutes < 60) return `${diffMinutes} min`;
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Topbar / Header da Página */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                                    <Megaphone size={22} className="stroke-[2.2]" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                                        Campanhas & Ponto de Entrada
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                        Rastreamento temporal de tráfego, acessos únicos e jornada detalhada de novos cadastros.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                                onClick={() => fetchCampaigns(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                                title="Atualizar dados manualmente"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Atualizar</span>
                            </button>

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition cursor-pointer"
                            >
                                <Plus size={16} className="stroke-[2.5]" />
                                Nova Campanha
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {/* ══════════════════════════════════════════════════════════════════════
                    PAINEL AO VIVO DA CAMPANHA ATIVA EM RASTREAMENTO
                ══════════════════════════════════════════════════════════════════════ */}
                {activeCampaign ? (
                    <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-xl shadow-purple-900/5 overflow-hidden transition-all">
                        {/* Faixa Superior de Status Ao Vivo */}
                        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-md">
                                            Rastreamento Ao Vivo
                                        </span>
                                        <span className="text-xs text-purple-100 font-medium">
                                            Em andamento há {calculateDuration(activeCampaign.startedAt)}
                                        </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                                        {activeCampaign.name}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenEditModal(activeCampaign)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer border border-white/20"
                                    title="Editar Dados da Campanha"
                                >
                                    <Pencil size={14} />
                                    Editar
                                </button>

                                <button
                                    onClick={() => {
                                        setStopForm({ externalImpressions: '', externalClicks: '' });
                                        setIsStopModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition cursor-pointer"
                                >
                                    <Square size={14} className="fill-white" />
                                    Encerrar Rastreamento
                                </button>
                            </div>
                        </div>

                        {/* Detalhes do Ponto de Entrada e Descrição */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                    <Compass size={15} className="text-purple-600" />
                                    <span>Ponto de Entrada:</span>
                                    <code className="text-purple-700 font-mono font-bold">{activeCampaign.entryPoint}</code>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                    <Clock size={15} className="text-slate-500" />
                                    <span>Iniciada em:</span>
                                    <strong className="text-slate-800">{formatTimestamp(activeCampaign.startedAt)}</strong>
                                </div>
                            </div>

                            {activeCampaign.description && (
                                <div className="text-xs bg-purple-50 text-purple-800 px-3 py-1.5 rounded-xl border border-purple-100 max-w-xl truncate">
                                    <span className="font-bold mr-1">Anotações:</span>
                                    {activeCampaign.description}
                                </div>
                            )}
                        </div>

                        {/* Grade de Contadores / Métricas da Campanha Ativa */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                            {/* Card Contador Gigante de Acessos Únicos na Landing Page */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Acessos Únicos no Ponto de Entrada
                                    </span>
                                    <div className="p-2 bg-white/10 rounded-xl">
                                        <MousePointer size={18} className="text-emerald-400" />
                                    </div>
                                </div>
                                <div className="my-4">
                                    <div className="text-5xl sm:text-6xl font-black tracking-tight text-white">
                                        {activeCampaign.uniqueVisits.toLocaleString('pt-BR')}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                        Visitantes únicos que acessaram <span className="text-purple-300 font-mono">{activeCampaign.entryPoint}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg self-start">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Atualizando a cada 3.5s
                                </div>
                            </div>

                            {/* Card Cadastros Realizados */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Novos Usuários Cadastrados
                                    </span>
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                        <Users size={18} />
                                    </div>
                                </div>
                                <div className="my-4">
                                    <div className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">
                                        {activeCampaign.signupsCount.toLocaleString('pt-BR')}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Usuários que concluíram o cadastro durante este rastreamento
                                    </p>
                                </div>
                                <div className="text-xs font-bold text-slate-600">
                                    Taxa de Cadastro:{' '}
                                    <span className="text-purple-600">
                                        {activeCampaign.uniqueVisits > 0
                                            ? `${((activeCampaign.signupsCount / activeCampaign.uniqueVisits) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Resumo de Engajamento e Trajetos */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Engajamento dos Leads
                                    </span>
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                                        <TrendingUp size={18} />
                                    </div>
                                </div>
                                <div className="space-y-2.5 my-3 text-xs">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-600 font-medium">Scrollaram o Explorar:</span>
                                        <strong className="text-slate-900 font-bold">
                                            {activeCampaign.leads.filter(l => l.hasScrolledExplore).length}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-600 font-medium">Visualizaram Perfis:</span>
                                        <strong className="text-slate-900 font-bold">
                                            {activeCampaign.leads.filter(l => l.profilesVisitedCount > 0).length}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-600 font-medium">Folhearam Fotos da Galeria:</span>
                                        <strong className="text-slate-900 font-bold">
                                            {activeCampaign.leads.filter(l => l.hasNavigatedPastFirstPhoto).length}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-slate-600 font-medium">Acionaram Gatilho de Recarga:</span>
                                        <strong className="text-purple-700 font-bold">
                                            {activeCampaign.leads.filter(l => (l.rechargeTriggers?.length || 0) > 0).length}
                                        </strong>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium">
                                    Métricas calculadas sobre {activeCampaign.signupsCount} cadastros
                                </div>
                            </div>
                        </div>

                        {/* ──────────────────────────────────────────────────────────
                            LISTA INCREMENTAL AO VIVO DE USUÁRIOS CADASTRADOS
                        ────────────────────────────────────────────────────────── */}
                        <div className="p-6 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                                        <Users size={18} className="text-purple-600" />
                                        Leads Cadastrados em Tempo Real ({activeCampaign.leads.length})
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Apenas usuários que se cadastraram durante a campanha. Clique em qualquer lead para ver o trajeto detalhado.
                                    </p>
                                </div>
                            </div>

                            {activeCampaign.leads.length === 0 ? (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                    <Users size={32} className="mx-auto text-slate-400 mb-2 opacity-60" />
                                    <p className="text-sm font-bold text-slate-700">Nenhum cadastro registrado ainda nesta campanha</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Assim que um visitante acessar <code className="font-mono text-purple-600">{activeCampaign.entryPoint}</code> e criar conta, ele aparecerá aqui com animação em tempo real.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeCampaign.leads.map((lead) => {
                                        const isNew = newLeadIds.has(lead._id);
                                        return (
                                            <div
                                                key={lead._id}
                                                onClick={() => setSelectedLeadForDetails(lead)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                                    isNew
                                                        ? 'bg-purple-50/90 border-purple-400 shadow-md ring-2 ring-purple-400/50 animate-pulse'
                                                        : 'bg-white hover:bg-purple-50/40 border-slate-200 hover:border-purple-200 shadow-xs'
                                                }`}
                                            >
                                                {/* Info do Usuário */}
                                                <div className="flex items-center gap-3.5 min-w-[240px]">
                                                    <div className="relative">
                                                        <div className="w-11 h-11 rounded-full bg-purple-50 border border-purple-200 overflow-hidden flex items-center justify-center font-black text-purple-700 text-xs">
                                                            {lead.userInfo.photoUrl ? (
                                                                <img
                                                                    src={lead.userInfo.photoUrl}
                                                                    alt={getUserDisplayName(lead)}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                getUserInitials(lead)
                                                            )}
                                                        </div>
                                                        {lead.isOnline ? (
                                                            <span
                                                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"
                                                                title="Online agora"
                                                            />
                                                        ) : (
                                                            <span
                                                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-400 border-2 border-white rounded-full"
                                                                title="Offline"
                                                            />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-900 leading-tight">
                                                                {getUserDisplayName(lead)}
                                                            </span>
                                                            {lead.isOnline ? (
                                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                                    Online
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                                    Saiu da página
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                            {lead.userInfo.username && lead.userInfo.username.toLowerCase() !== 'usuario' && (
                                                                <span className="text-purple-600 font-semibold">@{lead.userInfo.username} •</span>
                                                            )}
                                                            <span>
                                                                Cadastro:{' '}
                                                                <strong className="text-slate-700 font-semibold">
                                                                    {formatTimestamp(lead.signupAt)}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Última Ação do Lead */}
                                                <div className="flex-1 max-w-md">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                                        Última Ação
                                                    </span>
                                                    <div className="text-xs font-semibold text-slate-800 truncate bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                                                        {lead.lastAction || 'Navegando no aplicativo'}
                                                    </div>
                                                </div>

                                                {/* Resumo do Trajeto (Chips) */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 border ${
                                                            lead.profilesVisitedCount > 0
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                                        }`}
                                                        title="Perfis visitados"
                                                    >
                                                        <Compass size={13} />
                                                        {lead.profilesVisitedCount} perfis
                                                    </span>

                                                    <span
                                                        className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 border ${
                                                            lead.hasScrolledExplore
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                                        }`}
                                                        title="Scrollou Explorar"
                                                    >
                                                        Scroll: {lead.hasScrolledExplore ? 'Sim' : 'Não'}
                                                    </span>

                                                    <span
                                                        className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 border ${
                                                            lead.hasNavigatedPastFirstPhoto
                                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                                        }`}
                                                        title="Fotos visualizadas"
                                                    >
                                                        <ImageIcon size={13} />
                                                        {lead.hasNavigatedPastFirstPhoto ? 'Passou fotos' : '1ª foto'}
                                                    </span>

                                                    {(lead.rechargeTriggers?.length || 0) > 0 && (
                                                        <span
                                                            className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200"
                                                            title="Gatilho de recarga acionado"
                                                        >
                                                            <CreditCard size={13} />
                                                            Recarga ({lead.rechargeTriggers.length})
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition ml-1"
                                                    >
                                                        Ver Trajeto
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Nenhuma campanha em andamento */
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs">
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                            <Play size={28} className="translate-x-0.5 fill-purple-600" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-slate-900">
                            Nenhuma Campanha Sendo Rastreada no Momento
                        </h2>
                        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1 mb-6">
                            Inicie o rastreamento temporal em uma campanha para começar a capturar os acessos únicos no ponto de entrada e monitorar novos cadastros ao vivo.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
                        >
                            <Plus size={16} className="stroke-[2.5]" />
                            Cadastrar Nova Campanha
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════
                    HISTÓRICO DE CAMPANHAS ANTERIORES E RASCUNHOS
                ══════════════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-900">
                                Histórico de Campanhas ({campaigns.length})
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Todas as campanhas criadas, métricas consolidadas de tráfego e registros de leads.
                            </p>
                        </div>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm">
                            Nenhuma campanha cadastrada até o momento.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="py-3.5 px-4">Campanha</th>
                                        <th className="py-3.5 px-4">Ponto de Entrada</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-4 text-right">Impressões</th>
                                        <th className="py-3.5 px-4 text-right">Cliques (CTR)</th>
                                        <th className="py-3.5 px-4 text-right">Acessos Únicos</th>
                                        <th className="py-3.5 px-4 text-right">Cadastros</th>
                                        <th className="py-3.5 px-4 text-right">Conversão</th>
                                        <th className="py-3.5 px-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {campaigns.map((c) => {
                                        const isCurrent = activeCampaign?._id === c._id;
                                        return (
                                            <tr key={c._id} className="hover:bg-slate-50/70 transition">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                                                    {c.description && (
                                                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                                            {c.description}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        Criada em {formatTimestamp(c.createdAt)}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <code className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-mono font-bold text-xs border border-purple-100">
                                                        {c.entryPoint || '/descubra'}
                                                    </code>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {c.status === 'tracking' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Ao Vivo
                                                        </span>
                                                    ) : c.status === 'completed' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            Encerrada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            Rascunho
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                                                    {c.impressions ? c.impressions.toLocaleString('pt-BR') : '--'}
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="font-bold text-slate-900">
                                                        {c.clicks ? c.clicks.toLocaleString('pt-BR') : '--'}
                                                    </div>
                                                    {c.impressions > 0 && (
                                                        <div className="text-[10px] text-slate-500 font-medium">
                                                            CTR: {c.ctr}%
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                                                    {c.uniqueVisits.toLocaleString('pt-BR')}
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-black text-purple-700 text-sm">
                                                    {c.signups.toLocaleString('pt-BR')}
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                                                    {c.conversionRate}%
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {c.status !== 'tracking' && (
                                                            <button
                                                                onClick={() => handleStartTracking(c._id)}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                                                title="Iniciar Rastreamento"
                                                            >
                                                                <Play size={16} />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleOpenInspectCampaign(c._id)}
                                                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                                            title="Ver Leads & Trajetos"
                                                        >
                                                            <Eye size={16} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleOpenEditModal(c)}
                                                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                                            title="Editar Dados da Campanha"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>

                                                        <button
                                                            onClick={() => setCampaignToDelete(c)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                            title="Excluir Campanha"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE CRIAÇÃO DE NOVA CAMPANHA
            ══════════════════════════════════════════════════════════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                                <Plus size={20} className="text-purple-600" />
                                Nova Campanha de Tráfego
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Nome da Campanha <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Exoclick - Banner 300x250 Mulheres BR"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Ponto de Entrada (Landing Page) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        placeholder="/descubra"
                                        value={createForm.entryPoint}
                                        onChange={(e) => setCreateForm({ ...createForm, entryPoint: e.target.value })}
                                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono"
                                    />
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Rota da landing page que os visitantes acessam ao clicar no anúncio (padrão: <code className="text-purple-600">/descubra</code>).
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Descrição & Criativo (Opcional)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Escreva informações sobre o anúncio: qual criativo ou banner foi usado no Exoclick, segmentação, dispositivo..."
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? 'Salvando...' : 'Cadastrar Campanha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE ENCERRAMENTO DE RASTREAMENTO (MÉTRICAS DO TRÁFEGO PAGO)
            ══════════════════════════════════════════════════════════════════════ */}
            {isStopModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                                <Square size={18} className="text-rose-500 fill-rose-500" />
                                Encerrar Rastreamento da Campanha
                            </h3>
                            <button
                                onClick={() => setIsStopModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 mb-4">
                            Ao finalizar o rastreamento, registre as métricas registradas na sua plataforma de tráfego pago (Exoclick) para consolidação do resultado.
                        </p>

                        <form onSubmit={handleStopTrackingConfirm} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Total de Impressões no Tráfego Pago
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Ex: 50000"
                                    value={stopForm.externalImpressions}
                                    onChange={(e) => setStopForm({ ...stopForm, externalImpressions: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Total de Cliques no Tráfego Pago
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Ex: 1200"
                                    value={stopForm.externalClicks}
                                    onChange={(e) => setStopForm({ ...stopForm, externalClicks: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsStopModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? 'Finalizando...' : 'Encerrar e Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE TRAJETO DETALHADO DO USUÁRIO
            ══════════════════════════════════════════════════════════════════════ */}
            {selectedLeadForDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
                        {/* Header do Lead */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="relative">
                                    <div className="w-13 h-13 rounded-full bg-purple-100 text-purple-800 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center font-black text-sm">
                                        {selectedLeadForDetails.userInfo.photoUrl ? (
                                            <img
                                                src={selectedLeadForDetails.userInfo.photoUrl}
                                                alt={getUserDisplayName(selectedLeadForDetails)}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            getUserInitials(selectedLeadForDetails)
                                        )}
                                    </div>
                                    {selectedLeadForDetails.isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-slate-900 leading-tight">
                                            {getUserDisplayName(selectedLeadForDetails)}
                                        </h3>
                                        {selectedLeadForDetails.isOnline ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                Online agora
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                Saiu da página
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {selectedLeadForDetails.userInfo.username && selectedLeadForDetails.userInfo.username.toLowerCase() !== 'usuario' && (
                                            <span className="text-purple-600 font-semibold">@{selectedLeadForDetails.userInfo.username} • </span>
                                        )}
                                        Cadastrado em{' '}
                                        <strong className="text-slate-700 font-semibold">
                                            {formatTimestamp(selectedLeadForDetails.signupAt)}
                                        </strong>
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedLeadForDetails(null)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Conteúdo com Scroll */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Resumo Rápido em Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">1º Perfil Visitado</span>
                                    <div className="font-bold text-slate-900 truncate">
                                        {selectedLeadForDetails.firstProfileViewed ? (
                                            `@${selectedLeadForDetails.firstProfileViewed.username}`
                                        ) : (
                                            <span className="text-slate-400 font-normal">Nenhum</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">Scrollou o Explorar?</span>
                                    <div className="font-bold text-slate-900">
                                        {selectedLeadForDetails.hasScrolledExplore ? (
                                            <span className="text-blue-600">Sim ({selectedLeadForDetails.exploreScrollCount}x)</span>
                                        ) : (
                                            <span className="text-slate-400 font-normal">Não</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">Fotos da Galeria</span>
                                    <div className="font-bold text-slate-900">
                                        {selectedLeadForDetails.hasNavigatedPastFirstPhoto ? (
                                            <span className="text-indigo-600">Passou entre fotos</span>
                                        ) : (
                                            <span className="text-slate-500 font-normal">Ficou só na 1ª foto</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">Total Perfis Visitados</span>
                                    <div className="font-bold text-purple-700 text-sm">
                                        {selectedLeadForDetails.profilesVisitedCount} perfis
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">Cliques em Mensagem</span>
                                    <div className="font-bold text-slate-900 text-sm">
                                        {selectedLeadForDetails.messageButtonClicks?.length || 0} cliques
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-slate-400 font-bold block mb-1">Gatilhos de Recarga</span>
                                    <div className="font-bold text-amber-700 text-sm">
                                        {selectedLeadForDetails.rechargeTriggers?.length || 0} tentativas
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Perfis Navegados */}
                            {selectedLeadForDetails.profilesVisited?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Perfis que visitou ({selectedLeadForDetails.profilesVisited.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLeadForDetails.profilesVisited.map((p, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold"
                                            >
                                                <span>@{p.username}</span>
                                                {p.count > 1 && (
                                                    <span className="bg-purple-200 text-purple-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                                        {p.count}x
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline Completa das Ações do Usuário */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Linha do Tempo Cronológica do Trajeto
                                </h4>

                                {(!selectedLeadForDetails.timeline || selectedLeadForDetails.timeline.length === 0) ? (
                                    <p className="text-xs text-slate-400">Nenhum evento adicional registrado.</p>
                                ) : (
                                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
                                        {selectedLeadForDetails.timeline.map((evt, idx) => {
                                            const isSignup = evt.type === 'signup';
                                            const isRecharge = evt.type === 'recharge_modal';
                                            const isMessage = evt.type === 'message_click';
                                            const isProfile = evt.type === 'profile_view';

                                            return (
                                                <div key={idx} className="relative pl-6">
                                                    {/* Marcador na Timeline */}
                                                    <div
                                                        className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                                                            isSignup
                                                                ? 'bg-emerald-500'
                                                                : isRecharge
                                                                ? 'bg-amber-500'
                                                                : isMessage
                                                                ? 'bg-purple-600'
                                                                : isProfile
                                                                ? 'bg-blue-500'
                                                                : 'bg-slate-400'
                                                        }`}
                                                    />

                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <strong className="text-xs text-slate-900 font-bold">
                                                                {evt.title}
                                                            </strong>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {formatTimeOnly(evt.timestamp)}
                                                            </span>
                                                        </div>
                                                        {evt.detail && (
                                                            <p className="text-xs text-slate-600 mt-1 font-medium">
                                                                {evt.detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <button
                                onClick={() => handleDeleteLead(selectedLeadForDetails._id)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                Remover Lead Desta Campanha
                            </button>
                            <button
                                onClick={() => setSelectedLeadForDetails(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE INSPEÇÃO DE CAMPANHA DO HISTÓRICO
            ══════════════════════════════════════════════════════════════════════ */}
            {isInspectModalOpen && inspectCampaignData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {inspectCampaignData.campaign.name}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Ponto de entrada: <code className="text-purple-600 font-mono font-bold">{inspectCampaignData.campaign.entryPoint}</code> • {inspectCampaignData.leads.length} cadastros gerados
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenEditModal(inspectCampaignData.campaign)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                                >
                                    <Pencil size={13} />
                                    Editar Dados
                                </button>
                                <button
                                    onClick={() => setIsInspectModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 p-2 rounded-xl cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {inspectCampaignData.leads.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-8">
                                    Nenhum cadastro vinculado registrado nesta campanha.
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {inspectCampaignData.leads.map((lead) => (
                                        <div
                                            key={lead._id}
                                            onClick={() => {
                                                setSelectedLeadForDetails(lead);
                                            }}
                                            className="p-3.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-800 border border-purple-200 overflow-hidden flex items-center justify-center font-bold text-xs">
                                                    {lead.userInfo.photoUrl ? (
                                                        <img src={lead.userInfo.photoUrl} alt={getUserDisplayName(lead)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getUserInitials(lead)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">
                                                        {getUserDisplayName(lead)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {lead.userInfo.username && lead.userInfo.username.toLowerCase() !== 'usuario' && (
                                                            <span>@{lead.userInfo.username} • </span>
                                                        )}
                                                        {formatTimestamp(lead.signupAt)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-600 truncate max-w-sm">
                                                {lead.lastAction || 'Cadastro concluído'}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                                                    {lead.profilesVisitedCount} perfis
                                                </span>
                                                <ChevronRight size={14} className="text-slate-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setIsInspectModalOpen(false)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CAMPANHA
            ══════════════════════════════════════════════════════════════════════ */}
            {campaignToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                            <Trash2 size={24} />
                        </div>

                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                            Excluir Campanha?
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
                            Você tem certeza que deseja excluir a campanha{' '}
                            <strong className="text-slate-800">{campaignToDelete.name}</strong>?
                            Todos os dados de visitas, leads e trajetos associados serão permanentemente removidos.
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setCampaignToDelete(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteCampaign}
                                disabled={submitting}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? 'Excluindo...' : 'Sim, Excluir Campanha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MODAL DE EDIÇÃO DE CAMPANHA (DISPONÍVEL INCLUSIVE DEPOIS DE ENCERRAR)
            ══════════════════════════════════════════════════════════════════════ */}
            {isEditModalOpen && campaignToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                                <Pencil size={18} className="text-purple-600" />
                                Editar Campanha
                            </h3>
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setCampaignToEdit(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditCampaign} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Nome da Campanha <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Ponto de Entrada (Landing Page) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.entryPoint}
                                    onChange={(e) => setEditForm({ ...editForm, entryPoint: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Descrição & Criativo
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Anotações sobre banner, criativo, segmentação no Exoclick..."
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Total de Impressões
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={editForm.externalImpressions}
                                        onChange={(e) => setEditForm({ ...editForm, externalImpressions: e.target.value })}
                                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Total de Cliques
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={editForm.externalClicks}
                                        onChange={(e) => setEditForm({ ...editForm, externalClicks: e.target.value })}
                                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Status da Campanha
                                </label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white"
                                >
                                    <option value="draft">Rascunho (Não iniciada)</option>
                                    <option value="tracking">Rastreamento ao Vivo (Ativa)</option>
                                    <option value="completed">Encerrada / Concluída</option>
                                </select>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setCampaignToEdit(null);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

