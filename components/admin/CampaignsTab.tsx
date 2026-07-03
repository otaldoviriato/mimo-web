'use client';

import React, { useState, useEffect } from 'react';
import {
    Coins,
    Users,
    TrendingUp,
    ShieldAlert,
    Search,
    SlidersHorizontal,
    X,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    AlertTriangle,
    Eye,
    ShieldCheck,
    Save,
    RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

export function CampaignsTab() {
    // Estados da Campanha
    const [campaign, setCampaign] = useState<any>(null);
    const [loadingCampaign, setLoadingCampaign] = useState(true);
    const [savingCampaign, setSavingCampaign] = useState(false);

    // Campos de edição da campanha
    const [name, setName] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [amount, setAmount] = useState<number>(500); // R$ 5,00 padrão
    const [amountInput, setAmountInput] = useState('5.00');
    const [validityHours, setValidityHours] = useState<number>(72);
    const [limitByCpf, setLimitByCpf] = useState(true);
    const [limitByEmail, setLimitByEmail] = useState(true);
    const [limitByPhone, setLimitByPhone] = useState(true);
    const [limitByIp, setLimitByIp] = useState(true);
    const [appMessageTitle, setAppMessageTitle] = useState('');
    const [appMessageDescription, setAppMessageDescription] = useState('');
    const [balanceLabel, setBalanceLabel] = useState('');

    // Estados de Métricas
    const [metrics, setMetrics] = useState<any>({
        totalGrantsCount: 0,
        totalGrantedAmount: 0,
        totalConsumedAmount: 0,
        totalExpiredAmount: 0,
        activeUsersCount: 0,
        conversionRate: 0,
        fraudBlockedCount: 0,
    });
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    // Estados da Tabela de Auditoria
    const [grants, setGrants] = useState<any[]>([]);
    const [loadingGrants, setLoadingGrants] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Estados da Gaveta de Detalhes (Drawer)
    const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
    const [grantDetail, setGrantDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Inicialização
    useEffect(() => {
        fetchCampaignData();
    }, []);

    useEffect(() => {
        if (campaign) {
            fetchMetrics(campaign._id);
            fetchGrants(campaign._id);
        }
    }, [campaign]);

    const fetchCampaignData = async () => {
        setLoadingCampaign(true);
        try {
            const res = await fetch('/api/admin/campaigns');
            const data = await res.json();
            if (data.campaigns && data.campaigns.length > 0) {
                const c = data.campaigns.find((item: any) => item.type === 'welcome_credit') || data.campaigns[0];
                setCampaign(c);
                setName(c.name);
                setEnabled(c.enabled);
                setAmount(c.amount);
                setAmountInput((c.amount / 100).toFixed(2));
                setValidityHours(c.validityHours || 72);
                setLimitByCpf(c.limitByCpf);
                setLimitByEmail(c.limitByEmail);
                setLimitByPhone(c.limitByPhone);
                setLimitByIp(c.limitByIp);
                setAppMessageTitle(c.appMessageTitle || 'Você recebeu créditos de boas-vindas!');
                setAppMessageDescription(c.appMessageDescription || '');
                setBalanceLabel(c.balanceLabel || 'Crédito de boas-vindas');
            } else {
                toast.error('Nenhuma campanha configurada.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Falha ao carregar configurações da campanha.');
        } finally {
            setLoadingCampaign(false);
        }
    };

    const fetchMetrics = async (campaignId: string) => {
        setLoadingMetrics(true);
        try {
            const res = await fetch(`/api/admin/campaigns/metrics?campaignId=${campaignId}`);
            const data = await res.json();
            if (data.metrics) {
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMetrics(false);
        }
    };

    const fetchGrants = async (campaignId: string, search = searchQuery, status = statusFilter) => {
        setLoadingGrants(true);
        try {
            let url = `/api/admin/campaigns/grants?campaignId=${campaignId}`;
            if (status) url += `&status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.grants) {
                setGrants(data.grants);
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar auditoria.');
        } finally {
            setLoadingGrants(false);
        }
    };

    const handleSaveCampaign = async () => {
        if (!campaign) return;
        setSavingCampaign(true);
        try {
            const res = await fetch(`/api/admin/campaigns/${campaign._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    enabled,
                    amount: Number(amount),
                    validityHours: Number(validityHours),
                    limitByCpf,
                    limitByEmail,
                    limitByPhone,
                    limitByIp,
                    appMessageTitle,
                    appMessageDescription,
                    balanceLabel,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Configuração da campanha salva com sucesso!');
                setCampaign(data.campaign);
                setAmountInput((data.campaign.amount / 100).toFixed(2));
            } else {
                toast.error(data.error || 'Erro ao salvar configuração.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro de conexão ao salvar.');
        } finally {
            setSavingCampaign(false);
        }
    };

    const handleOpenDetail = async (grantId: string) => {
        setSelectedGrantId(grantId);
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/admin/campaigns/grants/${grantId}/details`);
            const data = await res.json();
            if (data.grant) {
                setGrantDetail(data);
            } else {
                toast.error('Não foi possível carregar os detalhes.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar detalhes.');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (campaign) {
            fetchGrants(campaign._id, searchQuery, statusFilter);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        if (campaign) {
            fetchGrants(campaign._id, '', '');
        }
    };

    if (loadingCampaign) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-500">Carregando Campanhas de Crédito...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. MÓDULO DE CONFIGURAÇÃO DA CAMPANHA */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                <Coins size={20} />
                            </span>
                            <h2 className="text-lg font-bold text-slate-800">Campanha: {name}</h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Concede saldo de boas-vindas automaticamente para novos usuários clientes registrados no Mimo.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {enabled ? 'Campanha Ativa' : 'Campanha Inativa'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Coluna 1: Parâmetros Financeiros */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parâmetros Gerais</h3>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor do Crédito (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                                <input
                                    type="text"
                                    value={amountInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Permite apenas números, ponto e vírgula
                                        const cleanVal = val.replace(/[^0-9.,]/g, '');
                                        setAmountInput(cleanVal);

                                        const normalized = cleanVal.replace(',', '.');
                                        const parsed = parseFloat(normalized);
                                        if (!isNaN(parsed)) {
                                            setAmount(Math.round(parsed * 100));
                                        } else {
                                            setAmount(0);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Formata com 2 casas decimais ao sair
                                        const normalized = amountInput.replace(',', '.');
                                        const parsed = parseFloat(normalized);
                                        if (!isNaN(parsed)) {
                                            setAmountInput(parsed.toFixed(2));
                                            setAmount(Math.round(parsed * 100));
                                        } else {
                                            setAmountInput('0.00');
                                            setAmount(0);
                                        }
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold text-slate-800"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Validade do Crédito (Horas)</label>
                            <input
                                type="number"
                                value={validityHours}
                                onChange={(e) => setValidityHours(Math.max(1, parseInt(e.target.value || '0')))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold text-slate-800"
                                placeholder="72"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">O saldo expira após este prazo caso não seja consumido.</span>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rótulo de Exibição na Carteira</label>
                            <input
                                type="text"
                                value={balanceLabel}
                                onChange={(e) => setBalanceLabel(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold text-slate-800"
                                placeholder="Crédito de boas-vindas"
                            />
                        </div>
                    </div>

                    {/* Coluna 2: Regras de Prevenção a Fraudes */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regras Antifraude (Exclusividade)</h3>
                        
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3.5">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={limitByCpf}
                                    onChange={(e) => setLimitByCpf(e.target.checked)}
                                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Verificar CPF único</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">Impede que o mesmo CPF receba saldo mais de uma vez.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={limitByEmail}
                                    onChange={(e) => setLimitByEmail(e.target.checked)}
                                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Verificar E-mail único</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">Impede contas com o mesmo e-mail de receberem o crédito.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={limitByPhone}
                                    onChange={(e) => setLimitByPhone(e.target.checked)}
                                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Verificar Telefone único</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">Impede duplicações de conta com o mesmo telefone de contato.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={limitByIp}
                                    onChange={(e) => setLimitByIp(e.target.checked)}
                                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Verificar IP único</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">Garante apenas uma concessão de crédito por endereço IP.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Coluna 3: Mensagem do App */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aviso no Aplicativo (Mensagem)</h3>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título do Aviso</label>
                            <input
                                type="text"
                                value={appMessageTitle}
                                onChange={(e) => setAppMessageTitle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold text-slate-800"
                                placeholder="Você recebeu R$ 5,00 em créditos de boas-vindas!"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição/Instruções</label>
                            <textarea
                                value={appMessageDescription}
                                onChange={(e) => setAppMessageDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold text-slate-800"
                                placeholder="Use seus créditos para mandar mensagens e interagir..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5 mt-6">
                    <button
                        onClick={handleSaveCampaign}
                        disabled={savingCampaign}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-purple-600/10"
                    >
                        <Save size={14} />
                        {savingCampaign ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                </div>
            </div>

            {/* 2. CARDS DE KPIs (MÉTRICAS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Concedido */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Concedido</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">
                            {loadingMetrics ? '...' : ((metrics.totalGrantedAmount || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">{metrics.totalGrantsCount} novos usuários receberam</span>
                    </div>
                    <span className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                        <Coins size={22} />
                    </span>
                </div>

                {/* Card 2: Total Consumido */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Consumido</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">
                            {loadingMetrics ? '...' : ((metrics.totalConsumedAmount || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            {metrics.totalGrantedAmount > 0 ? ((metrics.totalConsumedAmount / metrics.totalGrantedAmount) * 100).toFixed(1) : 0}% do valor total distribuído
                        </span>
                    </div>
                    <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <TrendingUp size={22} />
                    </span>
                </div>

                {/* Card 3: Taxa de Conversão */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conversão</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">
                            {loadingMetrics ? '...' : `${metrics.conversionRate || 0}%`}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Usuários que conversaram e gastaram o saldo</span>
                    </div>
                    <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Users size={22} />
                    </span>
                </div>

                {/* Card 4: Fraudes Impedidas */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fraudes Bloqueadas</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">
                            {loadingMetrics ? '...' : metrics.fraudBlockedCount || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Contas duplicadas com IP/CPF barrados</span>
                    </div>
                    <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                        <ShieldAlert size={22} />
                    </span>
                </div>
            </div>

            {/* 3. TABELA DE AUDITORIA E FILTROS */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Auditoria de Concessões</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Audite quais contas receberam crédito promocional, o status e as informações de uso.</p>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3.5">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar por usuário, e-mail..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 w-60 placeholder-slate-400"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-600"
                        >
                            <option value="">Todos os Status</option>
                            <option value="active">Ativo (Com Saldo)</option>
                            <option value="used">Consumido Total</option>
                            <option value="expired">Expirado</option>
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold text-xs rounded-2xl cursor-pointer transition-all shadow-md shadow-slate-800/10"
                        >
                            Filtrar
                        </button>

                        {(searchQuery || statusFilter) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="p-2 hover:bg-slate-100 rounded-2xl text-slate-500 cursor-pointer transition-all"
                                title="Limpar Filtros"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </form>
                </div>

                {/* Lista / Tabela */}
                <div className="overflow-x-auto">
                    {loadingGrants ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
                            <span className="text-xs font-semibold text-slate-400">Carregando concessões...</span>
                        </div>
                    ) : grants.length === 0 ? (
                        <div className="py-20 text-center text-xs font-semibold text-slate-400">
                            Nenhuma concessão de crédito encontrada para os filtros selecionados.
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-left">
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Usuário</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Concedido</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Restante</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Consumido</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Data de Entrada</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Endereço IP</th>
                                    <th className="pb-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Status</th>
                                    <th className="pb-3 text-right text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grants.map((grant) => {
                                    const u = grant.user;
                                    return (
                                        <tr key={grant._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                                                        {u.photoUrl ? (
                                                            <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="text-slate-400" size={14} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-800 leading-tight">{u.name || u.username}</span>
                                                        <span className="block text-[10px] text-slate-400 mt-0.5">@{u.username || 'username'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-xs font-bold text-slate-600">
                                                R$ {(grant.amountGranted / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 text-xs font-bold text-purple-600">
                                                R$ {(grant.amountRemaining / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 text-xs font-semibold text-slate-500">
                                                R$ {(grant.amountUsed / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 text-[11px] font-semibold text-slate-500">
                                                {new Date(grant.createdAt).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-4 text-xs font-mono text-slate-400">
                                                {grant.ipAddress || 'Não registrado'}
                                            </td>
                                            <td className="py-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    grant.status === 'active'
                                                        ? 'bg-purple-50 text-purple-700'
                                                        : grant.status === 'used'
                                                            ? 'bg-slate-100 text-slate-500'
                                                            : grant.status === 'expired'
                                                                ? 'bg-amber-50 text-amber-700'
                                                                : 'bg-rose-50 text-rose-700'
                                                }`}>
                                                    {grant.status === 'active'
                                                        ? 'Ativo'
                                                        : grant.status === 'used'
                                                            ? 'Consumido'
                                                            : grant.status === 'expired'
                                                                ? 'Expirado'
                                                                : 'Cancelado'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button
                                                    onClick={() => handleOpenDetail(grant._id)}
                                                    className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 text-xs font-bold"
                                                    title="Auditar Detalhes"
                                                >
                                                    <Eye size={14} />
                                                    Auditar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 4. GAVETA DE DETALHES (DRAWER LATERAL DE AUDITORIA) */}
            {selectedGrantId && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedGrantId(null)}
                    />
                    
                    <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-100">
                        {/* Header do Drawer */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Auditoria Detalhada</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Analise o ciclo de vida da concessão e segurança da conta.</p>
                            </div>
                            <button
                                onClick={() => setSelectedGrantId(null)}
                                className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo do Drawer */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loadingDetail ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-4 border-slate-100 border-t-purple-500 rounded-full animate-spin"></div>
                                    <span className="text-xs font-semibold text-slate-400">Processando auditoria...</span>
                                </div>
                            ) : grantDetail ? (
                                <>
                                    {/* Resumo do Usuário */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center bg-white">
                                            {grantDetail.user.photoUrl ? (
                                                <img src={grantDetail.user.photoUrl} alt={grantDetail.user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="text-slate-400" size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">{grantDetail.user.name}</h4>
                                            <span className="block text-[11px] text-slate-400">@{grantDetail.user.username} | {grantDetail.user.email}</span>
                                            <span className="block text-[10px] text-slate-400 mt-1">Celular: {grantDetail.user.phone}</span>
                                        </div>
                                    </div>

                                    {/* ALERTAS DE FRAUDE (VERIFICAÇÃO ANTIFRAUDE) */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verificação de Segurança Antifraude</h4>
                                        {grantDetail.isSuspectedFraud ? (
                                            <div className="space-y-2">
                                                {grantDetail.fraudAlerts.map((alert: string, idx: number) => (
                                                    <div key={idx} className="bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3.5 flex items-start gap-2.5">
                                                        <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                                        <div className="text-xs leading-relaxed font-semibold">
                                                            {alert}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 flex items-center gap-2.5">
                                                <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                                                <span className="text-xs font-semibold">Conta Segura: Nenhum indício ou duplicação de dados detectados.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resumo da Carteira da Concessão */}
                                    <div className="grid grid-cols-3 gap-3 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-center">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Concedido</span>
                                            <span className="text-sm font-black text-slate-800 block mt-1">
                                                R$ {(grantDetail.grant.amountGranted / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Consumido</span>
                                            <span className="text-sm font-black text-slate-800 block mt-1">
                                                R$ {(grantDetail.grant.amountUsed / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Restante</span>
                                            <span className="text-sm font-black text-purple-700 block mt-1">
                                                R$ {(grantDetail.grant.amountRemaining / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timeline do Usuário */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Linha do Tempo (Timeline do Crédito)</h4>
                                        <div className="relative border-l-2 border-slate-100 pl-5 ml-2.5 space-y-5">
                                            {grantDetail.timeline.map((event: any, idx: number) => {
                                                const isLast = idx === grantDetail.timeline.length - 1;
                                                return (
                                                    <div key={idx} className="relative">
                                                        {/* Bolinha na linha */}
                                                        <span className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white ${
                                                            event.type === 'user_created'
                                                                ? 'border-slate-300 text-slate-400'
                                                                : event.type === 'credit_granted'
                                                                    ? 'border-purple-600 text-purple-600'
                                                                    : event.type === 'credit_used'
                                                                        ? 'border-indigo-400 text-indigo-400'
                                                                        : event.type === 'credit_expired'
                                                                            ? 'border-amber-500 text-amber-500'
                                                                            : 'border-green-600 text-green-600'
                                                        }`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                        </span>
                                                        
                                                        <div>
                                                            <span className="block text-xs font-bold text-slate-800">{event.title}</span>
                                                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{event.description}</p>
                                                            <span className="block text-[9px] font-bold text-slate-400 mt-1">
                                                                {new Date(event.timestamp).toLocaleString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-xs font-bold text-slate-400">Falha ao obter detalhes.</p>
                            )}
                        </div>

                        {/* Footer do Drawer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedGrantId(null)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-slate-800/10"
                            >
                                Fechar Auditoria
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
