import mongoose, { Schema, Document } from 'mongoose';

export type PromotionStatus = 'active' | 'completed' | 'cancelled';

export interface IProfilePromotion extends Document {
    professionalId: string;
    startedAt: Date;
    expiresAt: Date;
    endedAt?: Date | null;
    dayString?: string;
    status: PromotionStatus;
    durationMinutes: number;
    profileViews: number;
    newConversations: number;
    netEarningsCents: number;
    attributedClientIds: string[];
    viewedVisitorIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ProfilePromotionSchema = new Schema<IProfilePromotion>({
    professionalId: {
        type: String,
        required: true,
        index: true,
    },
    startedAt: {
        type: Date,
        required: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    endedAt: {
        type: Date,
        default: null,
    },
    dayString: {
        type: String,
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
        index: true,
    },
    durationMinutes: {
        type: Number,
        default: 60,
    },
    profileViews: {
        type: Number,
        default: 0,
        min: 0,
    },
    newConversations: {
        type: Number,
        default: 0,
        min: 0,
    },
    netEarningsCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    attributedClientIds: {
        type: [String],
        default: [],
        index: true,
    },
    viewedVisitorIds: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
});

ProfilePromotionSchema.index({ professionalId: 1, startedAt: -1 });
ProfilePromotionSchema.index({ professionalId: 1, status: 1 });
ProfilePromotionSchema.index({ professionalId: 1, dayString: 1 });

if (process.env.NODE_ENV === 'development' && mongoose.models.ProfilePromotion) {
    delete mongoose.models.ProfilePromotion;
}

export const ProfilePromotion = (mongoose.models.ProfilePromotion as mongoose.Model<IProfilePromotion>)
    || mongoose.model<IProfilePromotion>('ProfilePromotion', ProfilePromotionSchema);
