import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
    maxBillableMessageChars: number;
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
    earningsSessionInactivityMinutes: number;
    earningsSessionMinimumCents: number;
    lowBalanceThresholdInCents: number;
    onlineDelayMinutes: number;
    institutionalEmails: string[];
    emailRedirections: { sourceEmail: string; targetEmail: string; displayName?: string }[];
    defaultPricePerCharSubscribers: number;
    defaultPricePerCharNonSubscribers: number;
    audioPriceMultiplier: number;
    conversationPricePerEquivalentCharCents: number;
    audioEquivalentCharsPerSecond: number;
    quickReplyBonusEnabled: boolean;
    quickReplyBonusPercentagePoints: number;
    engagementBonusEnabled: boolean;
    engagementBonusPercentagePoints: number;
    deepConversationBonusEnabled: boolean;
    deepConversationBonusPercentagePoints: number;
    pwaShowAgainIntervalDays: number;
    identityVerificationPromptIntervalDays: number;
    newProfileDaysThreshold: number;
    newClientHoursThreshold: number;
    activeRechargedClientDaysThreshold: number;
    activeUnrechargedClientHoursThreshold: number;
    activeUserThresholdDays: number;
    exploreSortingCriteria: string[];
    creatorEngagementEmailsEnabled: boolean;
    creatorEngagementStep1Enabled: boolean;
    creatorEngagementStep1Hours: number;
    creatorEngagementStep2Enabled: boolean;
    creatorEngagementStep2Hours: number;
    createdAt: Date;
    updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>({
    maxBillableMessageChars: { type: Number, default: 50, min: 1, max: 10000 },
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
        default: 20,
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
    earningsSessionInactivityMinutes: {
        type: Number,
        required: true,
        default: 120,
        min: 1,
    },
    earningsSessionMinimumCents: {
        type: Number,
        required: true,
        default: 1000,
        min: 0,
    },
    lowBalanceThresholdInCents: {
        type: Number,
        required: true,
        default: 1000,
        min: 0,
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
        default: 0.04,
        min: 0,
    },
    defaultPricePerCharNonSubscribers: {
        type: Number,
        required: true,
        default: 0.05,
        min: 0,
    },
    audioPriceMultiplier: {
        type: Number,
        required: true,
        default: 5,
        min: 0,
    },
    conversationPricePerEquivalentCharCents: {
        type: Number,
        required: true,
        default: 5,
        min: 1,
    },
    audioEquivalentCharsPerSecond: {
        type: Number,
        required: true,
        default: 5,
        min: 1,
    },
    quickReplyBonusEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    quickReplyBonusPercentagePoints: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
        max: 40,
    },
    engagementBonusEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    engagementBonusPercentagePoints: {
        type: Number,
        required: true,
        default: 15,
        min: 0,
        max: 40,
    },
    deepConversationBonusEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    deepConversationBonusPercentagePoints: {
        type: Number,
        required: true,
        default: 15,
        min: 0,
        max: 40,
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
    newClientHoursThreshold: {
        type: Number,
        required: true,
        default: 24,
        min: 0,
    },
    activeRechargedClientDaysThreshold: {
        type: Number,
        required: true,
        default: 30,
        min: 0,
    },
    activeUnrechargedClientHoursThreshold: {
        type: Number,
        required: true,
        default: 24,
        min: 0,
    },
    activeUserThresholdDays: {
        type: Number,
        required: true,
        default: 7,
        min: 1,
    },
    creatorEngagementEmailsEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    creatorEngagementStep1Enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    creatorEngagementStep1Hours: {
        type: Number,
        required: true,
        default: 24,
        min: 1,
    },
    creatorEngagementStep2Enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    creatorEngagementStep2Hours: {
        type: Number,
        required: true,
        default: 72,
        min: 1,
    },
    exploreSortingCriteria: {
        type: [String],
        required: true,
        default: ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'],
    }
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.AppSettings) {
    delete mongoose.models.AppSettings;
}

export const AppSettings = (mongoose.models.AppSettings as mongoose.Model<IAppSettings>) ||
    mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
export type AppSettingsModelType = mongoose.Model<IAppSettings>;
