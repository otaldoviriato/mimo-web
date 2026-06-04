import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

// Função auxiliar para garantir e buscar o registro de configurações globais
async function getOrCreateSettings() {
    let settings = await AppSettings.findOne({ key: 'global' });
    if (!settings) {
        settings = await AppSettings.create({
            key: 'global',
            platformFeePercentage: 10,
            uploadLimitMB: 50,
            autoModeration: true,
            professionalsOnlyCreateRooms: false,
            adminClerkIds: [FALLBACK_ADMIN],
        });
    }
    return settings;
}

// Busca as informações completas dos usuários que são administradores
async function getRichAdmins(clerkIds: string[]) {
    const users = await User.find({ clerkId: { $in: clerkIds } })
        .select('clerkId username name email photoUrl')
        .lean();

    return clerkIds.map(id => {
        const found = users.find(u => u.clerkId === id);
        if (found) {
            return {
                clerkId: found.clerkId,
                username: found.username,
                name: found.name || found.username,
                email: found.email,
                photoUrl: found.photoUrl || null
            };
        }
        // Fallback caso o Clerk ID do admin ainda não tenha feito login na base do Mimo
        return {
            clerkId: id,
            username: 'admin_clerk',
            name: id === FALLBACK_ADMIN ? 'Administrador Proprietário' : `Administrador (${id.substring(0, 10)})`,
            email: 'admin@mimo.chat',
            photoUrl: null
        };
    });
}

// GET /api/admin/settings - Obtém as configurações e perfis dos administradores
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        const settings = await getOrCreateSettings();

        // Verifica se o usuário atual está na lista de administradores
        const isAdmin = settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const richAdmins = await getRichAdmins(settings.adminClerkIds);

        return NextResponse.json({ settings, richAdmins });
    } catch (error: any) {
        console.error('Erro na API de configurações (GET):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// PUT /api/admin/settings - Atualiza as configurações globais e retorna lista atualizada
export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        const settings = await getOrCreateSettings();

        // Verifica se o usuário atual está na lista de administradores
        const isAdmin = settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { 
            platformFeePercentage, 
            uploadLimitMB, 
            autoModeration, 
            professionalsOnlyCreateRooms, 
            adminClerkIds 
        } = body;

        // Validações básicas
        if (platformFeePercentage !== undefined) {
            const fee = Number(platformFeePercentage);
            if (isNaN(fee) || fee < 0 || fee > 100) {
                return NextResponse.json({ error: 'Taxa de intermediação deve ser entre 0% e 100%' }, { status: 400 });
            }
            settings.platformFeePercentage = fee;
        }

        if (uploadLimitMB !== undefined) {
            const limit = Number(uploadLimitMB);
            if (isNaN(limit) || limit < 1) {
                return NextResponse.json({ error: 'Limite de upload inválido' }, { status: 400 });
            }
            settings.uploadLimitMB = limit;
        }

        if (autoModeration !== undefined) {
            settings.autoModeration = Boolean(autoModeration);
        }

        if (professionalsOnlyCreateRooms !== undefined) {
            settings.professionalsOnlyCreateRooms = Boolean(professionalsOnlyCreateRooms);
        }

        if (adminClerkIds !== undefined) {
            if (!Array.isArray(adminClerkIds) || adminClerkIds.length === 0) {
                return NextResponse.json({ error: 'A lista de administradores não pode ser vazia' }, { status: 400 });
            }

            // Sanitiza os Clerk IDs (remove espaços em branco)
            const sanitizedIds = adminClerkIds.map((id: string) => id.trim()).filter(Boolean);

            // Regra de segurança: Não permitir que o usuário atual se autoexclua para não trancar o painel
            if (!sanitizedIds.includes(userId) && userId !== FALLBACK_ADMIN) {
                return NextResponse.json({ 
                    error: 'Você não pode se remover da lista de administradores para evitar o auto-bloqueio.' 
                }, { status: 400 });
            }

            settings.adminClerkIds = sanitizedIds;
        }

        await settings.save();

        const richAdmins = await getRichAdmins(settings.adminClerkIds);

        return NextResponse.json({ success: true, settings, richAdmins });
    } catch (error: any) {
        console.error('Erro na API de configurações (PUT):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
