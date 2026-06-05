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
    Sparkles
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
    createdAt?: string;
}

interface GalleryItemType {
    _id: string;
    imageUrl: string;
    visibility: 'public' | 'subscribers';
    createdAt: string;
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
    const [photoUrl, setPhotoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    setPhotoUrl(data.user.photoUrl || '');
                    setCoverUrl(data.user.coverUrl || '');

                    setIsAuthorized(true);
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
                                        <Sparkles size={16} className="text-purple-600 animate-pulse" />
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

                    {/* Galeria de Fotos (Apenas se for profissional) */}
                    {isProfessional && (
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
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {gallery.map((item) => (
                                        <div key={item._id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 group shadow-sm">
                                            <img 
                                                src={item.imageUrl} 
                                                alt="Galeria Item" 
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                            />
                                            {/* Overlay hover para deletar */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePhoto(item._id)}
                                                    className="p-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl shadow-md transition-all hover:scale-110 cursor-pointer"
                                                    title="Excluir Foto"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                                    Nenhuma foto na galeria desta profissional até o momento.
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
