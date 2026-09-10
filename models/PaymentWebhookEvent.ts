import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentWebhookEvent extends Document {
    eventId: string;
    provider: 'abacatepay';
    event?: string;
    paymentId?: string;
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
    attempts: number;
    receivedAt: Date;
    processedAt?: Date;
    lastError?: string;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>({
    eventId: { type: String, required: true, unique: true },
    provider: { type: String, required: true, enum: ['abacatepay'] },
    event: String,
    paymentId: String,
    status: { type: String, required: true, enum: ['RECEIVED', 'PROCESSED', 'FAILED'] },
    attempts: { type: Number, required: true, default: 1 },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: Date,
    lastError: String,
}, { timestamps: true });

PaymentWebhookEventSchema.index({ provider: 1, status: 1, receivedAt: -1 });

export const PaymentWebhookEvent =
    (mongoose.models.PaymentWebhookEvent as mongoose.Model<IPaymentWebhookEvent>) ||
    mongoose.model<IPaymentWebhookEvent>('PaymentWebhookEvent', PaymentWebhookEventSchema);
