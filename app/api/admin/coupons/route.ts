import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { GiftCode } from '@/models/GiftCode';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function isUserAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings?.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/coupons - Listar todos os cupons
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const coupons = await GiftCode.find({}).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ coupons });
    } catch (error) {
        console.error('Erro ao listar cupons no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// POST /api/admin/coupons - Criar novo cupom
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { code, amount, description, isActive, targetAudience, maxUses, expiresAt } = body;

        // Validações básicas
        const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
        if (!cleanCode) {
            return NextResponse.json({ error: 'O código do cupom é obrigatório' }, { status: 400 });
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'O valor do cupom deve ser maior que zero' }, { status: 400 });
        }

        // Verifica duplicidade
        const existing = await GiftCode.findOne({ code: cleanCode });
        if (existing) {
            return NextResponse.json({ error: 'Já existe um cupom cadastrado com este código' }, { status: 409 });
        }

        const newCoupon = await GiftCode.create({
            code: cleanCode,
            amount: parsedAmount, // O amount deve vir em centavos do frontend, ou fazemos conversão. No frontend converteremos pra centavos, mas vamos manter a tipagem consistente.
            description: description || '',
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            targetAudience: targetAudience || 'all',
            maxUses: maxUses !== undefined && maxUses !== null && maxUses !== '' ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        return NextResponse.json({ success: true, coupon: newCoupon });
    } catch (error) {
        console.error('Erro ao criar cupom no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
