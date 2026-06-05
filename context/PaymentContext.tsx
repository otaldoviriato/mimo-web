'use client';

import React, { createContext, useContext, useState } from 'react';
import { RechargeModal } from '@/components/RechargeModal';
import { useAddBalance, useGenerateCardPayment, useGeneratePix } from '@/hooks/useQueries';

interface PaymentContextType {
    openRechargeModal: (errorMessage?: string | unknown) => void;
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
    const [insufficientBalanceMessage, setInsufficientBalanceMessage] = useState<string | null>(null);

    const addBalanceMutation = useAddBalance();
    const generatePixMutation = useGeneratePix();
    const generateCardPaymentMutation = useGenerateCardPayment();

    const openRechargeModal = (errorMessage?: string | unknown) => {
        if (typeof errorMessage === 'string') {
            setInsufficientBalanceMessage(errorMessage);
        } else {
            setInsufficientBalanceMessage(null);
        }
        setIsModalVisible(true);
    };
    
    const closeRechargeModal = () => {
        setIsModalVisible(false);
        setInsufficientBalanceMessage(null);
    };

    const handleRecharge = async (amount: number) => {
        const response = await addBalanceMutation.mutateAsync(amount);
        if (response.status === 'PENDING') return response;
        return response;
    };

    const handleGeneratePix = async (amount: number) => {
        return generatePixMutation.mutateAsync(amount);
    };

    const handleGenerateCardPayment = async (data: {
        amount: number;
        holderName?: string;
        holderDocument?: string;
        cardNumber?: string;
        expiryMonth?: string;
        expiryYear?: string;
        cvv?: string;
        phone?: string;
        saveCard?: boolean;
        savedCardId?: string;
    }) => {
        return generateCardPaymentMutation.mutateAsync(data);
    };

    return (
        <PaymentContext.Provider value={{ openRechargeModal }}>
            {children}
            <RechargeModal
                visible={isModalVisible}
                onClose={closeRechargeModal}
                onRecharge={handleRecharge}
                onGeneratePix={handleGeneratePix}
                onGenerateCardPayment={handleGenerateCardPayment}
                insufficientBalanceMessage={insufficientBalanceMessage}
            />
        </PaymentContext.Provider>
    );
}
