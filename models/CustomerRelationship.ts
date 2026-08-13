import mongoose, { Schema, type Document } from 'mongoose';
import { ACQUISITION_ORIGINS, type AcquisitionOrigin } from './AcquisitionEvent';

export interface ICustomerRelationship extends Document {
    relationshipKey: string;
    clientId: string;
    professionalId: string;
    origin: AcquisitionOrigin;
    acquisitionProfessionalId?: string;
    firstPaidAt: Date;
    lastPaidAt: Date;
    firstPaidSource: 'message' | 'image_unlock' | 'gift' | 'subscription';
    professionalPosition?: 1 | 2;
    gmvCents: number;
    paidEventsCount: number;
    d7RetainedAt?: Date;
    d30RetainedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerRelationshipSchema = new Schema<ICustomerRelationship>({
    relationshipKey: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    professionalId: { type: String, required: true, index: true },
    origin: { type: String, enum: ACQUISITION_ORIGINS, required: true, index: true },
    acquisitionProfessionalId: { type: String, index: true },
    firstPaidAt: { type: Date, required: true, index: true },
    lastPaidAt: { type: Date, required: true, index: true },
    firstPaidSource: { type: String, enum: ['message', 'image_unlock', 'gift', 'subscription'], required: true },
    professionalPosition: { type: Number, enum: [1, 2], index: true },
    gmvCents: { type: Number, required: true, default: 0, min: 0 },
    paidEventsCount: { type: Number, required: true, default: 0, min: 0 },
    d7RetainedAt: { type: Date, index: true },
    d30RetainedAt: { type: Date, index: true },
}, { timestamps: true });

CustomerRelationshipSchema.index({ clientId: 1, firstPaidAt: 1 });
CustomerRelationshipSchema.index({ origin: 1, firstPaidAt: -1 });

export const CustomerRelationship = (mongoose.models.CustomerRelationship as mongoose.Model<ICustomerRelationship>)
    || mongoose.model<ICustomerRelationship>('CustomerRelationship', CustomerRelationshipSchema);
