'use client';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyProfile } from '../../../../hooks/useQueries';
import { calculateOnboardingStep } from '../../../../lib/onboarding';

function ProfileGate() {
    const profile = useMyProfile();
    const completed = calculateOnboardingStep(profile.data) === 'completed';
    useEffect(() => {
        if (profile.isConfirmed && !completed) window.location.replace('/');
    }, [profile.isConfirmed, completed]);
    return <h1>{profile.isConfirmed && completed ? 'Aplicativo pronto' : profile.isError ? 'Falha ao atualizar' : 'Atualizando perfil'}</h1>;
}
export default function ProfileStateFixture() {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return <QueryClientProvider client={client}><ProfileGate /></QueryClientProvider>;
}
