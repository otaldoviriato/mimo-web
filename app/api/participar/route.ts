import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { APPLICANT_COOKIE, readApplicantIntent } from '@/lib/applicantIntent';
import { validateApplicantBirthDate } from '@/lib/applicant';
import { isReservedRoute } from '@/lib/routes';

function profile(user: { name?: string; username: string; birthDate?: Date; photoUrl?: string; applicantCompletedAt?: Date }) {
    return { name: user.name || '', username: user.username, birthDate: user.birthDate?.toISOString().slice(0, 10) || '', photoUrl: user.photoUrl || '', completed: !!user.applicantCompletedAt };
}

// Only this authenticated endpoint enrolls new accounts. Browser/Clerk metadata never grants a role.
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    let user = await User.findOne({ clerkId: userId });
    if (user?.isSuspended || user?.isTeam) return NextResponse.json({ error: 'Esta conta não pode usar este cadastro.' }, { status: 409 });
    if (user?.isProfessional && !user.applicantEnrollment) return NextResponse.json({ redirectTo: '/chats' });
    if (!user?.applicantEnrollment) {
        const intent = readApplicantIntent(request.cookies.get(APPLICANT_COOKIE)?.value);
        const clerk = await clerkClient();
        const account = await clerk.users.getUser(userId);
        // A webhook may already have inserted the brand-new account as a client.
        // Existing accounts, including existing clients, must never be promoted here.
        if ((user && (user.onboardingStep === 'completed' || user.hasSentFirstMessage || user.balance > 0)) || !intent || account.createdAt < intent.startedAt || (user && user.createdAt.getTime() < intent.startedAt)) {
            return NextResponse.json({ error: 'Esta conta já possui outro cadastro. Entre no aplicativo com ela ou use uma nova conta para participar.' }, { status: 409 });
        }
        const email = account.emailAddresses.find(item => item.id === account.primaryEmailAddressId && item.verification?.status === 'verified')?.emailAddress;
        if (!email) return NextResponse.json({ error: 'Verifique seu email para continuar.' }, { status: 400 });
        try {
            user = await User.findOneAndUpdate(
                { clerkId: userId, isProfessional: { $ne: true }, isTeam: { $ne: true }, isSuspended: { $ne: true }, onboardingStep: { $ne: 'completed' }, hasSentFirstMessage: { $ne: true }, balance: { $not: { $gt: 0 } } },
                { $set: { isProfessional: true, professionalStatus: 'pending', applicantEnrollment: true, onboardingStep: 'profile', name: '', photoUrl: '', isOnline: false, isAvailable: false,
                    ...(intent.referredByProfessionalId && intent.referredByProfessionalId !== userId ? { referredByProfessionalId: intent.referredByProfessionalId } : {}) },
                  $setOnInsert: { clerkId: userId, email, username: `candidata_${userId.replace(/^user_/, '').toLowerCase()}` } },
                { upsert: true, new: true, runValidators: true },
            );
        } catch (error) {
            if ((error as { code?: number }).code !== 11000) throw error;
            user = await User.findOne({ clerkId: userId, applicantEnrollment: true });
            if (!user) return NextResponse.json({ error: 'Já existe uma conta com estes dados.' }, { status: 409 });
        }
    }
    return NextResponse.json({ profile: profile(user!) });
}

export async function PATCH(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId, applicantEnrollment: true, isProfessional: true, isSuspended: { $ne: true } });
    if (!user) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 });
    if (user.applicantCompletedAt) return NextResponse.json({ profile: profile(user) });
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!name || name.length > 80) return NextResponse.json({ error: 'Informe um nome público de até 80 caracteres.' }, { status: 400 });
    if (!/^[a-z0-9._-]{2,30}$/.test(username) || isReservedRoute(`/${username}`)) return NextResponse.json({ error: 'Escolha um username válido de 2 a 30 caracteres.' }, { status: 400 });
    const birthError = validateApplicantBirthDate(body.birthDate);
    if (birthError) return NextResponse.json({ error: birthError }, { status: 400 });
    if (body.complete && !user.photoUrl) return NextResponse.json({ error: 'Envie sua foto de perfil.' }, { status: 400 });
    if (await User.exists({ username, clerkId: { $ne: userId } })) return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 409 });
    try {
        const updated = await User.findOneAndUpdate({ _id: user._id, applicantCompletedAt: { $exists: false } }, { $set: {
            name, username, birthDate: new Date(`${body.birthDate}T12:00:00Z`),
            ...(body.complete === true ? { applicantCompletedAt: new Date(), onboardingStep: 'completed' } : {}),
        } }, { new: true, runValidators: true });
        return NextResponse.json({ profile: profile(updated || (await User.findById(user._id))!) });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 409 });
        throw error;
    }
}
