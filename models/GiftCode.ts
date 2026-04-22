import mongoose, { Schema, Document } from 'mongoose';

export type GiftCodeAudience = 'all' | 'client' | 'professional';

export interface IGiftCode extends Document {
    code: string;
    amount: number; // valor em centavos (ex: 5000 = R$50,00)
    description?: string;
    isActive: boolean;
    targetAudience: GiftCodeAudience; // 'all' | 'client' | 'professional'
    maxUses?: number; // null = usos ilimitados
    totalUses: number;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const GiftCodeSchema = new Schema<IGiftCode>({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true,
        uppercase: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    description: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    targetAudience: {
        type: String,
        enum: ['all', 'client', 'professional'],
        default: 'all',
    },
    maxUses: {
        type: Number,
        default: null,
    },
    totalUses: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

export const GiftCode = (mongoose.models.GiftCode as mongoose.Model<IGiftCode>) ||
    mongoose.model<IGiftCode>('GiftCode', GiftCodeSchema);
