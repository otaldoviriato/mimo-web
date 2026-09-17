'use client';

import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { useAuth } from '@clerk/nextjs';
import { Drawer } from 'vaul';
import { storePostAuthRedirect } from '@/lib/postAuthRedirect';
import { REFERRAL_STORAGE_KEY } from '@/lib/referral';
import { CAMPAIGN_ATTRIBUTION_STORAGE_KEY } from '@/components/CampaignVisitTracker';
import { X, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export const PENDING_CHAT_MESSAGE_KEY = 'mimo_pending_chat_message';
export const PENDING_CHAT_RECIPIENT_KEY = 'mimo_pending_chat_recipient';

interface LoginPromptModalProps {
    isOpen?: boolean;
    returnTo: string;
    recipientUsername?: string;
    pendingMessage?: string;
    onClose: () => void;
}

export default function LoginPromptModal({
    isOpen = true,
    returnTo,
    recipientUsername,
    pendingMessage,
    onClose,
}: LoginPromptModalProps) {
    const { signOut } = useAuth();
    const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
    const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

    const [step, setStep] = useState<'initial' | 'email_input' | 'code_input'>('initial');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [flowType, setFlowType] = useState<'signIn' | 'signUp' | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [error, setError] = useState('');

    const isAlreadySignedInError = (err: unknown): boolean => {
        const e = err as any;
        const errCode = e?.errors?.[0]?.code || '';
        const message = (
            e?.errors?.[0]?.longMessage ||
            e?.errors?.[0]?.message ||
            e?.message ||
            ''
        ).toLowerCase();
        return (
            errCode === 'already_signed_in' ||
            errCode === 'session_exists' ||
            message.includes('already signed in') ||
            message.includes('already_signed_in') ||
            message.includes('session_exists')
        );
    };

    const clerkError = (err: unknown, fallback: string): string => {
        if (isAlreadySignedInError(err)) return '';
        const e = err as any;
        return (
            e?.errors?.[0]?.longMessage ||
            e?.errors?.[0]?.message ||
            e?.message ||
            fallback
        );
    };

    const getPendingReferral = () => {
        if (typeof window === 'undefined') return undefined;
        const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (!stored) return undefined;
        try {
            const parsed = JSON.parse(stored);
            return parsed?.professionalId ? parsed : undefined;
        } catch {
            return undefined;
        }
    };

    const getPendingCampaign = (): Record<string, unknown> | undefined => {
        if (typeof window === 'undefined') return undefined;
        try {
            const stored = localStorage.getItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY);
            return stored ? JSON.parse(stored) : undefined;
        } catch {
            return undefined;
        }
    };

    const prepareLoginState = () => {
        storePostAuthRedirect(returnTo);
        if (pendingMessage && typeof window !== 'undefined') {
            sessionStorage.setItem(PENDING_CHAT_MESSAGE_KEY, pendingMessage);
        }
        if (recipientUsername && typeof window !== 'undefined') {
            sessionStorage.setItem(PENDING_CHAT_RECIPIENT_KEY, recipientUsername);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('mimo_post_login_check_rooms', 'true');
            sessionStorage.removeItem('mimo_has_navigated_chats');
        }
    };

    const handleGoogleLogin = async () => {
        if (!signInLoaded || !signUpLoaded || !signIn || !signUp) {
            setError('Serviço de autenticação não carregado');
            return;
        }

        setGoogleLoading(true);
        setError('');

        const executeGoogleAuth = async () => {
            const pendingReferral = getPendingReferral();
            const pendingCampaign = getPendingCampaign();

            prepareLoginState();

            if (pendingReferral && typeof window !== 'undefined') {
                localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(pendingReferral));
            }

            const oauthParams = {
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: returnTo || '/chats',
                oidcPrompt: 'select_account',
            } as const;

            if (pendingReferral || pendingCampaign) {
                await signUp.authenticateWithRedirect({
                    ...oauthParams,
                    unsafeMetadata: {
                        ...(pendingReferral ? { mimoReferral: pendingReferral } : {}),
                        ...(pendingCampaign ? { mimoCampaign: pendingCampaign } : {}),
                    },
                } as any);
                return;
            }

            await signIn.authenticateWithRedirect(oauthParams);
        };

        try {
            await executeGoogleAuth();
        } catch (err: unknown) {
            if (isAlreadySignedInError(err)) {
                try {
                    await signOut();
                    await executeGoogleAuth();
                    return;
                } catch (retryErr) {
                    console.error('[LoginPromptModal] Erro após reset no Google OAuth:', retryErr);
                }
            }
            setError(clerkError(err, 'Erro no login com Google'));
            setGoogleLoading(false);
        }
    };

    const onSendCode = async () => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
            setError('Por favor, informe seu email');
            return;
        }
        if (!signInLoaded || !signUpLoaded || !signIn || !signUp) {
            setError('Serviço de autenticação não carregado');
            return;
        }

        setEmailLoading(true);
        setError('');

        prepareLoginState();

        try {
            await signIn.create({ identifier: cleanEmail });
            const emailFactor = signIn.supportedFirstFactors?.find(
                (f: any) => f.strategy === 'email_code'
            ) as any;

            if (!emailFactor) {
                setError('Verificação por email não está disponível para esta conta');
                setEmailLoading(false);
                return;
            }

            await signIn.prepareFirstFactor({
                strategy: 'email_code',
                emailAddressId: emailFactor.emailAddressId,
            });

            setFlowType('signIn');
            setStep('code_input');
        } catch (err: unknown) {
            if (isAlreadySignedInError(err)) {
                try {
                    await signOut();
                } catch {}
            }

            const errCode = (err as any)?.errors?.[0]?.code;

            if (errCode === 'form_identifier_not_found') {
                try {
                    const pendingReferral = getPendingReferral();
                    const pendingCampaign = getPendingCampaign();
                    const signUpParams: any = {
                        emailAddress: cleanEmail,
                        ...((pendingReferral || pendingCampaign) ? {
                            unsafeMetadata: {
                                ...(pendingReferral ? { mimoReferral: pendingReferral } : {}),
                                ...(pendingCampaign ? { mimoCampaign: pendingCampaign } : {}),
                            },
                        } : {}),
                    };

                    await signUp.create(signUpParams);
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setFlowType('signUp');
                    setStep('code_input');
                } catch (signUpErr: unknown) {
                    if (isAlreadySignedInError(signUpErr)) {
                        try { await signOut(); } catch {}
                    }
                    setError(clerkError(signUpErr, 'Erro ao criar conta por email'));
                }
            } else {
                setError(clerkError(err, 'Erro ao enviar código de acesso'));
            }
        } finally {
            setEmailLoading(false);
        }
    };

    const onVerifyCode = async () => {
        const cleanCode = code.trim();
        if (!cleanCode) {
            setError('Por favor, insira o código de verificação');
            return;
        }
        if (!signInLoaded || !signUpLoaded || !signIn || !signUp) {
            setError('Serviço de autenticação não carregado');
            return;
        }

        setEmailLoading(true);
        setError('');

        try {
            if (flowType === 'signUp') {
                await signUp.attemptEmailAddressVerification({ code: cleanCode });
                if (signUp.status === 'complete') {
                    if (setSignUpActive) {
                        await setSignUpActive({ session: signUp.createdSessionId });
                    }
                    onClose();
                } else {
                    throw new Error(`Cadastro incompleto. Status: ${signUp.status}`);
                }
            } else {
                await signIn.attemptFirstFactor({ strategy: 'email_code', code: cleanCode });
                if (signIn.status === 'complete') {
                    if (setSignInActive) {
                        await setSignInActive({ session: signIn.createdSessionId });
                    }
                    onClose();
                } else {
                    throw new Error(`Login incompleto. Status: ${signIn.status}`);
                }
            }
        } catch (err: unknown) {
            if (isAlreadySignedInError(err)) {
                try { await signOut(); } catch {}
            }
            setError(clerkError(err, 'Código inválido ou expirado'));
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            repositionInputs={false}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[200] bg-gray-950/55 backdrop-blur-[2px]" />
                <Drawer.Content
                    className="fixed inset-x-0 !bottom-0 z-[201] mx-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)] outline-none"
                    style={{ bottom: 0 }}
                >
                    {/* Barra de puxar / Handle */}
                    <div className="border-b border-gray-100 px-5 pb-3 pt-3 shrink-0 bg-white">
                        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-gray-200" />
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                {step !== 'initial' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError('');
                                            setStep(step === 'code_input' ? 'email_input' : 'initial');
                                        }}
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                                        aria-label="Voltar"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shadow-sm">
                                        <img src="/Logo.svg" alt="MimoChat" className="w-4 h-4 object-contain" />
                                    </div>
                                )}
                                <Drawer.Title className="text-base font-bold tracking-tight text-slate-900">
                                    {step === 'initial' && 'Crie sua conta para enviar'}
                                    {step === 'email_input' && 'Entrar com Email'}
                                    {step === 'code_input' && 'Código de Verificação'}
                                </Drawer.Title>
                            </div>

                            <button
                                type="button"
                                aria-label="Fechar"
                                onClick={onClose}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                            >
                                <X className="w-4 h-4" strokeWidth={2.2} />
                            </button>
                        </div>
                    </div>

                    {/* Conteúdo do BottomSheet */}
                    <div className="flex w-full flex-1 flex-col overflow-y-auto px-5 py-5">
                        {step === 'initial' && (
                            <div className="flex flex-col gap-4">
                                <div className="text-center pb-1">
                                    <p className="text-sm text-slate-500 leading-snug">
                                        {recipientUsername
                                            ? `Para falar com @${recipientUsername}, entre ou crie sua conta gratuitamente.`
                                            : 'Entre ou crie sua conta gratuitamente para continuar.'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={googleLoading}
                                        className="flex items-center justify-center gap-3 w-full h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-semibold text-sm transition-all shadow-sm cursor-pointer disabled:opacity-60"
                                    >
                                        {googleLoading ? (
                                            <div className="w-5 h-5 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        )}
                                        {googleLoading ? 'Conectando...' : 'Continuar com Google'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError('');
                                            setStep('email_input');
                                        }}
                                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/25 cursor-pointer"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Continuar com Email
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'email_input' && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    onSendCode();
                                }}
                                className="flex flex-col gap-4"
                            >
                                <div>
                                    <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Seu endereço de email
                                    </label>
                                    <input
                                        id="email-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="exemplo@email.com"
                                        autoFocus
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 text-slate-900 placeholder:text-slate-400 text-sm outline-none transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={emailLoading || !email.trim()}
                                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {emailLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Enviar código de acesso'
                                    )}
                                </button>
                            </form>
                        )}

                        {step === 'code_input' && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    onVerifyCode();
                                }}
                                className="flex flex-col gap-4"
                            >
                                <div className="text-center pb-1">
                                    <p className="text-sm text-slate-600">
                                        Enviamos um código de verificação para:
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                                        {email}
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="otp-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                                        Digite o código de 6 dígitos
                                    </label>
                                    <input
                                        id="otp-code-input"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => {
                                            setCode(e.target.value.replace(/\D/g, ''));
                                            setError('');
                                        }}
                                        placeholder="000000"
                                        autoFocus
                                        className="w-full h-13 text-center text-2xl font-bold tracking-[0.35em] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 text-slate-900 placeholder:text-slate-300 outline-none transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={emailLoading || code.trim().length < 6}
                                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {emailLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Confirmar e Entrar
                                        </>
                                    )}
                                </button>

                                <div className="text-center mt-1">
                                    <button
                                        type="button"
                                        onClick={onSendCode}
                                        disabled={emailLoading}
                                        className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline disabled:opacity-50"
                                    >
                                        Reenviar código
                                    </button>
                                </div>
                            </form>
                        )}

                        {error && (
                            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                                <p className="text-xs font-medium text-red-600">{error}</p>
                            </div>
                        )}

                        <p className="text-center text-[10px] text-slate-400 mt-5 leading-relaxed">
                            Ao continuar, você confirma ter mais de 18 anos e concorda com nossos{' '}
                            <a href="/termos-de-uso" target="_blank" className="text-purple-600 underline">Termos de Uso</a>
                            {' '}e{' '}
                            <a href="/politica-de-privacidade" target="_blank" className="text-purple-600 underline">Privacidade</a>.
                        </p>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
