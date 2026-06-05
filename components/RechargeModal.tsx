'use client';

import React, { useEffect, useState } from 'react';
import { PixCheckoutView } from './PixCheckoutView';
import { ProcessingPaymentView } from './ProcessingPaymentView';
import { userApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/hooks/useQueries';
import { useUser } from '@clerk/nextjs';
import { Drawer } from 'vaul';
import {
    AlertCircle,
    CheckCircle2,
    CreditCard,
    LockKeyhole,
    Plus,
    QrCode,
    ShieldCheck,
    X,
} from 'lucide-react';

interface RechargeModalProps {
    visible: boolean;
    onClose: () => void;
    onRecharge: (amount: number) => Promise<RechargeResponse | null | void>;
    onGeneratePix?: (amount: number) => Promise<PixPaymentData | null | void>;
    insufficientBalanceMessage?: string | null;
}

interface RechargeResponse {
    status?: string;
    transactionId?: string;
}

interface PixPaymentData {
    success?: boolean;
    brCode?: string;
    transactionId?: string;
    id?: string;
    url?: string;
    [key: string]: unknown;
}

interface SavedCard {
    id: string;
    type: 'card';
    label: string;
    icon: string;
    lastFour: string;
    brand: string;
}

interface SavedCardResponse {
    id: string;
    label: string;
    lastFour: string;
    brand: string;
}

interface UserProfileResponse {
    user?: {
        savedCards?: SavedCardResponse[];
        taxId?: string;
        phone?: string;
    };
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

export function RechargeModal({
    visible,
    onClose,
    onRecharge,
    onGeneratePix,
    insufficientBalanceMessage,
}: RechargeModalProps) {
    const queryClient = useQueryClient();
    const { user } = useUser();
    const [step, setStep] = useState<Step>('amount_and_method');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
    const [isCustomAmount, setIsCustomAmount] = useState(false);
    const [customAmountText, setCustomAmountText] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<string>('pix');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<PixPaymentData | null>(null);
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
        if (!visible) return;

        userApi.getMe()
            .then((res: UserProfileResponse) => {
                const cards: SavedCard[] = (res?.user?.savedCards ?? []).map((c) => ({
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

    }, [visible]);

    const resetState = () => {
        setStep('amount_and_method');
        setSelectedAmount(100);
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
                    phone: userPhone.replace(/\D/g, ''),
                });

                const data = await onGeneratePix(amount);
                if (data?.success) {
                    setPixData(data);
                    setStep('pix_checkout');
                }
            } catch {
            } finally {
                setLoading(false);
            }
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
                    } catch {
                    }
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
    const hasCpf = userCpf.replace(/\D/g, '').length === 11;
    const hasPhone = userPhone.replace(/\D/g, '').length >= 10;
    const hasCompletePixData = hasCpf && hasPhone;
    const isPixValid = isPixSelected
        ? hasCompletePixData
        : true;
    const canConfirm = finalAmount > 0 && selectedMethod !== '' && selectedMethod !== 'new_card' && isPixValid;
    const formattedFinalAmount = finalAmount > 0 ? finalAmount.toFixed(2).replace('.', ',') : '0,00';

    return (
        <Drawer.Root open={visible} onOpenChange={(open) => !open && handleClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-gray-950/55 backdrop-blur-[2px]" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[84vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)] outline-none">
                    <div className="flex w-full flex-1 flex-col overflow-y-auto">
                        <div className="border-b border-gray-100 px-5 pb-4 pt-3">
                            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Carteira Mimo</p>
                                    <Drawer.Title className="mt-1 text-lg font-bold tracking-tight text-gray-900">Recarregar saldo</Drawer.Title>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                        Adicione créditos para continuar usando em conversas, conteúdos e presentes.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleClose()}
                                    aria-label="Fechar recarga"
                                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
                                >
                                    <X size={16} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>

                        {step === 'amount_and_method' ? (
                            <>
                                <div className="flex-1 px-5 py-4">
                                    {insufficientBalanceMessage && (
                                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2.2} />
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-amber-800">Saldo insuficiente</h4>
                                                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                                                    {insufficientBalanceMessage}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
                                        <div className="border-b border-gray-50 px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Valor da recarga</p>
                                        </div>
                                        <div className="p-3">
                                            <div className="grid grid-cols-4 gap-2">
                                                {FIXED_OPTIONS.map((option) => (
                                                    <button
                                                        type="button"
                                                        key={option.value}
                                                        onClick={() => {
                                                            setIsCustomAmount(false);
                                                            setSelectedAmount(option.value);
                                                        }}
                                                        className={`h-10 rounded-lg border text-xs font-semibold transition-all active:scale-[0.98] ${
                                                            selectedAmount === option.value && !isCustomAmount
                                                                ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm shadow-purple-600/10'
                                                                : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-purple-200 hover:bg-white'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomAmount(true);
                                                    setSelectedAmount(null);
                                                }}
                                                className={`mt-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.99] ${
                                                    isCustomAmount
                                                        ? 'border-purple-600 bg-purple-50 shadow-sm shadow-purple-600/10'
                                                        : 'border-gray-100 bg-gray-50 hover:border-purple-200 hover:bg-white'
                                                }`}
                                            >
                                                <span className={`text-xs font-semibold ${isCustomAmount ? 'text-purple-700' : 'text-gray-700'}`}>
                                                    Outro valor
                                                </span>
                                                {isCustomAmount ? (
                                                    <div className="flex h-8 items-center rounded-lg border border-purple-200 bg-white px-2">
                                                        <span className="mr-1 text-xs font-medium text-gray-400">R$</span>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="w-20 bg-transparent text-right text-sm font-semibold text-gray-900 outline-none"
                                                            placeholder="0,00"
                                                            value={customAmountText}
                                                            onChange={(e) => setCustomAmountText(e.target.value.replace(/[^0-9.,]/g, ''))}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400">Inserir manualmente</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-lg border border-gray-100 bg-white shadow-sm">
                                        <div className="border-b border-gray-50 px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Forma de pagamento</p>
                                        </div>
                                        <div className="flex flex-col gap-2 p-3">
                                            {allMethods.map((method) => {
                                                const isSelected = selectedMethod === method.id;
                                                const Icon = method.icon === 'qr-code'
                                                    ? QrCode
                                                    : method.icon === 'plus'
                                                        ? Plus
                                                        : CreditCard;

                                                return (
                                                    <button
                                                        type="button"
                                                        key={method.id}
                                                        onClick={() => setSelectedMethod(method.id)}
                                                        className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all active:scale-[0.99] ${
                                                            isSelected
                                                                ? 'border-purple-600 bg-purple-50 shadow-sm shadow-purple-600/10'
                                                                : 'border-gray-100 bg-gray-50 hover:border-purple-200 hover:bg-white'
                                                        }`}
                                                    >
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                                            isSelected
                                                                ? 'border-purple-100 bg-white text-purple-600'
                                                                : 'border-gray-100 bg-white text-gray-400'
                                                        }`}>
                                                            <Icon size={15} strokeWidth={2.2} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className={`block truncate text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                                                {method.label}
                                                            </span>
                                                            {method.id === 'pix' && (
                                                                <span className="mt-0.5 block text-[11px] text-gray-400">Confirmação rápida e segura</span>
                                                            )}
                                                        </div>
                                                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                                            isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 bg-white'
                                                        }`}>
                                                            {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {isNewCardSelected && (
                                            <div className="mx-3 mb-3 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Número do cartão</label>
                                                    <div className="flex items-center rounded-lg border border-gray-100 bg-white px-3 py-2.5 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100">
                                                        <input
                                                            type="text"
                                                            placeholder="0000 0000 0000 0000"
                                                            value={cardNumber}
                                                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                            maxLength={19}
                                                            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
                                                        />
                                                        {cardNumber.length >= 4 && (
                                                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                                                {cardBrand}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex w-full gap-3">
                                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Validade</label>
                                                        <input
                                                            type="text"
                                                            placeholder="MM/AA"
                                                            value={cardExpiry}
                                                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                            maxLength={5}
                                                            className="w-full min-w-0 rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                                                        />
                                                    </div>
                                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">CVV</label>
                                                        <input
                                                            type="password"
                                                            placeholder="123"
                                                            value={cardCvv}
                                                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                            maxLength={4}
                                                            className="w-full min-w-0 rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveCard}
                                                    disabled={savingCard}
                                                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
                                                >
                                                    {savingCard ? 'Salvando...' : 'Salvar cartão'}
                                                </button>
                                            </div>
                                        )}

                                        {isPixSelected && !hasCompletePixData && (
                                            <div className="mx-3 mb-3 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                    <ShieldCheck size={13} className="text-green-600" strokeWidth={2.2} />
                                                    Dados usados apenas para gerar a cobrança Pix.
                                                </div>
                                                {!hasCpf && (
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">CPF</label>
                                                        <input
                                                            type="text"
                                                            placeholder="000.000.000-00"
                                                            value={userCpf}
                                                            onChange={(e) => setUserCpf(formatCPF(e.target.value))}
                                                            maxLength={14}
                                                            className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                                                        />
                                                    </div>
                                                )}
                                                {!hasPhone && (
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Telefone</label>
                                                        <input
                                                            type="text"
                                                            placeholder="(00) 00000-0000"
                                                            value={userPhone}
                                                            onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                                                            maxLength={15}
                                                            className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 bg-white px-5 pb-5 pt-3">
                                    <div className="mb-3 flex items-center justify-between text-xs">
                                        <span className="text-gray-400">Total da recarga</span>
                                        <span className="font-bold text-gray-900">R$ {formattedFinalAmount}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleConfirm}
                                        disabled={!canConfirm || loading}
                                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <LockKeyhole size={14} strokeWidth={2.2} />
                                                Confirmar R$ {formattedFinalAmount}
                                            </>
                                        )}
                                    </button>
                                    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                                        <ShieldCheck size={12} className="text-green-600" strokeWidth={2.2} />
                                        Pagamento processado em ambiente seguro.
                                    </p>
                                </div>
                            </>
                        ) : step === 'pix_checkout' ? (
                            <div className="p-5">
                                <PixCheckoutView
                                    amount={finalAmount}
                                    pixData={pixData ?? undefined}
                                    onPaymentComplete={() => handleClose(true)}
                                    onCancel={() => setStep('amount_and_method')}
                                />
                            </div>
                        ) : (
                            <div className="p-5">
                                <ProcessingPaymentView
                                    transactionId={ccTransactionId}
                                    onPaymentComplete={() => handleClose(true)}
                                    onCancel={() => resetState()}
                                />
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
