import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { normalizeUsername } from '@/lib/marketing/validation';
import { MarketingSeedProfile } from '@/models/Marketing';

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const seeds = await MarketingSeedProfile.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, seeds });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 30 });
        if (access.error) return access.error;
        const body = await request.json();
        const username = normalizeUsername(body.username);
        if (!username) return NextResponse.json({ error: 'Informe o username.' }, { status: 400 });
        const platform = cleanString(body.platform, 30).toLowerCase() || 'instagram';
        const seed = await MarketingSeedProfile.create({
            platform,
            username,
            profileUrl: cleanString(body.profileUrl, 500) || `https://www.instagram.com/${username}/`,
            notes: cleanString(body.notes, 5000),
            status: 'active',
        });
        return NextResponse.json({ success: true, seed }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json({ error: 'Este perfil-semente já foi cadastrado.' }, { status: 409 });
        }
        console.error('Erro ao criar perfil-semente:', error);
        return NextResponse.json({ error: 'Erro ao criar perfil-semente.' }, { status: 500 });
    }
}
