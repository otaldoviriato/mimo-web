import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';

function isAuthorized(request: NextRequest) {
    const expectedToken = process.env.ASAAS_WITHDRAW_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_AUTH_TOKEN;

    if (!expectedToken) {
        console.warn('[ASAAS_VALIDATE_WITHDRAW] Nenhum token de validação de saque configurado nas variáveis de ambiente.');
        return true;
    }

    const receivedToken =
        request.headers.get('asaas-access-token') ||
        request.headers.get('access_token') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    return receivedToken === expectedToken;
}

export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            console.warn('[ASAAS_VALIDATE_WITHDRAW] Token de autenticação inválido ou ausente');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('[ASAAS_VALIDATE_WITHDRAW] Payload recebido:', JSON.stringify(body));

        // O Asaas pode enviar o objeto de transferência na raiz ou envelopado em "transfer"
        const transferObj = body.transfer || body;
        const transferId = transferObj.id;
        const valueInReais = transferObj.value;

        if (!transferId || valueInReais === undefined) {
            console.error('[ASAAS_VALIDATE_WITHDRAW] Payload inválido. Faltando ID ou Value:', body);
            return NextResponse.json({
                status: 'REFUSED',
                refuseReason: 'Payload de transferência inválido'
            });
        }

        await connectToDatabase();

        // Buscar a solicitação de saque pelo ID da transferência do Asaas e com status 'processando'
        const withdraw = await WithdrawRequest.findOne({
            asaasTransferId: transferId,
            status: 'processando'
        });

        if (!withdraw) {
            console.warn(`[ASAAS_VALIDATE_WITHDRAW] Solicitação não encontrada para transferId ${transferId} e status 'processando'`);
            return NextResponse.json({
                status: 'REFUSED',
                refuseReason: 'Solicitação de saque não encontrada ou já processada no Mimo'
            });
        }

        // Validar se o valor confere (no banco está em centavos, no Asaas em Reais)
        const dbValueInReais = withdraw.amount / 100;
        // Permite uma margem pequena de erro de arredondamento por segurança
        if (Math.abs(dbValueInReais - valueInReais) > 0.01) {
            console.error(`[ASAAS_VALIDATE_WITHDRAW] Valores divergentes. Banco: R$ ${dbValueInReais}, Asaas: R$ ${valueInReais}`);
            return NextResponse.json({
                status: 'REFUSED',
                refuseReason: 'Valor da transferência divergente do solicitado no Mimo'
            });
        }

        console.log(`[ASAAS_VALIDATE_WITHDRAW] Saque aprovado! ID: ${withdraw._id}, Valor: R$ ${dbValueInReais}`);
        return NextResponse.json({
            status: 'APPROVED'
        });

    } catch (error: any) {
        console.error('[ASAAS_VALIDATE_WITHDRAW] Erro inesperado ao processar webhook:', error);
        return NextResponse.json({
            status: 'REFUSED',
            refuseReason: 'Erro interno ao validar saque no servidor'
        });
    }
}
