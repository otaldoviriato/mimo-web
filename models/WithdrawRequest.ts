import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawRequest extends Document {
    userId: string; // clerkId do usuário
    amount: number;
    pixKey: string;
    status: 'pendente' | 'concluido' | 'rejeitado';
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
    pixKey: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pendente', 'concluido', 'rejeitado'],
        default: 'pendente',
    },
}, {
    timestamps: true,
});

if (process.env.NODE_ENV === 'development' && mongoose.models.WithdrawRequest) {
    delete mongoose.models.WithdrawRequest;
}

export const WithdrawRequest = (mongoose.models.WithdrawRequest as mongoose.Model<IWithdrawRequest>) || 
    mongoose.model<IWithdrawRequest>('WithdrawRequest', WithdrawRequestSchema);
