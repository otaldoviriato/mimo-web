import mongoose, { Document, Schema } from 'mongoose';

export interface IFinancialLedgerEntry extends Document {
    idempotencyKey: string;
    account: string;
    ownerId: string;
    direction: 'debit' | 'credit';
    amountCents: number;
    product: string;
    eventType: string;
    messageId?: string;
    attemptId?: mongoose.Types.ObjectId;
    conversationId?: mongoose.Types.ObjectId;
    relatedUserId?: string;
    fundingSource?: 'cash' | 'promotional' | 'mixed';
    effectiveAt: Date;
    billingEngineVersion: 'marketplace_v2' | 'marketplace_v3';
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IFinancialLedgerEntry>({
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    account: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    amountCents: { type: Number, required: true, min: 0 },
    product: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    messageId: { type: String, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'QualificationAttempt', index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'QualifiedConversation', index: true },
    relatedUserId: { type: String, index: true },
    fundingSource: { type: String, enum: ['cash', 'promotional', 'mixed'] },
    effectiveAt: { type: Date, required: true, default: Date.now, index: true },
    billingEngineVersion: { type: String, enum: ['marketplace_v2', 'marketplace_v3'], default: 'marketplace_v3' },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

schema.index({ ownerId: 1, effectiveAt: -1 });
schema.index({ conversationId: 1, eventType: 1 });

export const FinancialLedgerEntry =
    (mongoose.models.FinancialLedgerEntry as mongoose.Model<IFinancialLedgerEntry>)
    || mongoose.model<IFinancialLedgerEntry>('FinancialLedgerEntry', schema);
