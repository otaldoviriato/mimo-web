import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CreditGrant } from '@/models/CreditGrant';
import { CreditUsage } from '@/models/CreditUsage';
import { CreditCampaign } from '@/models/CreditCampaign';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function isUserAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings?.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/campaigns/grants/[id]/details - Detalhes profundos da concessão (auditoria, timeline e fraudes)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId: adminId } = await auth();
        if (!adminId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;

        await connectToDatabase();
        if (!(await isUserAdmin(adminId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const grant = await CreditGrant.findById(id);
        if (!grant) {
            return NextResponse.json({ error: 'Concessão não encontrada' }, { status: 404 });
        }

        const campaign = await CreditCampaign.findById(grant.campaignId);
        const user = await User.findOne({ clerkId: grant.userId });

        if (!user) {
            return NextResponse.json({ error: 'Usuário final associado não encontrado' }, { status: 404 });
        }

        // 1. Histórico de uso
        const usages = await CreditUsage.find({ creditGrantId: grant._id }).sort({ usedAt: 1 });
        
        // Mapeia profissionais envolvidos nos usos
        const professionalClerkIds = usages.map(u => u.monetizedProfileId);
        const professionals = await User.find({ clerkId: { $in: professionalClerkIds } });
        const professionalMap = new Map();
        for (const p of professionals) {
            professionalMap.set(p.clerkId, p.name || p.username || 'Profissional');
        }

        // 2. Monta Timeline de Eventos
        const timeline: any[] = [];

        // Evento de Cadastro do Usuário
        timeline.push({
            type: 'user_created',
            title: 'Conta Criada',
            description: `O usuário se registrou na plataforma.`,
            timestamp: user.createdAt || grant.createdAt
        });

        // Evento de Concessão de Crédito
        timeline.push({
            type: 'credit_granted',
            title: 'Crédito de Boas-vindas Concedido',
            description: `Recebeu R$ ${(grant.amountGranted / 100).toFixed(2)} em créditos promocionais. IP: ${grant.firstIp || 'Não registrado'}.`,
            timestamp: grant.createdAt
        });

        // Eventos de Consumo
        for (const u of usages) {
            const profName = professionalMap.get(u.monetizedProfileId) || 'Profissional';
            timeline.push({
                type: 'credit_used',
                title: 'Crédito Consumido',
                description: `Consumiu R$ ${(u.amountUsed / 100).toFixed(2)} conversando com ${profName}.`,
                timestamp: u.usedAt
            });
        }

        // Evento de Fim (Esgotamento ou Expiração)
        if (grant.amountRemaining === 0) {
            timeline.push({
                type: 'credit_fully_used',
                title: 'Crédito Esgotado',
                description: `O saldo promocional desta concessão foi totalmente utilizado.`,
                timestamp: usages[usages.length - 1]?.usedAt || new Date()
            });
        } else if (grant.status === 'expired') {
            timeline.push({
                type: 'credit_expired',
                title: 'Crédito Expirado',
                description: `O saldo restante de R$ ${(grant.amountRemaining / 100).toFixed(2)} expirou pelo prazo de validade.`,
                timestamp: grant.expiresAt
            });
        }

        // Ordena timeline por data
        timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // 3. Verificação Cruzada de Fraudes (Detecção)
        const fraudAlerts: string[] = [];

        // A. IP Duplicado
        if (grant.firstIp) {
            const ipGrantsCount = await CreditGrant.countDocuments({
                _id: { $ne: grant._id },
                campaignId: grant.campaignId,
                firstIp: grant.firstIp
            });
            if (ipGrantsCount > 0) {
                fraudAlerts.push(`IP Duplicado: O endereço IP ${grant.firstIp} foi utilizado em outras ${ipGrantsCount} contas que receberam o crédito.`);
            }
        }

        // B. CPF Duplicado
        if (user.taxId) {
            // Busca outros usuários com o mesmo CPF que receberam créditos da mesma campanha
            const sameCpfUsers = await User.find({
                clerkId: { $ne: user.clerkId },
                taxId: user.taxId
            });
            const sameCpfClerkIds = sameCpfUsers.map(u => u.clerkId);
            
            const cpfGrantsCount = await CreditGrant.countDocuments({
                campaignId: grant.campaignId,
                userId: { $in: sameCpfClerkIds }
            });
            if (cpfGrantsCount > 0) {
                fraudAlerts.push(`CPF Duplicado: O documento CPF cadastrado já recebeu o crédito de boas-vindas em outra conta.`);
            }
        }

        // C. E-mail Duplicado (Clerk já impede por padrão, mas é útil checar no banco)
        if (user.email) {
            const sameEmailUsers = await User.find({
                clerkId: { $ne: user.clerkId },
                email: user.email
            });
            const sameEmailClerkIds = sameEmailUsers.map(u => u.clerkId);
            const emailGrantsCount = await CreditGrant.countDocuments({
                campaignId: grant.campaignId,
                userId: { $in: sameEmailClerkIds }
            });
            if (emailGrantsCount > 0) {
                fraudAlerts.push(`E-mail Duplicado: O e-mail associado já foi utilizado para receber créditos.`);
            }
        }

        // D. Telefone Duplicado
        if (user.phone) {
            const samePhoneUsers = await User.find({
                clerkId: { $ne: user.clerkId },
                phone: user.phone
            });
            const samePhoneClerkIds = samePhoneUsers.map(u => u.clerkId);
            const phoneGrantsCount = await CreditGrant.countDocuments({
                campaignId: grant.campaignId,
                userId: { $in: samePhoneClerkIds }
            });
            if (phoneGrantsCount > 0) {
                fraudAlerts.push(`Telefone Duplicado: O número de celular já foi utilizado em outra concessão de créditos.`);
            }
        }

        return NextResponse.json({
            grant: {
                id: grant._id,
                amountGranted: grant.amountGranted,
                amountUsed: grant.amountUsed,
                amountRemaining: grant.amountRemaining,
                status: grant.status,
                createdAt: grant.createdAt,
                expiresAt: grant.expiresAt,
                ipAddress: grant.firstIp,
            },
            campaign: {
                name: campaign?.name || 'Campanha de Crédito',
                balanceLabel: campaign?.balanceLabel || 'Crédito promocional',
            },
            user: {
                name: user.name || user.username || 'Usuário',
                username: user.username,
                email: user.email,
                phone: user.phone || 'Não informado',
                taxId: user.taxId || 'Não informado',
                photoUrl: user.photoUrl,
            },
            timeline,
            fraudAlerts,
            isSuspectedFraud: fraudAlerts.length > 0
        });
    } catch (error) {
        console.error('Erro ao buscar detalhes da concessão no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
