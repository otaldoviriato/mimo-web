import mongoose, { Schema, Document } from 'mongoose';
import { calculateOnboardingStep } from '@/lib/onboarding';

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
    city?: string;
    state?: string;
    phone?: string;
    photoUrl?: string;
    coverUrl?: string;
    balance: number;
    promotionalBalance?: number;
    customerCashAvailableCents?: number;
    customerPromoAvailableCents?: number;
    professionalPendingCents?: number;
    professionalAvailableCents?: number;
    professionalReservedForWithdrawalCents?: number;
    marketplaceWalletMigratedAt?: Date | null;
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
    isAvailable?: boolean;
    lastSeen?: Date;
    accessCount?: number;
    lastAccessAt?: Date;
    emailNotificationsEnabled?: boolean;
    newUserNotificationsEnabled?: boolean;
    isSuspended?: boolean;
    suspendedAt?: Date;
    avgResponseTimeMinutes?: number | null;
    identityDocumentUrl?: string;
    onboardingStep?: 'welcome' | 'identity' | 'profile' | 'completed';
    identitySelfieUrl?: string;
    identityDocumentType?: string;
    identityStatus?: 'pending' | 'approved' | 'rejected' | null;
    identityVerificationPromptIntervalDays?: number;
    hideFromExplore?: boolean;
    subscriberDiscountPercentage?: number;
    financialLastViewedAt?: Date;
    engagementEmailsSent?: string[];
    isTeam?: boolean;
    teamTitle?: string;
    activationLastViewedAt?: Date;
    acquiredByProfessionalId?: string;
    acquiredByProfessionalUsername?: string;
    acquisitionSource?: 'profile_share' | 'first_paid_message';
    acquiredAt?: Date;
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
    city: {
        type: String,
    },
    state: {
        type: String,
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
    customerCashAvailableCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    customerPromoAvailableCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    professionalPendingCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    professionalAvailableCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    professionalReservedForWithdrawalCents: {
        type: Number,
        default: 0,
        min: 0,
    },
    marketplaceWalletMigratedAt: {
        type: Date,
        default: null,
    },
    isProfessional: {
        type: Boolean,
        default: false,
    },
    onboardingStep: {
        type: String,
        enum: ['welcome', 'identity', 'profile', 'completed'],
        default: 'welcome',
        index: true,
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
    isAvailable: {
        type: Boolean,
        default: true,
        index: true,
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
        default: true,
    },
    newUserNotificationsEnabled: {
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
    identityStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null,
        index: true,
    },
    hideFromExplore: {
        type: Boolean,
        default: false,
    },
    financialLastViewedAt: {
        type: Date,
    },
    engagementEmailsSent: {
        type: [String],
        default: [],
    },
    isTeam: {
        type: Boolean,
        default: false,
        index: true,
    },
    teamTitle: {
        type: String,
        default: 'Equipe Mimo',
    },
    activationLastViewedAt: {
        type: Date,
    },
    acquiredByProfessionalId: {
        type: String,
        index: true,
    },
    acquiredByProfessionalUsername: {
        type: String,
    },
    acquisitionSource: {
        type: String,
        enum: ['profile_share', 'first_paid_message'],
    },
    acquiredAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

UserSchema.pre('save', async function () {
    this.onboardingStep = calculateOnboardingStep(this);
});

// No Next.js dev mode, o modelo pode ficar em cache com schema antigo.
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
    delete mongoose.models.User;
}

export const User = (mongoose.models.User as mongoose.Model<IUser>) ||
    mongoose.model<IUser>('User', UserSchema);
