import { NextResponse } from 'next/server';

const disabled = () => NextResponse.json(
    { error: 'A migração self-service para conta profissional foi desativada.' },
    { status: 403 },
);

export async function GET() {
    return disabled();
}

export async function POST() {
    return disabled();
}
