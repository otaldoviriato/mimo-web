'use client';

import React, { createContext, useContext, useState } from 'react';
import { RechargeModal } from '@/components/RechargeModal';
import { useAddBalance, useGeneratePix } from '@/hooks/useQueries';

interface PaymentContextType {
    openRechargeModal: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function usePayment() {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
}

export function PaymentProvider({ children }: { children: React.ReactNode }) {
    const [isModalVisible, setIsModalVisible] = useState(false);

    const addBalanceMutation = useAddBalance();
    const generatePixMutation = useGeneratePix();

    const openRechargeModal = () => setIsModalVisible(true);
    const closeRechargeModal = () => setIsModalVisible(false);

    const handleRecharge = async (amount: number) => {
        try {
            const response = await addBalanceMutation.mutateAsync(amount);
            if (response.status === 'PENDING') return response;
            return response;
        } catch (error: any) {
            throw error;
        }
    };

    const handleGeneratePix = async (amount: number) => {
        try {
            return await generatePixMutation.mutateAsync(amount);
        } catch (error: any) {
            throw error;
        }
    };

    return (
        <PaymentContext.Provider value={{ openRechargeModal }}>
            {children}
            {isModalVisible && (
                <RechargeModal
                    visible={isModalVisible}
                    onClose={closeRechargeModal}
                    onRecharge={handleRecharge}
                    onGeneratePix={handleGeneratePix}
                />
            )}
        </PaymentContext.Provider>
    );
}
