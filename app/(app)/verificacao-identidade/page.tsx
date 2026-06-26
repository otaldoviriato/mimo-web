'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Esta rota foi substituída por /onboarding
export default function VerificacaoIdentidadeRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/onboarding');
    }, [router]);
    return null;
}
