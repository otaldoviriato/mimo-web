'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usePWA } from '@/context/PWAContext';

export default function LoginPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
    const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [flowType, setFlowType] = useState<'signIn' | 'signUp' | null>(null);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

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

        setEmailLoading(true);
        setError('');

        try {
            // Tenta login — se a conta existir, retorna os fatores disponíveis
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
                // Conta não existe — cria transparentemente sem o usuário perceber
                try {
                    await signUp!.create({ emailAddress: email });
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

        try {
            if (flowType === 'signUp') {
                await signUp!.attemptEmailAddressVerification({ code });
                if (signUp!.status === 'complete') {
                    await setSignUpActive!({ session: signUp!.createdSessionId });
                    router.replace('/chats');
                }
            } else {
                await signIn!.attemptFirstFactor({ strategy: 'email_code', code });
                if (signIn!.status === 'complete') {
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
        if (!signInLoaded || !signIn) {
            setError('Serviço de autenticação não carregado');
            return;
        }

        setGoogleLoading(true);
        setError('');

        try {
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/chats',
            });
        } catch (err: unknown) {
            setError(clerkError(err, 'Erro no login com Google'));
            setGoogleLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (pendingVerification) onVerifyCode();
            else onSendCode();
        }
    };

    const isReady = signInLoaded && signUpLoaded;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            {/* Elemento exigido pelo Clerk para CAPTCHA em flows customizados */}
            <div id="clerk-captcha" />
            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 mb-5 shadow-lg">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">MimoChat</h1>
                    <p className="text-gray-500 text-base">Conectando você de verdade</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    {!pendingVerification ? (
                        <div className="flex flex-col gap-4">
                            <Input
                                label="Email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoCapitalize="none"
                                autoComplete="email"
                                error={error}
                                disabled={!isReady}
                            />
                            <Button
                                title="Continuar com Email"
                                onPress={onSendCode}
                                loading={emailLoading}
                                disabled={!isReady}
                                size="lg"
                                className="w-full"
                            />

                            <div className="flex items-center gap-3 my-1">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-sm text-gray-400">ou</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            <Button
                                title={googleLoading ? 'Aguarde...' : 'Entrar com Google'}
                                onPress={onSignInWithGoogle}
                                loading={googleLoading}
                                disabled={!isReady}
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
                                className="w-full"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-500">
                                    Enviamos um código para
                                </p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{email}</p>
                            </div>

                            <Input
                                label="Código de verificação"
                                type="text"
                                inputMode="numeric"
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={handleKeyDown}
                                maxLength={6}
                                error={error}
                                className="text-center text-2xl tracking-widest"
                                autoComplete="one-time-code"
                            />

                            <Button
                                title="Verificar"
                                onPress={onVerifyCode}
                                loading={emailLoading}
                                size="lg"
                                className="w-full"
                            />

                            <Button
                                title="Usar outro email"
                                onPress={() => {
                                    setPendingVerification(false);
                                    setFlowType(null);
                                    setCode('');
                                    setError('');
                                }}
                                variant="ghost"
                                size="md"
                                className="w-full"
                            />
                        </div>
                    )}
                </div>

                {mounted && isInstallable && !isStandalone && (
                    <div className="mt-8 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📱</span>
                            <p className="text-sm text-purple-900 font-bold">
                                MimoChat fica melhor no App!
                            </p>
                        </div>
                        <Button
                            title="Instalar Aplicativo"
                            onPress={promptInstall}
                            size="sm"
                            className="w-full bg-purple-600 shadow-md font-bold !text-white"
                        />
                    </div>
                )}

                <p className="text-xs text-gray-400 text-center mt-6">
                    Ao continuar, você concorda com nossos Termos e Política de Privacidade
                </p>
            </div>
        </div>
    );
}
