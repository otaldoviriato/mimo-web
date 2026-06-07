'use client';

import { useEffect, useState } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage() {
    const [redirectUrl, setRedirectUrl] = useState('/chats');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // O redirectUrlComplete do Google OAuth já deve trazer a URL correta.
            // Este localStorage serve como fallback de segurança.
            const pendingRedirect = localStorage.getItem('mimo_redirect_after_login');
            if (pendingRedirect) {
                setRedirectUrl(pendingRedirect);
            }
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent mb-4" />
                <p className="text-gray-500 mb-4">Autenticando...</p>
                <AuthenticateWithRedirectCallback signUpForceRedirectUrl={redirectUrl} signInForceRedirectUrl={redirectUrl} />
            </div>
        </div>
    );
}
