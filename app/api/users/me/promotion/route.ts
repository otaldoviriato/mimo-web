import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfilePromotion } from '@/models/ProfilePromotion';
import {
    getPromotionConfig,
    isWithinActivationWindow,
    calculateNextOpportunity,
    checkAndExpirePromotions,
    getZonedHourAndDay
} from '@/lib/profilePromotion';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        await connectToDatabase();
        await checkAndExpirePromotions(userId);

        const [user, config] = await Promise.all([
            User.findOne({ clerkId: userId }).select('isProfessional professionalStatus isAvailable').lean(),
            getPromotionConfig(),
        ]);

        if (!user || !user.isProfessional) {
            return NextResponse.json({ error: 'Apenas profissionais podem acessar divulgações' }, { status: 403 });
        }

        const now = new Date();
        const activePromotion = await ProfilePromotion.findOne({
            professionalId: userId,
            status: 'active',
            expiresAt: { $gt: now },
        }).sort({ createdAt: -1 }).lean();

        const { dayString } = getZonedHourAndDay(now, config.timezone);
        const dailyCount = await ProfilePromotion.countDocuments({
            professionalId: userId,
            dayString,
            status: { $in: ['active', 'completed', 'cancelled'] },
        });

        const withinWindow = isWithinActivationWindow(now, config);
        const reachedDailyLimit = dailyCount >= config.maxDailyPerProfessional;
        const isEligible = user.professionalStatus === 'approved';
        const canActivate = isEligible && withinWindow && !reachedDailyLimit && !activePromotion;
        const nextOpportunity = calculateNextOpportunity(now, config);

        const history = await ProfilePromotion.find({
            professionalId: userId,
        })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        return NextResponse.json({
            activePromotion: activePromotion ? {
                id: activePromotion._id,
                startedAt: activePromotion.startedAt,
                expiresAt: activePromotion.expiresAt,
                status: activePromotion.status,
                remainingSeconds: Math.max(0, Math.floor((new Date(activePromotion.expiresAt).getTime() - now.getTime()) / 1000)),
                metrics: {
                    profileViews: activePromotion.profileViews || 0,
                    newConversations: activePromotion.newConversations || 0,
                    netEarningsCents: activePromotion.netEarningsCents || 0,
                },
            } : null,
            history: history.map(item => ({
                id: item._id,
                startedAt: item.startedAt,
                endedAt: item.endedAt,
                expiresAt: item.expiresAt,
                status: item.status,
                metrics: {
                    profileViews: item.profileViews || 0,
                    newConversations: item.newConversations || 0,
                    netEarningsCents: item.netEarningsCents || 0,
                },
            })),
            canActivate,
            isEligible,
            withinWindow,
            reachedDailyLimit,
            dailyCount,
            maxDaily: config.maxDailyPerProfessional,
            durationMinutes: config.durationMinutes,
            nextOpportunityAt: nextOpportunity.toISOString(),
            isAvailable: Boolean(activePromotion),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Erro ao carregar dados de divulgação' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        await connectToDatabase();
        await checkAndExpirePromotions(userId);

        const [user, config] = await Promise.all([
            User.findOne({ clerkId: userId }),
            getPromotionConfig(),
        ]);

        if (!user || !user.isProfessional) {
            return NextResponse.json({ error: 'Apenas profissionais podem divulgar perfil' }, { status: 403 });
        }

        if (user.professionalStatus !== 'approved') {
            return NextResponse.json({ error: 'Seu perfil profissional precisa estar aprovado para iniciar uma divulgação.' }, { status: 403 });
        }

        const now = new Date();

        if (!isWithinActivationWindow(now, config)) {
            const nextOpp = calculateNextOpportunity(now, config);
            return NextResponse.json({
                error: 'Fora do horário de ativação da divulgação.',
                nextOpportunityAt: nextOpp.toISOString(),
            }, { status: 400 });
        }

        const { dayString } = getZonedHourAndDay(now, config.timezone);

        const existingActive = await ProfilePromotion.findOne({
            professionalId: userId,
            status: 'active',
            expiresAt: { $gt: now },
        });

        if (existingActive) {
            return NextResponse.json({
                message: 'Já existe uma divulgação ativa.',
                promotion: existingActive,
            }, { status: 200 });
        }

        const dailyCount = await ProfilePromotion.countDocuments({
            professionalId: userId,
            dayString,
            status: { $in: ['active', 'completed', 'cancelled'] },
        });

        if (dailyCount >= config.maxDailyPerProfessional) {
            return NextResponse.json({
                error: 'Você já atingiu o limite de participações para hoje.',
            }, { status: 400 });
        }

        const expiresAt = new Date(now.getTime() + config.durationMinutes * 60 * 1000);

        const promotion = await ProfilePromotion.create({
            professionalId: userId,
            startedAt: now,
            expiresAt,
            dayString,
            status: 'active',
            profileViews: 0,
            newConversations: 0,
            netEarningsCents: 0,
            viewedVisitorIds: [],
            attributedClientIds: [],
        });

        await User.updateOne(
            { clerkId: userId },
            { $set: { isAvailable: true } }
        );

        return NextResponse.json({
            success: true,
            promotion: {
                id: promotion._id,
                startedAt: promotion.startedAt,
                expiresAt: promotion.expiresAt,
                durationMinutes: config.durationMinutes,
            },
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Erro ao iniciar divulgação' }, { status: 500 });
    }
}
