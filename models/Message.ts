import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
    billingStatus?: 'free' | 'pending' | 'paid';
    receiptChargeCents?: number;
    settledAt?: Date;
    cost: number;
    platformFee: number;
    receiverEarnings: number;
    timestamp: Date;
    isRead: boolean;
    isLockedImage?: boolean;
    lockedImagePrice?: number;
    originalImageUrl?: string;
    blurredImageUrl?: string;
    isVideo?: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
    isGift?: boolean;
    isSystem?: boolean;
    isTemporary?: boolean;
    expiresAt?: Date;
    expiryMinutes?: number;
    deletedFor?: string[];
    replyToId?: string | null;
    replyToContent?: string | null;
    replyToSenderId?: string | null;
    isDelivered?: boolean;
    isAudio?: boolean;
    audioUrl?: string;
    audioDuration?: number;
    billingEngineVersion?: 'marketplace_v2' | 'marketplace_v3' | 'marketplace_v4';
    idempotencyKey?: string;
    textGraphemeCount?: number;
    audioBillableSeconds?: number;
    equivalentCharCount?: number;
    cashFundedCents?: number;
    promoFundedCents?: number;
    qualificationAttemptId?: mongoose.Types.ObjectId;
    qualifiedConversationId?: mongoose.Types.ObjectId;
    pricingSnapshot?: Record<string, unknown>;
}

const MessageSchema = new Schema<IMessage>({
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    senderId: {
        type: String,
        required: true,
        index: true,
    },
    receiverId: {
        type: String,
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
    },
    charCount: {
        type: Number,
        required: true,
    },
    billingStatus: { type: String, enum: ['free', 'pending', 'paid'], index: true },
    receiptChargeCents: { type: Number, min: 0 },
    settledAt: { type: Date },
    cost: {
        type: Number,
        required: true,
    },
    platformFee: {
        type: Number,
        required: true,
    },
    receiverEarnings: {
        type: Number,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    isDelivered: {
        type: Boolean,
        default: false,
    },
    isLockedImage: {
        type: Boolean,
        default: false,
    },
    lockedImagePrice: {
        type: Number,
        default: 0,
    },
    originalImageUrl: {
        type: String,
        default: null,
    },
    blurredImageUrl: {
        type: String,
        default: null,
    },
    isVideo: {
        type: Boolean,
        default: false,
    },
    videoUrl: {
        type: String,
        default: null,
    },
    thumbnailUrl: {
        type: String,
        default: null,
    },
    isGift: {
        type: Boolean,
        default: false,
    },
    isAudio: {
        type: Boolean,
        default: false,
    },
    audioUrl: {
        type: String,
        default: null,
    },
    audioDuration: {
        type: Number,
        default: null,
    },
    isSystem: {
        type: Boolean,
        default: false,
    },
    isTemporary: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    expiryMinutes: {
        type: Number,
        default: null,
    },
    deletedFor: {
        type: [String],
        default: [],
    },
    replyToId: {
        type: String,
        default: null,
    },
    replyToContent: {
        type: String,
        default: null,
    },
    replyToSenderId: {
        type: String,
        default: null,
    },
    billingEngineVersion: {
        type: String,
        enum: ['marketplace_v2', 'marketplace_v3', 'marketplace_v4'],
        index: true,
    },
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    textGraphemeCount: {
        type: Number,
        min: 0,
    },
    audioBillableSeconds: {
        type: Number,
        min: 0,
    },
    equivalentCharCount: {
        type: Number,
        min: 0,
    },
    cashFundedCents: {
        type: Number,
        min: 0,
    },
    promoFundedCents: {
        type: Number,
        min: 0,
    },
    qualificationAttemptId: {
        type: Schema.Types.ObjectId,
        ref: 'QualificationAttempt',
        index: true,
    },
    qualifiedConversationId: {
        type: Schema.Types.ObjectId,
        ref: 'QualifiedConversation',
        index: true,
    },
    pricingSnapshot: {
        type: Schema.Types.Mixed,
    },
});

MessageSchema.index({ billingStatus: 1, receiverId: 1, timestamp: 1, _id: 1 });
MessageSchema.index({ roomId: 1, timestamp: -1 });

export const Message = (mongoose.models.Message as mongoose.Model<IMessage>) ||
    mongoose.model<IMessage>('Message', MessageSchema);
