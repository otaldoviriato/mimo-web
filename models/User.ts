import mongoose, { Schema, Document } from 'mongoose';

export interface ICard {
    id: string;
    label: string;
    lastFour: string;
    brand: string;
    token?: string;
    asaasCustomerId?: string;
    asaasEnvironment?: 'sandbox' | 'production';
    expiryMonth?: string;
    expiryYear?: string;
    createdAt: Date;
}

export interface IUser extends Document {
    clerkId: string;
    username: string;
    name?: string;
    email: string;
    taxId?: string;
    birthDate?: Date;
    phone?: string;
    photoUrl?: string;
    coverUrl?: string;
    balance: number;
    promotionalBalance?: number;
    isProfessional?: boolean;
    professionalStatus?: 'pending' | 'approved' | 'rejected' | null;
    notes?: string;
    subscriptionPrice: number;
    isSubscriptionEnabled: boolean;
    chargePerCharSubscribers: number;
    chargePerCharNonSubscribers: number;
    subscribers: string[]; // Array of clerkIds
    fcmToken?: string;
    fcmTokens?: string[];
    pixKey?: string;
    savedCards: ICard[];
    claimedGiftCodes: string[];
    isHighSpender: boolean;
    bio?: string;
    isOnline?: boolean;
    lastSeen?: Date;
    accessCount?: number;
    lastAccessAt?: Date;
    emailNotificationsEnabled?: boolean;
    isSuspended?: boolean;
    suspendedAt?: Date;
    avgResponseTimeMinutes?: number | null;
    identityDocumentUrl?: string;
    identitySelfieUrl?: string;
    identityDocumentType?: string;
    hideFromExplore?: boolean;
    subscriberDiscountPercentage?: number;
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
    birthDate: {
        type: Date,
    },
    phone: {
        type: String,
    },
    photoUrl: {
        type: String,
    },
    coverUrl: {
        type: String,
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    promotionalBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    isProfessional: {
        type: Boolean,
    },
    professionalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null,
        index: true,
    },
    notes: {
        type: String,
        default: '',
    },
    subscriptionPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    isSubscriptionEnabled: {
        type: Boolean,
        default: false,
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
    subscriberDiscountPercentage: {
        type: Number,
        default: null,
    },
    subscribers: {
        type: [String],
        default: [],
    },
    fcmToken: {
        type: String,
    },
    fcmTokens: {
        type: [String],
        default: [],
    },
    pixKey: {
        type: String,
    },
    savedCards: {
        type: [{
            id: { type: String, required: true },
            label: { type: String, required: true },
            lastFour: { type: String, required: true },
            brand: { type: String, required: true },
            token: { type: String },
            asaasCustomerId: { type: String },
            asaasEnvironment: { type: String, enum: ['sandbox', 'production'] },
            expiryMonth: { type: String },
            expiryYear: { type: String },
            createdAt: { type: Date, default: Date.now },
        }],
        default: [],
    },
    claimedGiftCodes: {
        type: [String],
        default: [],
    },
    isHighSpender: {
        type: Boolean,
        default: false,
    },
    bio: {
        type: String,
        maxlength: 300,
        default: '',
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
    },
    accessCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastAccessAt: {
        type: Date,
    },
    emailNotificationsEnabled: {
        type: Boolean,
        default: false,
    },
    isSuspended: {
        type: Boolean,
        default: false,
        index: true,
    },
    suspendedAt: {
        type: Date,
    },
    avgResponseTimeMinutes: {
        type: Number,
        default: null,
    },
    identityDocumentUrl: {
        type: String,
    },
    identitySelfieUrl: {
        type: String,
    },
    identityDocumentType: {
        type: String,
    },
    hideFromExplore: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// No Next.js dev mode, o modelo pode ficar em cache com schema antigo.
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
    delete mongoose.models.User;
}

export const User = (mongoose.models.User as mongoose.Model<IUser>) ||
    mongoose.model<IUser>('User', UserSchema);
