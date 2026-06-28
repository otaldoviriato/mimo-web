import { useState } from 'react';
import toast from 'react-hot-toast';
import type { HelpTicketData } from '@/types/admin';

export function useHelpTickets() {
    const [helpTickets, setHelpTickets] = useState<HelpTicketData[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<HelpTicketData | null>(null);
    const [ticketSearch, setTicketSearch] = useState('');
    const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('abertos');
    const [ticketFavoriteFilter, setTicketFavoriteFilter] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [ticketNotes, setTicketNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    const fetchHelpTickets = async () => {
        setLoadingTickets(true);
        try {
            const response = await fetch('/api/admin/help-tickets');
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(data.tickets || []);
            } else {
                toast.error('Erro ao carregar tickets de ajuda.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                if (selectedTicket?._id === id) setSelectedTicket(data.ticket);
                toast.success(`Status atualizado para: ${newStatus}`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao atualizar status do ticket.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    const handleToggleFavorite = async (ticket: HelpTicketData) => {
        const newFavorite = !ticket.isFavorite;
        try {
            const response = await fetch(`/api/admin/help-tickets/${ticket._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: newFavorite })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === ticket._id ? data.ticket : t));
                if (selectedTicket?._id === ticket._id) setSelectedTicket(data.ticket);
                toast.success(newFavorite ? 'Marcado como favorito!' : 'Removido dos favoritos.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao favoritar ticket.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    const handleToggleRead = async (ticket: HelpTicketData) => {
        const newRead = !ticket.isRead;
        try {
            const response = await fetch(`/api/admin/help-tickets/${ticket._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: newRead })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === ticket._id ? data.ticket : t));
                if (selectedTicket?._id === ticket._id) setSelectedTicket(data.ticket);
            }
        } catch {
            console.error('Erro ao alternar leitura:', ticket._id);
        }
    };

    const handleSaveTicketNotes = async (id: string) => {
        setSavingNotes(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: ticketNotes })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                if (selectedTicket?._id === id) setSelectedTicket(data.ticket);
                toast.success('Anotações salvas com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao salvar anotações.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSavingNotes(false);
        }
    };

    const handleSendReply = async (id: string) => {
        if (!replyText.trim()) {
            toast.error('Escreva uma mensagem de resposta.');
            return;
        }
        setSendingReply(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyMessage: replyText })
            });
            if (response.ok) {
                const data = await response.json();
                setHelpTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
                setSelectedTicket(data.ticket);
                setTicketNotes(data.ticket.notes || '');
                setReplyText('');
                toast.success('Resposta enviada com sucesso ao e-mail do usuário!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao enviar resposta.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSendingReply(false);
        }
    };

    const handleDeleteTicket = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este ticket permanentemente? Esta ação não pode ser desfeita.')) return;
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setHelpTickets(prev => prev.filter(t => t._id !== id));
                setSelectedTicket(null);
                toast.success('Ticket excluído com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao excluir ticket.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    return {
        helpTickets,
        loadingTickets,
        selectedTicket, setSelectedTicket,
        ticketSearch, setTicketSearch,
        ticketStatusFilter, setTicketStatusFilter,
        ticketFavoriteFilter, setTicketFavoriteFilter,
        replyText, setReplyText,
        sendingReply,
        ticketNotes, setTicketNotes,
        savingNotes,
        fetchHelpTickets,
        handleUpdateTicketStatus,
        handleToggleFavorite,
        handleToggleRead,
        handleSaveTicketNotes,
        handleSendReply,
        handleDeleteTicket,
    };
}
