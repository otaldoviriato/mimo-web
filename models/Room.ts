import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
    freeIntro?: {
        professionalId: string;
        grantedAt: Date;
        limit: number;
        used: number;
        convertedAt?: Date | null;
        pendingSince?: Date | null;
    };
    participants: string[];
    lastMessage?: string;
    lastMessageSenderId?: string;
    lastMessageBillingStatus?: string;
    lastMessageTime?: Date;
    unreadCount?: Map<string, number>;
    lastEmailNotificationBySender?: Map<string, Date>;
    deletedBy?: string[]; // clerkIds que excluíram esta conversa
    roomId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>({
    freeIntro: {
        type: new Schema({
            professionalId: { type: String, required: true },
            grantedAt: { type: Date, required: true },
            limit: { type: Number, required: true, min: 1 },
            used: { type: Number, default: 0, min: 0 },
            convertedAt: { type: Date, default: null },
            pendingSince: { type: Date, default: null },
        }, { _id: false }),
        default: undefined,
    },
    participants: {
        type: [String],
        required: true,
        validate: {
            validator: (v: string[]) => v.length === 2,
            message: 'Room must have exactly 2 participants',
        },
    },
    lastMessage: {
        type: String,
    },
    lastMessageSenderId: {
        type: String,
    },
    lastMessageBillingStatus: {
        type: String,
    },
    lastMessageTime: {
        type: Date,
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map(),
    },
    lastEmailNotificationBySender: {
        type: Map,
        of: Date,
        default: new Map(),
    },
    deletedBy: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
});

RoomSchema.index({ participants: 1 });
RoomSchema.index({ 'freeIntro.pendingSince': 1 }, { partialFilterExpression: { 'freeIntro.pendingSince': { $type: 'date' } } });

export const Room = (mongoose.models.Room as mongoose.Model<IRoom>) ||
    mongoose.model<IRoom>('Room', RoomSchema);
