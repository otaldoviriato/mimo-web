'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp, useAuth, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWA } from '@/context/PWAContext';

export default function LoginPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { signIn } = useSignIn();
    const { signUp } = useSignUp();
    const clerk = useClerk();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isSignedIn) {
            router.replace('/chats');
        }
    }, [isSignedIn]);

    const onSendCode = async () => {
        if (!email) { setError('Por favor, insira seu email'); return; }

        setEmailLoading(true);
        setError('');

        // Try sign-in first
        const { error: signInError } = await signIn.create({ identifier: email });

        if (!signInError) {
            // User exists — send email code
            const { error: sendError } = await signIn.emailCode.sendCode();
            if (sendError) {
                setError(sendError.longMessage || sendError.message || 'Erro ao enviar código');
            } else {
                setIsSigningUp(false);
                setPendingVerification(true);
            }
        } else if (signInError.code === 'form_identifier_not_found') {
            // User doesn't exist — sign up
            const { error: signUpCreateError } = await signUp.create({ emailAddress: email });
            if (signUpCreateError) {
                setError(signUpCreateError.longMessage || signUpCreateError.message || 'Erro ao criar conta');
            } else {
                const { error: sendError } = await signUp.verifications.sendEmailCode();
                if (sendError) {
                    setError(sendError.longMessage || sendError.message || 'Erro ao enviar código');
                } else {
                    setIsSigningUp(true);
                    setPendingVerification(true);
                }
            }
        } else {
            setError(signInError.longMessage || signInError.message || 'Erro ao enviar código');
        }

        setEmailLoading(false);
    };

    const onVerifyCode = async () => {
        if (!code) { setError('Por favor, insira o código'); return; }
        setEmailLoading(true);
        setError('');

        if (isSigningUp) {
            const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
            if (verifyError) {
                setError(verifyError.longMessage || verifyError.message || 'Código inválido');
            } else if (signUp.status === 'complete') {
                await signUp.finalize();
                router.replace('/chats');
            }
        } else {
            const { error: verifyError } = await signIn.emailCode.verifyCode({ code });
            if (verifyError) {
                setError(verifyError.longMessage || verifyError.message || 'Código inválido');
            } else if (signIn.status === 'complete') {
                await signIn.finalize();
                router.replace('/chats');
            }
        }

        setEmailLoading(false);
    };

    const onSignInWithGoogle = async () => {
        console.log("Iniciando fluxo Google OAuth...");
        if (!clerk) {
            console.error("Clerk não inicializado");
            setError("Erro: Clerk não inicializado.");
            return;
        }

        try {
            setGoogleLoading(true);
            setError('');
            
            // Revertido para o método do objeto clerk.client.signIn que mantém a compatibilidade
            if (clerk.client) {
                await clerk.client.signIn.authenticateWithRedirect({
                    strategy: 'oauth_google',
                    redirectUrl: '/sso-callback',
                    redirectUrlComplete: '/chats',
                });
            } else {
                console.error("Clerk Client não disponível");
                setError("O serviço de autenticação ainda está carregando.");
            }
        } catch (err: any) {
            console.error("Erro SSO Clerk:", err);
            const msg = err?.errors?.[0]?.longMessage || err?.message || 'Erro no login com Google.';
            setError(msg);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (pendingVerification) onVerifyCode();
            else onSendCode();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
                                error={error}
                            />
                            <Button
                                title="Continuar com Email"
                                onPress={onSendCode}
                                loading={emailLoading}
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
                            <p className="text-sm text-gray-500 text-center">
                                Enviamos um código para <strong className="text-gray-800">{email}</strong>
                            </p>

                            <Input
                                label="Código de verificação"
                                type="text"
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={6}
                                error={error}
                                className="text-center text-2xl tracking-widest"
                            />

                            <Button
                                title="Verificar"
                                onPress={onVerifyCode}
                                loading={emailLoading}
                                size="lg"
                                className="w-full"
                            />

                            <Button
                                title="Voltar"
                                onPress={() => {
                                    setPendingVerification(false);
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
