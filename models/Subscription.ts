import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
    subscriberId: string;    // ClerkID do cliente
    professionalId: string;   // ClerkID da profissional
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
    priceInCents: number;     // Preço da assinatura na época do pagamento/renovação
    expiresAt: Date;          // Data em que o ciclo expira
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
    subscriberId: { 
        type: String, 
        required: true, 
        index: true 
    },
    professionalId: { 
        type: String, 
        required: true, 
        index: true 
    },
    status: { 
        type: String, 
        enum: ['ACTIVE', 'EXPIRED', 'CANCELED'], 
        default: 'ACTIVE',
        index: true 
    },
    priceInCents: { 
        type: Number, 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true, 
        index: true 
    },
}, {
    timestamps: true,
});

// Índice composto para garantir que cada cliente tem no máximo uma assinatura para cada profissional
SubscriptionSchema.index({ subscriberId: 1, professionalId: 1 }, { unique: true });

export const Subscription = (mongoose.models.Subscription as mongoose.Model<ISubscription>) ||
    mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
