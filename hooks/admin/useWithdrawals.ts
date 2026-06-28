import { useState } from 'react';
import toast from 'react-hot-toast';
import type { WithdrawRequest } from '@/types/admin';

export function useWithdrawals() {
    const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

    const fetchWithdrawals = async () => {
        setLoadingWithdrawals(true);
        try {
            const response = await fetch('/api/admin/withdrawals');
            if (response.ok) {
                const data = await response.json();
                setWithdrawals(data.withdrawals || []);
            } else {
                toast.error('Erro ao buscar solicitações de saque.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingWithdrawals(false);
        }
    };

    const handleApproveWithdrawal = async (id: string) => {
        if (!window.confirm('Deseja realmente confirmar que este Pix foi pago manualmente? Essa ação não pode ser desfeita.')) return;
        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });
            if (response.ok) {
                toast.success('Saque concluído com sucesso e registrado no financeiro!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchWithdrawals();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao aprovar saque.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    const handleRejectWithdrawal = async (id: string) => {
        if (!window.confirm('Deseja realmente rejeitar este saque? O saldo correspondente será devolvido imediatamente à carteira da profissional.')) return;
        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            if (response.ok) {
                toast.success('Saque rejeitado com sucesso. Saldo devolvido para a profissional!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchWithdrawals();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao rejeitar saque.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    const handleHideWithdrawalFromUser = async (id: string) => {
        if (!window.confirm('Deseja ocultar esta transferência do histórico da usuária? Ela continuará visível no back-office para auditoria.')) return;
        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, { method: 'DELETE' });
            if (response.ok) {
                toast.success('Transferência ocultada do histórico da usuária.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchWithdrawals();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao ocultar transferência.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    return {
        withdrawals,
        loadingWithdrawals,
        fetchWithdrawals,
        handleApproveWithdrawal,
        handleRejectWithdrawal,
        handleHideWithdrawalFromUser,
    };
}
