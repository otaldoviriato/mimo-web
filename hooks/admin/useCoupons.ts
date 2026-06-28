import { useState } from 'react';
import toast from 'react-hot-toast';

export function useCoupons() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(true);
    const [couponModalOpen, setCouponModalOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
    const [couponUsersModalOpen, setCouponUsersModalOpen] = useState(false);
    const [auditedCoupon, setAuditedCoupon] = useState<any | null>(null);
    const [couponUsers, setCouponUsers] = useState<any[]>([]);
    const [loadingCouponUsers, setLoadingCouponUsers] = useState(false);
    const [couponUsersSearch, setCouponUsersSearch] = useState('');

    // Campos do formulário de cupom
    const [cpCode, setCpCode] = useState('');
    const [cpAmount, setCpAmount] = useState('');
    const [cpDescription, setCpDescription] = useState('');
    const [cpTargetAudience, setCpTargetAudience] = useState<'all' | 'client' | 'professional'>('all');
    const [cpMaxUses, setCpMaxUses] = useState('');
    const [cpExpiresAt, setCpExpiresAt] = useState('');
    const [cpIsActive, setCpIsActive] = useState(true);

    const fetchCoupons = async () => {
        setLoadingCoupons(true);
        try {
            const response = await fetch('/api/admin/coupons');
            if (response.ok) {
                const data = await response.json();
                setCoupons(data.coupons || []);
            } else {
                toast.error('Erro ao carregar cupons do servidor.');
            }
        } catch {
            toast.error('Erro de conexão ao buscar cupons.');
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleOpenCouponModal = (coupon: any | null = null) => {
        setSelectedCoupon(coupon);
        if (coupon) {
            setCpCode(coupon.code);
            setCpAmount((coupon.amount / 100).toString());
            setCpDescription(coupon.description || '');
            setCpTargetAudience(coupon.targetAudience || 'all');
            setCpMaxUses(coupon.maxUses !== null && coupon.maxUses !== undefined ? coupon.maxUses.toString() : '');
            setCpExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '');
            setCpIsActive(coupon.isActive);
        } else {
            setCpCode('');
            setCpAmount('');
            setCpDescription('');
            setCpTargetAudience('all');
            setCpMaxUses('');
            setCpExpiresAt('');
            setCpIsActive(true);
        }
        setCouponModalOpen(true);
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cpCode.trim()) {
            toast.error('O código do cupom é obrigatório.');
            return;
        }
        const parsedAmount = parseFloat(cpAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Digite um valor válido em reais maior que zero.');
            return;
        }
        const amountCents = Math.round(parsedAmount * 100);
        const payload = {
            code: cpCode.trim().toUpperCase(),
            amount: amountCents,
            description: cpDescription.trim(),
            targetAudience: cpTargetAudience,
            maxUses: cpMaxUses.trim() !== '' ? parseInt(cpMaxUses) : null,
            expiresAt: cpExpiresAt ? new Date(cpExpiresAt).toISOString() : null,
            isActive: cpIsActive,
        };
        try {
            const url = selectedCoupon ? `/api/admin/coupons/${selectedCoupon._id}` : '/api/admin/coupons';
            const method = selectedCoupon ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                toast.success(selectedCoupon ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                setCouponModalOpen(false);
                fetchCoupons();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao salvar o cupom.');
            }
        } catch {
            toast.error('Erro de conexão ao salvar.');
        }
    };

    const handleDeleteCoupon = async (id: string, code: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir permanentemente o cupom ${code}?`)) return;
        try {
            const response = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            if (response.ok) {
                toast.success(`Cupom ${code} excluído com sucesso!`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchCoupons();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao excluir o cupom.');
            }
        } catch {
            toast.error('Erro de conexão ao excluir.');
        }
    };

    const handleOpenCouponUsers = async (coupon: any) => {
        setAuditedCoupon(coupon);
        setCouponUsers([]);
        setCouponUsersSearch('');
        setLoadingCouponUsers(true);
        setCouponUsersModalOpen(true);
        try {
            const response = await fetch(`/api/admin/coupons/${coupon._id}/users`);
            if (response.ok) {
                const data = await response.json();
                setCouponUsers(data.users || []);
            } else {
                toast.error('Erro ao carregar os usuários que usaram o cupom.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingCouponUsers(false);
        }
    };

    return {
        coupons, loadingCoupons,
        couponModalOpen, setCouponModalOpen,
        selectedCoupon,
        couponUsersModalOpen, setCouponUsersModalOpen,
        auditedCoupon,
        couponUsers, loadingCouponUsers,
        couponUsersSearch, setCouponUsersSearch,
        cpCode, setCpCode,
        cpAmount, setCpAmount,
        cpDescription, setCpDescription,
        cpTargetAudience, setCpTargetAudience,
        cpMaxUses, setCpMaxUses,
        cpExpiresAt, setCpExpiresAt,
        cpIsActive, setCpIsActive,
        fetchCoupons,
        handleOpenCouponModal,
        handleSaveCoupon,
        handleDeleteCoupon,
        handleOpenCouponUsers,
    };
}
