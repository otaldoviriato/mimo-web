'use client';

import React, { useState } from 'react';
import { User, Crown, Check } from 'lucide-react';
import { Button } from './Button';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';

interface ProfileSelectionModalProps {
    onSuccess: () => Promise<void>;
}

export function ProfileSelectionModal({ onSuccess }: ProfileSelectionModalProps) {
    const router = useTransitionRouter();
    const [selectedRole, setSelectedRole] = useState<'client' | 'professional' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        if (!selectedRole) return;
        setLoading(true);
        setError('');

        try {
            if (selectedRole === 'client') {
                const response = await fetch('/api/users/me', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ isProfessional: false }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Erro ao definir o perfil');
                }

                // Atualiza os dados do perfil no React Query e no estado da aplicação
                await onSuccess();
            } else {
                // Se for profissional, avançamos para o passo 2 (verificação) sem salvar no banco ainda
                router.replace('/verificacao-identidade?role=professional');
            }
        } catch (err: any) {
            console.error('[ProfileSelectionModal] Erro ao selecionar perfil:', err);
            setError(err.message || 'Houve um erro de comunicação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] w-full h-[100dvh] max-w-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden selection:bg-purple-100 selection:text-purple-955 animate-in fade-in duration-500">
            {/* Efeitos de Fundo Luminosos e Suaves em Tema Claro */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

            {/* HEADER - Com o gradiente de marca do aplicativo para destacar o logo branco */}
            <div className="shared-header bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 px-5 h-[72px] shrink-0 flex items-center gap-3 z-20 shadow-md">
                <img 
                    src="/Logo.svg" 
                    alt="MimoChat" 
                    className="h-8 w-auto object-contain shrink-0" 
                />
                <h1 className="text-xl font-black text-white tracking-tighter">MimoChat</h1>
            </div>

            {/* CONTEÚDO CENTRAL */}
            <div className="flex-1 flex flex-col justify-start gap-6 w-full max-w-md mx-auto px-5 pt-8 pb-4 overflow-hidden z-10">
                
                <div className="text-left shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Seja bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600">MimoChat</span>
                    </h1>
                    
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                        Sua conta foi criada com sucesso! Escolha como deseja se apresentar e interagir na nossa comunidade:
                    </p>
                </div>

                {error && (
                    <div className="text-[11px] font-semibold text-red-650 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl w-full shrink-0">
                        {error}
                    </div>
                )}

                {/* Opções de Cartões */}
                <div className="flex flex-col gap-3 py-1">
                    
                    {/* Cartão Cliente */}
                    <button
                        onClick={() => setSelectedRole('client')}
                        disabled={loading}
                        className={`group relative flex flex-row items-center gap-3.5 text-left p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
                            selectedRole === 'client'
                                ? 'bg-purple-50/60 border-purple-500 shadow-lg shadow-purple-500/5'
                                : 'bg-white/90 border-slate-200 hover:bg-white hover:border-purple-300'
                        }`}
                    >
                        {/* Ícone */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                            selectedRole === 'client'
                                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                                : 'bg-purple-100/60 text-purple-600 group-hover:bg-purple-100'
                        }`}>
                            <User className="w-5.5 h-5.5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold transition-colors duration-300 ${
                                selectedRole === 'client' ? 'text-purple-900' : 'text-slate-900'
                            }`}>
                                Quero conversar
                            </h3>
                            
                            <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                                Encontre pessoas interessantes, envie mensagens e apoie com mimos.
                            </p>
                        </div>
                        
                        {/* Check Indicator */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                            selectedRole === 'client'
                                ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-sm'
                                : 'border-slate-200 bg-white'
                        }`}>
                            {selectedRole === 'client' ? (
                                <Check className="w-3 h-3 stroke-[3.5] animate-in zoom-in duration-200" />
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                            )}
                        </div>
                    </button>

                    {/* Cartão Profissional */}
                    <button
                        onClick={() => setSelectedRole('professional')}
                        disabled={loading}
                        className={`group relative flex flex-row items-center gap-3.5 text-left p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
                            selectedRole === 'professional'
                                ? 'bg-fuchsia-50/60 border-fuchsia-500 shadow-lg shadow-fuchsia-500/5'
                                : 'bg-white/90 border-slate-200 hover:bg-white hover:border-fuchsia-300'
                        }`}
                    >
                        {/* Ícone */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                            selectedRole === 'professional'
                                ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-md shadow-fuchsia-500/10'
                                : 'bg-fuchsia-100/60 text-fuchsia-600 group-hover:bg-fuchsia-100'
                        }`}>
                            <Crown className="w-5.5 h-5.5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold transition-colors duration-300 ${
                                selectedRole === 'professional' ? 'text-fuchsia-900' : 'text-slate-900'
                            }`}>
                                Quero receber por conversa
                            </h3>
                            
                            <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                                Defina seus valores, receba mensagens e monetize suas interações no MimoChat.
                            </p>
                        </div>
                        
                        {/* Check Indicator */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                            selectedRole === 'professional'
                                ? 'bg-fuchsia-600 border-fuchsia-600 text-white scale-110 shadow-sm'
                                : 'border-slate-200 bg-white'
                        }`}>
                            {selectedRole === 'professional' ? (
                                <Check className="w-3 h-3 stroke-[3.5] animate-in zoom-in duration-200" />
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                            )}
                        </div>
                    </button>

                </div>
            </div>

            {/* BOTÃO DE CONFIRMAÇÃO NA BASE - Sem linha de borda separando */}
            <div className="w-full shrink-0 px-5 pt-2 pb-6 z-20 flex flex-col items-center">
                <Button
                    title={loading ? 'Processando...' : 'Confirmar Perfil e Entrar'}
                    onClick={handleConfirm}
                    disabled={!selectedRole || loading}
                    loading={loading}
                    className={`w-full max-w-md text-white font-extrabold rounded-2xl py-3.5 shadow-lg transition-all duration-300 active:scale-[0.99] cursor-pointer flex items-center justify-center text-sm ${
                        !selectedRole 
                            ? 'bg-slate-200 text-slate-400 border-0 cursor-not-allowed opacity-60 shadow-none' 
                            : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-0 hover:scale-[1.01] hover:shadow-purple-500/20'
                    }`}
                />
                
                <span className="text-[10px] text-slate-400 mt-2 tracking-wide text-center">
                    Ao confirmar, você seleciona o seu perfil e acessa o MimoChat.
                </span>
            </div>
        </div>
    );
}
