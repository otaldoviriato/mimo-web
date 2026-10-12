import { AppSettings, ProfilePromotion, User } from '@/models';

export interface PromotionConfig {
    durationMinutes: number;
    windowStartHour: number;
    windowEndHour: number;
    timezone: string;
    maxDailyPerProfessional: number;
}

export function getZonedHourAndDay(date: Date, timeZone: string): { hour: number; dayString: string } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
        partMap[part.type] = part.value;
    }
    const year = partMap.year || '2026';
    const month = partMap.month || '01';
    const day = partMap.day || '01';
    const hour = parseInt(partMap.hour || '0', 10);
    return {
        hour,
        dayString: `${year}-${month}-${day}`,
    };
}

export async function getPromotionConfig(): Promise<PromotionConfig> {
    const settings = await AppSettings.findOne({ key: 'global' })
        .select('promotionDurationMinutes promotionWindowStartHour promotionWindowEndHour promotionTimezone promotionMaxDailyPerProfessional')
        .lean();

    return {
        durationMinutes: settings?.promotionDurationMinutes ?? 60,
        windowStartHour: settings?.promotionWindowStartHour ?? 0,
        windowEndHour: settings?.promotionWindowEndHour ?? 24,
        timezone: settings?.promotionTimezone || 'America/Sao_Paulo',
        maxDailyPerProfessional: settings?.promotionMaxDailyPerProfessional ?? 1,
    };
}

export function isWithinActivationWindow(now: Date, config: PromotionConfig): boolean {
    const { hour } = getZonedHourAndDay(now, config.timezone);
    if (config.windowStartHour === 0 && config.windowEndHour === 24) return true;
    if (config.windowStartHour < config.windowEndHour) {
        return hour >= config.windowStartHour && hour < config.windowEndHour;
    }
    return hour >= config.windowStartHour || hour < config.windowEndHour;
}

export function calculateNextOpportunity(now: Date, config: PromotionConfig): Date {
    if (config.windowStartHour === 0 && config.windowEndHour === 24) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return tomorrow;
    }
    const { hour } = getZonedHourAndDay(now, config.timezone);
    const next = new Date(now);
    if (hour < config.windowStartHour) {
        next.setHours(config.windowStartHour, 0, 0, 0);
    } else {
        next.setDate(next.getDate() + 1);
        next.setHours(config.windowStartHour, 0, 0, 0);
    }
    return next;
}

export async function checkAndExpirePromotions(professionalId?: string): Promise<void> {
    const now = new Date();
    const query: any = {
        status: 'active',
        expiresAt: { $lte: now },
    };
    if (professionalId) {
        query.professionalId = professionalId;
    }

    const expired = await ProfilePromotion.find(query).lean();
    if (expired.length === 0) return;

    const expiredIds = expired.map(p => p._id);
    await ProfilePromotion.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'completed', endedAt: now } }
    );

    const profIds = Array.from(new Set(expired.map(p => p.professionalId)));
    for (const pId of profIds) {
        const hasOtherActive = await ProfilePromotion.exists({
            professionalId: pId,
            status: 'active',
            expiresAt: { $gt: now },
        });
        if (!hasOtherActive) {
            await User.updateOne(
                { clerkId: pId },
                { $set: { isAvailable: false } }
            );
        }
    }
}

export async function isProfessionalAvailable(professionalId: string): Promise<boolean> {
    await checkAndExpirePromotions(professionalId);
    const now = new Date();
    const active = await ProfilePromotion.findOne({
        professionalId,
        status: 'active',
        expiresAt: { $gt: now },
    }).select('_id').lean();

    return Boolean(active);
}
