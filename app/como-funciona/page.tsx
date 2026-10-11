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

function ParaCriadorasContent() {
    // Máquina de passos:
    // Passo 0: Conversas diretas na tela com balões animados e simulação de ganhos por mensagem
    // Passo 1: Fotos e vídeos pagos desbloqueáveis
    // Passo 2: Mimos recebidos
    // Passo 3: Formulário de Cadastro/Login (Clerk)
    const [activeStep, setActiveStep] = useState(0);
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // ─── ESTADOS E LÓGICA DE AUTENTICAÇÃO DO CLERK ───
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

    // ─── ESTADOS DO SIMULADOR DE CHAT (PASSO 0) ───
    const [chatMessages, setChatMessages] = useState<Array<{ sender: 'fan' | 'creator'; text: string; time: string; gain?: number }>>([]);
    const [chatStep, setChatStep] = useState(0);
    const [chatTyping, setChatTyping] = useState(false);
    const [simulatedEarnings, setSimulatedEarnings] = useState(0.00);

    // ─── ESTADOS DO SIMULADOR DE MÍDIAS (PASSO 1) ───
    const [mediaChatMessages, setMediaChatMessages] = useState<Array<{ sender: 'fan' | 'creator'; text?: string; isMedia?: boolean; time: string; gain?: number }>>([]);
    const [mediaChatStep, setMediaChatStep] = useState(0);
    const [mediaChatTyping, setMediaChatTyping] = useState(false);
    const [mediaPrice, setMediaPrice] = useState(29.90);
    const [mediaUnlocked, setMediaUnlocked] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaEarnings, setMediaEarnings] = useState(0.00);

    // ─── ESTADOS DO SIMULADOR DE MIMOS (PASSO 2) ───
    const [mimoChatMessages, setMimoChatMessages] = useState<Array<{ sender: 'fan' | 'creator' | 'system'; text?: string; isMimoBanner?: boolean; time: string; gain?: number }>>([]);
    const [mimoChatStep, setMimoChatStep] = useState(0);
    const [mimoChatTyping, setMimoChatTyping] = useState(false);
    const [mimoEarnings, setMimoEarnings] = useState(0.00);

    // ─── LÓGICA DO SIMULADOR DE CHAT (PASSO 0 - IMEDIATO NA TELA) ───
    useEffect(() => {
        if (activeStep !== 0) {
            setChatMessages([]);
            setChatStep(0);
            setChatTyping(false);
            setSimulatedEarnings(0.00);
            return;
        }

        const script = [
            { sender: 'fan', text: 'Oi Laura! Vi seu Insta... Queria muito conversar com você por aqui! 😍', delay: 450, gain: 4.50 },
            { sender: 'creator', text: 'Oi Carlos! Tudo bem? Aqui a gente tem total privacidade e converso direto com você 💜', delay: 1300 },
            { sender: 'fan', text: 'Perfeito! E você responde no mesmo dia? Como funciona seu tempo?', delay: 1100, gain: 5.50 },
            { sender: 'creator', text: 'Sim! O Mimo me notifica e eu respondo com carinho entre a minha rotina ✨', delay: 1500 }
        ];

        if (chatStep < script.length) {
            const currentMsg = script[chatStep];
            setChatTyping(true);

            const timer = setTimeout(() => {
                setChatTyping(false);
                setChatMessages(prev => [...prev, { 
                    sender: currentMsg.sender as 'fan' | 'creator', 
                    text: currentMsg.text, 
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    gain: currentMsg.gain
                }]);
                
                if (currentMsg.gain) {
                    let start = simulatedEarnings;
                    const end = start + currentMsg.gain;
                    const duration = 400;
                    const startTime = performance.now();
                    const animate = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1);
                        setSimulatedEarnings(start + progress * (end - start));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }

                setChatStep(prev => prev + 1);
            }, currentMsg.delay);

            return () => clearTimeout(timer);
        }
    }, [activeStep, chatStep]);

    // ─── LÓGICA DO SIMULADOR DE MÍDIAS (PASSO 1) ───
    useEffect(() => {
        if (activeStep !== 1) {
            setMediaChatMessages([]);
            setMediaChatStep(0);
            setMediaChatTyping(false);
            setMediaUnlocked(false);
            setMediaEarnings(0.00);
            return;
        }

        const mediaScript = [
            { sender: 'fan', text: 'Oi Laura! Você tem aquela foto exclusiva que comentou no story? 🫣', delay: 500 },
            { sender: 'creator', text: 'Oi! Tenho sim, acabei de te mandar aqui em anexo 💜', delay: 1300 },
            { sender: 'creator', isMedia: true, delay: 900 }
        ];

        if (mediaChatStep < mediaScript.length) {
            const currentMsg = mediaScript[mediaChatStep];
            setMediaChatTyping(true);

            const timer = setTimeout(() => {
                setMediaChatTyping(false);
                setMediaChatMessages(prev => [...prev, {
                    sender: currentMsg.sender as 'fan' | 'creator',
                    text: currentMsg.text,
                    isMedia: currentMsg.isMedia,
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }]);
                setMediaChatStep(prev => prev + 1);
            }, currentMsg.delay);

            return () => clearTimeout(timer);
        }
    }, [activeStep, mediaChatStep]);

    // Auto-desbloqueio da mídia no Passo 1 após exibição
    useEffect(() => {
        if (activeStep === 1 && mediaChatStep === 3 && !mediaUnlocked && !mediaLoading) {
            const autoUnlockTimer = setTimeout(() => {
                handleSimulateUnlock();
            }, 1200);

            return () => clearTimeout(autoUnlockTimer);
        }
    }, [activeStep, mediaChatStep, mediaUnlocked, mediaLoading]);

    // ─── LÓGICA DO SIMULADOR DE MIMOS (PASSO 2) ───
    useEffect(() => {
        if (activeStep !== 2) {
            setMimoChatMessages([]);
            setMimoChatStep(0);
            setMimoChatTyping(false);
            setMimoEarnings(0.00);
            return;
        }

        const mimoScript = [
            { sender: 'fan', text: 'Adorei nosso papo hoje! Quero te agradecer mandando um mimo especial 💜', delay: 500 },
            { sender: 'fan', isMimoBanner: true, gain: 50.00, delay: 1400 },
            { sender: 'creator', text: 'Nossa Carlos, que gentileza! Muito obrigada pelo carinho! 😍✨', delay: 1400 }
        ];

        if (mimoChatStep < mimoScript.length) {
            const currentMsg = mimoScript[mimoChatStep];
            if (currentMsg.sender !== 'system' && !currentMsg.isMimoBanner) {
                setMimoChatTyping(true);
            }

            const timer = setTimeout(() => {
                setMimoChatTyping(false);
                setMimoChatMessages(prev => [...prev, {
                    sender: currentMsg.sender as 'fan' | 'creator' | 'system',
                    text: currentMsg.text,
                    isMimoBanner: currentMsg.isMimoBanner,
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    gain: currentMsg.gain
                }]);

                if (currentMsg.gain) {
                    let start = mimoEarnings;
                    const end = start + currentMsg.gain;
                    const duration = 500;
                    const startTime = performance.now();
                    const animate = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1);
                        setMimoEarnings(start + progress * (end - start));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }

                setMimoChatStep(prev => prev + 1);
            }, currentMsg.delay);

            return () => clearTimeout(timer);
        }
    }, [activeStep, mimoChatStep]);

    function resetMediaSimulation() {
        setMediaUnlocked(false);
        setMediaEarnings(0.00);
        setMediaChatMessages([]);
        setMediaChatStep(0);
        setMediaChatTyping(false);
    }

    function handleSimulateUnlock() {
        if (mediaUnlocked || mediaLoading) return;
        setMediaLoading(true);
        
        setTimeout(() => {
            setMediaLoading(false);
            setMediaUnlocked(true);
            
            let start = 0;
            const end = mediaPrice;
            const duration = 600;
            const startTime = performance.now();
            const animate = (now: number) => {
                const progress = Math.min((now - startTime) / duration, 1);
                setMediaEarnings(progress * end);
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);

            setTimeout(() => {
                setMediaChatTyping(true);
                setTimeout(() => {
                    setMediaChatTyping(false);
                    setMediaChatMessages(prev => [
                        ...prev, 
                        {
                            sender: 'fan',
                            text: 'Nossa, que linda!! Valeu muito a pena, amei o ensaio 🔥',
                            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        }
                    ]);
                }, 900);
            }, 600);

        }, 1000);
    }

    function changeStep(nextVal: number) {
        if (nextVal === activeStep) return;
        setIsExiting(true);
        setTimeout(() => {
            setActiveStep(nextVal);
            setStep(nextVal);
            setIsExiting(false);
        }, 350);
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

    // Atalhos do teclado (setas direita e esquerda)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl) {
                const tagName = activeEl.tagName;
                const isEditable = activeEl.getAttribute('contenteditable') === 'true';
                if (
                    tagName === 'INPUT' || 
                    tagName === 'TEXTAREA' || 
                    tagName === 'SELECT' || 
                    isEditable
                ) {
                    return;
                }
            }

            if (e.key === 'ArrowRight') nextStep();
            else if (e.key === 'ArrowLeft') prevStep();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeStep]);

    // ─── RENDERIZAÇÃO DOS TEXTOS DE CADA ETAPA ───
    function renderStepTexts() {
        switch (activeStep) {
            case 0:
                return (
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 text-purple-700 text-xs font-bold tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                            <span>Conversas Remuneradas</span>
                        </div>
                        <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            O único chat onde seu tempo e atenção viram <span className="text-purple-600">lucro de verdade</span>.
                        </h1>
                        <p className={`text-base sm:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Defina o valor por mensagem e receba proporcionalmente por caractere em cada resposta que você enviar.
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 text-purple-700 text-xs font-bold tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                            <span>Mídias Exclusivas</span>
                        </div>
                        <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            Cobre pelas suas <span className="text-purple-600">fotos e vídeos</span>.
                        </h2>
                        <p className={`text-base sm:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Envie fotos ou vídeos privados e borrados diretamente no chat. A pessoa paga via Pix na hora para desbloquear.
                        </p>
                        <div className={`p-2.5 bg-white border border-slate-200/80 rounded-2xl max-w-xs mx-auto lg:mx-0 flex justify-between items-center gap-2 shadow-xs ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Simular Preço:</span>
                            <div className="flex gap-1.5">
                                {[10, 29.90, 49.90].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setMediaPrice(val);
                                            resetMediaSimulation();
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            mediaPrice === val 
                                                ? 'bg-purple-600 text-white shadow-xs' 
                                                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600'
                                        }`}
                                    >
                                        R$ {val.toFixed(0)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 text-purple-700 text-xs font-bold tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                            <span>Apoio Espontâneo</span>
                        </div>
                        <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            Receba <span className="text-purple-600">mimos em dinheiro</span> dos seus apoiadores.
                        </h2>
                        <p className={`text-base sm:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Fãs podem enviar mimos em Pix direto no chat a qualquer momento, sem exigir nada em troca, como reconhecimento pela sua atenção.
                        </p>
                    </div>
                );
            case 3:
                return (
                    <div className={`space-y-4 text-center lg:text-left ${isExiting ? 'animate-slide-out-title' : ''}`}>
                        <div className="inline-flex w-16 h-16 items-center justify-center bg-purple-100 text-purple-600 rounded-3xl mb-2 shadow-inner animate-title-elastic">
                            <Zap className="w-8 h-8 text-purple-600 animate-pulse" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight animate-title-elastic">
                            Comece agora no <span className="text-purple-600">MimoChat</span>
                        </h2>
                        <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-medium max-w-lg animate-subtitle-elastic">
                            Crie seu perfil profissional em poucos instantes e comece a conversar com pessoas reais monetizando seu tempo.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    }

    // ─── RENDERIZAÇÃO DOS BOTÕES CTA DE CADA ETAPA ───
    function renderStepActions() {
        switch (activeStep) {
            case 0:
                return (
                    <div className={`pt-2 flex justify-center lg:justify-start ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full sm:max-w-md py-4 px-8 text-sm sm:text-base font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-2xl transition shadow-lg shadow-purple-600/25 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>E como envio fotos e vídeos?</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                    </div>
                );
            case 1:
                return (
                    <div className={`pt-2 flex items-center justify-center lg:justify-start gap-3 ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full sm:max-w-md py-4 px-8 text-sm sm:text-base font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-2xl transition shadow-lg shadow-purple-600/25 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>Gostei! Como funcionam os Mimos?</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className={`pt-2 flex items-center justify-center lg:justify-start gap-3 ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full sm:max-w-md py-4 px-8 text-sm sm:text-base font-extrabold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-2xl transition shadow-lg shadow-purple-600/25 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>Quero criar meu perfil</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                    </div>
                );
            case 3:
                return null;
            default:
                return null;
        }
    }

    // ─── RENDERIZAÇÃO DOS ELEMENTOS SOLTOS DIRETO NA TELA (SEM CELULAR) ───
    function renderCanvasScene() {
        switch (activeStep) {
            case 0:
                return (
                    <div className="w-full max-w-lg mx-auto flex flex-col gap-3 py-2">
                        {/* Header de contexto da conversa solto na tela */}
                        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-md shadow-purple-950/5 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-600/20 shrink-0">
                                    <img src="/assets/carlos.png" alt="Carlos Mendes" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-sm font-bold text-slate-900">Carlos Mendes</h4>
                                    <p className="text-xs text-emerald-600 font-semibold">Conversando agora</p>
                                </div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-1.5 text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Saldo ganho</span>
                                <span className="text-sm font-black text-emerald-600">+ R$ {simulatedEarnings.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Balões de Mensagens Soltos Direto na Tela com Animação Fluida */}
                        <div className="flex flex-col gap-3 min-h-[290px] justify-end p-1">
                            {chatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col max-w-[85%] sm:max-w-[78%] animate-in fade-in slide-in-from-bottom-3 duration-500 ${
                                        msg.sender === 'fan' ? 'self-start items-start' : 'self-end items-end'
                                    }`}
                                >
                                    <div
                                        className={`p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-md transition-all ${
                                            msg.sender === 'fan'
                                                ? 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                                                : 'bg-purple-600 text-white font-medium rounded-2xl rounded-tr-sm shadow-purple-600/20'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                                        {msg.gain && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                                                + R$ {msg.gain.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Indicador de digitando animado */}
                            {chatTyping && (
                                <div className="self-start flex items-center gap-1.5 bg-white border border-slate-200/80 py-2.5 px-3.5 rounded-2xl rounded-tl-sm shadow-sm text-slate-400 animate-in fade-in duration-300">
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                </div>
                            )}
                        </div>

                        {/* Barra inferior simulada de resposta */}
                        <div className="flex items-center gap-2 bg-white/95 border border-slate-200/80 rounded-2xl p-2 px-3.5 shadow-sm">
                            <span className="text-xs text-slate-400 flex-1 font-medium select-none">Você ganha a cada resposta enviada...</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <Send className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="w-full max-w-lg mx-auto flex flex-col gap-3 py-2">
                        {/* Header de contexto */}
                        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-md shadow-purple-950/5 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-600/20 shrink-0">
                                    <img src="/assets/carlos.png" alt="Carlos Mendes" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-sm font-bold text-slate-900">Carlos Mendes</h4>
                                    <p className="text-xs text-purple-600 font-semibold">Mídias pagas</p>
                                </div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-1.5 text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Desbloqueio Pix</span>
                                <span className="text-sm font-black text-emerald-600">+ R$ {mediaEarnings.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Balões e Mídia Soltos Direto na Tela */}
                        <div className="flex flex-col gap-3 min-h-[300px] justify-end p-1">
                            {mediaChatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col max-w-[85%] sm:max-w-[78%] animate-in fade-in slide-in-from-bottom-3 duration-500 ${
                                        msg.sender === 'fan' ? 'self-start items-start' : 'self-end items-end'
                                    }`}
                                >
                                    {msg.text && (
                                        <div
                                            className={`p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                                                msg.sender === 'fan'
                                                    ? 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                                                    : 'bg-purple-600 text-white font-medium rounded-2xl rounded-tr-sm shadow-purple-600/20'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    )}

                                    {msg.isMedia && (
                                        <div className="relative w-64 sm:w-72 aspect-4/3 rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg mt-1 group">
                                            <img
                                                src="/assets/laura.png"
                                                alt="Mídia Exclusiva"
                                                className="w-full h-full object-cover transition-all duration-700 ease-out"
                                                style={{ filter: mediaUnlocked ? 'blur(0px)' : 'blur(18px)' }}
                                            />
                                            {!mediaUnlocked ? (
                                                <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                                                    <button
                                                        onClick={handleSimulateUnlock}
                                                        disabled={mediaLoading}
                                                        className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition transform active:scale-95"
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
                                                    <span>Mídia Desbloqueada</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {mediaChatTyping && (
                                <div className="self-start flex items-center gap-1.5 bg-white border border-slate-200/80 py-2.5 px-3.5 rounded-2xl rounded-tl-sm shadow-sm text-slate-400 animate-in fade-in duration-300">
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="w-full max-w-lg mx-auto flex flex-col gap-3 py-2">
                        {/* Header de contexto */}
                        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-md shadow-purple-950/5 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-600/20 shrink-0">
                                    <img src="/assets/carlos.png" alt="Carlos Mendes" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-sm font-bold text-slate-900">Carlos Mendes</h4>
                                    <p className="text-xs text-purple-600 font-semibold">Mimos & Gorjetas</p>
                                </div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-1.5 text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mimos Recebidos</span>
                                <span className="text-sm font-black text-emerald-600">+ R$ {mimoEarnings.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Balões e Card do Mimo Direto na Tela */}
                        <div className="flex flex-col gap-3 min-h-[300px] justify-end p-1">
                            {mimoChatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col max-w-[85%] sm:max-w-[78%] animate-in fade-in slide-in-from-bottom-3 duration-500 ${
                                        msg.isMimoBanner
                                            ? 'self-center items-center my-1'
                                            : msg.sender === 'fan'
                                            ? 'self-start items-start'
                                            : 'self-end items-end'
                                    }`}
                                >
                                    {msg.text && (
                                        <div
                                            className={`p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                                                msg.sender === 'fan'
                                                    ? 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                                                    : 'bg-purple-600 text-white font-medium rounded-2xl rounded-tr-sm shadow-purple-600/20'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    )}

                                    {msg.isMimoBanner && (
                                        <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-lg shadow-purple-500/10 flex items-center gap-3.5 animate-in zoom-in-95 duration-500">
                                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                                                <img src="/assets/gift.png" alt="Mimo Recebido" className="w-8 h-8 object-contain" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block">Mimo Recebido via Pix</span>
                                                <span className="text-xl font-black text-slate-900 block">+ R$ {msg.gain?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {mimoChatTyping && (
                                <div className="self-start flex items-center gap-1.5 bg-white border border-slate-200/80 py-2.5 px-3.5 rounded-2xl rounded-tl-sm shadow-sm text-slate-400 animate-in fade-in duration-300">
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-purple-950/5 relative animate-in fade-in zoom-in-95 duration-500">
                        <div id="clerk-captcha" />
                        
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900">Criar minha Conta</h3>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">Crie seu perfil profissional no MimoChat ou acesse sua conta existente.</p>
                        </div>

                        {!pendingVerification ? (
                            <div className="flex flex-col gap-4">
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
                                    className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-0 text-white rounded-2xl py-3.5 font-bold shadow-md shadow-purple-600/25 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                                />

                                <div className="flex items-center gap-3 my-1">
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
                                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl py-3.5 font-bold shadow-sm cursor-pointer"
                                />

                                {/* Checkbox de Maioridade e Termos */}
                                <div className="relative flex items-start gap-2.5 mt-2 mb-0.5 text-left select-none">
                                    {showAgeGateTooltip && (
                                        <div className="absolute bottom-full left-0 mb-3 w-full max-w-[280px] bg-purple-950/95 backdrop-blur-md text-white text-[11px] font-extrabold py-2.5 px-3.5 rounded-xl shadow-lg shadow-purple-500/10 z-20 flex items-center gap-2 border border-purple-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                                            <span className="relative flex h-2 w-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                            </span>
                                            <span className="tracking-wide text-purple-100">Marque esta opção para continuar</span>
                                            <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-purple-950/95 rotate-45 border-r border-b border-purple-500/30"></div>
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
                                            Política de Privacidade
                                        </Link>{' '}
                                        do MimoChat.
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-slate-500">
                                        Enviamos um código para
                                    </p>
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
                                    className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-0 text-white rounded-2xl py-3.5 font-bold shadow-md shadow-purple-600/25 cursor-pointer"
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
                );

            default:
                return null;
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#fafafc] text-slate-800 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-x-hidden flex flex-col justify-between z-10">
            {/* CSS de Animações Fluidas */}
            <style>{`
                @keyframes slideTitleIn {
                    from { transform: translateX(40px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideSubtitleIn {
                    from { transform: translateX(30px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideButtonIn {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .animate-title-elastic {
                    animation: slideTitleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-subtitle-elastic {
                    animation: slideSubtitleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
                    opacity: 0;
                }
                .animate-button-elastic {
                    animation: slideButtonIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
                    opacity: 0;
                }

                @keyframes slideOutTitle {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(-40px); opacity: 0; }
                }
                @keyframes slideOutSubtitle {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(-30px); opacity: 0; }
                }
                @keyframes slideOutButton {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(30px); opacity: 0; }
                }

                .animate-slide-out-title {
                    animation: slideOutTitle 0.35s ease-out forwards;
                }
                .animate-slide-out-subtitle {
                    animation: slideOutSubtitle 0.35s ease-out forwards;
                }
                .animate-slide-out-button {
                    animation: slideOutButton 0.35s ease-out forwards;
                }
            `}</style>

            {/* Efeito de Fundo Suave */}
            <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-purple-400/10 blur-[120px] pointer-events-none select-none z-0" />
            <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] rounded-full bg-pink-400/8 blur-[120px] pointer-events-none select-none z-0" />
            <div className="absolute bottom-[-10%] left-[20%] w-[350px] h-[350px] rounded-full bg-purple-600/6 blur-[100px] pointer-events-none select-none z-0" />

            {/* HEADER DA PÁGINA */}
            <header className="sticky top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 h-20 w-full bg-[#fafafc]/80 backdrop-blur-md select-none border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                    {step > 0 && (
                        <button 
                            onClick={prevStep} 
                            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs transition cursor-pointer flex items-center justify-center"
                            aria-label="Voltar"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md shadow-purple-600/20">
                            <Image
                                src="/Logo.svg"
                                alt="MimoChat"
                                width={20}
                                height={20}
                                priority
                                className="w-5 h-5 object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            MimoChat
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        href="/login" 
                        className="px-4 py-2 text-xs font-black text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                        Entrar
                    </Link>
                </div>
            </header>

            {/* ÁREA PRINCIPAL */}
            <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-6 lg:py-10 max-w-7xl mx-auto w-full relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full my-auto">
                    
                    {/* Coluna da Esquerda: Textos e Ação */}
                    <div className="lg:col-span-6 flex flex-col justify-center text-center lg:text-left space-y-6">
                        <div key={`text-${activeStep}`} className="space-y-4">
                            {renderStepTexts()}
                        </div>
                        <div key={`action-${activeStep}`}>
                            {renderStepActions()}
                        </div>
                    </div>

                    {/* Coluna da Direita: Elementos Soltos na Tela */}
                    <div className="lg:col-span-6 flex items-center justify-center w-full relative">
                        <div key={`scene-${activeStep}`} className="w-full">
                            {renderCanvasScene()}
                        </div>
                    </div>

                </div>
            </main>

            {/* Rodapé / Barra de Progresso Discreta */}
            <footer className="w-full py-4 px-6 flex items-center justify-center gap-2 border-t border-slate-200/40 select-none">
                {[0, 1, 2, 3].map((s) => (
                    <button
                        key={s}
                        onClick={() => changeStep(s)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeStep === s 
                                ? 'w-8 bg-purple-600' 
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
