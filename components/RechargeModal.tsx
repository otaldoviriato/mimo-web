'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { PixCheckoutView } from './PixCheckoutView';
import { ProcessingPaymentView } from './ProcessingPaymentView';
import { userApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/hooks/useQueries';
import { useUser } from '@clerk/nextjs';
import { Drawer } from 'vaul';

interface RechargeModalProps {
    visible: boolean;
    onClose: () => void;
    onRecharge: (amount: number) => Promise<any>;
    onGeneratePix?: (amount: number) => Promise<any>;
}

interface SavedCard {
    id: string;
    type: 'card';
    label: string;
    icon: string;
    lastFour: string;
    brand: string;
}

const FIXED_OPTIONS = [
    { label: 'R$ 10', value: 10 },
    { label: 'R$ 25', value: 25 },
    { label: 'R$ 50', value: 50 },
    { label: 'R$ 100', value: 100 },
];

const INITIAL_METHODS = [
    { id: 'pix', type: 'pix', label: 'Pix', icon: 'qr-code' },
    { id: 'new_card', type: 'new_card', label: 'Adicionar novo cartão', icon: 'plus' },
];

function detectCardBrand(number: string): string {
    const clean = number.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^6(?:011|5)/.test(clean)) return 'Elo';
    return 'Cartão';
}

