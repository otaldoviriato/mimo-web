import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CreatorApplication, OnlineExperience } from '@/models/CreatorApplication';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPERIENCE_OPTIONS: OnlineExperience[] = ['yes', 'no', 'starting'];
const DUPLICATE_WINDOW_DAYS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function cleanText(value: unknown, maxLength = 500) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeInstagram(value: unknown) {
    return cleanText(value, 80)
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
}

function normalizeWhatsapp(value: unknown) {
    return cleanText(value, 40).replace(/\D/g, '');
}

function getClientIp(request: NextRequest) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

function isRateLimited(ip: string) {
    const now = Date.now();
    const recentRequests = (requestLog.get(ip) || []).filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (recentRequests.length >= RATE_LIMIT_MAX) {
        requestLog.set(ip, recentRequests);
        return true;
    }

    recentRequests.push(now);
    requestLog.set(ip, recentRequests);
    return false;
}

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.' },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Honeypot: bots costumam preencher campos invisíveis.
        if (cleanText(body.company)) {
            return NextResponse.json({ success: true }, { status: 201 });
        }

        const fullName = cleanText(body.fullName, 120);
        const artisticName = cleanText(body.artisticName, 100);
        const instagram = normalizeInstagram(body.instagram);
        const whatsapp = normalizeWhatsapp(body.whatsapp);
        const email = cleanText(body.email, 160).toLowerCase();
        const age = Number(body.age);
        const cityState = cleanText(body.cityState, 120);
        const hasOnlineExperience = cleanText(body.hasOnlineExperience, 20) as OnlineExperience;
        const howFoundMimo = cleanText(body.howFoundMimo, 200);
        const reason = cleanText(body.reason, 1500);
        const isAdultConfirmed = body.isAdultConfirmed === true;
        const contactConsent = body.contactConsent === true;

        if (!fullName || !instagram || !whatsapp || !cityState || !hasOnlineExperience || !howFoundMimo || !reason) {
            return NextResponse.json(
                { error: 'Preencha todos os campos obrigatórios para enviar sua inscrição.' },
                { status: 400 }
            );
        }

        if (!Number.isInteger(age) || age < 18 || age > 100) {
            return NextResponse.json(
                { error: 'A inscrição é permitida apenas para pessoas com 18 anos ou mais.' },
                { status: 400 }
            );
        }

        if (!EXPERIENCE_OPTIONS.includes(hasOnlineExperience)) {
            return NextResponse.json({ error: 'Selecione uma opção válida de experiência.' }, { status: 400 });
        }

        if (email && !EMAIL_PATTERN.test(email)) {
            return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
        }

        if (instagram.length < 2 || whatsapp.length < 10) {
            return NextResponse.json(
                { error: 'Confira seu Instagram e WhatsApp antes de continuar.' },
                { status: 400 }
            );
        }

        if (!isAdultConfirmed || !contactConsent) {
            return NextResponse.json(
                { error: 'Confirme sua idade e autorize o contato da equipe para continuar.' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const recentSince = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const existingApplication = await CreatorApplication.exists({
            createdAt: { $gte: recentSince },
            $or: [{ instagram }, { whatsapp }],
        });

        if (existingApplication) {
            return NextResponse.json(
                { error: 'Já recebemos uma inscrição recente com este Instagram ou WhatsApp.' },
                { status: 409 }
            );
        }

        await CreatorApplication.create({
            fullName,
            artisticName: artisticName || undefined,
            instagram,
            whatsapp,
            email: email || undefined,
            age,
            cityState,
            hasOnlineExperience,
            howFoundMimo,
            reason,
            isAdultConfirmed,
            contactConsent,
            status: 'pending',
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Erro ao registrar inscrição de criadora:', error);
        return NextResponse.json(
            { error: 'Não foi possível enviar sua inscrição agora. Tente novamente em instantes.' },
            { status: 500 }
        );
    }
}
