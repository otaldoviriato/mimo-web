import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawRequest extends Document {
    userId: string; // clerkId do usuário
    amount: number;
    fee?: number;
    netAmount?: number;
    pixKey: string;
    status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
    asaasTransferId?: string;
    hiddenFromUser?: boolean;
    hiddenFromUserAt?: Date;
    hiddenFromUserBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WithdrawRequestSchema = new Schema<IWithdrawRequest>({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    fee: {
        type: Number,
        default: 0,
    },
    netAmount: {
        type: Number,
        required: false,
    },
    pixKey: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pendente', 'processando', 'concluido', 'rejeitado'],
        default: 'pendente',
    },
    asaasTransferId: {
        type: String,
        required: false,
        index: true,
    },
    hiddenFromUser: {
        type: Boolean,
        default: false,
        index: true,
    },
    hiddenFromUserAt: {
        type: Date,
        required: false,
    },
    hiddenFromUserBy: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.WithdrawRequest) {
    delete mongoose.models.WithdrawRequest;
}

export const WithdrawRequest = (mongoose.models.WithdrawRequest as mongoose.Model<IWithdrawRequest>) || 
    mongoose.model<IWithdrawRequest>('WithdrawRequest', WithdrawRequestSchema);
