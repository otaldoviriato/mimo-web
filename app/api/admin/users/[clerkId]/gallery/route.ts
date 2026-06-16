import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem } from '@/models';
import { AppSettings } from '@/models/AppSettings';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';

async function checkAdmin(adminUserId: string | null) {
    if (!adminUserId) return false;
    await connectToDatabase();
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings 
        ? settings.adminClerkIds.includes(adminUserId) || adminUserId === FALLBACK_ADMIN 
        : adminUserId === FALLBACK_ADMIN;
}

// POST /api/admin/users/[clerkId]/gallery - Admin uploads photo to user's gallery
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        const isAdmin = await checkAdmin(adminUserId);
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('photo') as File;
        const visibility = formData.get('visibility') as 'public' | 'subscribers' || 'public';

        if (!file) {
            return NextResponse.json({ error: 'Nenhuma foto enviada' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'O arquivo deve ser uma imagem' }, { status: 400 });
        }

        // Verificar se o usuário existe e é profissional
        const targetUser = await User.findOne({ clerkId });
        if (!targetUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Gerar um nome de arquivo único
        const fileExtension = file.name.split('.').pop();
        const fileName = `galleries/${clerkId}/${uuidv4()}.${fileExtension}`;

        // Fazer upload para GCS
        const imageUrl = await uploadToGCS(file, fileName);

        // Criar item na galeria
        const newItem = await GalleryItem.create({
            ownerId: clerkId,
            imageUrl,
            visibility,
        });

        return NextResponse.json({ item: newItem });
    } catch (error) {
        console.error('Erro ao enviar foto para galeria via admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[clerkId]/gallery - Admin deletes photo from user's gallery
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        const isAdmin = await checkAdmin(adminUserId);
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        if (!itemId) {
            return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });
        }

        const deletedItem = await GalleryItem.findOneAndDelete({ _id: itemId, ownerId: clerkId });

        if (!deletedItem) {
            return NextResponse.json({ error: 'Item não encontrado ou não pertence a este usuário' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Item removido com sucesso pela administração.' });
    } catch (error) {
        console.error('Erro ao deletar item de galeria via admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// PATCH /api/admin/users/[clerkId]/gallery - Admin updates photo visibility in user's gallery
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        const isAdmin = await checkAdmin(adminUserId);
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
        }

        const body = await request.json();
        const { itemId, visibility } = body;

        if (!itemId || !visibility) {
            return NextResponse.json({ error: 'ID do item e visibilidade são obrigatórios' }, { status: 400 });
        }

        if (visibility !== 'public' && visibility !== 'subscribers') {
            return NextResponse.json({ error: 'Visibilidade inválida' }, { status: 400 });
        }

        const updatedItem = await GalleryItem.findOneAndUpdate(
            { _id: itemId, ownerId: clerkId },
            { visibility },
            { new: true }
        );

        if (!updatedItem) {
            return NextResponse.json({ error: 'Item não encontrado ou não pertence a este usuário' }, { status: 404 });
        }

        return NextResponse.json({ item: updatedItem });
    } catch (error) {
        console.error('Erro ao atualizar visibilidade de foto de galeria via admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

