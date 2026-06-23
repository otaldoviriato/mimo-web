'use client';

import React, { useState } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile } from '@/hooks/useQueries';
import { 
    UserCheck, 
    RefreshCw, 
    AlertCircle, 
    ShieldCheck,
    CreditCard,
    Calendar
} from 'lucide-react';

type Step = 'form' | 'submitting' | 'success';

export default function VerificationPage() {
    const router = useTransitionRouter();
    const { refetch: refetchProfile } = useMyProfile();

    const [step, setStep] = useState<Step>('form');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Formata o CPF com máscara: 000.000.000-00
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const cleanValue = rawValue.replace(/\D/g, '');
        
        let formatted = cleanValue;
        if (cleanValue.length > 3 && cleanValue.length <= 6) {
            formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3)}`;
        } else if (cleanValue.length > 6 && cleanValue.length <= 9) {
            formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3, 6)}.${cleanValue.substring(6)}`;
        } else if (cleanValue.length > 9) {
            formatted = `${cleanValue.substring(0, 3)}.${cleanValue.substring(3, 6)}.${cleanValue.substring(6, 9)}-${cleanValue.substring(9, 11)}`;
        }
        
        setCpf(formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const cleanCpf = cpf.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
            setErrorMsg('Por favor, informe um CPF válido com 11 dígitos.');
            return;
        }

        if (!birthDate) {
            setErrorMsg('Por favor, informe a sua data de nascimento.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        setStep('submitting');

        try {
            const response = await fetch('/api/users/me/identity-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cpf: cleanCpf,
                    birthDate
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao realizar a verificação de identidade');
            }

            // Atualiza os dados do perfil do usuário na aplicação
            setStep('success');
            await refetchProfile().catch((refetchError) => {
                console.warn('[IdentityVerification] Falha ao revalidar perfil apos sucesso:', refetchError);
            });
        } catch (err: any) {
            console.error('[IdentityVerification] Erro no fluxo:', err);
            setErrorMsg(err.message || 'Erro de conexão com o servidor. Tente novamente.');
            setStep('form');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'form':
                return (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-center">
                            <div className="mx-auto w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-3">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Confirme seus dados para continuar</h2>
                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-[320px] mx-auto">
                                Precisamos do seu CPF e da sua data de nascimento para confirmar sua identidade e validar que você é maior de idade.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-left">
                            <p className="text-xs font-semibold leading-relaxed text-purple-900">
                                Essas informações também protegem seus repasses: os valores recebidos na plataforma só poderão ser transferidos para uma chave Pix vinculada a este CPF.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-700 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                                <p className="text-xs font-semibold leading-normal">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Input de CPF */}
                            <div className="space-y-1.5">
                                <label htmlFor="cpf-input" className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                                    CPF
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <CreditCard className="w-4.5 h-4.5" />
                                    </div>
                                    <input
                                        id="cpf-input"
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={handleCpfChange}
                                        maxLength={14}
                                        required
                                        disabled={isSubmitting}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Input de Data de Nascimento */}
                            <div className="space-y-1.5">
                                <label htmlFor="birthdate-input" className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                                    Data de Nascimento
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Calendar className="w-4.5 h-4.5" />
                                    </div>
                                    <input
                                        id="birthdate-input"
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-600/10 active:scale-[0.99] transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar e Validar
                            </button>
                        </div>
                    </form>
                );

            case 'submitting':
                return (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative flex items-center justify-center">
                            <div className="w-14 h-14 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                            <RefreshCw className="w-5 h-5 text-purple-600 absolute animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Validando informações</h3>
                            <p className="text-xs text-gray-500 mt-2 max-w-[250px] mx-auto leading-relaxed">
                                Estamos cruzando seus dados de forma segura com a Receita Federal. Isso deve levar apenas alguns segundos...
                            </p>
                        </div>
                    </div>
                );

            case 'success':
                return (
                    <div className="py-6 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-500">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
                            <UserCheck className="w-8 h-8" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Verificação Concluída!</h2>
                            <p className="text-xs text-gray-600 max-w-[260px] mx-auto leading-relaxed">
                                Seu CPF foi validado com sucesso e confirmamos que você é maior de idade. Sua conta de criadora foi liberada.
                            </p>
                        </div>

                        <button
                            onClick={() => router.push('/chats')}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-600/10 active:scale-[0.99] transition-all text-sm cursor-pointer"
                        >
                            Começar a usar o MimoChat
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] flex items-center justify-between sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">Validação de Identidade</h1>
                        <p className="text-[11px] text-purple-200 font-semibold tracking-wide">Mimo Profissional</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <img 
                        src="/Logo.svg" 
                        alt="MimoChat" 
                        className="h-6 w-auto object-contain brightness-0 invert opacity-40"
                    />
                </div>
            </div>

            {/* Container Principal */}
            <div className="flex-1 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-gray-200/50">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
