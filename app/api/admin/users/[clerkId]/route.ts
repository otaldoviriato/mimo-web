import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { GalleryItem } from '@/models/GalleryItem';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { buildProfileRoleMetadata } from '@/lib/profileRole';

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
        const withdrawals = await WithdrawRequest.find({ userId: clerkId }).sort({ createdAt: -1 }).lean() as any[];

        return NextResponse.json({
            user: {
                ...userObj,
                createdAt: userObj.createdAt ? new Date(userObj.createdAt).toLocaleDateString('pt-BR') : 'N/A',
            },
            gallery: galleryItems,
            withdrawals: withdrawals.map((withdrawal) => ({
                id: withdrawal._id.toString(),
                amount: withdrawal.amount / 100,
                pixKey: withdrawal.pixKey,
                status: withdrawal.status,
                asaasTransferId: withdrawal.asaasTransferId || null,
                hiddenFromUser: withdrawal.hiddenFromUser === true,
                hiddenFromUserAt: withdrawal.hiddenFromUserAt ? new Date(withdrawal.hiddenFromUserAt).toLocaleString('pt-BR') : null,
                createdAt: withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleString('pt-BR') : 'N/A',
                updatedAt: withdrawal.updatedAt ? new Date(withdrawal.updatedAt).toLocaleString('pt-BR') : 'N/A',
            }))
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
            subscriptionPrice,
            chargePerCharSubscribers,
            chargePerCharNonSubscribers,
            photoUrl,
            coverUrl,
            bio
        } = body;

        const updateFields: any = {};
        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) updateFields.email = email;
        if (isProfessional !== undefined) updateFields.isProfessional = isProfessional;
        if (balance !== undefined) updateFields.balance = Number(balance);
        if (taxId !== undefined) updateFields.taxId = taxId;
        if (phone !== undefined) updateFields.phone = phone;
        if (subscriptionPrice !== undefined) updateFields.subscriptionPrice = Number(subscriptionPrice);
        if (chargePerCharSubscribers !== undefined) updateFields.chargePerCharSubscribers = Number(chargePerCharSubscribers);
        if (chargePerCharNonSubscribers !== undefined) updateFields.chargePerCharNonSubscribers = Number(chargePerCharNonSubscribers);
        if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
        if (coverUrl !== undefined) updateFields.coverUrl = coverUrl;

        if (bio !== undefined) {
            if (bio && bio.length > 300) {
                return NextResponse.json({ error: 'A biografia deve ter no máximo 300 caracteres.' }, { status: 400 });
            }
            updateFields.bio = bio;
        }

        if (isProfessional === false) {
            updateFields.bio = '';
        }

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
            if (name !== undefined) {
                await client.users.updateUser(clerkId, {
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' '),
                });
            }

            if (isProfessional !== undefined) {
                await client.users.updateUserMetadata(clerkId, {
                    unsafeMetadata: buildProfileRoleMetadata(isProfessional ? 'professional' : 'client'),
                });
            }
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
            await client.users.updateUserMetadata(clerkId, {
                unsafeMetadata: {
                    role: null,
                    profileSelectedAt: null,
                    profileRoleSource: null,
                },
            });
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
