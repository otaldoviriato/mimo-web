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
            defaultPricePerCharSubscribers: 0.002,
            defaultPricePerCharNonSubscribers: 0.005,
            audioPriceMultiplier: 5,
            pwaShowAgainIntervalDays: 7,
            identityVerificationPromptIntervalDays: 7,
            newProfileDaysThreshold: 15,
            onlineDelayMinutes: 2,
            chatInactivityHours: 48,
            activeUserThresholdDays: 7,
            exploreSortingCriteria: ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'],
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
        if (settings.defaultPricePerCharSubscribers === undefined) { settings.defaultPricePerCharSubscribers = 0.002; updated = true; }
        if (settings.defaultPricePerCharNonSubscribers === undefined) { settings.defaultPricePerCharNonSubscribers = 0.005; updated = true; }
        if (settings.audioPriceMultiplier === undefined) { settings.audioPriceMultiplier = 5; updated = true; }
        if (settings.pwaShowAgainIntervalDays === undefined) { settings.pwaShowAgainIntervalDays = 7; updated = true; }
        if (settings.identityVerificationPromptIntervalDays === undefined) { settings.identityVerificationPromptIntervalDays = 7; updated = true; }
        if (settings.newProfileDaysThreshold === undefined) { settings.newProfileDaysThreshold = 15; updated = true; }
        if (settings.onlineDelayMinutes === undefined) { settings.onlineDelayMinutes = 2; updated = true; }
        if (settings.chatInactivityHours === undefined) { settings.chatInactivityHours = 48; updated = true; }
        if (settings.activeUserThresholdDays === undefined) { settings.activeUserThresholdDays = 7; updated = true; }
        if (settings.exploreSortingCriteria === undefined || settings.exploreSortingCriteria.length === 0) {
            settings.exploreSortingCriteria = ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'];
            updated = true;
        }
        if (settings.clientLevels === undefined || settings.clientLevels.length === 0) {
            settings.clientLevels = [
                { id: 'novo', name: 'Novo', minAmount: 0, color: '#64748B', icon: 'Medal' },
                { id: 'bronze', name: 'Bronze', minAmount: 0.01, color: '#D97706', icon: 'Medal' },
                { id: 'prata', name: 'Prata', minAmount: 100.01, color: '#64748B', icon: 'Medal' },
                { id: 'ouro', name: 'Ouro', minAmount: 500.01, color: '#EAB308', icon: 'Crown' },
                { id: 'vip', name: 'VIP', minAmount: 1000.01, color: '#000000', icon: 'Crown' }
            ];
            updated = true;
        }
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
            defaultPricePerCharSubscribers,
            defaultPricePerCharNonSubscribers,
            audioPriceMultiplier,
            pwaShowAgainIntervalDays,
            identityVerificationPromptIntervalDays,
            newProfileDaysThreshold,
            onlineDelayMinutes,
            chatInactivityHours,
            activeUserThresholdDays,
            exploreSortingCriteria,
            clientLevels,
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

        if (onlineDelayMinutes !== undefined) {
            const delay = Number(onlineDelayMinutes);
            if (isNaN(delay) || delay < 0) {
                return NextResponse.json({ error: 'Tempo de atraso para status offline deve ser de pelo menos 0 minutos' }, { status: 400 });
            }
            settings.onlineDelayMinutes = delay;
        }

        if (chatInactivityHours !== undefined) {
            const val = Number(chatInactivityHours);
            if (isNaN(val) || val < 1) {
                return NextResponse.json({ error: 'Tempo de inatividade de conversa deve ser de pelo menos 1 hora' }, { status: 400 });
            }
            settings.chatInactivityHours = val;
        }

        if (activeUserThresholdDays !== undefined) {
            const val = Number(activeUserThresholdDays);
            if (isNaN(val) || val < 1) {
                return NextResponse.json({ error: 'Limite de dias para usuário ativo deve ser de pelo menos 1 dia' }, { status: 400 });
            }
            settings.activeUserThresholdDays = val;
        }

        if (defaultPricePerCharSubscribers !== undefined) {
            const val = Number(defaultPricePerCharSubscribers);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Preço por caractere padrão para assinantes inválido' }, { status: 400 });
            }
            settings.defaultPricePerCharSubscribers = val;
        }

        if (defaultPricePerCharNonSubscribers !== undefined) {
            const val = Number(defaultPricePerCharNonSubscribers);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Preço por caractere padrão para não-assinantes inválido' }, { status: 400 });
            }
            settings.defaultPricePerCharNonSubscribers = val;
        }

        if (audioPriceMultiplier !== undefined) {
            const val = Number(audioPriceMultiplier);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Multiplicador de preço do áudio inválido' }, { status: 400 });
            }
            settings.audioPriceMultiplier = val;
        }

        if (pwaShowAgainIntervalDays !== undefined) {
            const val = Number(pwaShowAgainIntervalDays);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Intervalo de reexibição do modal PWA inválido' }, { status: 400 });
            }
            settings.pwaShowAgainIntervalDays = val;
        }

        if (identityVerificationPromptIntervalDays !== undefined) {
            const val = Number(identityVerificationPromptIntervalDays);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Intervalo de reexibição do banner de verificação de identidade inválido' }, { status: 400 });
            }
            settings.identityVerificationPromptIntervalDays = val;
        }

        if (newProfileDaysThreshold !== undefined) {
            const val = Number(newProfileDaysThreshold);
            if (isNaN(val) || val < 0) {
                return NextResponse.json({ error: 'Limite de dias para perfil novo inválido' }, { status: 400 });
            }
            settings.newProfileDaysThreshold = val;
        }

        if (exploreSortingCriteria !== undefined) {
            if (!Array.isArray(exploreSortingCriteria) || exploreSortingCriteria.length === 0) {
                return NextResponse.json({ error: 'Critérios de ordenação do explorar inválidos' }, { status: 400 });
            }
            const allowed = ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'];
            const isValid = exploreSortingCriteria.every((c: any) => allowed.includes(c));
            if (!isValid) {
                return NextResponse.json({ error: 'Um ou mais critérios de ordenação fornecidos são inválidos' }, { status: 400 });
            }
            settings.exploreSortingCriteria = exploreSortingCriteria;
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

        if (clientLevels !== undefined) {
            if (!Array.isArray(clientLevels)) {
                return NextResponse.json({ error: 'Níveis de clientes devem ser uma lista' }, { status: 400 });
            }
            for (const level of clientLevels) {
                if (!level.id || !level.name || level.minAmount === undefined || !level.color || !level.icon) {
                    return NextResponse.json({ error: 'Cada nível de cliente deve ter id, nome, valor mínimo, cor e ícone' }, { status: 400 });
                }
                if (isNaN(Number(level.minAmount)) || Number(level.minAmount) < 0) {
                    return NextResponse.json({ error: 'O valor mínimo de recarga de cada faixa deve ser maior ou igual a zero' }, { status: 400 });
                }
                if (!['Award', 'Medal', 'Crown', 'Star'].includes(level.icon)) {
                    return NextResponse.json({ error: 'O ícone selecionado é inválido. Escolha Award, Medal, Crown ou Star' }, { status: 400 });
                }
            }
            settings.clientLevels = clientLevels;
        }

        await settings.save();

        const richAdmins = await getRichAdmins(settings.adminClerkIds);

        return NextResponse.json({ success: true, settings, richAdmins });
    } catch (error: any) {
        console.error('Erro na API de configurações (PUT):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
