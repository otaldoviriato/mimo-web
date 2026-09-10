import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
    name: string;
    slug: string;
    description?: string | null;
    entryPoint: string;
    status: 'draft' | 'tracking' | 'completed' | 'active' | 'paused' | 'archived';
    network: 'exoclick' | 'direct' | 'other';
    targetProfessionalId?: string | null;
    landingHeadline?: string;
    landingBody?: string;
    landingImageUrl?: string | null;
    internalDestination?: string | null;
    externalCampaignId?: string | null;
    externalVariationId?: string | null;
    startedAt?: Date | null;
    endedAt?: Date | null;
    externalImpressions?: number | null;
    externalClicks?: number | null;
    uniqueVisitorsCount: number;
    conversionGoals: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ICampaign>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: null, trim: true },
    entryPoint: { type: String, default: '/descubra', trim: true, index: true },
    status: {
        type: String,
        enum: ['draft', 'tracking', 'completed', 'active', 'paused', 'archived'],
        default: 'draft',
        index: true
    },
    network: { type: String, enum: ['exoclick', 'direct', 'other'], default: 'exoclick', index: true },
    targetProfessionalId: { type: String, default: null, index: true },
    landingHeadline: { type: String, default: 'MimoChat | Conversas Privadas', trim: true },
    landingBody: { type: String, default: 'Conecte-se com criadoras e monetize interações.', trim: true },
    landingImageUrl: { type: String, default: null },
    internalDestination: { type: String, default: null },
    externalCampaignId: { type: String, default: null, index: true },
    externalVariationId: { type: String, default: null },
    startedAt: { type: Date, default: null, index: true },
    endedAt: { type: Date, default: null },
    externalImpressions: { type: Number, default: 0 },
    externalClicks: { type: Number, default: 0 },
    uniqueVisitorsCount: { type: Number, default: 0 },
    conversionGoals: { type: [String], default: [] },
    createdBy: { type: String, default: 'admin', index: true },
}, { timestamps: true });

schema.index({ status: 1, entryPoint: 1 });

export const Campaign =
    (mongoose.models.Campaign as mongoose.Model<ICampaign>)
    || mongoose.model<ICampaign>('Campaign', schema);
