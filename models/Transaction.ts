import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    abacatePayId?: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'debit';
    type: 'PIX' | 'CC' | 'credit' | 'debit' | 'platform_fee';
    source: 'message' | 'recharge' | 'withdrawal';
    messageId?: string;
    relatedUserId?: string;
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
        unique: true,
        sparse: true,
        index: true,
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
        enum: ['PIX', 'CC', 'credit', 'debit', 'platform_fee'],
        required: true,
    },
    source: {
        type: String,
        enum: ['message', 'recharge', 'withdrawal'],
        required: true,
    },
    messageId: {
        type: String,
    },
    relatedUserId: {
        type: String,
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

export const Transaction = (mongoose.models.Transaction as mongoose.Model<ITransaction>) ||
    mongoose.model<ITransaction>('Transaction', TransactionSchema);
