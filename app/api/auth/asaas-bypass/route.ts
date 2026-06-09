import { NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        // Validar e-mail e código de homologação
        if (email?.trim().toLowerCase() !== 'homologacao-asaas@mimochat.com.br' || code !== '111111') {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.error('[Asaas Bypass Error]: CLERK_SECRET_KEY não configurada.');
            return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
        }

        // Criar cliente do Clerk
        const clerk = createClerkClient({ secretKey });

        console.log('[Asaas Bypass]: Gerando Sign-in Token para user_3EsgEPUA8sBHCnpDhFEhhHynacW...');

        // Criar o token de sign-in de uso único válido por 5 minutos
        const tokenResponse = await clerk.signInTokens.createSignInToken({
            userId: 'user_3EsgEPUA8sBHCnpDhFEhhHynacW',
            expiresInSeconds: 60 * 5
        });

        console.log('[Asaas Bypass]: Sign-in Token gerado com sucesso.');

        return NextResponse.json({ 
            url: tokenResponse.url, 
            token: tokenResponse.token 
        });

    } catch (error: any) {
        console.error('[Asaas Bypass Error]:', error);
        return NextResponse.json({ 
            error: error.message || 'Erro interno ao autenticar conta de homologação.' 
        }, { status: 500 });
    }
}
