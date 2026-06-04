import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

// PATCH /api/admin/users/[clerkId] - Update user data
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        if (!adminUserId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        // Verifica se o adminUserId é de fato administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(adminUserId) || adminUserId === FALLBACK_ADMIN : adminUserId === FALLBACK_ADMIN;
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, isProfessional, balance, taxId, phone, pixKey } = body;

        const updateFields: any = {};
        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) updateFields.email = email;
        if (isProfessional !== undefined) updateFields.isProfessional = isProfessional;
        if (balance !== undefined) updateFields.balance = Number(balance);
        if (taxId !== undefined) updateFields.taxId = taxId;
        if (phone !== undefined) updateFields.phone = phone;
        if (pixKey !== undefined) updateFields.pixKey = pixKey;

        const updatedUser = await User.findOneAndUpdate(
            { clerkId },
            { $set: updateFields },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'Usuário não encontrado no banco' }, { status: 404 });
        }

        // Tenta atualizar no Clerk (opcional, sem quebrar caso falhe)
        try {
            const client = await clerkClient();
            await client.users.updateUser(clerkId, {
                ...(name !== undefined && { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') }),
            });
        } catch (clerkErr) {
            console.warn('Falha ao atualizar dados no Clerk para o usuário:', clerkId, clerkErr);
        }

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error: any) {
        console.error('Erro ao atualizar usuário pelo admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[clerkId] - Delete user from database and Clerk
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        if (!adminUserId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário obrigatório' }, { status: 400 });
        }

        if (clerkId === adminUserId) {
            return NextResponse.json({ error: 'Você não pode excluir seu próprio perfil de administrador.' }, { status: 400 });
        }

        await connectToDatabase();

        // Verifica se o adminUserId é administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(adminUserId) || adminUserId === FALLBACK_ADMIN : adminUserId === FALLBACK_ADMIN;
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        // 1. Deleta do MongoDB
        const deletedUser = await User.findOneAndDelete({ clerkId });
        if (!deletedUser) {
            return NextResponse.json({ error: 'Usuário não encontrado no banco de dados' }, { status: 404 });
        }

        // 2. Deleta do Clerk
        try {
            const client = await clerkClient();
            await client.users.deleteUser(clerkId);
        } catch (clerkErr: any) {
            console.warn('Falha ao excluir usuário do Clerk, mas deletado do banco:', clerkId, clerkErr);
        }

        return NextResponse.json({ success: true, message: 'Usuário deletado com sucesso do banco e do Clerk.' });

    } catch (error: any) {
        console.error('Erro ao deletar usuário pelo admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
