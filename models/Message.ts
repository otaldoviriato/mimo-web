import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
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
    deletedFor?: string[];
    replyToId?: string | null;
    replyToContent?: string | null;
    replyToSenderId?: string | null;
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
});

MessageSchema.index({ roomId: 1, timestamp: -1 });

export const Message = (mongoose.models.Message as mongoose.Model<IMessage>) ||
    mongoose.model<IMessage>('Message', MessageSchema);
