'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useStackNavigation } from '@/context/StackNavigationContext';
import { userApi } from '@/services/api';

interface UsernameChatPageProps {
    params: Promise<{ username: string }>;
}

export default function UsernameChatPage({ params }: UsernameChatPageProps) {
    const { username } = use(params);
    const router = useRouter();
    const { pushVirtual } = useStackNavigation();

    useEffect(() => {
        if (!username) return;

        const resolveUsernameAndRedirect = async () => {
            try {
                const cleanedUsername = username.replace(/^@/, '');
                const data = await userApi.getUserByUsername(cleanedUsername);
                const userId = data.user?.clerkId;
                
                if (userId) {
                    const searchParams = window.location.search;
                    
                    // Redireciona a rota física para /chats
                    router.replace(`/chats${searchParams}`);
                    
                    // Empilha virtualmente o chat por cima
                    pushVirtual('chat', { userId });
                } else {
                    router.replace('/chats');
                }
            } catch (err) {
                console.error('Error resolving username for chat link:', err);
                router.replace('/chats');
            }
        };

        resolveUsernameAndRedirect();
    }, [username, router, pushVirtual]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
            <div className="flex flex-col items-center animate-pulse">
                <div className="relative w-24 h-24 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <img 
                        src="/icon-192x192.png" 
                        alt="MimoChat Logo" 
                        className="w-16 h-16 object-contain"
                    />
                </div>
                <h1 className="text-white text-2xl font-black tracking-wider drop-shadow-md">
                    MimoChat
                </h1>
                <p className="text-purple-200 text-xs tracking-widest mt-1 uppercase font-semibold opacity-80">
                    Carregando chat...
                </p>
            </div>
        </div>
    );
}
