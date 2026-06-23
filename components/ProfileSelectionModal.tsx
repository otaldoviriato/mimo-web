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
            const response = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isProfessional: selectedRole === 'professional' }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao definir o perfil');
            }

            // Atualiza os dados do perfil no React Query e no estado da aplicação
            await onSuccess();

            if (selectedRole === 'professional') {
                router.replace('/verificacao-identidade');
            }
        } catch (err: any) {
            console.error('[ProfileSelectionModal] Erro ao selecionar perfil:', err);
            setError(err.message || 'Houve um erro de comunicação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] w-full h-[100dvh] max-w-full flex flex-col justify-between bg-gradient-to-br from-purple-50/40 via-slate-50 to-indigo-50/40 text-slate-800 overflow-hidden px-4 py-4 sm:p-6 md:p-10 selection:bg-purple-100 selection:text-purple-950 animate-in fade-in duration-500">
            {/* Efeitos de Fundo Luminosos e Suaves em Tema Claro */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none z-0"></div>

            {/* HEADER */}
            <div className="flex items-center z-10 w-full shrink-0">
                <img 
                    src="/Logo.svg" 
                    alt="MimoChat" 
                    className="h-7 sm:h-8 w-auto object-contain" 
                />
            </div>

            {/* CONTEÚDO CENTRAL */}
            <div className="flex-1 min-h-0 flex flex-col justify-center items-center max-w-3xl mx-auto w-full py-3 sm:py-5 md:py-8 z-10 text-center">
                
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                    Seja bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600">MimoChat</span>
                </h1>
                
                <p className="text-[11px] sm:text-sm md:text-base text-slate-600 mt-2 sm:mt-3 max-w-md leading-relaxed mx-auto">
                    Sua account foi criada com sucesso. Por favor, selecione como você deseja se apresentar e interagir na comunidade MimoChat:
                </p>

                {error && (
                    <div className="mt-3 text-xs font-bold text-red-650 bg-red-50 border border-red-200 px-3 py-2 rounded-xl max-w-md w-full">
                        {error}
                    </div>
                )}

                {/* Opções de Cartões */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 w-full mt-4 sm:mt-6 md:mt-8 text-left min-h-0">
                    
                    {/* Cartão Cliente */}
                    <button
                        onClick={() => setSelectedRole('client')}
                        disabled={loading}
                        className={`group relative min-w-0 flex flex-col items-center md:items-start text-center md:text-left p-3 sm:p-5 md:p-8 rounded-2xl md:rounded-[2rem] border transition-all duration-500 backdrop-blur-md cursor-pointer select-none ${
                            selectedRole === 'client'
                                ? 'bg-purple-50/50 border-purple-500 shadow-2xl shadow-purple-500/10 translate-y-[-4px]'
                                : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-purple-300 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-purple-500/5'
                        }`}
                    >
                        {/* Ícone */}
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${
                            selectedRole === 'client'
                                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-purple-100/60 text-purple-600 group-hover:bg-purple-100'
                        }`}>
                            <User className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        
                        <h3 className={`text-sm sm:text-base md:text-lg font-black mt-3 sm:mt-4 md:mt-6 transition-colors duration-300 ${
                            selectedRole === 'client' ? 'text-purple-900' : 'text-slate-900 group-hover:text-purple-600'
                        }`}>
                            Cliente / Fã
                        </h3>
                        
                        <p className="text-[10px] sm:text-xs leading-relaxed text-slate-500 mt-1.5 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical]">
                            Quero conversar com meus criadores preferidos, assinar galerias e apoiar com mimos em chats privados e exclusivos.
                        </p>
                        
                        {/* Check Indicator */}
                        {selectedRole === 'client' && (
                            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-6 h-6 md:w-7 md:h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                        )}
                    </button>

                    {/* Cartão Profissional */}
                    <button
                        onClick={() => setSelectedRole('professional')}
                        disabled={loading}
                        className={`group relative min-w-0 flex flex-col items-center md:items-start text-center md:text-left p-3 sm:p-5 md:p-8 rounded-2xl md:rounded-[2rem] border transition-all duration-500 backdrop-blur-md cursor-pointer select-none ${
                            selectedRole === 'professional'
                                ? 'bg-fuchsia-50/50 border-fuchsia-500 shadow-2xl shadow-fuchsia-500/10 translate-y-[-4px]'
                                : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-fuchsia-300 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-fuchsia-500/5'
                        }`}
                    >
                        {/* Ícone */}
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${
                            selectedRole === 'professional'
                                ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30'
                                : 'bg-fuchsia-100/60 text-fuchsia-600 group-hover:bg-fuchsia-100'
                        }`}>
                            <Crown className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        
                        <h3 className={`text-sm sm:text-base md:text-lg font-black mt-3 sm:mt-4 md:mt-6 transition-colors duration-300 ${
                            selectedRole === 'professional' ? 'text-fuchsia-900' : 'text-slate-900 group-hover:text-fuchsia-600'
                        }`}>
                            Criador(a) Profissional
                        </h3>
                        
                        <p className="text-[10px] sm:text-xs leading-relaxed text-slate-500 mt-1.5 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical]">
                            Quero postar fotos/vídeos na minha galeria, interagir com fãs, definir valores de chats e monetizar meu conteúdo de forma segura.
                        </p>
                        
                        {/* Check Indicator */}
                        {selectedRole === 'professional' && (
                            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-6 h-6 md:w-7 md:h-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                        )}
                    </button>

                </div>
            </div>

            {/* BOTÃO DE CONFIRMAÇÃO NA BASE */}
            <div className="w-full max-w-md mx-auto pt-2 sm:pt-4 pb-1 z-10 flex flex-col items-center shrink-0">
                <Button
                    title={loading ? 'Processando...' : 'Confirmar Perfil e Entrar'}
                    onClick={handleConfirm}
                    disabled={!selectedRole || loading}
                    loading={loading}
                    size="lg"
                    className={`w-full text-white font-extrabold rounded-2xl py-3 sm:py-4 shadow-lg transition-all duration-300 active:scale-[0.99] cursor-pointer ${
                        !selectedRole 
                            ? 'bg-slate-200 text-slate-400 border-0 cursor-not-allowed opacity-60 shadow-none' 
                            : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-0 hover:scale-[1.01] hover:shadow-purple-500/20'
                    }`}
                />
                
                <span className="text-[10px] text-slate-400 mt-2 sm:mt-3 tracking-wide text-center">
                    Ao confirmar, você seleciona o seu perfil e acessa o MimoChat.
                </span>
            </div>
        </div>
    );
}
