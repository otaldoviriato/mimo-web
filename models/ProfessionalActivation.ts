import mongoose, { Schema, Document } from 'mongoose';

export interface IActivationHistoryItem {
    authorId: string;
    authorName: string;
    action: string;
    note?: string;
    timestamp: Date;
}

export interface IProfessionalActivation extends Document {
    professionalId: string; // clerkId do profissional
    assignedTeamMemberId?: string | null; // clerkId do membro responsável
    assignedTeamMemberName?: string | null; // nome/username do membro responsável
    status: 'pending' | 'contacted' | 'activated' | 'not_interested';
    stage: string;
    notes?: string;
    nextSteps?: string;
    shareClickCount?: number;
    firstShareClickedAt?: Date | null;
    lastShareClickedAt?: Date | null;
    contactedAt?: Date | null;
    activatedAt?: Date | null;
    history: IActivationHistoryItem[];
    createdAt: Date;
    updatedAt: Date;
}

const ActivationHistorySchema = new Schema<IActivationHistoryItem>({
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    action: { type: String, required: true },
    note: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const ProfessionalActivationSchema = new Schema<IProfessionalActivation>({
    professionalId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    assignedTeamMemberId: {
        type: String,
        default: null,
        index: true,
    },
    assignedTeamMemberName: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'activated', 'not_interested'],
        default: 'pending',
        index: true,
    },
    stage: {
        type: String,
        default: 'Aguardando 1º contato',
    },
    notes: {
        type: String,
        default: '',
    },
    nextSteps: {
        type: String,
        default: '',
    },
    shareClickCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    firstShareClickedAt: {
        type: Date,
        default: null,
    },
    lastShareClickedAt: {
        type: Date,
        default: null,
    },
    contactedAt: {
        type: Date,
        default: null,
    },
    activatedAt: {
        type: Date,
        default: null,
    },
    history: {
        type: [ActivationHistorySchema],
        default: [],
    },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.ProfessionalActivation) {
    delete mongoose.models.ProfessionalActivation;
}

export const ProfessionalActivation = (mongoose.models.ProfessionalActivation as mongoose.Model<IProfessionalActivation>) ||
    mongoose.model<IProfessionalActivation>('ProfessionalActivation', ProfessionalActivationSchema);
