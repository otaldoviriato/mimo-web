import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export const dynamic = 'force-dynamic';

type InfoSimplesCpfRecord = {
    ano_obito?: string | null;
    cpf?: string | null;
    data_nascimento?: string | null;
    nome?: string | null;
    normalizado_ano_obito?: string | null;
    normalizado_cpf?: string | null;
    normalizado_data_nascimento?: string | null;
    situacao_cadastral?: string | null;
};

type InfoSimplesCpfResponse = {
    code?: number;
    code_message?: string;
    errors?: unknown[];
    data_count?: number;
    data?: InfoSimplesCpfRecord[];
};

const INFO_SIMPLES_CPF_URL = 'https://api.infosimples.com/api/v2/consultas/receita-federal/cpf';

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

function onlyDigits(value: string | null | undefined): string {
    return (value || '').replace(/\D/g, '');
}

function isRegularCpfStatus(status: string | null | undefined): boolean {
    return (status || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes('regular');
}

function getInfoSimplesErrorMessage(payload: InfoSimplesCpfResponse): string {
    if (payload.code_message) {
        return payload.code_message;
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        return payload.errors.map(String).join(', ');
    }

    return 'CPF ou data de nascimento não conferem na Receita Federal.';
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

async function validateCpfWithInfoSimples(cpf: string, birthDate: string): Promise<InfoSimplesCpfRecord> {
    const token = process.env.INFO_SIMPLES_TOKEN_SECRET || process.env.INFOSIMPLES_TOKEN_SECRET;

    if (!token) {
        throw new Error('INFO_SIMPLES_TOKEN_SECRET não configurado');
    }

    const searchParams = new URLSearchParams({
        token,
        timeout: '600',
        ignore_site_receipt: '0',
        cpf,
        birthdate: birthDate
    });

    const response = await fetch(`${INFO_SIMPLES_CPF_URL}?${searchParams.toString()}`, {
        method: 'GET',
        cache: 'no-store'
    });

    const payload = await response.json() as InfoSimplesCpfResponse;

    if (!response.ok || payload.code !== 200 || !payload.data_count || !payload.data?.length) {
        throw new Error(getInfoSimplesErrorMessage(payload));
    }

    const record = payload.data[0];
    const returnedCpf = onlyDigits(record.normalizado_cpf || record.cpf);

    if (returnedCpf !== cpf) {
        throw new Error('CPF retornado pela Receita Federal não confere com o CPF informado.');
    }

    if (!isRegularCpfStatus(record.situacao_cadastral)) {
        throw new Error('CPF não está em situação regular na Receita Federal.');
    }

    if (record.normalizado_ano_obito || record.ano_obito) {
        throw new Error('CPF consta com ano de óbito na Receita Federal.');
    }

    return record;
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

        // Validação aritmética do CPF antes da consulta externa.
        if (!isValidCPF(cpfClean)) {
            return NextResponse.json({ error: 'CPF inválido. Por favor, confira os números digitados.' }, { status: 400 });
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

        let infoSimplesRecord: InfoSimplesCpfRecord;
        try {
            infoSimplesRecord = await validateCpfWithInfoSimples(cpfClean, birthDate);
        } catch (validationError: unknown) {
            console.error('Erro na validação InfoSimples:', validationError);
            return NextResponse.json(
                { error: getErrorMessage(validationError, 'CPF ou data de nascimento não conferem na Receita Federal.') },
                { status: 400 }
            );
        }

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
                subject: `Criadora Aprovada Automaticamente - @${updatedUser.username}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #6d28d9; margin-top: 0;">Cadastro Aprovado</h2>
                        <p style="color: #475569; font-size: 16px;">A profissional <strong>@${updatedUser.username}</strong> foi aprovada de forma automatizada via consulta real na Receita Federal.</p>
                        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                            <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${updatedUser.name || updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>Nome Receita Federal:</strong> ${infoSimplesRecord.nome || '-'}</li>
                            <li style="margin-bottom: 8px;"><strong>Username:</strong> @${updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${updatedUser.email}</li>
                            <li style="margin-bottom: 8px;"><strong>CPF:</strong> ***.${updatedUser.taxId?.substring(3, 6)}.${updatedUser.taxId?.substring(6, 9)}-**</li>
                            <li style="margin-bottom: 8px;"><strong>Situação cadastral:</strong> ${infoSimplesRecord.situacao_cadastral || '-'}</li>
                            <li style="margin-bottom: 0;"><strong>Aprovado em:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                        </ul>
                    </div>
                `
            });
            console.log(`Email notification sent to admin for auto-approved identity: ${updatedUser.email}`);
        } catch (emailErr) {
            console.error('Erro ao enviar e-mail de notificação para o admin:', emailErr);
        }

        return NextResponse.json({
            success: true,
            professionalStatus: 'approved'
        });
    } catch (error: unknown) {
        console.error('Erro na validação de CPF:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao processar validação' }, { status: 500 });
    }
}
