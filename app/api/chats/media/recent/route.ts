import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Message } from '@/models/Message';
import { User } from '@/models/User';
import { requireCompletedOnboarding } from '@/lib/apiOnboardingGuard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const onboardingGuard = await requireCompletedOnboarding(userId);
        if (onboardingGuard) return onboardingGuard;

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId }).select('isProfessional').lean();
        if (!user || !user.isProfessional) {
            return NextResponse.json({ error: 'Only professionals can access recent media' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const limitParam = parseInt(searchParams.get('limit') || '20', 10);
        const limit = Math.min(Math.max(limitParam, 1), 50);

        const filter: any = {
            senderId: userId,
            deletedFor: { $nin: [userId] },
        };

        if (type === 'video') {
            filter.isVideo = true;
            filter.videoUrl = { $ne: null, $nin: ['', null] };
        } else if (type === 'image') {
            filter.isVideo = { $ne: true };
            filter.originalImageUrl = { $ne: null, $nin: ['', null] };
        } else {
            filter.$or = [
                { originalImageUrl: { $ne: null, $nin: ['', null] }, isVideo: { $ne: true } },
                { isVideo: true, videoUrl: { $ne: null, $nin: ['', null] } },
            ];
        }

        const rawMessages = await Message.find(filter)
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        const seenUrls = new Set<string>();
        const mediaItems: Array<{
            _id: string;
            url: string;
            originalImageUrl?: string;
            blurredImageUrl?: string;
            videoUrl?: string;
            thumbnailUrl?: string;
            isVideo: boolean;
            lockedImagePrice: number;
            isTemporary?: boolean;
            expiryMinutes?: number;
            timestamp: Date;
        }> = [];

        for (const msg of rawMessages) {
            const mediaKey = msg.isVideo ? (msg.videoUrl || '') : (msg.originalImageUrl || '');
            if (!mediaKey || seenUrls.has(mediaKey)) {
                continue;
            }

            seenUrls.add(mediaKey);
            mediaItems.push({
                _id: msg._id.toString(),
                url: mediaKey,
                originalImageUrl: msg.originalImageUrl || undefined,
                blurredImageUrl: msg.blurredImageUrl || undefined,
                videoUrl: msg.videoUrl || undefined,
                thumbnailUrl: msg.thumbnailUrl || (!msg.isVideo ? msg.originalImageUrl : undefined),
                isVideo: !!msg.isVideo,
                lockedImagePrice: typeof msg.lockedImagePrice === 'number' ? msg.lockedImagePrice : 0,
                isTemporary: !!msg.isTemporary,
                expiryMinutes: typeof msg.expiryMinutes === 'number' ? msg.expiryMinutes : undefined,
                timestamp: msg.timestamp,
            });

            if (mediaItems.length >= limit) {
                break;
            }
        }

        return NextResponse.json({ success: true, media: mediaItems });
    } catch (error: any) {
        console.error('Error fetching recent media:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
