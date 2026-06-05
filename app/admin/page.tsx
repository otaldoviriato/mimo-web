'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActivityChart } from '@/components/admin/ActivityChart';
import { ClientsTable } from '@/components/admin/ClientsTable';
import { ProfessionalsTable } from '@/components/admin/ProfessionalsTable';
import { 
    Users, 
    MessageSquare, 
    MessageCircle, 
    Coins, 
    TrendingUp, 
    Lock,
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Sliders,
    Trash2,
    Plus,
    UserCheck,
    Eye,
    X,
    ShieldAlert,
    AlertTriangle,
    Search,
    Loader2,
    Wallet,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsData {
    platformFeePercentage: number;
    uploadLimitMB: number;
    autoModeration: boolean;
    professionalsOnlyCreateRooms: boolean;
    adminClerkIds: string[];
    comparisonPeriod: 'none' | 'week' | 'month';
    maxPricePerChar: number;
    maxSubscriptionPrice: number;
    subscriberDiscountPercentage: number;
    minPublicPhotos: number;
    maxPublicPhotos: number;
    minExclusivePhotos: number;
    maxExclusivePhotos: number;
}

interface ChatMessage {
    sender: string;
    text: string;
    time: string;
    cost: number;
}

interface ChatRoom {
    id: string;
    userA: { name: string; email: string; clerkId: string };
    userB: { name: string; email: string; clerkId: string };
    messagesCount: number;
    lastMessage: string;
    time: string;
    totalRevenue: number;
    history: ChatMessage[];
}

interface RichAdmin {
    clerkId: string;
    username: string;
    name: string;
    email: string;
    photoUrl: string | null;
}

interface WithdrawRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhotoUrl: string | null;
    amount: number;
    pixKey: string;
    status: 'pendente' | 'concluido' | 'rejeitado';
    createdAt: string;
    updatedAt: string;
}

