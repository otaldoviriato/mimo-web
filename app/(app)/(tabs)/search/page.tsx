'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { userApi } from '@/services/api';

export default function SearchPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!username.trim()) {
            setError('Digite um username para buscar');
            return;
        }

        setLoading(true);
        setFoundUser(null);
        setError('');

        try {
            const data = await userApi.searchByUsername(username.trim());
            setFoundUser(data.user);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('Usuário não encontrado');
            } else {
                setError('Erro ao buscar usuário');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = () => {
        if (foundUser) {
            router.push(`/chat/${foundUser.clerkId}`);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 shrink-0">
                <h1 className="text-xl font-bold text-white">Buscar Usuários</h1>
            </div>

            {/* Search bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            placeholder="@username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            autoCapitalize="none"
                            autoCorrect="off"
                        />
                    </div>
                    <Button
                        title="Buscar"
                        onPress={handleSearch}
                        loading={loading}
                        size="md"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {foundUser && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
                        <Avatar uri={foundUser.photoUrl} size={80} />
                        <div className="text-center mt-4 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">@{foundUser.username}</h2>
                            {foundUser.name && (
                                <p className="text-gray-500 mt-1">{foundUser.name}</p>
                            )}
                            {foundUser.email && (
                                <p className="text-sm text-gray-400 mt-1">{foundUser.email}</p>
                            )}

                            {foundUser.chargeMode && (
                                <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-1 rounded-full">
                                    R$ {foundUser.chargePerChar?.toFixed(4)}/caractere
                                </span>
                            )}
                        </div>

                        <Button
                            title="Iniciar conversa"
                            onPress={handleStartChat}
                            size="lg"
                            className="w-full mb-3"
                        />

                        {foundUser.chargeMode && (
                            <p className="text-sm text-gray-500 text-center">
                                💰 Este usuário cobra por mensagens enviadas
                            </p>
                        )}
                    </div>
                )}

                {!foundUser && !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
                        <span className="text-6xl mb-4">🔍</span>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Buscar usuários</h2>
                        <p className="text-gray-500 text-sm">
                            Digite o @username de quem você quer conversar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
