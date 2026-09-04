import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { isOnboardingCompleted } from '@/lib/onboarding';

export async function requireCompletedOnboarding(userId: string) {
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId })
        .select('clerkId isProfessional taxId birthDate name username photoUrl onboardingStep')
        .lean();

    if (!user || !isOnboardingCompleted(user)) {
        return NextResponse.json(
            { error: 'Onboarding incomplete', redirectTo: '/onboarding' },
            { status: 403 }
        );
    }

    return null;
}

