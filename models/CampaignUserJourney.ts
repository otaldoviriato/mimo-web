import mongoose, { Document, Schema } from 'mongoose';

export interface ITimelineEvent {
    type: 'signup' | 'explore_scroll' | 'profile_view' | 'photo_view' | 'message_click' | 'recharge_modal' | 'custom';
    title: string;
    detail?: string | null;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface ICampaignUserJourney extends Document {
    campaignId: mongoose.Types.ObjectId;
    userId: string; // clerkId
    visitorId?: string | null;
    userInfo: {
        username: string;
        name?: string | null;
        photoUrl?: string | null;
        email?: string | null;
    };
    signupAt: Date;
    isOnline: boolean;
    lastActiveAt: Date;
    lastAction: string;
    
    // Métricas específicas da jornada
    firstProfileViewed?: {
        professionalId: string;
        username: string;
        name?: string | null;
        viewedAt: Date;
    } | null;
    profilesVisited: Array<{
        professionalId: string;
        username: string;
        name?: string | null;
        viewedAt: Date;
        count: number;
    }>;
    profilesVisitedCount: number;
    
    hasScrolledExplore: boolean;
    exploreScrollCount: number;
    
    photoGalleryActions: Array<{
        professionalId: string;
        username: string;
        photoIndex: number;
        totalPhotos: number;
        action: 'opened' | 'next_photo' | 'prev_photo';
        timestamp: Date;
    }>;
    hasNavigatedPastFirstPhoto: boolean;
    
    messageButtonClicks: Array<{
        professionalId: string;
        username: string;
        timestamp: Date;
    }>;
    
    rechargeTriggers: Array<{
        professionalId: string;
        username?: string | null;
        reason?: string | null;
        timestamp: Date;
    }>;
    
    timeline: ITimelineEvent[];
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ICampaignUserJourney>({
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    userId: { type: String, required: true, index: true },
    visitorId: { type: String, default: null, index: true },
    userInfo: {
        username: { type: String, default: 'usuario' },
        name: { type: String, default: null },
        photoUrl: { type: String, default: null },
        email: { type: String, default: null },
    },
    signupAt: { type: Date, required: true, default: Date.now, index: true },
    isOnline: { type: Boolean, default: true, index: true },
    lastActiveAt: { type: Date, required: true, default: Date.now, index: true },
    lastAction: { type: String, default: 'Cadastro realizado' },
    
    firstProfileViewed: {
        professionalId: { type: String },
        username: { type: String },
        name: { type: String, default: null },
        viewedAt: { type: Date, default: Date.now },
    },
    profilesVisited: [{
        professionalId: { type: String, required: true },
        username: { type: String, required: true },
        name: { type: String, default: null },
        viewedAt: { type: Date, default: Date.now },
        count: { type: Number, default: 1 },
    }],
    profilesVisitedCount: { type: Number, default: 0 },
    
    hasScrolledExplore: { type: Boolean, default: false },
    exploreScrollCount: { type: Number, default: 0 },
    
    photoGalleryActions: [{
        professionalId: { type: String, required: true },
        username: { type: String, required: true },
        photoIndex: { type: Number, required: true },
        totalPhotos: { type: Number, default: 1 },
        action: { type: String, default: 'opened' },
        timestamp: { type: Date, default: Date.now },
    }],
    hasNavigatedPastFirstPhoto: { type: Boolean, default: false },
    
    messageButtonClicks: [{
        professionalId: { type: String, required: true },
        username: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    }],
    
    rechargeTriggers: [{
        professionalId: { type: String, required: true },
        username: { type: String, default: null },
        reason: { type: String, default: null },
        timestamp: { type: Date, default: Date.now },
    }],
    
    timeline: [{
        type: { type: String, required: true },
        title: { type: String, required: true },
        detail: { type: String, default: null },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: Schema.Types.Mixed, default: {} },
    }],
}, { timestamps: true });

schema.index({ campaignId: 1, userId: 1 }, { unique: true });
schema.index({ campaignId: 1, signupAt: -1 });

export const CampaignUserJourney =
    (mongoose.models.CampaignUserJourney as mongoose.Model<ICampaignUserJourney>)
    || mongoose.model<ICampaignUserJourney>('CampaignUserJourney', schema);
