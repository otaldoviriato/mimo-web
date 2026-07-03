import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditUsage extends Document {
    creditGrantId: mongoose.Types.ObjectId;
    userId: string; // clerkId do cliente que gastou
    monetizedProfileId: string; // clerkId do profissional receptor
    conversationId: string; // roomId da sala de conversa
    messageId: string; // ID da mensagem associada ou transação
    amountUsed: number; // valor em centavos
    usedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CreditUsageSchema = new Schema<ICreditUsage>({
    creditGrantId: {
        type: Schema.Types.ObjectId,
        ref: 'CreditGrant',
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    monetizedProfileId: {
        type: String,
        required: true,
        index: true,
    },
    conversationId: {
        type: String,
        required: true,
        index: true,
    },
    messageId: {
        type: String,
        required: true,
        index: true,
    },
    amountUsed: {
        type: Number,
        required: true,
        min: 1,
    },
    usedAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});

export const CreditUsage = (mongoose.models.CreditUsage as mongoose.Model<ICreditUsage>) ||
    mongoose.model<ICreditUsage>('CreditUsage', CreditUsageSchema);
