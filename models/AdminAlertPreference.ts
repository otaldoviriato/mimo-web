import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAlertPreference extends Document {
    clerkId: string;
    email?: string;
    newProfessionalAlert: boolean;
    newClientBroughtAlert: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AdminAlertPreferenceSchema = new Schema<IAdminAlertPreference>({
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        default: '',
    },
    newProfessionalAlert: {
        type: Boolean,
        default: true,
    },
    newClientBroughtAlert: {
        type: Boolean,
        default: true,
    },
    pushEnabled: {
        type: Boolean,
        default: true,
    },
    emailEnabled: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.AdminAlertPreference) {
    delete mongoose.models.AdminAlertPreference;
}

export const AdminAlertPreference = (mongoose.models.AdminAlertPreference as mongoose.Model<IAdminAlertPreference>) ||
    mongoose.model<IAdminAlertPreference>('AdminAlertPreference', AdminAlertPreferenceSchema);
