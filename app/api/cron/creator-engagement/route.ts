import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        if (!settings || !settings.creatorEngagementEmailsEnabled) {
            return NextResponse.json({
                success: true,
                message: 'Automação de e-mails de engajamento de criadoras desativada globalmente no Backoffice.'
            });
        }

        const institutionalEmail = settings.institutionalEmails?.[0] || 'viriatoceo@mimochat.com.br';
        const senderFrom = `"MimoChat" <${institutionalEmail}>`;

        // Buscar todas as usuárias profissionais que possuem e-mail válido
        const creators = await User.find({
            isProfessional: true,
            email: { $exists: true, $ne: '' }
        });

        const now = new Date();
        const results = {
            totalCreatorsChecked: creators.length,
            step1EmailsSent: 0,
            step2EmailsSent: 0,
            skippedHasRooms: 0,
        };

        for (const creator of creators) {
            // Verificar se a criadora já possui alguma conversa/sala criada
            const roomCount = await Room.countDocuments({
                participants: creator.clerkId
            });

            if (roomCount > 0) {
                results.skippedHasRooms++;
                continue;
            }

            const createdAt = new Date(creator.createdAt || Date.now());
            const hoursSinceRegistration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            const sentSteps = creator.engagementEmailsSent || [];
            const userSlug = creator.username || 'seu_perfil';
            const profileLink = `https://mimo.chat/${userSlug}`;

            // ─── RÉGUA 1 (Primeiro Lembrete) ──────────────────────────────────────────
            if (
                settings.creatorEngagementStep1Enabled &&
                hoursSinceRegistration >= settings.creatorEngagementStep1Hours &&
                !sentSteps.includes('step1')
            ) {
                const subject = 'Como faturar no MimoChat: Divulgue seu link exclusivo 🚀';
                const htmlContent = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="font-size: 20px; font-weight: 800; color: #581c87; margin: 0 0 8px 0;">Ative seu perfil no MimoChat 💜</h1>
                            <p style="font-size: 14px; color: #64748b; margin: 0;">Sua conta foi criada, mas você ainda não recebeu conversas.</p>
                        </div>

                        <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                            <p style="font-size: 14px; font-weight: bold; color: #6b21a8; margin: 0 0 8px 0;">🔗 Seu Link Exclusivo de Monetização:</p>
                            <div style="background-color: #ffffff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; color: #3b0764; text-align: center; word-break: break-all;">
                                ${profileLink}
                            </div>
                        </div>

                        <div style="margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #334155;">
                            <p style="margin-top: 0;"><strong>Como funciona seu ganho:</strong></p>
                            <ol style="padding-left: 20px; margin: 0 0 16px 0;">
                                <li style="margin-bottom: 8px;"><strong>Copie seu link</strong> e adicione na bio do seu Instagram ou TikTok.</li>
                                <li style="margin-bottom: 8px;">Seus seguidores acessam seu perfil e recarregam créditos para falar com você.</li>
                                <li>Você responde às mensagens e faz saques via Pix.</li>
                            </ol>
                            <p style="font-size: 13px; color: #64748b; font-style: italic;">O MimoChat não envia usuários de forma automática — é você quem monetiza sua atenção divulgando seu link oficial!</p>
                        </div>

                        <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
                            Equipe MimoChat · Suporte e Dicas de Faturamento
                        </div>
                    </div>
                `;

                if (resend) {
                    await resend.emails.send({
                        from: senderFrom,
                        to: creator.email,
                        subject,
                        html: htmlContent,
                    });
                } else {
                    console.log(`[SIMULAÇÃO CRON LEMBRETE 1] Para: ${creator.email} | Assunto: ${subject}`);
                }

                await User.updateOne(
                    { _id: creator._id },
                    { $addToSet: { engagementEmailsSent: 'step1' } }
                );
                results.step1EmailsSent++;
            }

            // ─── RÉGUA 2 (Segundo Lembrete - Dica de Ouro) ────────────────────────────
            if (
                settings.creatorEngagementStep2Enabled &&
                hoursSinceRegistration >= settings.creatorEngagementStep2Hours &&
                !sentSteps.includes('step2')
            ) {
                const subject = 'Dica de Ouro MimoChat: Como receber suas primeiras mensagens 💸';
                const htmlContent = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="font-size: 20px; font-weight: 800; color: #581c87; margin: 0 0 8px 0;">Dica de Ouro para Faturar Hoje 💡</h1>
                            <p style="font-size: 14px; color: #64748b; margin: 0;">Perfis com link na bio recebem até 5x mais mensagens.</p>
                        </div>

                        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 18px; border-radius: 12px; margin-bottom: 20px;">
                            <p style="font-size: 13px; color: #78350f; margin: 0; line-height: 1.5;">
                                <strong>💡 Estratégia de Sucesso:</strong> Poste um Story no Instagram convidando seus seguidores para conversar no seu chat oficial e coloque seu link do Mimo na bio.
                            </p>
                        </div>

                        <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 16px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                            <span style="font-size: 12px; font-weight: bold; color: #6b21a8; text-transform: uppercase; tracking: 1px;">Seu Link MimoChat:</span>
                            <p style="font-size: 15px; font-weight: bold; color: #3b0764; margin: 6px 0 0 0;">${profileLink}</p>
                        </div>

                        <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
                            Equipe MimoChat · Dicas de Engajamento
                        </div>
                    </div>
                `;

                if (resend) {
                    await resend.emails.send({
                        from: senderFrom,
                        to: creator.email,
                        subject,
                        html: htmlContent,
                    });
                } else {
                    console.log(`[SIMULAÇÃO CRON LEMBRETE 2] Para: ${creator.email} | Assunto: ${subject}`);
                }

                await User.updateOne(
                    { _id: creator._id },
                    { $addToSet: { engagementEmailsSent: 'step2' } }
                );
                results.step2EmailsSent++;
            }
        }

        return NextResponse.json({
            success: true,
            results
        });
    } catch (error: any) {
        console.error('Erro no Cron de engajamento de criadoras:', error);
        return NextResponse.json({ error: 'Erro interno do servidor no Cron' }, { status: 500 });
    }
}
