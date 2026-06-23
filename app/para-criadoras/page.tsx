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
    ShieldCheck, 
    Check, 
    CheckCircle2, 
    MessageCircle, 
    Zap, 
    Lock, 
    Send, 
    BadgeCheck, 
    Flame,
    User,
    LockKeyhole,
    DollarSign,
    LockKeyholeOpen
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';
import Phone3D from './components/Phone3D';

const buildProfessionalMetadata = () => ({
    role: 'professional',
    profileSelectedAt: new Date().toISOString(),
    profileRoleSource: 'creator_landing',
});



function ParaCriadorasContent() {
    // Máquina de estados dos passos (0 a 4)
    const [step, setStep] = useState(0);
    const [activeStep, setActiveStep] = useState(0); // Passo realmente visível
    const [isExiting, setIsExiting] = useState(false); // Indica que a tela atual está saindo
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    // ─── ESTADOS E LÓGICA DE AUTENTICAÇÃO DO CLERK ───
    const router = useRouter();
    const { isSignedIn } = useAuth();
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

    useEffect(() => {
        if (isSignedIn) {
            router.replace('/chats');
        }
    }, [isSignedIn, router]);

    const clerkError = (err: unknown, fallback: string): string => {
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
                unsafeMetadata: buildProfessionalMetadata()
            });
        } catch (err: unknown) {
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

    // ─── ESTADOS DE CARREGAMENTO DO CELULAR 3D E IMAGENS ───
    const [isImagesLoaded, setIsImagesLoaded] = useState(false);
    const [isPhoneMounted, setIsPhoneMounted] = useState(false);
    const isFullyLoaded = isImagesLoaded && isPhoneMounted;

    useEffect(() => {
        const imageUrls = [
            '/assets/carlos.png',
            '/assets/rafael.png',
            '/assets/bruno.png',
            '/assets/diego.png',
            '/assets/mateus.png',
            '/assets/laura.png'
        ];

        let loadedCount = 0;
        const totalImages = imageUrls.length;

        imageUrls.forEach(url => {
            const img = new window.Image();
            img.src = url;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    setIsImagesLoaded(true);
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    setIsImagesLoaded(true);
                }
            };
        });
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileDevice(window.innerWidth < 1024);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    


    // ─── ESTADOS DO SIMULADOR DE CHAT (PASSO 1) ───
    const [chatMessages, setChatMessages] = useState<Array<{ sender: 'fan' | 'creator'; text: string; time: string; gain?: number }>>([]);
    const [chatStep, setChatStep] = useState(0);
    const [chatTyping, setChatTyping] = useState(false);
    const [simulatedEarnings, setSimulatedEarnings] = useState(0.00);

    // ─── ESTADOS DO SIMULADOR DE MÍDIAS EM CHAT (PASSO 2) ───
    const [mediaChatMessages, setMediaChatMessages] = useState<Array<{ sender: 'fan' | 'creator'; text?: string; isMedia?: boolean; time: string; gain?: number }>>([]);
    const [mediaChatStep, setMediaChatStep] = useState(0);
    const [mediaChatTyping, setMediaChatTyping] = useState(false);
    const [mediaPrice, setMediaPrice] = useState(29.90);
    const [mediaUnlocked, setMediaUnlocked] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaEarnings, setMediaEarnings] = useState(0.00);

    // ─── ESTADOS DO SIMULADOR DE MIMOS EM CHAT (PASSO 3) ───
    const [mimoChatMessages, setMimoChatMessages] = useState<Array<{ sender: 'fan' | 'creator' | 'system'; text?: string; isMimoBanner?: boolean; time: string; gain?: number }>>([]);
    const [mimoChatStep, setMimoChatStep] = useState(0);
    const [mimoChatTyping, setMimoChatTyping] = useState(false);
    const [mimoEarnings, setMimoEarnings] = useState(0.00);

    // Lógica do Simulador de Chat (Passo 1)
    useEffect(() => {
        if (activeStep !== 1) {
            setChatMessages([]);
            setChatStep(0);
            setChatTyping(false);
            setSimulatedEarnings(0.00);
            return;
        }

        const script = [
            { sender: 'fan', text: 'Oi! Vi seu Insta... Queria conversar com você!', delay: 800, gain: 4.50 },
            { sender: 'creator', text: 'Oi! Tudo bem? Aqui no Mimo a gente conversa no privado 💜', delay: 1400 },
            { sender: 'fan', text: 'Legal! E como você responde tão rápido?', delay: 1100, gain: 5.50 },
            { sender: 'creator', text: 'O app me notifica na hora! Respondo no meu tempo.', delay: 1600 }
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

    // Lógica do Simulador de Mídias em Chat (Passo 2)
    useEffect(() => {
        if (activeStep !== 2) {
            setMediaChatMessages([]);
            setMediaChatStep(0);
            setMediaChatTyping(false);
            setMediaUnlocked(false);
            setMediaEarnings(0.00);
            return;
        }

        const mediaScript = [
            { sender: 'fan', text: 'Oi! Manda a prévia do ensaio que você postou nos stories? 🫣', delay: 800 },
            { sender: 'creator', text: 'Oi! Capaz, acabei de enviar abaixo! Clica para ver 💜', delay: 1500 },
            { sender: 'creator', isMedia: true, delay: 1000 }
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

    // Timer de Auto-Desbloqueio da Mídia (Passo 2)
    useEffect(() => {
        if (activeStep === 2 && mediaChatStep === 3 && !mediaUnlocked && !mediaLoading) {
            // Espera 1.5s após exibir o balão de mídia para iniciar o auto-desbloqueio
            const autoUnlockTimer = setTimeout(() => {
                handleSimulateUnlock();
            }, 1500);

            return () => clearTimeout(autoUnlockTimer);
        }
    }, [activeStep, mediaChatStep, mediaUnlocked, mediaLoading]);

    // Lógica do Simulador de Mimos em Chat (Passo 3)
    useEffect(() => {
        if (activeStep !== 3) {
            setMimoChatMessages([]);
            setMimoChatStep(0);
            setMimoChatTyping(false);
            setMimoEarnings(0.00);
            return;
        }

        const mimoScript = [
            { sender: 'fan', text: 'Sua conversa é incrível! Te mandei um mimo para agradecer o papo de hoje 💜', delay: 800 },
            { sender: 'fan', isMimoBanner: true, gain: 50.00, delay: 1600 },
            { sender: 'creator', text: 'Nossa, muito obrigada! Fico super feliz com o carinho! 😍', delay: 1500 }
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

    // Reinicia a simulação de mídia
    function resetMediaSimulation() {
        setMediaUnlocked(false);
        setMediaEarnings(0.00);
        setMediaChatMessages([]);
        setMediaChatStep(0);
        setMediaChatTyping(false);
    }

    // Lógica ao simular a compra da mídia pelo fã
    function handleSimulateUnlock() {
        if (mediaUnlocked || mediaLoading) return;
        setMediaLoading(true);
        
        setTimeout(() => {
            setMediaLoading(false);
            setMediaUnlocked(true);
            
            // Animando o saldo ganho
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

            // Adiciona mensagem final do fã logo após desbloquear
            setTimeout(() => {
                setMediaChatTyping(true);
                setTimeout(() => {
                    setMediaChatTyping(false);
                    setMediaChatMessages(prev => [
                        ...prev, 
                        {
                            sender: 'fan',
                            text: 'Nossa, ficou perfeito!! Valeu cada centavo, você é linda 😍🔥',
                            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        }
                    ]);
                }, 1000);
            }, 800);

        }, 1200);
    }

    function changeStep(nextVal: number) {
        if (nextVal === activeStep) return;
        setIsExiting(true);
        // Aguarda a transição de saída durar 800ms antes de trocar o conteúdo (500ms de saída + 300ms de pausa)
        setTimeout(() => {
            setActiveStep(nextVal);
            setStep(nextVal);
            setIsExiting(false);
        }, 800);
    }

    function nextStep() {
        if (activeStep < 4) {
            setDirection('forward');
            changeStep(activeStep + 1);
        }
    }

    function prevStep() {
        if (activeStep > 0) {
            setDirection('backward');
            changeStep(activeStep - 1);
        }
    }

    // Atalhos do teclado para avançar/voltar no desktop
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

            if (e.key === 'ArrowRight') {
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                prevStep();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeStep]);



    // Renderização do Display Interno do Celular (Compartilhado entre Mobile e Desktop)
    function renderPhoneDisplay(isMobile = false) {
        return (
            <div className={`flex flex-col h-full w-full bg-white transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                {(() => {
                    switch (activeStep) {
                        case 0:
                            return (
                                <>
                                    {/* Status Bar */}
                                    <div className={`${isMobile ? 'py-0.5 px-3 text-[5px]' : 'py-1.5 px-4 text-[9px]'} bg-purple-600 font-bold text-white/95 flex justify-between items-center select-none leading-none shrink-0`}>
                                        <span>21:39</span>
                                        <div className="flex items-center gap-0.5">
                                            <span>4G</span>
                                            <span className={`${isMobile ? 'w-2 h-1' : 'w-4 h-2'} bg-white/30 rounded-2xs inline-block relative overflow-hidden`}>
                                                <span className="absolute left-0 top-0 bottom-0 w-2/3 bg-white"></span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Header Roxo */}
                                    <div className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} bg-purple-600 flex items-center justify-between border-b border-purple-500/20 select-none shadow-sm shrink-0 leading-none`}>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} rounded-md bg-purple-900/40 flex items-center justify-center text-white/95`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${isMobile ? 'w-2 h-2' : 'w-3.5 h-3.5'}`}><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5" rx="1"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                                            </div>
                                            <div className="flex items-center gap-1 leading-none">
                                                <span className={`${isMobile ? 'text-[9px]' : 'text-[13px]'} text-white font-black tracking-tight`}>Mimo</span>
                                                <span className={`${isMobile ? 'text-[4px] px-0.5' : 'text-[6px] px-1 py-0.5'} font-black tracking-wider text-purple-200 border border-purple-400 bg-purple-950/20 rounded-sm uppercase`}>Conversas</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de Chats */}
                                    <div className="flex-1 overflow-y-auto bg-white scrollbar-none divide-y divide-slate-50 flex flex-col justify-start">

                                        {/* Carlos Mendes */}
                                        <div className={`${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-3.5 py-2 gap-2.5'} flex items-center select-none`}>
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-7.5 h-7.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/carlos.png" className="w-full h-full object-cover" alt="Carlos Mendes" />
                                            </div>
                                            <div className={`flex-1 min-w-0 flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`${isMobile ? 'text-[8px]' : 'text-[10.5px]'} font-black text-slate-800 truncate leading-none`}>Carlos Mendes</h4>
                                                    <span className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} text-slate-400 font-bold shrink-0 ml-1 leading-none`}>agora</span>
                                                </div>
                                                <p className={`${isMobile ? 'text-[7px]' : 'text-[8.5px]'} text-slate-400 font-medium truncate leading-none`}>Como foi o seu dia hoje? 😊</p>
                                            </div>
                                        </div>

                                        {/* Rafael Souza */}
                                        <div className={`${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-3.5 py-2 gap-2.5'} flex items-center select-none`}>
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-7.5 h-7.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/rafael.png" className="w-full h-full object-cover" alt="Rafael Souza" />
                                            </div>
                                            <div className={`flex-1 min-w-0 flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`${isMobile ? 'text-[8px]' : 'text-[10.5px]'} font-black text-slate-800 truncate leading-none`}>Rafael Souza</h4>
                                                    <span className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} text-slate-400 font-bold shrink-0 ml-1 leading-none`}>14:22</span>
                                                </div>
                                                <p className={`${isMobile ? 'text-[7px]' : 'text-[8.5px]'} text-slate-400 font-medium truncate leading-none`}>O que você tá fazendo agora?</p>
                                            </div>
                                        </div>

                                        {/* Bruno Lima */}
                                        <div className={`${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-3.5 py-2 gap-2.5'} flex items-center select-none`}>
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-7.5 h-7.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/bruno.png" className="w-full h-full object-cover" alt="Bruno Lima" />
                                            </div>
                                            <div className={`flex-1 min-w-0 flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`${isMobile ? 'text-[8px]' : 'text-[10.5px]'} font-black text-slate-800 truncate leading-none`}>Bruno Lima</h4>
                                                    <span className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} text-slate-400 font-bold shrink-0 ml-1 leading-none`}>11:58</span>
                                                </div>
                                                <p className={`${isMobile ? 'text-[7px]' : 'text-[8.5px]'} text-slate-400 font-medium truncate leading-none`}>Você vai ter tempo pra conversar hoje?</p>
                                            </div>
                                        </div>

                                        {/* Diego Santos */}
                                        <div className={`${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-3.5 py-2 gap-2.5'} flex items-center select-none`}>
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-7.5 h-7.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/diego.png" className="w-full h-full object-cover" alt="Diego Santos" />
                                            </div>
                                            <div className={`flex-1 min-w-0 flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`${isMobile ? 'text-[8px]' : 'text-[10.5px]'} font-black text-slate-800 truncate leading-none`}>Diego Santos</h4>
                                                    <span className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} text-slate-400 font-bold shrink-0 ml-1 leading-none`}>09/06</span>
                                                </div>
                                                <p className={`${isMobile ? 'text-[7px]' : 'text-[8.5px]'} text-slate-400 font-medium truncate leading-none`}>Oi! Tudo bem com você hoje?</p>
                                            </div>
                                        </div>

                                        {/* Mateus Costa */}
                                        <div className={`${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-3.5 py-2 gap-2.5'} flex items-center select-none`}>
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-7.5 h-7.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/mateus.png" className="w-full h-full object-cover" alt="Mateus Costa" />
                                            </div>
                                            <div className={`flex-1 min-w-0 flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`${isMobile ? 'text-[8px]' : 'text-[10.5px]'} font-black text-slate-800 truncate leading-none`}>Mateus Costa</h4>
                                                    <span className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} text-slate-400 font-bold shrink-0 ml-1 leading-none`}>08/06</span>
                                                </div>
                                                <p className={`${isMobile ? 'text-[7px]' : 'text-[8.5px]'} text-slate-400 font-medium truncate leading-none`}>Me conta, como foi o fim de semana?</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de Navegação Inferior */}
                                    <div className={`${isMobile ? 'px-3 py-0.5' : 'px-3 py-2'} bg-slate-50 flex justify-around items-center select-none shrink-0`}>
                                        <div className={`flex flex-col items-center text-purple-600 ${isMobile ? 'gap-px' : 'gap-0.5'}`}>
                                            <MessageCircle className={`${isMobile ? 'w-3 h-3' : 'w-4.5 h-4.5'}`} />
                                            <span className={`${isMobile ? 'text-[5px]' : 'text-[7px]'} font-black leading-none`}>Conversas</span>
                                        </div>
                                        <div className={`flex flex-col items-center text-slate-400 ${isMobile ? 'gap-px' : 'gap-0.5'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${isMobile ? 'w-3 h-3' : 'w-4.5 h-4.5'}`}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                            <span className={`${isMobile ? 'text-[5px]' : 'text-[7px]'} font-bold leading-none`}>Buscar</span>
                                        </div>
                                        <div className={`flex flex-col items-center text-slate-400 ${isMobile ? 'gap-px' : 'gap-0.5'}`}>
                                            <User className={`${isMobile ? 'w-3 h-3' : 'w-4.5 h-4.5'}`} />
                                            <span className={`${isMobile ? 'text-[5px]' : 'text-[7px]'} font-bold leading-none`}>Perfil</span>
                                        </div>
                                    </div>
                                </>
                            );
                        case 1:
                            return (
                                <>
                                    {/* Header do Chat */}
                                    <div className={`${isMobile ? 'py-2 px-2.5' : 'py-2 px-3'} bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none`}>
                                        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                                            <div className={`${isMobile ? 'w-7 h-7' : 'w-6.5 h-6.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/carlos.png" className="w-full h-full object-cover" alt="Carlos Mendes" />
                                            </div>
                                            <div className="leading-none">
                                                <h4 className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-extrabold text-slate-800`}>Carlos Mendes</h4>
                                                <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-emerald-600 font-extrabold`}>Conversa ativa</span>
                                            </div>
                                        </div>
                                        <div className="text-right leading-none">
                                            <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-slate-400 block font-bold`}>Saldo</span>
                                            <span className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-black text-emerald-600`}>R$ {simulatedEarnings.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Corpo do Chat */}
                                    <div className={`${isMobile ? 'p-2 space-y-2 text-[10px]' : 'p-2.5 space-y-2.5 text-[10.5px]'} flex-1 overflow-y-auto flex flex-col justify-end scrollbar-none bg-slate-50/50`}>
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col max-w-[85%] ${msg.sender === 'fan' ? 'self-start' : 'self-end'}`}>
                                                <div className={`rounded-xl leading-normal ${isMobile ? 'p-2 px-2.5 shadow-sm' : 'p-2.5 px-3 shadow-3xs'} ${
                                                    msg.sender === 'fan' 
                                                        ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-xs shadow-3xs' 
                                                        : 'bg-purple-600 text-white rounded-tr-xs shadow-3xs'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                                {msg.gain && (
                                                    <span className={`${isMobile ? 'text-[8px] mt-1 px-2 py-0.5' : 'text-[8.5px] mt-1 px-2 py-0.5'} font-bold text-emerald-600 ${msg.sender === 'fan' ? 'self-start' : 'self-end'} bg-emerald-50 rounded-full border border-emerald-100`}>
                                                        + R$ {msg.gain.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {chatTyping && (
                                            <div className="self-start flex items-center gap-1 bg-white border border-slate-100 py-1.5 px-2.5 rounded-full text-slate-400">
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input */}
                                    <div className={`bg-white border-t border-slate-100 flex items-center shrink-0 select-none ${isMobile ? 'p-2 gap-1' : 'p-2.5 gap-1.5'}`}>
                                        <div className={`${isMobile ? 'text-[9px] py-1.5' : 'text-[10px] py-1.5 px-3'} flex-1 bg-slate-55 rounded-full px-2.5 text-slate-400`}>
                                            Escreva uma resposta...
                                        </div>
                                        <div className={`${isMobile ? 'w-5.5 h-5.5' : 'w-6.5 h-6.5'} rounded-full bg-purple-600 flex items-center justify-center text-white`}>
                                            <Send className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} />
                                        </div>
                                    </div>
                                </>
                            );
                        case 2:
                            return (
                                <>
                                    {/* Header do Chat */}
                                    <div className={`${isMobile ? 'py-2 px-2.5' : 'py-2 px-3'} bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none`}>
                                        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                                            <div className={`${isMobile ? 'w-7 h-7' : 'w-6.5 h-6.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/carlos.png" className="w-full h-full object-cover" alt="Carlos Mendes" />
                                            </div>
                                            <div className="leading-none">
                                                <h4 className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-extrabold text-slate-800`}>Carlos Mendes</h4>
                                                <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-slate-400`}>Mensagens & Mídias</span>
                                            </div>
                                        </div>
                                        <div className="text-right leading-none">
                                            <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-slate-400 block font-bold`}>Saldo</span>
                                            <span className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-black text-emerald-600`}>R$ {mediaEarnings.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Corpo do Chat */}
                                    <div className={`${isMobile ? 'p-2 space-y-2.5 text-[10px]' : 'p-2.5 space-y-2.5 text-[10.5px]'} flex-1 overflow-y-auto flex flex-col justify-end scrollbar-none bg-slate-50/50`}>
                                        {mediaChatMessages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col max-w-[85%] ${msg.sender === 'fan' ? 'self-start' : 'self-end'}`}>
                                                {msg.text && (
                                                    <div className={`rounded-xl leading-normal ${isMobile ? 'p-2 px-2.5 shadow-sm' : 'p-2.5 px-3 shadow-3xs'} ${
                                                        msg.sender === 'fan' 
                                                            ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-xs shadow-3xs' 
                                                            : 'bg-purple-600 text-white rounded-tr-xs shadow-3xs'
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                )}
                                                {msg.isMedia && (
                                                    <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-xs border border-slate-200/30 self-end shrink-0 ${
                                                        isMobile ? 'w-[150px]' : 'w-[175px]'
                                                    }`}>
                                                        <img 
                                                            src="/assets/laura.png" 
                                                            alt="Mídia Privada" 
                                                            className="absolute inset-0 w-full h-full object-cover transition-all duration-[1000ms] ease-out z-0"
                                                            style={{ filter: mediaUnlocked ? 'blur(0px)' : 'blur(16px)' }}
                                                        />
                                                        {!mediaUnlocked && (
                                                            <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center p-1.5 text-center z-10">
                                                                <button 
                                                                    onClick={handleSimulateUnlock}
                                                                    disabled={mediaLoading}
                                                                    className={`bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-lg shadow-md transition active:scale-[0.96] flex items-center gap-1 cursor-pointer select-none ${
                                                                        isMobile ? 'px-2 py-1 text-[7.5px]' : 'px-3 py-1.5 text-[8.5px]'
                                                                    }`}
                                                                >
                                                                    {mediaLoading ? (
                                                                        <>
                                                                            <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                                                                            <span>Processando...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Lock className="w-2.5 h-2.5 shrink-0" />
                                                                            <span>Desbloquear R$ {mediaPrice.toFixed(2)}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {mediaUnlocked && (
                                                            <div className={`absolute z-10 bg-emerald-500/90 text-white font-black tracking-wide rounded-full shadow-md flex items-center gap-0.5 border border-white/20 select-none ${
                                                                isMobile ? 'top-1.5 left-1.5 px-2 py-0.5 text-[6.5px]' : 'top-2 left-2 px-2.5 py-0.5 text-[8px]'
                                                            }`}>
                                                                <LockKeyholeOpen className="w-2 h-2 shrink-0" />
                                                                <span>Liberado</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {mediaChatTyping && (
                                            <div className="self-start flex items-center gap-1 bg-white border border-slate-100 py-1.5 px-2.5 rounded-full text-slate-400">
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                            </div>
                                        )}
                                    </div>

                                </>
                            );
                        case 3:
                            return (
                                <>
                                    {/* Header do Chat */}
                                    <div className={`${isMobile ? 'py-2 px-2.5' : 'py-2 px-3'} bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none`}>
                                        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                                            <div className={`${isMobile ? 'w-7 h-7' : 'w-6.5 h-6.5'} rounded-full overflow-hidden shrink-0`}>
                                                <img src="/assets/carlos.png" className="w-full h-full object-cover" alt="Carlos Mendes" />
                                            </div>
                                            <div className="leading-none">
                                                <h4 className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-extrabold text-slate-800`}>Carlos Mendes</h4>
                                                <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-slate-400`}>Mensagens & Mimos</span>
                                            </div>
                                        </div>
                                        <div className="text-right leading-none">
                                            <span className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} text-slate-400 block font-bold`}>Saldo</span>
                                            <span className={`${isMobile ? 'text-[11px]' : 'text-[9.5px]'} font-black text-emerald-600`}>R$ {mimoEarnings.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Corpo do Chat com Mimos */}
                                    <div className={`${isMobile ? 'p-2 space-y-2.5 text-[10px]' : 'p-2.5 space-y-2.5 text-[10.5px]'} flex-1 overflow-y-auto flex flex-col justify-end scrollbar-none bg-slate-50/50`}>
                                        {mimoChatMessages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col ${msg.sender === 'system' ? 'items-center' : msg.sender === 'fan' ? 'max-w-[85%] self-start' : 'max-w-[85%] self-end'}`}>
                                                {msg.text && (
                                                    <div className={`rounded-xl leading-normal ${isMobile ? 'p-2 px-2.5 shadow-sm' : 'p-2.5 px-3 shadow-3xs'} ${
                                                        msg.sender === 'fan' 
                                                            ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-xs shadow-3xs' 
                                                            : 'bg-purple-600 text-white rounded-tr-xs shadow-3xs'
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                )}
                                                {msg.isMimoBanner && (
                                                    <div className={`my-1 border border-slate-100 rounded-2xl shadow-xs flex items-center animate-scale-up border-l-purple-500 border-l-4 bg-white ${
                                                        isMobile ? 'py-2 px-2.5 max-w-[180px] gap-2' : 'py-2.5 px-3 max-w-[200px] gap-2.5'
                                                    }`}>
                                                        <div className={`relative shrink-0 overflow-hidden rounded-lg ${isMobile ? 'w-7 h-7' : 'w-8 h-8'}`}>
                                                            <img 
                                                                src="/assets/gift.png" 
                                                                alt="Mimo Recebido"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="leading-tight">
                                                            <span className={`${isMobile ? 'text-[7.5px]' : 'text-[8.5px]'} font-extrabold text-purple-600 block uppercase`}>Mimo Recebido</span>
                                                            <span className={`${isMobile ? 'text-[9.5px]' : 'text-[11px]'} font-black text-slate-850 block`}>R$ {msg.gain?.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {mimoChatTyping && (
                                            <div className="self-start flex items-center gap-1 bg-white border border-slate-100 py-1.5 px-2.5 rounded-full text-slate-400">
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input */}
                                    <div className={`bg-white border-t border-slate-100 flex gap-1 items-center shrink-0 select-none ${isMobile ? 'p-2' : 'p-3'}`}>
                                        <div className={`${isMobile ? 'text-[9px] py-1.5' : 'text-[10px] py-1.5'} flex-1 bg-slate-55 rounded-full px-2.5 text-slate-400`}>
                                            Enviar Mimo...
                                        </div>
                                    </div>
                                </>
                            );
                    }
                })()}
            </div>
        );
    }

    // Renderização dos textos (títulos e descrições) de cada passo
    function renderStepTexts() {
        switch (activeStep) {
            case 0:
                return (
                    <div className="space-y-4">
                        <h1 className={`text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            O único aplicativo de chat onde você <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">ganha por conversar</span>.
                        </h1>
                        <p className={`text-sm sm:text-sm lg:text-base text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            O Mimo é um chat privado onde seu tempo e atenção se transformam em lucros reais.
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-3 lg:space-y-4">
                        <h2 className={`text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            O seu tempo vale <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">dinheiro de verdade</span>.
                        </h2>
                        <p className={`text-sm sm:text-sm lg:text-base text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Defina o preço das suas mensagens e receba proporcionalmente por caractere em cada resposta dada.
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-3 lg:space-y-4">
                        <h2 className={`text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            Cobre pelas suas <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">fotos e vídeos</span>.
                        </h2>
                        <p className={`text-sm sm:text-sm lg:text-base text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Envie mídias privadas e borradas no chat. O fã faz um Pix para desbloquear na hora e assistir.
                        </p>
                        <div className={`p-2 bg-slate-50 border border-slate-100 rounded-xl max-w-xs mx-auto lg:mx-0 flex justify-between items-center gap-2 shadow-2xs ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Preço Simulado:</span>
                            <div className="flex gap-1">
                                {[10, 29.90, 49.90].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setMediaPrice(val);
                                            resetMediaSimulation();
                                        }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                            mediaPrice === val 
                                                ? 'bg-purple-600 text-white shadow-xs' 
                                                : 'bg-white border border-slate-100 text-slate-500'
                                        }`}
                                    >
                                        R$ {val.toFixed(0)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-3 lg:space-y-4">
                        <h2 className={`text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] ${isExiting ? 'animate-slide-out-title' : 'animate-title-elastic'}`}>
                            Receba <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">mimos espontâneos</span> de apoiadores.
                        </h2>
                        <p className={`text-sm sm:text-sm lg:text-base text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed ${isExiting ? 'animate-slide-out-subtitle' : 'animate-subtitle-elastic'}`}>
                            Seus fãs podem enviar presentes em dinheiro diretamente no chat, como forma de carinho, sem precisar de nada em troca.
                        </p>
                    </div>
                );
            case 4:
                return (
                    <div className={`space-y-4 text-center lg:text-left ${isExiting ? 'animate-slide-out-title' : ''}`}>
                        <div className="inline-flex w-16 h-16 items-center justify-center bg-purple-100 text-purple-600 rounded-3xl mb-2 shadow-inner animate-title-elastic">
                            <Zap className="w-8 h-8 text-purple-600 animate-pulse" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight animate-title-elastic">
                            Comece sua Jornada no <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">Mimo Chat</span> 💜
                        </h2>
                        <p className="text-sm lg:text-base text-slate-500 leading-relaxed font-medium max-w-lg animate-subtitle-elastic">
                            Crie sua conta profissional hoje mesmo para começar a interagir com seus fãs, monetizar suas conversas e ter total controle do seu conteúdo.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    }

    // Renderização das ações (botões CTA ou formulário final) de cada passo
    function renderStepActions() {
        switch (activeStep) {
            case 0:
                return (
                    <div className={`pt-2 flex justify-center lg:justify-start ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full md:max-w-md py-4 lg:py-4.5 px-8 sm:px-10 text-sm sm:text-sm lg:text-base font-extrabold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 rounded-2xl transition shadow-xl shadow-purple-300/30 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                        >
                            Quero ganhar conversando
                            <ArrowRight className="w-4 h-4 ml-1 inline" />
                        </button>
                    </div>
                );
            case 1:
                return (
                    <div className={`pt-1 flex items-center justify-center lg:justify-start gap-3 ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full md:max-w-md py-4 lg:py-4.5 px-8 sm:px-10 text-sm sm:text-sm lg:text-base font-extrabold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 rounded-2xl transition shadow-xl shadow-purple-300/30 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                        >
                            Entendi! E fotos/vídeos?
                            <ArrowRight className="w-4 h-4 ml-1 inline" />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className={`pt-1 flex items-center justify-center lg:justify-start gap-3 ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={nextStep}
                            className="w-full md:max-w-md py-4 lg:py-4.5 px-8 sm:px-10 text-sm sm:text-sm lg:text-base font-extrabold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 rounded-2xl transition shadow-xl shadow-purple-300/30 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                        >
                            Gostei! Como funcionam os Mimos?
                            <ArrowRight className="w-4 h-4 ml-1 inline" />
                        </button>
                    </div>
                );
            case 3:
                return (
                    <div className={`pt-1 flex items-center justify-center lg:justify-start gap-3 ${isExiting ? 'animate-slide-out-button' : 'animate-button-elastic'}`}>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full md:max-w-md py-4 lg:py-4.5 px-8 sm:px-10 text-sm sm:text-sm lg:text-base font-extrabold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 rounded-2xl transition shadow-xl shadow-purple-300/30 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                        >
                            Quero fazer parte do Mimo
                            <ArrowRight className="w-4 h-4 ml-1 inline" />
                        </button>
                    </div>
                );
            case 4:
                return null;
            default:
                return null;
        }
    }

    return (
        <div className="h-[100dvh] w-full bg-[#fafafc] text-slate-800 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-y-auto lg:overflow-hidden flex flex-col justify-between z-10">
            
            {/* ─── ESTILOS CSS E ANIMAÇÕES EXPO MAIS LENTAS ─── */}
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(1.5deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                @keyframes pulseGlow {
                    0% { opacity: 0.4; transform: scale(0.99); }
                    50% { opacity: 0.7; transform: scale(1.01); }
                    100% { opacity: 0.4; transform: scale(0.99); }
                }
                .animate-pulse-glow {
                    animation: pulseGlow 3s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
                .animate-shake {
                    animation: shake 0.25s ease-in-out;
                }
                
                /* Animações Expo de Entrada Coordenadas (Slide In Right / Bottom Up) */
                @keyframes slideTitleIn {
                    from { transform: translateX(80px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideSubtitleIn {
                    from { transform: translateX(60px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideWidgetIn {
                    from { transform: scale(0.85) translateY(40px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes slideButtonIn {
                    from { transform: translateY(55px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                
                .animate-title-elastic {
                    animation: slideTitleIn 0.85s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
                .animate-subtitle-elastic {
                    animation: slideSubtitleIn 0.85s cubic-bezier(0.19, 1, 0.22, 1) 0.12s forwards;
                    opacity: 0;
                }
                .animate-widget-elastic {
                    animation: slideWidgetIn 0.95s cubic-bezier(0.19, 1, 0.22, 1) 0.08s forwards;
                    opacity: 0;
                }
                .animate-button-elastic {
                    animation: slideButtonIn 0.85s cubic-bezier(0.19, 1, 0.22, 1) 0.2s forwards;
                    opacity: 0;
                }
                .animate-scale-up {
                    animation: scaleUp 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                /* Efeitos 3D para Celular na Diagonal e Carteira Flutuante */
                .perspective-3d {
                    perspective: 1200px;
                    transform-style: preserve-3d;
                }
                .rotate-diagonal-phone {
                    transform: rotateX(12deg) rotateY(-18deg) rotateZ(6deg);
                    transform-style: preserve-3d;
                    /* Lateral sutil em degradê 3D e sombras ultra-suaves de fundo */
                    box-shadow: 
                        -1px 1px 2px rgba(15, 23, 42, 0.35),
                        -3px 3px 6px rgba(15, 23, 42, 0.15),
                        -12px 24px 45px rgba(139, 92, 246, 0.15), 
                        -4px 8px 16px rgba(15, 23, 42, 0.05);
                    transition: transform 0.85s cubic-bezier(0.19, 1, 0.22, 1);
                }
                .rotate-diagonal-phone:hover {
                    transform: rotateX(8deg) rotateY(-12deg) rotateZ(4deg) scale(1.03);
                }

                @keyframes floatWallet {
                    0% { transform: translateY(0px) translateZ(30px); }
                    50% { transform: translateY(-8px) translateZ(40px); }
                    100% { transform: translateY(0px) translateZ(30px); }
                }
                .animate-float-wallet {
                    animation: floatWallet 5s ease-in-out infinite;
                }
                
                /* Animações de Saída Escalonadas (Slide Out Left / Bottom Down) */
                @keyframes slideOutTitle {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(-80px); opacity: 0; }
                }
                @keyframes slideOutSubtitle {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(-60px); opacity: 0; }
                }
                @keyframes slideOutButton {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(40px); opacity: 0; }
                }
                @keyframes widgetExitOut {
                    from { transform: scale(1) rotate(0deg) translateY(0); opacity: 1; }
                    to { transform: scale(0.85) rotate(5deg) translateY(20px); opacity: 0; }
                }
                
                .animate-slide-out-title {
                    animation: slideOutTitle 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
                }
                .animate-slide-out-subtitle {
                    animation: slideOutSubtitle 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.08s forwards !important;
                }
                .animate-slide-out-button {
                    animation: slideOutButton 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.15s forwards !important;
                }
                .animate-exit-widget {
                    animation: widgetExitOut 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
                }

                /* Animação de Slide-in do Celular 3D ao Carregar */
                .phone-slide-enter {
                    transform: translateX(120vw);
                    opacity: 0;
                    pointer-events: none;
                }
                .phone-slide-active {
                    transform: translateX(0);
                    opacity: 1;
                    transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 1.2s cubic-bezier(0.19, 1, 0.22, 1);
                }
            `}</style>

            {/* Efeito de Fundo Aurora do Perfil Público (Esferas Desfocadas Modernas) */}
            <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-purple-400/15 blur-[100px] pointer-events-none select-none z-0" />
            <div className="absolute top-[35%] right-[-15%] w-[300px] h-[300px] rounded-full bg-pink-400/12 blur-[90px] pointer-events-none select-none z-0" />
            <div className="absolute bottom-[15%] left-[-15%] w-[280px] h-[280px] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none select-none z-0" />
            
            {/* Textura Geométrica Discreta (Bolinhas Lavanda) */}
            <div 
                className="absolute inset-0 pointer-events-none select-none z-0" 
                style={{ 
                    backgroundImage: 'radial-gradient(#E9D5FF 1.5px, transparent 1.5px)', 
                    backgroundSize: '20px 20px',
                    opacity: 0.4
                }} 
            />

            {/* HEADER DA PÁGINA (ESTILO PREMIUM E MINIMALISTA) */}
            <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 h-20 w-full pointer-events-none select-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    {step > 0 && (
                        <button 
                            onClick={prevStep} 
                            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs transition cursor-pointer flex items-center justify-center"
                            aria-label="Voltar"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                            M
                        </div>
                        <span className="text-lg font-black tracking-tight text-slate-900">
                            mimo<span className="text-purple-600 font-extrabold text-[9px] ml-1 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Criadoras</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <Link 
                        href="/login" 
                        className="px-4 py-2 text-xs font-black text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                        Entrar
                    </Link>
                </div>
            </header>

            {/* ÁREA PRINCIPAL DO ONBOARDING */}
            <div className="flex-1 flex flex-col px-4 sm:px-6 pt-20 pb-3 lg:pt-24 lg:pb-8 lg:justify-center max-w-7xl mx-auto w-full relative z-20">
                
                {/* CONTEÚDO CENTRALIZADO (SEM ROLAGEM) */}
                <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center lg:my-auto min-h-0 w-full">
                    
                    {/* Wrapper de conteúdo: no mobile ocupa flex-1 (entre header e botão),
                         no desktop usa contents para participar diretamente no grid de 12 colunas */}
                    <div className="flex-1 flex flex-col items-center gap-3 min-h-0 overflow-visible lg:contents">

                    {/* 1. TEXTOS DO PASSO */}
                    <div 
                        key={`text-${activeStep}`} 
                        className={`lg:col-span-7 flex flex-col justify-center text-center lg:text-left shrink-0 ${
                            isExiting ? 'animate-exit-content' : ''
                        }`}
                    >
                        {renderStepTexts()}
                    </div>

                    {/* 2. COLUNA DA DIREITA: CELULAR PERSISTENTE OU FORMULÁRIO DO CLERK */}
                    <div className="transition-all duration-700 ease-out lg:col-span-5 flex justify-center lg:justify-end relative w-full lg:row-span-2 lg:self-center h-auto overflow-visible opacity-100 scale-100">
                        {activeStep === 4 ? (
                            /* CARD DE LOGIN/CADASTRO INTEGRADO DO CLERK */
                            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-purple-950/5 relative animate-widget-elastic">
                                <div id="clerk-captcha" />
                                
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">Criar minha Conta</h3>
                                    <p className="text-xs text-slate-500 mt-1">Crie sua conta profissional ou acesse uma conta existente.</p>
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
                                            className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-0 text-white rounded-2xl py-3.5 font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition"
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

                                        {/* Checkbox de Maioridade e Consentimento Legal */}
                                        <div className="relative flex items-start gap-2.5 mt-2 mb-0.5 text-left select-none">
                                            {showAgeGateTooltip && (
                                                <div className="absolute bottom-full left-0 mb-3 w-full max-w-[280px] bg-purple-950/95 backdrop-blur-md text-white text-[11px] font-extrabold py-2.5 px-3.5 rounded-xl shadow-lg shadow-purple-500/10 z-20 flex items-center gap-2 border border-purple-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
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
                                            className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-0 text-white rounded-2xl py-3.5 font-bold shadow-md cursor-pointer"
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
                        ) : (
                            /* CELULAR PERSISTENTE (ATIVO DURANTE OS PASSOS 0 A 3) */
                            <>
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/5 to-fuchsia-400/5 rounded-[3rem] blur-xl opacity-40 pointer-events-none z-0"></div>
                                
                                <div className={`z-10 w-full flex justify-center lg:justify-end relative ${
                                    isFullyLoaded ? 'phone-slide-active' : 'phone-slide-enter'
                                }`}>
                                    <div className="relative flex items-center justify-center w-[320px] h-[340px] lg:w-[350px] lg:h-[560px]">
                                        <div className={`absolute z-30 select-none transition-all duration-[750ms] ease-out ${
                                            isMobileDevice 
                                                ? 'left-[25px] top-[26%] w-[95px] rounded-lg border border-white/20 bg-white/80 p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-md'
                                                : '-left-12 top-[24%] w-[140px] rounded-xl border border-white/20 bg-white/80 p-3 shadow-[0_15px_30px_rgba(15,23,42,0.06)] backdrop-blur-lg'
                                        } ${
                                            activeStep === 0 && !isExiting
                                                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                                                : 'opacity-0 scale-75 -translate-y-12 pointer-events-none'
                                        }`}
                                        style={{
                                            animation: activeStep === 0 && !isExiting ? 'floatWallet 5s ease-in-out infinite' : 'none'
                                        }}>
                                            {isMobileDevice ? (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                        <DollarSign className="w-2.5 h-2.5" />
                                                    </div>
                                                    <div className="leading-none">
                                                        <p className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider">Carteira</p>
                                                        <p className="text-[8.5px] font-black text-slate-800 mt-0.5">+R$ 1.840</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                                            <DollarSign className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="leading-none">
                                                            <p className="text-[7.5px] text-slate-400 font-bold leading-none uppercase tracking-wider">Minha Carteira</p>
                                                            <p className="text-xs font-black text-slate-800 mt-0.5">+R$ 1.840,00</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[7px] font-bold text-slate-400 leading-none">
                                                        <span>Rendimento de chat</span>
                                                        <span className="text-emerald-600 font-black">+R$ 42,50</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <Phone3D 
                                            isMobile={isMobileDevice} 
                                            isFacingFront={activeStep > 0}
                                            onLoad={() => setIsPhoneMounted(true)}
                                        >
                                            {renderPhoneDisplay(isMobileDevice)}
                                        </Phone3D>
                                    </div>
                                </div>
                            </>
                        )}
                    </div> {/* fim do celular persistente */}

                    </div> {/* fim do wrapper flex-1 / lg:contents */}

                    {/* 3. AÇÕES DO PASSO - shrink-0 garante posição fixa na base no mobile */}
                    <div 
                        key={`actions-${activeStep}`} 
                        className={`lg:col-span-7 shrink-0 flex flex-col justify-center text-center lg:text-left ${
                            isExiting ? 'animate-exit-content' : ''
                        } transition-all duration-700 ease-out ${
                            isFullyLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                    >
                        {renderStepActions()}
                    </div>

                </div>


            </div>
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
