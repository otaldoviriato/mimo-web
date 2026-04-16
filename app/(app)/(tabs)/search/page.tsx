'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { userApi } from '@/services/api';

export default function SearchPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [error, setError] = useState('');

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
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Buscar</span>
                </div>
            </div>

            {/* Modern Search Bar */}
            <div className="bg-white px-4 pt-6 pb-2 shrink-0">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-600 text-gray-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                        </svg>
                    </div>
                    <input
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-400/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all font-medium"
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-in fade-in zoom-in">
                        <p className="text-sm font-bold text-red-600 flex items-center gap-2">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                             </svg>
                             {error}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {foundUsers.map((user) => (
                        <div key={user.clerkId} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/40 relative">
                                <div className="h-24 bg-gradient-to-br from-purple-600 to-fuchsia-500 w-full" />
                                
                                <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
                                    <div className="p-1 bg-white rounded-full shadow-lg">
                                        <Avatar uri={user.photoUrl} size={80} />
                                    </div>

                                    <div className="text-center mt-3 w-full">
                                        <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">
                                            {user.name || `@${user.username}`}
                                        </h2>
                                        <p className="text-purple-600 font-bold text-xs tracking-wide">
                                            @{user.username}
                                        </p>
                                        
                                        <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                                            <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex flex-col items-center justify-center gap-1">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Tipo</span>
                                                <span className="text-[10px] font-bold text-gray-900">{user.isProfessional ? 'Profissional' : 'Cliente'}</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex flex-col items-center justify-center gap-1 text-center">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Custo</span>
                                                <span className="text-[10px] font-bold text-purple-600">
                                                    {user.isProfessional ? `R$ ${(user.chargePerCharNonSubscribers ?? 0.005).toFixed(4)}` : 'Grátis'}
                                                </span>
                                            </div>
                                        </div>
                                        {user.isProfessional && (
                                            <div className="mt-2 text-center">
                                                <p className="text-[9px] font-black text-purple-500 uppercase tracking-tighter">
                                                    💎 R$ {(user.chargePerCharSubscribers ?? 0.002).toFixed(4)} para assinantes
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => handleStartChat(user.clerkId)}
                                        className="mt-6 w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black tracking-wide text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        Conversar
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {foundUsers.length === 0 && !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-[40vh] text-center px-10 animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-purple-200">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Buscar Pessoas</h2>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            Digite o username para encontrar<br/>outros usuários na rede.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
