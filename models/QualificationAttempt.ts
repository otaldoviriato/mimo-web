import mongoose, { Document, Schema } from 'mongoose';

export interface IQualificationAttempt extends Document {
    roomId: string;
    clientId: string;
    professionalId: string;
    status: 'active' | 'qualified' | 'expired';
    startedAt: Date;
    deadlineAt: Date;
    qualifiedAt?: Date | null;
    expiredAt?: Date | null;
    professionalRespondedAt?: Date | null;
    clientEquivalentChars: number;
    grossChargedCents: number;
    cashFundedCents: number;
    promoFundedCents: number;
    firstPaidMessageId: string;
    pricingSnapshot: Record<string, unknown>;
    bonusSnapshot: Record<string, unknown>;
    billingEngineVersion: 'marketplace_v2';
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IQualificationAttempt>({
    roomId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    professionalId: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'qualified', 'expired'], default: 'active', index: true },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true, index: true },
    qualifiedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    professionalRespondedAt: { type: Date, default: null },
    clientEquivalentChars: { type: Number, default: 0, min: 0 },
    grossChargedCents: { type: Number, default: 0, min: 0 },
    cashFundedCents: { type: Number, default: 0, min: 0 },
    promoFundedCents: { type: Number, default: 0, min: 0 },
    firstPaidMessageId: { type: String, required: true, unique: true },
    pricingSnapshot: { type: Schema.Types.Mixed, required: true },
    bonusSnapshot: { type: Schema.Types.Mixed, required: true },
    billingEngineVersion: { type: String, enum: ['marketplace_v2'], default: 'marketplace_v2' },
    version: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

schema.index({ roomId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
schema.index({ status: 1, deadlineAt: 1 });

export const QualificationAttempt =
    (mongoose.models.QualificationAttempt as mongoose.Model<IQualificationAttempt>)
    || mongoose.model<IQualificationAttempt>('QualificationAttempt', schema);
