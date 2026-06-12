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
            comparisonPeriod: 'none',
            maxPricePerChar: 0.2,
            maxSubscriptionPrice: 200,
            minSubscriptionPrice: 10,
            subscriberDiscountPercentage: 20,
            minPublicPhotos: 6,
            maxPublicPhotos: 12,
            minExclusivePhotos: 2,
            maxExclusivePhotos: 4,
        });
    } else {
        // Garantir que novos campos sejam populados se não existirem
        let updated = false;
        if (settings.minPublicPhotos === undefined) { settings.minPublicPhotos = 6; updated = true; }
        if (settings.maxPublicPhotos === undefined) { settings.maxPublicPhotos = 12; updated = true; }
        if (settings.minExclusivePhotos === undefined) { settings.minExclusivePhotos = 2; updated = true; }
        if (settings.maxExclusivePhotos === undefined) { settings.maxExclusivePhotos = 4; updated = true; }
        if (settings.pixEnabled === undefined) { settings.pixEnabled = true; updated = true; }
        if (settings.creditCardEnabled === undefined) { settings.creditCardEnabled = true; updated = true; }
        if (settings.couponsEnabled === undefined) { settings.couponsEnabled = true; updated = true; }
        if (settings.chatSessionTimeoutMinutes === undefined) { settings.chatSessionTimeoutMinutes = 30; updated = true; }
        if (settings.minSubscriptionPrice === undefined) { settings.minSubscriptionPrice = 10; updated = true; }
        if (settings.institutionalEmails === undefined) { settings.institutionalEmails = ['viriatoceo@mimochat.com.br']; updated = true; }
        if (updated) {
            await settings.save();
        }
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
            adminClerkIds,
            comparisonPeriod,
            maxPricePerChar,
            maxSubscriptionPrice,
            minSubscriptionPrice,
            subscriberDiscountPercentage,
            minPublicPhotos,
            maxPublicPhotos,
            minExclusivePhotos,
            maxExclusivePhotos,
            pixEnabled,
            creditCardEnabled,
            couponsEnabled,
            chatSessionTimeoutMinutes,
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

        if (comparisonPeriod !== undefined) {
            if (!['none', 'week', 'month'].includes(comparisonPeriod)) {
                return NextResponse.json({ error: 'Período comparativo inválido' }, { status: 400 });
            }
            settings.comparisonPeriod = comparisonPeriod;
        }

        if (maxPricePerChar !== undefined) {
            const price = Number(maxPricePerChar);
            if (isNaN(price) || price < 0) {
                return NextResponse.json({ error: 'Preço máximo por caractere inválido' }, { status: 400 });
            }
            settings.maxPricePerChar = price;
        }

        if (maxSubscriptionPrice !== undefined) {
            const price = Number(maxSubscriptionPrice);
            if (isNaN(price) || price < 0) {
                return NextResponse.json({ error: 'Preço máximo de assinatura inválido' }, { status: 400 });
            }
            settings.maxSubscriptionPrice = price;
        }

        if (minSubscriptionPrice !== undefined) {
            const price = Number(minSubscriptionPrice);
            if (isNaN(price) || price < 0) {
                return NextResponse.json({ error: 'Preço mínimo de assinatura inválido' }, { status: 400 });
            }
            settings.minSubscriptionPrice = price;
        }

        if (settings.minSubscriptionPrice > settings.maxSubscriptionPrice) {
            return NextResponse.json({ error: 'O preço mínimo de assinatura não pode ser maior que o preço máximo' }, { status: 400 });
        }

        if (subscriberDiscountPercentage !== undefined) {
            const discount = Number(subscriberDiscountPercentage);
            if (isNaN(discount) || discount < 0 || discount > 100) {
                return NextResponse.json({ error: 'Desconto deve ser entre 0% e 100%' }, { status: 400 });
            }
            settings.subscriberDiscountPercentage = discount;
        }

        if (minPublicPhotos !== undefined) {
            const val = Number(minPublicPhotos);
            if (isNaN(val) || val < 0) return NextResponse.json({ error: 'Quantidade mínima de fotos inválida' }, { status: 400 });
            settings.minPublicPhotos = val;
        }

        if (maxPublicPhotos !== undefined) {
            const val = Number(maxPublicPhotos);
            if (isNaN(val) || val < 0) return NextResponse.json({ error: 'Quantidade máxima de fotos inválida' }, { status: 400 });
            settings.maxPublicPhotos = val;
        }

        if (minExclusivePhotos !== undefined) {
            const val = Number(minExclusivePhotos);
            if (isNaN(val) || val < 0) return NextResponse.json({ error: 'Quantidade mínima de fotos exclusivas inválida' }, { status: 400 });
            settings.minExclusivePhotos = val;
        }

        if (maxExclusivePhotos !== undefined) {
            const val = Number(maxExclusivePhotos);
            if (isNaN(val) || val < 0) return NextResponse.json({ error: 'Quantidade máxima de fotos exclusivas inválida' }, { status: 400 });
            settings.maxExclusivePhotos = val;
        }

        if (pixEnabled !== undefined) {
            settings.pixEnabled = Boolean(pixEnabled);
        }

        if (creditCardEnabled !== undefined) {
            settings.creditCardEnabled = Boolean(creditCardEnabled);
        }

        if (couponsEnabled !== undefined) {
            settings.couponsEnabled = Boolean(couponsEnabled);
        }

        if (chatSessionTimeoutMinutes !== undefined) {
            const timeout = Number(chatSessionTimeoutMinutes);
            if (isNaN(timeout) || timeout < 1) {
                return NextResponse.json({ error: 'Tempo de sessão deve ser de pelo menos 1 minuto' }, { status: 400 });
            }
            settings.chatSessionTimeoutMinutes = timeout;
        }

        // Validação de consistência
        if (settings.minPublicPhotos > settings.maxPublicPhotos) {
            return NextResponse.json({ error: 'A quantidade mínima de fotos públicas não pode ser maior que a máxima' }, { status: 400 });
        }
        if (settings.minExclusivePhotos > settings.maxExclusivePhotos) {
            return NextResponse.json({ error: 'A quantidade mínima de fotos exclusivas não pode ser maior que a máxima' }, { status: 400 });
        }
        if (settings.maxExclusivePhotos > settings.maxPublicPhotos) {
            return NextResponse.json({ error: 'A quantidade máxima de fotos exclusivas não pode ser maior que o limite máximo de fotos públicas' }, { status: 400 });
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
