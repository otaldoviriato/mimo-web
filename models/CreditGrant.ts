import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditGrant extends Document {
    campaignId: mongoose.Types.ObjectId;
    userId: string; // clerkId
    amountGranted: number; // valor em centavos
    amountUsed: number; // valor já consumido
    amountRemaining: number; // valor restante
    status: 'active' | 'used' | 'expired' | 'blocked';
    grantedAt: Date;
    expiresAt?: Date | null;
    firstIp?: string;
    metadata?: Record<string, any>;
    noticeShown: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CreditGrantSchema = new Schema<ICreditGrant>({
    campaignId: {
        type: Schema.Types.ObjectId,
        ref: 'CreditCampaign',
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    amountGranted: {
        type: Number,
        required: true,
        min: 0,
    },
    amountUsed: {
        type: Number,
        default: 0,
        required: true,
        min: 0,
    },
    amountRemaining: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ['active', 'used', 'expired', 'blocked'],
        default: 'active',
        required: true,
        index: true,
    },
    grantedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expiresAt: {
        type: Date,
        default: null,
        index: true,
    },
    firstIp: {
        type: String,
        default: '',
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
    noticeShown: {
        type: Boolean,
        default: false,
        required: true,
    },
}, {
    timestamps: true,
});

// Índice composto para garantir idempotência a nível de banco
CreditGrantSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export const CreditGrant = (mongoose.models.CreditGrant as mongoose.Model<ICreditGrant>) ||
    mongoose.model<ICreditGrant>('CreditGrant', CreditGrantSchema);
