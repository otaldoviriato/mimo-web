import mongoose, { Document, Schema, Types } from 'mongoose';

export type MarketingProviderType = 'manual' | 'mock' | 'import' | 'external';
export type MarketingEntityStatus = 'active' | 'paused' | 'archived';
export type MarketingRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type MarketingLeadStatus =
    | 'new'
    | 'reviewed'
    | 'approved'
    | 'contacted'
    | 'interested'
    | 'onboarded'
    | 'rejected'
    | 'ignored';
export type MarketingRecommendation = 'approve' | 'review' | 'reject';

export interface MarketingCandidateInput {
    username: string;
    displayName?: string;
    profileUrl?: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    externalLink?: string;
    sourceSeedUsername?: string;
    sourceContext?: string;
    comments?: string;
}

export interface IMarketingSettings extends Document {
    key: string;
    openAiApiKeyEncrypted?: string;
    openAiModel: string;
    maxLeadsPerRun: number;
    maxSeedsPerRun: number;
    minScoreToHighlight: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    providerType: MarketingProviderType;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMarketingCampaign extends Document {
    name: string;
    description: string;
    targetDescription: string;
    minFollowers: number;
    maxFollowers: number;
    positiveSignals: string[];
    negativeSignals: string[];
    status: MarketingEntityStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMarketingSeedProfile extends Document {
    platform: string;
    username: string;
    profileUrl: string;
    notes: string;
    status: MarketingEntityStatus;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMarketingRun extends Document {
    campaignId: Types.ObjectId;
    status: MarketingRunStatus;
    maxLeads: number;
    seedIds: Types.ObjectId[];
    seedsUsed: string[];
    leadsFound: number;
    logs: string[];
    errorMessage?: string;
    inputCandidates: MarketingCandidateInput[];
    startedAt?: Date;
    finishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMarketingLead extends Document, MarketingCandidateInput {
    platform: string;
    username: string;
    displayName: string;
    profileUrl: string;
    bio: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    externalLink: string;
    sourceSeedUsername: string;
    sourceContext: string;
    campaignId?: Types.ObjectId;
    runId?: Types.ObjectId;
    aiScore: number;
    aiSummary: string;
    aiPositiveSignals: string[];
    aiRiskSignals: string[];
    aiRecommendation: MarketingRecommendation;
    suggestedMessage: string;
    status: MarketingLeadStatus;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

const MarketingSettingsSchema = new Schema<IMarketingSettings>({
    key: { type: String, default: 'global', unique: true, index: true },
    openAiApiKeyEncrypted: { type: String, select: false },
    openAiModel: { type: String, default: 'gpt-5.4-mini', trim: true },
    maxLeadsPerRun: { type: Number, default: 20, min: 1, max: 200 },
    maxSeedsPerRun: { type: Number, default: 5, min: 1, max: 50 },
    minScoreToHighlight: { type: Number, default: 75, min: 0, max: 100 },
    minDelaySeconds: { type: Number, default: 1, min: 0, max: 300 },
    maxDelaySeconds: { type: Number, default: 3, min: 0, max: 600 },
    providerType: {
        type: String,
        enum: ['manual', 'mock', 'import', 'external'],
        default: 'mock',
    },
}, { timestamps: true });

const MarketingCampaignSchema = new Schema<IMarketingCampaign>({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    targetDescription: { type: String, required: true, trim: true, maxlength: 4000 },
    minFollowers: { type: Number, default: 0, min: 0 },
    maxFollowers: { type: Number, default: 1000000, min: 0 },
    positiveSignals: { type: [String], default: [] },
    negativeSignals: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active', index: true },
}, { timestamps: true });
MarketingCampaignSchema.index({ createdAt: -1 });

const MarketingSeedProfileSchema = new Schema<IMarketingSeedProfile>({
    platform: { type: String, default: 'instagram', trim: true, lowercase: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    profileUrl: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true, maxlength: 5000 },
    status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active', index: true },
    lastUsedAt: Date,
}, { timestamps: true });
MarketingSeedProfileSchema.index({ platform: 1, username: 1 }, { unique: true });

const CandidateInputSchema = new Schema<MarketingCandidateInput>({
    username: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, default: '', trim: true },
    profileUrl: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postsCount: { type: Number, default: 0, min: 0 },
    externalLink: { type: String, default: '', trim: true },
    sourceSeedUsername: { type: String, default: '', trim: true, lowercase: true },
    sourceContext: { type: String, default: '', trim: true },
    comments: { type: String, default: '', trim: true },
}, { _id: false });

const MarketingRunSchema = new Schema<IMarketingRun>({
    campaignId: { type: Schema.Types.ObjectId, ref: 'MarketingCampaign', required: true, index: true },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
        default: 'queued',
        index: true,
    },
    maxLeads: { type: Number, required: true, min: 1, max: 200 },
    seedIds: [{ type: Schema.Types.ObjectId, ref: 'MarketingSeedProfile' }],
    seedsUsed: { type: [String], default: [] },
    leadsFound: { type: Number, default: 0, min: 0 },
    logs: { type: [String], default: [] },
    errorMessage: { type: String, maxlength: 2000 },
    inputCandidates: { type: [CandidateInputSchema], default: [], select: false },
    startedAt: Date,
    finishedAt: Date,
}, { timestamps: true });
MarketingRunSchema.index({ createdAt: -1 });

const MarketingLeadSchema = new Schema<IMarketingLead>({
    platform: { type: String, default: 'instagram', trim: true, lowercase: true, index: true },
    username: { type: String, required: true, trim: true, lowercase: true, index: true },
    displayName: { type: String, default: '', trim: true },
    profileUrl: { type: String, required: true, trim: true },
    bio: { type: String, default: '', trim: true, maxlength: 5000 },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postsCount: { type: Number, default: 0, min: 0 },
    externalLink: { type: String, default: '', trim: true },
    sourceSeedUsername: { type: String, default: '', trim: true, lowercase: true },
    sourceContext: { type: String, default: '', trim: true, maxlength: 5000 },
    campaignId: { type: Schema.Types.ObjectId, ref: 'MarketingCampaign', index: true },
    runId: { type: Schema.Types.ObjectId, ref: 'MarketingRun', index: true },
    aiScore: { type: Number, required: true, min: 0, max: 100, index: true },
    aiSummary: { type: String, default: '', trim: true, maxlength: 3000 },
    aiPositiveSignals: { type: [String], default: [] },
    aiRiskSignals: { type: [String], default: [] },
    aiRecommendation: {
        type: String,
        enum: ['approve', 'review', 'reject'],
        required: true,
        index: true,
    },
    suggestedMessage: { type: String, default: '', trim: true, maxlength: 3000 },
    status: {
        type: String,
        enum: ['new', 'reviewed', 'approved', 'contacted', 'interested', 'onboarded', 'rejected', 'ignored'],
        default: 'new',
        index: true,
    },
    notes: { type: String, default: '', trim: true, maxlength: 10000 },
}, { timestamps: true });
MarketingLeadSchema.index({ platform: 1, username: 1 }, { unique: true });
MarketingLeadSchema.index({ aiScore: -1, createdAt: -1 });

export const MarketingSettings =
    (mongoose.models.MarketingSettings as mongoose.Model<IMarketingSettings>) ||
    mongoose.model<IMarketingSettings>('MarketingSettings', MarketingSettingsSchema);
export const MarketingCampaign =
    (mongoose.models.MarketingCampaign as mongoose.Model<IMarketingCampaign>) ||
    mongoose.model<IMarketingCampaign>('MarketingCampaign', MarketingCampaignSchema);
export const MarketingSeedProfile =
    (mongoose.models.MarketingSeedProfile as mongoose.Model<IMarketingSeedProfile>) ||
    mongoose.model<IMarketingSeedProfile>('MarketingSeedProfile', MarketingSeedProfileSchema);
export const MarketingRun =
    (mongoose.models.MarketingRun as mongoose.Model<IMarketingRun>) ||
    mongoose.model<IMarketingRun>('MarketingRun', MarketingRunSchema);
export const MarketingLead =
    (mongoose.models.MarketingLead as mongoose.Model<IMarketingLead>) ||
    mongoose.model<IMarketingLead>('MarketingLead', MarketingLeadSchema);
