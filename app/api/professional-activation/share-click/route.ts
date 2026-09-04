import { NextResponse } from 'next/server';

// Compartilhar continua possível, mas não é mais critério de ativação ou aquisição profissional.
export async function POST() {
    return NextResponse.json({ error: 'Métrica de ativação por compartilhamento descontinuada.' }, { status: 410 });
}
