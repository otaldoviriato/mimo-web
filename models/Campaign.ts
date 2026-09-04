import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
    name: string;
    slug: string;
    status: 'draft' | 'active' | 'paused' | 'archived';
    network: 'exoclick' | 'direct' | 'other';
    targetProfessionalId?: string | null;
    landingHeadline: string;
    landingBody: string;
    landingImageUrl?: string | null;
    internalDestination?: string | null;
    externalCampaignId?: string | null;
    externalVariationId?: string | null;
    conversionGoals: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ICampaign>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft', index: true },
    network: { type: String, enum: ['exoclick', 'direct', 'other'], default: 'exoclick', index: true },
    targetProfessionalId: { type: String, default: null, index: true },
    landingHeadline: { type: String, required: true, trim: true },
    landingBody: { type: String, required: true, trim: true },
    landingImageUrl: { type: String, default: null },
    internalDestination: { type: String, default: null },
    externalCampaignId: { type: String, default: null, index: true },
    externalVariationId: { type: String, default: null },
    conversionGoals: { type: [String], default: [] },
    createdBy: { type: String, required: true, index: true },
}, { timestamps: true });

export const Campaign =
    (mongoose.models.Campaign as mongoose.Model<ICampaign>)
    || mongoose.model<ICampaign>('Campaign', schema);
