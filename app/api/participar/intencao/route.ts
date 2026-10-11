import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { APPLICANT_COOKIE, APPLICANT_MAX_AGE, encodeApplicantIntent, readApplicantIntent } from '@/lib/applicantIntent';

export async function POST(request: NextRequest) {
    const existing = readApplicantIntent(request.cookies.get(APPLICANT_COOKIE)?.value);
    if (existing?.referredByProfessionalId) return NextResponse.json({ ready: true });
    const body = await request.json();
    const username = typeof body.indicacao === 'string' ? body.indicacao.trim().toLowerCase().replace(/^@/, '') : '';
    let referredByProfessionalId: string | undefined;
    if (/^[a-z0-9._-]{2,30}$/.test(username)) {
        await connectToDatabase();
        const professional = await User.findOne({ username, isProfessional: true, professionalStatus: 'approved', isSuspended: { $ne: true }, isTeam: { $ne: true } }).select('clerkId').lean();
        referredByProfessionalId = professional?.clerkId;
    }
    const response = NextResponse.json({ ready: true });
    response.cookies.set(APPLICANT_COOKIE, encodeApplicantIntent({ startedAt: existing?.startedAt ?? Date.now(), referredByProfessionalId }), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: APPLICANT_MAX_AGE,
    });
    return response;
}
