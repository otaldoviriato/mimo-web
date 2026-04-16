import mongoose, { Schema, Document } from 'mongoose';

export interface ICard {
    id: string;
    label: string;
    lastFour: string;
    brand: string;
    createdAt: Date;
}

export interface IUser extends Document {
    clerkId: string;
    username: string;
    name?: string;
    email: string;
    taxId?: string;
    phone?: string;
    photoUrl?: string;
    balance: number;
    chargeMode: boolean;
    chargePerChar: number;
    expoPushToken?: string;
    savedCards: ICard[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    taxId: {
        type: String,
    },
    phone: {
        type: String,
    },
    photoUrl: {
        type: String,
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    chargeMode: {
        type: Boolean,
        default: false,
    },
    chargePerChar: {
        type: Number,
        default: 0.002,
        min: 0,
    },
    expoPushToken: {
        type: String,
    },
    savedCards: {
        type: [{
            id: { type: String, required: true },
            label: { type: String, required: true },
            lastFour: { type: String, required: true },
            brand: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        }],
        default: [],
    },
}, {
    timestamps: true,
});

export const User = (mongoose.models.User as mongoose.Model<IUser>) ||
    mongoose.model<IUser>('User', UserSchema);
