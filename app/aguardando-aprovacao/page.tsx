'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, MessageCircle } from 'lucide-react';

export default function AguardandoAprovacaoPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>('loading');
    const [name, setName] = useState('');
    const [animatingRelease, setAnimatingRelease] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const isProcessingApproval = useRef(false);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            router.replace('/login');
            return;
        }

        // Se já foi liberado no localStorage, vai direto para o app sem fazer polling
        if (typeof window !== 'undefined' && localStorage.getItem('mimo_professional_released') === 'true') {
            router.replace('/chats');
            return;
        }

        let interval: NodeJS.Timeout | null = null;

        // Função para checar o status
        const checkStatus = async () => {
            if (isProcessingApproval.current) {
                if (interval) clearInterval(interval);
                return;
            }

            try {
                const response = await fetch('/api/users/me');
                if (!response.ok) throw new Error();
                const data = await response.json();
                
                if (data.user) {
                    setName(data.user.name || data.user.username);
                    const userStatus = data.user.professionalStatus;

                    if (userStatus === 'approved') {
                        if (isProcessingApproval.current) return;
                        isProcessingApproval.current = true;
                        
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }

                        // Sincroniza o cache do React Query de forma imediata para evitar redirecionamentos reversos no layout
                        try {
                            queryClient.setQueryData(['user', 'me'], (oldData: any) => {
                                if (oldData) {
                                    return {
                                        ...oldData,
                                        professionalStatus: 'approved'
                                    };
                                }
                                return oldData;
                            });
                            queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
                        } catch (e) {
                            console.error('Erro ao atualizar cache do React Query:', e);
                        }

                        // Atualiza o localStorage para refletir a aprovação de imediato
                        if (typeof window !== 'undefined') {
                            const cachedProfile = localStorage.getItem('mimo_profile');
                            if (cachedProfile) {
                                try {
                                    const profile = JSON.parse(cachedProfile);
                                    profile.professionalStatus = 'approved';
                                    localStorage.setItem('mimo_profile', JSON.stringify(profile));
                                } catch (e) {
                                    console.error(e);
                                }
                            }
                        }

                        setStatus('approved');
                        setAnimatingRelease(true);

                        // Tempo planejado para transição visual premium:
                        // 1. Mostrar a comemoração ("Acesso Liberado!") por 2.5 segundos.
                        // 2. Seta o fadeOut = true para realizar a transição CSS suave de desfoque e opacidade (dura 1000ms).
                        // 3. Após 3.5 segundos no total, redireciona o usuário para a página de chats.
                        setTimeout(() => {
                            setFadeOut(true);
                        }, 2500);

                        setTimeout(() => {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('mimo_professional_released', 'true');
                            }
                            router.replace('/chats');
                        }, 3500);
                    } else if (userStatus === 'rejected') {
                        setStatus('rejected');
                    } else {
                        setStatus('pending');
                    }
                }
            } catch (err) {
                console.error('Erro ao verificar status da conta:', err);
            }
        };

        // Roda imediatamente no mount
        checkStatus();

        // Configura o polling a cada 5 segundos
        interval = setInterval(checkStatus, 5000);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoaded, isSignedIn, router]);

    const handleLogout = async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('mimo_professional_released');
            localStorage.removeItem('mimo_signup_flow');
            localStorage.removeItem('mimo_profile');
        }
        await signOut();
        router.replace('/login');
    };

    if (!isLoaded || status === 'loading') {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative overflow-hidden">
                {/* Dotted Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
                <Loader2 className="h-10 w-10 animate-spin text-purple-600 relative z-10" />
                <p className="mt-4 text-sm font-semibold text-slate-500 relative z-10">Carregando seus dados...</p>
            </div>
        );
    }

    if (animatingRelease) {
        return (
            <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 relative overflow-hidden transition-all duration-[1000ms] ease-in-out ${
                fadeOut ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-none scale-100'
            }`}>
                {/* Efeito de flash e liberação */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100/60 via-fuchsia-100/60 to-slate-50 animate-pulse"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50"></div>
                
                <div className="relative z-10 text-center space-y-6 max-w-md p-6">
                    <div className="relative mx-auto w-24 h-24 bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25 animate-bounce">
                        <Sparkles className="h-12 w-12 text-white" />
                        <span className="absolute inset-0 rounded-3xl border border-white/40 animate-ping"></span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600">
                            Acesso Liberado!
                        </h1>
                        <p className="text-sm font-bold text-purple-700">
                            Sua conta foi aprovada! Prepare-se para a experiência.
                        </p>
                    </div>
                    <div className="flex space-x-1.5 justify-center items-center pt-2">
                        <span className="w-2.5 h-2.5 bg-fuchsia-500 rounded-full animate-ping" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6 relative overflow-hidden select-none">
            {/* Dotted Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] opacity-30"></div>
            
            {/* Luzes decorativas roxas no background */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-fuchsia-200/40 rounded-full blur-3xl"></div>

            <div className="relative z-10 max-w-md w-full bg-white/90 border border-slate-200/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center space-y-6">
                
                {/* Logo e Status Indicator */}
                <div className="inline-flex w-20 h-20 items-center justify-center bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl shadow-lg relative">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-12 h-12 object-contain"
                    />
                </div>

                {status === 'pending' && (
                    <>
                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold uppercase bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                                Perfil em Análise
                            </span>
                            <h1 className="text-2xl font-black tracking-tight mt-3 text-slate-900">
                                Olá, {name}! 💜
                            </h1>
                            <p className="text-sm font-semibold text-slate-500 leading-relaxed px-2">
                                Recebemos seu cadastro. Sua conta de criadora profissional está pendente de aprovação pela nossa equipe.
                            </p>
                        </div>

                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4.5 text-left text-xs font-semibold text-slate-600 leading-relaxed space-y-3">
                            <p className="flex items-center gap-2 text-slate-800">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                </span>
                                O que acontece agora?
                            </p>
                            <p className="pl-4 text-slate-500">
                                1. Estamos revisando seu perfil para garantir a segurança da nossa comunidade.
                            </p>
                            <p className="pl-4 text-slate-500">
                                2. Assim que seu cadastro for aprovado, **esta tela atualizará automaticamente** e você será notificada por e-mail.
                            </p>
                        </div>

                        <div className="flex flex-col w-full gap-3 pt-2">
                            <div className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
                                <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                Verificando status de aprovação...
                            </div>
                            
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition duration-200 cursor-pointer"
                            >
                                <LogOut size={16} />
                                Sair da Conta
                            </button>
                        </div>
                    </>
                )}

                {status === 'rejected' && (
                    <>
                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 rounded-full border border-rose-200">
                                <ShieldAlert className="h-3 w-3" />
                                Cadastro Rejeitado
                            </span>
                            <h1 className="text-2xl font-black tracking-tight mt-3 text-slate-900">
                                Inscrição Não Aprovada
                            </h1>
                            <p className="text-sm font-semibold text-slate-500 leading-relaxed px-2">
                                Lamentamos, {name}, mas sua inscrição para perfil profissional não pôde ser aprovada no momento.
                            </p>
                        </div>

                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4.5 text-xs font-semibold text-slate-500 leading-relaxed">
                            Se você acredita que isso foi um engano ou deseja obter mais informações, sinta-se à vontade para entrar em contato com nosso suporte técnico.
                        </div>

                        <div className="flex flex-col w-full gap-3 pt-2">
                            <a
                                href="mailto:suporte@mimochat.com.br"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-purple-500/10 transition duration-200 cursor-pointer"
                            >
                                <MessageCircle size={16} />
                                Contatar Suporte
                            </a>
                            
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition duration-200 cursor-pointer"
                            >
                                <LogOut size={16} />
                                Sair da Conta
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
