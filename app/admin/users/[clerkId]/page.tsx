'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Sidebar } from '@/components/admin/Sidebar';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { 
    ArrowLeft, 
    Save, 
    Trash2, 
    Plus, 
    Coins, 
    FileText, 
    Phone, 
    Key, 
    ShieldCheck, 
    Image as ImageIcon, 
    Loader2, 
    X, 
    Mail, 
    User,
    Eye,
    MessageCircle,
    AlertTriangle,
    ShieldAlert,
    Lock,
    Unlock,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserDetail {
    clerkId: string;
    username: string;
    name?: string;
    email: string;
    taxId?: string;
    phone?: string;
    photoUrl?: string;
    coverUrl?: string;
    balance: number;
    isProfessional: boolean;
    subscriptionPrice: number;
    chargePerCharSubscribers: number;
    chargePerCharNonSubscribers: number;
    pixKey?: string;
    freeCharsForNewClients?: number;
    createdAt?: string;
}

interface GalleryItemType {
    _id: string;
    imageUrl: string;
    visibility: 'public' | 'subscribers';
    createdAt: string;
}

interface ChatMessage {
    sender: string;
    text: string;
    time: string;
    cost: number;
    timestamp?: string;
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

interface WithdrawalRecord {
    id: string;
    amount: number;
    pixKey: string;
    status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
    asaasTransferId?: string | null;
    hiddenFromUser?: boolean;
    hiddenFromUserAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function UserDetailPage() {
    const { isLoaded, isSignedIn, userId: adminUserId } = useAuth();
    const params = useParams();
    const router = useRouter();
    const clerkId = params.clerkId as string;

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Estados do Formulário
    const [user, setUser] = useState<UserDetail | null>(null);
    const [gallery, setGallery] = useState<GalleryItemType[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [subscribersPage, setSubscribersPage] = useState(1);
    const [showPrivatePhotos, setShowPrivatePhotos] = useState(false);

    // Estados do Gerenciamento de Salas de Chat da Profissional
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [selectedAuditChat, setSelectedAuditChat] = useState<ChatRoom | null>(null);
    const [auditLoadingMore, setAuditLoadingMore] = useState(false);
    const [auditHasMore, setAuditHasMore] = useState(true);
    const [isFirstAuditLoad, setIsFirstAuditLoad] = useState(false);
    const auditContainerRef = useRef<HTMLDivElement>(null);
    const [galleryExpanded, setGalleryExpanded] = useState(false);
    const [pendingAuditChat, setPendingAuditChat] = useState<ChatRoom | null>(null);
    const [justificationText, setJustificationText] = useState('');

    // Inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [balance, setBalance] = useState<number>(0);
    const [isProfessional, setIsProfessional] = useState(false);
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [pixKey, setPixKey] = useState('');
    
    // Inputs adicionais de profissional
    const [subscriptionPrice, setSubscriptionPrice] = useState<number>(0);
    const [chargeSub, setChargeSub] = useState<number>(0.002);
    const [chargeNonSub, setChargeNonSub] = useState<number>(0.005);
    const [freeCharsForNewClients, setFreeCharsForNewClients] = useState<number>(500);
    const [photoUrl, setPhotoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Busca as salas de chat envolvidas
    const fetchRooms = async () => {
        setLoadingRooms(true);
        try {
            const response = await fetch(`/api/admin/rooms?userId=${clerkId}`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data.rooms || []);
            } else {
                toast.error('Erro ao buscar salas de chat.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar salas:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingRooms(false);
        }
    };

    // Abre o modal de auditoria buscando o histórico de mensagens reais
    const handleOpenAuditModal = async (chat: ChatRoom, reason: string) => {
        setSelectedAuditChat({
            ...chat,
            history: []
        });
        setAuditHasMore(true);
        setIsFirstAuditLoad(true);

        try {
            const response = await fetch(`/api/admin/rooms/${chat.id}/messages?limit=50&reason=${encodeURIComponent(reason)}`);
            if (response.ok) {
                const data = await response.json();
                const history = data.history || [];
                setSelectedAuditChat({
                    ...chat,
                    history
                });
                setAuditHasMore(history.length === 50);
            } else {
                const errData = await response.json().catch(() => ({}));
                toast.error(errData.error || 'Erro ao buscar mensagens do chat.');
            }
        } catch (error) {
            console.error('Erro de conexão ao buscar mensagens:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Auto-scroll para o fundo no carregamento inicial da auditoria
    useEffect(() => {
        if (selectedAuditChat && selectedAuditChat.history.length > 0 && isFirstAuditLoad && auditContainerRef.current) {
            auditContainerRef.current.scrollTop = auditContainerRef.current.scrollHeight;
            setIsFirstAuditLoad(false);
        }
    }, [selectedAuditChat, isFirstAuditLoad]);

    // Paginação por scroll para carregar mensagens mais antigas na auditoria
    const handleAuditScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const { scrollTop } = container;

        if (scrollTop < 50 && auditHasMore && !auditLoadingMore && selectedAuditChat && selectedAuditChat.history.length > 0) {
            setAuditLoadingMore(true);
            const oldestMsg = selectedAuditChat.history[0];
            const before = oldestMsg.timestamp;

            try {
                const response = await fetch(`/api/admin/rooms/${selectedAuditChat.id}/messages?before=${before}&limit=50`);
                if (response.ok) {
                    const data = await response.json();
                    const newMessages = data.history || [];

                    if (newMessages.length < 50) {
                        setAuditHasMore(false);
                    }

                    if (newMessages.length > 0) {
                        const previousScrollHeight = container.scrollHeight;
                        const previousScrollTop = container.scrollTop;

                        setSelectedAuditChat(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                history: [...newMessages, ...prev.history]
                            };
                        });

                        requestAnimationFrame(() => {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
                        });
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar mais mensagens de auditoria:', err);
            } finally {
                setAuditLoadingMore(false);
            }
        }
    };

    // Exclui permanentemente uma sala de chat e suas mensagens
    const handleDeleteRoom = async (chatId: string, otherName: string) => {
        const confirmDelete = window.confirm(
            `ATENÇÃO: Você deseja EXCLUIR permanentemente toda a conversa com "${otherName}"?\nEsta ação apagará todo o histórico de mensagens do banco de dados de forma definitiva e não poderá ser desfeita.`
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/admin/rooms/${chatId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Sala de chat e mensagens excluídas com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                setRooms(prev => prev.filter(r => r.id !== chatId));
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao excluir sala de chat.');
            }
        } catch (error) {
            console.error('Erro ao excluir sala de chat:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Busca os dados do usuário e autorização do admin
    useEffect(() => {
        if (!isLoaded || !clerkId) return;

        if (!isSignedIn) {
            setIsAuthorized(false);
            setLoadingData(false);
            return;
        }

        async function fetchUserDetails() {
            try {
                const response = await fetch(`/api/admin/users/${clerkId}`);
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    setGallery(data.gallery || []);
                    setWithdrawals(data.withdrawals || []);
                    setSubscribers(data.subscribers || []);
                    
                    // Preenche os states dos inputs
                    setName(data.user.name || '');
                    setEmail(data.user.email || '');
                    setUsername(data.user.username || '');
                    setBalance((data.user.balance || 0) / 100);
                    setIsProfessional(data.user.isProfessional || false);
                    setTaxId(data.user.taxId || '');
                    setPhone(data.user.phone || '');
                    setPixKey(data.user.pixKey || '');
                    setSubscriptionPrice(data.user.subscriptionPrice || 0);
                    setChargeSub(data.user.chargePerCharSubscribers !== undefined ? data.user.chargePerCharSubscribers : 0.002);
                    setChargeNonSub(data.user.chargePerCharNonSubscribers !== undefined ? data.user.chargePerCharNonSubscribers : 0.005);
                    setFreeCharsForNewClients(data.user.freeCharsForNewClients !== undefined ? data.user.freeCharsForNewClients : 500);
                    setPhotoUrl(data.user.photoUrl || '');
                    setCoverUrl(data.user.coverUrl || '');

                    setIsAuthorized(true);
                    fetchRooms();
                } else if (response.status === 403) {
                    setIsAuthorized(false);
                    toast.error('Acesso restrito a administradores.');
                } else {
                    toast.error('Erro ao carregar dados do usuário.');
                }
            } catch (error) {
                console.error('Erro de conexão ao buscar usuário:', error);
                toast.error('Não foi possível carregar os dados.');
            } finally {
                setLoadingData(false);
            }
        }

        fetchUserDetails();
    }, [isLoaded, isSignedIn, clerkId]);

    // Salva as alterações do formulário
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    username,
                    balance: balance * 100, // converte centavos
                    isProfessional,
                    taxId,
                    phone,
                    pixKey,
                    subscriptionPrice,
                    chargePerCharSubscribers: chargeSub,
                    chargePerCharNonSubscribers: chargeNonSub,
                    freeCharsForNewClients,
                    photoUrl,
                    coverUrl
                })
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                toast.success('Perfil atualizado com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await res.json();
                toast.error(err.error || 'Erro ao atualizar dados.');
            }
        } catch (error) {
            console.error('Erro ao salvar alterações:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setSaving(false);
        }
    };

    // Deleta o perfil do usuário
    const handleDeleteUser = async () => {
        if (!user) return;
        const confirmDelete = window.confirm(
            `ATENÇÃO: Você tem certeza absoluta que deseja excluir a conta de "${name || username}" permanentemente?\nEsta ação excluirá todos os dados do banco de dados e do Clerk e não poderá ser desfeita.`
        );

        if (!confirmDelete) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Usuário excluído de forma definitiva!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                router.replace(`/admin?tab=${isProfessional ? 'professionals' : 'clients'}`);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao excluir conta.');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setSaving(false);
        }
    };


    // Remove foto da galeria
    const handleDeletePhoto = async (itemId: string) => {
        const confirmDelete = window.confirm('Deseja realmente remover esta foto da galeria?');
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/admin/users/${clerkId}/gallery?itemId=${itemId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Foto removida com sucesso!');
                setGallery(prev => prev.filter(item => item._id !== itemId));
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao remover foto.');
            }
        } catch (error) {
            console.error('Erro ao deletar foto:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Alterna a visibilidade da foto da galeria (Pública vs Assinantes)
    const handleToggleVisibility = async (itemId: string, currentVisibility: 'public' | 'subscribers') => {
        const newVisibility = currentVisibility === 'subscribers' ? 'public' : 'subscribers';
        try {
            const response = await fetch(`/api/admin/users/${clerkId}/gallery`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, visibility: newVisibility })
            });

            if (response.ok) {
                toast.success(`Visibilidade alterada para ${newVisibility === 'public' ? 'Pública' : 'Assinantes'}!`);
                setGallery(prev => prev.map(item => item._id === itemId ? { ...item, visibility: newVisibility } : item));
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao alterar visibilidade.');
            }
        } catch (error) {
            console.error('Erro ao alterar visibilidade da foto:', error);
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Faz upload de nova foto para a galeria
    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('visibility', 'public');

        try {
            const response = await fetch(`/api/admin/users/${clerkId}/gallery`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Foto adicionada à galeria com sucesso!');
                setGallery(prev => [data.item, ...prev]);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao fazer upload da foto.');
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSidebarTabChange = (tabId: string) => {
        router.push(`/admin?tab=${tabId}`);
    };

    // 1. Loading
    if (!isLoaded || loadingData) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                    <h2 className="text-white text-lg font-bold">Carregando Perfil...</h2>
                    <p className="text-slate-400 text-xs mt-1">Buscando dados cadastrais e galeria do banco...</p>
                </div>
            </div>
        );
    }

    // 2. Não Autorizado
    if (!isAuthorized) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 mx-auto">
                        <X size={32} />
                    </div>
                    <h2 className="text-white text-xl font-bold">Acesso Restrito</h2>
                    <p className="text-slate-400 text-sm">Sua conta atual não possui permissões administrativas para gerenciar perfis no backoffice.</p>
                    <button
                        onClick={() => router.replace('/admin')}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        Voltar ao Painel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans">
            {/* Sidebar Fixa à Esquerda */}
            <Sidebar activeTab={isProfessional ? 'professionals' : 'clients'} setActiveTab={handleSidebarTabChange} />

            {/* Conteúdo Principal */}
            <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader title="Editar Perfil Dedicado" />

                <main className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl w-full mx-auto pb-24">
                    {/* Botão Voltar e Cabeçalho */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.push(`/admin?tab=${isProfessional ? 'professionals' : 'clients'}`)}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
                        >
                            <ArrowLeft size={14} />
                            Voltar para {isProfessional ? 'Profissionais' : 'Clientes'}
                        </button>

                        <div className="text-right">
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-widest bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                                {isProfessional ? 'Perfil Profissional' : 'Perfil Cliente'}
                            </span>
                        </div>
                    </div>

                    {/* Preview Rápido / Capa do Usuário */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                        <div className="h-32 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 relative">
                            {coverUrl && (
                                <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="px-8 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-10 relative z-10">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-purple-100 border-4 border-white shadow-md flex items-center justify-center text-purple-600 font-black text-2xl">
                                    {name ? name.substring(0, 2).toUpperCase() : 'MI'}
                                </div>
                            )}
                            <div className="text-center sm:text-left flex-1 pb-1">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{name || username}</h2>
                                <p className="text-xs text-slate-400 font-semibold">@{username} • Clerk: {clerkId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Formulário de Dados */}
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Coluna Dados Cadastrais */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <User size={16} className="text-purple-600" />
                                    Informações Cadastrais
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome de Exibição</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Username</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">E-mail</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <FileText size={12} />
                                            CPF ou CNPJ
                                        </label>
                                        <input 
                                            type="text" 
                                            value={taxId}
                                            onChange={(e) => setTaxId(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            placeholder="Apenas números"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Phone size={12} />
                                            Telefone / WhatsApp
                                        </label>
                                        <input 
                                            type="text" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seção Profissional */}
                            {isProfessional && (
                                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                                        <Coins size={16} className="text-purple-600 animate-pulse" />
                                        Configuração de Ganhos e Mídia
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preço da Assinatura Mensal (R$)</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={subscriptionPrice}
                                                onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <Key size={12} />
                                                Chave PIX para Repasses
                                            </label>
                                            <input 
                                                type="text" 
                                                value={pixKey}
                                                onChange={(e) => setPixKey(e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                                placeholder="CPF, E-mail ou Telefone"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custo por Caractere (Assinantes)</label>
                                            <input 
                                                type="number" 
                                                step="0.0001"
                                                value={chargeSub}
                                                onChange={(e) => setChargeSub(Number(e.target.value))}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custo por Caractere (Não Assinantes)</label>
                                            <input 
                                                type="number" 
                                                step="0.0001"
                                                value={chargeNonSub}
                                                onChange={(e) => setChargeNonSub(Number(e.target.value))}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Isenção para Novos Clientes</label>
                                            <select 
                                                value={freeCharsForNewClients}
                                                onChange={(e) => setFreeCharsForNewClients(Number(e.target.value))}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            >
                                                <option value={0}>Desativado (Cobrar desde o início)</option>
                                                <option value={500}>Ativado (Primeiros 500 caracteres grátis)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">URL do Avatar (Foto do Perfil)</label>
                                            <input 
                                                type="text" 
                                                value={photoUrl}
                                                onChange={(e) => setPhotoUrl(e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">URL da Foto de Capa</label>
                                            <input 
                                                type="text" 
                                                value={coverUrl}
                                                onChange={(e) => setCoverUrl(e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Coluna Financeira e Tipo de Conta */}
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <Coins size={16} className="text-amber-500" />
                                    Saldo e Cargo
                                </h3>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Saldo da Carteira (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={balance}
                                        onChange={(e) => setBalance(Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                        <input 
                                            type="checkbox"
                                            checked={isProfessional}
                                            onChange={(e) => setIsProfessional(e.target.checked)}
                                            className="accent-purple-600 rounded cursor-pointer w-4 h-4"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">Perfil Profissional</span>
                                            <span className="text-[10px] text-slate-400 font-medium block leading-tight">Profissionais vendem assinatura e cobram por caractere de mensagens.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Ações do Formulário */}
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/10"
                                >
                                    {saving ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Save size={14} />
                                    )}
                                    {saving ? 'Gravando dados...' : 'Salvar Alterações'}
                                </button>

                                <button 
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={saving}
                                    className="w-full py-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 disabled:opacity-50 text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-rose-100"
                                >
                                    <Trash2 size={14} />
                                    Excluir Conta Permanentemente
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Assinantes Ativos (Apenas se for profissional) */}
                    {isProfessional && (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <User size={16} className="text-purple-600" />
                                    Assinantes Ativos ({subscribers.length})
                                </h3>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Lista de usuários com assinatura ativa para este perfil profissional.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">Usuário</th>
                                            <th className="py-4 px-6">E-mail</th>
                                            <th className="py-4 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {subscribers.length > 0 ? (
                                            subscribers
                                                .slice((subscribersPage - 1) * 5, subscribersPage * 5)
                                                .map((subscriber) => {
                                                    const initials = subscriber.name ? 
                                                        (subscriber.name.split(' ').length >= 2 ? `${subscriber.name.split(' ')[0][0]}${subscriber.name.split(' ')[1][0]}` : subscriber.name.substring(0, 2)) : 'US';
                                                    return (
                                                        <tr key={subscriber.clerkId} className="hover:bg-slate-50/40 transition-colors group">
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-2.5">
                                                                    {subscriber.photoUrl ? (
                                                                        <img src={subscriber.photoUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-750 border border-purple-100 flex items-center justify-center font-bold text-xs">
                                                                            {initials.toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-xs font-bold text-slate-800 leading-tight truncate">{subscriber.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-semibold truncate">@{subscriber.username}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-6">
                                                                <span className="text-xs font-medium text-slate-600">{subscriber.email}</span>
                                                            </td>
                                                            <td className="py-4 px-6 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.push(`/admin/users/${subscriber.clerkId}`)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                                                                >
                                                                    Ver Perfil
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-12 text-center text-xs font-semibold text-slate-400">
                                                    Nenhum assinante ativo para este perfil até o momento.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Controles de Paginação */}
                            {subscribers.length > 5 && (
                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        Mostrando {Math.min((subscribersPage - 1) * 5 + 1, subscribers.length)} a {Math.min(subscribersPage * 5, subscribers.length)} de {subscribers.length} assinantes
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={subscribersPage === 1}
                                            onClick={() => setSubscribersPage(prev => Math.max(prev - 1, 1))}
                                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                                        >
                                            Anterior
                                        </button>
                                        <span className="text-xs font-bold text-slate-650 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                                            {subscribersPage} / {Math.ceil(subscribers.length / 5)}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={subscribersPage >= Math.ceil(subscribers.length / 5)}
                                            onClick={() => setSubscribersPage(prev => Math.min(prev + 1, Math.ceil(subscribers.length / 5)))}
                                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                                        >
                                            Próxima
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Galeria de Fotos (Apenas se for profissional) */}
                    {isProfessional && (() => {
                        const publicPhotos = gallery.filter(item => item.visibility !== 'subscribers');
                        const privatePhotos = gallery.filter(item => item.visibility === 'subscribers');

                        return (
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <ImageIcon size={16} className="text-purple-600" />
                                            Galeria de Fotos do Perfil
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Gerencie os conteúdos visuais exibidos na galeria pública e assinante desta profissional.</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                                    >
                                        {uploadingPhoto ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <Plus size={13} />
                                        )}
                                        Adicionar Foto
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleUploadPhoto}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>

                                {gallery.length > 0 ? (
                                    <div className="space-y-8">
                                        {/* Categoria: Galeria Pública */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Eye size={14} className="text-slate-500" />
                                                    Galeria Pública ({publicPhotos.length})
                                                </h4>
                                            </div>
                                            
                                            {publicPhotos.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                    {publicPhotos.map((item) => (
                                                        <div key={item._id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 group shadow-sm">
                                                            <img 
                                                                src={item.imageUrl} 
                                                                alt="Galeria Pública Item" 
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                            />
                                                            <div className="absolute top-2 left-2 z-20 px-2 py-0.5 text-[9px] font-bold bg-slate-650/80 backdrop-blur-sm text-white rounded-md shadow flex items-center gap-0.5 select-none">
                                                                <Eye size={9} />
                                                                Pública
                                                            </div>
                                                            {/* Overlay hover para deletar e alterar visibilidade */}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-10">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleVisibility(item._id, item.visibility)}
                                                                    className="p-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl shadow-md transition-all hover:scale-110 cursor-pointer"
                                                                    title="Tornar Exclusiva (Assinantes)"
                                                                >
                                                                    <Lock size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeletePhoto(item._id)}
                                                                    className="p-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl shadow-md transition-all hover:scale-110 cursor-pointer"
                                                                    title="Excluir Foto"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                                    Nenhuma foto na galeria pública desta profissional.
                                                </div>
                                            )}
                                        </div>

                                        {/* Categoria: Galeria Privada (Assinantes) */}
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between pb-2">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Lock size={14} className="text-amber-500" />
                                                    Galeria Privada / Assinantes ({privatePhotos.length})
                                                </h4>
                                                {privatePhotos.length > 0 && showPrivatePhotos && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPrivatePhotos(false)}
                                                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-all border border-slate-200 cursor-pointer"
                                                    >
                                                        Ocultar Fotos
                                                    </button>
                                                )}
                                            </div>

                                            {privatePhotos.length > 0 ? (
                                                !showPrivatePhotos ? (
                                                    /* Painel de Fotos Ocultadas */
                                                    <div className="py-10 flex flex-col items-center justify-center bg-slate-50 border border-slate-200/60 rounded-2xl text-center space-y-3.5 shadow-xs">
                                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                            <Lock size={20} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-slate-700">Esta galeria contém {privatePhotos.length} fotos privadas</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">As mídias privadas estão ocultas por padrão nesta tela de auditoria.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPrivatePhotos(true)}
                                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                                                        >
                                                            Exibir Fotos Privadas
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Fotos Reveladas */
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                        {privatePhotos.map((item) => (
                                                            <div key={item._id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 group shadow-sm">
                                                                <img 
                                                                    src={item.imageUrl} 
                                                                    alt="Galeria Privada Item" 
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                                />
                                                                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded-md shadow flex items-center gap-0.5 select-none">
                                                                    <Lock size={9} />
                                                                    Assinantes
                                                                </div>
                                                                {/* Overlay hover para deletar e alterar visibilidade */}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-10">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleVisibility(item._id, item.visibility)}
                                                                        className="p-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl shadow-md transition-all hover:scale-110 cursor-pointer"
                                                                        title="Tornar Pública"
                                                                    >
                                                                        <Unlock size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeletePhoto(item._id)}
                                                                        className="p-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl shadow-md transition-all hover:scale-110 cursor-pointer"
                                                                        title="Excluir Foto"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            ) : (
                                                <div className="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                                    Nenhuma foto na galeria privada desta profissional.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                                        Nenhuma foto na galeria desta profissional até o momento.
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Histórico de Retiradas */}
                    {isProfessional && (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Coins size={16} className="text-purple-600" />
                                    Histórico de Retiradas
                                </h3>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Veja as retiradas solicitadas por esta profissional.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-6">Valor</th>
                                            <th className="py-4 px-6">Chave Pix</th>
                                            <th className="py-4 px-6">Solicitada em</th>
                                            <th className="py-4 px-6">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {withdrawals.length > 0 ? (
                                            withdrawals.map((withdrawal) => (
                                                <tr key={withdrawal.id} className="hover:bg-slate-50/40 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <span className="text-sm font-extrabold text-slate-800">
                                                            {withdrawal.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit break-all">
                                                            {withdrawal.pixKey}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                                                        {withdrawal.createdAt}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col items-start">
                                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                                                withdrawal.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                withdrawal.status === 'processando' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                withdrawal.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                'bg-rose-50 text-rose-700 border-rose-100'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    withdrawal.status === 'concluido' ? 'bg-emerald-500' :
                                                                    withdrawal.status === 'processando' ? 'bg-blue-500' :
                                                                    withdrawal.status === 'pendente' ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`} />
                                                                {withdrawal.status === 'concluido' ? 'Pago' :
                                                                 withdrawal.status === 'processando' ? 'Processando' :
                                                                 withdrawal.status === 'pendente' ? 'Pendente' : 'Recusada'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-xs font-semibold text-slate-400">
                                                    Nenhuma retirada encontrada para esta profissional.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Salas de Chat e Auditoria */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <MessageCircle size={16} className="text-purple-600" />
                                Salas de Chat e Auditoria
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Visualize as trocas de mensagens deste perfil para fins de moderação e auditoria.</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        <th className="py-4 px-6">Contato / Participante</th>
                                        <th className="py-4 px-6">Mensagens</th>
                                        <th className="py-4 px-6">Faturamento</th>
                                        <th className="py-4 px-6">Última Mensagem</th>
                                        <th className="py-4 px-6">Último Contato</th>
                                        <th className="py-4 px-6 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingRooms ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-xs font-semibold text-slate-400">
                                                <div className="flex flex-col items-center gap-2 justify-center">
                                                    <Loader2 size={16} className="animate-spin text-purple-600" />
                                                    <span>Buscando conversas reais...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : rooms.length > 0 ? (
                                        rooms.map((chat) => {
                                            const otherParticipant = chat.userA.clerkId === clerkId ? chat.userB : chat.userA;
                                            const otherInitials = otherParticipant.name ? 
                                                (otherParticipant.name.split(' ').length >= 2 ? `${otherParticipant.name.split(' ')[0][0]}${otherParticipant.name.split(' ')[1][0]}` : otherParticipant.name.substring(0,2)) : 'US';
                                            return (
                                                <tr key={chat.id} className="hover:bg-slate-50/40 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs">
                                                                {otherInitials.toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 leading-tight truncate">{otherParticipant.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-semibold truncate">{otherParticipant.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-650 font-bold">
                                                        {chat.messagesCount}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                            <Coins size={12} className="text-amber-500" />
                                                            {chat.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-550 max-w-xs truncate" title={chat.lastMessage}>
                                                        {chat.lastMessage}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-bold">
                                                        {chat.time}
                                                    </td>
                                                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setPendingAuditChat(chat);
                                                                    setJustificationText('');
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-600 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                                                            >
                                                                <Eye size={12} />
                                                                Auditar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRoom(chat.id, otherParticipant.name)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                                                            >
                                                                <Trash2 size={12} />
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-xs font-semibold text-slate-400">
                                                Nenhuma conversa encontrada para este perfil até o momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* MODAL DE AUDITORIA DE CONVERSAS (WhatsApp Style) */}
            {selectedAuditChat && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                        <div ref={auditContainerRef} onScroll={handleAuditScroll} className="flex-1 p-6 overflow-y-auto bg-slate-950/40 space-y-4 flex flex-col">
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
                                            <p className="break-all whitespace-pre-wrap">{msg.text}</p>
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
                                        const otherParticipant = selectedAuditChat.userA.clerkId === clerkId ? selectedAuditChat.userB : selectedAuditChat.userA;
                                        handleDeleteRoom(selectedAuditChat.id, otherParticipant.name);
                                        setSelectedAuditChat(null);
                                    }}
                                    className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
                                >
                                    Excluir Conversa
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
            {/* Modal de justificativa de auditoria */}
            {pendingAuditChat && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fade-in-up">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                                <ShieldAlert size={22} />
                            </div>
                            <div>
                                <h3 className="text-slate-900 text-base font-bold tracking-tight">Justificativa de Auditoria</h3>
                                <p className="text-slate-500 text-xs font-medium">
                                    Auditoria entre <strong>{pendingAuditChat.userA.name}</strong> e <strong>{pendingAuditChat.userB.name}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Motivo do Acesso
                            </label>
                            <textarea
                                value={justificationText}
                                onChange={(e) => setJustificationText(e.target.value)}
                                placeholder="Descreva brevemente por que você precisa acessar o histórico de mensagens desta conversa..."
                                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder:text-slate-400 min-h-[100px] resize-none"
                            />
                            <span className="text-[9px] text-slate-400 font-medium block">
                                Mínimo de 5 caracteres. Este acesso será registrado para auditoria de segurança.
                            </span>
                        </div>

                        <div className="flex gap-2.5 pt-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingAuditChat(null);
                                    setJustificationText('');
                                }}
                                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (justificationText.trim().length >= 5) {
                                        handleOpenAuditModal(pendingAuditChat, justificationText.trim());
                                        setPendingAuditChat(null);
                                        setJustificationText('');
                                    }
                                }}
                                disabled={justificationText.trim().length < 5}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/10 transition-all cursor-pointer"
                            >
                                Confirmar Acesso
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
