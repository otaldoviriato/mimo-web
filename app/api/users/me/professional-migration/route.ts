import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import mongoose, { type ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { buildProfileRoleMetadata } from '@/lib/profileRole';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Subscription } from '@/models/Subscription';

type MigrationEligibility = {
    eligible: boolean;
    reason?: 'already_professional' | 'positive_balance' | 'financial_history';
    message?: string;
    conversationCount: number;
};

async function getEligibility(userId: string, session?: ClientSession): Promise<MigrationEligibility> {
    const userQuery = User.findOne({ clerkId: userId }).select('isProfessional balance');
    if (session) userQuery.session(session);
    const user = await userQuery.lean() as { isProfessional?: boolean; balance?: number } | null;

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    const roomQuery = Room.countDocuments({ participants: userId, deletedBy: { $nin: [userId] } });
    if (session) roomQuery.session(session);
    const conversationCount = await roomQuery;

    if (user.isProfessional) {
        return {
            eligible: false,
            reason: 'already_professional',
            message: 'Esta conta já é um perfil para ganhar conversando.',
            conversationCount,
        };
    }

    if ((user.balance || 0) > 0) {
        return {
            eligible: false,
            reason: 'positive_balance',
            message: 'Use ou solicite a devolução do saldo antes de pedir a migração.',
            conversationCount,
        };
    }

    const rechargeQuery = Transaction.exists({
        userId,
        source: 'recharge',
        status: { $ne: 'CANCELLED' },
    });
    const spendingQuery = MicroTransaction.exists({ userId, type: 'debit' });
    const subscriptionQuery = Subscription.exists({ subscriberId: userId });
    if (session) {
        rechargeQuery.session(session);
        spendingQuery.session(session);
        subscriptionQuery.session(session);
    }

    const [hasRecharge, hasSpending, hasSubscription] = await Promise.all([
        rechargeQuery,
        spendingQuery,
        subscriptionQuery,
    ]);

    if (hasRecharge || hasSpending || hasSubscription) {
        return {
            eligible: false,
            reason: 'financial_history',
            message: 'Esta conta já possui atividade financeira como cliente e não pode ser migrada.',
            conversationCount,
        };
    }

    return { eligible: true, conversationCount };
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        await connectToDatabase();
        return NextResponse.json(await getEligibility(userId));
    } catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }
        console.error('[professional-migration] Erro ao verificar elegibilidade:', error);
        return NextResponse.json({ error: 'Não foi possível verificar sua conta.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body.confirmConversationRemoval !== true) {
        return NextResponse.json(
            { error: 'Confirme a remoção das conversas para continuar.' },
            { status: 400 },
        );
    }

    await connectToDatabase();
    const session = await mongoose.startSession();

    try {
        let result: MigrationEligibility | undefined;

        await session.withTransaction(async () => {
            const eligibility = await getEligibility(userId, session);
            result = eligibility;
            if (!eligibility.eligible) return;

            const rooms = await Room.find({ participants: userId }).select('_id').session(session).lean();
            const roomIds = rooms.map((room) => String(room._id));

            const [, , userUpdate] = await Promise.all([
                Room.updateMany(
                    { participants: userId },
                    { $addToSet: { deletedBy: userId } },
                    { session },
                ),
                roomIds.length > 0
                    ? Message.updateMany(
                        { roomId: { $in: roomIds } },
                        { $addToSet: { deletedFor: userId } },
                        { session },
                    )
                    : Promise.resolve(),
                User.updateOne(
                    { clerkId: userId, isProfessional: false, balance: 0 },
                    {
                        $set: {
                            isProfessional: true,
                            professionalStatus: null,
                            onboardingStep: 'identity',
                        },
                    },
                    { session },
                ),
            ]);

            if (userUpdate.modifiedCount !== 1) {
                throw new Error('MIGRATION_CONFLICT');
            }
        });

        if (!result?.eligible) {
            return NextResponse.json(result, { status: 409 });
        }

        try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                unsafeMetadata: buildProfileRoleMetadata('professional', 'client_migration'),
            });
        } catch (error) {
            console.error('[professional-migration] Perfil migrado, mas a metadata do Clerk não foi sincronizada:', error);
        }

        return NextResponse.json({
            success: true,
            next: '/onboarding',
            removedConversationCount: result.conversationCount,
        });
    } catch (error) {
        console.error('[professional-migration] Erro ao migrar conta:', error);
        return NextResponse.json({ error: 'Não foi possível migrar sua conta.' }, { status: 500 });
    } finally {
        await session.endSession();
    }
}
