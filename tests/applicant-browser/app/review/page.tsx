'use client';
import { useState } from 'react';
import { ProfessionalReviewFrame } from '../../../../components/ProfessionalReviewFrame';
export default function ReviewFixture() {
    const [pending, setPending] = useState(true);
    return <ProfessionalReviewFrame pending={pending}>
        <div className="h-screen bg-white flex flex-col">
            <header className="p-4 border-b" data-testid="header">Meu perfil</header>
            <main className="p-4 flex-1 overflow-auto"><button onClick={() => setPending(false)}>Simular aprovação administrativa</button></main>
            <nav className="fixed bottom-0 w-full border-t p-4 bg-white" data-testid="nav">Conversas · Perfil · Carteira</nav>
        </div>
    </ProfessionalReviewFrame>;
}
