import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { Resend } from 'resend';
import { buildProfileRoleMetadata } from '@/lib/profileRole';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export async function POST(_request: NextRequest) {
    return NextResponse.json(
        { error: 'A ativação self-service de conta profissional foi desativada. As contas profissionais são liberadas exclusivamente por aprovação administrativa.' },
        { status: 403 }
    );
}
