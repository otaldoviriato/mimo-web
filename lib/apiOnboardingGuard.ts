import { requiresReceiptConsent } from '@/lib/receiptBilling';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { isOnboardingCompleted } from '@/lib/onboarding';

export async function requireCompletedOnboarding(userId: string) {
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId })
        .select('clerkId isProfessional isTeam receiptTermsVersion receiptTermsAcceptedAt taxId birthDate name username photoUrl onboardingStep')
        .lean();

    if (!user || !isOnboardingCompleted(user)) {
        return NextResponse.json(
            { error: 'Onboarding incomplete', redirectTo: '/onboarding' },
            { status: 403 }
        );
    }

    if (requiresReceiptConsent(user)) return NextResponse.json({ error: 'Aceite os termos atualizados para continuar.', code: 'RECEIPT_CONSENT_REQUIRED' }, { status: 403 });
    return null;
}

