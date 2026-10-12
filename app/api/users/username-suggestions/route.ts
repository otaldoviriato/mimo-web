import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { isReservedRoute } from '@/lib/routes';
import { suggestUsernames } from '@/lib/usernameSuggestions';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const name = request.nextUrl.searchParams.get('name')?.trim() || '';
    if (name.length < 2 || name.length > 80) return NextResponse.json({ suggestions: [] });
    try {
        await connectToDatabase();
        const suggestions = await suggestUsernames(name, async candidates => {
            const taken = await User.find({ username: { $in: candidates }, clerkId: { $ne: userId } }).select('username -_id').lean();
            return taken.map(user => user.username);
        }, username => isReservedRoute(`/${username}`));
        return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: 'Não foi possível buscar sugestões.' }, { status: 503 });
    }
}
