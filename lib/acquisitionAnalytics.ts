import { AcquisitionEvent, type AcquisitionEventType, type AcquisitionOrigin } from '@/models/AcquisitionEvent';

type RecordEventInput = {
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
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
};

export function relationshipKey(clientId: string, professionalId: string) {
    return `${clientId}:${professionalId}`;
}

export async function recordAcquisitionEvent(input: RecordEventInput) {
    const occurredAt = input.occurredAt ?? new Date();
    return AcquisitionEvent.findOneAndUpdate(
        { dedupeKey: input.dedupeKey },
        { $setOnInsert: { ...input, occurredAt } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
}
