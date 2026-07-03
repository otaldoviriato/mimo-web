import mongoose, { Schema, Document } from 'mongoose';

export interface IMicroTransaction extends Document {
    userId: string;
    amount: number; // em centavos
    type: 'credit' | 'debit' | 'platform_fee' | 'promotional_credit_grant' | 'promotional_credit_usage' | 'promotional_credit_expired';
    source: 'message' | 'image_unlock' | 'gift' | 'subscription' | 'campaign';
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

const MicroTransactionSchema = new Schema<IMicroTransaction>({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['credit', 'debit', 'platform_fee', 'promotional_credit_grant', 'promotional_credit_usage', 'promotional_credit_expired'],
        required: true,
    },
    source: {
        type: String,
        enum: ['message', 'image_unlock', 'gift', 'subscription', 'campaign'],
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

MicroTransactionSchema.index({ userId: 1, timestamp: -1 });

if (process.env.NODE_ENV === 'development' && mongoose.models.MicroTransaction) {
    delete mongoose.models.MicroTransaction;
}

export const MicroTransaction = (mongoose.models.MicroTransaction as mongoose.Model<IMicroTransaction>) ||
    mongoose.model<IMicroTransaction>('MicroTransaction', MicroTransactionSchema);
