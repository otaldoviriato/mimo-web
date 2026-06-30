import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem } from '@/models';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const allItems = await GalleryItem.find({ ownerId: userId }).sort({ createdAt: -1 });
        const publicItems = allItems.filter(item => !item.galleryType || item.galleryType === 'public');
        const privateItems = allItems.filter(item => item.galleryType === 'private');

        return NextResponse.json({ 
            items: publicItems, 
            publicItems, 
            privateItems 
        });
    } catch (error: any) {
        console.error('Error fetching gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const formData = await request.formData();
        const file = formData.get('photo') as File;
        const galleryType = formData.get('galleryType') as 'public' | 'private' || 'public';
        let visibility = formData.get('visibility') as 'public' | 'subscribers' || 'public';

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isImage && !isVideo) {
            return NextResponse.json({ error: 'O arquivo deve ser uma imagem ou vídeo' }, { status: 400 });
        }

        // Galeria pública aceita apenas fotos
        if (galleryType === 'public' && isVideo) {
            return NextResponse.json({ error: 'A galeria pública suporta apenas fotos' }, { status: 400 });
        }

        // Forçar visibilidade para assinantes se for galeria privada
        if (galleryType === 'private') {
            visibility = 'subscribers';
        }

        // Verificar se o usuário quer 'subscribers' mas não é profissional
        if (visibility === 'subscribers') {
            const currentUser = await User.findOne({ clerkId: userId });
            if (!currentUser?.isProfessional) {
                // Se não for profissional, força visibilidade pública
                visibility = 'public';
            }
        }

        // Gerar um nome de arquivo único
        const fileExtension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const fileName = `galleries/${userId}/${uuidv4()}.${fileExtension}`;

        // Fazer upload para GCS
        const imageUrl = await uploadToGCS(file, fileName);

        // Criar item na galeria
        const newItem = await GalleryItem.create({
            ownerId: userId,
            imageUrl,
            visibility,
            galleryType,
            mediaType: isVideo ? 'video' : 'photo',
        });

        return NextResponse.json({ item: newItem });
    } catch (error: any) {
        console.error('Error uploading to gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        if (!itemId) {
            return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const deletedItem = await GalleryItem.findOneAndDelete({ _id: itemId, ownerId: userId });

        if (!deletedItem) {
            return NextResponse.json({ error: 'Item não encontrado ou você não tem permissão' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Item removido com sucesso' });
    } catch (error: any) {
        console.error('Error deleting from gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemId, visibility } = body;

        if (!itemId || !visibility) {
            return NextResponse.json({ error: 'ID do item e visibilidade são obrigatórios' }, { status: 400 });
        }

        if (visibility !== 'public' && visibility !== 'subscribers') {
            return NextResponse.json({ error: 'Visibilidade inválida' }, { status: 400 });
        }

        await connectToDatabase();

        const galleryItem = await GalleryItem.findOne({ _id: itemId, ownerId: userId });

        if (!galleryItem) {
            return NextResponse.json({ error: 'Item não encontrado ou você não tem permissão' }, { status: 404 });
        }

        if (galleryItem.galleryType === 'private' && visibility !== 'subscribers') {
            return NextResponse.json({ error: 'Itens da galeria privada devem ser sempre exclusivos para assinantes' }, { status: 400 });
        }

        galleryItem.visibility = visibility;
        await galleryItem.save();

        return NextResponse.json({ success: true, item: galleryItem });
    } catch (error: any) {
        console.error('Error updating gallery item visibility:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

