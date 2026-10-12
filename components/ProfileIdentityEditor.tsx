'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyProfile, useUpdateProfile } from '@/hooks/useQueries';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export function ProfileIdentityEditor() {
    const { data: userData } = useMyProfile();
    const updateProfile = useUpdateProfile();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
    const [error, setError] = useState('');
    const populated = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialName = userData?.name || '';
    const initialUsername = userData?.username || '';

    useEffect(() => {
        if (userData && !populated.current) {
            setName(initialName);
            setUsername(initialUsername);
            populated.current = true;
        }
    }, [userData, initialName, initialUsername]);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const checkUsername = useCallback(async (value: string) => {
        if (!value || value === initialUsername || value.length < 2 || !/^[a-z0-9._-]+$/.test(value)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        try {
            const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(value)}`);
            if (!res.ok) {
                setUsernameStatus('idle');
                return;
            }
            const data = await res.json();
            setUsernameStatus(data.available ? 'available' : 'taken');
        } catch {
            setUsernameStatus('idle');
        }
    }, [initialUsername]);

    const handleUsernameChange = (value: string) => {
        const clean = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setUsername(clean);
        setUsernameStatus('idle');
        setError('');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => checkUsername(clean), 450);
    };

    const hasChanges = name.trim() !== initialName || username.trim() !== initialUsername;

    const handleSave = async () => {
        if (usernameStatus === 'checking') {
            setError('Aguarde a verificação do nome de usuário.');
            return;
        }
        if (usernameStatus === 'taken') {
            setError('Este nome de usuário já está em uso. Escolha outro.');
            return;
        }
        if (username.trim().length < 2) {
            setError('O nome de usuário deve ter pelo menos 2 caracteres.');
            return;
        }
        setError('');
        try {
            await updateProfile.mutateAsync({ name: name.trim(), username: username.trim() });
            setUsernameStatus('idle');
            toast.success('Perfil atualizado!');
        } catch (err: any) {
            setError(err?.response?.status === 409 ? 'Nome de usuário já está em uso.' : 'Erro ao salvar alterações.');
        }
    };

    return (
        <section aria-label="Identificação" className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-50">
                <div className="px-4 py-3.5">
                    <label htmlFor="profile-name" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Nome de exibição</label>
                    <input
                        id="profile-name"
                        className="w-full text-sm text-slate-900 font-medium placeholder-slate-300 bg-transparent focus:outline-none"
                        placeholder="Seu nome ou apelido"
                        value={name}
                        maxLength={60}
                        onChange={(e) => { setName(e.target.value); setError(''); }}
                    />
                </div>
                <div className="px-4 py-3.5">
                    <label htmlFor="profile-username" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Nome de usuário</label>
                    <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-300 select-none">@</span>
                        <input
                            id="profile-username"
                            className="flex-1 text-sm text-slate-900 font-medium placeholder-slate-300 bg-transparent focus:outline-none"
                            placeholder="username"
                            value={username}
                            maxLength={30}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                        />
                        {usernameStatus === 'checking' && <RefreshCw className="animate-spin w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        {usernameStatus === 'available' && <span className="text-[11px] font-bold text-emerald-600">Livre</span>}
                        {usernameStatus === 'taken' && <span className="text-[11px] font-bold text-rose-500">Em uso</span>}
                    </div>
                </div>
            </div>

            {(hasChanges || error) && (
                <div className="px-4 pb-4 pt-1 space-y-2">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                    )}
                    {hasChanges && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={updateProfile.isPending}
                            className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {updateProfile.isPending ? <RefreshCw className="animate-spin w-4 h-4" /> : 'Salvar alterações'}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
