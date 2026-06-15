import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const documentFile = formData.get('document') as File;
        const selfieFile = formData.get('selfie') as File;
        const documentType = formData.get('documentType') as string;

        if (!documentFile || !selfieFile || !documentType) {
            return NextResponse.json({ error: 'Documentos e tipo de documento são obrigatórios' }, { status: 400 });
        }

        // Validar tipo de arquivo
        if (!documentFile.type.startsWith('image/') || !selfieFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Os arquivos enviados devem ser imagens' }, { status: 400 });
        }

        await connectToDatabase();

        // Gerar nomes de arquivo únicos
        const docExt = documentFile.name.split('.').pop() || 'jpg';
        const selfieExt = selfieFile.name.split('.').pop() || 'jpg';
        
        const docFileName = `identity_docs/${userId}/doc_${uuidv4()}.${docExt}`;
        const selfieFileName = `identity_docs/${userId}/selfie_${uuidv4()}.${selfieExt}`;

        // Upload para GCS
        const identityDocumentUrl = await uploadToGCS(documentFile, docFileName);
        const identitySelfieUrl = await uploadToGCS(selfieFile, selfieFileName);

        // Atualizar usuário no banco de dados com os links e marcar como pendente
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: userId },
            { 
                $set: { 
                    identityDocumentUrl, 
                    identitySelfieUrl, 
                    identityDocumentType: documentType,
                    professionalStatus: 'pending',
                    notes: '' // Limpar observações anteriores de recusa se houver
                } 
            },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Notificar os administradores por e-mail de que documentos foram enviados para análise
        try {
            const appUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.mimochat.com.br';
            await resend.emails.send({
                from: 'Mimo Cadastro <onboarding@resend.dev>',
                to: 'viriatoceo@gmail.com',
                subject: `Documentos de Identidade Enviados - @${updatedUser.username}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #6d28d9; margin-top: 0;">Nova Verificação de Identidade Pendente</h2>
                        <p style="color: #475569; font-size: 16px;">A criadora <strong>@${updatedUser.username}</strong> acabou de enviar os documentos de identidade e selfie para análise de maioridade.</p>
                        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                            <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${updatedUser.name || updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>Username:</strong> @${updatedUser.username}</li>
                            <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${updatedUser.email}</li>
                            <li style="margin-bottom: 8px;"><strong>Tipo de Documento:</strong> ${documentType.toUpperCase()}</li>
                            <li style="margin-bottom: 0;"><strong>Enviado em:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                        </ul>
                        <p style="color: #475569; margin-bottom: 25px;">Acesse o painel do backoffice para avaliar os documentos e dar o parecer final.</p>
                        <a href="${appUrl}/admin/creator-applications" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-align: center;">Ver Documentos no Backoffice</a>
                    </div>
                `
            });
            console.log(`✉️ Email notification sent to admin for submitted identity: ${updatedUser.email}`);
        } catch (emailErr) {
            console.error('Erro ao enviar e-mail de notificação para o admin:', emailErr);
        }

        return NextResponse.json({ 
            success: true, 
            identityDocumentUrl, 
            identitySelfieUrl, 
            professionalStatus: 'pending' 
        });
    } catch (error: any) {
        console.error('Erro no upload dos documentos de identidade:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao processar documentos' }, { status: 500 });
    }
}
