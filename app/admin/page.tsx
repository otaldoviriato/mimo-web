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
    Check,
    Ticket,
    LifeBuoy,
    Star,
    MailOpen,
    Send,
    CheckCircle,
    Mail,
    Settings,
    ArrowRight,
    MailPlus,
    Bold,
    Italic,
    Link
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
    minSubscriptionPrice: number;
    subscriberDiscountPercentage: number;
    minPublicPhotos: number;
    maxPublicPhotos: number;
    minExclusivePhotos: number;
    maxExclusivePhotos: number;
    pixEnabled: boolean;
    creditCardEnabled: boolean;
    couponsEnabled: boolean;
    chatSessionTimeoutMinutes: number;
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

interface HelpTicketData {
    _id: string;
    senderEmail: string;
    senderName?: string;
    recipientEmail?: string;
    subject: string;
    message: string;
    status: 'novo' | 'em_atendimento' | 'lido' | 'resolvido' | 'arquivado';
    isFavorite: boolean;
    isRead: boolean;
    notes?: string;
    replies?: HelpTicketData[];
    createdAt: string;
    updatedAt: string;
}

interface WithdrawRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhotoUrl: string | null;
    amount: number;
    pixKey: string;
    status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
    createdAt: string;
    updatedAt: string;
}

// Componente de Editor de Texto Rico (Rich Text Editor) Leve
interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeight = '120px' }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const execCmd = (cmd: string, val: string = '') => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const addLink = () => {
        const url = prompt('Digite a URL do link:');
        if (url) {
            execCmd('createLink', url);
        }
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all w-full">
            <style dangerouslySetInnerHTML={{__html: `
                .editor-content:empty::before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    font-weight: 505;
                }
            `}} />
            <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 border-b border-slate-200 select-none">
                <button
                    type="button"
                    onClick={() => execCmd('bold')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    title="Negrito"
                >
                    <Bold size={12} />
                </button>
                <button
                    type="button"
                    onClick={() => execCmd('italic')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    title="Itálico"
                >
                    <Italic size={12} />
                </button>
                <button
                    type="button"
                    onClick={addLink}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    title="Inserir Link"
                >
                    <Link size={12} />
                </button>
                <button
                    type="button"
                    onClick={() => execCmd('removeFormat')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ml-auto"
                    title="Limpar Formatação"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                data-placeholder={placeholder}
                className="editor-content w-full p-3 text-xs bg-white focus:outline-none overflow-y-auto text-slate-700 font-medium"
                style={{ minHeight, maxHeight: '250px' }}
            />
        </div>
    );
};

export default function AdminPage() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Carrega a aba ativa a partir do parâmetro "tab" na URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['dashboard', 'clients', 'professionals', 'rooms', 'financial', 'withdrawals', 'settings', 'coupons', 'help-tickets', 'institutional-emails'].includes(tabParam)) {
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
    const [minSubscriptionPrice, setMinSubscriptionPrice] = useState(10);
    const [subscriberDiscountPercentage, setSubscriberDiscountPercentage] = useState(20);
    const [minPublicPhotos, setMinPublicPhotos] = useState(6);
    const [maxPublicPhotos, setMaxPublicPhotos] = useState(12);
    const [minExclusivePhotos, setMinExclusivePhotos] = useState(2);
    const [maxExclusivePhotos, setMaxExclusivePhotos] = useState(4);
    const [pixEnabled, setPixEnabled] = useState(true);
    const [creditCardEnabled, setCreditCardEnabled] = useState(true);
    const [couponsEnabled, setCouponsEnabled] = useState(true);
    const [chatSessionTimeoutMinutes, setChatSessionTimeoutMinutes] = useState(30);
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

    // Estados do Gerenciamento de Cupons de Desconto
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(true);
    const [couponModalOpen, setCouponModalOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
    const [couponUsersModalOpen, setCouponUsersModalOpen] = useState(false);
    const [auditedCoupon, setAuditedCoupon] = useState<any | null>(null);
    const [couponUsers, setCouponUsers] = useState<any[]>([]);
    const [loadingCouponUsers, setLoadingCouponUsers] = useState(false);
    const [couponUsersSearch, setCouponUsersSearch] = useState('');

    // Estados do Formulário de Cupom
    const [cpCode, setCpCode] = useState('');
    const [cpAmount, setCpAmount] = useState('');
    const [cpDescription, setCpDescription] = useState('');
    const [cpTargetAudience, setCpTargetAudience] = useState<'all' | 'client' | 'professional'>('all');
    const [cpMaxUses, setCpMaxUses] = useState('');
    const [cpExpiresAt, setCpExpiresAt] = useState('');
    const [cpIsActive, setCpIsActive] = useState(true);

    // Estados dos Tickets de Ajuda
    const [helpTickets, setHelpTickets] = useState<HelpTicketData[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<HelpTicketData | null>(null);
    const [ticketSearch, setTicketSearch] = useState('');
    const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('abertos');
    const [ticketFavoriteFilter, setTicketFavoriteFilter] = useState<boolean>(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [ticketNotes, setTicketNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Estados para envio de e-mail avulso
    const [newEmailSender, setNewEmailSender] = useState('');
    const [newEmailTo, setNewEmailTo] = useState('');
    const [newEmailSubject, setNewEmailSubject] = useState('');
    const [newEmailMessage, setNewEmailMessage] = useState('');
    const [sendingNewEmail, setSendingNewEmail] = useState(false);

    // Estados dos E-mails Institucionais
    const [institutionalEmails, setInstitutionalEmails] = useState<string[]>([]);
    const [emailRedirections, setEmailRedirections] = useState<{ sourceEmail: string; targetEmail: string; displayName?: string }[]>([]);
    const [loadingInstitutional, setLoadingInstitutional] = useState(true);
    const [instMessages, setInstMessages] = useState<HelpTicketData[]>([]);
    const [selectedInstMessage, setSelectedInstMessage] = useState<HelpTicketData | null>(null);
    const [instSearch, setInstSearch] = useState('');
    const [instStatusFilter, setInstStatusFilter] = useState<string>('all');
    const [instEmailFilter, setInstEmailFilter] = useState<string>('all');
    
    // Novos estados para gerenciamento limpo e envio de e-mails
    const [selectedInstEmail, setSelectedInstEmail] = useState<string | null>(null);
    const [showInstConfigModal, setShowInstConfigModal] = useState<boolean>(false);
    const [showNewEmailModal, setShowNewEmailModal] = useState<boolean>(false);
    
    // Estados do formulário de resposta na aba Institucional
    const [replyInstText, setReplyInstText] = useState('');
    const [sendingInstReply, setSendingInstReply] = useState(false);
    const [instNotes, setInstNotes] = useState('');
    const [savingInstNotes, setSavingInstNotes] = useState(false);

    // Estados para gerenciar o cadastro de e-mails institucionais
    const [newInstEmailPrefix, setNewInstEmailPrefix] = useState('');
    const [newInstEmailForwarding, setNewInstEmailForwarding] = useState('');
    const [newInstEmailDisplayName, setNewInstEmailDisplayName] = useState('');
    const [addingInstEmail, setAddingInstEmail] = useState(false);

    // Mapeamento de títulos para o Header
    const tabTitles: { [key: string]: string } = {
        dashboard: 'Painel Geral',
        clients: 'Gerenciamento de Clientes',
        professionals: 'Gerenciamento de Profissionais',
        rooms: 'Auditoria de Conversas',
        financial: 'Movimentações Financeiras',
        withdrawals: 'Solicitações de Saque',
        settings: 'Configurações do Sistema',
        coupons: 'Gerenciamento de Cupons de Desconto',
        'help-tickets': 'Tickets de Ajuda',
        'institutional-emails': 'E-mails Institucionais',
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
                    setMinSubscriptionPrice(s.minSubscriptionPrice !== undefined ? s.minSubscriptionPrice : 10);
                    setSubscriberDiscountPercentage(s.subscriberDiscountPercentage !== undefined ? s.subscriberDiscountPercentage : 20);
                    setMinPublicPhotos(s.minPublicPhotos !== undefined ? s.minPublicPhotos : 6);
                    setMaxPublicPhotos(s.maxPublicPhotos !== undefined ? s.maxPublicPhotos : 12);
                    setMinExclusivePhotos(s.minExclusivePhotos !== undefined ? s.minExclusivePhotos : 2);
                    setMaxExclusivePhotos(s.maxExclusivePhotos !== undefined ? s.maxExclusivePhotos : 4);
                    setPixEnabled(s.pixEnabled !== undefined ? s.pixEnabled : true);
                    setCreditCardEnabled(s.creditCardEnabled !== undefined ? s.creditCardEnabled : true);
                    setCouponsEnabled(s.couponsEnabled !== undefined ? s.couponsEnabled : true);
                    setChatSessionTimeoutMinutes(s.chatSessionTimeoutMinutes !== undefined ? s.chatSessionTimeoutMinutes : 30);
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

    // Exclui uma transação financeira permanentemente
    const handleDeleteTransaction = async (id: string, displayId: string) => {
        const confirmDelete = window.confirm(
            `ATENÇÃO: Deseja realmente excluir permanentemente a transação "${displayId}"?\nEsta ação removerá de forma definitiva o registro contábil e não pode ser desfeita.`
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/admin/transactions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Transação excluída com sucesso!', {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                fetchDashboard(selectedPeriod);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao excluir transação.');
            }
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Busca cupons de desconto
    const fetchCoupons = async () => {
        setLoadingCoupons(true);
        try {
            const response = await fetch('/api/admin/coupons');
            if (response.ok) {
                const data = await response.json();
                setCoupons(data.coupons || []);
            } else {
                toast.error('Erro ao carregar cupons do servidor.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar cupons:', error);
            toast.error('Erro de conexão ao buscar cupons.');
        } finally {
            setLoadingCoupons(false);
        }
    };

    // Abre o modal para criar ou editar cupom
    const handleOpenCouponModal = (coupon: any | null = null) => {
        setSelectedCoupon(coupon);
        if (coupon) {
            setCpCode(coupon.code);
            setCpAmount((coupon.amount / 100).toString()); // Converte centavos para reais
            setCpDescription(coupon.description || '');
            setCpTargetAudience(coupon.targetAudience || 'all');
            setCpMaxUses(coupon.maxUses !== null && coupon.maxUses !== undefined ? coupon.maxUses.toString() : '');
            setCpExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '');
            setCpIsActive(coupon.isActive);
        } else {
            setCpCode('');
            setCpAmount('');
            setCpDescription('');
            setCpTargetAudience('all');
            setCpMaxUses('');
            setCpExpiresAt('');
            setCpIsActive(true);
        }
        setCouponModalOpen(true);
    };

    // Salva o cupom (Cria ou Edita)
    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cpCode.trim()) {
            toast.error('O código do cupom é obrigatório.');
            return;
        }

        const parsedAmount = parseFloat(cpAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Digite um valor válido em reais maior que zero.');
            return;
        }

        // Converte de reais para centavos
        const amountCents = Math.round(parsedAmount * 100);

        const payload = {
            code: cpCode.trim().toUpperCase(),
            amount: amountCents,
            description: cpDescription.trim(),
            targetAudience: cpTargetAudience,
            maxUses: cpMaxUses.trim() !== '' ? parseInt(cpMaxUses) : null,
            expiresAt: cpExpiresAt ? new Date(cpExpiresAt).toISOString() : null,
            isActive: cpIsActive,
        };

        try {
            const url = selectedCoupon ? `/api/admin/coupons/${selectedCoupon._id}` : '/api/admin/coupons';
            const method = selectedCoupon ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success(selectedCoupon ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!', {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                setCouponModalOpen(false);
                fetchCoupons();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao salvar o cupom.');
            }
        } catch (error) {
            console.error('Erro ao salvar cupom:', error);
            toast.error('Erro de conexão ao salvar.');
        }
    };

    // Exclui o cupom do banco de dados
    const handleDeleteCoupon = async (id: string, code: string) => {
        const confirmDelete = window.confirm(`Tem certeza que deseja excluir permanentemente o cupom ${code}?`);
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success(`Cupom ${code} excluído com sucesso!`, {
                    style: {
                        borderRadius: '12px',
                        background: '#1E293B',
                        color: '#FFF',
                        fontWeight: 600,
                    }
                });
                fetchCoupons();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao excluir o cupom.');
            }
        } catch (error) {
            console.error('Erro ao excluir cupom:', error);
            toast.error('Erro de conexão ao excluir.');
        }
    };

    // Abre o modal de usuários que usaram o cupom
    const handleOpenCouponUsers = async (coupon: any) => {
        setAuditedCoupon(coupon);
        setCouponUsers([]);
        setCouponUsersSearch('');
        setLoadingCouponUsers(true);
        setCouponUsersModalOpen(true);

        try {
            const response = await fetch(`/api/admin/coupons/${coupon._id}/users`);
            if (response.ok) {
                const data = await response.json();
                setCouponUsers(data.users || []);
            } else {
                toast.error('Erro ao carregar os usuários que usaram o cupom.');
            }
        } catch (error) {
            console.error('Erro ao buscar usuários do cupom:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingCouponUsers(false);
        }
    };

    // Métodos para gerenciamento dos Tickets de Ajuda
    const fetchHelpTickets = async () => {
        setLoadingTickets(true);
        try {
            const response = await fetch('/api/admin/help-tickets');
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(data.tickets || []);
            } else {
                toast.error('Erro ao carregar tickets de ajuda.');
            }
        } catch (error) {
            console.error('Erro ao buscar tickets:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                if (selectedTicket?._id === id) {
                    setSelectedTicket(data.ticket);
                }
                toast.success(`Status atualizado para: ${newStatus}`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao atualizar status do ticket.');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast.error('Erro de conexão.');
        }
    };

    const handleToggleFavorite = async (ticket: HelpTicketData) => {
        const newFavorite = !ticket.isFavorite;
        try {
            const response = await fetch(`/api/admin/help-tickets/${ticket._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: newFavorite })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === ticket._id ? data.ticket : t));
                if (selectedTicket?._id === ticket._id) {
                    setSelectedTicket(data.ticket);
                }
                toast.success(newFavorite ? 'Marcado como favorito!' : 'Removido dos favoritos.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao favoritar ticket.');
            }
        } catch (error) {
            console.error('Erro ao favoritar:', error);
            toast.error('Erro de conexão.');
        }
    };

    const handleToggleRead = async (ticket: HelpTicketData) => {
        const newRead = !ticket.isRead;
        try {
            const response = await fetch(`/api/admin/help-tickets/${ticket._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: newRead })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === ticket._id ? data.ticket : t));
                if (selectedTicket?._id === ticket._id) {
                    setSelectedTicket(data.ticket);
                }
            }
        } catch (error) {
            console.error('Erro ao alternar leitura:', error);
        }
    };

    const handleSaveTicketNotes = async (id: string) => {
        setSavingNotes(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: ticketNotes })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                if (selectedTicket?._id === id) {
                    setSelectedTicket(data.ticket);
                }
                toast.success('Anotações salvas com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao salvar anotações.');
            }
        } catch (error) {
            console.error('Erro ao salvar anotações:', error);
            toast.error('Erro de conexão.');
        } finally {
            setSavingNotes(false);
        }
    };

    const handleSendReply = async (id: string) => {
        if (!replyText.trim()) {
            toast.error('Escreva uma mensagem de resposta.');
            return;
        }
        setSendingReply(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyMessage: replyText })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                setSelectedTicket(data.ticket);
                setTicketNotes(data.ticket.notes || '');
                setReplyText('');
                toast.success('Resposta enviada com sucesso ao e-mail do usuário!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao enviar resposta.');
            }
        } catch (error) {
            console.error('Erro ao responder ticket:', error);
            toast.error('Erro de conexão.');
        } finally {
            setSendingReply(false);
        }
    };

    const handleSendNewEmail = async () => {
        if (!newEmailSender.trim()) {
            toast.error('Selecione o e-mail do remetente.');
            return;
        }
        if (!newEmailTo.trim()) {
            toast.error('Informe o destinatário.');
            return;
        }
        if (!newEmailSubject.trim()) {
            toast.error('Informe o assunto.');
            return;
        }
        if (!newEmailMessage.trim()) {
            toast.error('Escreva a mensagem do e-mail.');
            return;
        }
        setSendingNewEmail(true);
        try {
            const response = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderEmail: newEmailSender,
                    to: newEmailTo,
                    subject: newEmailSubject,
                    message: newEmailMessage,
                })
            });
            if (response.ok) {
                toast.success('E-mail enviado com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                setNewEmailTo('');
                setNewEmailSubject('');
                setNewEmailMessage('');
                setSelectedTicket(null);
                setSelectedInstMessage(null);
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao enviar e-mail.');
            }
        } catch (error) {
            console.error('Erro ao enviar e-mail avulso:', error);
            toast.error('Erro de conexão.');
        } finally {
            setSendingNewEmail(false);
        }
    };

    const fetchInstitutionalData = async () => {
        setLoadingInstitutional(true);
        try {
            const emailFilterParam = selectedInstEmail ? `&email=${encodeURIComponent(selectedInstEmail)}` : '';
            const searchParam = instSearch.trim() ? `&q=${encodeURIComponent(instSearch)}` : '';
            const statusParam = instStatusFilter !== 'all' ? `&status=${instStatusFilter}` : '';
            
            const response = await fetch(`/api/admin/institutional-emails?${emailFilterParam}${searchParam}${statusParam}`);
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                setInstMessages(selectedInstEmail ? (data.messages || []) : []);
                if (data.emails && data.emails.length > 0 && !newEmailSender) {
                    setNewEmailSender(data.emails[0]);
                }
            } else {
                toast.error('Erro ao carregar dados institucionais.');
            }
        } catch (error) {
            console.error('Erro ao buscar e-mails institucionais:', error);
            toast.error('Erro de conexão.');
        } finally {
            setLoadingInstitutional(false);
        }
    };

    const handleAddInstitutionalEmail = async () => {
        if (!newInstEmailPrefix.trim()) {
            toast.error('Escreva o prefixo do e-mail (ex: contato).');
            return;
        }
        if (!newInstEmailDisplayName.trim()) {
            toast.error('Informe o nome de exibição do remetente.');
            return;
        }
        if (!newInstEmailForwarding.trim()) {
            toast.error('Informe o e-mail privado de redirecionamento.');
            return;
        }
        setAddingInstEmail(true);
        try {
            const cleanPrefix = newInstEmailPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
            const fullEmail = `${cleanPrefix}@mimochat.com.br`;
            const response = await fetch('/api/admin/institutional-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: fullEmail, 
                    displayName: newInstEmailDisplayName.trim(),
                    forwardingEmail: newInstEmailForwarding.trim() 
                })
            });
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                setNewInstEmailPrefix('');
                setNewInstEmailDisplayName('');
                setNewInstEmailForwarding('');
                toast.success(`E-mail ${fullEmail} configurado com sucesso!`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao cadastrar e-mail.');
            }
        } catch (error) {
            console.error('Erro ao cadastrar e-mail institucional:', error);
            toast.error('Erro de conexão.');
        } finally {
            setAddingInstEmail(false);
        }
    };

    const handleDeleteInstitutionalEmail = async (email: string) => {
        const confirmDelete = window.confirm(`Deseja realmente excluir o e-mail ${email}?`);
        if (!confirmDelete) return;
        try {
            const response = await fetch(`/api/admin/institutional-emails?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                if (instEmailFilter === email) {
                    setInstEmailFilter('all');
                }
                toast.success('E-mail institucional removido com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao remover e-mail.');
            }
        } catch (error) {
            console.error('Erro ao remover e-mail:', error);
            toast.error('Erro de conexão.');
        }
    };

    const handleSendInstReply = async (id: string) => {
        if (!replyInstText.trim()) {
            toast.error('Escreva uma resposta.');
            return;
        }
        setSendingInstReply(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyMessage: replyInstText })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
                setInstNotes(data.ticket.notes || '');
                setReplyInstText('');
                toast.success('Resposta enviada para o e-mail do usuário!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao enviar resposta.');
            }
        } catch (error) {
            console.error('Erro ao responder e-mail:', error);
            toast.error('Erro de conexão.');
        } finally {
            setSendingInstReply(false);
        }
    };

    const handleSaveInstNotes = async (id: string) => {
        setSavingInstNotes(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: instNotes })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
                toast.success('Observações salvas.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao salvar observações.');
            }
        } catch (error) {
            console.error('Erro ao salvar notas:', error);
            toast.error('Erro de conexão.');
        } finally {
            setSavingInstNotes(false);
        }
    };

    const handleToggleInstFavorite = async (msg: HelpTicketData) => {
        const newFav = !msg.isFavorite;
        try {
            const response = await fetch(`/api/admin/help-tickets/${msg._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: newFav })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === msg._id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleInstRead = async (msg: HelpTicketData) => {
        const newRead = !msg.isRead;
        try {
            const response = await fetch(`/api/admin/help-tickets/${msg._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: newRead })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === msg._id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateInstStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteInstMessage = async (id: string) => {
        const confirmDelete = window.confirm('Deseja excluir permanentemente este e-mail?');
        if (!confirmDelete) return;
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setInstMessages(prev => prev.filter(m => m._id !== id));
                setSelectedInstMessage(null);
                toast.success('E-mail excluído com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao excluir e-mail.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro de conexão.');
        }
    };

    const handleDeleteTicket = async (id: string) => {
        const confirmDelete = window.confirm('Tem certeza que deseja excluir este ticket permanentemente? Esta ação não pode ser desfeita.');
        if (!confirmDelete) return;
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setHelpTickets(prev => prev.filter(t => t._id !== id));
                setSelectedTicket(null);
                toast.success('Ticket excluído com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao excluir ticket.');
            }
        } catch (error) {
            console.error('Erro ao excluir ticket:', error);
            toast.error('Erro de conexão.');
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
        } else if (activeTab === 'coupons') {
            fetchCoupons();
        } else if (activeTab === 'help-tickets') {
            fetchHelpTickets();
        } else if (activeTab === 'institutional-emails') {
            fetchInstitutionalData();
        }
    }, [activeTab, selectedPeriod, isAuthorized, selectedInstEmail, instSearch, instStatusFilter]);

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
                    minSubscriptionPrice,
                    subscriberDiscountPercentage,
                    minPublicPhotos,
                    maxPublicPhotos,
                    minExclusivePhotos,
                    maxExclusivePhotos,
                    pixEnabled,
                    creditCardEnabled,
                    couponsEnabled,
                    chatSessionTimeoutMinutes,
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
                setMinSubscriptionPrice(data.settings.minSubscriptionPrice || 10);
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
            
            {/* Sidebar */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Conteúdo Principal à Direita */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Dinâmico */}
                <DashboardHeader title={tabTitles[activeTab]} onMenuToggle={() => setIsSidebarOpen(true)}>
                    {(activeTab === 'dashboard' || activeTab === 'financial') && (
                        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-xl transition-all h-fit shrink-0 ml-2 md:ml-4 select-none">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período:</span>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                                className="text-xs font-bold bg-transparent focus:outline-none text-slate-700 cursor-pointer pr-1"
                            >
                                <option value="none">Sem Comparação</option>
                                <option value="week">Última Semana</option>
                                <option value="month">Último Mês</option>
                            </select>
                        </div>
                    )}
                </DashboardHeader>

                {/* Área de Visualização Principal */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-8 max-w-7xl w-full mx-auto">
                    
                    {/* TAB: DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <>
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
                                                    <div className="text-right flex items-center gap-2">
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-xs font-bold text-slate-700 block">
                                                                {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-semibold uppercase">{tx.displayId || tx.id}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTransaction(tx.id, tx.displayId || tx.id);
                                                            }}
                                                            className="p-1 hover:text-rose-600 rounded-lg text-slate-350 hover:bg-rose-50 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Excluir Transação"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
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
                                            <th className="py-4 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingDashboard ? (
                                            <tr>
                                                <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                        <span>Buscando transações reais...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : dashboardData?.recentTransactions?.length > 0 ? (
                                            dashboardData.recentTransactions.map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                                                    <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">{tx.displayId || tx.id}</td>
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
                                                    <td className="py-4 px-6 text-center">
                                                        <button
                                                            onClick={() => handleDeleteTransaction(tx.id, tx.displayId || tx.id)}
                                                            className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                            title="Excluir Transação"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
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
                                                            withdraw.status === 'processando' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                                                            withdraw.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                                                            'bg-rose-50 text-rose-700 border-rose-100'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                withdraw.status === 'concluido' ? 'bg-emerald-500' :
                                                                withdraw.status === 'processando' ? 'bg-blue-500' :
                                                                withdraw.status === 'pendente' ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`} />
                                                            {withdraw.status === 'concluido' ? 'Pago' :
                                                             withdraw.status === 'processando' ? 'Processando (Asaas)' :
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
                                                                    title="Aprovar e enviar Pix via API Asaas"
                                                                >
                                                                    <Check size={12} />
                                                                    Aprovar Saque (Pix)
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
                                                        ) : withdraw.status === 'processando' ? (
                                                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider animate-pulse">
                                                                Aguardando Asaas...
                                                            </span>
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

                                    {/* Tempo de Sessão de Chat */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-xs font-bold text-slate-600 uppercase block flex items-center gap-1.5">
                                                    <Clock size={12} className="text-purple-500" />
                                                    Tempo de Sessão de Chat (minutos)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    value={chatSessionTimeoutMinutes} 
                                                    onChange={(e) => setChatSessionTimeoutMinutes(Number(e.target.value))}
                                                    min={1}
                                                    max={1440}
                                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" 
                                                />
                                            </div>
                                            <div className="flex-[2] bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-6">
                                                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                                                    <AlertCircle size={11} />
                                                    Como funciona
                                                </p>
                                                <p className="text-[11px] text-amber-700 leading-relaxed">
                                                    Se o intervalo entre a última mensagem e a próxima for maior ou igual a <strong>{chatSessionTimeoutMinutes} min</strong>, o sistema considera que uma nova conversa foi iniciada. Isso é usado para disparar notificações por e-mail ao profissional.
                                                </p>
                                            </div>
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
                                            <label className="text-xs font-bold text-slate-600 uppercase block">Preço Mínimo da Assinatura (R$)</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={minSubscriptionPrice} 
                                                onChange={(e) => setMinSubscriptionPrice(Number(e.target.value))}
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

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Meios de Pagamento</h4>
                                        <p className="text-xs text-slate-500 font-medium -mt-2">
                                            Desabilite temporariamente um meio de pagamento. Usuários verão uma mensagem de indisponibilidade.
                                        </p>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={pixEnabled}
                                                onChange={(e) => setPixEnabled(e.target.checked)}
                                                className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">
                                                    Pagamento via Pix habilitado
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    Quando desmarcado, o Pix aparecerá como &quot;Indisponível temporariamente&quot; para os usuários.
                                                </span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={creditCardEnabled}
                                                onChange={(e) => setCreditCardEnabled(e.target.checked)}
                                                className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">
                                                    Pagamento via Cartão de Crédito habilitado
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    Quando desmarcado, o cartão de crédito aparecerá como &quot;Indisponível temporariamente&quot; para os usuários.
                                                </span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={couponsEnabled}
                                                onChange={(e) => setCouponsEnabled(e.target.checked)}
                                                className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">
                                                    Resgate de Cupons habilitado
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    Quando desmarcado, a opção de resgatar cupom fica oculta no modal de recarga.
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

                    {/* TAB: COUPONS */}
                    {activeTab === 'coupons' && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                                        Gerenciamento de Cupons de Desconto
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Crie, edite e gerencie os cupons promocionais que concedem saldo de recarga para os usuários.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleOpenCouponModal(null)}
                                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/10 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Plus size={14} />
                                    Criar Novo Cupom
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">Código</th>
                                            <th className="py-4 px-6">Valor</th>
                                            <th className="py-4 px-6">Descrição</th>
                                            <th className="py-4 px-6">Público-Alvo</th>
                                            <th className="py-4 px-6">Usos / Limite</th>
                                            <th className="py-4 px-6">Expira Em</th>
                                            <th className="py-4 px-6">Status</th>
                                            <th className="py-4 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingCoupons ? (
                                            <tr>
                                                <td colSpan={8} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                        <span>Buscando cupons no banco...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : coupons.length > 0 ? (
                                            coupons.map((coupon) => (
                                                <tr key={coupon._id} className="hover:bg-slate-50/40 transition-colors group">
                                                    {/* Código */}
                                                    <td className="py-4 px-6">
                                                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100/80 px-2.5 py-1 rounded-lg">
                                                            {coupon.code}
                                                        </span>
                                                    </td>
                                                    {/* Valor */}
                                                    <td className="py-4 px-6">
                                                        <span className="text-sm font-extrabold text-slate-800">
                                                            {(coupon.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    {/* Descrição */}
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-[180px] truncate" title={coupon.description}>
                                                        {coupon.description || '-'}
                                                    </td>
                                                    {/* Público-Alvo */}
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                            coupon.targetAudience === 'client' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            coupon.targetAudience === 'professional' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                            'bg-slate-50 text-slate-700 border-slate-100'
                                                        }`}>
                                                            {coupon.targetAudience === 'client' ? 'Clientes' :
                                                             coupon.targetAudience === 'professional' ? 'Profissionais' : 'Todos'}
                                                        </span>
                                                    </td>
                                                    {/* Usos / Limite */}
                                                    <td className="py-4 px-6">
                                                        <button
                                                            onClick={() => handleOpenCouponUsers(coupon)}
                                                            className="text-xs font-semibold text-slate-650 hover:text-purple-600 transition-colors flex items-center gap-1 group/use cursor-pointer"
                                                            title="Ver detalhes de quem usou"
                                                        >
                                                            <span>
                                                                {coupon.totalUses} {coupon.maxUses !== null && coupon.maxUses !== undefined ? `/ ${coupon.maxUses}` : ''}
                                                            </span>
                                                            <Eye size={12} className="text-slate-400 group-hover/use:text-purple-600 transition-colors" />
                                                        </button>
                                                    </td>
                                                    {/* Expira Em */}
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                                                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('pt-BR') : 'Sem expiração'}
                                                    </td>
                                                    {/* Status */}
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                            coupon.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                                        }`}>
                                                            <span className={`w-1 h-1 rounded-full ${coupon.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                            {coupon.isActive ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    {/* Ações */}
                                                    <td className="py-4 px-6 text-center">
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => handleOpenCouponUsers(coupon)}
                                                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                                title="Visualizar resgastes"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenCouponModal(coupon)}
                                                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                                title="Editar cupom"
                                                            >
                                                                <Sliders size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCoupon(coupon._id, coupon.code)}
                                                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                                title="Excluir cupom"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="py-20 text-center text-sm font-semibold text-slate-400">
                                                    Nenhum cupom de desconto cadastrado no sistema.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: HELP TICKETS */}
                    {activeTab === 'help-tickets' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-190px)] animate-fade-in-up">
                            {/* LISTA DE TICKETS (Coluna Esquerda) */}
                            <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                                {/* Barra de busca e favorito */}
                                <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar tickets..."
                                                value={ticketSearch}
                                                onChange={(e) => setTicketSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setTicketFavoriteFilter(!ticketFavoriteFilter)}
                                            className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                                ticketFavoriteFilter 
                                                    ? 'bg-amber-50 border-amber-200 text-amber-500 shadow-sm' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                                            }`}
                                            title={ticketFavoriteFilter ? 'Exibindo apenas favoritos' : 'Filtrar por favoritos'}
                                        >
                                            <Star size={14} className={ticketFavoriteFilter ? 'fill-amber-400' : ''} />
                                        </button>
                                    </div>

                                    {/* Abas horizontais de Status */}
                                    <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                                        {[
                                            { id: 'abertos', label: 'Abertos' },
                                            { id: 'all', label: 'Todos' },
                                            { id: 'novo', label: 'Novos' },
                                            { id: 'em_atendimento', label: 'Em Fila' },
                                            { id: 'resolvido', label: 'Resolvidos' },
                                            { id: 'arquivado', label: 'Arquivados' }
                                        ].map((pill) => (
                                            <button
                                                key={pill.id}
                                                onClick={() => setTicketStatusFilter(pill.id)}
                                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                                                    ticketStatusFilter === pill.id
                                                        ? 'bg-purple-600 text-white shadow-sm'
                                                        : 'bg-slate-50 border border-slate-150 text-slate-500 hover:bg-slate-100 hover:text-slate-750'
                                                }`}
                                            >
                                                {pill.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lista com scroll interno */}
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/20">
                                    {loadingTickets ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                                            <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                                            <span className="text-xs font-semibold text-slate-400">Buscando tickets de ajuda...</span>
                                        </div>
                                    ) : (() => {
                                        const filtered = helpTickets.filter(t => {
                                            const matchesSearch = ticketSearch.trim() === '' || 
                                                t.senderEmail.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                                                (t.senderName && t.senderName.toLowerCase().includes(ticketSearch.toLowerCase())) ||
                                                t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                                                t.message.toLowerCase().includes(ticketSearch.toLowerCase());
                                            const matchesStatus = ticketStatusFilter === 'all' 
                                                ? true 
                                                : ticketStatusFilter === 'abertos' 
                                                    ? ['novo', 'em_atendimento'].includes(t.status)
                                                    : t.status === ticketStatusFilter;
                                            const matchesFav = !ticketFavoriteFilter || t.isFavorite;
                                            return matchesSearch && matchesStatus && matchesFav;
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="py-20 text-center text-xs font-semibold text-slate-400">
                                                    Nenhum ticket de ajuda encontrado.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div>
                                                {filtered.map((ticket) => {
                                                    const initials = getInitials(ticket.senderName || ticket.senderEmail);
                                                    const isSelected = selectedTicket?._id === ticket._id;
                                                    
                                                    // Status colors
                                                    const statusColors: { [key: string]: string } = {
                                                        novo: 'bg-purple-50 text-purple-700 border-purple-100',
                                                        em_atendimento: 'bg-blue-50 text-blue-700 border-blue-100',
                                                        lido: 'bg-slate-50 text-slate-600 border-slate-100',
                                                        resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                                        arquivado: 'bg-slate-100 text-slate-500 border-slate-200'
                                                    };

                                                    return (
                                                        <div
                                                            key={ticket._id}
                                                            onClick={() => {
                                                                setSelectedTicket(ticket);
                                                                setTicketNotes(ticket.notes || '');
                                                                setReplyText('');
                                                                if (!ticket.isRead) {
                                                                    handleToggleRead(ticket);
                                                                }
                                                            }}
                                                            className={`p-4 flex gap-3 cursor-pointer transition-all border-l-3 ${
                                                                isSelected 
                                                                    ? 'bg-purple-50/30 border-purple-600 shadow-xs' 
                                                                    : 'hover:bg-slate-50/50 border-transparent bg-white'
                                                            }`}
                                                        >
                                                            {/* Avatar com bolinha de Não Lido */}
                                                            <div className="relative shrink-0 select-none">
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-purple-700 border border-purple-100 ${
                                                                    isSelected ? 'bg-purple-100' : 'bg-purple-50/70'
                                                                }`}>
                                                                    {initials}
                                                                </div>
                                                                {!ticket.isRead && (
                                                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                                                                )}
                                                            </div>

                                                            {/* Info Texto */}
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold tracking-tight">
                                                                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                    {ticket.isFavorite && (
                                                                        <Star size={11} className="fill-amber-400 text-amber-500 shrink-0" />
                                                                    )}
                                                                </div>
                                                                <h4 className={`text-xs truncate ${!ticket.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                                    {ticket.subject}
                                                                </h4>
                                                                <p className="text-[10px] text-slate-500 truncate leading-relaxed">
                                                                    {ticket.senderName ? `${ticket.senderName} · ` : ''}{ticket.senderEmail}
                                                                </p>
                                                                
                                                                {/* Status badge */}
                                                                <div className="pt-1.5 flex items-center justify-between">
                                                                    <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColors[ticket.status] || statusColors.novo}`}>
                                                                        {ticket.status === 'novo' ? 'Novo' :
                                                                         ticket.status === 'em_atendimento' ? 'Fila' :
                                                                         ticket.status === 'resolvido' ? 'Resolvido' :
                                                                         ticket.status === 'arquivado' ? 'Arquivado' : 'Lido'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* DETALHES E RESPOSTA (Coluna Direita) */}
                            <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                                {selectedTicket ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Header do Visualizador */}
                                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-slate-50/50">
                                            <div className="space-y-1">
                                                <h3 className="text-slate-800 text-sm font-extrabold leading-tight">
                                                    {selectedTicket.subject}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 font-semibold leading-none">
                                                    De: <strong className="text-slate-700">{selectedTicket.senderName || 'Não informado'}</strong> ({selectedTicket.senderEmail})
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Aberto em: {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                                                </p>
                                            </div>

                                            {/* Painel de Ações Rápidas */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Favorito */}
                                                <button
                                                    onClick={() => handleToggleFavorite(selectedTicket)}
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                        selectedTicket.isFavorite 
                                                            ? 'bg-amber-50 border-amber-250 text-amber-500' 
                                                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                    title={selectedTicket.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                                                >
                                                    <Star size={14} className={selectedTicket.isFavorite ? 'fill-amber-400' : ''} />
                                                </button>

                                                {/* Marcar como lido/não lido */}
                                                <button
                                                    onClick={() => handleToggleRead(selectedTicket)}
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                        selectedTicket.isRead 
                                                            ? 'bg-slate-50 border-slate-250 text-slate-500 hover:text-slate-700' 
                                                            : 'bg-purple-50 border-purple-250 text-purple-600 hover:text-purple-700'
                                                    }`}
                                                    title={selectedTicket.isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                                                >
                                                    <MailOpen size={14} />
                                                </button>

                                                {/* Dropdown Status */}
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-xs font-semibold">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase select-none">Status:</span>
                                                    <select
                                                        value={selectedTicket.status}
                                                        onChange={(e) => handleUpdateTicketStatus(selectedTicket._id, e.target.value)}
                                                        className="bg-transparent focus:outline-none text-slate-700 font-bold cursor-pointer"
                                                    >
                                                        <option value="novo">Novo</option>
                                                        <option value="em_atendimento">Em Atendimento</option>
                                                        <option value="resolvido">Resolvido</option>
                                                        <option value="arquivado">Arquivado</option>
                                                    </select>
                                                </div>

                                                {/* Excluir ticket */}
                                                <button
                                                    onClick={() => handleDeleteTicket(selectedTicket._id)}
                                                    className="p-2 bg-white border border-slate-250 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                                                    title="Excluir ticket permanentemente"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Área com Scroll do Conteúdo */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)', backgroundSize: '14px 14px' }}>
                                            {/* Mensagem Original */}
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Mensagem do Usuário</h4>
                                                <div 
                                                    className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-700 text-xs sm:text-sm leading-relaxed font-medium shadow-xs max-h-[300px] overflow-y-auto"
                                                    dangerouslySetInnerHTML={{ __html: selectedTicket.message }}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                {/* Anotações Internas */}
                                                <div className="space-y-2 flex flex-col">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Anotações Internas (Administração)</h4>
                                                    <textarea
                                                        value={ticketNotes}
                                                        onChange={(e) => setTicketNotes(e.target.value)}
                                                        placeholder="Digite anotações ou observações para controle interno..."
                                                        rows={4}
                                                        className="w-full flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 resize-none min-h-[120px]"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveTicketNotes(selectedTicket._id)}
                                                        disabled={savingNotes}
                                                        className="mt-2 w-fit px-4 py-2 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                                                    >
                                                        {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
                                                    </button>
                                                </div>

                                                {/* Formulário de Resposta */}
                                                <div className="space-y-2 flex flex-col">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Responder ao Usuário (via E-mail)</h4>
                                                    <RichTextEditor
                                                        value={replyText}
                                                        onChange={setReplyText}
                                                        placeholder={`Escreva uma resposta direta para o e-mail: ${selectedTicket.senderEmail}...`}
                                                        minHeight="120px"
                                                    />
                                                    <button
                                                        onClick={() => handleSendReply(selectedTicket._id)}
                                                        disabled={sendingReply || !replyText.trim()}
                                                        className="mt-2 w-fit px-5 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        {sendingReply ? (
                                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                        ) : (
                                                            <Send size={12} />
                                                        )}
                                                        Enviar Resposta
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 animate-fade-in">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-4 shadow-inner">
                                            <LifeBuoy size={28} className="animate-spin" style={{ animationDuration: '6s' }} />
                                        </div>
                                        <h4 className="text-slate-800 text-sm font-bold">Nenhum Ticket Selecionado</h4>
                                        <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed mt-1">
                                            Selecione um ticket de ajuda na lista lateral para gerenciar os detalhes, salvar observações internas e responder diretamente via e-mail.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                                                            {/* TAB: INSTITUTIONAL EMAILS (Sem conta selecionada) */}
                    {activeTab === 'institutional-emails' && selectedInstEmail === null && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Header de Ações Rápidas */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                                <div>
                                    <h3 className="text-slate-800 text-base font-extrabold tracking-tight">Gerenciamento de E-mails Institucionais</h3>
                                    <p className="text-slate-500 text-xs mt-0.5">Selecione uma conta ativa abaixo para visualizar mensagens ou gerencie os redirecionamentos.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewInstEmailPrefix('');
                                        setNewInstEmailDisplayName('');
                                        setNewInstEmailForwarding('');
                                        setShowInstConfigModal(true);
                                    }}
                                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-750 active:bg-purple-850 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Sliders size={13} />
                                    Configurar Roteamentos De-Para
                                </button>
                            </div>

                            {/* Grid de Contas */}
                            {loadingInstitutional ? (
                                <div className="py-20 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-xs min-h-[300px]">
                                    <span className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                                    <span className="text-xs font-semibold text-slate-400">Carregando contas...</span>
                                </div>
                            ) : institutionalEmails.length === 0 ? (
                                <div className="py-20 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 shadow-xs min-h-[300px]">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-4 shadow-inner">
                                        <Mail size={28} className="text-slate-300" />
                                    </div>
                                    <h4 className="text-slate-800 text-sm font-bold">Nenhuma Conta Configurada</h4>
                                    <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed mt-1 mb-4">
                                        Comece configurando seu primeiro e-mail institucional corporativo.
                                    </p>
                                    <button
                                        onClick={() => setShowInstConfigModal(true)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                                    >
                                        Configurar Primeiro E-mail
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {institutionalEmails.map((email) => {
                                        const redir = emailRedirections.find(
                                            (r) => r.sourceEmail.toLowerCase() === email.toLowerCase()
                                        );
                                        return (
                                            <div
                                                key={email}
                                                onClick={() => {
                                                    setSelectedInstEmail(email);
                                                    setSelectedInstMessage(null);
                                                }}
                                                className="bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:bg-purple-500/10 transition-colors" />
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl group-hover:bg-purple-100 transition-colors">
                                                            <Mail size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-slate-800 font-extrabold text-sm truncate">{redir?.displayName || 'Sem Nome'}</h4>
                                                            <p className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">Conta Institucional</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 pt-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">E-mail Oficial</span>
                                                            <span className="text-slate-700 font-bold text-xs truncate">{email}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Redireciona Para</span>
                                                            <span className="text-purple-650 font-bold text-xs truncate">{redir?.targetEmail || 'Não Configurado'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-450 group-hover:text-purple-600 transition-colors">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Acessar Caixa de Entrada</span>
                                                    <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: INSTITUTIONAL EMAILS (Com conta selecionada) */}
                    {activeTab === 'institutional-emails' && selectedInstEmail !== null && (
                        <div className="space-y-4 animate-fade-in-up">
                            {/* Toolbar superior da conta selecionada */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedInstEmail(null);
                                            setSelectedInstMessage(null);
                                        }}
                                        className="p-2 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                                        title="Voltar para a seleção de contas"
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-slate-800 text-sm font-extrabold truncate">
                                                {emailRedirections.find(r => r.sourceEmail.toLowerCase() === selectedInstEmail.toLowerCase())?.displayName || 'Sem Nome'}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-purple-50 text-purple-650 text-[9px] font-bold rounded-md border border-purple-100 select-none shrink-0">
                                                Ativo
                                            </span>
                                        </div>
                                        <p className="text-slate-455 text-[10px] font-bold truncate mt-0.5">{selectedInstEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setNewEmailSender(selectedInstEmail);
                                            setNewEmailTo('');
                                            setNewEmailSubject('');
                                            setNewEmailMessage('');
                                            setShowNewEmailModal(true);
                                        }}
                                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5"
                                    >
                                        <Plus size={13} />
                                        Iniciar Nova Conversa
                                    </button>
                                    <button
                                        onClick={() => setShowInstConfigModal(true)}
                                        className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                                        title="Editar Configurações De-Para"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Caixa de Entrada em Duas Colunas */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                                {/* Lista de Mensagens (Coluna Esquerda) */}
                                <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                                    {/* Busca e Filtros Rápidos */}
                                    <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar e-mails..."
                                                value={instSearch}
                                                onChange={(e) => setInstSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 transition-all"
                                            />
                                        </div>

                                        {/* Filtros de Status */}
                                        <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                                            {[
                                                { id: 'all', label: 'Todos' },
                                                { id: 'novo', label: 'Novos' },
                                                { id: 'em_atendimento', label: 'Em Fila' },
                                                { id: 'resolvido', label: 'Resolvidos' },
                                                { id: 'arquivado', label: 'Arquivados' }
                                            ].map((pill) => (
                                                <button
                                                    key={pill.id}
                                                    onClick={() => setInstStatusFilter(pill.id)}
                                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                                                        instStatusFilter === pill.id
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-slate-50 border border-slate-150 text-slate-500 hover:bg-slate-100 hover:text-slate-750'
                                                    }`}
                                                >
                                                    {pill.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lista com scroll interno */}
                                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/20">
                                        {loadingInstitutional ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                                                <span className="text-xs font-semibold text-slate-400">Carregando mensagens...</span>
                                            </div>
                                        ) : instMessages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-3 shadow-inner">
                                                    <Mail size={22} className="text-slate-300" />
                                                </div>
                                                <h4 className="text-slate-800 text-xs font-bold">Nenhum E-mail Recebido</h4>
                                                <p className="text-[10px] text-slate-400 font-medium max-w-[200px] leading-relaxed mt-1">
                                                    As mensagens recebidas por esta conta serão exibidas aqui.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-0">
                                                {instMessages.map((msg) => {
                                                    const initials = getInitials(msg.senderName || msg.senderEmail);
                                                    const isSelected = selectedInstMessage?._id === msg._id;
                                                    
                                                    const statusColors = {
                                                        novo: 'bg-purple-50 text-purple-700 border-purple-100',
                                                        em_atendimento: 'bg-blue-50 text-blue-700 border-blue-100',
                                                        lido: 'bg-slate-50 text-slate-600 border-slate-100',
                                                        resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                                        arquivado: 'bg-slate-100 text-slate-500 border-slate-200'
                                                    };

                                                    return (
                                                        <div
                                                            key={msg._id}
                                                            onClick={() => {
                                                                setSelectedInstMessage(msg);
                                                                setInstNotes(msg.notes || '');
                                                                setReplyInstText('');
                                                                if (!msg.isRead) {
                                                                    handleToggleInstRead(msg);
                                                                }
                                                            }}
                                                            className={`p-4 flex gap-3 cursor-pointer transition-all border-l-3 ${
                                                                isSelected 
                                                                    ? 'bg-purple-50/30 border-purple-600 shadow-xs' 
                                                                    : 'hover:bg-slate-50/50 border-transparent bg-white'
                                                            }`}
                                                        >
                                                            <div className="relative shrink-0 select-none">
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-purple-700 border border-purple-100 ${
                                                                    isSelected ? 'bg-purple-100' : 'bg-purple-50/70'
                                                                }`}>
                                                                    {initials}
                                                                </div>
                                                                {!msg.isRead && (
                                                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] text-slate-505 font-bold truncate max-w-[120px]">
                                                                        {msg.senderName || msg.senderEmail}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 font-bold shrink-0">
                                                                        {new Date(msg.createdAt).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                </div>
                                                                <h4 className={`text-xs truncate ${!msg.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                                    {msg.subject}
                                                                </h4>
                                                                <div className="pt-1 flex items-center justify-between">
                                                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${statusColors[msg.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                                        {msg.status === 'em_atendimento' ? 'Em Fila' : msg.status.toUpperCase()}
                                                                    </span>
                                                                    {msg.isFavorite && (
                                                                        <Star size={11} className="fill-amber-400 text-amber-500 shrink-0" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Visualizador de Detalhes (Coluna Direita) */}
                                <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                                    {selectedInstMessage ? (
                                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                                            {/* Header do e-mail selecionado */}
                                            <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/20 shrink-0">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-slate-800 text-sm font-extrabold leading-tight truncate">{selectedInstMessage.subject}</h3>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-slate-500 font-medium">
                                                        <span>Remetente:</span>
                                                        <span className="font-bold text-slate-700 truncate">{selectedInstMessage.senderName ? `${selectedInstMessage.senderName} <${selectedInstMessage.senderEmail}>` : selectedInstMessage.senderEmail}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 select-none shrink-0 ml-4">
                                                    {/* Botão Favoritar */}
                                                    <button
                                                        onClick={() => handleToggleInstFavorite(selectedInstMessage)}
                                                        className={`p-2 border rounded-xl transition-all cursor-pointer shadow-xs ${
                                                            selectedInstMessage.isFavorite
                                                                ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                                                                : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                        title="Favoritar e-mail"
                                                    >
                                                        <Star size={13} className={selectedInstMessage.isFavorite ? 'fill-amber-400' : ''} />
                                                    </button>

                                                    {/* Seletor de Status do Ticket */}
                                                    <select
                                                        value={selectedInstMessage.status}
                                                        onChange={(e) => handleUpdateInstStatus(selectedInstMessage._id, e.target.value)}
                                                        className="p-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 bg-white hover:bg-slate-50 cursor-pointer focus:outline-none"
                                                    >
                                                        <option value="novo">Novo</option>
                                                        <option value="em_atendimento">Em Fila</option>
                                                        <option value="lido">Lido</option>
                                                        <option value="resolvido">Resolvido</option>
                                                        <option value="arquivado">Arquivado</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Histórico / Corpo da Conversa com Scroll */}
                                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)', backgroundSize: '14px 14px' }}>
                                                {/* Timeline de Mensagens */}
                                                <div className="space-y-4">
                                                    {/* Mensagem Original */}
                                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative">
                                                        <div className="flex justify-between items-start gap-4 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
                                                                <span className="text-[10px] font-extrabold text-purple-650 uppercase tracking-widest">E-mail Recebido do Cliente</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-bold">
                                                                {new Date(selectedInstMessage.createdAt).toLocaleString('pt-BR')}
                                                            </span>
                                                        </div>
                                                        <div 
                                                            className="text-xs text-slate-700 leading-relaxed font-medium"
                                                            dangerouslySetInnerHTML={{ __html: selectedInstMessage.message }}
                                                        />
                                                    </div>

                                                    {/* Respostas do Proxy */}
                                                    {selectedInstMessage.replies && selectedInstMessage.replies.length > 0 && (
                                                        <div className="space-y-4 pt-2 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                                            {selectedInstMessage.replies.map((reply: any, idx: number) => (
                                                                <div key={reply._id || idx} className="ml-12 bg-purple-50/20 border border-purple-100 rounded-2xl p-5 shadow-xs relative">
                                                                    <div className="flex justify-between items-start gap-4 mb-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                                                            <span className="text-[10px] font-extrabold text-emerald-650 uppercase tracking-widest">Resposta Enviada pelo Proxy</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                                            {new Date(reply.createdAt).toLocaleString('pt-BR')}
                                                                        </span>
                                                                    </div>
                                                                    <div 
                                                                        className="text-xs text-slate-700 leading-relaxed font-medium"
                                                                        dangerouslySetInnerHTML={{ __html: reply.message }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Painel de Ações e Resposta Rápida (Rodapé) */}
                                            <div className="p-5 border-t border-slate-150 bg-white shrink-0">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Anotações Internas */}
                                                    <div className="flex flex-col space-y-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Anotações Administrativas</span>
                                                        <textarea
                                                            value={instNotes}
                                                            onChange={(e) => setInstNotes(e.target.value)}
                                                            placeholder="Observações internas visíveis apenas para a equipe..."
                                                            rows={3}
                                                            className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium placeholder-slate-450 resize-none flex-1 min-h-[80px]"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveInstNotes(selectedInstMessage._id)}
                                                            disabled={savingInstNotes}
                                                            className="w-fit px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white text-[10px] font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
                                                        >
                                                            {savingInstNotes ? 'Salvando...' : 'Salvar Observações'}
                                                        </button>
                                                    </div>

                                                    {/* Responder ao Cliente */}
                                                    <div className="flex flex-col space-y-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Responder para {selectedInstMessage.senderEmail}</span>
                                                        <RichTextEditor
                                                            value={replyInstText}
                                                            onChange={setReplyInstText}
                                                            placeholder="Sua resposta será enviada como o e-mail institucional oficial..."
                                                            minHeight="80px"
                                                        />
                                                        <div className="flex justify-between items-center">
                                                            <button
                                                                onClick={() => handleSendInstReply(selectedInstMessage._id)}
                                                                disabled={sendingInstReply || !replyInstText.trim()}
                                                                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                                                            >
                                                                {sendingInstReply ? (
                                                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                ) : (
                                                                    <Send size={11} />
                                                                )}
                                                                Responder Cliente
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteInstMessage(selectedInstMessage._id)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                                                title="Excluir conversa permanentemente"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-3 shadow-inner">
                                                <MailOpen size={24} className="text-slate-300 animate-pulse" />
                                            </div>
                                            <h4 className="text-slate-800 text-xs font-bold">Nenhum E-mail Selecionado</h4>
                                            <p className="text-[10px] text-slate-450 font-medium max-w-[200px] leading-relaxed mt-1">
                                                Selecione uma mensagem na caixa de entrada lateral para visualizar o conteúdo e responder.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL DE CONFIGURAÇÃO DE CONTAS DE-PARA */}
                    {showInstConfigModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/20 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-50 text-purple-650 rounded-2xl border border-purple-100">
                                            <Sliders size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-800 text-base font-extrabold tracking-tight">Configurar Redirecionamentos De-Para</h3>
                                            <p className="text-slate-455 text-xs mt-0.5">Associe contas institucionais oficiais a e-mails privados para encaminhamento automático.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowInstConfigModal(false);
                                            fetchInstitutionalData(); // atualiza dados
                                        }}
                                        className="p-2 hover:bg-slate-100 text-slate-455 hover:text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Corpo com split formulário/tabela */}
                                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                                    {/* Formulário (Esquerda) */}
                                    <div className="lg:col-span-5 bg-slate-50/50 border border-slate-150 rounded-2xl p-5 h-fit space-y-4">
                                        <div>
                                            <h4 className="text-slate-800 font-extrabold text-xs">Vincular Nova Conta</h4>
                                            <p className="text-slate-400 text-[9px] font-bold uppercase mt-0.5 tracking-wider">Configure um novo de-para</p>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Prefixo */}
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Prefixo do E-mail</span>
                                                <div className="relative flex items-center select-none">
                                                    <input
                                                        type="text"
                                                        value={newInstEmailPrefix}
                                                        onChange={(e) => setNewInstEmailPrefix(e.target.value)}
                                                        placeholder="ex: contato"
                                                        className="w-full text-right pr-2 pl-3 py-2.5 text-xs bg-white border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700 placeholder-slate-400 transition-all"
                                                    />
                                                    <span className="bg-slate-100 border-y border-r border-slate-200 text-slate-500 px-3 py-2.5 text-xs font-bold rounded-r-xl">
                                                        @mimochat.com.br
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Nome de exibição */}
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Nome de Exibição (Remetente)</span>
                                                <input
                                                    type="text"
                                                    value={newInstEmailDisplayName}
                                                    onChange={(e) => setNewInstEmailDisplayName(e.target.value)}
                                                    placeholder="ex: Edmilson Viriato"
                                                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all"
                                                />
                                            </div>

                                            {/* E-mail de Redirecionamento */}
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Redirecionar para (Privado)</span>
                                                <input
                                                    type="email"
                                                    value={newInstEmailForwarding}
                                                    onChange={(e) => setNewInstEmailForwarding(e.target.value)}
                                                    placeholder="ex: pessoal@gmail.com"
                                                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAddInstitutionalEmail}
                                            disabled={addingInstEmail || !newInstEmailPrefix.trim() || !newInstEmailDisplayName.trim() || !newInstEmailForwarding.trim()}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10"
                                        >
                                            {addingInstEmail ? (
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <Check size={13} />
                                            )}
                                            Salvar Roteamento
                                        </button>
                                    </div>

                                    {/* Tabela de Contas (Direita) */}
                                    <div className="lg:col-span-7 flex flex-col min-h-0 bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                                        <div className="p-4 border-b border-slate-100 bg-slate-50/20">
                                            <h4 className="text-slate-800 font-extrabold text-xs">Contas Ativas</h4>
                                            <p className="text-slate-450 text-[9px] font-bold uppercase mt-0.5 tracking-wider">Lista de e-mails mapeados no sistema</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {institutionalEmails.length === 0 ? (
                                                <div className="py-20 text-center text-xs font-semibold text-slate-450">
                                                    Nenhum roteamento cadastrado.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50/50 border-b border-slate-150 text-[9px] font-bold text-slate-450 uppercase tracking-widest select-none">
                                                            <th className="p-3 pl-4">E-mail Oficial / Nome</th>
                                                            <th className="p-3">Redirecionamento</th>
                                                            <th className="p-3 text-center">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-xs">
                                                        {institutionalEmails.map((email) => {
                                                            const redir = emailRedirections.find(
                                                                (r) => r.sourceEmail.toLowerCase() === email.toLowerCase()
                                                            );
                                                            return (
                                                                <tr key={email} className="hover:bg-slate-50/30 transition-colors">
                                                                    <td className="p-3 pl-4">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-extrabold text-slate-800 text-xs">{email}</span>
                                                                            <span className="text-[10px] text-slate-455 font-medium">{redir?.displayName || 'Não configurado'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 font-bold text-purple-650">{redir?.targetEmail || 'Não configurado'}</td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex justify-center gap-1.5">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const prefix = email.split('@')[0];
                                                                                    setNewInstEmailPrefix(prefix);
                                                                                    setNewInstEmailDisplayName(redir?.displayName || '');
                                                                                    setNewInstEmailForwarding(redir?.targetEmail || '');
                                                                                }}
                                                                                className="p-2 border border-slate-200 hover:border-purple-200 text-slate-400 hover:text-purple-600 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                                                                                title="Editar roteamento"
                                                                            >
                                                                                <Sliders size={12} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteInstitutionalEmail(email)}
                                                                                className="p-2 border border-slate-200 hover:border-rose-150 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                                                                                title="Excluir roteamento"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL DE INICIAR NOVA CONVERSA (NOVO E-MAIL) */}
                    {showNewEmailModal && selectedInstEmail && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in-up">
                                {/* Header */}
                                <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl border border-purple-100">
                                            <MailPlus size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-800 text-sm font-extrabold tracking-tight font-sans">Iniciar Nova Conversa</h3>
                                            <p className="text-slate-450 text-[10px] font-bold mt-0.5">Envia um e-mail do zero usando seu remetente institucional oficial.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowNewEmailModal(false)}
                                        className="p-2 hover:bg-slate-100 text-slate-455 hover:text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Formulário */}
                                <div className="p-6 space-y-4">
                                    {/* De */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Remetente (De)</span>
                                        <input
                                            type="text"
                                            value={selectedInstEmail}
                                            disabled
                                            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed select-none"
                                        />
                                    </div>

                                    {/* Para */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Destinatário (Para)</span>
                                        <input
                                            type="email"
                                            value={newEmailTo}
                                            onChange={(e) => setNewEmailTo(e.target.value)}
                                            placeholder="ex: cliente-destino@gmail.com"
                                            className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all"
                                        />
                                    </div>

                                    {/* Assunto */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Assunto</span>
                                        <input
                                            type="text"
                                            value={newEmailSubject}
                                            onChange={(e) => setNewEmailSubject(e.target.value)}
                                            placeholder="Informe o assunto do e-mail..."
                                            className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all"
                                        />
                                    </div>

                                    {/* Mensagem */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block">Mensagem</span>
                                        <RichTextEditor
                                        value={newEmailMessage}
                                        onChange={setNewEmailMessage}
                                        placeholder="Escreva sua mensagem aqui..."
                                        minHeight="140px"
                                    />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50/50 border-t border-slate-150 flex justify-end gap-2 shrink-0">
                                    <button
                                        onClick={() => setShowNewEmailModal(false)}
                                        className="px-4 py-2 hover:bg-slate-150/60 border border-slate-200 text-slate-500 hover:text-slate-800 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await handleSendNewEmail();
                                            setShowNewEmailModal(false);
                                            fetchInstitutionalData(); // atualiza a caixa de entrada
                                        }}
                                        disabled={sendingNewEmail || !newEmailTo.trim() || !newEmailSubject.trim() || !newEmailMessage.trim()}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        {sendingNewEmail ? (
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <Send size={11} />
                                        )}
                                        Enviar E-mail
                                    </button>
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

            {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CUPOM */}
            {couponModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                    <Ticket size={20} />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 text-base font-bold tracking-tight">
                                        {selectedCoupon ? 'Editar Cupom de Desconto' : 'Criar Novo Cupom'}
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        {selectedCoupon ? 'Altere as configurações do cupom existente.' : 'Preencha os campos para cadastrar um cupom no banco.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCouponModalOpen(false)}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSaveCoupon} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Código do Cupom</label>
                                        <input
                                            type="text"
                                            required
                                            value={cpCode}
                                            onChange={(e) => setCpCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                            placeholder="EX: PROMO100"
                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-800 uppercase"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor do Crédito (R$)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0.01"
                                            value={cpAmount}
                                            onChange={(e) => setCpAmount(e.target.value)}
                                            placeholder="50,00"
                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-850"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descrição</label>
                                    <input
                                        type="text"
                                        value={cpDescription}
                                        onChange={(e) => setCpDescription(e.target.value)}
                                        placeholder="EX: Cupom promocional de R$ 50 para novos clientes"
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Público-Alvo</label>
                                        <select
                                            value={cpTargetAudience}
                                            onChange={(e) => setCpTargetAudience(e.target.value as any)}
                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-700 cursor-pointer"
                                        >
                                            <option value="all">Todos os usuários</option>
                                            <option value="client">Apenas Clientes (compradores)</option>
                                            <option value="professional">Apenas Profissionais</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Limite de Usos (Max)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={cpMaxUses}
                                            onChange={(e) => setCpMaxUses(e.target.value)}
                                            placeholder="Ilimitado"
                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Expiração</label>
                                        <input
                                            type="date"
                                            value={cpExpiresAt}
                                            onChange={(e) => setCpExpiresAt(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 cursor-pointer"
                                        />
                                    </div>
                                    <div className="pt-5 pl-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={cpIsActive}
                                                onChange={(e) => setCpIsActive(e.target.checked)}
                                                className="accent-purple-600 rounded cursor-pointer w-4 h-4"
                                            />
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors select-none">
                                                Cupom Ativo
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCouponModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/10 cursor-pointer transition-all"
                                >
                                    {selectedCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE AUDITORIA DE RESGATES DO CUPOM */}
            {couponUsersModalOpen && auditedCoupon && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 text-base font-bold tracking-tight">
                                        Histórico de Resgates - Cupom <strong className="font-mono text-purple-700">{auditedCoupon.code}</strong>
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        Resgatado {couponUsers.length} {couponUsers.length === 1 ? 'vez' : 'vezes'} · Valor individual: R$ {(auditedCoupon.amount / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCouponUsersModalOpen(false)}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search and List */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome ou e-mail na lista de resgates..."
                                    value={couponUsersSearch}
                                    onChange={(e) => setCouponUsersSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingCouponUsers ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                                    <span className="text-xs font-semibold text-slate-400">Buscando transações de resgate...</span>
                                </div>
                            ) : couponUsers.length > 0 ? (
                                (() => {
                                    const filtered = couponUsers.filter(u => 
                                        u.name.toLowerCase().includes(couponUsersSearch.toLowerCase()) ||
                                        u.username.toLowerCase().includes(couponUsersSearch.toLowerCase()) ||
                                        u.email.toLowerCase().includes(couponUsersSearch.toLowerCase())
                                    );

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="py-20 text-center text-xs font-bold text-slate-400">
                                                Nenhum usuário correspondente à pesquisa.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="divide-y divide-slate-100">
                                            {filtered.map((u, index) => (
                                                <div key={index} className="flex items-center justify-between py-3.5 first:pt-0">
                                                    <div className="flex items-center gap-3 min-w-0 pr-3">
                                                        <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                                                            {u.photoUrl ? (
                                                                <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                getInitials(u.name)
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                                                                {u.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                                                                {u.email}
                                                            </span>
                                                            <code className="text-[8px] font-mono text-slate-400 mt-1 truncate">
                                                                @{u.username || 'sem_username'} · {u.clerkId}
                                                            </code>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Resgatado em</span>
                                                        <span className="text-xs text-slate-600 font-bold mt-0.5 block">
                                                            {new Date(u.claimedAt).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="py-20 text-center text-xs font-semibold text-slate-400">
                                    Nenhum resgate registrado para este cupom ainda.
                                </div>
                            )}
                        </div>

                        {/* Footer buttons */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setCouponUsersModalOpen(false)}
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
