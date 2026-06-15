'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { userApi } from '@/services/api';
import { useMyProfile } from '@/hooks/useQueries';
import { Crown, ShieldAlert } from 'lucide-react';

export default function SearchPage() {
    const router = useRouter();
    const { data: userData } = useMyProfile();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [error, setError] = useState('');

    // Resolve a transição de visualização imediatamente para não travar a animação de volta
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    const handleSearch = async () => {
        if (!username.trim()) {
            setError('Digite um username para buscar');
            return;
        }

        setLoading(true);
        setFoundUsers([]);
        setError('');

        try {
            const data = await userApi.searchByUsername(username.trim());
            setFoundUsers(data.users || []);
        } catch (err: any) {
            if (err.response?.status === 404) {
                const code = err.response?.data?.error;
                if (code === 'incompatible_professional_status') {
                    setError('Este usuário tem o mesmo modo que você. Só é possível conversar entre quem cobra e quem não cobra.');
                } else {
                    setError('Usuário não encontrado');
                }
            } else {
                setError('Erro ao buscar usuário');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = (clerkId: string) => {
        router.push(`/chat/${clerkId}`);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.trim()) {
                handleSearch();
            } else {
                setFoundUsers([]);
                setError('');
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [username]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Buscar</span>
                </div>
                {userData?.isAdmin && (
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center"
                        title="Painel Admin"
                    >
                        <ShieldAlert className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Modern Search Bar */}
            <div className="bg-white px-4 pt-5 pb-3 shrink-0">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-600 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                        </svg>
                    </div>
                    <input
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-600/10 transition-all font-medium"
                        placeholder="Digite o @username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                    />
                    {username.length > 0 && !loading && (
                        <button 
                            onClick={() => setUsername('')}
                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 appearance-none"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    )}
                    {loading && (
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <svg className="animate-spin h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
                {error && username.length > 2 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 animate-in fade-in zoom-in">
                        <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                             </svg>
                             {error}
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {foundUsers.map((user) => (
                        <div key={user.clerkId} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100/70 transition-all duration-300 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="shrink-0 relative">
                                        <Avatar uri={user.photoUrl} size={56} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base font-semibold text-gray-900 truncate tracking-tight leading-snug">
                                                {user.name || `@${user.username}`}
                                            </h2>
                                            {user.isProfessional ? (
                                                <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95 origin-left">
                                                    Profissional
                                                </span>
                                            ) : (
                                                <span className="bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95 origin-left">
                                                    Cliente
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-purple-600 font-semibold text-xs tracking-wide mt-0.5">
                                            @{user.username}
                                        </p>
                                        
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 font-medium flex-wrap">
                                            <span>{user.isProfessional ? '💬 Pago' : '💬 Gratuito'}</span>
                                            {user.isProfessional && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-purple-600 font-bold">
                                                        R$ {(user.chargePerCharNonSubscribers ?? 0.005).toFixed(4)}/carac.
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {user.isProfessional && user.chargePerCharSubscribers !== undefined && (
                                            <p className="text-[10px] font-semibold text-purple-500 mt-0.5 flex items-center gap-1">
                                                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                                                <span>R$ {(user.chargePerCharSubscribers).toFixed(4)} para assinantes</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleStartChat(user.clerkId)}
                                    className="shrink-0 h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold tracking-wide text-xs shadow-sm hover:shadow-md shadow-purple-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                                >
                                    Conversar
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {foundUsers.length === 0 && !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-[40vh] text-center px-10 animate-in fade-in duration-700">
                        <div className="w-16 h-16 bg-gradient-to-tr from-purple-50 to-indigo-50 border border-purple-100/50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-1.5 tracking-tight">Buscar Pessoas</h2>
                        <p className="text-gray-400 text-xs font-normal leading-relaxed">
                            Digite o @username acima para encontrar<br/>outros usuários na rede.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
