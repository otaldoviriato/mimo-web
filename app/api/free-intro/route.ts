import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';

export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    const me = await User.findOne({ clerkId: userId }).select('isProfessional isTeam isSuspended freeIntroEnabled freeIntroPausedAt').lean();
    if (!me || me.isSuspended) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const settings = await AppSettings.findOne({ key: 'global' }).select('freeIntroReplyLimit freeIntroTimeoutMinutes').lean();
    const limit = settings?.freeIntroReplyLimit ?? 3;
    const base = { limit, timeoutMinutes: settings?.freeIntroTimeoutMinutes ?? 10, enabled: me.freeIntroEnabled === true, pausedAt: me.freeIntroPausedAt };
    const otherId = request.nextUrl.searchParams.get('otherId');
    if (!otherId || otherId === userId) return NextResponse.json(base);
    const participants = [userId, otherId].sort();
    const room = await Room.findOne({ participants }).select('freeIntro lastMessageTime lastMessage').lean();
    const intro = room?.freeIntro;
    if (intro) return NextResponse.json({ ...base, eligible: false, hasConversation: true, grant: intro, remaining: Math.max(0, intro.limit - intro.used), textOnly: !intro.convertedAt && intro.used < intro.limit });
    const other = await User.findOne({ clerkId: otherId }).select('isProfessional professionalStatus freeIntroEnabled isTeam isSuspended').lean();
    const hasConversation = !!room?.lastMessageTime || !!room?.lastMessage || !!await Message.exists({ roomId: participants.join('_') });
    const eligible = !hasConversation && !me.isProfessional && !me.isTeam && !!other?.isProfessional && other.professionalStatus === 'approved' && !other.isSuspended && !other.isTeam && other.freeIntroEnabled === true;
    return NextResponse.json({ ...base, eligible, hasConversation, remaining: eligible ? limit : 0, textOnly: eligible });
}

export async function PATCH(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    if (typeof body?.enabled !== 'boolean') {
        return NextResponse.json({ error: 'Opção inválida.' }, { status: 400 });
    }

    const enabled = body.enabled;
    const now = new Date();

    const user = await User.findOneAndUpdate(
        {
            clerkId: userId,
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true },
            isTeam: { $ne: true },
        },
        {
            $set: {
                freeIntroEnabled: enabled,
                ...(enabled ? { freeIntroEnabledAt: now } : {}),
            },
            $inc: { freeIntroRevision: 1 },
        },
        { returnDocument: 'after' }
    );

    if (!user) {
        return NextResponse.json({ error: 'Apenas profissionais aprovadas podem ativar Conheça grátis.' }, { status: 403 });
    }

    return NextResponse.json({
        success: true,
        enabled: user.freeIntroEnabled === true,
        pausedAt: user.freeIntroPausedAt,
    });
}
