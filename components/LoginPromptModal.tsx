'use client';

import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { useAuth } from '@clerk/nextjs';
import { storePostAuthRedirect } from '@/lib/postAuthRedirect';
import { REFERRAL_STORAGE_KEY } from '@/lib/referral';
import { CAMPAIGN_ATTRIBUTION_STORAGE_KEY } from '@/components/CampaignVisitTracker';
import { POST_AUTH_REDIRECT_STORAGE_KEY } from '@/lib/postAuthRedirect';
import { X } from 'lucide-react';

export const PENDING_CHAT_MESSAGE_KEY = 'mimo_pending_chat_message';
export const PENDING_CHAT_RECIPIENT_KEY = 'mimo_pending_chat_recipient';

interface LoginPromptModalProps {
    returnTo: string;
    recipientUsername?: string;
    pendingMessage?: string;
    onClose: () => void;
}

export default function LoginPromptModal({
    returnTo,
    recipientUsername,
    pendingMessage,
    onClose,
}: LoginPromptModalProps) {
    const { signOut } = useAuth();
    const { isLoaded: signInLoaded, signIn } = useSignIn();
    const { isLoaded: signUpLoaded, signUp } = useSignUp();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

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
            setError('Servico de autenticacao nao carregado');
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
                redirectUrlComplete: '/chats',
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
                    console.error('[LoginPromptModal] Erro apos reset no Google OAuth:', retryErr);
                }
            }
            const e = err as any;
            setError(e?.errors?.[0]?.longMessage || e?.message || 'Erro no login com Google');
            setGoogleLoading(false);
        }
    };

    const handleEmailLogin = () => {
        prepareLoginState();
        window.location.href = '/login';
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="fixed bottom-0 left-0 right-0 z-[201] animate-in slide-in-from-bottom-4 duration-300">
                <div className="mx-auto max-w-md bg-white rounded-t-3xl shadow-2xl p-6 pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-10 h-1 bg-slate-200 rounded-full" />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md mb-3">
                            <img src="/Logo.svg" alt="MimoChat" className="w-8 h-8 object-contain" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 text-center">
                            Crie sua conta para enviar
                        </h2>
                        <p className="text-sm text-slate-500 text-center mt-1 leading-snug">
                            {recipientUsername
                                ? `Para falar com @${recipientUsername}, entre ou crie sua conta gratuitamente.`
                                : 'Entre ou crie sua conta gratuitamente para continuar.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
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
                            {googleLoading ? 'Aguarde...' : 'Continuar com Google'}
                        </button>

                        <button
                            onClick={handleEmailLogin}
                            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/25 cursor-pointer"
                        >
                            Continuar com Email
                        </button>

                        {error && (
                            <p className="text-center text-xs text-red-500">{error}</p>
                        )}
                    </div>

                    <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
                        Ao continuar, voce confirma ser maior de 18 anos e concorda com os{' '}
                        <a href="/termos-de-uso" target="_blank" className="text-purple-500 underline">Termos de Uso</a>
                        {' '}e a{' '}
                        <a href="/politica-de-privacidade" target="_blank" className="text-purple-500 underline">Politica de Privacidade</a>.
                    </p>
                </div>
            </div>
        </>
    );
}
