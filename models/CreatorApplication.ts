import mongoose, { Document, Schema } from 'mongoose';

export type CreatorApplicationStatus = 'pending' | 'contacted' | 'approved' | 'rejected';
export type OnlineExperience = 'yes' | 'no' | 'starting';

export interface ICreatorApplication extends Document {
    fullName: string;
    artisticName?: string;
    instagram: string;
    whatsapp: string;
    email?: string;
    age: number;
    cityState: string;
    hasOnlineExperience: OnlineExperience;
    howFoundMimo: string;
    reason: string;
    isAdultConfirmed: boolean;
    contactConsent: boolean;
    status: CreatorApplicationStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CreatorApplicationSchema = new Schema<ICreatorApplication>({
    fullName: { type: String, required: true, trim: true },
    artisticName: { type: String, trim: true },
    instagram: { type: String, required: true, trim: true, lowercase: true, index: true },
    whatsapp: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    age: { type: Number, required: true, min: 18 },
    cityState: { type: String, required: true, trim: true },
    hasOnlineExperience: {
        type: String,
        required: true,
        enum: ['yes', 'no', 'starting'],
    },
    howFoundMimo: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    isAdultConfirmed: { type: Boolean, required: true },
    contactConsent: { type: Boolean, required: true },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    notes: { type: String, default: '', trim: true },
}, {
    timestamps: true,
});

CreatorApplicationSchema.index({ createdAt: -1 });

if (process.env.NODE_ENV === 'development' && mongoose.models.CreatorApplication) {
    delete mongoose.models.CreatorApplication;
}

export const CreatorApplication =
    (mongoose.models.CreatorApplication as mongoose.Model<ICreatorApplication>) ||
    mongoose.model<ICreatorApplication>('CreatorApplication', CreatorApplicationSchema);