function formatCardNumber(text: string): string {
    const clean = text.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(text: string): string {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
}

export function formatCPF(val: string) {
    let v = val.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return v;
}

export function formatPhone(val: string) {
    let v = val.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    return v;
}

type Step = 'amount_and_method' | 'pix_checkout' | 'processing_payment';

export function RechargeModal({ visible, onClose, onRecharge, onGeneratePix }: RechargeModalProps) {
    const queryClient = useQueryClient();
    const { user } = useUser();
    const [step, setStep] = useState<Step>('amount_and_method');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [isCustomAmount, setIsCustomAmount] = useState(false);
    const [customAmountText, setCustomAmountText] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<string>('pix');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [ccTransactionId, setCcTransactionId] = useState('');
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [savingCard, setSavingCard] = useState(false);
    const [userCpf, setUserCpf] = useState('');
    const [userPhone, setUserPhone] = useState('');

    const cardBrand = detectCardBrand(cardNumber);
    const isNewCardSelected = selectedMethod === 'new_card';
    const isPixSelected = selectedMethod === 'pix';

    useEffect(() => {
        if (visible) {
            userApi.getMe()
                .then((res) => {
                    const cards: SavedCard[] = (res?.user?.savedCards ?? []).map((c: any) => ({
                        id: c.id,
                        type: 'card' as const,
                        label: c.label,
                        icon: 'card',
                        lastFour: c.lastFour,
                        brand: c.brand,
                    }));
                    setSavedCards(cards);

                    if (res?.user?.taxId) setUserCpf(formatCPF(res.user.taxId));
                    if (res?.user?.phone) setUserPhone(formatPhone(res.user.phone));
                })
                .catch(() => setSavedCards([]));
        }
    }, [visible]);

    const resetState = () => {
        setStep('amount_and_method');
        setSelectedAmount(null);
        setIsCustomAmount(false);
        setCustomAmountText('');
        setSelectedMethod('pix');
        setLoading(false);
        setPixData(null);
        setCcTransactionId('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
    };

    const handleClose = (wasPaid = false) => {
        if (wasPaid) {
            queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            if (user?.id) {
                queryClient.invalidateQueries({ queryKey: QueryKeys.balance(user.id) });
            }
        }
        resetState();
        onClose();
    };

    const getFinalAmount = () => {
        if (isCustomAmount) {
            const parsed = parseFloat(customAmountText.replace(',', '.'));
            return isNaN(parsed) ? 0 : parsed;
        }
        return selectedAmount || 0;
    };

    const handleSaveCard = async () => {
        const clean = cardNumber.replace(/\s/g, '');
        if (clean.length < 16 || cardExpiry.split('/').length !== 2 || cardCvv.length < 3) {
            alert('Dados do cartão inválidos.');
            return;
        }
        setSavingCard(true);
        try {
            const lastFour = clean.slice(-4);
            const label = `${cardBrand} final ${lastFour}`;
            const res = await userApi.addCard({ label, lastFour, brand: cardBrand });
            const savedCard = res.card;
            const newCard: SavedCard = {
                id: savedCard.id,
                type: 'card',
                label,
                icon: 'card',
                lastFour,
                brand: cardBrand,
            };
            setSavedCards((prev) => [...prev, newCard]);
            setSelectedMethod(newCard.id);
            setCardNumber('');
            setCardExpiry('');
            setCardCvv('');
        } catch {
            alert('Não foi possível salvar o cartão.');
        } finally {
            setSavingCard(false);
        }
    };

    const handleConfirm = async () => {
        const amount = getFinalAmount();
        if (amount <= 0) return;
        if (selectedMethod === 'new_card') {
            alert('Salve o cartão primeiro antes de continuar.');
            return;
        }

        if (selectedMethod === 'pix' && onGeneratePix) {
            setLoading(true);
            try {
                await userApi.updateMe({
                    taxId: userCpf.replace(/\D/g, ''),
                    phone: userPhone.replace(/\D/g, '')
                });

                const data = await onGeneratePix(amount);
                if (data?.success) {
                    setPixData(data);
                    setStep('pix_checkout');
                }
            } catch { }
            finally { setLoading(false); }
        } else if (selectedMethod === 'pix') {
            setStep('pix_checkout');
        } else {
            processPayment(amount);
        }
    };

    const processPayment = async (amount: number) => {
        setLoading(true);
        try {
            const response = await onRecharge(amount);
            if (response?.status === 'PENDING' && response?.transactionId) {
                let currentStatus = response.status;
                const startTime = Date.now();
                while (Date.now() - startTime < 10000) {
                    await new Promise((r) => setTimeout(r, 2000));
                    try {
                        const check = await userApi.checkPixStatus(response.transactionId);
                        if (check?.status !== 'PENDING') {
                            currentStatus = check.status;
                            break;
                        }
                    } catch { }
                }
                if (currentStatus === 'PAID') {
                    handleClose(true);
                } else if (currentStatus === 'CANCELLED') {
                    setLoading(false);
                } else {
                    setCcTransactionId(response.transactionId);
                    setStep('processing_payment');
                    setLoading(false);
                }
            } else {
                handleClose();
            }
        } catch {
            setLoading(false);
        }
    };

    const allMethods = [...savedCards, ...INITIAL_METHODS];
    const finalAmount = getFinalAmount();
    const isPixValid = isPixSelected 
        ? userCpf.replace(/\D/g, '').length === 11 && userPhone.replace(/\D/g, '').length >= 10 
        : true;
    const canConfirm = finalAmount > 0 && selectedMethod !== '' && selectedMethod !== 'new_card' && isPixValid;

    return (
        <Drawer.Root open={visible} onOpenChange={(open) => !open && handleClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/60" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-[32px] max-h-[92vh] w-full max-w-lg mx-auto outline-none shadow-2xl">
                    <div className="w-full flex-1 overflow-y-auto flex flex-col p-6 pb-8">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 mb-6" />
                        
                        {step === 'amount_and_method' ? (
                            <>
                                <div className="flex items-center justify-between mb-5">
                                    <Drawer.Title className="text-xl font-bold text-gray-900">Recarregar Saldo</Drawer.Title>
                            <button
                                onClick={() => handleClose()}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-1">
                            {/* Valor */}
                            <div className="mb-6">
                                <p className="text-sm font-bold text-gray-900 mb-3">1. Escolha o valor</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {FIXED_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => { setIsCustomAmount(false); setSelectedAmount(option.value); }}
                                            className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedAmount === option.value && !isCustomAmount
                                                ? 'border-purple-600 bg-purple-100 text-purple-700'
                                                : 'border-gray-200 text-gray-800 hover:border-purple-300'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setIsCustomAmount(true); setSelectedAmount(null); }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm font-medium transition-all ${isCustomAmount ? 'border-purple-600 bg-purple-100' : 'border-gray-200 hover:border-purple-300'}`}
                                >
                                    <span className={isCustomAmount ? 'text-purple-700' : 'text-gray-800'}>Outro valor</span>
                                    {isCustomAmount && (
                                        <div className="flex items-center border border-purple-500 rounded-lg bg-white px-2 py-1">
                                            <span className="text-sm text-gray-700 mr-1">R$</span>
                                            <input
                                                type="text"
                                                className="w-20 text-sm text-gray-900 focus:outline-none"
                                                placeholder="0,00"
                                                value={customAmountText}
                                                onChange={(e) => setCustomAmountText(e.target.value.replace(/[^0-9.,]/g, ''))}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Método */}
                            <div className="mb-6">
                                <p className="text-sm font-bold text-gray-900 mb-3">2. Método de Pagamento</p>
                                <div className="flex flex-col gap-2">
                                    {allMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method.id)}
                                            className={`flex items-center p-3 rounded-xl border-2 text-left transition-all ${selectedMethod === method.id
                                                ? 'border-purple-600 bg-purple-100'
                                                : 'border-gray-200 hover:border-purple-300'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mr-3">
                                                {method.icon === 'qr-code' ? (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                                                        <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                                                        <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                                                        <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                ) : method.icon === 'plus' ? (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                                                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    </svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                                                        <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${selectedMethod === method.id ? 'text-purple-700' : 'text-gray-800'}`}>
                                                {method.label}
                                            </span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === method.id ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                                                {selectedMethod === method.id && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* New card form */}
                                {isNewCardSelected && (
                                    <div className="mt-3 p-4 bg-gray-50 border border-purple-200 rounded-2xl flex flex-col gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Número do cartão</label>
                                            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2">
                                                <input
                                                    type="text"
                                                    placeholder="0000 0000 0000 0000"
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                    maxLength={19}
                                                    className="flex-1 text-sm text-gray-900 focus:outline-none"
                                                />
                                                {cardNumber.length >= 4 && (
                                                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">{cardBrand}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full">
                                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Validade</label>
                                                <input
                                                    type="text"
                                                    placeholder="MM/AA"
                                                    value={cardExpiry}
                                                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                    maxLength={5}
                                                    className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CVV</label>
                                                <input
                                                    type="password"
                                                    placeholder="123"
                                                    value={cardCvv}
                                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    maxLength={4}
                                                    className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveCard}
                                            disabled={savingCard}
                                            className="flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-60"
                                        >
                                            {savingCard ? 'Salvando...' : 'Salvar Cartão'}
                                        </button>
                                    </div>
                                )}

                                {/* Pix details form */}
                                {isPixSelected && (
                                    <div className="mt-3 p-4 bg-gray-50 border border-purple-200 rounded-2xl flex flex-col gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CPF</label>
                                            <input
                                                type="text"
                                                placeholder="000.000.000-00"
                                                value={userCpf}
                                                onChange={(e) => setUserCpf(formatCPF(e.target.value))}
                                                maxLength={14}
                                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telefone</label>
                                            <input
                                                type="text"
                                                placeholder="(00) 00000-0000"
                                                value={userPhone}
                                                onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                                                maxLength={15}
                                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                            <Button
                                title={loading ? 'Processando...' : `Confirmar R$ ${finalAmount > 0 ? finalAmount.toFixed(2).replace('.', ',') : '0,00'}`}
                                onPress={handleConfirm}
                                disabled={!canConfirm || loading}
                                loading={loading}
                                size="lg"
                                className="w-full"
                            />
                        </div>
                    </>
                ) : step === 'pix_checkout' ? (
                    <PixCheckoutView
                        amount={finalAmount}
                        pixData={pixData}
                        onPaymentComplete={() => handleClose(true)}
                        onCancel={() => setStep('amount_and_method')}
                    />
                ) : (
                    <ProcessingPaymentView
                        transactionId={ccTransactionId}
                        onPaymentComplete={() => handleClose(true)}
                        onCancel={() => resetState()}
                    />
                )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
