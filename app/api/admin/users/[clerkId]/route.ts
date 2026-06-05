import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { GalleryItem } from '@/models/GalleryItem';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/[clerkId] - Get user detailed data + gallery
export async function GET(
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

        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(adminUserId) || adminUserId === FALLBACK_ADMIN : adminUserId === FALLBACK_ADMIN;
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const userObj = await User.findOne({ clerkId }).lean() as any;
        if (!userObj) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Buscar galeria do usuário
        const galleryItems = await GalleryItem.find({ ownerId: clerkId }).sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            user: {
                ...userObj,
                createdAt: userObj.createdAt ? new Date(userObj.createdAt).toLocaleDateString('pt-BR') : 'N/A',
            },
            gallery: galleryItems
        });
    } catch (error: any) {
        console.error('Erro ao obter detalhes do usuário pelo admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

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
        const { 
            name, 
            email, 
            isProfessional, 
            balance, 
            taxId, 
            phone, 
            pixKey,
            subscriptionPrice,
            chargePerCharSubscribers,
            chargePerCharNonSubscribers,
            photoUrl,
            coverUrl
        } = body;

        const updateFields: any = {};
        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) updateFields.email = email;
        if (isProfessional !== undefined) updateFields.isProfessional = isProfessional;
        if (balance !== undefined) updateFields.balance = Number(balance);
        if (taxId !== undefined) updateFields.taxId = taxId;
        if (phone !== undefined) updateFields.phone = phone;
        if (pixKey !== undefined) updateFields.pixKey = pixKey;
        if (subscriptionPrice !== undefined) updateFields.subscriptionPrice = Number(subscriptionPrice);
        if (chargePerCharSubscribers !== undefined) updateFields.chargePerCharSubscribers = Number(chargePerCharSubscribers);
        if (chargePerCharNonSubscribers !== undefined) updateFields.chargePerCharNonSubscribers = Number(chargePerCharNonSubscribers);
        if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
        if (coverUrl !== undefined) updateFields.coverUrl = coverUrl;

        const updatedUser = await User.findOneAndUpdate(
            { clerkId },
            { $set: updateFields },
            { returnDocument: 'after' }
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
        } catch (clerkErr: any) {
            if (clerkErr.status === 404 || (clerkErr.errors && clerkErr.errors[0]?.code === 'resource_not_found')) {
                console.info(`[Clerk Sync] Usuário ${clerkId} não encontrado no Clerk (provavelmente usuário mockado local). Sincronização ignorada.`);
            } else {
                console.warn('[Clerk Sync] Falha ao atualizar dados no Clerk:', clerkErr.message || clerkErr);
            }
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
