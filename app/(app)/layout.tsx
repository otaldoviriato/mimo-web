'use client';

import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace('/login');
        }
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (isSignedIn && user) {
            setupAxiosInterceptors(getToken);
        }
    }, [isSignedIn, user, getToken]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent" />
            </div>
        );
    }

    if (!isSignedIn) return null;

    return <>{children}</>;
}
