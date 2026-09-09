import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { CampaignVisit } from '@/models/CampaignVisit';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId) ? userId : null;
}

export async function POST(req: Request) {
    await connectToDatabase();
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
    const { campaignId, landingPage, all } = body;

    const filter: Record<string, any> = {};

    if (!all) {
      if (campaignId && campaignId !== 'all') {
        filter.campaignId = campaignId;
      }
      if (landingPage && landingPage !== 'all') {
        filter.landingPage = landingPage;
      }
    }

    const result = await CampaignVisit.deleteMany(filter);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} registros de rastreamento removidos com sucesso.`
    });
  } catch (error: any) {
    console.error('Erro ao limpar dados de rastreamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao limpar dados de rastreamento' },
      { status: 500 }
    );
  }
}
