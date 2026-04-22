import mongoose, { Schema, Document } from 'mongoose';

export interface ICard {
    id: string;
    label: string;
    lastFour: string;
    brand: string;
    createdAt: Date;
}

export interface IUser extends Document {
    clerkId: string;
    username: string;
    name?: string;
    email: string;
    taxId?: string;
    phone?: string;
    photoUrl?: string;
    balance: number;
    isProfessional: boolean;
    subscriptionPrice: number;
    chargePerCharSubscribers: number;
    chargePerCharNonSubscribers: number;
    subscribers: string[]; // Array of clerkIds
    fcmToken?: string;
    savedCards: ICard[];
    claimedGiftCodes: string[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    taxId: {
        type: String,
    },
    phone: {
        type: String,
    },
    photoUrl: {
        type: String,
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    isProfessional: {
        type: Boolean,
        default: false,
    },
    subscriptionPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    chargePerCharSubscribers: {
        type: Number,
        default: 0.002,
        min: 0,
    },
    chargePerCharNonSubscribers: {
        type: Number,
        default: 0.005,
        min: 0,
    },
    subscribers: {
        type: [String],
        default: [],
    },
    fcmToken: {
        type: String,
    },
    savedCards: {
        type: [{
            id: { type: String, required: true },
            label: { type: String, required: true },
            lastFour: { type: String, required: true },
            brand: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        }],
        default: [],
    },
    claimedGiftCodes: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
});

// No Next.js dev mode, o modelo pode ficar em cache com schema antigo.
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
    delete (mongoose.models as any).User;
}

export const User = (mongoose.models.User as mongoose.Model<IUser>) ||
    mongoose.model<IUser>('User', UserSchema);
