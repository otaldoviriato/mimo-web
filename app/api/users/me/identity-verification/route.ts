import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export const dynamic = 'force-dynamic';

// Função matemática para validar dígitos do CPF
function isValidCPF(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, '');
    
    // Permitir CPFs de teste do sandbox
    if (['00000000000', '11111111111', '99999999999'].includes(clean)) {
        return true;
    }

    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(10, 11))) return false;

    return true;
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { cpf, birthDate } = body;

        if (!cpf || !birthDate) {
            return NextResponse.json({ error: 'CPF e data de nascimento são obrigatórios' }, { status: 400 });
        }

        const cpfClean = cpf.replace(/\D/g, '');

        // 1. Simular delay de rede de 1 segundo (conforme solicitado pelo usuário)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Validação aritmética do CPF
        if (!isValidCPF(cpfClean)) {
            return NextResponse.json({ error: 'CPF inválido. Por favor, confira os números digitados.' }, { status: 400 });
        }

        // 3. Simular erro de CPF irregular para o CPF de teste do sandbox 99999999999
        if (cpfClean === '99999999999') {
            return NextResponse.json({ error: 'CPF inexistente ou em situação irregular na Receita Federal (Simulado).' }, { status: 400 });
        }

        // Validar formato de data YYYY-MM-DD
        const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!birthDateRegex.test(birthDate)) {
            return NextResponse.json({ error: 'Data de nascimento em formato inválido' }, { status: 400 });
        }

        // 4. Calcular idade e validar maioridade (18+)
        const birthDateObj = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }

        if (age < 18) {
            return NextResponse.json({ error: 'Cadastro permitido apenas para maiores de 18 anos.' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        /* 
        === REQUISIÇÃO REAL DA VALIDRA COMENTADA PARA EFEITOS DE DESENVOLVIMENTO ===
        
        const validraApiKey = process.env.VALIDRA_API_KEY;
        const validraApiUrl = process.env.VALIDRA_API_URL || 'https://web-production-03687.up.railway.app';
        const apiName = user.name || user.username;
        const validraUrl = `${validraApiUrl}/api/v1/cpf/validate?cpf=${cpfClean}&nome=${encodeURIComponent(apiName)}`;
        
        const validraResponse = await fetch(validraUrl, {
            method: 'POST',
            headers: {
                'X-API-Key': validraApiKey || '',
                'Content-Type': 'application/json'
            }
        });
        // ... Lógica de cruzamento de dados real
        */

        // 5. Atualizar usuário no banco de dados e liberar a conta da criadora automaticamente
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: {
                    taxId: cpfClean,
                    birthDate: birthDateObj,
                    professionalStatus: 'approved',
                    notes: ''
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'Erro ao atualizar o perfil do usuário' }, { status: 404 });
        }

        // Enviar e-mail informativo para a administração
        try {
            await resend.emails.send({
                from: 'Mimo Cadastro <onboarding@resend.dev>',
                to: 'viriatoceo@gmail.com',
                subject: `Criadora Aprovada Automaticamente (Simulação) - @${updatedUser.username}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #6d28d9; margin-top: 0;">Cadastro Aprovado (Simulação)</h2>
                        <p style="color: #475569; font-size: 16px;">A profissional <strong>@${updatedUser.username}</strong> foi aprovada de forma automatizada via validação aritmética local.</p>
                        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                            <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${updatedUser.name || updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>Username:</strong> @${updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${updatedUser.email}</li>
                            <li style="margin-bottom: 8px;"><strong>CPF:</strong> ***.${updatedUser.taxId?.substring(3, 6)}.${updatedUser.taxId?.substring(6, 9)}-**</li>
                            <li style="margin-bottom: 0;"><strong>Aprovado em:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                        </ul>
                    </div>
                `
            });
            console.log(`✉️ Email notification sent to admin for auto-approved identity (mocked): ${updatedUser.email}`);
        } catch (emailErr) {
            console.error('Erro ao enviar e-mail de notificação para o admin:', emailErr);
        }

        return NextResponse.json({
            success: true,
            professionalStatus: 'approved'
        });
    } catch (error: any) {
        console.error('Erro na validação de CPF:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao processar validação' }, { status: 500 });
    }
}
