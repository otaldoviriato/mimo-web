import { useState } from 'react';
import toast from 'react-hot-toast';
import type { HelpTicketData } from '@/types/admin';

export function useInstitutionalEmails() {
    const [institutionalEmails, setInstitutionalEmails] = useState<string[]>([]);
    const [emailRedirections, setEmailRedirections] = useState<{ sourceEmail: string; targetEmail: string; displayName?: string }[]>([]);
    const [loadingInstitutional, setLoadingInstitutional] = useState(true);
    const [instMessages, setInstMessages] = useState<HelpTicketData[]>([]);
    const [selectedInstMessage, setSelectedInstMessage] = useState<HelpTicketData | null>(null);
    const [instSearch, setInstSearch] = useState('');
    const [instStatusFilter, setInstStatusFilter] = useState<string>('all');
    const [selectedInstEmail, setSelectedInstEmail] = useState<string | null>(null);
    const [showInstConfigModal, setShowInstConfigModal] = useState(false);
    const [showNewEmailModal, setShowNewEmailModal] = useState(false);
    const [replyInstText, setReplyInstText] = useState('');
    const [sendingInstReply, setSendingInstReply] = useState(false);
    const [instNotes, setInstNotes] = useState('');
    const [savingInstNotes, setSavingInstNotes] = useState(false);
    const [showInstReplyBox, setShowInstReplyBox] = useState(false);
    const [newInstEmailPrefix, setNewInstEmailPrefix] = useState('');
    const [newInstEmailForwarding, setNewInstEmailForwarding] = useState('');
    const [newInstEmailDisplayName, setNewInstEmailDisplayName] = useState('');
    const [addingInstEmail, setAddingInstEmail] = useState(false);
    const [newEmailTo, setNewEmailTo] = useState('');
    const [newEmailSubject, setNewEmailSubject] = useState('');
    const [newEmailMessage, setNewEmailMessage] = useState('');
    const [sendingNewEmail, setSendingNewEmail] = useState(false);

    const fetchInstitutionalData = async (opts?: {
        email?: string | null;
        search?: string;
        statusFilter?: string;
    }) => {
        const email = opts?.email !== undefined ? opts.email : selectedInstEmail;
        const search = opts?.search !== undefined ? opts.search : instSearch;
        const statusFilter = opts?.statusFilter !== undefined ? opts.statusFilter : instStatusFilter;

        setLoadingInstitutional(true);
        try {
            const emailFilterParam = email ? `&email=${encodeURIComponent(email)}` : '';
            const searchParam = search.trim() ? `&q=${encodeURIComponent(search)}` : '';
            const apiStatus = (statusFilter !== 'all' && statusFilter !== 'recebido' && statusFilter !== 'enviado') ? statusFilter : '';
            const statusParam = apiStatus ? `&status=${apiStatus}` : '';
            const response = await fetch(`/api/admin/institutional-emails?${emailFilterParam}${searchParam}${statusParam}`);
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                setInstMessages(email ? (data.messages || []) : []);
            } else {
                toast.error('Erro ao carregar dados institucionais.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setLoadingInstitutional(false);
        }
    };

    const handleAddInstitutionalEmail = async () => {
        if (!newInstEmailPrefix.trim()) { toast.error('Escreva o prefixo do e-mail (ex: contato).'); return; }
        if (!newInstEmailDisplayName.trim()) { toast.error('Informe o nome de exibição do remetente.'); return; }
        if (!newInstEmailForwarding.trim()) { toast.error('Informe o e-mail privado de redirecionamento.'); return; }
        setAddingInstEmail(true);
        try {
            const cleanPrefix = newInstEmailPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
            const fullEmail = `${cleanPrefix}@mimochat.com.br`;
            const response = await fetch('/api/admin/institutional-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: fullEmail,
                    displayName: newInstEmailDisplayName.trim(),
                    forwardingEmail: newInstEmailForwarding.trim()
                })
            });
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                setNewInstEmailPrefix('');
                setNewInstEmailDisplayName('');
                setNewInstEmailForwarding('');
                toast.success(`E-mail ${fullEmail} configurado com sucesso!`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao cadastrar e-mail.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setAddingInstEmail(false);
        }
    };

    const handleDeleteInstitutionalEmail = async (email: string) => {
        if (!window.confirm(`Deseja realmente excluir o e-mail ${email}?`)) return;
        try {
            const response = await fetch(`/api/admin/institutional-emails?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
            if (response.ok) {
                const data = await response.json();
                setInstitutionalEmails(data.emails || []);
                setEmailRedirections(data.redirections || []);
                toast.success('E-mail institucional removido com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao remover e-mail.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    const handleSendInstReply = async (id: string) => {
        if (!replyInstText.trim()) { toast.error('Escreva uma resposta.'); return; }
        setSendingInstReply(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyMessage: replyInstText })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
                setInstNotes(data.ticket.notes || '');
                setReplyInstText('');
                toast.success('Resposta enviada para o e-mail do usuário!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                const err = await response.json();
                toast.error(err.error || 'Erro ao enviar resposta.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSendingInstReply(false);
        }
    };

    const handleSaveInstNotes = async (id: string) => {
        setSavingInstNotes(true);
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: instNotes })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
                toast.success('Observações salvas.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao salvar observações.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSavingInstNotes(false);
        }
    };

    const handleToggleInstFavorite = async (msg: HelpTicketData) => {
        const newFav = !msg.isFavorite;
        try {
            const response = await fetch(`/api/admin/help-tickets/${msg._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: newFav })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === msg._id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch { /* silent */ }
    };

    const handleToggleInstRead = async (msg: HelpTicketData) => {
        const newRead = !msg.isRead;
        try {
            const response = await fetch(`/api/admin/help-tickets/${msg._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: newRead })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === msg._id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch { /* silent */ }
    };

    const handleUpdateInstStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                const data = await response.json();
                setInstMessages(prev => prev.map(m => m._id === id ? data.ticket : m));
                setSelectedInstMessage(data.ticket);
            }
        } catch { /* silent */ }
    };

    const handleDeleteInstMessage = async (id: string) => {
        if (!window.confirm('Deseja excluir permanentemente este e-mail?')) return;
        try {
            const response = await fetch(`/api/admin/help-tickets/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setInstMessages(prev => prev.filter(m => m._id !== id));
                setSelectedInstMessage(null);
                toast.success('E-mail excluído com sucesso.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
            } else {
                toast.error('Erro ao excluir e-mail.');
            }
        } catch {
            toast.error('Erro de conexão.');
        }
    };

    const handleSendNewEmail = async () => {
        if (!newEmailTo.trim()) { toast.error('Informe o destinatário.'); return; }
        if (!newEmailSubject.trim()) { toast.error('Informe o assunto.'); return; }
        if (!newEmailMessage.trim()) { toast.error('Escreva a mensagem do e-mail.'); return; }
        setSendingNewEmail(true);
        try {
            const response = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderEmail: selectedInstEmail,
                    to: newEmailTo,
                    subject: newEmailSubject,
                    message: newEmailMessage,
                })
            });
            if (response.ok) {
                toast.success('E-mail enviado com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                setNewEmailTo('');
                setNewEmailSubject('');
                setNewEmailMessage('');
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao enviar e-mail.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setSendingNewEmail(false);
        }
    };

    return {
        institutionalEmails, emailRedirections,
        loadingInstitutional,
        instMessages, setInstMessages,
        selectedInstMessage, setSelectedInstMessage,
        instSearch, setInstSearch,
        instStatusFilter, setInstStatusFilter,
        selectedInstEmail, setSelectedInstEmail,
        showInstConfigModal, setShowInstConfigModal,
        showNewEmailModal, setShowNewEmailModal,
        replyInstText, setReplyInstText,
        sendingInstReply,
        instNotes, setInstNotes,
        savingInstNotes,
        showInstReplyBox, setShowInstReplyBox,
        newInstEmailPrefix, setNewInstEmailPrefix,
        newInstEmailForwarding, setNewInstEmailForwarding,
        newInstEmailDisplayName, setNewInstEmailDisplayName,
        addingInstEmail,
        newEmailTo, setNewEmailTo,
        newEmailSubject, setNewEmailSubject,
        newEmailMessage, setNewEmailMessage,
        sendingNewEmail,
        fetchInstitutionalData,
        handleAddInstitutionalEmail,
        handleDeleteInstitutionalEmail,
        handleSendInstReply,
        handleSaveInstNotes,
        handleToggleInstFavorite,
        handleToggleInstRead,
        handleUpdateInstStatus,
        handleDeleteInstMessage,
        handleSendNewEmail,
    };
}
