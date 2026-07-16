import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
    key: string;
    platformFeePercentage: number;
    uploadLimitMB: number;
    autoModeration: boolean;
    professionalsOnlyCreateRooms: boolean;
    adminClerkIds: string[];
    comparisonPeriod: 'none' | 'week' | 'month';
    maxPricePerChar: number;
    maxSubscriptionPrice: number;
    minSubscriptionPrice: number;
    subscriberDiscountPercentage: number;
    minPublicPhotos: number;
    maxPublicPhotos: number;
    minExclusivePhotos: number;
    maxExclusivePhotos: number;
    pixEnabled: boolean;
    creditCardEnabled: boolean;
    couponsEnabled: boolean;
    chatSessionTimeoutMinutes: number;
    onlineDelayMinutes: number;
    institutionalEmails: string[];
    emailRedirections: { sourceEmail: string; targetEmail: string; displayName?: string }[];
    defaultPricePerCharSubscribers: number;
    defaultPricePerCharNonSubscribers: number;
    audioPriceMultiplier: number;
    pwaShowAgainIntervalDays: number;
    identityVerificationPromptIntervalDays: number;
    newProfileDaysThreshold: number;
    chatInactivityHours: number;
    activeUserThresholdDays: number;
    exploreSortingCriteria: string[];
    createdAt: Date;
    updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'global',
        index: true,
    },
    institutionalEmails: {
        type: [String],
        default: ['viriatoceo@mimochat.com.br']
    },
    emailRedirections: {
        type: [{
            sourceEmail: { type: String, required: true },
            targetEmail: { type: String, required: true },
            displayName: { type: String }
        }],
        default: []
    },
    platformFeePercentage: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
        max: 100,
    },
    uploadLimitMB: {
        type: Number,
        required: true,
        default: 50,
        min: 1,
    },
    autoModeration: {
        type: Boolean,
        required: true,
        default: true,
    },
    professionalsOnlyCreateRooms: {
        type: Boolean,
        required: true,
        default: false,
    },
    adminClerkIds: {
        type: [String],
        required: true,
        default: ['user_39WqqlzJvRKuC6Xhp9ToiGmBFNM'],
    },
    comparisonPeriod: {
        type: String,
        enum: ['none', 'week', 'month'],
        default: 'none',
    },
    maxPricePerChar: {
        type: Number,
        required: true,
        default: 0.2,
        min: 0,
    },
    maxSubscriptionPrice: {
        type: Number,
        required: true,
        default: 200,
        min: 0,
    },
    minSubscriptionPrice: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
    },
    subscriberDiscountPercentage: {
        type: Number,
        required: true,
        default: 20,
        min: 0,
        max: 100,
    },
    minPublicPhotos: {
        type: Number,
        required: true,
        default: 6,
        min: 0,
    },
    maxPublicPhotos: {
        type: Number,
        required: true,
        default: 12,
        min: 0,
    },
    minExclusivePhotos: {
        type: Number,
        required: true,
        default: 2,
        min: 0,
    },
    maxExclusivePhotos: {
        type: Number,
        required: true,
        default: 4,
        min: 0,
    },
    pixEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    creditCardEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    couponsEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    chatSessionTimeoutMinutes: {
        type: Number,
        required: true,
        default: 30,
        min: 1,
    },
    onlineDelayMinutes: {
        type: Number,
        required: true,
        default: 2,
        min: 0,
    },
    defaultPricePerCharSubscribers: {
        type: Number,
        required: true,
        default: 0.002,
        min: 0,
    },
    defaultPricePerCharNonSubscribers: {
        type: Number,
        required: true,
        default: 0.005,
        min: 0,
    },
    audioPriceMultiplier: {
        type: Number,
        required: true,
        default: 5,
        min: 0,
    },
    pwaShowAgainIntervalDays: {
        type: Number,
        required: true,
        default: 7,
        min: 0,
    },
    identityVerificationPromptIntervalDays: {
        type: Number,
        required: true,
        default: 7,
        min: 0,
    },
    newProfileDaysThreshold: {
        type: Number,
        required: true,
        default: 15,
        min: 0,
    },
    chatInactivityHours: {
        type: Number,
        required: true,
        default: 48,
        min: 1,
    },
    activeUserThresholdDays: {
        type: Number,
        required: true,
        default: 7,
        min: 1,
    },
    exploreSortingCriteria: {
        type: [String],
        required: true,
        default: ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'],
    },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.AppSettings) {
    delete mongoose.models.AppSettings;
}

export const AppSettings = (mongoose.models.AppSettings as mongoose.Model<IAppSettings>) ||
    mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
export type AppSettingsModelType = mongoose.Model<IAppSettings>;
