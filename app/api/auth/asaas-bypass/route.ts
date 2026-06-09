import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        // Validar e-mail e código de homologação
        if (email?.trim().toLowerCase() !== 'homologacao-asaas@mimochat.com.br' || code !== '111111') {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 });
        }

        // Resolver o cliente do Clerk de forma compatível com Clerk v4 (objeto) e Clerk v5+ (função assíncrona)
        // Isso evita erros críticos de tipo/resolução de módulo no Next.js
        const client: any = typeof clerkClient === 'function' 
            ? await (clerkClient as any)() 
            : clerkClient;

        if (!client) {
            console.error('[Asaas Bypass Error]: Não foi possível inicializar o cliente do Clerk.');
            return NextResponse.json({ error: 'Erro de conexão com o provedor de autenticação.' }, { status: 500 });
        }

        console.log('[Asaas Bypass]: Gerando Sign-in Token para user_3EsgEPUA8sBHCnpDhFEhhHynacW...');

        // Criar o token de sign-in de uso único válido por 5 minutos
        const tokenResponse = await client.signInTokens.createSignInToken({
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
