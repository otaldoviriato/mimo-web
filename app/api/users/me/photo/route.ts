import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('photo') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        await connectToDatabase();

        // Gerar um nome de arquivo único
        const fileExtension = file.name.split('.').pop();
        const fileName = `profiles/${userId}/${uuidv4()}.${fileExtension}`;

        // Fazer upload para GCS
        const photoUrl = await uploadToGCS(file, fileName);

        // Atualizar usuário no banco de dados
        await User.findOneAndUpdate(
            { clerkId: userId },
            { $set: { photoUrl } }
        );

        return NextResponse.json({ photoUrl });
    } catch (error: any) {
        console.error('Error uploading photo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
