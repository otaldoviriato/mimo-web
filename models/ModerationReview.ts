import mongoose, { Document, Schema } from 'mongoose';

export interface IModerationReview extends Document {
    conversationId: mongoose.Types.ObjectId;
    status: 'pending_review' | 'confirmed_violation' | 'dismissed';
    matchedRules: string[];
    excerpts: string[];
    priority: 'normal' | 'high';
    reviewerId?: string | null;
    decisionReason?: string | null;
    sanction?: 'none' | 'warning' | 'suspension' | 'ban' | null;
    reviewedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IModerationReview>({
    conversationId: { type: Schema.Types.ObjectId, ref: 'QualifiedConversation', required: true, unique: true },
    status: { type: String, enum: ['pending_review', 'confirmed_violation', 'dismissed'], default: 'pending_review', index: true },
    matchedRules: { type: [String], default: [] },
    excerpts: { type: [String], default: [] },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal', index: true },
    reviewerId: { type: String, default: null },
    decisionReason: { type: String, default: null },
    sanction: { type: String, enum: ['none', 'warning', 'suspension', 'ban', null], default: null },
    reviewedAt: { type: Date, default: null },
}, { timestamps: true });

export const ModerationReview =
    (mongoose.models.ModerationReview as mongoose.Model<IModerationReview>)
    || mongoose.model<IModerationReview>('ModerationReview', schema);
