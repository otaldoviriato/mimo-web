import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaignVisit extends Document {
    visitorId: string;
    campaignId: mongoose.Types.ObjectId;
    clickId?: string | null;
    userId?: string | null;
    targetProfessionalId?: string | null;
    site?: string | null;
    zone?: string | null;
    creative?: string | null;
    variation?: string | null;
    utm?: Record<string, string>;
    landingViewedAt: Date;
    ctaClickedAt?: Date | null;
    signupCompletedAt?: Date | null;
    firstProfileViewedAt?: Date | null;
    firstProfileViewedProfessionalId?: string | null;
    firstRechargeAt?: Date | null;
    firstRechargeAmountCents?: number | null;
    firstPaidMessageAt?: Date | null;
    firstPaidMessageProfessionalId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ICampaignVisit>({
    visitorId: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    clickId: { type: String, default: null, index: true },
    userId: { type: String, default: null, index: true },
    targetProfessionalId: { type: String, default: null, index: true },
    site: { type: String, default: null },
    zone: { type: String, default: null },
    creative: { type: String, default: null },
    variation: { type: String, default: null },
    utm: { type: Schema.Types.Mixed, default: {} },
    landingViewedAt: { type: Date, required: true, default: Date.now, index: true },
    ctaClickedAt: { type: Date, default: null },
    signupCompletedAt: { type: Date, default: null },
    firstProfileViewedAt: { type: Date, default: null },
    firstProfileViewedProfessionalId: { type: String, default: null, index: true },
    firstRechargeAt: { type: Date, default: null },
    firstRechargeAmountCents: { type: Number, default: null },
    firstPaidMessageAt: { type: Date, default: null },
    firstPaidMessageProfessionalId: { type: String, default: null, index: true },
}, { timestamps: true });

schema.index({ campaignId: 1, visitorId: 1 }, { unique: true });
schema.index({ campaignId: 1, landingViewedAt: -1 });

export const CampaignVisit =
    (mongoose.models.CampaignVisit as mongoose.Model<ICampaignVisit>)
    || mongoose.model<ICampaignVisit>('CampaignVisit', schema);
