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
});

MessageSchema.index({ roomId: 1, timestamp: -1 });

export const Message = (mongoose.models.Message as mongoose.Model<IMessage>) ||
    mongoose.model<IMessage>('Message', MessageSchema);
