import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    abacatePayId?: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'debit';
    type: 'PIX' | 'CC' | 'credit' | 'debit' | 'platform_fee' | 'promotional_credit_grant' | 'promotional_credit_usage' | 'promotional_credit_expired';
    source: 'message' | 'recharge' | 'withdrawal' | 'image_unlock' | 'gift' | 'subscription' | 'campaign';
    messageId?: string;
    relatedUserId?: string;
    campaignId?: string;
    creditGrantId?: string;
    withdrawable?: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
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
        enum: ['message', 'recharge', 'withdrawal', 'image_unlock', 'gift', 'subscription', 'campaign'],
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

export const Transaction = (mongoose.models.Transaction as mongoose.Model<ITransaction>) ||
    mongoose.model<ITransaction>('Transaction', TransactionSchema);
