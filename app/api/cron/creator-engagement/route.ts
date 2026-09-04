import { NextResponse } from 'next/server';

// Resposta explícita até que eventuais agendamentos antigos sejam removidos da infraestrutura.
export async function GET() {
    return NextResponse.json({ error: 'Automação descontinuada no modelo marketplace-first.' }, { status: 410 });
}
