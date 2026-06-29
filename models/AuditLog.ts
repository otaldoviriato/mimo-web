import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    adminClerkId: string;
    adminName: string;
    adminEmail?: string;
    roomId: string;
    participants: string[];
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    adminClerkId: {
        type: String,
        required: true,
    },
    adminName: {
        type: String,
        required: true,
    },
    adminEmail: {
        type: String,
    },
    roomId: {
        type: String,
        required: true,
    },
    participants: {
        type: [String],
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

AuditLogSchema.index({ adminClerkId: 1 });
AuditLogSchema.index({ roomId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
    mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
