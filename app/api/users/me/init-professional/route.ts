import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Contas profissionais são criadas exclusivamente pela equipe do Mimo.' },
        { status: 403 },
    );
}
