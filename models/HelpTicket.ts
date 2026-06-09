import mongoose, { Schema, Document } from 'mongoose';

export interface IHelpTicket extends Document {
    senderEmail: string;
    senderName?: string;
    subject: string;
    message: string;
    status: 'novo' | 'em_atendimento' | 'lido' | 'resolvido' | 'arquivado';
    isFavorite: boolean;
    isRead: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const HelpTicketSchema = new Schema<IHelpTicket>({
    senderEmail: { 
        type: String, 
        required: true, 
        index: true 
    },
    senderName: { 
        type: String 
    },
    subject: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['novo', 'em_atendimento', 'lido', 'resolvido', 'arquivado'], 
        default: 'novo', 
        index: true 
    },
    isFavorite: { 
        type: Boolean, 
        default: false, 
        index: true 
    },
    isRead: { 
        type: Boolean, 
        default: false, 
        index: true 
    },
    notes: { 
        type: String, 
        default: '' 
    },
}, {
    timestamps: true,
});

// No Next.js em desenvolvimento, recarrega o modelo caso o arquivo mude
if (process.env.NODE_ENV === 'development' && mongoose.models.HelpTicket) {
    delete mongoose.models.HelpTicket;
}

export const HelpTicket = (mongoose.models.HelpTicket as mongoose.Model<IHelpTicket>) ||
    mongoose.model<IHelpTicket>('HelpTicket', HelpTicketSchema);
