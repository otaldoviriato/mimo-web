import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditCampaign extends Document {
    name: string;
    type: 'welcome_credit';
    enabled: boolean;
    amount: number; // valor em centavos (ex: 500 = R$ 5,00)
    targetAudience: string; // 'client' inicialmente
    validityHours?: number | null; // nulo = sem data de expiração relativa
    startsAt: Date;
    endsAt?: Date | null;
    maxTotalUsers?: number | null;
    limitByCpf: boolean;
    limitByEmail: boolean;
    limitByPhone: boolean;
    limitByIp: boolean;
    appMessageTitle: string;
    appMessageDescription: string;
    balanceLabel: string;
    createdAt: Date;
    updatedAt: Date;
}

const CreditCampaignSchema = new Schema<ICreditCampaign>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['welcome_credit'],
        default: 'welcome_credit',
        required: true,
        index: true,
    },
    enabled: {
        type: Boolean,
        default: false,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    targetAudience: {
        type: String,
        default: 'client',
        required: true,
    },
    validityHours: {
        type: Number,
        default: null,
    },
    startsAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    endsAt: {
        type: Date,
        default: null,
    },
    maxTotalUsers: {
        type: Number,
        default: null,
    },
    limitByCpf: {
        type: Boolean,
        default: true,
        required: true,
    },
    limitByEmail: {
        type: Boolean,
        default: true,
        required: true,
    },
    limitByPhone: {
        type: Boolean,
        default: true,
        required: true,
    },
    limitByIp: {
        type: Boolean,
        default: true,
        required: true,
    },
    appMessageTitle: {
        type: String,
        default: '',
    },
    appMessageDescription: {
        type: String,
        default: '',
    },
    balanceLabel: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

export const CreditCampaign = (mongoose.models.CreditCampaign as mongoose.Model<ICreditCampaign>) ||
    mongoose.model<ICreditCampaign>('CreditCampaign', CreditCampaignSchema);
