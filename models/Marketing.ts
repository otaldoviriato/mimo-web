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

export interface MarketingScoringCriteria {
    targetDescription: string;
    minFollowers: number;
    idealFollowers: number;
    maxFollowers: number;
    positiveSignals: string[];
    negativeSignals: string[];
    weights: {
        realPerson: number;
        personalIdentity: number;
        profileActivity: number;
        ownAudience: number;
        profileQuality: number;
        externalLink: number;
        followerInteraction: number;
        creatorFit: number;
    };
    penalties: {
        brandOrCompany: number;
        fakeOrBot: number;
        possibleMinor: number;
        privateOrInsufficient: number;
        spamOrScam: number;
        inactiveProfile: number;
    };
}

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
    scoringCriteria: MarketingScoringCriteria;
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
    followersText: string;
    followingText: string;
    postsText: string;
    visibleTexts: string[];
    source: string;
    discoverySessionId: string;
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

export interface IMarketingDiscoveryReport extends Document {
    sessionId: string;
    seedUsername: string;
    seedProfileUrl: string;
    status: 'received' | 'reviewed' | 'archived';
    summary: string;
    highlights: string[];
    risks: string[];
    nextSuggestedStep: string;
    analyzedPages: unknown[];
    candidates: unknown[];
    savedLeads: unknown[];
    leadIds: Types.ObjectId[];
    source: string;
    submittedBy: string;
    startedAt?: Date;
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
    scoringCriteria: {
        targetDescription: {
            type: String,
            default: 'Criadoras digitais com audiência própria, perfil ativo e potencial para usar o MimoChat.',
            trim: true,
            maxlength: 4000,
        },
        minFollowers: { type: Number, default: 1000, min: 0 },
        idealFollowers: { type: Number, default: 10000, min: 0 },
        maxFollowers: { type: Number, default: 1000000, min: 0 },
        positiveSignals: {
            type: [String],
            default: [
                'Parece uma pessoa real',
                'Perfil ativo',
                'Tem audiência própria',
                'Bio bem montada',
                'Possui link externo',
                'Interage com seguidores',
                'Conteúdo compatível com criadora digital',
            ],
        },
        negativeSignals: {
            type: [String],
            default: [
                'Parece marca ou empresa',
                'Parece fake ou bot',
                'Possível menor de idade',
                'Perfil privado ou sem dados suficientes',
                'Sinais de spam ou golpe',
                'Pouca atividade',
            ],
        },
        weights: {
            realPerson: { type: Number, default: 20, min: 0, max: 100 },
            personalIdentity: { type: Number, default: 10, min: 0, max: 100 },
            profileActivity: { type: Number, default: 15, min: 0, max: 100 },
            ownAudience: { type: Number, default: 20, min: 0, max: 100 },
            profileQuality: { type: Number, default: 10, min: 0, max: 100 },
            externalLink: { type: Number, default: 5, min: 0, max: 100 },
            followerInteraction: { type: Number, default: 15, min: 0, max: 100 },
            creatorFit: { type: Number, default: 15, min: 0, max: 100 },
        },
        penalties: {
            brandOrCompany: { type: Number, default: 35, min: 0, max: 100 },
            fakeOrBot: { type: Number, default: 60, min: 0, max: 100 },
            possibleMinor: { type: Number, default: 100, min: 0, max: 100 },
            privateOrInsufficient: { type: Number, default: 25, min: 0, max: 100 },
            spamOrScam: { type: Number, default: 80, min: 0, max: 100 },
            inactiveProfile: { type: Number, default: 25, min: 0, max: 100 },
        },
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
    followersText: { type: String, default: '', trim: true, maxlength: 200 },
    followingText: { type: String, default: '', trim: true, maxlength: 200 },
    postsText: { type: String, default: '', trim: true, maxlength: 200 },
    visibleTexts: { type: [String], default: [] },
    source: { type: String, default: '', trim: true, maxlength: 100, index: true },
    discoverySessionId: { type: String, default: '', trim: true, maxlength: 100, index: true },
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

const MarketingDiscoveryReportSchema = new Schema<IMarketingDiscoveryReport>({
    sessionId: { type: String, required: true, trim: true, maxlength: 100, unique: true, index: true },
    seedUsername: { type: String, default: '', trim: true, lowercase: true, index: true },
    seedProfileUrl: { type: String, default: '', trim: true, maxlength: 1500 },
    status: { type: String, enum: ['received', 'reviewed', 'archived'], default: 'received', index: true },
    summary: { type: String, default: '', trim: true, maxlength: 5000 },
    highlights: { type: [String], default: [] },
    risks: { type: [String], default: [] },
    nextSuggestedStep: { type: String, default: '', trim: true, maxlength: 2000 },
    analyzedPages: { type: [Schema.Types.Mixed], default: [] },
    candidates: { type: [Schema.Types.Mixed], default: [] },
    savedLeads: { type: [Schema.Types.Mixed], default: [] },
    leadIds: [{ type: Schema.Types.ObjectId, ref: 'MarketingLead' }],
    source: { type: String, default: 'mimo-scout-extension', trim: true, maxlength: 100 },
    submittedBy: { type: String, default: '', trim: true, maxlength: 200 },
    startedAt: Date,
}, { timestamps: true });
MarketingDiscoveryReportSchema.index({ createdAt: -1 });

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
export const MarketingDiscoveryReport =
    (mongoose.models.MarketingDiscoveryReport as mongoose.Model<IMarketingDiscoveryReport>) ||
    mongoose.model<IMarketingDiscoveryReport>('MarketingDiscoveryReport', MarketingDiscoveryReportSchema);
