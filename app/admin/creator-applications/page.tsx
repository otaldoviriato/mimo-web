'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CreatorApplicationsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin?tab=creator-applications');
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
                <p className="mt-4 text-sm font-semibold text-slate-600">Redirecionando para o painel...</p>
            </div>
        </div>
    );
}
