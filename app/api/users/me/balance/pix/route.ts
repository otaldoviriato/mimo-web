import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import AbacatePay from 'abacatepay-nodejs-sdk';

const apiKey = process.env.ABACATEPAY_API_KEY || '';
const abacatepay = AbacatePay(apiKey);

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

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const externalId = `recharge_${userId}_${Date.now()}`;
    
    try {
      // O AbacatePay v1 exige cellphone e taxId no customer.
      // Se não tivermos no banco, tentamos fallbacks ou valores de teste em dev.
      const isDev = apiKey.startsWith('abc_dev_');
      
      const customerData: any = {
        name: user.name || user.username || 'Usuário Mimo',
        email: user.email,
        cellphone: user.phone || (isDev ? '11999999999' : undefined),
        taxId: user.taxId || (isDev ? '52998224725' : undefined),
      };

      console.log('Criando cobrança AbacatePay para:', customerData.email, 'valor:', amount);
      
      if (!customerData.cellphone || !customerData.taxId) {
        return NextResponse.json({ 
          error: 'Dados incompletos', 
          details: 'CPF e Telefone são obrigatórios para pagamentos via PIX.' 
        }, { status: 400 });
      }

      // Usar pixQrCode para obter o brCode (PIX copia e cola) e QR Code imediatamente
      const pixResponse = await abacatepay.pixQrCode.create({
        amount: Math.round(amount * 100), // cents
        expiresIn: 3600, // 1 hora
        description: "Recarga de Saldo - MimoChat",
        customer: customerData,
      });

      if (!pixResponse || !pixResponse.data) {
        console.error('AbacatePay Error Response:', pixResponse);
        throw new Error(`Falha ao criar PIX no AbacatePay: ${JSON.stringify(pixResponse)}`);
      }

      const pixData = pixResponse.data;

      // Criar transação pendente no nosso banco
      await Transaction.create({
        userId: userId,
        abacatePayId: pixData.id,
        amount: amount,
        status: 'PENDING',
        type: 'PIX',
        source: 'recharge',
        metadata: {
          externalId,
          brCode: pixData.brCode
        }
      });

      return NextResponse.json({
        success: true,
        id: pixData.id,
        transactionId: pixData.id, // Alias para compatibilidade com RechargeModal/PixCheckoutView
        url: '', // pixQrCode não possui URL de checkout como o billing
        brCode: pixData.brCode,
        status: pixData.status,
      });

    } catch (abacateError: any) {
      console.error('AbacatePay SDK Error Details:', {
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
