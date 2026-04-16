import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount?: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>({
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
    lastMessageTime: {
        type: Date,
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map(),
    },
}, {
    timestamps: true,
});

RoomSchema.index({ participants: 1 });

export const Room = (mongoose.models.Room as mongoose.Model<IRoom>) ||
    mongoose.model<IRoom>('Room', RoomSchema);
