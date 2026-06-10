import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function getAdminAccess() {
    const { userId } = await auth();

    if (!userId) {
        return { userId: null, isAdmin: false };
    }

    await connectToDatabase();
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    const isAdmin = userId === FALLBACK_ADMIN || Boolean(settings?.adminClerkIds?.includes(userId));

    return { userId, isAdmin };
}
