import mongoose, { Schema, Document } from 'mongoose';

export interface IProfessionalEmail extends Document {
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProfessionalEmailSchema = new Schema<IProfessionalEmail>({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true,
    }
}, {
    timestamps: true,
});

// No Next.js dev mode, o modelo pode ficar em cache com schema antigo.
if (process.env.NODE_ENV === 'development' && mongoose.models.ProfessionalEmail) {
    delete mongoose.models.ProfessionalEmail;
}

export const ProfessionalEmail = (mongoose.models.ProfessionalEmail as mongoose.Model<IProfessionalEmail>) ||
    mongoose.model<IProfessionalEmail>('ProfessionalEmail', ProfessionalEmailSchema);
