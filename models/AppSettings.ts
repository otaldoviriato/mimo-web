import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
    key: string;
    platformFeePercentage: number;
    uploadLimitMB: number;
    autoModeration: boolean;
    professionalsOnlyCreateRooms: boolean;
    adminClerkIds: string[];
    comparisonPeriod: 'none' | 'week' | 'month';
    createdAt: Date;
    updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'global',
        index: true,
    },
    platformFeePercentage: {
        type: Number,
        required: true,
        default: 10,
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
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.AppSettings) {
    delete mongoose.models.AppSettings;
}

export const AppSettings = (mongoose.models.AppSettings as mongoose.Model<IAppSettings>) ||
    mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
export type AppSettingsModelType = mongoose.Model<IAppSettings>;
