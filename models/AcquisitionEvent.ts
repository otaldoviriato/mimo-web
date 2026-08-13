import mongoose, { Schema, type Document } from 'mongoose';

export const ACQUISITION_EVENT_TYPES = [
    'link_viewed',
    'link_shared',
    'signup_attributed',
    'first_recharge',
    'first_paid_message',
    'explore_profile_viewed',
    'professional_consumed',
    'gmv_recorded',
] as const;

export const ACQUISITION_ORIGINS = [
    'profile_share',
    'explore',
    'first_paid_message',
    'direct',
    'unknown',
] as const;

export type AcquisitionEventType = typeof ACQUISITION_EVENT_TYPES[number];
export type AcquisitionOrigin = typeof ACQUISITION_ORIGINS[number];

export interface IAcquisitionEvent extends Document {
    eventType: AcquisitionEventType;
    dedupeKey: string;
    actorId?: string;
    visitorId?: string;
    clientId?: string;
    professionalId?: string;
    relationshipKey?: string;
    origin?: AcquisitionOrigin;
    position?: 1 | 2;
    amountCents?: number;
    occurredAt: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const AcquisitionEventSchema = new Schema<IAcquisitionEvent>({
    eventType: { type: String, enum: ACQUISITION_EVENT_TYPES, required: true, index: true },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    actorId: { type: String, index: true },
    visitorId: { type: String, index: true },
    clientId: { type: String, index: true },
    professionalId: { type: String, index: true },
    relationshipKey: { type: String, index: true },
    origin: { type: String, enum: ACQUISITION_ORIGINS, index: true },
    position: { type: Number, enum: [1, 2] },
    amountCents: { type: Number, min: 0 },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

AcquisitionEventSchema.index({ eventType: 1, occurredAt: -1 });
AcquisitionEventSchema.index({ clientId: 1, eventType: 1, occurredAt: 1 });
AcquisitionEventSchema.index({ professionalId: 1, eventType: 1, occurredAt: -1 });

export const AcquisitionEvent = (mongoose.models.AcquisitionEvent as mongoose.Model<IAcquisitionEvent>)
    || mongoose.model<IAcquisitionEvent>('AcquisitionEvent', AcquisitionEventSchema);
