import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AdminAlertPreference } from '@/models/AdminAlertPreference';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';

// GET /api/admin/alert-settings - Retorna as configurações do administrador atual
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const preference = await AdminAlertPreference.findOne({ clerkId: userId });
        const adminUser = await User.findOne({ clerkId: userId }).select('email').lean();

        const prefObj = preference || {
            clerkId: userId,
            email: adminUser?.email && !adminUser.email.includes('@placeholder.com') ? adminUser.email : '',
            newProfessionalAlert: true,
            newClientBroughtAlert: true,
            pushEnabled: true,
            emailEnabled: true,
        };

        return NextResponse.json({
            preference: {
                clerkId: userId,
                email: prefObj.email || (adminUser?.email && !adminUser.email.includes('@placeholder.com') ? adminUser.email : ''),
                newProfessionalAlert: prefObj.newProfessionalAlert ?? true,
                newClientBroughtAlert: prefObj.newClientBroughtAlert ?? true,
                pushEnabled: prefObj.pushEnabled ?? true,
                emailEnabled: prefObj.emailEnabled ?? true,
            }
        });
    } catch (error: any) {
        console.error('Erro ao buscar configurações de alertas do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// PUT /api/admin/alert-settings - Salva as configurações do administrador atual
export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { email, newProfessionalAlert, newClientBroughtAlert, pushEnabled, emailEnabled } = body;

        const updatedPreference = await AdminAlertPreference.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: {
                    email: typeof email === 'string' ? email.trim() : '',
                    newProfessionalAlert: Boolean(newProfessionalAlert),
                    newClientBroughtAlert: Boolean(newClientBroughtAlert),
                    pushEnabled: Boolean(pushEnabled),
                    emailEnabled: Boolean(emailEnabled),
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        return NextResponse.json({
            success: true,
            preference: updatedPreference
        });
    } catch (error: any) {
        console.error('Erro ao salvar configurações de alertas do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
