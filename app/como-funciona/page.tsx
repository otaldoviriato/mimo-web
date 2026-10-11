'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { 
    ArrowRight, 
    ArrowLeft,
    Send,
    Lock,
    LockKeyholeOpen,
    Zap
} from 'lucide-react';

const buildProfessionalMetadata = () => ({
    role: 'professional',
    profileSelectedAt: new Date().toISOString(),
    profileRoleSource: 'creator_landing',
});

export function ParaCriadorasContent() {
    // Passos:
    // 0: Conversa com balões animados e slide de valor recebido
    // 1: Mídias pagas desbloqueáveis
    // 2: Mimos recebidos
    // 3: Criar conta / Login (Clerk)
    const [activeStep, setActiveStep] = useState(0);
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // ─── AUTENTICAÇÃO DO CLERK ───
    const router = useRouter();
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
    const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [flowType, setFlowType] = useState<'signIn' | 'signUp' | null>(null);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [ageAccepted, setAgeAccepted] = useState(false);
    const [showAgeGateTooltip, setShowAgeGateTooltip] = useState(false);
    const [tooltipTimeoutId, setTooltipTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const triggerAgeGateTooltip = () => {
        if (tooltipTimeoutId) {
            clearTimeout(tooltipTimeoutId);
        }
        setShowAgeGateTooltip(true);
        const id = setTimeout(() => {
            setShowAgeGateTooltip(false);
        }, 3000);
        setTooltipTimeoutId(id);
    };

    const isAlreadySignedInError = (err: unknown): boolean => {
        const e = err as any;
        const code = e?.errors?.[0]?.code || '';
        const message = (
            e?.errors?.[0]?.longMessage ||
            e?.errors?.[0]?.message ||
            e?.message ||
            ''
        ).toLowerCase();

        return (
            code === 'already_signed_in' ||
            code === 'session_exists' ||
            message.includes('already signed in') ||
            message.includes('already_signed_in') ||
            message.includes('session_exists')
        );
    };

    const clerkError = (err: unknown, fallback: string): string => {
        if (isAlreadySignedInError(err)) {
            return '';
        }
        const e = err as any;
        return e?.errors?.[0]?.longMessage
            || e?.errors?.[0]?.message
            || e?.message
            || fallback;
    };

    const onSendCode = async () => {
        if (!email.trim()) { setError('Por favor, insira seu email'); return; }
        if (!signInLoaded || !signUpLoaded) { setError('Serviço de autenticação não carregado'); return; }
        if (!ageAccepted) { 
            triggerAgeGateTooltip(); 
            return; 
        }

        setEmailLoading(true);
        setError('');

        const targetEmail = email.trim().toLowerCase();

        if (targetEmail === 'homologacao-asaas@mimochat.com.br') {
            setFlowType('signIn');
            setPendingVerification(true);
            setEmailLoading(false);
            return;
        }

        try {
            await signIn!.create({ identifier: email });
            const emailFactor = signIn!.supportedFirstFactors?.find(
                (f: any) => f.strategy === 'email_code'
            ) as any;

            if (!emailFactor) {
                setError('Verificação por email não está disponível nesta conta');
                return;
            }

            await signIn!.prepareFirstFactor({
                strategy: 'email_code',
                emailAddressId: emailFactor.emailAddressId,
            });

            setFlowType('signIn');
            setPendingVerification(true);
        } catch (err: unknown) {
            const errCode = (err as any)?.errors?.[0]?.code;

            if (errCode === 'form_identifier_not_found') {
                try {
                    const signUpParams: any = { emailAddress: email };
                    signUpParams.unsafeMetadata = buildProfessionalMetadata();

                    await signUp!.create(signUpParams);
                    await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setFlowType('signUp');
                    setPendingVerification(true);
                } catch (signUpErr: unknown) {
                    setError(clerkError(signUpErr, 'Erro ao criar conta'));
                }
            } else {
                setError(clerkError(err, 'Erro ao enviar código'));
            }
        } finally {
            setEmailLoading(false);
        }
    };

    const onVerifyCode = async () => {
        if (!code.trim()) { setError('Por favor, insira o código'); return; }
        if (!signInLoaded || !signUpLoaded) { setError('Serviço de autenticação não carregado'); return; }

        setEmailLoading(true);
        setError('');

        const targetEmail = email.trim().toLowerCase();

        if (targetEmail === 'homologacao-asaas@mimochat.com.br') {
            if (code.trim() !== '111111') {
                setError('Código incorreto');
                setEmailLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/asaas-bypass', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: targetEmail, code: '111111' })
                });

                const data = await response.json();
                
                if (!response.ok || !data.url) {
                    setError(data.error || 'Erro ao gerar token de acesso de homologação.');
                    setEmailLoading(false);
                    return;
                }

                window.location.href = data.url;
            } catch (err: any) {
                setError(`Erro ao autenticar: ${err.message || err}`);
                setEmailLoading(false);
            }
            return;
        }

        try {
            if (flowType === 'signUp') {
                await signUp!.attemptEmailAddressVerification({ code });
                if (signUp!.status === 'complete') {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('mimo_signup_flow', 'professional');
                    }
                    await setSignUpActive!({ session: signUp!.createdSessionId });
                    router.replace('/chats');
                } else {
                    console.error('[SignUp Error] Status incompleto após verificação:', signUp!.status, 'Campos em falta:', (signUp as any).missingFields);
                    throw new Error(`Cadastro incompleto. Status: ${signUp!.status}. Requisitos pendentes: ${(signUp as any).missingFields?.join(', ') || 'Nenhum'}`);
                }
            } else {
                await signIn!.attemptFirstFactor({ strategy: 'email_code', code });
                if (signIn!.status === 'complete') {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('mimo_signup_flow', 'professional');
                    }
                    await setSignInActive!({ session: signIn!.createdSessionId });
                    router.replace('/chats');
                }
            }
        } catch (err: unknown) {
            setError(clerkError(err, 'Código inválido ou expirado'));
        } finally {
            setEmailLoading(false);
        }
    };

    const onSignInWithGoogle = async () => {
        if (!signInLoaded || !signUpLoaded || !signIn || !signUp) {
            setError('Serviço de autenticação não carregado');
            return;
        }
        if (!ageAccepted) {
            triggerAgeGateTooltip();
            return;
        }

        setGoogleLoading(true);
        setError('');

        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('mimo_signup_flow', 'professional');
            }

            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/chats',
                oidcPrompt: 'select_account',
                unsafeMetadata: buildProfessionalMetadata()
            });
        } catch (err: unknown) {
            if (isAlreadySignedInError(err)) {
                router.replace('/chats');
                return;
            }
            setError(clerkError(err, 'Erro no login com Google'));
            setGoogleLoading(false);
        }
    };

    const handleAuthKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (pendingVerification) onVerifyCode();
            else onSendCode();
        }
    };

    const isAuthReady = signInLoaded && signUpLoaded;

    // ─── MENSAGENS E ANIMAÇÃO CADENCIADA (PASSO 0) ───
    interface ChatItem {
        sender: 'fan' | 'creator';
        text: string;
        gain?: number;
        showBadge?: boolean;
    }

    const [visibleMessages, setVisibleMessages] = useState<ChatItem[]>([]);
    const [chatTyping, setChatTyping] = useState(false);

    useEffect(() => {
        if (activeStep !== 0) {
            setVisibleMessages([]);
            setChatTyping(false);
            return;
        }

        let isMounted = true;
        const timeouts: NodeJS.Timeout[] = [];

        const script: Array<{ sender: 'fan' | 'creator'; text: string; gain?: number; delayBefore: number; typingTime: number }> = [
            {
                sender: 'fan',
                text: 'Oi Laura! Vi seu Insta... Queria conversar com você!',
                gain: 4.50,
                delayBefore: 600,
                typingTime: 1200,
            },
            {
                sender: 'creator',
                text: 'Oi Carlos! Tudo bem? Aqui a gente conversa no privado com calma 💜',
                delayBefore: 1200,
                typingTime: 1500,
            },
            {
                sender: 'fan',
                text: 'Perfeito! E você consegue me responder com frequência?',
                gain: 5.50,
                delayBefore: 1400,
                typingTime: 1300,
            },
            {
                sender: 'creator',
                text: 'Consigo sim! O Mimo me notifica e respondo durante a minha rotina ✨',
                delayBefore: 1200,
                typingTime: 1500,
            }
        ];

        let accumulatedTime = 0;

        script.forEach((item, index) => {
            // 1. Inicia digitação
            accumulatedTime += item.delayBefore;
            const t1 = setTimeout(() => {
                if (!isMounted) return;
                setChatTyping(true);
            }, accumulatedTime);
            timeouts.push(t1);

            // 2. Aparece o balão com bounce
            accumulatedTime += item.typingTime;
            const t2 = setTimeout(() => {
                if (!isMounted) return;
                setChatTyping(false);
                setVisibleMessages(prev => [
                    ...prev,
                    {
                        sender: item.sender,
                        text: item.text,
                        gain: item.gain,
                        showBadge: false
                    }
                ]);
            }, accumulatedTime);
            timeouts.push(t2);

            // 3. Se tiver ganho, o valor desliza para fora de trás do balão após o bounce assentar (500ms)
            if (item.gain) {
                const t3 = setTimeout(() => {
                    if (!isMounted) return;
                    setVisibleMessages(prev => prev.map((msg, i) => {
                        if (i === index) {
                            return { ...msg, showBadge: true };
                        }
                        return msg;
                    }));
                }, accumulatedTime + 450);
                timeouts.push(t3);
            }
        });

        return () => {
            isMounted = false;
            timeouts.forEach(t => clearTimeout(t));
        };
    }, [activeStep]);

    // ─── ESTADOS DO PASSO 1 (MÍDIAS) ───
    const [mediaUnlocked, setMediaUnlocked] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaPrice, setMediaPrice] = useState(29.90);

    function handleSimulateUnlock() {
        if (mediaUnlocked || mediaLoading) return;
        setMediaLoading(true);
        setTimeout(() => {
            setMediaLoading(false);
            setMediaUnlocked(true);
        }, 1200);
    }

    // ─── NAVEGAÇÃO DOS PASSOS ───
    function changeStep(nextVal: number) {
        if (nextVal === activeStep) return;
        setIsExiting(true);
        setTimeout(() => {
            setActiveStep(nextVal);
            setStep(nextVal);
            setIsExiting(false);
        }, 250);
    }

    function nextStep() {
        if (activeStep < 3) {
            changeStep(activeStep + 1);
        }
    }

    function prevStep() {
        if (activeStep > 0) {
            changeStep(activeStep - 1);
        }
    }

    // ─── TEXTOS POR ETAPA ───
    function renderStepTexts() {
        switch (activeStep) {
            case 0:
                return (
                    <div className="space-y-1.5 sm:space-y-2 text-center lg:text-left">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                            Aplicativo de chat onde você ganha para conversar
                        </h1>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">
                            Receba por mensagem visualizada
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-1.5 sm:space-y-2 text-center lg:text-left">
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                            Cobre pelas suas fotos e vídeos
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">
                            Envie mídias privadas e receba via Pix na hora do desbloqueio
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-1.5 sm:space-y-2 text-center lg:text-left">
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                            Receba mimos dos seus apoiadores
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">
                            Mimos e gorjetas em dinheiro direto no chat
                        </p>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-1.5 sm:space-y-2 text-center lg:text-left">
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                            Comece agora no MimoChat
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">
                            Crie seu perfil profissional e comece a monetizar
                        </p>
                    </div>
                );
            default:
                return null;
        }
    }

    // ─── BOTÃO PRÓXIMO ───
    function renderStepAction() {
        if (activeStep >= 3) return null;
        return (
            <button
                onClick={nextStep}
                className="w-full sm:max-w-md mx-auto lg:mx-0 py-3.5 px-8 text-sm sm:text-base font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-2xl transition shadow-lg shadow-purple-600/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-[#fafafc] text-slate-800 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden flex flex-col justify-between z-10">
            {/* Keyframes de Bounce e Slide do Valor */}
            <style>{`
                @keyframes bounceBalloon {
                    0% {
                        opacity: 0;
                        transform: scale(0.82) translateY(16px);
                    }
                    60% {
                        opacity: 1;
                        transform: scale(1.03) translateY(-3px);
                    }
                    80% {
                        transform: scale(0.98) translateY(1px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-balloon-bounce {
                    animation: bounceBalloon 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>

            {/* Fundo suave */}
            <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none select-none z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-pink-400/8 blur-[100px] pointer-events-none select-none z-0" />

            {/* HEADER SIMPLES: LOGO À ESQUERDA, PULAR À DIREITA */}
            <header className="shrink-0 z-30 flex items-center justify-between px-5 sm:px-8 py-3.5 sm:py-4 h-16 w-full select-none">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md shadow-purple-600/20">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={18}
                            height={18}
                            priority
                            className="w-4.5 h-4.5 object-contain"
                        />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                        MimoChat
                    </span>
                </Link>

                {activeStep < 3 ? (
                    <button
                        onClick={() => changeStep(3)}
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                        <span>Pular</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <Link
                        href="/login"
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-purple-600 bg-white border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                        Entrar
                    </Link>
                )}
            </header>

            {/* CORPO PRINCIPAL COM CONTEÚDO PERFEITAMENTE ENCAIXADO */}
            <main className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-between py-2 sm:py-4 relative z-20">
                
                {/* 1. TÍTULO E SUBTÍTULO NO TOPO */}
                <div className="shrink-0 mb-2 sm:mb-4 transition-all duration-300">
                    {renderStepTexts()}
                </div>

                {/* 2. ESPAÇO CENTRAL: ANIMAÇÃO DOS BALÕES / CENÁRIO */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-y-auto overflow-x-hidden scrollbar-none py-1">
                    
                    {/* PASSO 0: BALÕES DE CHAT ANIMADOS COM BOUNCE E SLIDE DO VALOR RECEBIDO */}
                    {activeStep === 0 && (
                        <div className="w-full max-w-md mx-auto flex flex-col gap-2.5 sm:gap-3 justify-center">
                            {visibleMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`relative flex items-center gap-1.5 animate-balloon-bounce ${
                                        msg.sender === 'fan' ? 'self-start' : 'self-end'
                                    }`}
                                >
                                    {/* Indicador de ganho: sai deslizando de trás do balão do fã como na sala de chat real */}
                                    {msg.gain && (
                                        <div
                                            className={`transition-all duration-500 ease-out z-0 overflow-hidden flex items-center shrink-0 ${
                                                msg.showBadge
                                                    ? 'max-w-[90px] opacity-100 mr-1.5 sm:mr-2 scale-100'
                                                    : 'max-w-0 opacity-0 mr-0 scale-75 pointer-events-none'
                                            }`}
                                        >
                                            <span
                                                className={`transform transition-transform duration-500 ease-out ${
                                                    msg.showBadge ? 'translate-x-0' : '-translate-x-4'
                                                } text-[11px] sm:text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xs`}
                                            >
                                                + R$ {msg.gain.toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Balão da Mensagem */}
                                    <div
                                        className={`relative z-10 p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed max-w-[260px] sm:max-w-[320px] shadow-sm select-none ${
                                            msg.sender === 'fan'
                                                ? 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs'
                                                : 'bg-purple-600 text-white font-medium rounded-2xl rounded-tr-xs shadow-purple-600/20'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Indicador de digitando animado */}
                            {chatTyping && (
                                <div className="self-start flex items-center gap-1.5 bg-white border border-slate-200/80 py-2 px-3 rounded-2xl rounded-tl-xs shadow-xs text-slate-400 animate-balloon-bounce">
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PASSO 1: FOTO/VÍDEO BLOQUEADO DESBLOQUEÁVEL */}
                    {activeStep === 1 && (
                        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3 animate-balloon-bounce">
                            <div className="relative w-64 aspect-4/3 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md">
                                <img
                                    src="/assets/laura.png"
                                    alt="Mídia Exclusiva"
                                    className="w-full h-full object-cover transition-all duration-700 ease-out"
                                    style={{ filter: mediaUnlocked ? 'blur(0px)' : 'blur(16px)' }}
                                />
                                {!mediaUnlocked ? (
                                    <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                                        <button
                                            onClick={handleSimulateUnlock}
                                            disabled={mediaLoading}
                                            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition transform active:scale-95"
                                        >
                                            {mediaLoading ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    <span>Desbloqueando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>Desbloquear R$ {mediaPrice.toFixed(2)}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute top-2.5 left-2.5 bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                        <LockKeyholeOpen className="w-3 h-3" />
                                        <span>Desbloqueada</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: MIMO RECEBIDO */}
                    {activeStep === 2 && (
                        <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center animate-balloon-bounce">
                            <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-lg shadow-purple-500/10 flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                                    <img src="/assets/gift.png" alt="Mimo Recebido" className="w-8 h-8 object-contain" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block">Mimo Recebido via Pix</span>
                                    <span className="text-xl font-black text-slate-900 block">+ R$ 50,00</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3: FORMULÁRIO DE CADASTRO/LOGIN DO CLERK */}
                    {activeStep === 3 && (
                        <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xl shadow-purple-950/5 relative animate-balloon-bounce">
                            <div id="clerk-captcha" />
                            
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold text-slate-900">Criar minha Conta</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Acesse ou crie seu perfil profissional no MimoChat.</p>
                            </div>

                            {!pendingVerification ? (
                                <div className="flex flex-col gap-3.5">
                                    <Input
                                        label="Email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={handleAuthKeyDown}
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        error={error}
                                        disabled={!isAuthReady}
                                    />

                                    <Button
                                        title="Continuar com Email"
                                        onClick={onSendCode}
                                        loading={emailLoading}
                                        disabled={!isAuthReady}
                                        size="lg"
                                        className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-0 text-white rounded-2xl py-3 font-bold shadow-md shadow-purple-600/25 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                                    />

                                    <div className="flex items-center gap-3 my-0.5">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-xs text-gray-400 font-bold uppercase">ou</span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>

                                    <Button
                                        title={googleLoading ? 'Aguarde...' : 'Entrar com Google'}
                                        onClick={onSignInWithGoogle}
                                        loading={googleLoading}
                                        disabled={!isAuthReady}
                                        variant="outline"
                                        size="lg"
                                        icon={
                                            <svg width="18" height="18" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        }
                                        className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl py-3 font-bold shadow-sm cursor-pointer"
                                    />

                                    {/* Checkbox de Maioridade e Termos */}
                                    <div className="relative flex items-start gap-2 mt-1 text-left select-none">
                                        {showAgeGateTooltip && (
                                            <div className="absolute bottom-full left-0 mb-3 w-full max-w-[280px] bg-purple-950/95 backdrop-blur-md text-white text-[11px] font-extrabold py-2 px-3 rounded-xl shadow-lg z-20 flex items-center gap-2 border border-purple-500/30">
                                                <span className="relative flex h-2 w-2 shrink-0">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                                </span>
                                                <span className="tracking-wide text-purple-100">Marque esta opção para continuar</span>
                                            </div>
                                        )}
                                        <input
                                            type="checkbox"
                                            id="age-gate-checkbox-onboard"
                                            checked={ageAccepted}
                                            onChange={(e) => setAgeAccepted(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer shrink-0"
                                        />
                                        <label htmlFor="age-gate-checkbox-onboard" className="text-[11px] text-slate-500 leading-snug cursor-pointer select-none">
                                            Declaro que sou <strong className="text-slate-600 font-semibold">maior de 18 anos</strong> e concordo com os{' '}
                                            <Link href="/termos-de-uso" target="_blank" className="text-purple-600 hover:text-purple-700 underline font-semibold">
                                                Termos de Uso
                                            </Link>{' '}
                                            e{' '}
                                            <Link href="/politica-de-privacidade" target="_blank" className="text-purple-600 hover:text-purple-700 underline font-semibold">
                                                Privacidade
                                            </Link>.
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3.5">
                                    <div className="text-center">
                                        <p className="text-sm text-slate-500">Enviamos um código para</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{email}</p>
                                    </div>

                                    <Input
                                        label="Código de verificação"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={handleAuthKeyDown}
                                        maxLength={6}
                                        error={error}
                                        className="text-center text-2xl tracking-widest font-black"
                                        autoComplete="one-time-code"
                                    />

                                    <Button
                                        title="Verificar"
                                        onClick={onVerifyCode}
                                        loading={emailLoading}
                                        size="lg"
                                        className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-0 text-white rounded-2xl py-3 font-bold shadow-md shadow-purple-600/25 cursor-pointer"
                                    />

                                    <Button
                                        title="Usar outro email"
                                        onClick={() => {
                                            setPendingVerification(false);
                                            setFlowType(null);
                                            setCode('');
                                            setError('');
                                        }}
                                        variant="ghost"
                                        size="md"
                                        className="w-full font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded-2xl cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* 3. BOTÃO PRESO NO RODAPÉ */}
                <div className="shrink-0 pt-2 sm:pt-3 pb-1 w-full flex justify-center">
                    {renderStepAction()}
                </div>

            </main>

            {/* BARRA DE PROGRESSO SUTIL */}
            <footer className="shrink-0 py-2.5 px-6 flex items-center justify-center gap-1.5 border-t border-slate-200/40 select-none">
                {[0, 1, 2, 3].map((s) => (
                    <button
                        key={s}
                        onClick={() => changeStep(s)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeStep === s 
                                ? 'w-6 bg-purple-600' 
                                : 'w-2 bg-slate-200 hover:bg-slate-300'
                        }`}
                        aria-label={`Ir para etapa ${s + 1}`}
                    />
                ))}
            </footer>
        </div>
    );
}

export default function ParaCriadorasPage() {
    return (
        <ClerkProvider>
            <ParaCriadorasContent />
        </ClerkProvider>
    );
}
