import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';

// POST /api/users/me/balance/pix — Cria novo PIX de recarga
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Valor mínimo de R$ 1,00' }, { status: 400 });
    }

    await connectToDatabase();

    const externalId = `recharge_${userId}_${Date.now()}`;

    try {
      const AbacatePay = (await import('abacatepay-nodejs-sdk')).default;
      const apiKey = process.env.ABACATEPAY_API_KEY || '';
      const abacatepay = AbacatePay(apiKey);

      console.log('Criando PIX QR Code AbacatePay para userId:', userId, 'valor:', amount);

      const pixResponse = await abacatepay.pixQrCode.create({
        amount: Math.round(amount * 100),
        description: `Recarga de Saldo - MimoChat`,
        expiresIn: 3600,
      }) as any;

      if (!pixResponse.data) {
        console.error('AbacatePay pixQrCode Error:', JSON.stringify(pixResponse, null, 2));
        throw new Error(`Falha ao criar PIX no AbacatePay: ${pixResponse.error || 'Verifique os logs'}`);
      }

      const pixData = pixResponse.data;

      await Transaction.create({
        userId: userId,
        abacatePayId: pixData.id,
        amount: amount,
        status: 'PENDING',
        type: 'PIX',
        source: 'recharge',
        metadata: {
          externalId,
          brCode: pixData.brCode || '',
        }
      });

      return NextResponse.json({
        success: true,
        id: pixData.id,
        transactionId: pixData.id,
        brCode: pixData.brCode || '',
        status: pixData.status,
      });

    } catch (abacateError: any) {
      console.error('AbacatePay SDK Error:', {
        message: abacateError.message,
        data: abacateError.response?.data,
        status: abacateError.response?.status
      });

      const apiError = abacateError.response?.data?.error || abacateError.message;

      return NextResponse.json({
        error: 'Erro na API do AbacatePay',
        details: apiError,
        raw: abacateError.response?.data || abacateError
      }, { status: abacateError.response?.status || 500 });
    }

  } catch (error: any) {
    console.error('Error generating PIX:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/users/me/balance/pix — Lista histórico de depósitos/recargas
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const transactions = await Transaction.find({
      userId,
      source: { $in: ['recharge', 'gift'] },
      status: 'PAID',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t._id?.toString(),
        amount: t.amount,
        status: t.status,
        source: t.source,
        type: t.type,
        metadata: t.metadata ?? {},
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
