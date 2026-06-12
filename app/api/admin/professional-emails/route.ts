import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { ProfessionalEmail } from '@/models/ProfessionalEmail';
import { User } from '@/models/User';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Auxiliar para verificar se o usuário é administrador
async function checkAdmin() {
    const { userId } = await auth();
    if (!userId) {
        return { authorized: false, status: 401, error: 'Não autorizado' };
    }

    await connectToDatabase();

    const settings = await AppSettings.findOne({ key: 'global' });
    const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

    if (!isAdmin) {
        return { authorized: false, status: 403, error: 'Acesso proibido. Apenas administradores.' };
    }

    return { authorized: true, userId };
}

// GET /api/admin/professional-emails - List all pre-added professional emails
export async function GET(request: NextRequest) {
    try {
        const authCheck = await checkAdmin();
        if (!authCheck.authorized) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const list = await ProfessionalEmail.find({})
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ emails: list });
    } catch (error: any) {
        console.error('Erro ao listar e-mails de profissionais:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// POST /api/admin/professional-emails - Add a new email (or promote user directly if already exists)
export async function POST(request: NextRequest) {
    try {
        const authCheck = await checkAdmin();
        if (!authCheck.authorized) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const body = await request.json();
        const rawEmail = body.email;

        if (!rawEmail || typeof rawEmail !== 'string') {
            return NextResponse.json({ error: 'E-mail inválido ou não fornecido.' }, { status: 400 });
        }

        const email = rawEmail.trim().toLowerCase();

        // Validar formato de e-mail básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
        }

        // 1. Verificar se o usuário com este e-mail já existe cadastrado no sistema
        const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (existingUser) {
            // Se o usuário já existe e já é profissional
            if (existingUser.isProfessional) {
                return NextResponse.json({ 
                    status: 'already_professional', 
                    message: `O usuário ${existingUser.name || email} já possui perfil de profissional.` 
                });
            }

            // Se existe mas não é profissional, promove diretamente
            existingUser.isProfessional = true;
            await existingUser.save();

            return NextResponse.json({
                status: 'promoted',
                message: `O usuário ${existingUser.name || email} já estava cadastrado e foi promovido a Profissional com sucesso!`
            });
        }

        // 2. Se não existe no banco, verifica se já está na lista de pré-adicionados
        const existingPreAdded = await ProfessionalEmail.findOne({ email });
        if (existingPreAdded) {
            return NextResponse.json({ error: 'Este e-mail já consta na lista de profissionais autorizados.' }, { status: 400 });
        }

        // 3. Adiciona à lista de pré-cadastro
        const newPreAdded = new ProfessionalEmail({ email });
        await newPreAdded.save();

        return NextResponse.json({
            status: 'added',
            message: `E-mail ${email} adicionado com sucesso. Quando esta pessoa criar uma conta, será automaticamente profissional!`,
            data: newPreAdded
        });

    } catch (error: any) {
        console.error('Erro ao adicionar e-mail de profissional:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/professional-emails - Delete an email from the pre-added list
export async function DELETE(request: NextRequest) {
    try {
        const authCheck = await checkAdmin();
        if (!authCheck.authorized) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'E-mail não fornecido.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const deleted = await ProfessionalEmail.findOneAndDelete({ email: normalizedEmail });

        if (!deleted) {
            return NextResponse.json({ error: 'E-mail não encontrado na lista.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'E-mail removido da lista de autorizados com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao deletar e-mail de profissional:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
