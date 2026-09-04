import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { rankExploreUsers } from '@/lib/exploreRanking';
import { AppSettings, GalleryItem, User } from '@/models';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    if (userId !== FALLBACK_ADMIN && !settings?.adminClerkIds?.includes(userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const professionals = await User.find({
        isProfessional: true,
        professionalStatus: 'approved',
        isSuspended: { $ne: true },
        hideFromExplore: { $ne: true },
    }).select('clerkId username name photoUrl coverUrl bio isOnline lastSeen lastAccessAt createdAt').lean();
    const ids = professionals.map(user => user.clerkId);
    const photos = await GalleryItem.find({ ownerId: { $in: ids }, galleryType: 'public', visibility: 'public', mediaType: 'photo' }).lean();
    const photoMap = new Map<string, string[]>();
    for (const photo of photos) photoMap.set(photo.ownerId, [...(photoMap.get(photo.ownerId) ?? []), photo.imageUrl]);
    return NextResponse.json({ users: rankExploreUsers(professionals.map(user => ({
        ...user,
        id: user._id,
        isOnline: user.isOnline === true,
        lastActiveTime: Math.max(
            user.lastSeen ? new Date(user.lastSeen).getTime() : 0,
            user.lastAccessAt ? new Date(user.lastAccessAt).getTime() : 0,
        ),
        publicPhotos: (photoMap.get(user.clerkId) ?? []).slice(0, 4),
    }))) });
}
