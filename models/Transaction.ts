import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    abacatePayId?: string;
    /**
     * ATENÇÃO SOBRE A UNIDADE DE MEDIDA DE `amount`:
     * - Para `source: 'subscription'` (assinatura recebida por profissional): O VALOR JÁ ESTÁ EM CENTAVOS (ex: 2072 = R$ 20,72).
     *   NUNCA multiplique por 100 ao calcular ganhos de criadoras!
     * - Para `source: 'recharge'` (depósito/recarga de clientes): histórico legado pode conter valores em reais (ex: 50 = R$ 50,00).
     *   Consulte `lib/professionalEarnings.ts` para cálculos padronizados de receita.
     */
    amount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'debit';
    type: 'PIX' | 'CC' | 'credit' | 'debit' | 'platform_fee' | 'promotional_credit_grant' | 'promotional_credit_usage' | 'promotional_credit_expired';
    source: 'message' | 'recharge' | 'withdrawal' | 'image_unlock' | 'gift' | 'subscription' | 'campaign' | 'adjustment';
    messageId?: string;
    relatedUserId?: string;
    campaignId?: string;
    creditGrantId?: string;
    withdrawable?: boolean;
    timestamp: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    abacatePayId: {
        type: String,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['PAID', 'PENDING', 'CANCELLED', 'COMPLETED', 'debit'],
        default: 'PENDING',
    },
    type: {
        type: String,
        enum: ['PIX', 'CC', 'credit', 'debit', 'platform_fee', 'promotional_credit_grant', 'promotional_credit_usage', 'promotional_credit_expired'],
        required: true,
    },
    source: {
        type: String,
        enum: ['message', 'recharge', 'withdrawal', 'image_unlock', 'gift', 'subscription', 'campaign', 'adjustment'],
        required: true,
    },
    messageId: {
        type: String,
    },
    relatedUserId: {
        type: String,
    },
    campaignId: {
        type: String,
    },
    creditGrantId: {
        type: String,
    },
    withdrawable: {
        type: Boolean,
        default: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});

TransactionSchema.index({ userId: 1, timestamp: -1 });
TransactionSchema.index({ abacatePayId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ type: 1, source: 1, status: 1, 'metadata.provider': 1, timestamp: 1 });

export const Transaction = (mongoose.models.Transaction as mongoose.Model<ITransaction>) ||
    mongoose.model<ITransaction>('Transaction', TransactionSchema);
