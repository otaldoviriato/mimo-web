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
    return NextResponse.json(
        { error: 'A migração self-service para conta profissional foi desativada.' },
        { status: 403 }
    );
}

export async function POST() {
    return NextResponse.json(
        { error: 'A migração self-service para conta profissional foi desativada.' },
        { status: 403 }
    );
}
