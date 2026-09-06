import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { ModerationReview } from '@/models/ModerationReview';
import { HelpTicket } from '@/models/HelpTicket';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
        const isAdmin = userId === FALLBACK_ADMIN || (settings?.adminClerkIds && settings.adminClerkIds.includes(userId));

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const [verifications, audits, tickets] = await Promise.all([
            User.countDocuments({ identityStatus: 'pending' }),
            ModerationReview.countDocuments({ status: 'pending_review' }),
            HelpTicket.countDocuments({
                recipientEmail: 'suporte@mimochat.com.br',
                status: { $in: ['novo', 'em_atendimento'] },
            }),
        ]);

        return NextResponse.json({
            verifications,
            audits,
            tickets,
        });
    } catch (error) {
        console.error('[API/admin/pending-actions] Erro ao buscar contagens de pendências:', error);
        return NextResponse.json({
            verifications: 0,
            audits: 0,
            tickets: 0,
        });
    }
}
