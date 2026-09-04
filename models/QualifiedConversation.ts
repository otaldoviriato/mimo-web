import mongoose, { Document, Schema } from 'mongoose';

export interface IQualifiedConversation extends Document {
    attemptId: mongoose.Types.ObjectId;
    roomId: string;
    clientId: string;
    professionalId: string;
    status: 'open' | 'settlement_pending' | 'settled';
    startedAt: Date;
    qualifiedAt: Date;
    professionalRespondedAt: Date;
    lastParticipantActivityAt: Date;
    closesAt: Date;
    settledAt?: Date | null;
    clientEquivalentChars: number;
    grossChargedCents: number;
    cashFundedCents: number;
    promoFundedCents: number;
    pricingSnapshot: Record<string, unknown>;
    bonusSnapshot: Record<string, unknown>;
    unlockedBonuses: string[];
    professionalShareBps?: number | null;
    professionalPayoutCents?: number | null;
    platformMarginCents?: number | null;
    settlementKey: string;
    attribution?: Record<string, unknown>;
    moderationStatus: 'not_flagged' | 'pending_review' | 'confirmed_violation' | 'dismissed';
    moderationScreenedAt?: Date | null;
    billingEngineVersion: 'marketplace_v2';
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IQualifiedConversation>({
    attemptId: { type: Schema.Types.ObjectId, ref: 'QualificationAttempt', required: true, unique: true },
    roomId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    professionalId: { type: String, required: true, index: true },
    status: { type: String, enum: ['open', 'settlement_pending', 'settled'], default: 'open', index: true },
    startedAt: { type: Date, required: true },
    qualifiedAt: { type: Date, required: true },
    professionalRespondedAt: { type: Date, required: true },
    lastParticipantActivityAt: { type: Date, required: true },
    closesAt: { type: Date, required: true, index: true },
    settledAt: { type: Date, default: null },
    clientEquivalentChars: { type: Number, default: 0, min: 0 },
    grossChargedCents: { type: Number, default: 0, min: 0 },
    cashFundedCents: { type: Number, default: 0, min: 0 },
    promoFundedCents: { type: Number, default: 0, min: 0 },
    pricingSnapshot: { type: Schema.Types.Mixed, required: true },
    bonusSnapshot: { type: Schema.Types.Mixed, required: true },
    unlockedBonuses: { type: [String], default: [] },
    professionalShareBps: { type: Number, default: null },
    professionalPayoutCents: { type: Number, default: null },
    platformMarginCents: { type: Number, default: null },
    settlementKey: { type: String, required: true, unique: true },
    attribution: { type: Schema.Types.Mixed, default: null },
    moderationStatus: {
        type: String,
        enum: ['not_flagged', 'pending_review', 'confirmed_violation', 'dismissed'],
        default: 'not_flagged',
        index: true,
    },
    moderationScreenedAt: { type: Date, default: null, index: true },
    billingEngineVersion: { type: String, enum: ['marketplace_v2'], default: 'marketplace_v2' },
    version: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

schema.index(
    { roomId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['open', 'settlement_pending'] } } },
);
schema.index({ status: 1, closesAt: 1 });
schema.index({ professionalId: 1, startedAt: -1 });
schema.index({ clientId: 1, startedAt: -1 });

export const QualifiedConversation =
    (mongoose.models.QualifiedConversation as mongoose.Model<IQualifiedConversation>)
    || mongoose.model<IQualifiedConversation>('QualifiedConversation', schema);
