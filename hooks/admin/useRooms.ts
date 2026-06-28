import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import type { ChatRoom } from '@/types/admin';

export function useRooms() {
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [selectedAuditChat, setSelectedAuditChat] = useState<ChatRoom | null>(null);
    const [auditLoadingMore, setAuditLoadingMore] = useState(false);
    const [auditHasMore, setAuditHasMore] = useState(true);
    const [isFirstAuditLoad, setIsFirstAuditLoad] = useState(false);
    const auditContainerRef = useRef<HTMLDivElement>(null);

    const fetchRooms = async () => {
        setLoadingChats(true);
        try {
            const response = await fetch('/api/admin/rooms');
            if (response.ok) {
                const data = await response.json();
                setChats(data.rooms || []);
            } else {
                toast.error('Erro ao buscar conversas para auditoria.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingChats(false);
        }
    };

    const handleOpenAuditModal = async (chat: ChatRoom) => {
        setSelectedAuditChat({ ...chat, history: [] });
        setAuditHasMore(true);
        setIsFirstAuditLoad(true);
        try {
            const response = await fetch(`/api/admin/rooms/${chat.id}/messages?limit=50`);
            if (response.ok) {
                const data = await response.json();
                const history = data.history || [];
                setSelectedAuditChat({ ...chat, history });
                setAuditHasMore(history.length === 50);
            } else {
                toast.error('Erro ao buscar mensagens do chat.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    const handleAuditScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const { scrollTop } = container;
        if (scrollTop < 50 && auditHasMore && !auditLoadingMore && selectedAuditChat && selectedAuditChat.history.length > 0) {
            setAuditLoadingMore(true);
            const oldestMsg = selectedAuditChat.history[0];
            const before = oldestMsg.timestamp;
            try {
                const response = await fetch(`/api/admin/rooms/${selectedAuditChat.id}/messages?before=${before}&limit=50`);
                if (response.ok) {
                    const data = await response.json();
                    const newMessages = data.history || [];
                    if (newMessages.length < 50) setAuditHasMore(false);
                    if (newMessages.length > 0) {
                        const previousScrollHeight = container.scrollHeight;
                        const previousScrollTop = container.scrollTop;
                        setSelectedAuditChat(prev => {
                            if (!prev) return null;
                            return { ...prev, history: [...newMessages, ...prev.history] };
                        });
                        requestAnimationFrame(() => {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
                        });
                    }
                }
            } catch {
                console.error('Erro ao carregar mais mensagens de auditoria');
            } finally {
                setAuditLoadingMore(false);
            }
        }
    };

    return {
        chats, loadingChats,
        selectedAuditChat, setSelectedAuditChat,
        auditLoadingMore,
        auditHasMore,
        isFirstAuditLoad, setIsFirstAuditLoad,
        auditContainerRef,
        fetchRooms,
        handleOpenAuditModal,
        handleAuditScroll,
    };
}
