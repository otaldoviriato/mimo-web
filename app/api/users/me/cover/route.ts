import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { uploadBufferToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = (formData.get('cover') || formData.get('photo')) as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        await connectToDatabase();

        const buffer = Buffer.from(await file.arrayBuffer());

        // Converter e otimizar para WebP usando sharp
        let processedBuffer: any = buffer;
        let fileExtension = 'webp';
        let contentType = 'image/webp';
        
        try {
            processedBuffer = await sharp(buffer)
                .resize(1200, null, { withoutEnlargement: true }) // Redimensionar largura máxima para 1200px, mantendo proporção
                .webp({ quality: 80 })
                .toBuffer();
        } catch (err) {
            console.error('Failed to convert cover to WebP with sharp, uploading original:', err);
            fileExtension = file.name.split('.').pop() || 'jpg';
            contentType = file.type;
        }

        // Gerar um nome de arquivo único
        const fileName = `profiles/${userId}/covers/${uuidv4()}.${fileExtension}`;

        // Fazer upload para GCS
        const coverUrl = await uploadBufferToGCS(processedBuffer, fileName, contentType);

        // Atualizar usuário no banco de dados
        await User.findOneAndUpdate(
            { clerkId: userId },
            { $set: { coverUrl } }
        );

        return NextResponse.json({ coverUrl });
    } catch (error: any) {
        console.error('Error uploading cover:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
