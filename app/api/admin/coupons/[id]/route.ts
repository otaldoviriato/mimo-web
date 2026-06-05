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

// PUT /api/admin/coupons/[id] - Editar um cupom
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { id: couponId } = await params;
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

        // Verifica se o cupom existe
        const coupon = await GiftCode.findById(couponId);
        if (!coupon) {
            return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
        }

        // Verifica duplicidade se o código mudou
        if (coupon.code !== cleanCode) {
            const existing = await GiftCode.findOne({ code: cleanCode });
            if (existing) {
                return NextResponse.json({ error: 'Já existe outro cupom cadastrado com este código' }, { status: 409 });
            }
        }

        // Atualiza campos
        coupon.code = cleanCode;
        coupon.amount = parsedAmount;
        coupon.description = description || '';
        coupon.isActive = isActive !== undefined ? Boolean(isActive) : coupon.isActive;
        coupon.targetAudience = targetAudience || coupon.targetAudience;
        coupon.maxUses = maxUses !== undefined ? (maxUses === null || maxUses === '' ? null : Number(maxUses)) : coupon.maxUses;
        coupon.expiresAt = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : coupon.expiresAt;

        await coupon.save();

        return NextResponse.json({ success: true, coupon });
    } catch (error) {
        console.error('Erro ao editar cupom no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/coupons/[id] - Excluir um cupom
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { id: couponId } = await params;
        const deleted = await GiftCode.findByIdAndDelete(couponId);
        if (!deleted) {
            return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir cupom no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
