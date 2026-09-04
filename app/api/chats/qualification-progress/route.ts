import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { QualificationAttempt } from '@/models/QualificationAttempt';
import { QualifiedConversation } from '@/models/QualifiedConversation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const otherUserId = searchParams.get('otherUserId');

        if (!otherUserId) {
            return NextResponse.json({ error: 'otherUserId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const [user, otherUser] = await Promise.all([
            User.findOne({ clerkId: userId }).lean(),
            User.findOne({ clerkId: otherUserId }).lean(),
        ]);

        if (!user || !otherUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const client = user.isProfessional ? otherUser : user;
        const professional = user.isProfessional ? user : otherUser;

        if (!professional.isProfessional || client.isProfessional) {
            return NextResponse.json({
                status: 'none',
                progressPercent: 0,
                equivalentChars: 0,
                professionalResponded: false,
                unlockedBonuses: [],
            });
        }

        const clientId = client.clerkId;
        const professionalId = professional.clerkId;

        // 1. Verifica se existe uma QualifiedConversation aberta
        const openConversation = await QualifiedConversation.findOne({
            clientId,
            professionalId,
            status: { $in: ['open', 'settlement_pending'] },
        }).lean();

        if (openConversation) {
            return NextResponse.json({
                conversationId: openConversation._id.toString(),
                attemptId: openConversation.attemptId?.toString(),
                status: openConversation.status === 'open' ? 'conversation_open' : 'settlement_pending',
                progressPercent: 100,
                equivalentChars: openConversation.clientEquivalentChars,
                targetChars: 500,
                closesAt: openConversation.closesAt,
                professionalResponded: true,
                unlockedBonuses: openConversation.unlockedBonuses || [],
            });
        }

        // 2. Verifica se existe uma QualificationAttempt ativa em andamento
        const activeAttempt = await QualificationAttempt.findOne({
            clientId,
            professionalId,
            status: 'active',
        }).lean();

        if (activeAttempt) {
            const equivalentChars = activeAttempt.clientEquivalentChars || 0;
            const progressPercent = Math.min(100, Math.round((equivalentChars / 500) * 100));

            return NextResponse.json({
                attemptId: activeAttempt._id.toString(),
                status: 'attempt_active',
                progressPercent,
                equivalentChars,
                targetChars: 500,
                deadlineAt: activeAttempt.deadlineAt,
                professionalResponded: Boolean(activeAttempt.professionalRespondedAt),
                unlockedBonuses: [],
            });
        }

        // 3. Nenhuma tentativa ou conversa aberta
        return NextResponse.json({
            status: 'none',
            progressPercent: 0,
            equivalentChars: 0,
            targetChars: 500,
            professionalResponded: false,
            unlockedBonuses: [],
        });
    } catch (error: any) {
        console.error('Erro ao buscar progresso de qualificação:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
