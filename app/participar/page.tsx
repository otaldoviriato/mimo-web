'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { storePostAuthRedirect } from '@/lib/postAuthRedirect';

function Participation() {
    const search = useSearchParams();
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    useEffect(() => {
        let active = true;
        storePostAuthRedirect('/participar/cadastro');
        fetch('/api/participar/intencao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ indicacao: search.get('indicacao') }) })
            .then(response => { if (!response.ok) throw new Error(); if (active) setReady(true); })
            .catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [search]);
    if (error) return <div className="p-8 text-center" role="alert">Não foi possível iniciar. <button onClick={() => window.location.reload()} className="text-purple-600 underline">Tentar novamente</button></div>;
    return ready ? <LoginForm applicant /> : <p className="p-8 text-center" role="status">Preparando seu cadastro...</p>;
}
export default function ParticipatePage() { return <Suspense><Participation /></Suspense>; }
