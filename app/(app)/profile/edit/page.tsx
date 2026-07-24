'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile } from '@/hooks/useQueries';
import { formatCPF } from '@/components/RechargeModal';
import { Lock, ArrowLeft, Check, AlertCircle, RefreshCw } from 'lucide-react';

const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
};

const BRAZILIAN_STATES = [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
];

export default function EditProfilePage() {
    const { user } = useUser();
    const router = useTransitionRouter();
    const { data: userData, isLoading: loadingProfile } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const usernameCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [bio, setBio] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [taxId, setTaxId] = useState('');
    const [birthDate, setBirthDate] = useState('');

    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    const hasPopulated = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulated.current) {
            setName(userData.name || '');
            setUsername(userData.username || '');
            setBio(userData.bio || '');
            setState(userData.state || '');
            setCity(userData.city || '');
            setTaxId(userData.taxId ? formatCPF(userData.taxId) : '');
            setBirthDate(userData.birthDate ? new Date(userData.birthDate).toISOString().split('T')[0] : '');
            hasPopulated.current = true;
        }
    }, [userData]);

    const initialUsername = userData?.username || '';

    const checkUsernameAvailability = useCallback(async (val: string) => {
        if (!val || val === initialUsername || val.length < 2 || !/^[a-z0-9._-]+$/.test(val)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        try {
            const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(val)}`);
            if (res.ok) {
                const data = await res.json();
                setUsernameStatus(data.available ? 'available' : 'taken');
            } else {
                setUsernameStatus('idle');
            }
        } catch {
            setUsernameStatus('idle');
        }
    }, [initialUsername]);

    const handleUsernameChange = (value: string) => {
        const clean = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setUsername(clean);
        setUsernameStatus('idle');
        if (usernameCheckTimerRef.current) clearTimeout(usernameCheckTimerRef.current);
        usernameCheckTimerRef.current = setTimeout(() => checkUsernameAvailability(clean), 450);
    };

    const handleSave = async () => {
        if (usernameStatus === 'checking') {
            setSaveError('Aguarde a verificação do nome de usuário.');
            return;
        }
        if (usernameStatus === 'taken') {
            setSaveError('Este nome de usuário já está em uso. Escolha outro.');
            return;
        }

        setLoading(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updateData: any = {
                name,
                username,
                bio,
                city: city ? city.trim() : '',
                state: state ? state.trim() : '',
            };

            await updateProfileMutation.mutateAsync(updateData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            if (error.response?.status === 409) {
                setSaveError('Nome de usuário já está em uso');
            } else {
                setSaveError('Erro ao salvar alterações');
            }
        } finally {
            setLoading(false);
        }
    };

    const profileIsProfessional = !!userData?.isProfessional;

    const hasChanges =
        name !== (userData?.name || '') ||
        username !== initialUsername ||
        city !== (userData?.city || '') ||
        state !== (userData?.state || '') ||
        (profileIsProfessional && bio !== (userData?.bio || ''));

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-purple-100 selection:text-purple-900 pb-16">
            {/* Header com botão voltar */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/profile')}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
                        title="Voltar ao perfil"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">Editar Perfil</h1>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4 max-w-md w-full mx-auto">
                {/* ── SEÇÃO 1: INFORMAÇÕES PÚBLICAS DO PERFIL ── */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Informações do Perfil</p>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden divide-y divide-slate-50">
                        {/* Nome */}
                        <div className="px-4 py-3.5">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Nome de Exibição</label>
                            <input
                                className="w-full text-sm text-slate-900 font-medium placeholder-slate-300 bg-transparent focus:outline-none"
                                placeholder="Seu nome ou apelido"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Username */}
                        <div className="px-4 py-3.5">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Username</label>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-slate-300 select-none">@</span>
                                <input
                                    className="flex-1 text-sm text-slate-900 font-medium placeholder-slate-300 bg-transparent focus:outline-none"
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => handleUsernameChange(e.target.value)}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                />
                                {usernameStatus === 'checking' && (
                                    <RefreshCw className="animate-spin w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                {usernameStatus === 'available' && (
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                )}
                                {usernameStatus === 'taken' && (
                                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                )}
                            </div>
                            {usernameStatus === 'taken' && (
                                <p className="text-[10px] font-semibold text-rose-500 mt-1">Este nome de usuário já está em uso</p>
                            )}
                        </div>

                        {/* Biografia (Profissional) */}
                        {profileIsProfessional && (
                            <div className="px-4 py-3.5">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block">Biografia</label>
                                    <span className="text-[9px] text-slate-400">{bio.length}/300</span>
                                </div>
                                <textarea
                                    className="w-full text-sm text-slate-900 font-medium placeholder-slate-300 bg-transparent focus:outline-none resize-none leading-relaxed"
                                    placeholder="Escreva uma breve apresentação sobre você..."
                                    rows={3}
                                    maxLength={300}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Estado */}
                        <div className="px-4 py-3.5">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Estado (Naturalidade)</label>
                            <select
                                value={state}
                                onChange={(e) => {
                                    setState(e.target.value);
                                }}
                                className="w-full text-sm text-slate-900 font-medium bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="">Selecione seu Estado</option>
                                {BRAZILIAN_STATES.map(s => (
                                    <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>
                                ))}
                            </select>
                        </div>

                        {/* Cidade */}
                        <div className="px-4 py-3.5">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Cidade / Município</label>
                            <input
                                placeholder="Digite sua cidade"
                                className="w-full text-sm text-slate-900 font-medium bg-transparent focus:outline-none"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── SEÇÃO 2: DADOS FIXOS DE CADASTRO (SOMENTE LEITURA) ── */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Dados de Cadastro (Bloqueados)</p>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden divide-y divide-slate-50">
                        {/* E-mail (Bloqueado) */}
                        <div className="px-4 py-3.5 bg-slate-50/80">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">E-mail</label>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-300/40 select-none">
                                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                                    Bloqueado
                                </span>
                            </div>
                            <input
                                className="w-full text-sm text-slate-600 font-semibold bg-transparent focus:outline-none cursor-not-allowed select-none"
                                value={userData?.email || ''}
                                readOnly
                                disabled
                            />
                        </div>

                        {/* CPF (Bloqueado) */}
                        <div className="px-4 py-3.5 bg-slate-50/80">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">CPF</label>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-300/40 select-none">
                                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                                    Bloqueado
                                </span>
                            </div>
                            <input
                                className="w-full text-sm text-slate-600 font-semibold bg-transparent focus:outline-none cursor-not-allowed select-none"
                                placeholder="Não informado"
                                value={taxId}
                                readOnly
                                disabled
                            />
                        </div>

                        {/* Data de Nascimento (Bloqueado) */}
                        <div className="px-4 py-3.5 bg-slate-50/80">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Data de Nascimento</label>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-300/40 select-none">
                                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                                    Bloqueado
                                </span>
                            </div>
                            <input
                                className="w-full text-sm text-slate-600 font-semibold bg-transparent focus:outline-none cursor-not-allowed select-none"
                                value={birthDate ? formatDate(birthDate) : 'Não informada'}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                </div>

                {/* Botão de Salvar Alterações */}
                <div className="mt-2 flex flex-col gap-2">
                    {saveError && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            <p className="text-xs text-rose-600 font-medium">{saveError}</p>
                        </div>
                    )}
                    {saveSuccess && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <p className="text-xs text-emerald-700 font-medium">Perfil atualizado com sucesso!</p>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading || !hasChanges}
                        className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                            <RefreshCw className="animate-spin w-4 h-4 text-white" />
                        ) : (
                            <span>Salvar Alterações</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
