'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '../../../../components/LoginForm';

export default function LoginFixture() {
    const [client] = useState(() => new QueryClient());
    return <QueryClientProvider client={client}><LoginForm /></QueryClientProvider>;
}
