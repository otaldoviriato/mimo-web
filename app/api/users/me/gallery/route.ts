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

        const items = await GalleryItem.find({ ownerId: userId }).sort({ createdAt: -1 });

        return NextResponse.json({ items });
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
        let visibility = formData.get('visibility') as 'public' | 'subscribers' || 'public';

        if (!file) {
            return NextResponse.json({ error: 'Nenhuma foto enviada' }, { status: 400 });
        }

        // Verificar se o usuário quer 'subscribers' mas não é profissional
        if (visibility === 'subscribers') {
            const currentUser = await User.findOne({ clerkId: userId });
            if (!currentUser?.isProfessional) {
                // Se não for profissional, força visibilidade pública
                visibility = 'public';
            }
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'O arquivo deve ser uma imagem' }, { status: 400 });
        }

        // Gerar um nome de arquivo único
        const fileExtension = file.name.split('.').pop();
        const fileName = `galleries/${userId}/${uuidv4()}.${fileExtension}`;

        // Fazer upload para GCS
        const imageUrl = await uploadToGCS(file, fileName);

        // Criar item na galeria
        const newItem = await GalleryItem.create({
            ownerId: userId,
            imageUrl,
            visibility,
        });

        return NextResponse.json({ item: newItem });
    } catch (error: any) {
        console.error('Error uploading to gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
