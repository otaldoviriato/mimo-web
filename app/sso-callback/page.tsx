'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent mb-4" />
                <p className="text-gray-500 mb-4">Autenticando...</p>
                {/* O Clerk cuida de processar a URL do Google e redirecionar pra /chats */}
                <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/chats" signInForceRedirectUrl="/chats" />
            </div>
        </div>
    );
}