export default function AdminPage() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('dashboard');

    // Carrega a aba ativa a partir do parâmetro "tab" na URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['dashboard', 'clients', 'professionals', 'rooms', 'financial', 'withdrawals', 'settings'].includes(tabParam)) {
                setActiveTab(tabParam);
            }
        }
    }, []);
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Estados do Formulário de Configurações
    const [platformFee, setPlatformFee] = useState(10);
    const [uploadLimit, setUploadLimit] = useState(50);
    const [autoModeration, setAutoModeration] = useState(true);
    const [professionalsOnly, setProfessionalsOnly] = useState(false);
    const [comparisonPeriod, setComparisonPeriod] = useState<'none' | 'week' | 'month'>('none');
    const [maxPricePerChar, setMaxPricePerChar] = useState(0.2);
    const [maxSubscriptionPrice, setMaxSubscriptionPrice] = useState(200);
    const [subscriberDiscountPercentage, setSubscriberDiscountPercentage] = useState(20);
    const [minPublicPhotos, setMinPublicPhotos] = useState(6);
    const [maxPublicPhotos, setMaxPublicPhotos] = useState(12);
    const [minExclusivePhotos, setMinExclusivePhotos] = useState(2);
    const [maxExclusivePhotos, setMaxExclusivePhotos] = useState(4);
    const [saving, setSaving] = useState(false);

    // Estados de Gerenciamento de Administradores Ricos
    const [adminListRich, setAdminListRich] = useState<RichAdmin[]>([]);
    
    // Estados de Saques Manuais
    const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
    
    // Estados do Autocomplete de Admins
    const [adminSearch, setAdminSearch] = useState('');
    const [adminSearchResults, setAdminSearchResults] = useState<RichAdmin[]>([]);
    const [showAdminDropdown, setShowAdminDropdown] = useState(false);
    const [searchingAdmin, setSearchingAdmin] = useState(false);

    // Estado do Modal de Auditoria de Conversa
    const [selectedAuditChat, setSelectedAuditChat] = useState<ChatRoom | null>(null);

    // Mapeamento de títulos para o Header
    const tabTitles: { [key: string]: string } = {
        dashboard: 'Painel Geral',
        clients: 'Gerenciamento de Clientes',
        professionals: 'Gerenciamento de Profissionais',
        rooms: 'Auditoria de Conversas',
        financial: 'Movimentações Financeiras',
        withdrawals: 'Solicitações de Saque',
        settings: 'Configurações do Sistema',
    };

    // Período comparativo selecionado na Dashboard
    const [selectedPeriod, setSelectedPeriod] = useState<'none' | 'week' | 'month'>('none');

    // Dados reais da dashboard
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    // Salas reais para auditoria
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);

    // Busca as configurações da API e valida autorização
    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setLoadingSettings(false);
            setIsAuthorized(false);
            return;
        }

        async function fetchSettings() {
            try {
                const response = await fetch('/api/admin/settings');
                if (response.ok) {
                    const data = await response.json();
                    const s = data.settings;
                    setSettings(s);
                    setPlatformFee(s.platformFeePercentage);
                    setUploadLimit(s.uploadLimitMB);
                    setAutoModeration(s.autoModeration);
                    setProfessionalsOnly(s.professionalsOnlyCreateRooms);
                    setComparisonPeriod(s.comparisonPeriod || 'none');
                    setSelectedPeriod(s.comparisonPeriod || 'none');
                    setAdminListRich(data.richAdmins || []);
                    setMaxPricePerChar(s.maxPricePerChar !== undefined ? s.maxPricePerChar : 0.2);
                    setMaxSubscriptionPrice(s.maxSubscriptionPrice !== undefined ? s.maxSubscriptionPrice : 200);
                    setSubscriberDiscountPercentage(s.subscriberDiscountPercentage !== undefined ? s.subscriberDiscountPercentage : 20);
                    setMinPublicPhotos(s.minPublicPhotos !== undefined ? s.minPublicPhotos : 6);
                    setMaxPublicPhotos(s.maxPublicPhotos !== undefined ? s.maxPublicPhotos : 12);
                    setMinExclusivePhotos(s.minExclusivePhotos !== undefined ? s.minExclusivePhotos : 2);
                    setMaxExclusivePhotos(s.maxExclusivePhotos !== undefined ? s.maxExclusivePhotos : 4);
                    setIsAuthorized(true);
                } else if (response.status === 403) {
                    setIsAuthorized(false);
                } else {
                    toast.error('Erro ao carregar as configurações do sistema.');
                }
            } catch (error) {
                console.error('Erro ao buscar configurações:', error);
                toast.error('Não foi possível conectar ao servidor.');
            } finally {
                setLoadingSettings(false);
            }
        }

        fetchSettings();
    }, [isLoaded, isSignedIn]);

    // Função para buscar dados do dashboard real
    const fetchDashboard = async (periodParam: string) => {
        setLoadingDashboard(true);
        try {
            const response = await fetch(`/api/admin/dashboard?period=${periodParam}`);
            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
            } else {
                toast.error('Erro ao carregar métricas do dashboard.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar dashboard:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingDashboard(false);
        }
    };

    // Função para buscar conversas reais
    const fetchRooms = async () => {
        setLoadingChats(true);
        try {
            const response = await fetch('/api/admin/rooms');
            if (response.ok) {
                const data = await response.json();
                setChats(data.rooms || []);
            } else {
                toast.error('Erro ao buscar conversas para auditoria.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar salas:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingChats(false);
        }
    };

    // Busca solicitações de saques reais
    const fetchWithdrawals = async () => {
        setLoadingWithdrawals(true);
        try {
            const response = await fetch('/api/admin/withdrawals');
            if (response.ok) {
                const data = await response.json();
                setWithdrawals(data.withdrawals || []);
            } else {
                toast.error('Erro ao buscar solicitações de saque.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar saques:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingWithdrawals(false);
        }
    };

    // Aprovar saque e registrar na coleção Transaction (em Reais)
    const handleApproveWithdrawal = async (id: string) => {
        const confirmApprove = window.confirm('Deseja realmente confirmar que este Pix foi pago manualmente? Essa ação não pode ser desfeita.');
        if (!confirmApprove) return;

        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });

            if (response.ok) {
                toast.success('Saque concluído com sucesso e registrado no financeiro!', {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                fetchWithdrawals();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao aprovar saque.');
            }
        } catch (error) {
            console.error('Erro ao aprovar saque:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Rejeitar saque e devolver saldo para a carteira da profissional
    const handleRejectWithdrawal = async (id: string) => {
        const confirmReject = window.confirm('Deseja realmente rejeitar este saque? O saldo correspondente será devolvido imediatamente à carteira da profissional.');
        if (!confirmReject) return;

        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });

            if (response.ok) {
                toast.success('Saque rejeitado com sucesso. Saldo devolvido para a profissional!', {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                fetchWithdrawals();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao rejeitar saque.');
            }
        } catch (error) {
            console.error('Erro ao rejeitar saque:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Efeito para carregar dados conforme aba e período ativo
    useEffect(() => {
        if (!isAuthorized) return;
        if (activeTab === 'dashboard' || activeTab === 'financial') {
            fetchDashboard(selectedPeriod);
        } else if (activeTab === 'rooms') {
            fetchRooms();
        } else if (activeTab === 'withdrawals') {
            fetchWithdrawals();
        }
    }, [activeTab, selectedPeriod, isAuthorized]);

    // Abrir modal de auditoria buscando histórico de mensagens reais
    const handleOpenAuditModal = async (chat: ChatRoom) => {
        setSelectedAuditChat({
            ...chat,
            history: []
        });

        try {
            const response = await fetch(`/api/admin/rooms/${chat.id}/messages`);
            if (response.ok) {
                const data = await response.json();
                setSelectedAuditChat({
                    ...chat,
                    history: data.history || []
                });
            } else {
                toast.error('Erro ao buscar mensagens do chat.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar mensagens:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Busca de usuários geral (Autocomplete) com debounce
    useEffect(() => {
        const query = adminSearch.trim();
        if (query.length < 2) {
            setAdminSearchResults([]);
            setShowAdminDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearchingAdmin(true);
            try {
                const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    setAdminSearchResults(data.users || []);
                    setShowAdminDropdown(true);
                }
            } catch (error) {
                console.error('Erro na busca de usuários para admin:', error);
            } finally {
                setSearchingAdmin(false);
            }
        }, 350); // 350ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [adminSearch]);

    // Salva as configurações editadas no banco de dados
    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platformFeePercentage: platformFee,
                    uploadLimitMB: uploadLimit,
                    autoModeration,
                    professionalsOnlyCreateRooms: professionalsOnly,
                    adminClerkIds: adminListRich.map(a => a.clerkId),
                    comparisonPeriod,
                    maxPricePerChar,
                    maxSubscriptionPrice,
                    subscriberDiscountPercentage,
                    minPublicPhotos,
                    maxPublicPhotos,
                    minExclusivePhotos,
                    maxExclusivePhotos,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Configurações atualizadas no banco de dados!', {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                setSettings(data.settings);
                setAdminListRich(data.richAdmins || []);
                setMaxPricePerChar(data.settings.maxPricePerChar);
                setMaxSubscriptionPrice(data.settings.maxSubscriptionPrice);
                setSubscriberDiscountPercentage(data.settings.subscriberDiscountPercentage);
                setMinPublicPhotos(data.settings.minPublicPhotos);
                setMaxPublicPhotos(data.settings.maxPublicPhotos);
                setMinExclusivePhotos(data.settings.minExclusivePhotos);
                setMaxExclusivePhotos(data.settings.maxExclusivePhotos);
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao salvar configurações.');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            toast.error('Erro de conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    // Adiciona administrador à lista local
    const handleSelectAdmin = (selectedUser: RichAdmin) => {
        if (adminListRich.some(a => a.clerkId === selectedUser.clerkId)) {
            toast.error('Este usuário já é administrador.');
            return;
        }

        setAdminListRich(prev => [...prev, selectedUser]);
        setAdminSearch('');
        setShowAdminDropdown(false);
        toast.success(`${selectedUser.name} adicionado na lista (salve para salvar no banco).`);
    };

    // Remove administrador da lista local
    const handleRemoveAdmin = (idToRemove: string) => {
        if (idToRemove === userId) {
            toast.error('Você não pode se remover da lista de administradores.');
            return;
        }

        setAdminListRich(prev => prev.filter(a => a.clerkId !== idToRemove));
        toast.success('Administrador removido da lista (salve para salvar no banco).');
    };

    // Formata o avatar com iniciais
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // 1. Tela de Carregamento
    if (!isLoaded || loadingSettings) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6]">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 shadow-2xl mb-4">
                        <Sliders size={40} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-wide">MimoAdmin</h2>
                    <p className="text-purple-200 text-xs mt-1 font-medium">Validando credenciais do painel...</p>
                </div>
            </div>
        );
    }

    // 2. Tela de Acesso Negado
    if (!isAuthorized) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6 selection:bg-rose-500/20 selection:text-rose-300">
                <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-xl shadow-rose-950/10">
                        <Lock size={38} className="stroke-[1.8]" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-white text-2xl font-black tracking-tight">Acesso Restrito</h2>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Esta é uma área restrita exclusiva para administradores do MimoChat. Sua conta atual não possui permissões administrativas.
                        </p>
                    </div>

                    {userId && (
                        <div className="bg-slate-900/60 border border-slate-800/80 px-4 py-3 rounded-xl w-full text-left space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Seu Clerk ID</span>
                            <code className="text-xs text-purple-400 font-mono font-bold break-all block">{userId}</code>
                        </div>
                    )}

                    <div className="w-full pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => router.replace('/')}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-600/10 cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            Voltar ao MimoChat
                        </button>
                        {!isSignedIn && (
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all border border-slate-700 cursor-pointer"
                            >
                                Entrar com outra conta
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 3. Renderização do Painel Completo para Administrador
    return (
        <div className="flex bg-slate-50 min-h-screen font-sans selection:bg-purple-100 selection:text-purple-900 relative">
            
            {/* Sidebar Fixa à Esquerda */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Conteúdo Principal à Direita */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Dinâmico */}
                <DashboardHeader title={tabTitles[activeTab]} />

                {/* Área de Visualização Principal */}
                <main className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl w-full mx-auto">
                    
                    {/* TAB: DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <>
                            {/* Filtro Rápido de Período da Dashboard */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 px-6 py-4 rounded-2xl shadow-sm gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Visualização de Tendências</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">Altere o período de comparação das métricas da dashboard em tempo real.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value as any)}
                                        className="text-xs font-bold px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 text-slate-700 cursor-pointer"
                                    >
                                        <option value="none">Sem Comparação</option>
                                        <option value="week">Última Semana</option>
                                        <option value="month">Último Mês</option>
                                    </select>
                                </div>
                            </div>

                            {/* Cards de Métricas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatsCard
                                    title="Total de Usuários"
                                    value={loadingDashboard ? '...' : dashboardData?.metrics?.users?.value || '0'}
                                    change={loadingDashboard ? undefined : (dashboardData?.metrics?.users?.change || undefined)}
                                    isPositive={loadingDashboard ? true : dashboardData?.metrics?.users?.isPositive}
                                    icon={Users}
                                    color="purple"
                                />
                                <StatsCard
                                    title="Conversas Ativas"
                                    value={loadingDashboard ? '...' : dashboardData?.metrics?.activeChats?.value || '0'}
                                    change={loadingDashboard ? undefined : (dashboardData?.metrics?.activeChats?.change || undefined)}
                                    isPositive={loadingDashboard ? true : dashboardData?.metrics?.activeChats?.isPositive}
                                    icon={MessageSquare}
                                    color="blue"
                                />
                                <StatsCard
                                    title="Mensagens Enviadas"
                                    value={loadingDashboard ? '...' : dashboardData?.metrics?.messages?.value || '0'}
                                    change={loadingDashboard ? undefined : (dashboardData?.metrics?.messages?.change || undefined)}
                                    isPositive={loadingDashboard ? true : dashboardData?.metrics?.messages?.isPositive}
                                    icon={MessageCircle}
                                    color="green"
                                />
                                <StatsCard
                                    title="Total Recarregado"
                                    value={loadingDashboard ? '...' : dashboardData?.metrics?.revenue?.value || 'R$ 0,00'}
                                    change={loadingDashboard ? undefined : (dashboardData?.metrics?.revenue?.change || undefined)}
                                    isPositive={loadingDashboard ? true : dashboardData?.metrics?.revenue?.isPositive}
                                    icon={Coins}
                                    color="amber"
                                />
                            </div>

                            {/* Gráficos e Outras Informações Rápidas */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    {loadingDashboard ? (
                                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm h-full flex flex-col items-center justify-center min-h-[220px]">
                                            <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                                            <span className="text-sm font-semibold text-slate-500 mt-2">Buscando dados de atividade...</span>
                                        </div>
                                    ) : (
                                        <ActivityChart data={dashboardData?.activityData} />
                                    )}
                                </div>
                                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                            <TrendingUp size={20} className="text-purple-600" />
                                            Últimas Transações
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Logs de recarga e saques via AbacatePay.
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-4 flex-1">
                                        {loadingDashboard ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-2">
                                                <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                <span className="text-[10px] text-slate-400 font-semibold">Carregando logs...</span>
                                            </div>
                                        ) : dashboardData?.recentTransactions?.length > 0 ? (
                                            dashboardData.recentTransactions.map((tx: any) => (
                                                <div key={tx.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${
                                                            tx.status === 'Aprovado' || tx.status === 'Débito' ? 'bg-emerald-50 text-emerald-600' :
                                                            tx.status === 'Pendente' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                                        }`}>
                                                            {(tx.status === 'Aprovado' || tx.status === 'Débito') && <CheckCircle2 size={16} />}
                                                            {tx.status === 'Pendente' && <Clock size={16} />}
                                                            {tx.status === 'Cancelado' && <AlertCircle size={16} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-800">{tx.user}</span>
                                                            <span className="text-[10px] text-slate-400 font-semibold">{tx.type} • {tx.time}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold text-slate-700 block">
                                                            {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-semibold uppercase">{tx.id}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center text-xs font-semibold text-slate-400">
                                                Nenhuma transação recente cadastrada.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Clientes Rápida */}
                            <div className="w-full">
                                <ClientsTable />
                            </div>
                        </>
                    )}

                    {/* TAB: CLIENTS */}
                    {activeTab === 'clients' && (
                        <div className="w-full">
                            <ClientsTable />
                        </div>
                    )}

                    {/* TAB: PROFESSIONALS */}
                    {activeTab === 'professionals' && (
                        <div className="w-full">
                            <ProfessionalsTable />
                        </div>
                    )}

                    {/* TAB: ROOMS (CONVERSAS) */}
                    {activeTab === 'rooms' && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                                    Auditoria de Conversas Diretas (1-para-1)
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Visualize as trocas de mensagens entre usuários para moderação e auditoria de faturamento.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">Participantes</th>
                                            <th className="py-4 px-6">Total Mensagens</th>
                                            <th className="py-4 px-6">Faturamento da Conversa</th>
                                            <th className="py-4 px-6">Última Mensagem</th>
                                            <th className="py-4 px-6">Último Contato</th>
                                            <th className="py-4 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingChats ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                        <span>Buscando conversas reais no banco...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : chats.length > 0 ? (
                                            chats.map((chat) => (
                                                <tr key={chat.id} className="hover:bg-slate-50/40 transition-colors group">
                                                    {/* Participantes */}
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 border-2 border-white flex items-center justify-center font-bold text-xs">
                                                                    {getInitials(chat.userA.name)}
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center font-bold text-xs">
                                                                    {getInitials(chat.userB.name)}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-800 leading-tight">
                                                                    {chat.userA.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                    ↔ {chat.userB.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Contagem de mensagens */}
                                                    <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                                                        {chat.messagesCount}
                                                    </td>
                                                    {/* Faturamento */}
                                                    <td className="py-4 px-6">
                                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                            <Coins size={13} className="text-amber-500" />
                                                            {chat.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    {/* Preview */}
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-xs truncate">
                                                        {chat.lastMessage}
                                                    </td>
                                                    {/* Tempo */}
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                                                        {chat.time}
                                                    </td>
                                                    {/* Ações */}
                                                    <td className="py-4 px-6 text-center">
                                                        <button 
                                                            onClick={() => handleOpenAuditModal(chat)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-bold rounded-lg transition-all border border-purple-100 cursor-pointer group-hover:scale-105"
                                                        >
                                                            <Eye size={12} />
                                                            Auditar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    Nenhuma conversa encontrada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: FINANCIAL */}
                    {activeTab === 'financial' && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                                    Histórico Financeiro Recente
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Todas as transações financeiras de recarga de créditos efetuadas via API AbacatePay e cobranças.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">ID Transação</th>
                                            <th className="py-4 px-6">Usuário</th>
                                            <th className="py-4 px-6">Tipo</th>
                                            <th className="py-4 px-6">Valor</th>
                                            <th className="py-4 px-6">Data/Hora</th>
                                            <th className="py-4 px-6">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingDashboard ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                        <span>Buscando transações reais...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : dashboardData?.recentTransactions?.length > 0 ? (
                                            dashboardData.recentTransactions.map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                                                    <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">{tx.id}</td>
                                                    <td className="py-4 px-6 text-sm font-bold text-slate-800">{tx.user}</td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{tx.type}</td>
                                                    <td className="py-4 px-6 text-sm font-bold text-slate-700">
                                                        {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">{tx.time}</td>
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                            tx.status === 'Aprovado' || tx.status === 'Débito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            tx.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                            'bg-rose-50 text-rose-700 border border-rose-100'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                tx.status === 'Aprovado' || tx.status === 'Débito' ? 'bg-emerald-500' :
                                                                tx.status === 'Pendente' ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`} />
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    Nenhuma transação real registrada na base de dados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: WITHDRAWALS (SOLICITAÇÕES DE SAQUE) */}
                    {activeTab === 'withdrawals' && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                                        Solicitações de Saque Manuais
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Analise as solicitações de saque das profissionais, efetue o Pix manual no seu banco e confirme ou rejeite o pedido aqui.
                                    </p>
                                </div>
                                <button
                                    onClick={fetchWithdrawals}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                    Atualizar Lista
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">Profissional</th>
                                            <th className="py-4 px-6">Chave Pix</th>
                                            <th className="py-4 px-6">Valor do Saque</th>
                                            <th className="py-4 px-6">Solicitado Em</th>
                                            <th className="py-4 px-6">Status</th>
                                            <th className="py-4 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingWithdrawals ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                        <span>Buscando solicitações no banco...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : withdrawals.length > 0 ? (
                                            withdrawals.map((withdraw) => (
                                                <tr key={withdraw.id} className="hover:bg-slate-50/40 transition-colors group">
                                                    {/* Profissional */}
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                                                                {withdraw.userPhotoUrl ? (
                                                                    <img src={withdraw.userPhotoUrl} alt={withdraw.userName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    getInitials(withdraw.userName)
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 truncate">
                                                                    {withdraw.userName}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                                                                    {withdraw.userEmail}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Chave Pix */}
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit break-all">
                                                                {withdraw.pixKey}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Valor */}
                                                    <td className="py-4 px-6">
                                                        <span className="text-sm font-extrabold text-slate-800">
                                                            {withdraw.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    {/* Solicitado Em */}
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                                                        {withdraw.createdAt}
                                                    </td>
                                                    {/* Status */}
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                                            withdraw.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            withdraw.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                                                            'bg-rose-50 text-rose-700 border-rose-100'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                withdraw.status === 'concluido' ? 'bg-emerald-500' :
                                                                withdraw.status === 'pendente' ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`} />
                                                            {withdraw.status === 'concluido' ? 'Pago' :
                                                             withdraw.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                                                        </span>
                                                    </td>
                                                    {/* Ações */}
                                                    <td className="py-4 px-6 text-center">
                                                        {withdraw.status === 'pendente' ? (
                                                            <div className="flex gap-2 justify-center">
                                                                <button
                                                                    onClick={() => handleApproveWithdrawal(withdraw.id)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-lg transition-all border border-emerald-100 cursor-pointer shadow-sm active:scale-95"
                                                                    title="Confirmar que o Pix foi pago"
                                                                >
                                                                    <Check size={12} />
                                                                    Pago (Pix Feito)
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectWithdrawal(withdraw.id)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-all border border-rose-100 cursor-pointer shadow-sm active:scale-95"
                                                                    title="Rejeitar saque e devolver saldo"
                                                                >
                                                                    <X size={12} />
                                                                    Rejeitar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                Resolvido
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    Nenhuma solicitação de saque cadastrada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Formulário de Configurações Globais */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 lg:col-span-2">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                        <Sliders size={20} className="text-purple-600" />
                                        Parâmetros Operacionais
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Ajuste os valores cadastrados diretamente no banco de dados MongoDB.
                                    </p>
                                </div>

                                <form onSubmit={saveSettings} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Taxa de Intermediação (%)</label>
                                            <input 
                                                type="number" 
                                                value={platformFee} 
                                                onChange={(e) => setPlatformFee(Number(e.target.value))}
                                                min={0}
                                                max={100}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Limite de Upload (MB)</label>
                                            <input 
                                                type="number" 
                                                value={uploadLimit} 
                                                onChange={(e) => setUploadLimit(Number(e.target.value))}
                                                min={1}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Período Comparativo Padrão</label>
                                            <select 
                                                value={comparisonPeriod} 
                                                onChange={(e) => setComparisonPeriod(e.target.value as any)}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700"
                                            >
                                                <option value="none">Sem Relação (Ocultar Variação)</option>
                                                <option value="week">Uma Semana</option>
                                                <option value="month">Um Mês</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Preço Máximo por Caractere (R$)</label>
                                            <input 
                                                type="number" 
                                                step="0.001"
                                                value={maxPricePerChar} 
                                                onChange={(e) => setMaxPricePerChar(Number(e.target.value))}
                                                min={0}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Preço Máximo da Assinatura (R$)</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={maxSubscriptionPrice} 
                                                onChange={(e) => setMaxSubscriptionPrice(Number(e.target.value))}
                                                min={0}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Desconto p/ Assinantes (%)</label>
                                            <input 
                                                type="number" 
                                                value={subscriberDiscountPercentage} 
                                                onChange={(e) => setSubscriberDiscountPercentage(Number(e.target.value))}
                                                min={0}
                                                max={100}
                                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Regras de Perfil e Galeria Pública</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600 uppercase block">Mínimo de Fotos</label>
                                                <input 
                                                    type="number" 
                                                    value={minPublicPhotos} 
                                                    onChange={(e) => setMinPublicPhotos(Number(e.target.value))}
                                                    min={0}
                                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600 uppercase block">Máximo de Fotos</label>
                                                <input 
                                                    type="number" 
                                                    value={maxPublicPhotos} 
                                                    onChange={(e) => setMaxPublicPhotos(Number(e.target.value))}
                                                    min={0}
                                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600 uppercase block">Mín. Exclusivas Assinante</label>
                                                <input 
                                                    type="number" 
                                                    value={minExclusivePhotos} 
                                                    onChange={(e) => setMinExclusivePhotos(Number(e.target.value))}
                                                    min={0}
                                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600 uppercase block">Máx. Exclusivas Assinante</label>
                                                <input 
                                                    type="number" 
                                                    value={maxExclusivePhotos} 
                                                    onChange={(e) => setMaxExclusivePhotos(Number(e.target.value))}
                                                    min={0}
                                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Segurança & Moderação</h4>
                                        
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={autoModeration} 
                                                onChange={(e) => setAutoModeration(e.target.checked)}
                                                className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4" 
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">
                                                    Moderação Automática de Palavrões
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    Filtra termos inapropriados de forma automática em canais públicos.
                                                </span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={professionalsOnly} 
                                                onChange={(e) => setProfessionalsOnly(e.target.checked)}
                                                className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4" 
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">
                                                    Apenas Profissionais Verificados criam Salas
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    Restringe a criação de novas salas de chat a contas validadas.
                                                </span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <button 
                                            type="submit" 
                                            disabled={saving}
                                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/10 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Gerenciamento de Administradores */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col h-fit relative">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                        <UserCheck size={20} className="text-purple-600" />
                                        Administradores
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Pesquise usuários pelo nome ou e-mail para promovê-los a administrador.
                                    </p>
                                </div>

                                {/* Campo de Busca com Autocomplete */}
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar usuário por nome/e-mail..."
                                            value={adminSearch}
                                            onChange={(e) => setAdminSearch(e.target.value)}
                                            onFocus={() => { if (adminSearchResults.length > 0) setShowAdminDropdown(true); }}
                                            className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400" 
                                        />
                                        {searchingAdmin && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 animate-spin" size={14} />
                                        )}
                                    </div>

                                    {/* Dropdown Flutuante de Resultados */}
                                    {showAdminDropdown && (
                                        <>
                                            {/* Overlay de clique fora */}
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setShowAdminDropdown(false)}
                                            />
                                            <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 divide-y divide-slate-50 animate-fade-in-up">
                                                {adminSearchResults.length > 0 ? (
                                                    adminSearchResults.map((user) => (
                                                        <button
                                                            key={user.clerkId}
                                                            type="button"
                                                            onClick={() => handleSelectAdmin(user)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                                {user.photoUrl ? (
                                                                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    getInitials(user.name)
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 truncate">{user.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-semibold truncate">{user.email}</span>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-center text-xs font-semibold text-slate-400">
                                                        Nenhum usuário encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Lista de Admins com Visual Rico */}
                                <div className="space-y-3 max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-1 mt-2">
                                    {adminListRich.map((admin) => (
                                        <div key={admin.clerkId} className="flex items-center justify-between py-2.5 first:pt-0">
                                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                                {/* Avatar */}
                                                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-100 overflow-hidden shrink-0">
                                                    {admin.photoUrl ? (
                                                        <img src={admin.photoUrl} alt={admin.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getInitials(admin.name)
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-800 truncate">
                                                        {admin.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold truncate leading-tight mt-0.5">
                                                        {admin.email}
                                                    </span>
                                                    <code className="text-[8px] font-mono text-slate-400 mt-1 truncate">
                                                        ID: {admin.clerkId}
                                                    </code>
                                                </div>
                                            </div>

                                            <div className="flex items-center shrink-0">
                                                {admin.clerkId === userId ? (
                                                    <span className="text-[9px] text-purple-600 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full select-none">
                                                        Você
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAdmin(admin.clerkId)}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 cursor-pointer transition-all"
                                                        title="Remover Administrador"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* MODAL DE AUDITORIA DE CONVERSAS (WhatsApp Style) */}
            {selectedAuditChat && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    {/* Modal Content */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        
                        {/* Header do Modal */}
                        <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl border border-purple-500/20">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h3 className="text-white text-base font-bold tracking-tight">Auditoria de Conversa</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        Histórico completo de <strong>{selectedAuditChat.userA.name}</strong> para <strong>{selectedAuditChat.userB.name}</strong>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedAuditChat(null)}
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo do Modal - Balões de Chat */}
                        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40 space-y-4">
                            {selectedAuditChat.history.map((msg, idx) => {
                                const isUserA = msg.sender === selectedAuditChat.userA.clerkId;
                                return (
                                    <div 
                                        key={idx} 
                                        className={`flex flex-col max-w-[80%] ${
                                            isUserA ? 'self-start mr-auto' : 'self-end ml-auto items-end'
                                        }`}
                                    >
                                        {/* Balão */}
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                            isUserA 
                                                ? 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800' 
                                                : 'bg-purple-950/80 text-purple-100 rounded-tr-none border border-purple-900/60'
                                        }`}>
                                            <p>{msg.text}</p>
                                            {/* Info de Faturamento */}
                                            {msg.cost > 0 && (
                                                <span className="inline-flex items-center gap-0.5 mt-2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                                                    Custo: R$ {msg.cost.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        {/* Metadata */}
                                        <span className="text-[10px] text-slate-500 font-semibold mt-1 px-1">
                                            {isUserA ? selectedAuditChat.userA.name : selectedAuditChat.userB.name} • {msg.time}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Moderação Ações no Rodapé */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-amber-500 font-bold bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/10">
                                <AlertTriangle size={14} />
                                Apenas para moderação.
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => {
                                        toast.success('Usuário advertido com sucesso! (Simulado)');
                                        setSelectedAuditChat(null);
                                    }}
                                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer bg-slate-900"
                                >
                                    Advertir Remetente
                                </button>
                                <button 
                                    onClick={() => {
                                        toast.success('Conversa suspensa de forma temporária! (Simulado)');
                                        setSelectedAuditChat(null);
                                    }}
                                    className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
                                >
                                    Bloquear Conversa
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
