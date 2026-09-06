import mongoose, { Schema, Document } from 'mongoose';

export interface IGalleryItem extends Document {
    ownerId: string; // Clerk ID of the professional
    imageUrl: string;
    visibility: 'public' | 'subscribers';
    galleryType: 'public' | 'private';
    mediaType: 'photo' | 'video';
    order?: number;
    createdAt: Date;
    updatedAt: Date;
}

const GalleryItemSchema = new Schema<IGalleryItem>({
    ownerId: {
        type: String,
        required: true,
        index: true,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    visibility: {
        type: String,
        enum: ['public', 'subscribers'],
        default: 'public',
    },
    galleryType: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
    },
    mediaType: {
        type: String,
        enum: ['photo', 'video'],
        default: 'photo',
    },
    order: {
        type: Number,
        default: 0,
        index: true,
    },
}, {
    timestamps: true,
});

export const GalleryItem = (mongoose.models.GalleryItem as mongoose.Model<IGalleryItem>) ||
    mongoose.model<IGalleryItem>('GalleryItem', GalleryItemSchema);
